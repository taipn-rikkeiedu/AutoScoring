import { useState, useEffect, useMemo, useRef } from 'react';
import { STORAGE_KEYS } from '~/src/core/constants';
import { logger } from '~/src/core/logger';
import { exportToExcel } from '~/src/core/excelExporter';
import {
  AnalysisRow, AnalysisRules, FlaggedRow, TestColumn,
  DEFAULT_ANALYSIS_RULES, ANALYSIS_LEVELS,
  parseClassDashboard, toStudentExercises, parseWatchList, flagRows,
  sortTestColumns, testColumnLabel, avg, round1, plainText
} from '~/src/core/examAnalysis';
import { getQldtAuth } from '~/src/services/lms/qldtApiClient';
import {
  QldtOption, listQldtClasses, listQldtCourses, fetchClassDashboard, fetchStudentExercises
} from '~/src/services/lms/examAnalysisService';

export type AnalysisFilter = 'all' | 'high' | 'medium' | 'watch' | 'dup';

interface AnalysisPrefs {
  rules?: Partial<AnalysisRules>;
  watchText?: string;
  classIds?: string[];
  courseId?: string;
}

const LOG_MODULE = 'EXAM_ANALYSIS';
const STUDENT_FETCH_CONCURRENCY = 4;

export function useExamAnalysis() {
  const [classes, setClasses] = useState<QldtOption[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<QldtOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [baseRows, setBaseRows] = useState<AnalysisRow[]>([]);
  const [testCols, setTestCols] = useState<TestColumn[]>([]);
  const [rules, setRules] = useState<AnalysisRules>(DEFAULT_ANALYSIS_RULES);
  const [watchText, setWatchText] = useState('');
  const [filter, setFilter] = useState<AnalysisFilter>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; text: string } | null>(null);
  const [statusText, setStatusText] = useState('Chọn lớp + môn học. Cần đăng nhập QLĐT (qldt.rikkei.edu.vn) ít nhất một lần.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const prefsLoaded = useRef(false);
  // Lớp/môn đã lưu: giữ nguyên cho tới khi tải được danh sách lớp (tránh ghi đè rỗng khi chưa mở tab QLĐT)
  const savedSelection = useRef<Pick<AnalysisPrefs, 'classIds' | 'courseId'>>({});

  const setStatus = (text: string, type: typeof statusType = 'info') => { setStatusText(text); setStatusType(type); };

  /* ---------- Cài đặt phân tích (lưu lâu dài) ---------- */
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.examAnalysisPrefs, (res) => {
      const prefs: AnalysisPrefs = res[STORAGE_KEYS.examAnalysisPrefs] || {};
      setRules({ ...DEFAULT_ANALYSIS_RULES, ...(prefs.rules || {}) });
      setWatchText(prefs.watchText || '');
      savedSelection.current = { classIds: prefs.classIds, courseId: prefs.courseId };
      prefsLoaded.current = true;
      loadClasses(prefs);
    });
  }, []);

  useEffect(() => {
    if (!prefsLoaded.current) return;
    const selection = classes.length ? { classIds: selectedClassIds, courseId } : savedSelection.current;
    const prefs: AnalysisPrefs = { rules, watchText, ...selection };
    chrome.storage.local.set({ [STORAGE_KEYS.examAnalysisPrefs]: prefs });
  }, [rules, watchText, selectedClassIds, courseId, classes]);

  /* ---------- Lớp / môn ---------- */
  const loadClasses = async (prefs: AnalysisPrefs = {}) => {
    try {
      const auth = await getQldtAuth();
      const list = await listQldtClasses(auth);
      setClasses(list);
      const keep = (prefs.classIds || []).filter(id => list.some(c => c.value === id));
      setSelectedClassIds(keep);
      if (keep.length) await loadCourses(keep, prefs.courseId || '', auth);
      setStatus(`Đã tải ${list.length} lớp. Chọn lớp (có thể nhiều lớp) và môn học rồi bấm "Phân tích".`);
    } catch (e: any) {
      setStatus('Không tải được danh sách lớp: ' + e.message, 'error');
      logger.error(LOG_MODULE, 'Không tải được danh sách lớp QLĐT.', e.message);
    }
  };

  const loadCourses = async (classIds: string[], wantCourseId: string, auth?: string) => {
    if (!classIds.length) { setCourses([]); setCourseId(''); return; }
    try {
      const list = await listQldtCourses(auth || await getQldtAuth(), classIds[0]);
      setCourses(list);
      setCourseId(list.some(c => c.value === wantCourseId) ? wantCourseId : '');
    } catch (e: any) {
      setStatus('Không tải được môn học: ' + e.message, 'error');
    }
  };

  const handleClassChange = (ids: string[]) => {
    const firstChanged = ids[0] !== selectedClassIds[0];
    setSelectedClassIds(ids);
    // Môn học lấy theo lớp đầu tiên được chọn
    if (firstChanged) loadCourses(ids, courseId);
  };

  /* ---------- Phân tích ---------- */
  const handleAnalyze = async () => {
    if (busy) return;
    if (!selectedClassIds.length || !courseId) { setStatus('Hãy chọn ít nhất 1 lớp và 1 môn học.', 'warning'); return; }
    setBusy(true);
    try {
      const auth = await getQldtAuth();
      const cols = new Map<string, TestColumn>();
      const rows: AnalysisRow[] = [];
      let done = 0;
      setProgress({ done: 0, total: selectedClassIds.length, text: 'Đang tải điểm các lớp…' });
      for (const id of selectedClassIds) {
        const label = (classes.find(c => c.value === id)?.label || id).replace(/\s*\(\d+ SV\)$/, '');
        try {
          const d = await fetchClassDashboard(auth, id, courseId);
          const parsed = parseClassDashboard(d, label, cols);
          if (!parsed.length) logger.warn(LOG_MODULE, `${label}: không có dữ liệu môn này.`);
          rows.push(...parsed);
        } catch (e: any) {
          logger.error(LOG_MODULE, `Không tải được điểm lớp ${label}.`, e.message);
        }
        setProgress({ done: ++done, total: selectedClassIds.length, text: 'Đang tải điểm các lớp…' });
      }
      setTestCols(sortTestColumns(cols.values()));
      setBaseRows(rows);
      const flagged = flagRows(rows, rules, parseWatchList(watchText)).rows;
      const high = flagged.filter(r => r.level === 'high').length;
      const medium = flagged.filter(r => r.level === 'medium').length;
      setStatus(`Phân tích ${rows.length} SV: ${high} nghi vấn cao, ${medium} cần rà soát.`, rows.length ? 'success' : 'warning');
      logger.success(LOG_MODULE, `Phân tích ${selectedClassIds.length} lớp, ${rows.length} SV: ${high} nghi vấn cao, ${medium} cần rà soát.`);
    } catch (e: any) {
      setStatus('Lỗi: ' + e.message, 'error');
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  /* ---------- Gắn cờ (tính lại khi đổi quy tắc / danh sách rà soát / dữ liệu) ---------- */
  const watchList = useMemo(() => parseWatchList(watchText), [watchText]);
  const { rows, watchMissing } = useMemo(() => flagRows(baseRows, rules, watchList), [baseRows, rules, watchList]);

  const visibleRows = useMemo(() => {
    const q = plainText(query);
    const filtered = rows.filter(r => {
      if (q && !plainText(r.name).includes(q) && !plainText(r.code).includes(q)) return false;
      if (filter === 'high') return r.level === 'high';
      if (filter === 'medium') return r.level === 'medium';
      if (filter === 'watch') return r.watch;
      if (filter === 'dup') return r.dups.length > 0;
      return true;
    });
    // Mặc định: mức nghi vấn → trong DS rà soát → chênh lệch lớn trước (bảng có thể sắp xếp lại theo cột)
    return [...filtered].sort((a, b) =>
      ANALYSIS_LEVELS[a.level].order - ANALYSIS_LEVELS[b.level].order
      || (Number(b.watch) - Number(a.watch))
      || ((b.gap ?? -999) - (a.gap ?? -999)));
  }, [rows, filter, query]);

  const stats = useMemo(() => {
    const c = (fn: (r: FlaggedRow) => boolean) => rows.filter(fn).length;
    const counts: Record<AnalysisFilter, number> = {
      all: rows.length,
      high: c(r => r.level === 'high'),
      medium: c(r => r.level === 'medium'),
      watch: c(r => r.watch),
      dup: c(r => r.dups.length > 0)
    };
    return counts;
  }, [rows]);

  /* ---------- Điểm AI bài tập (1 request / SV) ---------- */
  const handleLoadAi = async () => {
    if (busy) return;
    if (!baseRows.length) { setStatus('Bấm "Phân tích" trước.', 'warning'); return; }
    const targetKeys = new Set((filter === 'all' ? rows : visibleRows).map(r => r.key));
    const targets = baseRows.filter(r => targetKeys.has(r.key));
    if (!window.confirm(`Tải bài tập + điểm AI cho ${targets.length} sinh viên (${targets.length} request)?`)) return;

    setBusy(true);
    try {
      const auth = await getQldtAuth();
      const updates = new Map<string, Pick<AnalysisRow, 'exercises' | 'aiAvg' | 'aiCount'>>();
      let done = 0;
      let next = 0;
      setProgress({ done: 0, total: targets.length, text: 'Đang tải bài tập…' });
      await Promise.all(Array.from({ length: Math.min(STUDENT_FETCH_CONCURRENCY, targets.length) }, async () => {
        while (next < targets.length) {
          const r = targets[next++];
          try {
            const exercises = toStudentExercises(await fetchStudentExercises(auth, r.studentId, courseId));
            updates.set(r.key, {
              exercises,
              aiAvg: avg(exercises.map(e => e.ai)),
              aiCount: exercises.filter(e => e.ai != null).length
            });
          } catch (e: any) {
            logger.error(LOG_MODULE, `Không tải được bài tập của ${r.name}.`, e.message);
          }
          setProgress({ done: ++done, total: targets.length, text: 'Đang tải bài tập…' });
        }
      }));
      setBaseRows(prev => prev.map(r => (updates.has(r.key) ? { ...r, ...updates.get(r.key)! } : r)));
      setStatus(`Đã tải bài tập của ${updates.size}/${targets.length} SV.`, updates.size === targets.length ? 'success' : 'warning');
    } catch (e: any) {
      setStatus('Lỗi: ' + e.message, 'error');
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  /* ---------- Xuất Excel theo bộ lọc hiện tại ---------- */
  const handleExport = () => {
    if (!rows.length) return;
    const hasAi = rows.some(r => r.aiAvg != null);
    const data = visibleRows.map(r => {
      const record: Record<string, any> = {
        'Lớp': r.classLabel, 'MSSV': r.code, 'Họ tên': r.name, 'DS rà soát': r.watch ? 'Có' : '',
        'BTVN (%)': round1(r.hw), 'Nghỉ học (%)': round1(r.absentRate)
      };
      if (hasAi) record['Điểm AI BT TB'] = round1(r.aiAvg);
      testCols.forEach(c => {
        const t = r.tests[c.key];
        record[`${testColumnLabel(c)} - ${c.name}`] = !t ? null : t.absent ? 'Vắng' : round1(t.point);
      });
      Object.assign(record, {
        'Hackathon': round1(r.hk), 'Cuối môn': round1(r.ck), 'Điểm thi': round1(r.exam), 'Chênh lệch': round1(r.gap),
        'Mức': ANALYSIS_LEVELS[r.level].label, 'Lý do': r.reasons.join('; ')
      });
      return record;
    });
    const course = (courses.find(c => c.value === courseId)?.label || 'mon').replace(/[^\wÀ-ỹ]+/g, '-').slice(0, 40);
    exportToExcel(data, 'PhanTich', `PhanTich_${course}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return {
    classes, selectedClassIds, courses, courseId, setCourseId,
    rows, visibleRows, testCols, stats, watchList, watchMissing,
    rules, setRules, watchText, setWatchText,
    filter, setFilter, query, setQuery,
    busy, progress, statusText, statusType,
    handleClassChange, handleAnalyze, handleLoadAi, handleExport,
    reloadClasses: () => loadClasses(classes.length ? { classIds: selectedClassIds, courseId } : savedSelection.current)
  };
}

