/**
 * Điểm danh QLĐT: `/attendance?class_id&course_id` (theo ngày → các ca → trạng thái từng SV)
 * ghép với đơn xin nghỉ `/request-leave?classId` (nối qua attendanceDetailId).
 *
 * Quy ước (theo lựa chọn của người dùng):
 * - Ngày có nhiều ca: nghỉ ít nhất 1 ca là nghỉ ngày đó.
 * - "Liên tiếp" tính theo buổi học trên lịch của lớp (bỏ qua ngày không có lịch học).
 */

export type AttendanceKind = 'present' | 'excused' | 'unexcused' | 'late' | 'unknown';

/**
 * Mã trạng thái điểm danh của QLĐT. Suy ra từ dữ liệu thật: đơn "Phê duyệt" → 1, đơn "Từ chối" và
 * danh sách chăm sóc → 0, đa số → 4; mã 3 = đi muộn (giảng viên xác nhận) — có mặt, không tính là nghỉ.
 */
export const ATTENDANCE_CODES: Record<string, AttendanceKind> = { '4': 'present', '1': 'excused', '0': 'unexcused', '3': 'late' };

export const ATTENDANCE_LABELS: Record<AttendanceKind, { label: string; short: string; color: string }> = {
  present: { label: 'Có mặt', short: '·', color: '#d9d9d9' },
  excused: { label: 'Nghỉ có phép', short: 'P', color: '#fa8c16' },
  unexcused: { label: 'Nghỉ không phép', short: 'K', color: '#cf1322' },
  late: { label: 'Đi muộn', short: 'M', color: '#1677ff' },
  unknown: { label: 'Không rõ', short: '?', color: '#8c8c8c' }
};

export const isAbsentKind = (k: AttendanceKind) => k === 'excused' || k === 'unexcused';

export interface LeaveRequest {
  status: string;      // Phê duyệt / Từ chối / Đang chờ
  note: string;
  image: string;
  rejectReason: string;
}

export interface PeriodMark {
  period: number;      // ca (1, 2…)
  kind: AttendanceKind;
  note: string;
  leave: LeaveRequest | null;
}

export interface StudentDay {
  date: string;        // yyyy-mm-dd
  marks: PeriodMark[];
  absent: boolean;     // nghỉ ít nhất 1 ca
  excused: boolean;    // mọi ca nghỉ đều có phép
}

export interface AbsenceStreak {
  from: string;
  to: string;
  days: number;
  excused: number;     // số buổi nghỉ có phép trong chuỗi
}

export interface StudentAttendance {
  studentId: string;
  name: string;
  code: string;
  days: Record<string, StudentDay>;
  absentDays: number;
  excusedDays: number;
  unexcusedDays: number;
  maxStreak: number;
  streaks: AbsenceStreak[]; // các chuỗi nghỉ ≥ 2 buổi liên tiếp
}

export interface ClassAttendance {
  classLabel: string;
  dates: string[];     // các ngày có lịch học (tăng dần)
  students: Record<string, StudentAttendance>;
}

function parseLeaves(list: any[]): Map<string, LeaveRequest> {
  const map = new Map<string, LeaveRequest>();
  (Array.isArray(list) ? list : []).forEach(l => {
    if (l?.attendanceDetailId == null) return;
    map.set(String(l.attendanceDetailId), {
      status: String(l.status || ''),
      note: String(l.note || '').trim(),
      image: String(l.reasonImage || ''),
      rejectReason: String(l.rejectReason || '').trim()
    });
  });
  return map;
}

/** Chuỗi nghỉ liên tiếp theo các buổi học của lớp. */
function streaksOf(dates: string[], days: Record<string, StudentDay>): AbsenceStreak[] {
  const out: AbsenceStreak[] = [];
  let run: string[] = [];
  const close = () => {
    if (run.length) out.push({ from: run[0], to: run[run.length - 1], days: run.length, excused: run.filter(d => days[d].excused).length });
    run = [];
  };
  dates.forEach(d => {
    if (days[d]?.absent) run.push(d);
    else if (days[d]) close();
    // Ngày lớp có lịch nhưng SV không có dòng điểm danh (chưa vào lớp) → không cắt chuỗi, không tính nghỉ
  });
  close();
  return out;
}

export function parseClassAttendance(attendance: any, leaves: any[], classLabel: string): ClassAttendance {
  const byDate: Record<string, any[]> = attendance && typeof attendance === 'object' ? attendance : {};
  const leaveByDetail = parseLeaves(leaves);
  const dates = Object.keys(byDate).filter(d => Array.isArray(byDate[d]) && byDate[d].length).sort();
  const students: Record<string, StudentAttendance> = {};

  dates.forEach(date => {
    byDate[date].forEach((session: any) => {
      (session.attendanceDetail || []).forEach((a: any) => {
        const st = a.student || {};
        const id = String(st.id ?? '');
        if (!id) return;
        const s = (students[id] ||= {
          studentId: id, name: st.fullName || '', code: st.studentCode || '', days: {},
          absentDays: 0, excusedDays: 0, unexcusedDays: 0, maxStreak: 0, streaks: []
        });
        const day = (s.days[date] ||= { date, marks: [], absent: false, excused: false });
        day.marks.push({
          period: Number(session.period) || day.marks.length + 1,
          kind: ATTENDANCE_CODES[String(a.status)] || 'unknown',
          note: String(a.note || '').trim(),
          leave: leaveByDetail.get(String(a.id)) || null
        });
      });
    });
  });

  Object.values(students).forEach(s => {
    Object.values(s.days).forEach(day => {
      day.marks.sort((x, y) => x.period - y.period);
      const absentMarks = day.marks.filter(m => isAbsentKind(m.kind));
      day.absent = absentMarks.length > 0;
      day.excused = day.absent && absentMarks.every(m => m.kind === 'excused');
    });
    const absentList = Object.values(s.days).filter(d => d.absent);
    s.absentDays = absentList.length;
    s.excusedDays = absentList.filter(d => d.excused).length;
    s.unexcusedDays = s.absentDays - s.excusedDays;
    const all = streaksOf(dates, s.days);
    s.maxStreak = Math.max(0, ...all.map(x => x.days));
    s.streaks = all.filter(x => x.days >= 2);
  });

  return { classLabel, dates, students };
}

/** Thông tin nghỉ gắn vào dòng giám sát của 1 SV. */
export interface AbsenceSummary {
  absentDays: number;
  excusedDays: number;
  unexcusedDays: number;
  maxStreak: number;
  streaks: AbsenceStreak[];
}

export const fmtDay = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}` : iso;
};

export const weekday = (iso: string) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(`${iso}T00:00:00`).getDay()] || '';
