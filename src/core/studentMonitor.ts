/**
 * Giám sát học tập: gộp chỉ số học tập (nghỉ học, thiếu bài tập, chậm e-learning, điểm thi) với phân tích
 * nghi vấn BTVN ↔ điểm thi. Dữ liệu từ API `/classes/dashboard/{classId}/{courseId}` của QLĐT.
 *
 * - Mức rủi ro (Báo động / Cảnh báo) chỉ xét vi phạm học tập, theo ngưỡng từng chỉ số.
 * - "Sắp vượt ngưỡng" là cảnh báo sớm theo khoảng cố định.
 * - Nghi vấn (BTVN cao nhưng thi thấp, trùng link) là nhãn riêng, không tính vào mức rủi ro.
 */
import {
  AnalysisRow, AnalysisRules, FlaggedRow, TestColumn, TestPhase, TestKind,
  parseClassDashboard, flagRows, avg, fmtScore, PHASE_LABELS
} from './examAnalysis';

/** Điểm 1 phần thi: số điểm, 'absent' khi SV vắng thi, null khi chưa có bài thi này. */
export type ExamCell = number | 'absent' | null;
export type ExamCellKey = 'hkTNCell' | 'hkTLCell' | 'ckTNCell' | 'ckTLCell';

export const EXAM_CELLS: { key: ExamCellKey; phase: TestPhase; kind: TestKind; label: string }[] = [
  { key: 'hkTNCell', phase: 'hk', kind: 'TN', label: 'HK TN' },
  { key: 'hkTLCell', phase: 'hk', kind: 'TL', label: 'HK TL' },
  { key: 'ckTNCell', phase: 'ck', kind: 'TN', label: 'CK TN' },
  { key: 'ckTLCell', phase: 'ck', kind: 'TL', label: 'CK TL' }
];

export interface MonitorRules {
  absentWarn: number;      // nghỉ học từ … % → cảnh báo
  absentAlarm: number;     // nghỉ học trên … % → báo động
  homeworkWarn: number;    // thiếu bài tập từ … % → cảnh báo
  homeworkAlarm: number;   // thiếu bài tập trên … % → báo động
  elearningWarn: number;   // chậm e-learning từ … bài → cảnh báo
  elearningAlarm: number;  // chậm e-learning từ … bài → báo động
  examPass: number;        // bài thi dưới … điểm → cảnh báo
  earlyAbsentFrom: number;   // nghỉ học từ … % (dưới ngưỡng cảnh báo) → sắp vượt ngưỡng
  earlyHomeworkFrom: number; // thiếu bài tập từ … % → sắp vượt ngưỡng
  earlyExamTo: number;       // bài thi từ ngưỡng đạt tới … điểm → sát ngưỡng
}

export const DEFAULT_MONITOR_RULES: MonitorRules = {
  absentWarn: 10, absentAlarm: 20, homeworkWarn: 10, homeworkAlarm: 20,
  elearningWarn: 1, elearningAlarm: 2, examPass: 50,
  earlyAbsentFrom: 7, earlyHomeworkFrom: 7, earlyExamTo: 55
};

export type RiskLevel = 'alarm' | 'warning' | 'early' | 'normal';

export const RISK_LEVELS: Record<RiskLevel, { label: string; order: number }> = {
  alarm: { label: 'Báo động', order: 0 },
  warning: { label: 'Cảnh báo', order: 1 },
  early: { label: 'Sắp vượt ngưỡng', order: 2 },
  normal: { label: 'Bình thường', order: 3 }
};

export type IssueKind = 'absent' | 'homework' | 'elearning' | 'examLow' | 'examAbsent';

export interface Issue {
  kind: IssueKind;
  severity: 'warning' | 'alarm';
  label: string;     // nhãn ngắn hiện trên dòng, vd "Nghỉ 12.50%"
  title: string;     // tên vấn đề, vd "Nghỉ học"
  value: string;     // giá trị hiện tại, vd "30.95%"
  threshold: string; // ngưỡng đã vượt, vd "trên 20%"
  action: string;    // gợi ý hành động
}

export interface EarlySignal {
  kind: 'absent' | 'homework' | 'exam';
  label: string;
  title: string;
  value: string;
  threshold: string;
  action: string;
}

