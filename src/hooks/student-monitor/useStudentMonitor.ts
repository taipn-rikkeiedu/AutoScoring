import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '~/src/core/AppContext';
import { STORAGE_KEYS } from '~/src/core/constants';
import { logger } from '~/src/core/logger';
import { exportToExcel } from '~/src/core/excelExporter';
import {
  TestColumn, ANALYSIS_LEVELS,
  toStudentExercises, parseWatchList, sortTestColumns, avg, round1, plainText
} from '~/src/core/examAnalysis';
import {
  MonitorBase, MonitorRow, MonitorFilter, MONITOR_FILTERS, levelFilterKey, describeByRisk,
  parseMonitorClass, evaluateMonitor, matchesFilter, summarizeClass, buildClassOverviewPrompt, buildStudentPrompt, EXAM_CELLS, examCellLabel,
  buildDistributions, DistributionBin
} from '~/src/core/studentMonitor';
import {
  MonitorTemplate, TemplateAssignment, DEFAULT_ASSIGNMENT, STARTER_TEMPLATES, resolveTemplate
} from '~/src/core/monitorTemplates';
import {
  TemplateSource, loadMonitorTemplates, saveMonitorTemplate, removeMonitorTemplate, writeLocalTemplates
} from '~/src/services/monitorTemplateStore';
import { SupabaseService } from '~/src/services/supabase/supabaseService';
import { callAiWithRateLimitRetry } from '~/src/services/aiService';
import { getQldtAuth } from '~/src/services/lms/qldtApiClient';
import {
  QldtOption, listQldtClasses, listQldtCourses, fetchClassDashboard, fetchStudentExercises
} from '~/src/services/lms/examAnalysisService';

interface MonitorPrefs {
  templateAssignment?: TemplateAssignment;
  /** Ngưỡng của bản cũ (trước khi có mẫu) — chỉ đọc để chọn mẫu tương ứng. */
  monitorRules?: { absentWarn?: number };
  watchText?: string;
  classIds?: string[];
  courseId?: string;
}

export interface AiResult { loading: boolean; text?: string; error?: string }
export type MonitorView = 'list' | 'chart';
export type TemplateScope = 'all' | 'course';
/** Lọc theo 1 cột biểu đồ: đúng nhóm SV của cột đó. */
export interface ChartFilter { label: string; keys: Set<string> }

const LOG_MODULE = 'STUDENT_MONITOR';

