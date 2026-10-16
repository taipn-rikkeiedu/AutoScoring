import { getQldtAuth, qldtGetRaw, QldtAuthError } from '~/src/services/lms/qldtApiClient';
import { ApiRecord, saveApiRecords, describeApiUrl, parseBody } from '~/src/services/qldtApiStore';

/**
 * Quét chủ động mọi API GET đã biết của QLĐT cho tất cả lớp / môn tài khoản xem được:
 * tài khoản → lớp → chi tiết lớp (môn theo học kỳ) → dashboard lớp×môn (→ bài nộp từng SV)
 * → buổi của môn → đề từng buổi + tiến độ làm bài của lớp theo buổi.
 * Chỉ gọi GET, tối đa 3 request cùng lúc, dừng được giữa chừng; lưu dần vào kho API.
 */
const CONCURRENCY = 3;
const FLUSH_EVERY = 25;

export interface CrawlProgress {
  done: number;
  total: number;
  errors: number;
  current: string;
}

export interface CrawlResult {
  done: number;
  errors: number;
  stopped: boolean;
  authError?: string;
}

interface Task {
  path: string;
  label: string;
  next?: (data: any) => void;
}

const dataOf = (json: any) => (json && typeof json === 'object' && 'data' in json ? json.data : json);
const isError = (status: number, json: any) => status >= 400 || (json && typeof json.statusCode === 'number' && json.statusCode >= 400);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function crawlQldt(opts: {
  includeSubmissions: boolean;
  signal: AbortSignal;
  onProgress: (p: CrawlProgress) => void;
}): Promise<CrawlResult> {
  const auth = await getQldtAuth();
  const seen = new Set<string>();
  const queue: Task[] = [];
  const buffer: Omit<ApiRecord, 'hits'>[] = [];
  let done = 0;
  let errors = 0;
  let active = 0;
  let authError: string | undefined;

  const add = (path: string, label: string, next?: (data: any) => void) => {
    if (seen.has(path)) return;
    seen.add(path);
    queue.push({ path, label, next });
  };

  // Tiến độ làm bài theo buổi cần cả lớp lẫn buổi: buổi lấy 1 lần / môn, ghép với mọi lớp học môn đó
  const courseClasses = new Map<string, Set<string>>();
  const courseSessions = new Map<string, string[]>();
  const addProcess = (classId: string, sessionId: string) =>
    add(`/students/homeworkProcess/class/${classId}/session/${sessionId}`, `Tiến độ BTVN lớp ${classId} · buổi ${sessionId}`);

  const addCourse = (classId: string, className: string, courseId: string, courseName: string) => {
    if (!courseClasses.has(courseId)) courseClasses.set(courseId, new Set());
    courseClasses.get(courseId)!.add(classId);
    (courseSessions.get(courseId) || []).forEach(sid => addProcess(classId, sid));

    add(`/classes/dashboard/${classId}/${courseId}`, `Dashboard ${className} · ${courseName}`, (dash) => {
      if (!opts.includeSubmissions) return;
      (dash?.studentsInClass || []).forEach((it: any) => {
        const sid = it?.student?.id;
        if (sid != null) {
          add(`/exercise?classId=&courseId=${courseId}&sessionId=&studentName=&page=1&limit=500&studentId=${sid}`,
            `Bài nộp ${it.student?.fullName || sid} · ${courseName}`);
        }
      });
    });

    add(`/sessions/course/${courseId}`, `Buổi học · ${courseName}`, (sessions) => {
      const ids = (Array.isArray(sessions) ? sessions : []).map((s: any) => String(s.id));
      courseSessions.set(courseId, ids);
      (Array.isArray(sessions) ? sessions : []).forEach((s: any) => add(`/homework/session/${s.id}`, `Đề · ${s.name || s.id}`));
      courseClasses.get(courseId)!.forEach(cid => ids.forEach(sid => addProcess(cid, sid)));
    });
  };

  const onClasses = (classes: any) => {
    (Array.isArray(classes) ? classes : []).forEach((c: any) => {
      const classId = String(c.id);
      const className = c.name || classId;
      (c.courses || []).forEach((x: any) => addCourse(classId, className, String(x.id), x.name || String(x.id)));
      add(`/classes/${classId}`, `Chi tiết lớp ${className}`, (detail) => {
        (detail?.specializes?.semesters || []).forEach((sem: any) =>
          (sem.courses || []).forEach((x: any) => addCourse(classId, className, String(x.id), x.name || String(x.id))));
      });
    });
  };
  // Lớp theo từng hệ đào tạo của tài khoản (cách QLĐT hiện dùng) + /classes/system/0 (tất cả hệ, cách cũ)
  add('/systems/me', 'Tài khoản đang đăng nhập', (systems) => {
    (Array.isArray(systems) ? systems : []).forEach((s: any) => add(`/classes/system/${s.id}`, `Danh sách lớp · ${s.name || s.id}`, onClasses));
  });
  add('/classes/system/0', 'Danh sách lớp', onClasses);

  const flush = async () => {
    const batch = buffer.splice(0, buffer.length);
    if (batch.length) await saveApiRecords(batch);
  };

  const worker = async () => {
    while (!opts.signal.aborted && !authError) {
      const task = queue.shift();
      if (!task) {
        if (active === 0) return;
        await sleep(100);
        continue;
      }
      active++;
      opts.onProgress({ done, total: seen.size, errors, current: task.label });
      try {
        const res = await qldtGetRaw(task.path, auth);
        const json = parseBody(res.text);
        buffer.push({ url: res.url, ...describeApiUrl(res.url), status: res.status, source: 'crawled', at: new Date().toISOString(), response: json });
        if (isError(res.status, json)) errors++;
        else task.next?.(dataOf(json));
      } catch (e: any) {
        errors++;
        if (e instanceof QldtAuthError) authError = e.message;
      } finally {
        active--;
        done++;
        opts.onProgress({ done, total: seen.size, errors, current: task.label });
        if (buffer.length >= FLUSH_EVERY) await flush();
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await flush();
  return { done, errors, stopped: opts.signal.aborted, authError };
}