export interface MonitorBase extends AnalysisRow {
  email: string;
  missingHomework: number | null; // tỉ lệ thiếu bài tập (%) — 100 − submissionRate
  unprepared: number | null;      // số bài e-learning chậm — elearningProgress
  rpoints: number | null;
  hkTNCell: ExamCell; hkTLCell: ExamCell; ckTNCell: ExamCell; ckTLCell: ExamCell;
}

export interface MonitorRow extends FlaggedRow<MonitorBase> {
  risk: RiskLevel;
  issues: Issue[];
  early: EarlySignal[];
  suspect: boolean;  // nghi vấn cao / cần rà soát
  actions: string[]; // gợi ý hành động (không trùng lặp)
}

export type MonitorFilter =
  | 'alarm' | 'warning' | 'early'
  | IssueKind
  | 'suspect' | 'dup' | 'watch';

export const MONITOR_FILTERS: { key: MonitorFilter; label: string; group: 'level' | 'issue' | 'suspect' }[] = [
  { key: 'alarm', label: 'Báo động', group: 'level' },
  { key: 'warning', label: 'Cảnh báo', group: 'level' },
  { key: 'early', label: 'Sắp vượt ngưỡng', group: 'level' },
  { key: 'absent', label: 'Nghỉ học', group: 'issue' },
  { key: 'homework', label: 'Thiếu bài tập', group: 'issue' },
  { key: 'elearning', label: 'Chậm E-learning', group: 'issue' },
  { key: 'examLow', label: 'Điểm thi thấp', group: 'issue' },
  { key: 'examAbsent', label: 'Vắng thi', group: 'issue' },
  { key: 'suspect', label: 'Nghi vấn BTVN', group: 'suspect' },
  { key: 'dup', label: 'Trùng link', group: 'suspect' },
  { key: 'watch', label: '⭐ DS rà soát', group: 'suspect' }
];

export function matchesFilter(r: MonitorRow, f: MonitorFilter): boolean {
  switch (f) {
    case 'alarm': case 'warning': case 'early': return r.risk === f;
    case 'suspect': return r.suspect;
    case 'dup': return r.dups.length > 0;
    case 'watch': return r.watch;
    default: return r.issues.some(i => i.kind === f);
  }
}

export const fmtPercent = (v: number | null) => (v == null ? '—' : `${v.toFixed(2)}%`);
export const fmtExamCell = (v: ExamCell) => (v === 'absent' ? 'Vắng' : fmtScore(v));

/* ---------- Đọc dữ liệu 1 lớp ---------- */
export function parseMonitorClass(d: any, classLabel: string, testCols: Map<string, TestColumn>): MonitorBase[] {
  const list: any[] = d?.studentsInClass || [];
  const rows = parseClassDashboard(d, classLabel, testCols);
  return rows.map((a, i) => {
    const it = list[i] || {};
    const tests = Object.values(a.tests);
    const cell = (phase: TestPhase, kind: TestKind, fallback: number | null): ExamCell => {
      if (!tests.length) return fallback; // không có resultTest → điểm từ bảng tổng kết
      const own = tests.filter(t => t.phase === phase && t.kind === kind);
      if (!own.length) return null;
      if (own.some(t => t.absent)) return 'absent';
      return avg(own.map(t => t.point));
    };
    const submission = it.submissionRate != null ? Number(it.submissionRate) : null;
    return {
      ...a,
      email: it.student?.email || '',
      missingHomework: submission != null ? Math.max(0, 100 - submission) : null,
      unprepared: it.elearningProgress != null ? Number(it.elearningProgress) : null,
      rpoints: it.rpoints != null ? Number(it.rpoints) : null,
      hkTNCell: cell('hk', 'TN', a.hkTN), hkTLCell: cell('hk', 'TL', a.hkTL),
      ckTNCell: cell('ck', 'TN', a.ckTN), ckTLCell: cell('ck', 'TL', a.ckTL)
    };
  });
}

