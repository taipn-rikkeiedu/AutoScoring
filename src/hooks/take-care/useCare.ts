import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useApp } from '~/src/core/AppContext';
import { logger } from '~/src/core/logger';
import { exportToExcel } from '~/src/core/excelExporter';
import { plainText } from '~/src/core/examAnalysis';
import { CareCase, CareHistory, CareMeta, CarePatch, PENDING_STATUS } from '~/src/core/care';
import { getQldtAuth } from '~/src/services/lms/qldtApiClient';
import { QldtOption, listQldtClasses } from '~/src/services/lms/examAnalysisService';
import { fetchCareCases, fetchCareHistory, updateCareCase } from '~/src/services/lms/careService';
import { localStore } from '~/src/infra/storage';

const LOG_MODULE = 'CARE';
const PREFS_KEY = 'careTabPrefs';
const DATE_FMT = 'YYYY-MM-DD';

interface Prefs { classId?: string }

export function useCare() {
  const { activeClassId } = useApp();
  const [classes, setClasses] = useState<QldtOption[]>([]);
  const [classId, setClassId] = useState('');
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(6, 'day'), dayjs()]);
  const [cases, setCases] = useState<CareCase[]>([]);
  const [meta, setMeta] = useState<CareMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [statusText, setStatusText] = useState('Chọn lớp và khoảng ngày rồi bấm "Tải". Cần đăng nhập QLĐT ít nhất một lần.');
  const [history, setHistory] = useState<Record<string, CareHistory | 'loading' | { error: string }>>({});
  const prefsLoaded = useRef(false);

  /* ---------- Lớp (nhớ lần trước; đang mở trang chăm sóc của 1 lớp thì chọn sẵn lớp đó) ---------- */
  const loadClasses = async (want?: string, force = false) => {
    try {
      const list = await listQldtClasses(await getQldtAuth(), force);
      setClasses(list);
      if (!list.length) setStatusText('Tài khoản QLĐT đang đăng nhập không có lớp nào (đã tìm theo từng hệ đào tạo).');
      if (want && list.some(c => c.value === want)) setClassId(want);
    } catch (e: any) {
      setStatusText('Không tải được danh sách lớp: ' + e.message);
    }
  };

  useEffect(() => {
    localStore.get<Prefs>(PREFS_KEY).then((saved) => {
      const prefs: Prefs = saved || {};
      prefsLoaded.current = true;
      loadClasses(activeClassId || prefs.classId);
    });
  }, []);

  useEffect(() => {
    if (prefsLoaded.current && classId) localStore.set({ [PREFS_KEY]: { classId } });
  }, [classId]);

  /* ---------- Tải ca chăm sóc ---------- */
  const handleLoad = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const auth = await getQldtAuth();
      const { items, meta: m } = await fetchCareCases(auth, {
        classId: classId || undefined, startDate: range[0].format(DATE_FMT), endDate: range[1].format(DATE_FMT)
      });
      items.sort((a, b) => b.date.localeCompare(a.date) || a.studentName.localeCompare(b.studentName, 'vi'));
      setCases(items);
      setMeta(m);
      setHistory({});
      const pending = items.filter(c => c.status === PENDING_STATUS).length;
      setStatusText(`${items.length} ca chăm sóc (${pending} đang xử lý) từ ${range[0].format('DD/MM')} đến ${range[1].format('DD/MM')}.`);
    } catch (e: any) {
      setStatusText('Lỗi: ' + e.message);
      logger.error(LOG_MODULE, 'Không tải được danh sách chăm sóc.', e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Lọc ---------- */
  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    cases.forEach(c => m.set(c.status || '—', (m.get(c.status || '—') || 0) + 1));
    return [...m.entries()].map(([label, count]) => ({ label, count }))
      .sort((a, b) => Number(b.label === PENDING_STATUS) - Number(a.label === PENDING_STATUS) || b.count - a.count);
  }, [cases]);

  const visibleCases = useMemo(() => {
    const q = plainText(query);
    return cases.filter(c =>
      (!statusFilters.length || statusFilters.includes(c.status || '—'))
      && (!q || plainText(c.studentName).includes(q) || plainText(c.studentCode).includes(q)));
  }, [cases, statusFilters, query]);

  const toggleStatusFilter = (s: string) =>
    setStatusFilters(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));

  /* ---------- Lịch sử 1 SV (tải khi mở chi tiết) ---------- */
  const loadHistory = async (studentId: string, force = false) => {
    if (!studentId || (!force && history[studentId] && history[studentId] !== 'loading')) return;
    setHistory(prev => ({ ...prev, [studentId]: 'loading' }));
    try {
      const h = await fetchCareHistory(await getQldtAuth(), studentId);
      setHistory(prev => ({ ...prev, [studentId]: h }));
    } catch (e: any) {
      setHistory(prev => ({ ...prev, [studentId]: { error: e.message } }));
    }
  };

  /* ---------- Lưu 1 ca lên QLĐT ---------- */
  const saveCase = async (c: CareCase, patch: CarePatch) => {
    const saved = await updateCareCase(await getQldtAuth(), c.id, patch);
    setCases(prev => prev.map(x => (x.id === c.id ? { ...x, ...patch, ...saved } : x)));
    logger.success(LOG_MODULE, `Đã cập nhật ca chăm sóc ${c.studentName} (${c.date}).`);
    loadHistory(c.studentId, true);
  };

  /* ---------- Xuất Excel danh sách đang hiển thị ---------- */
  const handleExport = () => {
    if (!visibleCases.length) return;
    exportToExcel(visibleCases.map((c, i) => ({
      'STT': i + 1, 'MSSV': c.studentCode, 'Họ tên': c.studentName, 'Lớp': c.className, 'Môn': c.courseName,
      'Ngày nghỉ': dayjs(c.date).format('DD/MM/YYYY'), 'Ca': c.period, 'Trạng thái': c.status, 'Phân loại': c.category,
      'Cách chăm sóc': c.careMethod, 'Lý do': c.reason, 'Kết quả': c.result
    })), 'ChamSoc', `ChamSoc_${range[0].format('DDMM')}-${range[1].format('DDMM')}.xlsx`);
  };

  return {
    classes, classId, setClassId, range, setRange, reloadClasses: () => loadClasses(classId, true),
    cases, visibleCases, meta, loading, statusText, statusCounts, statusFilters, toggleStatusFilter,
    clearStatusFilters: () => setStatusFilters([]), query, setQuery,
    history, loadHistory, saveCase, handleLoad, handleExport
  };
}
