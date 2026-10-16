import { QldtAuthError, qldtGet } from './qldtApiClient';
import { cachedQldtGet } from './qldtCache';

export interface QldtOption {
  value: string;
  label: string;
}

export interface QldtClass {
  id: number | string;
  name: string;
  studentCount?: number;
  courses?: { id: number | string; name: string }[];
}

let classCache: QldtClass[] = [];

/**
 * Danh sách lớp mà tài khoản đang đăng nhập được xem.
 * QLĐT (từ 16/10/2026) lấy lớp theo từng hệ đào tạo: /systems/me → /classes/system/:id; /classes/system/0
 * (tất cả hệ, cách cũ) vẫn gọi kèm để không mất lớp nếu còn dùng được. Gộp, bỏ trùng theo id.
 */
export async function listQldtClasses(auth: string, force = false): Promise<QldtOption[]> {
  const tolerant = <T,>(p: Promise<T>, empty: T) => p.catch((e) => { if (e instanceof QldtAuthError) throw e; return empty; });
  const systems = (await tolerant(cachedQldtGet<{ id: number | string }[]>('/systems/me', auth, { force }), [])) || [];
  const ids = ['0', ...systems.map(s => String(s.id))];
  const lists = await Promise.all(ids.map(id => tolerant(cachedQldtGet<QldtClass[]>(`/classes/system/${id}`, auth, { force }), [] as QldtClass[])));
  const byId = new Map<string, QldtClass>();
  lists.flat().forEach(c => { if (c && !byId.has(String(c.id))) byId.set(String(c.id), c); });
  classCache = [...byId.values()];
  return classCache.map(c => ({
    value: String(c.id),
    label: `${c.name}${c.studentCount != null ? ` (${c.studentCount} SV)` : ''}`
  }));
}

/** Môn học của lớp: gộp môn đang gán cho lớp và môn trong chương trình (theo học kỳ). */
export async function listQldtCourses(auth: string, classId: string, force = false): Promise<QldtOption[]> {
  const out = new Map<string, QldtOption>();
  const cached = classCache.find(c => String(c.id) === String(classId));
  (cached?.courses || []).forEach(c => out.set(String(c.id), { value: String(c.id), label: c.name }));
  try {
    const detail = await cachedQldtGet<any>(`/classes/${classId}`, auth, { force });
    for (const sem of detail?.specializes?.semesters || []) {
      for (const c of sem.courses || []) {
        if (!out.has(String(c.id))) out.set(String(c.id), { value: String(c.id), label: `${c.name} — ${sem.name}` });
      }
    }
  } catch (e) {
    if (!out.size) throw e;
  }
  return [...out.values()];
}

/** Điểm thi (resultTest), tỉ lệ nộp BTVN, chuyên cần… của cả lớp theo môn. */
export function fetchClassDashboard(auth: string, classId: string, courseId: string): Promise<any> {
  return qldtGet(`/classes/dashboard/${classId}/${courseId}`, auth);
}

/** Toàn bộ bài tập của 1 SV trong môn (kèm aiReviews). */
export async function fetchStudentExercises(auth: string, studentId: string | number, courseId: string): Promise<any[]> {
  const list = (await qldtGet<any[]>(
    `/exercise?classId=&courseId=${courseId}&sessionId=&studentName=&page=1&limit=500&studentId=${studentId}`, auth
  )) || [];
  return list.filter(e => !e.course || String(e.course.id) === String(courseId));
}

/** Danh sách buổi của môn (theo thứ tự buổi học). */
export async function fetchCourseSessions(auth: string, courseId: string, force = false): Promise<{ id: string; name: string; position: number }[]> {
  const list = (await cachedQldtGet<any[]>(`/sessions/course/${courseId}`, auth, { force })) || [];
  return list
    .map(s => ({ id: String(s.id), name: String(s.name || `Buổi ${s.position ?? ''}`).trim(), position: Number(s.position) || 0 }))
    .sort((a, b) => a.position - b.position);
}

/** Các đề bài tập của 1 buổi (mô tả, tiêu chí chấm, hướng dẫn). */
export async function fetchSessionHomework(auth: string, sessionId: string): Promise<any[]> {
  return (await qldtGet<any[]>(`/homework/session/${sessionId}`, auth)) || [];
}

/** SV của lớp kèm trạng thái làm bài từng buổi (sessionStudent: status, completedExercises). */
export async function fetchSessionStudents(auth: string, classId: string, sessionId: string): Promise<any[]> {
  return (await qldtGet<any[]>(`/students/homeworkProcess/class/${classId}/session/${sessionId}`, auth)) || [];
}

/** Bài đã nộp của 1 SV trong 1 buổi — mỗi bài có homework.id nên khớp đúng đề theo ID. */
export async function fetchSessionExercises(auth: string, sessionId: string, studentId: string | number): Promise<any[]> {
  return (await qldtGet<any[]>(
    `/exercise?classId=&courseId=&sessionId=${sessionId}&studentName=&page=1&limit=100&studentId=${studentId}`, auth
  )) || [];
}

/** Lịch sử điểm danh của lớp theo môn: { 'yyyy-mm-dd': [ca học { period, attendanceDetail[] }] }. */
export async function fetchClassAttendance(auth: string, classId: string, courseId: string): Promise<Record<string, any[]>> {
  return (await qldtGet<Record<string, any[]>>(`/attendance?class_id=${classId}&course_id=${courseId}`, auth)) || {};
}

/** Đơn xin nghỉ của lớp (mọi môn, mọi thời gian) — nối với điểm danh qua attendanceDetailId. */
export async function fetchClassLeaves(auth: string, classId: string): Promise<any[]> {
  const list = await qldtGet<any>(`/request-leave?classId=${classId}`, auth);
  return Array.isArray(list) ? list : [];
}