/* ---------- Đánh giá rủi ro ---------- */
function percentIssue(kind: 'absent' | 'homework', v: number | null, warn: number, alarm: number): Issue | null {
  if (v == null || v < warn) return null;
  const severity = v > alarm ? 'alarm' : 'warning';
  const threshold = severity === 'alarm' ? `trên ${alarm}%` : `từ ${warn}%`;
  if (kind === 'absent') {
    return {
      kind, severity, label: `Nghỉ ${fmtPercent(v)}`, title: 'Nghỉ học', value: fmtPercent(v), threshold,
      action: severity === 'alarm' ? 'Liên hệ ngay, nhắc quy định chuyên cần' : 'Nhắc nhở chuyên cần, hỏi lý do nghỉ'
    };
  }
  return {
    kind, severity, label: `Thiếu BT ${fmtPercent(v)}`, title: 'Thiếu bài tập', value: fmtPercent(v), threshold,
    action: severity === 'alarm' ? 'Liên hệ ngay, lập kế hoạch nộp bù bài tập' : 'Nhắc nộp bù bài tập còn thiếu'
  };
}

function evaluateIssues(r: MonitorBase, rules: MonitorRules): Issue[] {
  const issues: Issue[] = [];
  const absent = percentIssue('absent', r.absentRate, rules.absentWarn, rules.absentAlarm);
  if (absent) issues.push(absent);
  const homework = percentIssue('homework', r.missingHomework, rules.homeworkWarn, rules.homeworkAlarm);
  if (homework) issues.push(homework);
  if (r.unprepared != null && r.unprepared >= rules.elearningWarn) {
    const alarm = r.unprepared >= rules.elearningAlarm;
    issues.push({
      kind: 'elearning', severity: alarm ? 'alarm' : 'warning',
      label: `Chậm EL ${r.unprepared}`, title: 'Chậm E-learning', value: `${r.unprepared} bài`,
      threshold: `từ ${alarm ? rules.elearningAlarm : rules.elearningWarn} bài`,
      action: 'Nhắc hoàn thành E-learning trước buổi học'
    });
  }
  const low = EXAM_CELLS.filter(c => typeof r[c.key] === 'number' && (r[c.key] as number) < rules.examPass);
  if (low.length) {
    const label = low.map(c => `${c.label} ${fmtScore(r[c.key] as number)}`).join(', ');
    issues.push({
      kind: 'examLow', severity: 'warning', label, title: 'Điểm thi thấp', value: label,
      threshold: `dưới ${rules.examPass} điểm`,
      action: `Hỗ trợ ôn tập phần thi dưới ${rules.examPass} điểm`
    });
  }
  if (r.absentPhases.length) {
    const phases = r.absentPhases.map(ph => PHASE_LABELS[ph]).join(', ');
    issues.push({
      kind: 'examAbsent', severity: 'alarm', label: `Vắng thi ${phases}`, title: 'Vắng thi', value: phases,
      threshold: 'không nộp bài thi',
      action: 'Xác minh lý do vắng thi, hướng dẫn thi bù / thi lại'
    });
  }
  return issues;
}

function evaluateEarly(r: MonitorBase, rules: MonitorRules, issues: Issue[]): EarlySignal[] {
  const has = (k: IssueKind) => issues.some(i => i.kind === k);
  const early: EarlySignal[] = [];
  if (!has('absent') && r.absentRate != null && r.absentRate >= rules.earlyAbsentFrom && r.absentRate < rules.absentWarn) {
    early.push({
      kind: 'absent', label: `Nghỉ ${fmtPercent(r.absentRate)}`, title: 'Nghỉ học', value: fmtPercent(r.absentRate),
      threshold: `sắp chạm ${rules.absentWarn}%`, action: `Nhắc sớm: sắp chạm ngưỡng nghỉ ${rules.absentWarn}%`
    });
  }
  if (!has('homework') && r.missingHomework != null && r.missingHomework >= rules.earlyHomeworkFrom && r.missingHomework < rules.homeworkWarn) {
    early.push({
      kind: 'homework', label: `Thiếu BT ${fmtPercent(r.missingHomework)}`, title: 'Thiếu bài tập', value: fmtPercent(r.missingHomework),
      threshold: `sắp chạm ${rules.homeworkWarn}%`, action: `Nhắc sớm: sắp chạm ngưỡng thiếu ${rules.homeworkWarn}% bài tập`
    });
  }
  const borderline = EXAM_CELLS.filter(c => {
    const v = r[c.key];
    return typeof v === 'number' && v >= rules.examPass && v <= rules.earlyExamTo;
  });
  if (borderline.length) {
    const label = borderline.map(c => `${c.label} ${fmtScore(r[c.key] as number)}`).join(', ');
    early.push({
      kind: 'exam', label, title: 'Điểm thi sát ngưỡng', value: label,
      threshold: `${rules.examPass}–${rules.earlyExamTo} điểm`, action: 'Điểm thi sát ngưỡng đạt, nên theo dõi thêm'
    });
  }
  return early;
}

