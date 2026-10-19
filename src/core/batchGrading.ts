/**
 * Chấm hàng loạt qua API QLĐT: lớp → môn → buổi.
 * Bài nộp (`/exercise`) có sẵn homework.id nên khớp đúng đề của buổi theo ID, không đoán theo tên.
 */
import { BankHomework, toBankHomework } from './exerciseBank';
import { DEFAULT_CRITERIA, extractComment } from './utils';
import type { ASTMetrics } from '~/src/core/codeAnalysis';

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
  assignmentImagesAttached?: number;
  assignmentImagesMissing?: number;
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
  images: string[];       // ảnh trong đề, khớp nhãn [Ảnh n]
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
      images: h.images || [],
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
  'status', 'score', 'report', 'error', 'fileList', 'language', 'astMetrics', 'imagesAttached', 'imagesSkipped',
  'assignmentImagesAttached', 'assignmentImagesMissing', 'gradedAt'
];

export function pickResult(item: BatchItem): BatchResult {
  const out: any = {};
  RESULT_FIELDS.forEach(k => { if (item[k] !== undefined) out[k] = item[k]; });
  return out;
}

/* ---------- AI nhận xét tổng quan bài tập của cả lớp trong 1 buổi ---------- */
export type SessionAiKind = 'class' | 'report';

export const SESSION_AI_KINDS: { key: SessionAiKind; label: string; hint: string }[] = [
  { key: 'class', label: 'Gửi lớp', hint: 'Lời nhắn đăng nhóm lớp: điểm làm tốt, lỗi phổ biến và cách sửa, nhắc nộp bài — không nêu tên hay điểm từng người.' },
  { key: 'report', label: 'Báo cáo', hint: 'Cho giảng viên / giáo vụ: tỉ lệ nộp, điểm theo từng bài, lỗi phổ biến, sinh viên cần chú ý (có nêu tên).' }
];

const MAX_FEEDBACK_CHARS = 350;
const MAX_FEEDBACK_TOTAL = 12000;
const MAX_LISTED_STUDENTS = 30;

/** Nhận xét của 1 bài: kết quả AI chấm của extension, không có thì lấy nhận xét đang có trên QLĐT. */
export function itemFeedback(i: BatchItem): string {
  const ai = i.status === 'success'
    ? (extractComment(i.report || '') || i.report || '').replace(/<score>[\s\S]*?<\/score>/gi, '')
    : '';
  const text = (ai.trim() || i.comment).replace(/\s+/g, ' ').trim();
  return text.length > MAX_FEEDBACK_CHARS ? `${text.slice(0, MAX_FEEDBACK_CHARS)}…` : text;
}

