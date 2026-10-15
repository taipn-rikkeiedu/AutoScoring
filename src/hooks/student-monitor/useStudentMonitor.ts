import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '~/src/core/AppContext';
import { STORAGE_KEYS } from '~/src/core/constants';
import { logger } from '~/src/core/logger';
import { exportToExcel } from '~/src/core/excelExporter';
import {
  AnalysisRules, TestColumn, DEFAULT_ANALYSIS_RULES, ANALYSIS_LEVELS,
  toStudentExercises, parseWatchList, sortTestColumns, avg, round1, plainText
} from '~/src/core/examAnalysis';
import {
  MonitorBase, MonitorRow, MonitorRules, MonitorFilter, DEFAULT_MONITOR_RULES, MONITOR_FILTERS, RISK_LEVELS,
  parseMonitorClass, evaluateMonitor, matchesFilter, summarizeClass, buildClassOverviewPrompt, buildStudentPrompt, EXAM_CELLS
} from '~/src/core/studentMonitor';
import { callAiWithRateLimitRetry } from '~/src/services/aiService';
import { getQldtAuth } from '~/src/services/lms/qldtApiClient';
import {
  QldtOption, listQldtClasses, listQldtCourses, fetchClassDashboard, fetchStudentExercises
} from '~/src/services/lms/examAnalysisService';

interface MonitorPrefs {
  monitorRules?: Partial<MonitorRules>;
  rules?: Partial<AnalysisRules>;
  watchText?: string;
  classIds?: string[];
  courseId?: string;
}

export interface AiResult { loading: boolean; text?: string; error?: string }

const LOG_MODULE = 'STUDENT_MONITOR';
const STUDENT_FETCH_CONCURRENCY = 4;