export function useStudentMonitor() {
  const { config } = useApp();
  const [classes, setClasses] = useState<QldtOption[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<QldtOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [baseRows, setBaseRows] = useState<MonitorBase[]>([]);
  const [testCols, setTestCols] = useState<TestColumn[]>([]);
  const [templates, setTemplates] = useState<MonitorTemplate[]>(STARTER_TEMPLATES);
  const [templateSource, setTemplateSource] = useState<TemplateSource>('local');
  const [templateError, setTemplateError] = useState<{ message: string; tableMissing: boolean } | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [assignment, setAssignment] = useState<TemplateAssignment>(DEFAULT_ASSIGNMENT);
  const [watchText, setWatchText] = useState('');
  const [filters, setFilters] = useState<MonitorFilter[]>([]);
  const [chartFilter, setChartFilter] = useState<ChartFilter | null>(null);
  const [view, setView] = useState<MonitorView>('list');
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
      setAssignment(prefs.templateAssignment
        || { ...DEFAULT_ASSIGNMENT, defaultId: prefs.monitorRules?.absentWarn === 5 ? 'strict' : DEFAULT_ASSIGNMENT.defaultId });
      setWatchText(prefs.watchText || '');
      savedSelection.current = { classIds: prefs.classIds, courseId: prefs.courseId };
      prefsLoaded.current = true;
      loadClasses(savedSelection.current);
    });
  }, []);

  useEffect(() => {
    if (!prefsLoaded.current) return;
    const selection = classes.length ? { classIds: selectedClassIds, courseId } : savedSelection.current;
    const prefs: MonitorPrefs = { templateAssignment: assignment, watchText, ...selection };
    chrome.storage.local.set({ [STORAGE_KEYS.studentMonitorPrefs]: prefs });
  }, [assignment, watchText, selectedClassIds, courseId, classes]);

  /* ---------- Mẫu giám sát: Supabase dùng chung, bản sao trên máy ---------- */
  const reloadTemplates = async () => {
    setTemplatesLoading(true);
    const res = await loadMonitorTemplates(config);
    setTemplates(res.templates);
    setTemplateSource(res.source);
    setTemplateError(res.error ? { message: res.error, tableMissing: !!res.tableMissing } : null);
    if (res.error) logger.error(LOG_MODULE, 'Không đọc được mẫu giám sát trên Supabase, dùng bản trên máy.', res.error);
    setTemplatesLoading(false);
  };

  useEffect(() => { reloadTemplates(); }, [config.supabaseSyncEnabled, config.supabaseUrl, config.supabaseAnonKey]);

  const commitTemplates = (next: MonitorTemplate[]) => {
    setTemplates(next);
    writeLocalTemplates(next);
  };

  /** Tạo mới hoặc cập nhật (theo id). Lỗi Supabase thì ném ra để giao diện báo. */
  const saveTemplate = async (t: MonitorTemplate) => {
    await saveMonitorTemplate(config, templateSource, t);
    const exists = templates.some(x => x.id === t.id);
    commitTemplates(exists ? templates.map(x => (x.id === t.id ? t : x)) : [...templates, t]);
  };

  const deleteTemplate = async (id: string) => {
    if (templates.length <= 1) throw new Error('Phải giữ lại ít nhất 1 mẫu giám sát.');
    await removeMonitorTemplate(config, templateSource, id);
    const next = templates.filter(t => t.id !== id);
    commitTemplates(next);
    // Môn đang dùng mẫu bị xoá → về mẫu mặc định; xoá mẫu mặc định → mẫu đầu tiên còn lại
    setAssignment(prev => ({
      defaultId: prev.defaultId === id ? next[0].id : prev.defaultId,
      byCourse: Object.fromEntries(Object.entries(prev.byCourse).filter(([, v]) => v.templateId !== id))
    }));
  };

  /** Áp dụng cho tất cả môn (bỏ mẫu riêng của các môn) hoặc riêng môn đang chọn. */
  const applyTemplate = (id: string, scope: TemplateScope) => {
    if (scope === 'all') { setAssignment({ defaultId: id, byCourse: {} }); return; }
    if (!courseId) return;
    setAssignment(prev => ({ ...prev, byCourse: { ...prev.byCourse, [courseId]: { templateId: id, courseName } } }));
  };

  const clearCourseTemplate = (id = courseId) => setAssignment(prev => {
    const byCourse = { ...prev.byCourse };
    delete byCourse[id];
    return { ...prev, byCourse };
  });

  /** Tạo bảng trên Supabase bằng PAT đã lưu ở Cài đặt. */
  const createTemplatesTable = async () => {
    await SupabaseService.initializeDatabaseSchema(config, config.supabasePat);
    await reloadTemplates();
  };

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
    setChartFilter(null);
    try {
      const auth = await getQldtAuth();
      const cols = new Map<string, TestColumn>();
      const rows: MonitorBase[] = [];
      let done = 0;
      setProgress({ done: 0, total: selectedClassIds.length, text: 'Đang tải dữ liệu các lớp…' });
      for (const id of selectedClassIds) {
        const label = (classes.find(c => c.value === id)?.label || id).replace(/\s*\(\d+ SV\)$/, '');
        try {
          const d = await fetchClassDashboard(auth, id, courseId);
          // In response dashboard ra Console (DevTools của extension) để đối chiếu / lưu làm dữ liệu mẫu
          console.log(`[GIÁM SÁT] /classes/dashboard/${id}/${courseId} — ${label}`, d);
          rows.push(...parseMonitorClass(d, label, cols));
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

  /* ---------- Đánh giá + lọc (theo mẫu đang áp dụng cho môn) ---------- */
  const courseName = courses.find(c => c.value === courseId)?.label || '';
  const { template: activeTemplate, perCourse: activePerCourse } = resolveTemplate(templates, assignment, courseId);
  const monitorConfig = activeTemplate.monitor;
  const levels = monitorConfig.levels;
  const rules = activeTemplate.analysis;
  const watchList = useMemo(() => parseWatchList(watchText), [watchText]);
  const { rows, watchMissing } = useMemo(
    () => evaluateMonitor(baseRows, monitorConfig, rules, watchList),
    [baseRows, monitorConfig, rules, watchList]);
  const overview = useMemo(() => summarizeClass(rows, levels), [rows, levels]);
  const distributions = useMemo(() => buildDistributions(rows, levels), [rows, levels]);
  const filterCounts = useMemo(() => {
    const counts: Record<MonitorFilter, number> = {};
    MONITOR_FILTERS.forEach(f => { counts[f.key] = rows.filter(r => matchesFilter(r, f.key)).length; });
    levels.forEach(l => { counts[levelFilterKey(l.id)] = rows.filter(r => r.risk === l.id).length; });
    return counts;
  }, [rows, levels]);

  const visibleRows = useMemo(() => {
    const q = plainText(query);
    return rows.filter(r =>
      (!chartFilter || chartFilter.keys.has(r.key))
      && (!filters.length || filters.some(f => matchesFilter(r, f)))
      && (!q || plainText(r.name).includes(q) || plainText(r.code).includes(q) || plainText(r.email).includes(q)));
  }, [rows, filters, chartFilter, query]);

  /** Bấm 1 cột / 1 đoạn trên biểu đồ → mở danh sách đúng các SV đó. */
  const openChartBin = (title: string, bin: DistributionBin) => {
    if (!bin.count) return;
    setFilters([]);
    setChartFilter({ label: `${title}: ${bin.label}`, keys: new Set(bin.keys) });
    setView('list');
  };
  /** Bấm 1 mức trên biểu đồ (id mức) → lọc đúng mức đó. */
  const openRiskLevel = (levelId: string) => {
    setChartFilter(null);
    setFilters(levelId === 'normal' ? [] : [levelFilterKey(levelId)]);
    setView('list');
  };

  useEffect(() => {
    if (!rows.length) return;
    const o = overview;
    setStatusText(`${o.total} SV: ${describeByRisk(o, levels)}.`);
  }, [overview]);

  const toggleFilter = (f: MonitorFilter) =>
    setFilters(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]));

  /* ---------- Điểm AI bài tập của hệ thống: tự tải khi mở chi tiết 1 SV (1 request) ---------- */
  const [exerciseLoading, setExerciseLoading] = useState<Set<string>>(new Set());
  const loadStudentExercises = async (r: MonitorRow) => {
    if (r.exercises || exerciseLoading.has(r.key) || !courseId) return;
    setExerciseLoading(prev => new Set(prev).add(r.key));
    try {
      const exercises = toStudentExercises(await fetchStudentExercises(await getQldtAuth(), r.studentId, courseId));
      const update = { exercises, aiAvg: avg(exercises.map(e => e.ai)), aiCount: exercises.filter(e => e.ai != null).length };
      setBaseRows(prev => prev.map(x => (x.key === r.key ? { ...x, ...update } : x)));
    } catch (e: any) {
      logger.error(LOG_MODULE, `Không tải được bài tập của ${r.name}.`, e.message);
    } finally {
      setExerciseLoading(prev => { const next = new Set(prev); next.delete(r.key); return next; });
    }
  };

  /* ---------- Danh sách rà soát: bấm ⭐ để thêm / bỏ ---------- */
  const toggleWatch = (name: string) => setWatchText(prev => {
    const list = parseWatchList(prev);
    const key = plainText(name);
    const has = list.some(w => plainText(w) === key);
    return (has ? list.filter(w => plainText(w) !== key) : [...list, name]).join('\n');
  });

  /* ---------- AI viết nhận xét (chỉ chạy khi bấm) ---------- */
  const aiCredentials = { provider: config.aiProvider, modelName: config.aiModelName, apiKey: config.aiApiKey, apiUrl: config.aiApiUrl };

  const handleClassAi = async () => {
    if (!rows.length || classAi?.loading) return;
    setClassAi({ loading: true });
    try {
      const text = await callAiWithRateLimitRetry(buildClassOverviewPrompt(rows, courseName, levels), aiCredentials);
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
        'Mức': r.riskLevel.name,
        'Vi phạm': r.issues.map(i => `${i.label} (${i.levelName})`).join('; '),
        'Sắp vượt ngưỡng': r.early.map(e => e.label).join('; '),
        'Nghỉ học (%)': round1(r.absentRate), 'Thiếu bài tập (%)': round1(r.missingHomework), 'Chậm E-learning': r.unprepared
      };
      EXAM_CELLS.forEach(c => { record[c.key === 'ckTNCell' || c.key === 'ckTLCell' ? `Cuối môn - ${examCellLabel(r, c.key)}` : c.label] = r[c.key] === 'absent' ? 'Vắng' : round1(r[c.key] as number | null); });
      record['TB Hackathon'] = round1(r.hk);
      record['Tổng điểm thi'] = round1(r.ck);
      record['Thi bổ sung'] = r.makeupNotes.join('; ');
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
    monitorConfig, levels, rules, watchText, setWatchText,
    templates, templateSource, templateError, templatesLoading, assignment, activeTemplate, activePerCourse,
    reloadTemplates, saveTemplate, deleteTemplate, applyTemplate, clearCourseTemplate, createTemplatesTable,
    canCreateTable: !!config.supabasePat?.trim(),
    filters, toggleFilter, clearFilters: () => { setFilters([]); setChartFilter(null); }, query, setQuery,
    view, setView, distributions, chartFilter, clearChartFilter: () => setChartFilter(null), openChartBin, openRiskLevel,
    busy, progress, statusText, classAi, studentAi,
    handleClassChange, handleLoad, handleClassAi, handleStudentAi, handleExport,
    exerciseLoading, loadStudentExercises, toggleWatch,
    reloadClasses: () => loadClasses(classes.length ? { classIds: selectedClassIds, courseId } : savedSelection.current)
  };
}