export function evaluateMonitor(
  base: MonitorBase[], rules: MonitorRules, analysisRules: AnalysisRules, watchList: string[]
): { rows: MonitorRow[]; watchMissing: string[] } {
  const { rows: flagged, watchMissing } = flagRows(base, analysisRules, watchList);
  const rows = flagged.map((r): MonitorRow => {
    const issues = evaluateIssues(r, rules);
    const early = evaluateEarly(r, rules, issues);
    const alarms = issues.filter(i => i.severity === 'alarm').length;
    const risk: RiskLevel = alarms || issues.length >= 2 ? 'alarm' : issues.length ? 'warning' : early.length ? 'early' : 'normal';
    const suspect = r.level === 'high' || r.level === 'medium';
    const actions = [...new Set([
      ...issues.map(i => i.action),
      ...early.map(e => e.action),
      ...(suspect || r.dups.length ? ['Vấn đáp lại 1–2 bài tập đã nộp để xác minh'] : [])
    ])];
    // Vắng thi đã là vi phạm riêng → bỏ khỏi danh sách dấu hiệu nghi vấn
    const reasons = r.reasons.filter(x => !x.startsWith('Vắng thi'));
    return { ...r, reasons, risk, issues, early, suspect, actions };
  });
  rows.sort((a, b) =>
    RISK_LEVELS[a.risk].order - RISK_LEVELS[b.risk].order
    || (b.issues.filter(i => i.severity === 'alarm').length - a.issues.filter(i => i.severity === 'alarm').length)
    || (b.issues.length - a.issues.length)
    || (Number(b.suspect) - Number(a.suspect))
    || a.name.localeCompare(b.name, 'vi'));
  return { rows, watchMissing };
}

/* ---------- Tổng quan lớp (theo quy tắc) ---------- */
export interface ClassOverview {
  total: number;
  byRisk: Record<RiskLevel, number>;
  suspect: number;
  topIssues: { kind: IssueKind; label: string; count: number }[];
  avgAbsent: number | null;
  avgMissingHomework: number | null;
  examFailRate: number | null; // % SV có ít nhất 1 bài thi dưới ngưỡng (trong số SV có điểm)
}

const ISSUE_TITLES: Record<IssueKind, string> = {
  absent: 'Nghỉ học vượt ngưỡng', homework: 'Thiếu bài tập vượt ngưỡng', elearning: 'Chậm E-learning',
  examLow: 'Điểm thi thấp', examAbsent: 'Vắng thi'
};

export function summarizeClass(rows: MonitorRow[]): ClassOverview {
  const byRisk = { alarm: 0, warning: 0, early: 0, normal: 0 } as Record<RiskLevel, number>;
  rows.forEach(r => { byRisk[r.risk]++; });
  const topIssues = (Object.keys(ISSUE_TITLES) as IssueKind[])
    .map(kind => ({ kind, label: ISSUE_TITLES[kind], count: rows.filter(r => r.issues.some(i => i.kind === kind)).length }))
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
    examFailRate: withExam.length ? (withExam.filter(r => r.issues.some(i => i.kind === 'examLow')).length / withExam.length) * 100 : null
  };
}

/* ---------- Phân bố cho biểu đồ ---------- */
/** Trạng thái của 1 khoảng: quyết định màu cột (chỉ khoảng có vấn đề mới tô màu). */
export type BinStatus = 'normal' | 'early' | 'warning' | 'alarm' | 'absent';

/**
 * Màu trạng thái dùng chung cho biểu đồ và chi tiết SV (đã kiểm tra phân biệt được cả với người mù màu).
 * Luôn đi kèm chữ / nhãn nên màu không phải kênh thông tin duy nhất.
 */
