/**
 * Giám sát học tập: gộp chỉ số học tập (nghỉ học, thiếu bài tập, chậm e-learning, điểm thi) với phân tích
 * nghi vấn BTVN ↔ điểm thi. Dữ liệu từ API `/classes/dashboard/{classId}/{courseId}` của QLĐT.
 *
 * - Mức (vd Cấm thi / Báo động / Cảnh báo / Sắp vượt ngưỡng) tự cấu hình trong mẫu giám sát: bảng ngưỡng theo chỉ số
 *   (xem monitorLevels.ts); SV vào mức nặng nhất mà một chỉ số chạm ngưỡng.
 * - Nghi vấn (BTVN cao nhưng thi thấp, trùng link) là nhãn riêng, không tính vào mức rủi ro.
 */
import {
  AnalysisRow, AnalysisRules, FlaggedRow, TestColumn, TestPhase, TestKind, ExamType,
  parseClassDashboard, flagRows, avg, fmtScore, PHASE_LABELS
} from './examAnalysis';
import {
  MetricKey, MonitorLevel, MonitorConfig, METRICS, NORMAL_LEVEL, metricDef, formatThreshold
} from './monitorLevels';
import type { AbsenceSummary } from './attendance';

/** Điểm 1 phần thi: số điểm, 'absent' khi SV vắng thi, null khi chưa có bài thi này. */
export type ExamCell = number | 'absent' | null;
export type ExamCellKey = 'hkTNCell' | 'hkTLCell' | 'ckTNCell' | 'ckTLCell';

/** Nhãn ô điểm: môn thi project thì cuối môn là Kiến thức (trắc nghiệm) + Sản phẩm (project). */
export function examCellLabel(r: { examType: ExamType }, key: ExamCellKey): string {
  if (r.examType === 'PROJECT' && key === 'ckTNCell') return 'Kiến thức';
  if (r.examType === 'PROJECT' && key === 'ckTLCell') return 'Sản phẩm';
  return EXAM_CELLS.find(c => c.key === key)!.label;
}

export const EXAM_CELLS: { key: ExamCellKey; phase: TestPhase; kind: TestKind; label: string }[] = [
  { key: 'hkTNCell', phase: 'hk', kind: 'TN', label: 'HK TN' },
  { key: 'hkTLCell', phase: 'hk', kind: 'TL', label: 'HK TL' },
  { key: 'ckTNCell', phase: 'ck', kind: 'TN', label: 'CK TN' },
  { key: 'ckTLCell', phase: 'ck', kind: 'TL', label: 'CK TL' }
];

/** Mức của 1 SV: id 1 trong các mức đã cấu hình, hoặc 'normal'. */
export type RiskLevel = string;

export type IssueKind = MetricKey;

/** 1 chỉ số chạm ngưỡng của 1 mức. */
export interface Issue {
  kind: IssueKind;
  levelId: string;
  levelName: string;
  levelIndex: number;  // vị trí mức (0 = nặng nhất)
  color: string;
  label: string;     // nhãn ngắn hiện trên dòng, vd "Nghỉ 12.50%"
  title: string;     // tên chỉ số, vd "Nghỉ học"
  value: string;     // giá trị hiện tại, vd "30.95%"
  threshold: string; // ngưỡng đã chạm, vd "≥ 20%"
  action: string;    // gợi ý hành động
}

export interface MonitorBase extends AnalysisRow {
  email: string;
  phone: string;
  dateOfBirth: string;            // yyyy-mm-dd

  missingHomework: number | null; // tỉ lệ thiếu bài tập (%) — 100 − submissionRate
  unprepared: number | null;      // số bài e-learning chậm — elearningProgress
  rpoints: number | null;
  absence: AbsenceSummary | null; // điểm danh theo buổi (null = chưa tải được)
  hkTNCell: ExamCell; hkTLCell: ExamCell; ckTNCell: ExamCell; ckTLCell: ExamCell;
}

export interface MonitorRow extends FlaggedRow<MonitorBase> {
  risk: RiskLevel;          // id mức, 'normal' = Bình thường
  riskLevel: MonitorLevel;  // thông tin mức (tên, màu)
  riskIndex: number;        // vị trí mức để sắp xếp (Bình thường = cuối)
  issues: Issue[];          // chỉ số chạm mức vi phạm
  early: Issue[];           // chỉ số chạm mức nhắc sớm (không tính vi phạm)
  suspect: boolean;  // nghi vấn cao / cần rà soát
  actions: string[]; // gợi ý hành động (không trùng lặp)
}

