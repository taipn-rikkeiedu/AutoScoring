import { useState, useEffect, useMemo, useRef } from 'react';
import { STORAGE_KEYS } from '~/src/core/constants';
import { logger } from '~/src/core/logger';
import { exportToExcel } from '~/src/core/excelExporter';
import { LearningStatsData, LearningStatRow, ExamCell, parseLearningStats } from '~/src/core/learningStats';
import { plainText, round1 } from '~/src/core/examAnalysis';
import { getQldtAuth } from '~/src/services/lms/qldtApiClient';
import { QldtOption, listQldtClasses, listQldtCourses, fetchClassDashboard } from '~/src/services/lms/examAnalysisService';

interface LearningStatsSelection {
  classId?: string;
  courseId?: string;
}

const LOG_MODULE = 'LEARNING_STATS';

export function useLearningStatsManager() {
  const [classes, setClasses] = useState<QldtOption[]>([]);
  const [classId, setClassId] = useState('');
  const [courses, setCourses] = useState<QldtOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [data, setData] = useState<LearningStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [statusText, setStatusText] = useState('Chọn lớp + môn học. Cần đăng nhập QLĐT (qldt.rikkei.edu.vn) ít nhất một lần.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const selectionLoaded = useRef(false);
  // Lựa chọn đã lưu: giữ lại để "tải lại" khi lần đầu chưa lấy được danh sách lớp (chưa mở tab QLĐT)
  const savedSelection = useRef<LearningStatsSelection>({});

  const setStatus = (text: string, type: typeof statusType = 'info') => { setStatusText(text); setStatusType(type); };

  /* ---------- Lớp / môn (nhớ lựa chọn lần trước) ---------- */
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.learningStatsSelection, (res) => {
      const saved: LearningStatsSelection = res[STORAGE_KEYS.learningStatsSelection] || {};
      savedSelection.current = saved;
      loadClasses(saved).finally(() => { selectionLoaded.current = true; });
    });
  }, []);

  useEffect(() => {
    if (!selectionLoaded.current || !classes.length) return;
    chrome.storage.local.set({ [STORAGE_KEYS.learningStatsSelection]: { classId, courseId } });
  }, [classId, courseId, classes]);

  const loadClasses = async (want: LearningStatsSelection = {}) => {
    try {
      const auth = await getQldtAuth();
      const list = await listQldtClasses(auth);
      setClasses(list);
      const keep = list.some(c => c.value === want.classId) ? want.classId! : '';
      setClassId(keep);
      if (keep) await loadCourses(keep, want.courseId || '', auth);
      setStatus(`Đã tải ${list.length} lớp. Chọn lớp và môn học rồi bấm "Tải dữ liệu".`);
    } catch (e: any) {
      setStatus('Không tải được danh sách lớp: ' + e.message, 'error');
      logger.error(LOG_MODULE, 'Không tải được danh sách lớp QLĐT.', e.message);
    }
  };

  const loadCourses = async (id: string, wantCourseId: string, auth?: string) => {
    setCourses([]);
    setCourseId('');
    if (!id) return;
    try {
      const list = await listQldtCourses(auth || await getQldtAuth(), id);
      setCourses(list);
      if (list.some(c => c.value === wantCourseId)) setCourseId(wantCourseId);
    } catch (e: any) {
      setStatus('Không tải được môn học: ' + e.message, 'error');
    }
  };

  const handleClassChange = (id: string) => {
    setClassId(id);
    setData(null);
    loadCourses(id, courseId);
  };

  const handleCourseChange = (id: string) => {
    setCourseId(id);
    setData(null);
  };

  /* ---------- Tải chỉ số ---------- */
  const handleLoad = async () => {
    if (isLoading || !classId || !courseId) return;
    setIsLoading(true);
    setStatus('Đang tải chỉ số học tập…');
    try {
      const auth = await getQldtAuth();
      const parsed = parseLearningStats(await fetchClassDashboard(auth, classId, courseId));
      setData(parsed);
      setStatus(`Đã tải ${parsed.rows.length} sinh viên (${parsed.className} — ${parsed.courseName}).`, parsed.rows.length ? 'success' : 'warning');
      logger.success(LOG_MODULE, `Tải chỉ số lớp "${parsed.className}" môn "${parsed.courseName}": ${parsed.rows.length} sinh viên.`);
    } catch (e: any) {
      setStatus('Không tải được chỉ số học tập: ' + e.message, 'error');
      logger.error(LOG_MODULE, 'Không tải được chỉ số học tập.', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedRows = useMemo(() => {
    if (!data) return [];
    const q = plainText(filterText);
    if (!q) return data.rows;
    return data.rows.filter(r => plainText(r.name).includes(q) || plainText(r.email).includes(q) || plainText(r.code).includes(q));
  }, [data, filterText]);

  /* ---------- Xuất Excel theo bộ lọc hiện tại ---------- */
  const handleExport = () => {
    if (!data) return;
    const cell = (v: ExamCell) => (v === 'absent' ? 'Vắng' : round1(v));
    const records = displayedRows.map((r: LearningStatRow) => ({
      'STT': r.no, 'MSSV': r.code, 'Học viên': r.name, 'Email': r.email, 'Trạng thái': r.studentStatus,
      'Nghỉ học (%)': round1(r.absentRate), 'Thiếu bài tập (%)': round1(r.missingHomework), 'Chậm E-learning': r.unprepared,
      'Hackathon TN': cell(r.hkTN), 'Hackathon TL': cell(r.hkTL), 'Cuối môn TN': cell(r.ckTN), 'Cuối môn TL': cell(r.ckTL),
      'R-Points': r.rpoints
    }));
    exportToExcel(records, 'ChiSoHocTap', `ChiSoHocTap_${data.className}_${data.courseName}.xlsx`);
  };

  return {
    classes, classId, courses, courseId, data, displayedRows,
    isLoading, filterText, setFilterText, statusText, statusType,
    handleClassChange, handleCourseChange, handleLoad, handleExport,
    reloadClasses: () => loadClasses(classes.length ? { classId, courseId } : savedSelection.current)
  };
}
