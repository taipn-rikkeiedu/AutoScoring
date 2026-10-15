/**
 * Phân tích BTVN & điểm thi: so sánh mức độ làm BTVN với điểm thi (Hackathon / cuối môn)
 * để tìm SV cần rà soát (nghi dùng AI / làm theo bạn). Chỉ là DẤU HIỆU để GV kiểm tra lại, không phải kết luận.
 */

export interface AnalysisRules {
  hwMin: number;      // BTVN nộp ≥ hwMin (%)
  highBelow: number;  // … và điểm thi < highBelow → nghi vấn cao
  midBelow: number;   // … hoặc điểm thi < midBelow → cần rà soát
  gapMin: number;     // … hoặc chênh BTVN − thi ≥ gapMin → cần rà soát
  aiHigh: number;     // điểm AI bài tập TB ≥ aiHigh mà thi thấp → thêm cờ
}

export const DEFAULT_ANALYSIS_RULES: AnalysisRules = { hwMin: 80, highBelow: 50, midBelow: 65, gapMin: 35, aiHigh: 80 };

export type AnalysisLevel = 'high' | 'medium' | 'low' | 'absent' | 'na';

export const ANALYSIS_LEVELS: Record<AnalysisLevel, { label: string; color: string; order: number }> = {
  high: { label: 'Nghi vấn cao', color: 'red', order: 0 },
  medium: { label: 'Cần rà soát', color: 'orange', order: 1 },
  low: { label: 'Bình thường', color: 'green', order: 2 },
  absent: { label: 'Vắng thi', color: 'default', order: 3 },
  na: { label: 'Chưa có điểm thi', color: 'default', order: 4 }
};

export type TestPhase = 'hk' | 'ck';
export type TestKind = 'TN' | 'TL';

export const PHASE_LABELS: Record<TestPhase, string> = { hk: 'Hackathon', ck: 'cuối môn' };

export interface TestColumn {
  key: string;
  phase: TestPhase;
  kind: TestKind;
  name: string;
  date: string;
}

export interface TestResult {
  point: number | null;       // null khi vắng thi
  absent: boolean;            // SV không nộp bài thi (không tính là 0 điểm)
  phase: TestPhase;
  kind: TestKind;
  name: string;
  schedType: string;
  comment?: string;
  link?: string;
  date?: string;
}

export interface StudentExercise {
  title: string;
  link: string;
  ai: number | null; // điểm AI quy về thang 100
}

export interface DuplicateLink {
  what: string;
  link: string;
  others: string[];
}

export interface AnalysisRow {
  key: string;
  classLabel: string;
  studentId: string | number;
  name: string;
  code: string;
  status: string;
  hw: number | null;          // tỉ lệ nộp BTVN (%)
  absentRate: number | null;  // tỉ lệ nghỉ học (%)
  tests: Record<string, TestResult>;
  absentPhases: TestPhase[];  // các đợt thi SV vắng (bỏ khỏi điểm thi)
  hkTN: number | null; hkTL: number | null; ckTN: number | null; ckTL: number | null;
  hk: number | null; ck: number | null;
  exam: number | null;        // điểm thi tổng hợp: cuối môn, chưa có thì Hackathon
  essay: number | null;       // điểm tự luận (phản ánh năng lực tự làm rõ hơn trắc nghiệm)
  essayPhase: TestPhase | null;
  aiAvg: number | null;
  aiCount: number;
  exercises: StudentExercise[] | null;
}

export interface FlaggedRow extends AnalysisRow {
  level: AnalysisLevel;
  reasons: string[];
  dups: DuplicateLink[];
  gap: number | null;
  watch: boolean;
}