/** Lọc theo mức: `level:<id>`; theo chỉ số: MetricKey; nghi vấn: suspect / dup / watch. */
export type MonitorFilter = string;
export const levelFilterKey = (id: string) => `level:${id}`;

export const MONITOR_FILTERS: { key: MonitorFilter; label: string; group: 'issue' | 'suspect' }[] = [
  { key: 'absent', label: 'Nghỉ học', group: 'issue' },
  { key: 'absentStreak', label: 'Nghỉ liên tiếp', group: 'issue' },
  { key: 'homework', label: 'Thiếu bài tập', group: 'issue' },
  { key: 'elearning', label: 'Chậm E-learning', group: 'issue' },
  { key: 'rpoints', label: 'R-Point thấp', group: 'issue' },
  { key: 'examScore', label: 'Điểm thi thấp', group: 'issue' },
  { key: 'examAbsent', label: 'Vắng thi', group: 'issue' },
  { key: 'suspect', label: 'Nghi vấn BTVN', group: 'suspect' },
  { key: 'dup', label: 'Trùng link', group: 'suspect' },
  { key: 'watch', label: '⭐ DS rà soát', group: 'suspect' }
];

export function matchesFilter(r: MonitorRow, f: MonitorFilter): boolean {
  if (f.startsWith('level:')) return r.risk === f.slice(6);
  switch (f) {
    case 'suspect': return r.suspect;
    case 'dup': return r.dups.length > 0;
    case 'watch': return r.watch;
    default: return r.issues.some(i => i.kind === f);
  }
}

export const fmtPercent = (v: number | null) => (v == null ? '—' : `${v.toFixed(2)}%`);
export const fmtDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
};
export const fmtExamCell = (v: ExamCell) => (v === 'absent' ? 'Vắng' : fmtScore(v));

/* ---------- Đọc dữ liệu 1 lớp ---------- */
export function parseMonitorClass(d: any, classLabel: string, testCols: Map<string, TestColumn>): MonitorBase[] {
  const list: any[] = d?.studentsInClass || [];
  const rows = parseClassDashboard(d, classLabel, testCols);
  return rows.map((a, i) => {
    const it = list[i] || {};
    // Điểm chính thức của QLĐT; đợt SV không làm bài nào thì ghi Vắng
    const cell = (phase: TestPhase, value: number | null): ExamCell => (a.absentPhases.includes(phase) ? 'absent' : value);
    const submission = it.submissionRate != null ? Number(it.submissionRate) : null;
    return {
      ...a,
      email: it.student?.email || '',
      phone: it.student?.phone || '',
      dateOfBirth: it.student?.dateOfBirth || '',
      missingHomework: submission != null ? Math.max(0, 100 - submission) : null,
      unprepared: it.elearningProgress != null ? Number(it.elearningProgress) : null,
      rpoints: it.rpoints != null ? Number(it.rpoints) : null,
      absence: null,
      hkTNCell: cell('hk', a.hkTN), hkTLCell: cell('hk', a.hkTL),
      ckTNCell: cell('ck', a.ckTN), ckTLCell: cell('ck', a.ckTL)
    };
  });
}

/* ---------- Đánh giá theo bảng mức ---------- */
/** Phần thi có điểm dưới ngưỡng (bỏ đợt có thi bổ sung QLĐT chưa tính — đã có ghi chú riêng). */
const lowExamCells = (r: MonitorBase, below: number) =>
  EXAM_CELLS.filter(c => typeof r[c.key] === 'number' && (r[c.key] as number) < below && !r.makeupPending.includes(c.phase));

/** Chỉ số có chạm ngưỡng t không; trả về giá trị hiển thị nếu chạm. */
function metricValue(r: MonitorBase, metric: MetricKey, t: number): { label: string; value: string } | null {
  switch (metric) {
    case 'absent':
      return r.absentRate != null && r.absentRate >= t ? { label: `Nghỉ ${fmtPercent(r.absentRate)}`, value: fmtPercent(r.absentRate) } : null;
    case 'absentStreak':
      return r.absence && r.absence.maxStreak >= t
        ? { label: `Nghỉ ${r.absence.maxStreak} buổi liên tiếp`, value: `${r.absence.maxStreak} buổi` } : null;
    case 'homework':
      return r.missingHomework != null && r.missingHomework >= t ? { label: `Thiếu BT ${fmtPercent(r.missingHomework)}`, value: fmtPercent(r.missingHomework) } : null;
    case 'elearning':
      return r.unprepared != null && r.unprepared >= t ? { label: `Chậm EL ${r.unprepared}`, value: `${r.unprepared} bài` } : null;
    case 'rpoints':
      return r.rpoints != null && r.rpoints < t ? { label: `R-Point ${r.rpoints}`, value: String(r.rpoints) } : null;
    case 'examScore': {
      const low = lowExamCells(r, t);
      if (!low.length) return null;
      const label = low.map(c => `${examCellLabel(r, c.key)} ${fmtScore(r[c.key] as number)}`).join(', ');
      return { label, value: label };
    }
    case 'examAbsent': {
      if (!t || !r.absentPhases.length) return null;
      const phases = r.absentPhases.map(ph => PHASE_LABELS[ph]).join(', ');
      return { label: `Vắng thi ${phases}`, value: phases };
    }
    default:
      return null;
  }
}

