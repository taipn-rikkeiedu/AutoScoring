import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { logger } from '~/src/core/logger';
import { extractComment, queryActiveLmsTab } from '~/src/core/utils';
import { plainText } from '~/src/core/examAnalysis';
import {
  BatchItem, BatchResult, BatchStudent, NOT_SUBMITTED_FILTER,
  parseSessionStudents, parseSessionHomework, buildStudentItems, submittedCount, pickResult, criteriaOf,
  SessionAiKind, buildSessionAiPrompt
} from '~/src/core/batchGrading';
import { gradeSubmission } from '~/src/services/graderService';
import { credentialsFrom } from '~/src/services/ai/aiService';
import type { QldtOption } from '~/src/services/qldt/types';
import { useServices } from '~/src/services/ServicesContext';
import { localStore } from '~/src/infra/storage';
import { useClipboard } from '~/src/hooks/common/useClipboard';

const LOG_MODULE = 'BATCH_GRADER';
const PREFS_KEY = 'batchGraderPrefs';
const RESULTS_KEY = 'batchGraderResults';
const MAX_SAVED_SESSIONS = 10;
const STUDENT_FETCH_CONCURRENCY = 4;

interface Prefs { classId?: string; courseId?: string; sessionId?: string }
type SavedResult = BatchResult & { link: string };
type AiResult = { loading: boolean; text?: string; error?: string };
type SavedSessions = Record<string, { savedAt: string; items: Record<string, SavedResult> }>;

async function mapLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
}

const readSaved = async (): Promise<SavedSessions> => (await localStore.get<SavedSessions>(RESULTS_KEY)) || {};

