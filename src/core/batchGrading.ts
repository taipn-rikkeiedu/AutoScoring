/**
 * Chấm hàng loạt qua API QLĐT: lớp → môn → buổi.
 * Bài nộp (`/exercise`) có sẵn homework.id nên khớp đúng đề của buổi theo ID, không đoán theo tên.
 */
import { BankHomework, toBankHomework } from './exerciseBank';
import { DEFAULT_CRITERIA } from './utils';
import type { ASTMetrics } from '~/src/services/codeAnalysis';

export type BatchItemStatus = 'pending' | 'downloading' | 'grading' | 'success' | 'error';

/** Kết quả chấm của extension (lưu lại để mở lại tab vẫn còn). */
export interface BatchResult {
  status: BatchItemStatus;
  score?: string | null;
  report?: string;
  error?: string;
  fileList?: string[];
  language?: string;
  astMetrics?: ASTMetrics;
  imagesAttached?: number;
  imagesSkipped?: number;
  gradedAt?: string;
}

export interface BatchItem extends BatchResult {
  key: string;            // `${studentId}:${homeworkId}`
  studentId: string;
  studentName: string;
  homeworkId: string;
  title: string;
  assignment: string;     // mô tả đề + hướng dẫn
  criteria: string;       // tiêu chí trên QLĐT, '' nếu chưa nhập
  link: string;           // '' = chưa nộp
  sysAi: string;          // điểm AI của hệ thống QLĐT (chỉ để tham khảo)
  comment: string;        // nhận xét đang có trên QLĐT
}

export interface BatchStudent {
  studentId: string;
  name: string;
  code: string;
  status: string;         // trạng thái buổi trên QLĐT
  completed: number | null;
  items: BatchItem[];
}

export const NOT_SUBMITTED_FILTER = 'Chưa nộp bài';

export const criteriaOf = (item: Pick<BatchItem, 'criteria'>) => item.criteria || DEFAULT_CRITERIA;

export function parseSessionStudents(list: any[], sessionId: string): Omit<BatchStudent, 'items'>[] {
  return list.map(s => {
    const ss = (s.sessionStudent || []).find((x: any) => x.session && String(x.session.id) === String(sessionId));
    return {
      studentId: String(s.id),
      name: String(s.fullName || '').trim(),
      code: String(s.studentCode || '').trim(),
      status: ss?.status || '',
      completed: ss?.completedExercises != null ? Number(ss.completedExercises) : null
    };
  });
}

export const parseSessionHomework = (list: any[]): BankHomework[] => list.map(toBankHomework);

/** Lần chấm AI mới nhất của hệ thống (đã xong). */
function systemAiText(ex: any): string {
  const done = (ex.aiReviews || []).filter((r: any) => r && r.status === 'COMPLETED' && r.score != null)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const r = done[done.length - 1];
  if (r) return `${r.score}/${r.maxScore || 100}`;
  return (ex.aiReviews || []).length ? 'Lỗi AI' : '';
}

/** Mỗi đề của buổi là 1 dòng; đề SV chưa nộp vẫn hiện (link rỗng). */
export function buildStudentItems(
  stu: Omit<BatchStudent, 'items'>,
  homework: BankHomework[],
  exercises: any[]
): BatchItem[] {
  // Nộp nhiều lần cùng 1 đề → lấy bản mới nhất
  const latest = new Map<string, any>();
  for (const ex of exercises) {
    const hid = String(ex.homework?.id ?? '');
    if (!hid) continue;
    const prev = latest.get(hid);
    if (!prev || Number(ex.id) > Number(prev.id)) latest.set(hid, ex);
  }
  const extra = [...latest.keys()].filter(id => !homework.some(h => h.id === id))
    .map(id => toBankHomework(latest.get(id).homework));
  return [...homework, ...extra].map(h => {
    const ex = latest.get(h.id);
    return {
      key: `${stu.studentId}:${h.id}`,
      studentId: stu.studentId,
      studentName: stu.name,
      homeworkId: h.id,
      title: h.title,
      assignment: h.assignment,
      criteria: h.criteria,
      link: String(ex?.link_git || '').trim(),
      sysAi: ex ? systemAiText(ex) : '',
      comment: String(ex?.comment || '').trim(),
      status: 'pending'
    };
  });
}

export const submittedCount = (s: BatchStudent) => s.items.filter(i => i.link).length;

/** Điểm trung bình các bài đã chấm của 1 SV. */
export function studentAverage(s: BatchStudent): number | null {
  const scores = s.items.filter(i => i.status === 'success' && i.score != null).map(i => parseFloat(i.score!)).filter(n => !isNaN(n));
  return scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
}

export const RESULT_FIELDS: (keyof BatchResult)[] = [
  'status', 'score', 'report', 'error', 'fileList', 'language', 'astMetrics', 'imagesAttached', 'imagesSkipped', 'gradedAt'
];

export function pickResult(item: BatchItem): BatchResult {
  const out: any = {};
  RESULT_FIELDS.forEach(k => { if (item[k] !== undefined) out[k] = item[k]; });
  return out;
}