function levelIssue(levels: MonitorLevel[], i: number, metric: MetricKey, t: number, hit: { label: string; value: string }): Issue {
  const level = levels[i];
  const d = metricDef(metric);
  return {
    kind: metric, levelId: level.id, levelName: level.name, levelIndex: i, color: level.color,
    label: hit.label, title: d.label, value: hit.value, threshold: formatThreshold(metric, t), action: d.action
  };
}

/** Mỗi chỉ số → mức nặng nhất mà nó chạm; mức của SV = mức nặng nhất trong các chỉ số (kể cả theo số chỉ số vi phạm). */
function evaluateLevels(r: MonitorBase, levels: MonitorLevel[]): { hits: Issue[]; index: number } {
  const hits: Issue[] = [];
  for (const d of METRICS) {
    if (d.key === 'violations') continue;
    for (let i = 0; i < levels.length; i++) {
      const t = levels[i].thresholds[d.key];
      if (t == null) continue;
      const hit = metricValue(r, d.key, t);
      if (hit) { hits.push(levelIssue(levels, i, d.key, t, hit)); break; }
    }
  }
  const violations = hits.filter(h => levels[h.levelIndex].violation).length;
  let index = Math.min(levels.length, ...hits.map(h => h.levelIndex));
  const byCount = levels.findIndex(l => l.thresholds.violations != null && violations >= (l.thresholds.violations as number));
  if (byCount >= 0 && byCount < index) {
    index = byCount;
    hits.push(levelIssue(levels, byCount, 'violations', levels[byCount].thresholds.violations as number,
      { label: `${violations} chỉ số vi phạm`, value: `${violations} chỉ số` }));
  }
  return { hits, index };
}

export function evaluateMonitor(
  base: MonitorBase[], config: MonitorConfig, analysisRules: AnalysisRules, watchList: string[]
): { rows: MonitorRow[]; watchMissing: string[] } {
  const levels = config.levels;
  const { rows: flagged, watchMissing } = flagRows(base, analysisRules, watchList);
  const rows = flagged.map((r): MonitorRow => {
    const { hits, index } = evaluateLevels(r, levels);
    const byLevel = (a: Issue, b: Issue) => a.levelIndex - b.levelIndex;
    const issues = hits.filter(h => levels[h.levelIndex].violation).sort(byLevel);
    const early = hits.filter(h => !levels[h.levelIndex].violation).sort(byLevel);
    const riskLevel = index < levels.length ? levels[index] : NORMAL_LEVEL;
    const suspect = r.level === 'high' || r.level === 'medium';
    const actions = [...new Set([
      ...issues.map(i => i.action),
      ...early.map(e => `Nhắc sớm: ${e.title.toLowerCase()} sắp chạm ngưỡng`),
      ...(suspect || r.dups.length ? ['Vấn đáp lại 1–2 bài tập đã nộp để xác minh'] : [])
    ].filter(Boolean))];
    // Vắng thi đã là chỉ số riêng → bỏ khỏi danh sách dấu hiệu nghi vấn
    const reasons = r.reasons.filter(x => !x.startsWith('Vắng thi'));
    return { ...r, reasons, risk: riskLevel.id, riskLevel, riskIndex: index, issues, early, suspect, actions };
  });
  rows.sort((a, b) =>
    a.riskIndex - b.riskIndex
    || (b.issues.length - a.issues.length)
    || (Number(b.suspect) - Number(a.suspect))
    || a.name.localeCompare(b.name, 'vi'));
  return { rows, watchMissing };
}