export function useBatchGrader() {
  const { config, aiStatus } = useApp();
  const { showToast } = useToast();
  const { ai, qldt: { catalog, homework: homeworkService } } = useServices();
  const [classes, setClasses] = useState<QldtOption[]>([]);
  const [classesTried, setClassesTried] = useState(false);
  const [classId, setClassId] = useState('');
  const [courses, setCourses] = useState<QldtOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [sessions, setSessions] = useState<QldtOption[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [loadedKey, setLoadedKey] = useState(''); // `${classId}:${sessionId}` của dữ liệu đang hiện
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ done: number; total: number } | null>(null);
  const [grading, setGrading] = useState<{ done: number; total: number; text: string } | null>(null);
  const [statusText, setStatusText] = useState('Chọn lớp → môn → buổi rồi bấm "Tải bài nộp". Cần đăng nhập QLĐT ít nhất một lần.');
  const [sessionAi, setSessionAi] = useState<Partial<Record<SessionAiKind, AiResult>>>({});
  const abortRef = useRef<AbortController | null>(null);
  const prefsLoaded = useRef(false);

  /* ---------- Lớp / môn / buổi (nhớ lựa chọn lần trước) ---------- */
  const loadSessions = async (cid: string, want = '', force = false) => {
    setSessions([]);
    setSessionId('');
    if (!cid) return;
    try {
      const list = await catalog.listSessions(cid, force);
      setSessions(list.map(s => ({ value: s.id, label: s.name })));
      if (list.some(s => s.id === want)) setSessionId(want);
    } catch (e: any) {
      setStatusText('Không tải được danh sách buổi: ' + e.message);
    }
  };

  const loadCourses = async (id: string, want: Prefs = {}, force = false) => {
    setCourses([]);
    setCourseId('');
    setSessions([]);
    setSessionId('');
    if (!id) return;
    try {
      const list = await catalog.listCourses(id, force);
      setCourses(list);
      if (want.courseId && list.some(c => c.value === want.courseId)) {
        setCourseId(want.courseId);
        await loadSessions(want.courseId, want.sessionId, force);
      }
    } catch (e: any) {
      setStatusText('Không tải được môn học: ' + e.message);
    }
  };

  /** force: bỏ qua cache danh mục (nút Thử lại). */
  const loadClasses = async (want: Prefs = {}, force = false) => {
    try {
      const list = await catalog.listClasses(force);
      setClasses(list);
      if (!list.length) setStatusText('Tài khoản QLĐT đang đăng nhập không có lớp nào (đã tìm theo từng hệ đào tạo).');
      if (want.classId && list.some(c => c.value === want.classId)) {
        setClassId(want.classId);
        await loadCourses(want.classId, want, force);
      }
    } catch (e: any) {
      setStatusText('Không tải được danh sách lớp: ' + e.message);
      logger.error(LOG_MODULE, 'Không tải được danh sách lớp QLĐT.', e.message);
    } finally {
      setClassesTried(true);
    }
  };

  useEffect(() => {
    localStore.get<Prefs>(PREFS_KEY).then((saved) => {
      const prefs: Prefs = saved || {};
      const start = (want: Prefs) => { prefsLoaded.current = true; loadClasses(want); };
      // Đang mở trang kiểm tra bài tập của 1 lớp trên QLĐT → chọn sẵn lớp đó
      try {
        queryActiveLmsTab((tab) => {
          const fromUrl = (tab?.url || '').match(/qldt\.rikkei\.edu\.vn\/.*?(?:homework-checking|class(?:es)?(?:\/detail)?)\/(\d+)/i)?.[1];
          start(fromUrl && fromUrl !== prefs.classId ? { classId: fromUrl } : prefs);
        });
      } catch {
        start(prefs);
      }
    });
  }, []);

  useEffect(() => {
    if (!prefsLoaded.current || !classes.length) return;
    localStore.set({ [PREFS_KEY]: { classId, courseId, sessionId } });
  }, [classId, courseId, sessionId, classes]);

  const handleClassChange = (id: string) => { setClassId(id); loadCourses(id); };
  const handleCourseChange = (id: string) => { setCourseId(id); loadSessions(id); };

  /* ---------- Lưu kết quả chấm theo lớp + buổi ---------- */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loadedKey || !students.length) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const items: Record<string, SavedResult> = {};
      students.forEach(s => s.items.forEach(i => {
        if (i.status === 'success' || i.status === 'error') items[i.key] = { ...pickResult(i), link: i.link };
      }));
      const all = await readSaved();
      if (Object.keys(items).length) all[loadedKey] = { savedAt: new Date().toISOString(), items };
      else delete all[loadedKey];
      const keep = Object.entries(all).sort((a, b) => b[1].savedAt.localeCompare(a[1].savedAt)).slice(0, MAX_SAVED_SESSIONS);
      localStore.set({ [RESULTS_KEY]: Object.fromEntries(keep) });
    }, 500);
  }, [students, loadedKey]);

  /* ---------- Tải SV + bài nộp + đề của buổi ---------- */
  const handleLoad = async () => {
    if (loading || grading) return;
    if (!classId || !sessionId) { setStatusText('Hãy chọn lớp, môn và buổi học.'); return; }
    setLoading(true);
    try {
      const [rawStudents, rawHomework, saved] = await Promise.all([
        homeworkService.sessionStudents(classId, sessionId),
        homeworkService.sessionHomework(sessionId),
        readSaved()
      ]);
      const key = `${classId}:${sessionId}`;
      const savedItems = saved[key]?.items || {};
      const homework = parseSessionHomework(rawHomework);
      const base = parseSessionStudents(rawStudents, sessionId);
      const result: BatchStudent[] = [];
      let done = 0;
      setLoadProgress({ done: 0, total: base.length });
      await mapLimit(base, STUDENT_FETCH_CONCURRENCY, async (stu) => {
        let exercises: any[] = [];
        try {
          exercises = await homeworkService.sessionExercises(sessionId, stu.studentId);
        } catch (e: any) {
          logger.error(LOG_MODULE, `Không đọc được bài nộp của ${stu.name}.`, e.message);
        }
        const items = buildStudentItems(stu, homework, exercises).map(i => {
          const s = savedItems[i.key];
          // Giữ kết quả chấm trước nếu SV chưa nộp lại link khác
          return s && s.link === i.link ? { ...i, ...s, link: i.link } : i;
        });
        result.push({ ...stu, items });
        setLoadProgress({ done: ++done, total: base.length });
      });
      result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      setStudents(result);
      setLoadedKey(key);
      setStatusFilters([]);
      setSessionAi({});
      // Mặc định chọn sẵn mọi bài có link (chưa chấm)
      setChecked(new Set(result.flatMap(s => s.items.filter(i => i.link && i.status !== 'success').map(i => i.key))));
      const total = result.reduce((n, s) => n + submittedCount(s), 0);
      const graded = result.reduce((n, s) => n + s.items.filter(i => i.status === 'success').length, 0);
      setStatusText(`${result.length} SV, ${homework.length} đề, ${total} bài đã nộp${graded ? ` (${graded} bài đã chấm trước đó)` : ''}.`);
      logger.success(LOG_MODULE, `Tải buổi ${sessionId}: ${result.length} SV, ${total} bài nộp.`);
    } catch (e: any) {
      setStatusText('Lỗi tải bài nộp: ' + e.message);
      logger.error(LOG_MODULE, 'Không tải được bài nộp.', e.message);
    } finally {
      setLoading(false);
      setLoadProgress(null);
    }
  };

  /* ---------- Lọc ---------- */
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach(s => {
      const k = s.status || 'Chưa có trạng thái';
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    const notSubmitted = students.filter(s => !submittedCount(s)).length;
    return [...counts.entries()].map(([label, count]) => ({ label, count }))
      .concat(notSubmitted ? [{ label: NOT_SUBMITTED_FILTER, count: notSubmitted }] : []);
  }, [students]);

  const visibleStudents = useMemo(() => {
    const q = plainText(query);
    return students.filter(s =>
      (!statusFilters.length || statusFilters.some(f => (f === NOT_SUBMITTED_FILTER ? !submittedCount(s) : (s.status || 'Chưa có trạng thái') === f)))
      && (!q || plainText(s.name).includes(q) || plainText(s.code).includes(q)));
  }, [students, statusFilters, query]);

  const toggleStatusFilter = (f: string) =>
    setStatusFilters(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]));

  /* ---------- Chấm ---------- */
  const updateItem = (key: string, patch: Partial<BatchItem>) =>
    setStudents(prev => prev.map(s => (s.items.some(i => i.key === key)
      ? { ...s, items: s.items.map(i => (i.key === key ? { ...i, ...patch } : i)) }
      : s)));

  const gradeItem = async (item: BatchItem, onStatus?: (msg: string) => void): Promise<boolean> => {
    if (!item.link) return false;
    updateItem(item.key, { status: 'downloading', score: null, report: undefined, error: undefined });
    try {
      const r = await gradeSubmission(config, item.link, item.assignment, criteriaOf(item), onStatus || null,
        (fileList) => updateItem(item.key, { fileList, status: 'grading' }), { assignmentImages: item.images });
      updateItem(item.key, {
        status: 'success', score: r.score, report: r.report, fileList: r.fileList, language: r.language,
        astMetrics: r.astMetrics, imagesAttached: r.imagesAttached, imagesSkipped: r.imagesSkipped,
        assignmentImagesAttached: r.assignmentImagesAttached, assignmentImagesMissing: r.assignmentImagesMissing,
        gradedAt: new Date().toISOString()
      });
      return true;
    } catch (e: any) {
      updateItem(item.key, { status: 'error', error: e.message });
      return false;
    }
  };

  const allItems = useMemo(() => students.flatMap(s => s.items), [students]);
  const checkedItems = allItems.filter(i => checked.has(i.key) && i.link);

  const handleGradeOne = (item: BatchItem) => { if (!grading) gradeItem(item); };

  const handleGradeChecked = async () => {
    const queue = checkedItems;
    if (!queue.length || grading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    let ok = 0;
    let fail = 0;
    for (let n = 0; n < queue.length; n++) {
      if (controller.signal.aborted) break;
      const item = queue[n];
      const label = `${item.studentName} — ${item.title}`;
      setGrading({ done: n, total: queue.length, text: `Đang chấm ${label}` });
      const success = await gradeItem(item, (msg) => setGrading({ done: n, total: queue.length, text: `${label}: ${msg}` }));
      if (success) ok++; else fail++;
      if (success) setChecked(prev => { const next = new Set(prev); next.delete(item.key); return next; });
    }
    setGrading(null);
    abortRef.current = null;
    showToast(`${controller.signal.aborted ? 'Đã dừng. ' : ''}Chấm xong: ${ok} bài thành công${fail ? `, ${fail} bài lỗi` : ''}.`, fail ? 'warning' : 'success');
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setGrading(g => (g ? { ...g, text: 'Đang dừng sau bài hiện tại…' } : g));
  };

  /* ---------- AI nhận xét tổng quan cả lớp trong buổi (chỉ chạy khi bấm) ---------- */
  const handleSessionAi = async (kind: SessionAiKind) => {
    if (!students.length || sessionAi[kind]?.loading) return;
    setSessionAi(prev => ({ ...prev, [kind]: { loading: true } }));
    try {
      const prompt = buildSessionAiPrompt(kind, students, {
        className: classes.find(c => c.value === classId)?.label || '',
        courseName: courses.find(c => c.value === courseId)?.label || '',
        sessionName: sessions.find(x => x.value === sessionId)?.label || '',
        scale: config.gradingScale || '10'
      });
      const text = await ai.generate(prompt, credentialsFrom(config));
      setSessionAi(prev => ({ ...prev, [kind]: { loading: false, text: text.trim() } }));
    } catch (e: any) {
      setSessionAi(prev => ({ ...prev, [kind]: { loading: false, error: e.message } }));
      logger.error(LOG_MODULE, 'AI không viết được nhận xét buổi.', e.message);
    }
  };

  /* ---------- Sao chép ---------- */
  const scale = config.gradingScale || '10';
  const copy = useClipboard();

  /** Nhận xét + điểm của 1 bài, dán thẳng vào ô nhận xét trên QLĐT. */
  const commentText = (item: BatchItem) => {
    const comment = extractComment(item.report || '') || (item.report || '').replace(/<score>[\s\S]*?<\/score>/gi, '').trim();
    return `${comment}\n\nTổng điểm: ${item.score ?? '--'}/${scale}`;
  };
  const copyItemComment = (item: BatchItem) => copy(commentText(item), `Đã sao chép nhận xét & điểm của ${item.studentName}.`);

  const handleCopyReport = (format: 'detailed' | 'tsv' | 'markdown') => {
    const rows = visibleStudents.flatMap(s => s.items.map(i => ({ s, i })));
    if (!rows.length) { showToast('Chưa có dữ liệu để sao chép.', 'warning'); return; }
    const statusOf = (i: BatchItem) => (!i.link ? 'Chưa nộp' : i.status === 'success' ? 'Đã chấm' : i.status === 'error' ? 'Lỗi' : 'Chưa chấm');
    const session = sessions.find(x => x.value === sessionId)?.label || '';
    let text = '';
    if (format === 'tsv') {
      text = ['STT\tMSSV\tHọ và tên\tTrạng thái buổi\tĐề\tLink\tĐiểm\tTình trạng',
        ...rows.map(({ s, i }, n) => `${n + 1}\t${s.code}\t${s.name}\t${s.status}\t${i.title}\t${i.link}\t${i.score ?? ''}\t${statusOf(i)}`)].join('\n');
    } else if (format === 'markdown') {
      const esc = (x: string) => x.replace(/\|/g, '-');
      text = ['| STT | Sinh viên | Đề | Link | Điểm |', '|---|---|---|---|---|',
        ...rows.map(({ s, i }, n) => `| ${n + 1} | ${esc(s.name)} | ${esc(i.title)} | ${i.link ? `[link](${i.link})` : 'Chưa nộp'} | ${i.score ?? '--'} |`)].join('\n');
    } else {
      text = `📊 ${session} — ${visibleStudents.length} SV\n⏰ ${new Date().toLocaleString('vi-VN')}\n` + '-'.repeat(40) + '\n'
        + visibleStudents.map((s, n) => `${n + 1}. ${s.name} (${s.code}) — ${s.status || 'chưa có trạng thái'}\n`
          + s.items.map(i => `   - ${i.title}: ${i.link ? `${i.score != null ? `${i.score}/${scale}` : statusOf(i)} · ${i.link}` : 'Chưa nộp'}`).join('\n')).join('\n\n');
    }
    copy(text, `Đã sao chép ${rows.length} dòng.`);
  };

  return {
    classes, classesTried, classId, courses, courseId, sessions, sessionId, setSessionId,
    handleClassChange, handleCourseChange, reloadClasses: () => loadClasses({ classId, courseId, sessionId }, true),
    students, visibleStudents, statusCounts, statusFilters, toggleStatusFilter, clearStatusFilters: () => setStatusFilters([]),
    query, setQuery, checked, setChecked, checkedItems,
    loading, loadProgress, grading, statusText, aiStatus, scale,
    handleLoad, handleGradeOne, handleGradeChecked, handleCancel,
    copyItemComment, handleCopyReport,
    sessionAi, handleSessionAi,
    copySessionAi: (kind: SessionAiKind) => { const t = sessionAi[kind]?.text; if (t) copy(t, 'Đã sao chép nhận xét buổi.'); }
  };
}
