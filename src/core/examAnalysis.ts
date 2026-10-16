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
  makeup?: boolean;           // lịch "THI BỔ SUNG …"
}

/** Hình thức thi cuối môn: tự luận (TN + TL) hoặc project (kiến thức + sản phẩm + vấn đáp). */
export type ExamType = 'ESSAY' | 'PROJECT';

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
  absentPhases: TestPhase[];  // các đợt thi SV không làm bài nào (bỏ khỏi điểm thi)
  examType: ExamType;
  makeupNotes: string[];      // ghi chú thi bổ sung
  makeupPending: TestPhase[]; // đợt có thi bổ sung nhưng QLĐT chưa tính vào điểm
  hkTN: number | null; hkTL: number | null; ckTN: number | null; ckTL: number | null;
  hk: number | null; ck: number | null;
  exam: number | null;        // điểm thi tổng hợp: cuối môn, chưa có thì Hackathon
  essay: number | null;       // điểm tự luận (phản ánh năng lực tự làm rõ hơn trắc nghiệm)
  essayPhase: TestPhase | null;
  aiAvg: number | null;
  aiCount: number;
  exercises: StudentExercise[] | null;
}

export interface FlagInfo {
  level: AnalysisLevel;       // mức nghi vấn (BTVN cao nhưng điểm thi thấp, trùng link…)
  reasons: string[];
  dups: DuplicateLink[];
  gap: number | null;
  watch: boolean;
}