/* ---------- Tổng quan lớp (theo mức) ---------- */
export interface ClassOverview {
  total: number;
  byRisk: Record<string, number>; // id mức → số SV (gồm 'normal')
  suspect: number;
  topIssues: { kind: IssueKind; label: string; count: number }[];
  avgAbsent: number | null;
  avgMissingHomework: number | null;
  examFailRate: number | null; // % SV có bài thi chạm mức vi phạm (trong số SV có điểm)
}

export function summarizeClass(rows: MonitorRow[], levels: MonitorLevel[]): ClassOverview {
  const byRisk: Record<string, number> = { normal: 0 };
  levels.forEach(l => { byRisk[l.id] = 0; });
  rows.forEach(r => { byRisk[r.risk] = (byRisk[r.risk] || 0) + 1; });
  const topIssues = METRICS.filter(d => d.key !== 'violations')
    .map(d => ({ kind: d.key, label: d.label, count: rows.filter(r => r.issues.some(i => i.kind === d.key)).length }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count);
  const withExam = rows.filter(r => EXAM_CELLS.some(c => typeof r[c.key] === 'number'));
  return {
    total: rows.length,
    byRisk,
    suspect: rows.filter(r => r.suspect).length,
    topIssues,
    avgAbsent: avg(rows.map(r => r.absentRate)),
    avgMissingHomework: avg(rows.map(r => r.missingHomework)),
    examFailRate: withExam.length ? (withExam.filter(r => r.issues.some(i => i.kind === 'examScore')).length / withExam.length) * 100 : null
  };
}

/** Các mức kèm Bình thường, theo thứ tự nặng → nhẹ. */
export const levelsWithNormal = (levels: MonitorLevel[]) => [...levels, NORMAL_LEVEL];

/** Tóm tắt số SV theo mức, vd "2 cấm thi, 5 báo động". */
export const describeByRisk = (o: ClassOverview, levels: MonitorLevel[]) =>
  levels.map(l => `${o.byRisk[l.id] || 0} ${l.name.toLowerCase()}`).join(', ');

/* ---------- Phân bố cho biểu đồ ---------- */
/** Màu cho khoảng không chạm mức nào. */
export const NORMAL_COLOR = '#bfbfbf';

export interface DistributionBin {
  label: string;
  color: string;
  count: number;
  keys: string[]; // SV thuộc khoảng này — bấm cột để mở danh sách
}

export interface Distribution {
  key: 'absent' | 'homework' | 'elearning' | 'rpoints' | 'hk' | 'ck';
  title: string;
  subtitle: string;
  bins: DistributionBin[];
}

const n1 = (v: number) => String(Math.round(v * 10) / 10);

type BinDef = { label: string; color: string; test: (r: MonitorRow) => boolean };

function binRows(rows: MonitorRow[], defs: BinDef[]): DistributionBin[] {
  return defs.filter(d => d.label).map(d => {
    const keys = rows.filter(d.test).map(r => r.key);
    return { label: d.label, color: d.color, count: keys.length, keys };
  });
}

/** Mốc ngưỡng của 1 chỉ số theo các mức (mỗi giá trị lấy mức nặng nhất), sắp tăng dần. */
function thresholdsOf(levels: MonitorLevel[], metric: MetricKey): { t: number; color: string }[] {
  const out = new Map<number, string>();
  levels.forEach(l => {
    const t = l.thresholds[metric];
    if (t != null && !out.has(t)) out.set(t, l.color);
  });
  return [...out.entries()].map(([t, color]) => ({ t, color })).sort((a, b) => a.t - b.t);
}

/** Chỉ số "càng cao càng xấu" (nghỉ học, thiếu BT, chậm E-learning): khoảng theo mốc ngưỡng. */
function ascendingBins(
  rows: MonitorRow[], get: (r: MonitorRow) => number | null, marks: { t: number; color: string }[], unit: string, zeroLabel: string, integer = false
) {
  const has = (r: MonitorRow) => get(r) != null;
  const v = (r: MonitorRow) => get(r) as number;
  const first = marks.length ? marks[0].t : Infinity;
  // Số đếm (bài): khoảng [t, next) ghi "t bài" hoặc "t–(next−1) bài"; không có khoảng "<1"
  const range = (t: number, next: number) => (integer ? (next - t <= 1 ? `${t}` : `${t}–${next - 1}`) : `${n1(t)}–${n1(next)}`);
  const below = first === Infinity ? `>0${unit}` : integer && first <= 1 ? '' : integer ? `1–${first - 1}${unit}` : `<${n1(first)}${unit}`;
  const defs: BinDef[] = [
    { label: zeroLabel, color: NORMAL_COLOR, test: r => has(r) && v(r) === 0 },
    { label: first > 0 ? below : '', color: NORMAL_COLOR, test: r => has(r) && v(r) > 0 && v(r) < first },
    ...marks.map((m, i): BinDef => {
      const next = i + 1 < marks.length ? marks[i + 1].t : null;
      return {
        label: next != null ? `${range(m.t, next)}${unit}` : `≥${n1(m.t)}${unit}`,
        color: m.color,
        test: r => has(r) && v(r) > 0 && v(r) >= m.t && (next == null || v(r) < next)
      };
    })
  ];
  return binRows(rows, defs);
}

/** Chỉ số "càng thấp càng xấu" (điểm thi, R-Point): khoảng theo mốc ngưỡng, thấp nhất trước. */
function descendingBins(rows: MonitorRow[], get: (r: MonitorRow) => number | null, marks: { t: number; color: string }[], top?: number) {
  const has = (r: MonitorRow) => get(r) != null;
  const v = (r: MonitorRow) => get(r) as number;
  const defs: BinDef[] = marks.map((m, i): BinDef => {
    const prev = i > 0 ? marks[i - 1].t : null;
    return {
      label: prev != null ? `${n1(prev)}–${n1(m.t)}` : `<${n1(m.t)}`,
      color: m.color,
      test: r => has(r) && v(r) < m.t && (prev == null || v(r) >= prev)
    };
  });
  const last = marks.length ? marks[marks.length - 1].t : -Infinity;
  if (top != null && top > last) {
    defs.push({ label: last === -Infinity ? `<${top}` : `${n1(last)}–${top}`, color: NORMAL_COLOR, test: r => has(r) && v(r) >= last && v(r) < top });
    defs.push({ label: `≥${top}`, color: NORMAL_COLOR, test: r => has(r) && v(r) >= top });
  } else {
    defs.push({ label: last === -Infinity ? 'Có điểm' : `≥${n1(last)}`, color: NORMAL_COLOR, test: r => has(r) && v(r) >= last });
  }
  return binRows(rows, defs);
}

export function buildDistributions(rows: MonitorRow[], levels: MonitorLevel[]): Distribution[] {
  const dists: Distribution[] = [
    {
      key: 'absent', title: 'Nghỉ học', subtitle: `TB ${fmtPercent(avg(rows.map(r => r.absentRate)))}`,
      bins: ascendingBins(rows, r => r.absentRate, thresholdsOf(levels, 'absent'), '%', '0%')
    },
    {
      key: 'homework', title: 'Thiếu bài tập', subtitle: `TB ${fmtPercent(avg(rows.map(r => r.missingHomework)))}`,
      bins: ascendingBins(rows, r => r.missingHomework, thresholdsOf(levels, 'homework'), '%', '0%')
    },
    {
      key: 'elearning', title: 'Chậm E-learning', subtitle: `${rows.filter(r => (r.unprepared ?? 0) > 0).length} SV chậm`,
      bins: ascendingBins(rows, r => r.unprepared, thresholdsOf(levels, 'elearning'), ' bài', 'Đúng hạn', true)
    }
  ];
  const rpMarks = thresholdsOf(levels, 'rpoints');
  if (rpMarks.length && rows.some(r => r.rpoints != null)) {
    dists.push({ key: 'rpoints', title: 'R-Point', subtitle: `TB ${fmtScore(avg(rows.map(r => r.rpoints)))}`, bins: descendingBins(rows, r => r.rpoints, rpMarks) });
  }
  const examMarks = thresholdsOf(levels, 'examScore');
  const absentColor = levels.find(l => l.thresholds.examAbsent)?.color || NORMAL_COLOR;
  const examDist = (phase: 'hk' | 'ck', title: string): Distribution => {
    const absent = (r: MonitorRow) => r.absentPhases.includes(phase);
    const score = (r: MonitorRow) => (absent(r) ? null : phase === 'hk' ? r.hk : r.ck);
    return {
      key: phase, title, subtitle: `TB ${fmtScore(avg(rows.map(score)))}`,
      bins: [
        ...binRows(rows, [{ label: 'Vắng', color: absentColor, test: absent }]),
        ...descendingBins(rows, score, examMarks, 80)
      ]
    };
  };
  if (rows.some(r => r.hk != null || r.absentPhases.includes('hk'))) dists.push(examDist('hk', 'Điểm Hackathon'));
  if (rows.some(r => r.ck != null || r.absentPhases.includes('ck'))) dists.push(examDist('ck', 'Điểm thi cuối môn'));
  return dists;
}

/** Màu của 1 giá trị theo bảng mức (mức nặng nhất mà giá trị chạm); không chạm → undefined. */
export function colorFor(levels: MonitorLevel[], metric: MetricKey, value: number | null): string | undefined {
  if (value == null) return undefined;
  const op = metricDef(metric).op;
  const hit = levels.find(l => {
    const t = l.thresholds[metric];
    return t != null && (op === 'lt' ? value < t : value >= t);
  });
  return hit?.color;
}

/* ---------- Prompt cho AI ---------- */
const describeStudent = (r: MonitorRow) => [
  `Nghỉ học ${fmtPercent(r.absentRate)}, thiếu bài tập ${fmtPercent(r.missingHomework)}, chậm e-learning ${r.unprepared ?? '—'} bài`,
  `Hackathon TN ${fmtExamCell(r.hkTNCell)} / TL ${fmtExamCell(r.hkTLCell)}; cuối môn ${examCellLabel(r, 'ckTNCell')} ${fmtExamCell(r.ckTNCell)} / ${examCellLabel(r, 'ckTLCell')} ${fmtExamCell(r.ckTLCell)}`,
  ...r.makeupNotes,
  `Mức: ${r.riskLevel.name}`,
  r.issues.length ? `Vi phạm: ${r.issues.map(i => `${i.label} (${i.levelName.toLowerCase()})`).join('; ')}` : 'Không vi phạm',
  r.early.length ? `Sắp vượt ngưỡng: ${r.early.map(e => e.label).join('; ')}` : '',
  r.reasons.length ? `Dấu hiệu nghi vấn: ${r.reasons.join('; ')}` : ''
].filter(Boolean).join('\n');

export function buildClassOverviewPrompt(rows: MonitorRow[], courseName: string, levels: MonitorLevel[]): string {
  const o = summarizeClass(rows, levels);
  const flagged = rows.filter(r => r.riskLevel.violation || r.suspect).slice(0, 40);
  return `Bạn là giáo vụ theo dõi tình hình học tập. Viết tổng quan ngắn gọn (tối đa 150 từ, tiếng Việt) về lớp học môn "${courseName}" dựa trên số liệu dưới đây, gồm: tình hình chung, 2–3 vấn đề nổi bật nhất, và 3 việc giảng viên nên làm tuần này (gạch đầu dòng). Không bịa số liệu, chỉ dùng số liệu được cung cấp. Không dùng markdown tiêu đề.

SỐ LIỆU LỚP
- Sĩ số: ${o.total}; ${describeByRisk(o, levels)}; nghi vấn BTVN ${o.suspect}
- Nghỉ học TB ${fmtPercent(o.avgAbsent)}; thiếu bài tập TB ${fmtPercent(o.avgMissingHomework)}; tỉ lệ SV có bài thi dưới ngưỡng ${o.examFailRate == null ? '—' : `${o.examFailRate.toFixed(0)}%`}
- Vấn đề theo số SV: ${o.topIssues.map(t => `${t.label} ${t.count}`).join(', ') || 'không có'}

SINH VIÊN CẦN CHÚ Ý (${flagged.length})
${flagged.map(r => `* ${r.name} [${r.riskLevel.name}]: ${r.issues.map(i => i.label).join(', ') || 'không vi phạm'}${r.suspect ? ' | nghi vấn BTVN' : ''}`).join('\n')}`;
}

export function buildStudentPrompt(r: MonitorRow, courseName: string): string {
  const comments = Object.values(r.tests)
    .filter(t => t.comment)
    .map(t => `- ${t.name}: ${String(t.comment).replace(/\s+/g, ' ').slice(0, 300)}`)
    .join('\n');
  return `Bạn là giảng viên chủ nhiệm. Viết nhận xét ngắn (3–4 câu, tiếng Việt, giọng khách quan) về tình hình học tập của sinh viên ở môn "${courseName}", sau đó đưa 2–3 gợi ý hành động cụ thể cho giảng viên (gạch đầu dòng). Chỉ dùng thông tin dưới đây, không bịa thêm. Không kết luận gian lận; dấu hiệu nghi vấn chỉ là gợi ý cần xác minh.

${describeStudent(r)}
${comments ? `Nhận xét của giảng viên chấm thi:\n${comments}` : ''}`;
}

/* ---------- AI tổng quan theo từng loại (toàn lớp / từng chỉ số) ---------- */
export type ClassAiKind = 'overall' | 'homework' | 'absent' | 'rpoints' | 'elearning' | 'exam';

export const CLASS_AI_KINDS: { key: ClassAiKind; label: string; hint: string }[] = [
  { key: 'overall', label: 'Toàn lớp', hint: 'Tình hình chung, số sinh viên theo mức, vấn đề nổi bật và việc cần làm tuần này.' },
  { key: 'homework', label: 'Bài tập', hint: 'Tỉ lệ thiếu bài tập, sinh viên vượt ngưỡng theo mức, nghi vấn BTVN và cách xử lý.' },
  { key: 'absent', label: 'Vắng nghỉ', hint: 'Tỉ lệ nghỉ học, sinh viên vượt ngưỡng theo mức, liên hệ với các chỉ số khác và cách xử lý.' },
  { key: 'rpoints', label: 'R-Point', hint: 'Phân bố R-Point, sinh viên dưới ngưỡng theo mức và cách xử lý.' },
  { key: 'elearning', label: 'E-learning', hint: 'Số bài E-learning chậm, sinh viên vượt ngưỡng theo mức và cách nhắc nhở.' },
  { key: 'exam', label: 'Điểm thi', hint: 'Điểm Hackathon / cuối môn, sinh viên vắng thi, điểm thấp, đối chiếu với BTVN.' }
];

const PROMPT_RULES = 'Chỉ dùng số liệu dưới đây, không bịa thêm. Không dùng markdown tiêu đề. Không kết luận gian lận; nghi vấn chỉ là dấu hiệu cần xác minh.';
const MAX_LISTED = 30;

/** Số SV theo từng mức đối với 1 chỉ số, vd "Cấm thi (≥ 20%): 4 SV". */
function countByLevel(rows: MonitorRow[], levels: MonitorLevel[], metric: MetricKey): string {
  const lines = levels
    .filter(l => l.thresholds[metric] != null)
    .map(l => {
      const n = rows.filter(r => [...r.issues, ...r.early].some(i => i.kind === metric && i.levelId === l.id)).length;
      return `${l.name} (${formatThreshold(metric, l.thresholds[metric] as number)}): ${n} SV`;
    });
  return lines.join('; ') || 'mẫu giám sát không đặt ngưỡng cho chỉ số này';
}

/** SV chạm ngưỡng của 1 chỉ số (nặng nhất trước), kèm các vấn đề khác để AI thấy mối liên hệ. */
function listByMetric(rows: MonitorRow[], metric: MetricKey): string {
  const hits = rows
    .map(r => ({ r, hit: [...r.issues, ...r.early].find(i => i.kind === metric) }))
    .filter((x): x is { r: MonitorRow; hit: Issue } => !!x.hit)
    .sort((a, b) => a.hit.levelIndex - b.hit.levelIndex);
  if (!hits.length) return 'Không có sinh viên nào chạm ngưỡng.';
  const lines = hits.slice(0, MAX_LISTED).map(({ r, hit }) => {
    const others = r.issues.filter(i => i.kind !== metric && i.kind !== 'violations').map(i => i.label);
    return `* ${r.name} [${hit.levelName}]: ${hit.value}${others.length ? ` | vấn đề khác: ${others.join(', ')}` : ''}${r.suspect ? ' | nghi vấn BTVN' : ''}`;
  });
  return `${lines.join('\n')}${hits.length > MAX_LISTED ? `\n(và ${hits.length - MAX_LISTED} SV khác)` : ''}`;
}

const stats = (vals: (number | null)[]) => {
  const v = vals.filter((x): x is number => x != null);
  if (!v.length) return 'chưa có dữ liệu';
  return `TB ${fmtScore(avg(v))}, thấp nhất ${fmtScore(Math.min(...v))}, cao nhất ${fmtScore(Math.max(...v))} (${v.length} SV có dữ liệu)`;
};

function metricPrompt(courseName: string, focus: string, data: string): string {
  return `Bạn là giáo vụ theo dõi tình hình học tập. Viết tổng quan ngắn gọn (tối đa 150 từ, tiếng Việt) về ${focus} của lớp môn "${courseName}", gồm: tình hình chung của chỉ số này, nhóm sinh viên đáng lo nhất (nêu tên tối đa 5), mối liên hệ với chỉ số khác nếu thấy rõ, và 3 việc giảng viên nên làm (gạch đầu dòng). ${PROMPT_RULES}

${data}`;
}

/** Prompt AI tổng quan lớp theo loại. */
export function buildClassAiPrompt(kind: ClassAiKind, rows: MonitorRow[], courseName: string, levels: MonitorLevel[]): string {
  const total = `Sĩ số: ${rows.length}`;
  switch (kind) {
    case 'overall':
      return buildClassOverviewPrompt(rows, courseName, levels);
    case 'homework':
      return metricPrompt(courseName, 'tình hình THIẾU BÀI TẬP (BTVN)', `SỐ LIỆU
- ${total}; tỉ lệ thiếu bài tập: ${stats(rows.map(r => r.missingHomework))} (%)
- Theo mức: ${countByLevel(rows, levels, 'homework')}
- Nghi vấn BTVN (nộp BTVN tốt nhưng thi thấp / trùng link): ${rows.filter(r => r.suspect || r.dups.length).length} SV

SINH VIÊN CHẠM NGƯỠNG
${listByMetric(rows, 'homework')}`);
    case 'absent':
      return metricPrompt(courseName, 'tình hình VẮNG NGHỈ (chuyên cần)', `SỐ LIỆU
- ${total}; tỉ lệ nghỉ học: ${stats(rows.map(r => r.absentRate))} (%)
- Theo mức: ${countByLevel(rows, levels, 'absent')}

SINH VIÊN CHẠM NGƯỠNG
${listByMetric(rows, 'absent')}`);
    case 'rpoints':
      return metricPrompt(courseName, 'điểm R-POINT', `SỐ LIỆU
- ${total}; R-Point: ${stats(rows.map(r => r.rpoints))}
- Theo mức: ${countByLevel(rows, levels, 'rpoints')}

SINH VIÊN CHẠM NGƯỠNG
${listByMetric(rows, 'rpoints')}`);
    case 'elearning':
      return metricPrompt(courseName, 'tình hình CHẬM E-LEARNING', `SỐ LIỆU
- ${total}; số bài E-learning chậm: ${stats(rows.map(r => r.unprepared))}; ${rows.filter(r => (r.unprepared ?? 0) > 0).length} SV có chậm ít nhất 1 bài
- Theo mức: ${countByLevel(rows, levels, 'elearning')}

SINH VIÊN CHẠM NGƯỠNG
${listByMetric(rows, 'elearning')}`);
    case 'exam': {
      const absentHk = rows.filter(r => r.absentPhases.includes('hk')).length;
      const absentCk = rows.filter(r => r.absentPhases.includes('ck')).length;
      const examRows = rows.filter(r => r.issues.some(i => i.kind === 'examScore' || i.kind === 'examAbsent') || r.early.some(i => i.kind === 'examScore'));
      const lines = examRows.slice(0, MAX_LISTED).map(r =>
        `* ${r.name} [${r.riskLevel.name}]: Hackathon ${fmtScore(r.hk)} (TN ${fmtExamCell(r.hkTNCell)} / TL ${fmtExamCell(r.hkTLCell)}); cuối môn ${fmtScore(r.ck)} (${examCellLabel(r, 'ckTNCell')} ${fmtExamCell(r.ckTNCell)} / ${examCellLabel(r, 'ckTLCell')} ${fmtExamCell(r.ckTLCell)}); nộp BTVN ${fmtPercent(r.hw)}${r.suspect ? ' | nghi vấn BTVN' : ''}`);
      return metricPrompt(courseName, 'kết quả ĐIỂM THI (Hackathon và cuối môn)', `SỐ LIỆU
- ${total}; điểm Hackathon: ${stats(rows.filter(r => !r.absentPhases.includes('hk')).map(r => r.hk))}; vắng Hackathon ${absentHk} SV
- Điểm cuối môn: ${stats(rows.filter(r => !r.absentPhases.includes('ck')).map(r => r.ck))}; vắng thi cuối môn ${absentCk} SV
- Phần thi dưới ngưỡng theo mức: ${countByLevel(rows, levels, 'examScore')}
- Nghi vấn BTVN (BTVN tốt nhưng thi thấp): ${rows.filter(r => r.suspect).length} SV
${rows.some(r => r.makeupNotes.length) ? `- Có ${rows.filter(r => r.makeupNotes.length).length} SV thi bổ sung` : ''}

SINH VIÊN CẦN CHÚ Ý VỀ ĐIỂM THI (${examRows.length})
${lines.join('\n') || 'Không có.'}${examRows.length > MAX_LISTED ? `\n(và ${examRows.length - MAX_LISTED} SV khác)` : ''}`);
    }
  }
}