const scoreOf = (i: BatchItem) => {
  const n = i.status === 'success' && i.score != null ? parseFloat(i.score) : NaN;
  return isNaN(n) ? null : n;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface SessionAiContext { className: string; courseName: string; sessionName: string; scale: string }

/** Prompt AI tổng quan buổi: số liệu nộp / điểm theo từng bài + trích nhận xét từng bài để AI rút ra lỗi phổ biến. */
export function buildSessionAiPrompt(kind: SessionAiKind, students: BatchStudent[], ctx: SessionAiContext): string {
  const scale = parseFloat(ctx.scale) || 10;
  const low = scale / 2;
  const total = students.length;
  const hwIds = [...new Set(students.flatMap(s => s.items.map(i => i.homeworkId)))];
  const titles = new Map(students.flatMap(s => s.items.map(i => [i.homeworkId, i.title.replace(/^\s*\[[^\]]*\]\s*/, '') || i.title] as const)));
  const itemsOf = (hid: string) => students.flatMap(s => s.items.filter(i => i.homeworkId === hid));

  const full = students.filter(s => s.items.length && submittedCount(s) === s.items.length).length;
  const none = students.filter(s => !submittedCount(s)).length;
  const statusCounts = new Map<string, number>();
  students.forEach(s => statusCounts.set(s.status || 'chưa có', (statusCounts.get(s.status || 'chưa có') || 0) + 1));

  const hwLines = hwIds.map((hid, n) => {
    const items = itemsOf(hid);
    const sub = items.filter(i => i.link);
    const scores = sub.map(scoreOf).filter((x): x is number => x != null);
    const scoreText = scores.length
      ? `đã chấm ${scores.length}, điểm TB ${round1(scores.reduce((a, b) => a + b, 0) / scores.length)}, thấp nhất ${Math.min(...scores)}, cao nhất ${Math.max(...scores)}, dưới ${low}: ${scores.filter(x => x < low).length} bài`
      : 'chưa chấm bài nào';
    return `- Bài ${n + 1} "${titles.get(hid)}": nộp ${sub.length}/${items.length}; ${scoreText}`;
  });

  // Trích nhận xét theo từng bài (giới hạn độ dài tổng để vừa ngữ cảnh AI)
  let budget = MAX_FEEDBACK_TOTAL;
  let feedbackCount = 0;
  const feedbackBlocks = hwIds.map((hid, n) => {
    const lines: string[] = [];
    for (const i of itemsOf(hid)) {
      const fb = i.link ? itemFeedback(i) : '';
      if (!fb || budget <= 0) continue;
      const score = scoreOf(i);
      const who = kind === 'report' ? `${i.studentName}, ` : '';
      const line = `* (${who}${score != null ? `${score}/${ctx.scale}` : 'chưa chấm'}) ${fb}`;
      budget -= line.length;
      feedbackCount++;
      lines.push(line);
    }
    return lines.length ? `Bài ${n + 1}:\n${lines.join('\n')}` : '';
  }).filter(Boolean);

  const data = `BUỔI: ${ctx.sessionName} — môn "${ctx.courseName}" — lớp ${ctx.className}; thang điểm ${ctx.scale}

SỐ LIỆU
- Sĩ số ${total}; nộp đủ ${full} SV; nộp thiếu ${total - full - none} SV; chưa nộp bài nào ${none} SV
- Trạng thái buổi trên QLĐT: ${[...statusCounts].map(([k, v]) => `${k} ${v}`).join('; ')}
${hwLines.join('\n')}

NHẬN XÉT TỪNG BÀI (${feedbackCount} bài có nhận xét)
${feedbackBlocks.join('\n\n') || 'Chưa có nhận xét nào — chỉ nhận xét theo tình hình nộp bài và điểm.'}`;

  const rules = 'Chỉ dùng dữ liệu dưới đây, không bịa thêm lỗi hay số liệu. Văn bản thuần: không dùng tiêu đề markdown, không in đậm; được dùng gạch đầu dòng "•".';

  if (kind === 'class') {
    return `Bạn là giảng viên. Viết lời nhắn gửi cả lớp về bài tập về nhà của buổi này (tiếng Việt, tối đa 200 từ, thân thiện, gọi sinh viên là "các bạn", không tự xưng thầy / cô), để đăng nhóm lớp. Gồm: tình hình nộp bài chung; điểm cả lớp làm tốt; 3–5 lỗi phổ biến nhất rút ra từ nhận xét, mỗi lỗi kèm cách sửa ngắn gọn; nhắc các bạn chưa nộp / nộp thiếu hoàn thành bài. TUYỆT ĐỐI không nêu tên hay điểm của từng sinh viên. ${rules}

${data}`;
  }

  const behind = students.filter(s => submittedCount(s) < s.items.length || ((studentAverage(s) ?? scale) < low));
  const behindLines = behind.slice(0, MAX_LISTED_STUDENTS).map(s => {
    const avg = studentAverage(s);
    return `* ${s.name}: nộp ${submittedCount(s)}/${s.items.length}${avg != null ? `, điểm TB ${avg}` : ''}`;
  });
  const top = students.map(s => ({ s, avg: studentAverage(s) }))
    .filter((x): x is { s: BatchStudent; avg: number } => x.avg != null && submittedCount(x.s) === x.s.items.length)
    .sort((a, b) => b.avg - a.avg).slice(0, 5)
    .map(x => `* ${x.s.name}: điểm TB ${x.avg}`);

  return `Bạn là giảng viên báo cáo tình hình bài tập về nhà của buổi này cho giáo vụ (tiếng Việt, tối đa 200 từ). Gồm: tỉ lệ nộp bài; điểm từng bài (bài nào khó / dễ); lỗi phổ biến rút ra từ nhận xét (nêu rõ bài); sinh viên cần chú ý — chưa nộp, nộp thiếu, điểm thấp (nêu tên tối đa 8); sinh viên làm tốt nổi bật (tối đa 3). Chỉ nhận xét, KHÔNG đưa danh sách việc cần làm. ${rules}

${data}

SINH VIÊN NỘP THIẾU HOẶC ĐIỂM TB DƯỚI ${low} (${behind.length})
${behindLines.join('\n') || 'Không có.'}${behind.length > MAX_LISTED_STUDENTS ? `\n(và ${behind.length - MAX_LISTED_STUDENTS} SV khác)` : ''}

SINH VIÊN ĐIỂM TB CAO NHẤT (nộp đủ)
${top.join('\n') || 'Chưa có.'}`;
}