export const STATUS_COLORS: Record<BinStatus, string> = {
  normal: '#bfbfbf',
  early: '#fadb14',
  warning: '#fa8c16',
  alarm: '#cf1322',
  absent: '#cf1322'
};

export interface DistributionBin {
  label: string;
  status: BinStatus;
  count: number;
  keys: string[]; // SV thuộc khoảng này — bấm cột để mở danh sách
}

export interface Distribution {
  key: 'absent' | 'homework' | 'elearning' | 'hk' | 'ck';
  title: string;
  subtitle: string;
  bins: DistributionBin[];
}

const n1 = (v: number) => String(Math.round(v * 10) / 10);

function binRows(rows: MonitorRow[], defs: { label: string; status: BinStatus; test: (r: MonitorRow) => boolean }[]): DistributionBin[] {
  return defs.map(d => {
    const keys = rows.filter(d.test).map(r => r.key);
    return { label: d.label, status: d.status, count: keys.length, keys };
  });
}

/** Phân bố theo % (nghỉ học / thiếu bài tập), các mốc lấy từ ngưỡng đang cài đặt. */
function percentBins(rows: MonitorRow[], get: (r: MonitorRow) => number | null, early: number, warn: number, alarm: number) {
  const has = (r: MonitorRow) => get(r) != null;
  const v = (r: MonitorRow) => get(r) as number;
  return binRows(rows, [
    { label: '0%', status: 'normal', test: r => has(r) && v(r) === 0 },
    { label: `<${n1(early)}%`, status: 'normal', test: r => has(r) && v(r) > 0 && v(r) < early },
    { label: `${n1(early)}–${n1(warn)}%`, status: 'early', test: r => has(r) && v(r) >= early && v(r) < warn },
    { label: `${n1(warn)}–${n1(alarm)}%`, status: 'warning', test: r => has(r) && v(r) >= warn && v(r) <= alarm },
    { label: `>${n1(alarm)}%`, status: 'alarm', test: r => has(r) && v(r) > alarm }
  ]);
}

/** Phân bố điểm thi tổng hợp 1 đợt (30% TN + 70% TL theo công thức môn). */
function examBins(rows: MonitorRow[], phase: 'hk' | 'ck', rules: MonitorRules) {
  const score = (r: MonitorRow) => (phase === 'hk' ? r.hk : r.ck);
  const absent = (r: MonitorRow) => r.absentPhases.includes(phase);
  const has = (r: MonitorRow) => !absent(r) && score(r) != null;
  const s = (r: MonitorRow) => score(r) as number;
  return binRows(rows, [
    { label: 'Vắng', status: 'absent', test: absent },
    { label: `<${rules.examPass}`, status: 'warning', test: r => has(r) && s(r) < rules.examPass },
    { label: `${rules.examPass}–${rules.earlyExamTo}`, status: 'early', test: r => has(r) && s(r) >= rules.examPass && s(r) <= rules.earlyExamTo },
    { label: `${rules.earlyExamTo}–80`, status: 'normal', test: r => has(r) && s(r) > rules.earlyExamTo && s(r) < 80 },
    { label: '≥80', status: 'normal', test: r => has(r) && s(r) >= 80 }
  ]);
}

