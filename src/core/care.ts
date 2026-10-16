/**
 * Chăm sóc học viên (QLĐT): mỗi ca = 1 buổi nghỉ không phép cần liên hệ.
 * Đọc: GET /take-care-students (lọc lớp, ngày, trạng thái…), GET /take-care-students/student/:id (lịch sử).
 * Ghi: PATCH /take-care-students/:id { reason, result, status, category, careMethod }.
 */

export interface CareCase {
  id: number;
  reason: string;
  status: string;
  statusChangedAt: string;
  category: string;
  careMethod: string;
  result: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  // Buổi nghỉ
  date: string;          // yyyy-mm-dd
  period: number;        // ca
  classId: string;
  className: string;
  courseName: string;
  // Sinh viên
  studentId: string;
  studentName: string;
  studentCode: string;
  phone: string;
  email: string;
}

/** Phần sửa được của 1 ca (đúng body của PATCH). */
export interface CarePatch {
  reason: string;
  result: string;
  status: string;
  category: string;
  careMethod: string;
}

export interface CareMeta {
  total: number;
  totalPages: number;
  totalNoPermitAbsent: number; // tổng buổi nghỉ không phép (theo bộ lọc lớp / ngày)
  totalResolved: number;       // số ca đã xử lý
}

export interface CareHistoryItem {
  id: number;
  status: string;
  category: string;
  careMethod: string;
  reason: string;
  result: string;
  date: string;
  subjectName: string;
  teacherName: string;
  updatedAt: string;
}

export interface CareHistory {
  totalNoPermitAbsent: number | null;
  totalResolved: number | null;
  items: CareHistoryItem[];
}

/** Giá trị đã thấy trên QLĐT (trạng thái mặc định khi mới phát sinh: "Đang xử lý"). */
export const CARE_STATUSES = [
  'Đang xử lý', 'Quay lại học', 'Đã hiểu và hứa đi học lại đủ', 'Có tiến bộ hơn', 'Xin học lại môn',
  'Không liên lạc được, chuyển CTSV', 'Khác'
];
export const CARE_CATEGORIES = [
  'Vấn đề Sức khoẻ', 'Vấn đề gia đình', 'Vấn đề cá nhân khác', 'Vấn đề học lực',
  'Vấn đề hệ thống, thiết bị học tập', 'Chưa rõ nguyên nhân', 'Khác'
];
export const CARE_METHODS = ['Nhắn tin', 'Cố vấn 1:1'];

export const PENDING_STATUS = 'Đang xử lý';

export const careStatusColor = (s: string) =>
  s === PENDING_STATUS ? 'orange'
    : /quay lại|hứa đi học|tiến bộ/i.test(s) ? 'green'
      : /không liên lạc|CTSV/i.test(s) ? 'red'
        : /học lại môn/i.test(s) ? 'purple'
          : 'default';

/** Thêm giá trị hiện tại vào danh sách lựa chọn nếu QLĐT có giá trị chưa biết. */
export const optionsWith = (list: string[], current?: string) =>
  [...list, ...(current && !list.includes(current) ? [current] : [])].map(v => ({ value: v, label: v }));

const str = (v: unknown) => (v == null ? '' : String(v).trim());

export function parseCareCase(x: any): CareCase {
  const ad = x?.attendanceDetail || {};
  const att = ad.attendance || {};
  const st = ad.student || {};
  return {
    id: Number(x.id),
    reason: str(x.reason), status: str(x.status), statusChangedAt: str(x.statusChangedAt),
    category: str(x.category), careMethod: str(x.careMethod), result: str(x.result), imageUrl: str(x.imageUrl),
    createdAt: str(x.createdAt), updatedAt: str(x.updatedAt),
    date: str(att.date), period: Number(att.period) || 0,
    classId: str(att.classes?.id), className: str(att.classes?.name), courseName: str(att.courses?.name),
    studentId: str(st.id), studentName: str(st.fullName), studentCode: str(st.studentCode), phone: str(st.phone), email: str(st.email)
  };
}

export function parseCareHistory(d: any): CareHistory {
  const s = d?.student || {};
  const items: CareHistoryItem[] = (d?.history || []).map((h: any) => ({
    id: Number(h.id), status: str(h.status), category: str(h.category), careMethod: str(h.careMethod),
    reason: str(h.reason), result: str(h.result), updatedAt: str(h.updatedAt || h.statusChangedAt),
    date: str(h.attendanceDetail?.date), subjectName: str(h.attendanceDetail?.subjectName), teacherName: str(h.attendanceDetail?.teacherName)
  }));
  items.sort((a, b) => b.date.localeCompare(a.date));
  return {
    totalNoPermitAbsent: s.totalNoPermitAbsent != null ? Number(s.totalNoPermitAbsent) : null,
    totalResolved: s.totalResolved != null ? Number(s.totalResolved) : null,
    items
  };
}

export const patchOf = (c: CareCase): CarePatch =>
  ({ reason: c.reason, result: c.result, status: c.status, category: c.category, careMethod: c.careMethod });

export const samePatch = (a: CarePatch, b: CarePatch) =>
  (Object.keys(a) as (keyof CarePatch)[]).every(k => (a[k] || '') === (b[k] || ''));