export function useStudentMonitor() {
  const { config } = useApp();
  const [classes, setClasses] = useState<QldtOption[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<QldtOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [baseRows, setBaseRows] = useState<MonitorBase[]>([]);
  const [testCols, setTestCols] = useState<TestColumn[]>([]);
  const [monitorRules, setMonitorRules] = useState<MonitorRules>(DEFAULT_MONITOR_RULES);
  const [rules, setRules] = useState<AnalysisRules>(DEFAULT_ANALYSIS_RULES);
  const [watchText, setWatchText] = useState('');
  const [filters, setFilters] = useState<MonitorFilter[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; text: string } | null>(null);
  const [statusText, setStatusText] = useState('Chọn lớp + môn học rồi bấm "Tải dữ liệu". Cần đăng nhập QLĐT ít nhất một lần.');
  const [classAi, setClassAi] = useState<AiResult | null>(null);
  const [studentAi, setStudentAi] = useState<Record<string, AiResult>>({});
  const prefsLoaded = useRef(false);
  // Lớp/môn đã lưu: giữ nguyên tới khi tải được danh sách lớp (tránh ghi đè rỗng khi chưa đăng nhập QLĐT)
  const savedSelection = useRef<Pick<MonitorPrefs, 'classIds' | 'courseId'>>({});

  /* ---------- Cài đặt (lưu lâu dài; lần đầu lấy lại cài đặt của tab Phân tích cũ) ---------- */
  useEffect(() => {
    const keys = [STORAGE_KEYS.studentMonitorPrefs, STORAGE_KEYS.legacyExamAnalysisPrefs];
    chrome.storage.local.get(keys, (res) => {
      const prefs: MonitorPrefs = res[STORAGE_KEYS.studentMonitorPrefs] || res[STORAGE_KEYS.legacyExamAnalysisPrefs] || {};
      setMonitorRules({ ...DEFAULT_MONITOR_RULES, ...(prefs.monitorRules || {}) });
      setRules({ ...DEFAULT_ANALYSIS_RULES, ...(prefs.rules || {}) });
      setWatchText(prefs.watchText || '');
      savedSelection.current = { classIds: prefs.classIds, courseId: prefs.courseId };
      prefsLoaded.current = true;
      loadClasses(savedSelection.current);
    });
  }, []);

  useEffect(() => {
    if (!prefsLoaded.current) return;
    const selection = classes.length ? { classIds: selectedClassIds, courseId } : savedSelection.current;
    const prefs: MonitorPrefs = { monitorRules, rules, watchText, ...selection };
    chrome.storage.local.set({ [STORAGE_KEYS.studentMonitorPrefs]: prefs });
  }, [monitorRules, rules, watchText, selectedClassIds, courseId, classes]);

  /* ---------- Lớp / môn ---------- */
  const loadClasses = async (want: Pick<MonitorPrefs, 'classIds' | 'courseId'> = {}) => {
    try {
      const auth = await getQldtAuth();
      const list = await listQldtClasses(auth);
      setClasses(list);
      const keep = (want.classIds || []).filter(id => list.some(c => c.value === id));
      setSelectedClassIds(keep);
      if (keep.length) await loadCourses(keep, want.courseId || '', auth);
      setStatusText(`Đã tải ${list.length} lớp. Chọn lớp và môn học rồi bấm "Tải dữ liệu".`);
    } catch (e: any) {
      setStatusText('Không tải được danh sách lớp: ' + e.message);
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
      setStatusText('Không tải được môn học: ' + e.message);
    }
  };

  const handleClassChange = (ids: string[]) => {
    const firstChanged = ids[0] !== selectedClassIds[0];
    setSelectedClassIds(ids);
    // Môn học lấy theo lớp đầu tiên được chọn
    if (firstChanged) loadCourses(ids, courseId);
  };

  /* ---------- Tải dữ liệu ---------- */
  const handleLoad = async () => {
    if (busy) return;
    if (!selectedClassIds.length || !courseId) { setStatusText('Hãy chọn ít nhất 1 lớp và 1 môn học.'); return; }
    setBusy(true);
    setClassAi(null);
    setStudentAi({});
    try {
      const auth = await getQldtAuth();
      const cols = new Map<string, TestColumn>();
      const rows: MonitorBase[] = [];
      let done = 0;
      setProgress({ done: 0, total: selectedClassIds.length, text: 'Đang tải dữ liệu các lớp…' });
      for (const id of selectedClassIds) {
        const label = (classes.find(c => c.value === id)?.label || id).replace(/\s*\(\d+ SV\)$/, '');
        try {
          rows.push(...parseMonitorClass(await fetchClassDashboard(auth, id, courseId), label, cols));
        } catch (e: any) {
          logger.error(LOG_MODULE, `Không tải được dữ liệu lớp ${label}.`, e.message);
        }
        setProgress({ done: ++done, total: selectedClassIds.length, text: 'Đang tải dữ liệu các lớp…' });
      }
      setTestCols(sortTestColumns(cols.values()));
      setBaseRows(rows);
      logger.success(LOG_MODULE, `Tải ${selectedClassIds.length} lớp, ${rows.length} sinh viên.`);
    } catch (e: any) {
      setStatusText('Lỗi: ' + e.message);
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  /* ---------- Đánh giá + lọc ---------- */
  const watchList = useMemo(() => parseWatchList(watchText), [watchText]);
  const { rows, watchMissing } = useMemo(
    () => evaluateMonitor(baseRows, monitorRules, rules, watchList),
    [baseRows, monitorRules, rules, watchList]);
  const overview = useMemo(() => summarizeClass(rows), [rows]);
  const filterCounts = useMemo(() => {
    const counts = {} as Record<MonitorFilter, number>;
    MONITOR_FILTERS.forEach(f => { counts[f.key] = rows.filter(r => matchesFilter(r, f.key)).length; });
    return counts;
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = plainText(query);
    return rows.filter(r =>
      (!filters.length || filters.some(f => matchesFilter(r, f)))
      && (!q || plainText(r.name).includes(q) || plainText(r.code).includes(q) || plainText(r.email).includes(q)));
  }, [rows, filters, query]);

  useEffect(() => {
    if (!rows.length) return;
    const o = overview;
    setStatusText(`${o.total} SV: ${o.byRisk.alarm} báo động, ${o.byRisk.warning} cảnh báo, ${o.byRisk.early} sắp vượt ngưỡng.`);
  }, [overview]);

  const toggleFilter = (f: MonitorFilter) =>
    setFilters(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]));

  /* ---------- Điểm AI bài tập của hệ thống (1 request / SV) ---------- */
  const handleLoadExerciseAi = async () => {
    if (busy || !baseRows.length) return;
    const targetKeys = new Set(visibleRows.map(r => r.key));
    const targets = baseRows.filter(r => targetKeys.has(r.key));
    if (!window.confirm(`Tải bài tập + điểm AI hệ thống cho ${targets.length} sinh viên đang hiển thị (${targets.length} request)?`)) return;
    setBusy(true);
    try {
      const auth = await getQldtAuth();
      const updates = new Map<string, Pick<MonitorBase, 'exercises' | 'aiAvg' | 'aiCount'>>();
      let done = 0;
      let next = 0;
      setProgress({ done: 0, total: targets.length, text: 'Đang tải bài tập…' });
      await Promise.all(Array.from({ length: Math.min(STUDENT_FETCH_CONCURRENCY, targets.length) }, async () => {
        while (next < targets.length) {
          const r = targets[next++];
          try {
            const exercises = toStudentExercises(await fetchStudentExercises(auth, r.studentId, courseId));
            updates.set(r.key, { exercises, aiAvg: avg(exercises.map(e => e.ai)), aiCount: exercises.filter(e => e.ai != null).length });
          } catch (e: any) {
            logger.error(LOG_MODULE, `Không tải được bài tập của ${r.name}.`, e.message);
          }
          setProgress({ done: ++done, total: targets.length, text: 'Đang tải bài tập…' });
        }
      }));
      setBaseRows(prev => prev.map(r => (updates.has(r.key) ? { ...r, ...updates.get(r.key)! } : r)));
    } catch (e: any) {
      setStatusText('Lỗi: ' + e.message);
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  /* ---------- AI viết nhận xét (chỉ chạy khi bấm) ---------- */
  const courseName = courses.find(c => c.value === courseId)?.label || '';
  const aiCredentials = { provider: config.aiProvider, modelName: config.aiModelName, apiKey: config.aiApiKey, apiUrl: config.aiApiUrl };

  const handleClassAi = async () => {
    if (!rows.length || classAi?.loading) return;
    setClassAi({ loading: true });
    try {
      const text = await callAiWithRateLimitRetry(buildClassOverviewPrompt(rows, courseName), aiCredentials);
      setClassAi({ loading: false, text: text.trim() });
    } catch (e: any) {
      setClassAi({ loading: false, error: e.message });
    }
  };

  const handleStudentAi = async (r: MonitorRow) => {
    if (studentAi[r.key]?.loading) return;
    setStudentAi(prev => ({ ...prev, [r.key]: { loading: true } }));
    try {
      const text = await callAiWithRateLimitRetry(buildStudentPrompt(r, courseName), aiCredentials);
      setStudentAi(prev => ({ ...prev, [r.key]: { loading: false, text: text.trim() } }));
    } catch (e: any) {
      setStudentAi(prev => ({ ...prev, [r.key]: { loading: false, error: e.message } }));
    }
  };

  /* ---------- Xuất Excel theo bộ lọc hiện tại ---------- */
  const handleExport = () => {
    if (!visibleRows.length) return;
    const data = visibleRows.map(r => {
      const record: Record<string, any> = {
        'Lớp': r.classLabel, 'MSSV': r.code, 'Họ tên': r.name, 'Email': r.email,
        'Mức': RISK_LEVELS[r.risk].label,
        'Vi phạm': r.issues.map(i => i.label).join('; '),
        'Sắp vượt ngưỡng': r.early.map(e => e.label).join('; '),
        'Nghỉ học (%)': round1(r.absentRate), 'Thiếu bài tập (%)': round1(r.missingHomework), 'Chậm E-learning': r.unprepared
      };
      EXAM_CELLS.forEach(c => { record[c.label] = r[c.key] === 'absent' ? 'Vắng' : round1(r[c.key] as number | null); });
      Object.assign(record, {
        'R-Points': r.rpoints,
        'Nghi vấn BTVN': r.suspect ? ANALYSIS_LEVELS[r.level].label : '',
        'Lý do nghi vấn': r.reasons.join('; '),
        'DS rà soát': r.watch ? 'Có' : '',
        'Gợi ý hành động': r.actions.join('; ')
      });
      return record;
    });
    const name = (courseName || 'mon').replace(/[^\wÀ-ỹ]+/g, '-').slice(0, 40);
    exportToExcel(data, 'GiamSat', `GiamSat_${name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return {
    classes, selectedClassIds, courses, courseId, setCourseId, courseName,
    rows, visibleRows, testCols, overview, filterCounts, watchList, watchMissing,
    monitorRules, setMonitorRules, rules, setRules, watchText, setWatchText,
    filters, toggleFilter, clearFilters: () => setFilters([]), query, setQuery,
    busy, progress, statusText, classAi, studentAi,
    handleClassChange, handleLoad, handleLoadExerciseAi, handleClassAi, handleStudentAi, handleExport,
    reloadClasses: () => loadClasses(classes.length ? { classIds: selectedClassIds, courseId } : savedSelection.current)
  };
}