export function buildDistributions(rows: MonitorRow[], rules: MonitorRules): Distribution[] {
  const avgOf = (vals: (number | null)[]) => avg(vals);
  const dists: Distribution[] = [
    {
      key: 'absent', title: 'Nghỉ học', subtitle: `TB ${fmtPercent(avgOf(rows.map(r => r.absentRate)))}`,
      bins: percentBins(rows, r => r.absentRate, rules.earlyAbsentFrom, rules.absentWarn, rules.absentAlarm)
    },
    {
      key: 'homework', title: 'Thiếu bài tập', subtitle: `TB ${fmtPercent(avgOf(rows.map(r => r.missingHomework)))}`,
      bins: percentBins(rows, r => r.missingHomework, rules.earlyHomeworkFrom, rules.homeworkWarn, rules.homeworkAlarm)
    },
    {
      key: 'elearning', title: 'Chậm E-learning', subtitle: `${rows.filter(r => (r.unprepared ?? 0) > 0).length} SV chậm`,
      bins: binRows(rows, [
        { label: 'Đúng hạn', status: 'normal', test: r => r.unprepared != null && r.unprepared < rules.elearningWarn },
        { label: `${rules.elearningWarn} bài`, status: 'warning', test: r => r.unprepared != null && r.unprepared >= rules.elearningWarn && r.unprepared < rules.elearningAlarm },
        { label: `≥${rules.elearningAlarm} bài`, status: 'alarm', test: r => r.unprepared != null && r.unprepared >= rules.elearningAlarm }
      ])
    }
  ];
  const hkScores = rows.filter(r => !r.absentPhases.includes('hk')).map(r => r.hk);
  const ckScores = rows.filter(r => !r.absentPhases.includes('ck')).map(r => r.ck);
  if (rows.some(r => r.hk != null || r.absentPhases.includes('hk'))) {
    dists.push({ key: 'hk', title: 'Điểm Hackathon', subtitle: `TB ${fmtScore(avg(hkScores))}`, bins: examBins(rows, 'hk', rules) });
  }
  if (rows.some(r => r.ck != null || r.absentPhases.includes('ck'))) {
    dists.push({ key: 'ck', title: 'Điểm thi cuối môn', subtitle: `TB ${fmtScore(avg(ckScores))}`, bins: examBins(rows, 'ck', rules) });
  }
  return dists;
}

/* ---------- Prompt cho AI ---------- */
const describeStudent = (r: MonitorRow) => [
  `Nghỉ học ${fmtPercent(r.absentRate)}, thiếu bài tập ${fmtPercent(r.missingHomework)}, chậm e-learning ${r.unprepared ?? '—'} bài`,
  `Hackathon TN ${fmtExamCell(r.hkTNCell)} / TL ${fmtExamCell(r.hkTLCell)}; cuối môn TN ${fmtExamCell(r.ckTNCell)} / TL ${fmtExamCell(r.ckTLCell)}`,
  r.issues.length ? `Vi phạm: ${r.issues.map(i => `${i.label} (${i.severity === 'alarm' ? 'báo động' : 'cảnh báo'})`).join('; ')}` : 'Không vi phạm',
  r.early.length ? `Sắp vượt ngưỡng: ${r.early.map(e => e.label).join('; ')}` : '',
  r.reasons.length ? `Dấu hiệu nghi vấn: ${r.reasons.join('; ')}` : ''
].filter(Boolean).join('\n');

export function buildClassOverviewPrompt(rows: MonitorRow[], courseName: string): string {
  const o = summarizeClass(rows);
  const flagged = rows.filter(r => r.risk === 'alarm' || r.risk === 'warning' || r.suspect).slice(0, 40);
  return `Bạn là giáo vụ theo dõi tình hình học tập. Viết tổng quan ngắn gọn (tối đa 150 từ, tiếng Việt) về lớp học môn "${courseName}" dựa trên số liệu dưới đây, gồm: tình hình chung, 2–3 vấn đề nổi bật nhất, và 3 việc giảng viên nên làm tuần này (gạch đầu dòng). Không bịa số liệu, chỉ dùng số liệu được cung cấp. Không dùng markdown tiêu đề.

SỐ LIỆU LỚP
- Sĩ số: ${o.total}; báo động ${o.byRisk.alarm}; cảnh báo ${o.byRisk.warning}; sắp vượt ngưỡng ${o.byRisk.early}; nghi vấn BTVN ${o.suspect}
- Nghỉ học TB ${fmtPercent(o.avgAbsent)}; thiếu bài tập TB ${fmtPercent(o.avgMissingHomework)}; tỉ lệ SV có bài thi dưới ngưỡng ${o.examFailRate == null ? '—' : `${o.examFailRate.toFixed(0)}%`}
- Vấn đề theo số SV: ${o.topIssues.map(t => `${t.label} ${t.count}`).join(', ') || 'không có'}

SINH VIÊN CẦN CHÚ Ý (${flagged.length})
${flagged.map(r => `* ${r.name}: ${r.issues.map(i => i.label).join(', ') || 'không vi phạm'}${r.suspect ? ' | nghi vấn BTVN' : ''}`).join('\n')}`;
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
