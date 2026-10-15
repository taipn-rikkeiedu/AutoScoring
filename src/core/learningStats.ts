/**
 * Chỉ số học tập theo lớp + môn, lấy từ API `/classes/dashboard/{classId}/{courseId}` của QLĐT.
 * Ý nghĩa các trường đã đối chiếu với trang Thống kê học tập của QLĐT.
 */
import { parseClassDashboard, TestPhase, TestKind, avg } from './examAnalysis';

/** Điểm 1 phần thi: số điểm, 'absent' khi SV vắng thi, null khi chưa có bài thi này. */
export type ExamCell = number | 'absent' | null;

export interface LearningStatRow {
  key: string;
  no: number;
  studentId: string | number;
  name: string;
  email: string;
  code: string;
  studentStatus: string;          // "ĐANG HỌC", "ĐÌNH CHỈ"…
  absentRate: number | null;      // tỉ lệ nghỉ học (%) — attendanceRate
  missingHomework: number | null; // tỉ lệ thiếu bài tập (%) — 100 − submissionRate
  unprepared: number | null;      // số lần không chuẩn bị bài (e-learning chậm) — elearningProgress
  rpoints: number | null;
  hkTN: ExamCell; hkTL: ExamCell; ckTN: ExamCell; ckTL: ExamCell;
}

export interface LearningStatsSummary {
  total: number;
  absentOver10: number;     // nghỉ học > 10%
  homeworkOver10: number;   // thiếu bài tập > 10%
  unprepared: number;       // có vi phạm không chuẩn bị bài
}

export interface LearningStatsData {
  className: string;
  courseName: string;
  rows: LearningStatRow[];
  summary: LearningStatsSummary;
}

export const LEARNING_STATS_RISK_PERCENT = 10;

export function parseLearningStats(d: any): LearningStatsData {
  const list: any[] = d?.studentsInClass || [];
  const className = d?.classInfo?.name || '';
  const analysisRows = parseClassDashboard(d, className, new Map());

  const examCell = (tests: { phase: TestPhase; kind: TestKind; point: number | null; absent: boolean }[], phase: TestPhase, kind: TestKind): ExamCell => {
    const own = tests.filter(t => t.phase === phase && t.kind === kind);
    if (!own.length) return null;
    if (own.some(t => t.absent)) return 'absent';
    return avg(own.map(t => t.point));
  };

  const rows: LearningStatRow[] = list.map((it, i) => {
    const s = it.student || {};
    const a = analysisRows[i];
    const tests = Object.values(a.tests);
    // Không có resultTest thì dùng điểm từ bảng tổng kết (đã tính sẵn trong parseClassDashboard)
    const pick = (phase: TestPhase, kind: TestKind, fallback: number | null): ExamCell =>
      tests.length ? examCell(tests, phase, kind) : fallback;
    const submission = it.submissionRate != null ? Number(it.submissionRate) : null;
    return {
      key: a.key,
      no: i + 1,
      studentId: s.id,
      name: s.fullName || '',
      email: s.email || '',
      code: s.studentCode || '',
      studentStatus: s.status || it.status || '',
      absentRate: it.attendanceRate != null ? Number(it.attendanceRate) : null,
      missingHomework: submission != null ? Math.max(0, 100 - submission) : null,
      unprepared: it.elearningProgress != null ? Number(it.elearningProgress) : null,
      rpoints: it.rpoints != null ? Number(it.rpoints) : null,
      hkTN: pick('hk', 'TN', a.hkTN), hkTL: pick('hk', 'TL', a.hkTL),
      ckTN: pick('ck', 'TN', a.ckTN), ckTL: pick('ck', 'TL', a.ckTL)
    };
  });

  const count = (fn: (r: LearningStatRow) => boolean) => rows.filter(fn).length;
  return {
    className,
    courseName: d?.course?.name || '',
    rows,
    summary: {
      total: rows.length,
      absentOver10: count(r => (r.absentRate ?? 0) > LEARNING_STATS_RISK_PERCENT),
      homeworkOver10: count(r => (r.missingHomework ?? 0) > LEARNING_STATS_RISK_PERCENT),
      unprepared: count(r => (r.unprepared ?? 0) > 0)
    }
  };
}