export type FlaggedRow<T extends AnalysisRow = AnalysisRow> = T & FlagInfo;

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
/**
 * Chuyển dữ liệu `/classes/dashboard/{classId}/{courseId}` thành các dòng phân tích.
 * Điểm lấy từ bảng điểm chính thức (finalResult) theo công thức của môn — khớp trang Thống kê học tập của QLĐT:
 * - TB Hackathon = TN × hackathon_1 + TL × hackathon_2
 * - Môn thi tự luận: cuối môn = TN × mutiple_choice_1 + TL × essay_1
 * - Môn thi project: cuối môn = sản phẩm × project + kiến thức × quizzi + vấn đáp × interview_point
 * Ô trống tính 0 như QLĐT. resultTest dùng để xem chi tiết (nhận xét, link) và xác định vắng thi / thi bổ sung.
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
  const examType: ExamType = formula?.finalExam?.type === 'PROJECT' ? 'PROJECT' : 'ESSAY';
  const wHk = { tn: formula?.hackathon?.multipleChoice ?? 0.3, tl: formula?.hackathon?.essay ?? 0.7 };
  const wEssay = { tn: formula?.finalExam?.essay?.multipleChoice ?? 0.3, tl: formula?.finalExam?.essay?.written ?? 0.7 };
  const wProject = {
    product: formula?.finalExam?.project?.product ?? 0.7,
    knowledge: formula?.finalExam?.project?.knowledge ?? 0.3,
    interview: formula?.finalExam?.project?.interview ?? 0
  };

  for (const it of list) {
    const s = it.student || {};
    const fr = it.finalResult || null;
    const tests: Record<string, TestResult> = {};
    for (const t of it.resultTest || []) {
      const sch = t.testSchedule || {};
      const test = sch.test || t.test || {};
      const phase: TestPhase = /hackathon/i.test(sch.type || '') ? 'hk' : 'ck';
      const kind: TestKind = /tự luận|tu luan|essay/i.test(test.type || '') ? 'TL' : 'TN';
      const key = `${sch.id ?? phase}|${kind}`;
      if (!testCols.has(key)) testCols.set(key, { key, phase, kind, name: test.testName || sch.type, date: sch.testStart || '' });
      // Không nộp bài (submittedAt rỗng) mà điểm trống / 0 → vắng bài thi này
      const absent = 'submittedAt' in t && !t.submittedAt && !(Number(t.point) > 0);
      tests[key] = {
        point: absent || t.point == null ? null : Number(t.point), absent, phase, kind,
        name: test.testName || sch.type, schedType: sch.type, comment: t.comment, link: t.link, date: sch.testStart,
        makeup: /bổ sung|bo sung/i.test(sch.type || '')
      };
    }
    const testList = Object.values(tests);

    // Vắng thi cả đợt: đợt có lịch thi nhưng SV không làm bài nào (tính cả thi bổ sung; môn project tính cả điểm project)
    const hasProject = examType === 'PROJECT' && fr != null && (fr.project != null || Number(fr.doProject) === 1);
    const absentPhases = (['hk', 'ck'] as TestPhase[]).filter(ph => {
      const own = testList.filter(t => t.phase === ph);
      if (!own.length || own.some(t => !t.absent)) return false;
      return !(ph === 'ck' && hasProject);
    });

    // Điểm chính thức (ô trống = 0 như QLĐT); không có bảng điểm thì để trống
    const n = (k: string) => (fr && fr[k] != null ? Number(fr[k]) : 0);
    const official = fr != null;
    const hkAbsent = absentPhases.includes('hk');
    const ckAbsent = absentPhases.includes('ck');
    const hkTN = official && !hkAbsent ? n('hackathon_1') : null;
    const hkTL = official && !hkAbsent ? n('hackathon_2') : null;
    const ckTN = official && !ckAbsent ? (examType === 'PROJECT' ? n('quizzi') : n('mutiple_choice_1')) : null;
    const ckTL = official && !ckAbsent ? (examType === 'PROJECT' ? n('project') : n('essay_1')) : null;
    const hk = hkTN != null && hkTL != null ? wHk.tn * hkTN + wHk.tl * hkTL : null;
    const ck = ckTN == null || ckTL == null ? null
      : examType === 'PROJECT'
        ? wProject.product * ckTL + wProject.knowledge * ckTN + wProject.interview * n('interview_point')
        : wEssay.tn * ckTN + wEssay.tl * ckTL;

    // Thi bổ sung: ghi chú điểm, và báo nếu QLĐT chưa tính vào điểm đợt đó
    const makeupNotes: string[] = [];
    const makeupPending: TestPhase[] = [];
    for (const ph of ['hk', 'ck'] as TestPhase[]) {
      const mk = testList.filter(t => t.phase === ph && t.makeup && !t.absent);
      if (!mk.length) continue;
      const tn = mk.find(t => t.kind === 'TN')?.point ?? null;
      const tl = mk.find(t => t.kind === 'TL')?.point ?? null;
      const parts = [tn != null ? `TN ${fmtScore(tn)}` : '', tl != null ? `TL ${fmtScore(tl)}` : ''].filter(Boolean).join(', ');
      const counted = ph === 'hk' && tn != null && tl != null && hk != null && Math.abs(wHk.tn * tn + wHk.tl * tl - hk) < 0.05;
      makeupNotes.push(`Thi bổ sung ${PHASE_LABELS[ph]}: ${parts}${counted ? '' : ' — QLĐT chưa tính vào điểm đợt này'}`);
      if (!counted) makeupPending.push(ph);
    }

    // "Năng lực tự làm": tự luận / sản phẩm project cuối môn, chưa có thì tự luận Hackathon
    const essayPhase: TestPhase | null = ckTL != null ? 'ck' : hkTL != null ? 'hk' : null;

    out.push({
      key: `${d?.classInfo?.id ?? classLabel}:${s.id}`,
      classLabel, studentId: s.id, name: s.fullName || '', code: s.studentCode || '', status: it.status || s.status || '',
      hw: it.submissionRate != null ? Number(it.submissionRate) : (fr?.homework != null ? Number(fr.homework) : null),
      absentRate: it.attendanceRate != null ? Number(it.attendanceRate) : null,
      tests, absentPhases, examType, makeupNotes, makeupPending, hkTN, hkTL, ckTN, ckTL, hk, ck,
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
    .filter(x => x.split(/\s+/).length >= 2 && !/\d{3,}/.test(x));
}

/* ---------- Gắn cờ ---------- */
export function flagRows<T extends AnalysisRow>(rows: T[], rules: AnalysisRules, watchList: string[]): { rows: FlaggedRow<T>[]; watchMissing: string[] } {
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

  const flagged = rows.map((r): FlaggedRow<T> => {
    const reasons: string[] = [];
    const dups = dupsByRow.get(r) || [];
    const ability = r.essay != null ? r.essay : r.exam;
    const abilityLbl = r.essay == null || !r.essayPhase ? 'thi'
      : r.essayPhase === 'ck' && r.examType === 'PROJECT' ? 'sản phẩm project' : `tự luận ${PHASE_LABELS[r.essayPhase]}`;
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