/* ---------- Tiện ích số / chuỗi ---------- */
export const avg = (a: (number | null | undefined)[]): number | null => {
  const v = a.filter((x): x is number => x != null && !isNaN(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
export const round1 = (x: number | null | undefined): number | null => (x == null ? null : Math.round(x * 10) / 10);
export const fmtScore = (x: number | null | undefined): string => (x == null ? '—' : String(round1(x)));

const normName = (s: string) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
/** Bỏ dấu tiếng Việt để so khớp tên gõ không dấu. */
export const plainText = (s: string) => normName(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

/** Chuẩn hoá link để phát hiện trùng bài nộp giữa các SV (theo repo GitHub hoặc ID Google Docs). */
export function linkKey(u: string): string | null {
  try {
    const x = new URL(String(u).trim());
    const gd = x.pathname.match(/\/d\/([\w-]{20,})/)?.[1] || x.searchParams.get('id');
    if (/google\.com$/.test(x.hostname) && gd) return 'gdoc:' + gd;
    if (x.hostname === 'github.com') {
      const p = x.pathname.split('/').filter(Boolean);
      if (p.length >= 2) return `gh:${p[0]}/${p[1].replace(/\.git$/, '')}`.toLowerCase();
    }
    return (x.hostname + x.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return null;
  }
}

/* ---------- Chuẩn hoá dữ liệu dashboard 1 lớp ---------- */
function combine(tn: number | null, tl: number | null, w: { tn: number; tl: number } | null): number | null {
  if (tn == null && tl == null) return null;
  if (tn == null) return tl;
  if (tl == null) return tn;
  return w ? tn * w.tn + tl * w.tl : (tn + tl) / 2;
}

/**
 * Chuyển dữ liệu `/classes/dashboard/{classId}/{courseId}` thành các dòng phân tích.
 * `testCols` được bổ sung các bài thi gặp được (dùng chung khi gộp nhiều lớp).
 */
export function parseClassDashboard(d: any, classLabel: string, testCols: Map<string, TestColumn>): AnalysisRow[] {
  const out: AnalysisRow[] = [];
  const list: any[] = d?.studentsInClass || [];

  let formula: any = null;
  outer: for (const it of list) {
    for (const t of it.resultTest || []) {
      const f = t.testSchedule?.course?.scoringFormula;
      if (f) { formula = f; break outer; }
    }
  }
  const wHk = formula?.hackathon ? { tn: formula.hackathon.multipleChoice, tl: formula.hackathon.essay } : null;
  const fe = formula?.finalExam?.essay;
  const wCk = fe ? { tn: fe.multipleChoice, tl: fe.written } : null;

  for (const it of list) {
    const s = it.student || {};
    const fr = it.finalResult || {};
    const tests: Record<string, TestResult> = {};
    for (const t of it.resultTest || []) {
      const sch = t.testSchedule || {};
      const test = sch.test || t.test || {};
      const phase: TestPhase = /hackathon/i.test(sch.type || '') ? 'hk' : 'ck';
      const kind: TestKind = /tự luận|tu luan|essay/i.test(test.type || '') ? 'TL' : 'TN';
      const key = `${phase}|${kind}|${test.testName || sch.id}`;
      if (!testCols.has(key)) testCols.set(key, { key, phase, kind, name: test.testName || sch.type, date: sch.testStart || '' });
      // Không nộp bài (submittedAt rỗng) mà điểm trống / 0 → vắng thi, không tính là 0 điểm
      const absent = 'submittedAt' in t && !t.submittedAt && !(Number(t.point) > 0);
      tests[key] = {
        point: absent || t.point == null ? null : Number(t.point), absent, phase, kind,
        name: test.testName || sch.type, schedType: sch.type, comment: t.comment, link: t.link, date: sch.testStart
      };
    }

    const pts = (phase: TestPhase, kind: TestKind) =>
      avg(Object.values(tests).filter(t => t.phase === phase && t.kind === kind).map(t => t.point));
    let hkTN = pts('hk', 'TN');
    let hkTL = pts('hk', 'TL');
    let ckTN = pts('ck', 'TN');
    let ckTL = pts('ck', 'TL');
    // Dự phòng khi không có resultTest: lấy từ bảng điểm tổng kết
    if (!Object.keys(tests).length) {
      const num = (k: string) => (fr[k] == null ? null : Number(fr[k]));
      hkTN = num('hackathon_1'); hkTL = num('hackathon_2');
      ckTN = avg([num('mutiple_choice_1'), num('mutiple_choice_2')]);
      ckTL = avg([num('essay_1'), num('essay_2'), num('project')]);
    }
    // Vắng 1 phần của đợt thi thì không tính điểm tổng hợp đợt đó (trang QLĐT cũng chỉ đếm SV có đủ điểm)
    const absentPhases = (['hk', 'ck'] as TestPhase[]).filter(ph => Object.values(tests).some(t => t.phase === ph && t.absent));
    const hk = absentPhases.includes('hk') ? null : combine(hkTN, hkTL, wHk);
    const ck = absentPhases.includes('ck') ? null : combine(ckTN, ckTL, wCk);
    const essayPhase: TestPhase | null = ckTL != null ? 'ck' : hkTL != null ? 'hk' : null;

    out.push({
      key: `${d?.classInfo?.id ?? classLabel}:${s.id}`,
      classLabel, studentId: s.id, name: s.fullName || '', code: s.studentCode || '', status: it.status || s.status || '',
      hw: it.submissionRate != null ? Number(it.submissionRate) : (fr.homework != null ? Number(fr.homework) : null),
      absentRate: it.attendanceRate != null ? Number(it.attendanceRate) : null,
      tests, absentPhases, hkTN, hkTL, ckTN, ckTL, hk, ck,
      exam: ck != null ? ck : hk,
      essay: ckTL != null ? ckTL : hkTL, essayPhase,
      aiAvg: null, aiCount: 0, exercises: null
    });
  }
  return out;
}

/** Bài tập + điểm AI hệ thống (lần chấm mới nhất đã xong) của 1 SV, quy về thang 100. */
export function toStudentExercises(list: any[]): StudentExercise[] {
  return list.map(e => {
    const reviews = (e.aiReviews || [])
      .filter((x: any) => x && x.status === 'COMPLETED' && x.score != null)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const last = reviews[reviews.length - 1];
    return {
      title: e.homework?.title || `Bài ${e.id}`,
      link: e.link_git || '',
      ai: last ? (last.score / (last.maxScore || 100)) * 100 : null
    };
  });
}

/* ---------- Danh sách rà soát ---------- */
export function parseWatchList(text: string): string[] {
  return text.split(/[\n,;]+/)
    .map(x => x.replace(/^.*:/, '').replace(/[()]/g, '').trim())
    .filter(x => x.split(/\s+/).length >= 2 && !/\d/.test(x));
}

/* ---------- Gắn cờ ---------- */
export function flagRows(rows: AnalysisRow[], rules: AnalysisRules, watchList: string[]): { rows: FlaggedRow[]; watchMissing: string[] } {
  // Trùng link: bài thi + bài tập (nếu đã tải)
  const byLink = new Map<string, { row: AnalysisRow; what: string; link: string }[]>();
  for (const r of rows) {
    const links: { link: string; what: string }[] = [];
    for (const t of Object.values(r.tests)) if (t.link) links.push({ link: t.link, what: `bài thi "${t.name}"` });
    for (const e of r.exercises || []) if (e.link) links.push({ link: e.link, what: `bài tập "${e.title}"` });
    for (const l of links) {
      const k = linkKey(l.link);
      if (!k) continue;
      if (!byLink.has(k)) byLink.set(k, []);
      byLink.get(k)!.push({ row: r, what: l.what, link: l.link });
    }
  }
  const dupsByRow = new Map<AnalysisRow, DuplicateLink[]>();
  for (const arr of byLink.values()) {
    const who = [...new Set(arr.map(a => a.row))];
    if (who.length < 2) continue;
    for (const a of arr) {
      const others = who.filter(x => x !== a.row).map(x => `${x.name} (${x.classLabel})`);
      if (!dupsByRow.has(a.row)) dupsByRow.set(a.row, []);
      dupsByRow.get(a.row)!.push({ what: a.what, link: a.link, others });
    }
  }

  const watchNorm = watchList.map(w => ({ w, n: normName(w), p: plainText(w) }));
  const found = new Set<string>();

  const flagged = rows.map((r): FlaggedRow => {
    const reasons: string[] = [];
    const dups = dupsByRow.get(r) || [];
    const ability = r.essay != null ? r.essay : r.exam;
    const abilityLbl = r.essay != null && r.essayPhase ? `tự luận ${PHASE_LABELS[r.essayPhase]}` : 'thi';
    const gap = r.hw != null && r.exam != null ? r.hw - r.exam : null;

    for (const ph of r.absentPhases) {
      reasons.push(`Vắng thi ${PHASE_LABELS[ph]}${ph === 'ck' && r.hk != null ? ' — đang xét theo điểm Hackathon' : ''}`);
    }

    let level: AnalysisLevel;
    if (r.exam == null || ability == null) level = r.absentPhases.length ? 'absent' : 'na';
    else if (r.hw != null && r.hw >= rules.hwMin && ability < rules.highBelow) {
      level = 'high';
      reasons.push(`Nộp ${fmtScore(r.hw)}% BTVN nhưng điểm ${abilityLbl} chỉ ${fmtScore(ability)}`);
    } else if (r.hw != null && r.hw >= rules.hwMin && (ability < rules.midBelow || (gap != null && gap >= rules.gapMin))) {
      level = 'medium';
      reasons.push(ability < rules.midBelow
        ? `Nộp ${fmtScore(r.hw)}% BTVN, điểm ${abilityLbl} ${fmtScore(ability)} dưới ${rules.midBelow}`
        : `Chênh lệch BTVN − điểm thi ${fmtScore(gap)}`);
    } else level = 'low';

    if (r.aiAvg != null && r.aiAvg >= rules.aiHigh && ability != null && ability < rules.midBelow) {
      reasons.push(`Điểm AI bài tập TB ${fmtScore(r.aiAvg)} cao hơn nhiều so với điểm ${abilityLbl} ${fmtScore(ability)}`);
      if (level === 'low') level = 'medium';
    }
    if (r.hkTN != null && r.hkTL != null && r.hkTN - r.hkTL >= 40) {
      reasons.push(`Hackathon: trắc nghiệm ${fmtScore(r.hkTN)} nhưng tự luận ${fmtScore(r.hkTL)}`);
    }
    if (dups.length) {
      reasons.push(`Trùng link bài nộp với: ${[...new Set(dups.flatMap(d => d.others))].join(', ')}`);
      if (level === 'low' || level === 'na' || level === 'absent') level = 'medium';
    }

    const n = normName(r.name);
    const p = plainText(r.name);
    const hit = watchNorm.find(x => x.n === n) || watchNorm.find(x => x.p === p);
    if (hit) found.add(hit.w);

    return { ...r, level, reasons, dups, gap, watch: !!hit };
  });

  return { rows: flagged, watchMissing: watchList.filter(w => !found.has(w)) };
}

export function sortTestColumns(cols: Iterable<TestColumn>): TestColumn[] {
  return [...cols].sort((a, b) =>
    (a.phase === b.phase ? 0 : a.phase === 'hk' ? -1 : 1) || String(a.date).localeCompare(String(b.date)));
}

export const testColumnLabel = (c: TestColumn) => `${c.phase === 'hk' ? 'HKT' : 'Thi CK'} ${c.kind}`;
