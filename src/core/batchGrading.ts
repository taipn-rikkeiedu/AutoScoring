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
  sysAi: string;          // điểm AI của hệ thống QLĐT dạng chữ ("85/100", "Lỗi AI", "")
  sysAiRatio: number | null; // điểm AI QLĐT / điểm tối đa (0–1); null = chưa có
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

/** Lần chấm AI mới nhất của hệ thống QLĐT (đã xong): dạng chữ để hiển thị + tỉ lệ để tính điểm. */
function systemAiReview(ex: any): { text: string; ratio: number | null } {
  const done = (ex.aiReviews || []).filter((r: any) => r && r.status === 'COMPLETED' && r.score != null)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const r = done[done.length - 1];
  if (r) {
    const score = Number(r.score);
    const max = Number(r.maxScore) || 100;
    return {
      text: `${r.score}/${r.maxScore || 100}`,
      ratio: Number.isFinite(score) ? Math.min(Math.max(score / max, 0), 1) : null
    };
  }
  return { text: (ex.aiReviews || []).length ? 'Lỗi AI' : '', ratio: null };
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
    const review = ex ? systemAiReview(ex) : { text: '', ratio: null };
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
      sysAi: review.text,
      sysAiRatio: review.ratio,
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

/* ---------- Số liệu bài tập của cả lớp trong 1 buổi (tính sẵn) + AI liệt kê lỗi phổ biến ---------- */

const MAX_FEEDBACK_CHARS = 350;
const MAX_FEEDBACK_TOTAL = 12000;

/** Nhận xét của 1 bài: kết quả AI chấm của extension, không có thì lấy nhận xét đang có trên QLĐT. */
export function itemFeedback(i: BatchItem): string {
  const ai = i.status === 'success'
    ? (extractComment(i.report || '') || i.report || '').replace(/<score>[\s\S]*?<\/score>/gi, '')
    : '';
  const text = (ai.trim() || i.comment).replace(/\s+/g, ' ').trim();
  return text.length > MAX_FEEDBACK_CHARS ? `${text.slice(0, MAX_FEEDBACK_CHARS)}…` : text;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const cleanTitle = (t: string) => t.replace(/^\s*\[[^\]]*\]\s*/, '') || t;

export type ScoreSource = 'ai' | 'qldt';

/**
 * Điểm của 1 bài theo thang `scale`: ưu tiên điểm giảng viên chấm bằng AI của extension;
 * chưa chấm thì dùng điểm AI tự chấm của QLĐT (quy đổi về thang). Chưa nộp / chưa có điểm → null.
 */
export function effectiveScore(i: BatchItem, scale: number): { value: number; source: ScoreSource } | null {
  if (!i.link) return null;
  const own = i.status === 'success' && i.score != null ? parseFloat(i.score) : NaN;
  if (!isNaN(own)) return { value: own, source: 'ai' };
  if (i.sysAiRatio != null) return { value: round1(i.sysAiRatio * scale), source: 'qldt' };
  return null;
}

/** Điểm TB của 1 SV theo điểm hiệu lực (gồm điểm AI QLĐT). */
function effectiveAverage(s: BatchStudent, scale: number): number | null {
  const v = s.items.map(i => effectiveScore(i, scale)?.value).filter((x): x is number => x != null);
  return v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** Số bài có điểm theo nguồn. */
export function scoreSourceCounts(items: BatchItem[], scale: number): { scored: number; ai: number; qldt: number } {
  const sources = items.map(i => effectiveScore(i, scale)?.source).filter(Boolean);
  return { scored: sources.length, ai: sources.filter(x => x === 'ai').length, qldt: sources.filter(x => x === 'qldt').length };
}

export interface SessionContext { className: string; courseName: string; sessionName: string; scale: string }

export interface HomeworkStats {
  title: string;
  submitted: number;
  total: number;
  scored: number;
  fromAi: number;
  fromQldt: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  belowHalf: number;
}

export interface StudentScore { name: string; code: string; submitted: number; total: number; avg: number | null }

export interface SessionStats {
  ctx: SessionContext;
  scale: number;
  /** Ngưỡng "điểm thấp" = nửa thang. */
  low: number;
  total: number;
  full: number;
  partial: number;
  none: number;
  /** Trạng thái buổi trên QLĐT → số SV. */
  statuses: { label: string; count: number }[];
  homework: HomeworkStats[];
  /** TB các SV có điểm (mỗi SV = TB các bài của SV đó). */
  classAvg: number | null;
  scoredStudents: number;
  notSubmitted: StudentScore[];
  missing: StudentScore[];
  lowScores: StudentScore[];
  top: StudentScore[];
  /** Số bài có nhận xét (đầu vào cho AI liệt kê lỗi). */
  withFeedback: number;
}

const TOP_COUNT = 5;

/** Số liệu bài tập của buổi — tính sẵn, không dùng AI. */
export function buildSessionStats(students: BatchStudent[], ctx: SessionContext): SessionStats {
  const scale = parseFloat(ctx.scale) || 10;
  const low = scale / 2;
  const hwIds = [...new Set(students.flatMap(s => s.items.map(i => i.homeworkId)))];
  const titleOf = new Map(students.flatMap(s => s.items.map(i => [i.homeworkId, cleanTitle(i.title)] as const)));
  const itemsOf = (hid: string) => students.flatMap(s => s.items.filter(i => i.homeworkId === hid));

  const homework: HomeworkStats[] = hwIds.map(hid => {
    const items = itemsOf(hid);
    const eff = items.map(i => effectiveScore(i, scale)).filter((x): x is { value: number; source: ScoreSource } => x != null);
    const v = eff.map(x => x.value);
    return {
      title: titleOf.get(hid) || hid,
      submitted: items.filter(i => i.link).length,
      total: items.length,
      scored: v.length,
      fromAi: eff.filter(x => x.source === 'ai').length,
      fromQldt: eff.filter(x => x.source === 'qldt').length,
      avg: v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null,
      min: v.length ? Math.min(...v) : null,
      max: v.length ? Math.max(...v) : null,
      belowHalf: v.filter(x => x < low).length
    };
  });

  const rows: StudentScore[] = students.map(s => ({
    name: s.name, code: s.code, submitted: submittedCount(s), total: s.items.length, avg: effectiveAverage(s, scale)
  }));
  const byName = (a: StudentScore, b: StudentScore) => a.name.localeCompare(b.name, 'vi');
  const scored = rows.filter(r => r.avg != null);
  const statuses = new Map<string, number>();
  students.forEach(s => statuses.set(s.status || 'Chưa có', (statuses.get(s.status || 'Chưa có') || 0) + 1));

  return {
    ctx, scale, low,
    total: rows.length,
    full: rows.filter(r => r.total && r.submitted === r.total).length,
    partial: rows.filter(r => r.submitted > 0 && r.submitted < r.total).length,
    none: rows.filter(r => r.submitted === 0).length,
    statuses: [...statuses].map(([label, count]) => ({ label, count })),
    homework,
    classAvg: scored.length ? round1(scored.reduce((a, r) => a + (r.avg as number), 0) / scored.length) : null,
    scoredStudents: scored.length,
    notSubmitted: rows.filter(r => r.submitted === 0).sort(byName),
    missing: rows.filter(r => r.submitted > 0 && r.submitted < r.total).sort(byName),
    lowScores: scored.filter(r => (r.avg as number) < low).sort((a, b) => (a.avg as number) - (b.avg as number)),
    top: scored.filter(r => r.submitted === r.total).sort((a, b) => (b.avg as number) - (a.avg as number)).slice(0, TOP_COUNT),
    withFeedback: students.flatMap(s => s.items).filter(i => i.link && itemFeedback(i)).length
  };
}

/** Văn bản số liệu để xem / sao chép. */
export function formatSessionStats(st: SessionStats): string {
  const { ctx } = st;
  const hw = st.homework.map((h, n) => {
    const origin = h.fromQldt ? ` (${h.fromAi} AI chấm, ${h.fromQldt} AI QLĐT)` : '';
    const scores = h.scored
      ? ` · có điểm ${h.scored}${origin} · TB ${h.avg} · thấp ${h.min} · cao ${h.max} · dưới ${st.low}: ${h.belowHalf} bài`
      : ' · chưa có điểm';
    return `- Bài ${n + 1} ${h.title}: nộp ${h.submitted}/${h.total}${scores}`;
  });
  const list = (rows: StudentScore[], fmt: (r: StudentScore) => string) => (rows.length ? rows.map(fmt).join(', ') : 'không có');
  const anyQldt = st.homework.some(h => h.fromQldt);

  return [
    `SỐ LIỆU BÀI TẬP — ${ctx.sessionName} · ${ctx.className} · ${ctx.courseName} · thang ${ctx.scale}`,
    '',
    'NỘP BÀI',
    `- Sĩ số ${st.total}: nộp đủ ${st.full} · nộp thiếu ${st.partial} · chưa nộp ${st.none}`,
    `- Trạng thái buổi trên QLĐT: ${st.statuses.map(s => `${s.label} ${s.count}`).join(' · ')}`,
    '',
    'ĐIỂM TỪNG BÀI',
    ...hw,
    `- Điểm TB cả buổi: ${st.classAvg ?? '—'} (${st.scoredStudents} SV có điểm)`,
    ...(anyQldt ? [`- Nguồn điểm: bài đã chấm bằng AI của extension dùng điểm đó; bài chưa chấm dùng điểm AI QLĐT (quy về thang ${ctx.scale})`] : []),
    '',
    `CHƯA NỘP (${st.notSubmitted.length}): ${list(st.notSubmitted, r => r.name)}`,
    `NỘP THIẾU (${st.missing.length}): ${list(st.missing, r => `${r.name} (${r.submitted}/${r.total})`)}`,
    `ĐIỂM TB DƯỚI ${st.low} (${st.lowScores.length}): ${list(st.lowScores, r => `${r.name} ${r.avg}`)}`,
    `ĐIỂM TB CAO NHẤT (nộp đủ): ${list(st.top, r => `${r.name} ${r.avg}`)}`
  ].join('\n');
}

/** Prompt AI chỉ liệt kê lỗi phổ biến, rút từ nhận xét từng bài (không nêu tên sinh viên). */
export function buildCommonErrorsPrompt(students: BatchStudent[], ctx: SessionContext): string {
  const hwIds = [...new Set(students.flatMap(s => s.items.map(i => i.homeworkId)))];
  const titleOf = new Map(students.flatMap(s => s.items.map(i => [i.homeworkId, cleanTitle(i.title)] as const)));
  let budget = MAX_FEEDBACK_TOTAL;
  const blocks = hwIds.map((hid, n) => {
    const lines: string[] = [];
    for (const i of students.flatMap(s => s.items.filter(x => x.homeworkId === hid))) {
      const fb = i.link ? itemFeedback(i) : '';
      if (!fb || budget <= 0) continue;
      const line = `* ${fb}`;
      budget -= line.length;
      lines.push(line);
    }
    return lines.length ? `Bài ${n + 1} — ${titleOf.get(hid)} (${lines.length} nhận xét):\n${lines.join('\n')}` : '';
  }).filter(Boolean);

  return `Dưới đây là nhận xét chấm bài tập về nhà của từng sinh viên, buổi "${ctx.sessionName}", môn "${ctx.courseName}".
Hãy LIỆT KÊ các lỗi phổ biến theo từng bài, đúng định dạng:
Bài <số> — <tên bài>:
• <lỗi, ngắn gọn> — khoảng <số> bài
Sắp lỗi gặp nhiều trước, tối đa 6 lỗi mỗi bài; bài không có lỗi lặp lại thì ghi "• Không có lỗi lặp lại đáng kể".
Chỉ liệt kê, không viết đoạn văn hay lời khuyên; không nêu tên sinh viên; chỉ dùng lỗi có trong nhận xét, không bịa. Văn bản thuần, không markdown tiêu đề, không in đậm.

${blocks.join('\n\n')}`;
}
