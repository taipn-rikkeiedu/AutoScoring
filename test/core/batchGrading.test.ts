// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  BatchStudent, buildCommonErrorsPrompt, buildSessionStats, buildStudentItems, effectiveScore, formatSessionStats, itemFeedback,
  parseSessionHomework, parseSessionStudents,
  scoreSourceCounts,
  pickResult, studentAverage, submittedCount
} from '~/src/core/batchGrading';

const rawHomework = [
  { id: 11, title: '[Bài tập] Tính tổng', description: '<p>Viết hàm <b>sum</b></p>', tutorial: '<p>Dùng vòng lặp</p>', gradingCriteria: '<p>Đúng kết quả</p>' },
  { id: 12, title: '[Bài tập] Đảo chuỗi', description: '<p>Đảo ngược chuỗi</p>' }
];
const stu = { studentId: '1', name: 'Sinh Viên 1', code: 'SV0001', status: 'HOÀN THÀNH', completed: 2 };

describe('parseSessionStudents', () => {
  it('lấy trạng thái đúng buổi', () => {
    const list = [{
      id: 1, fullName: ' Sinh Viên 1 ', studentCode: 'SV0001', sessionStudent: [
        { session: { id: 9 }, status: 'KHÁC', completedExercises: 0 },
        { session: { id: 10 }, status: 'HOÀN THÀNH', completedExercises: 2 }
      ]
    }];
    expect(parseSessionStudents(list, '10')).toEqual([{ studentId: '1', name: 'Sinh Viên 1', code: 'SV0001', status: 'HOÀN THÀNH', completed: 2 }]);
  });
});

describe('buildStudentItems', () => {
  const homework = parseSessionHomework(rawHomework);

  it('mỗi đề 1 dòng, lấy bản nộp mới nhất, thêm đề ngoài buổi', () => {
    const exercises = [
      { id: 100, homework: { id: 11 }, link_git: 'https://github.com/a/old', aiReviews: [] },
      {
        id: 101, homework: { id: 11 }, link_git: ' https://github.com/a/new ', comment: 'Tốt', aiReviews: [
          { status: 'COMPLETED', score: 70, maxScore: 100, createdAt: '2026-10-01T00:00:00Z' },
          { status: 'COMPLETED', score: 85, maxScore: 100, createdAt: '2026-10-02T00:00:00Z' }
        ]
      },
      { id: 102, homework: { id: 99, title: 'Bài ngoài buổi' }, link_git: 'https://github.com/a/x', aiReviews: [{ status: 'FAILED' }] }
    ];
    const items = buildStudentItems(stu, homework, exercises);
    expect(items.map(i => [i.homeworkId, i.link, i.sysAi, i.comment])).toEqual([
      ['11', 'https://github.com/a/new', '85/100', 'Tốt'],
      ['12', '', '', ''],
      ['99', 'https://github.com/a/x', 'Lỗi AI', '']
    ]);
    expect(items.map(i => i.sysAiRatio)).toEqual([0.85, null, null]);
    expect(items[0]).toMatchSnapshot();
  });

  it('điểm TB chỉ tính bài đã chấm; pickResult giữ trường kết quả', () => {
    const items = buildStudentItems(stu, homework, []).map((i, n) => ({ ...i, status: 'success' as const, score: n ? '6' : '9', report: 'r' }));
    const s: BatchStudent = { ...stu, items };
    expect(studentAverage(s)).toBe(7.5);
    expect(submittedCount(s)).toBe(0);
    expect(pickResult(items[0])).toEqual({ status: 'success', score: '9', report: 'r' });
  });
});

describe('số liệu buổi', () => {
  /** Mỗi dòng: [link, điểm extension chấm, nhận xét AI, điểm AI QLĐT (tỉ lệ 0–1)?]. */
  const mk = (name: string, rows: [string, string | null, string, number?][]): BatchStudent => ({
    studentId: name, name, code: 'SV', status: rows.every(r => r[0]) ? 'HOÀN THÀNH' : 'CHƯA HOÀN THÀNH', completed: null,
    items: rows.map(([link, score, report, sysAiRatio], n) => ({
      key: `${name}:${n}`, studentId: name, studentName: name, homeworkId: `h${n}`, title: `[Bài tập] Đề ${n + 1}`,
      assignment: '', criteria: '', images: [], link, comment: '',
      sysAi: sysAiRatio != null ? `${sysAiRatio * 100}/100` : '', sysAiRatio: sysAiRatio ?? null,
      status: score ? 'success' : 'pending', score, report: report ? `${report}\n<score>${score}</score>` : undefined
    }))
  });
  const students = [
    mk('Nguyễn An', [['g/1', '9', 'Làm tốt, thiếu validate input.'], ['g/2', '7', 'Chưa xử lý mảng rỗng.']]),
    mk('Trần Bình', [['g/3', '4', 'Sai vòng lặp.'], ['', null, '']]),
    mk('Lê Chi', [['', null, ''], ['', null, '']])
  ];
  const ctx = { className: 'Lớp A', courseName: 'Lập trình C', sessionName: 'Session 05', scale: '10' };

  it('buildSessionStats: nộp bài, điểm từng bài, nhóm sinh viên', () => {
    const st = buildSessionStats(students, ctx);
    expect([st.total, st.full, st.partial, st.none]).toEqual([3, 1, 1, 1]);
    expect(st.statuses).toEqual([{ label: 'HOÀN THÀNH', count: 1 }, { label: 'CHƯA HOÀN THÀNH', count: 2 }]);
    expect(st.homework).toEqual([
      { title: 'Đề 1', submitted: 2, total: 3, scored: 2, fromAi: 2, fromQldt: 0, avg: 6.5, min: 4, max: 9, belowHalf: 1 },
      { title: 'Đề 2', submitted: 1, total: 3, scored: 1, fromAi: 1, fromQldt: 0, avg: 7, min: 7, max: 7, belowHalf: 0 }
    ]);
    expect([st.classAvg, st.scoredStudents, st.withFeedback]).toEqual([6, 2, 3]);
    expect(st.notSubmitted.map(r => r.name)).toEqual(['Lê Chi']);
    expect(st.missing.map(r => `${r.name} ${r.submitted}/${r.total}`)).toEqual(['Trần Bình 1/2']);
    expect(st.lowScores.map(r => `${r.name} ${r.avg}`)).toEqual(['Trần Bình 4']);
    expect(st.top.map(r => `${r.name} ${r.avg}`)).toEqual(['Nguyễn An 8']);
    expect(formatSessionStats(st)).toMatchSnapshot();
  });

  it('chưa chấm bằng extension → dùng điểm AI QLĐT (quy về thang), ghi rõ nguồn', () => {
    const qldt = [
      mk('Phạm Dũng', [['g/5', null, '', 0.85], ['g/6', null, '', 0.4]]),
      mk('Võ Em', [['g/7', '9', 'Tốt.', 0.5], ['', null, '']]) // đã chấm bằng extension → dùng 9, không dùng 5
    ];
    const st = buildSessionStats(qldt, ctx);
    expect(st.homework.map(h => [h.scored, h.fromAi, h.fromQldt, h.avg, h.min, h.max])).toEqual([[2, 1, 1, 8.8, 8.5, 9], [1, 0, 1, 4, 4, 4]]);
    expect(st.top.map(r => `${r.name} ${r.avg}`)).toEqual(['Phạm Dũng 6.3']); // (8.5 + 4) / 2
    expect(st.missing.map(r => r.name)).toEqual(['Võ Em']);
    expect(scoreSourceCounts(qldt.flatMap(s => s.items), 10)).toEqual({ scored: 3, ai: 1, qldt: 2 });
    const text = formatSessionStats(st);
    expect(text).toContain('có điểm 2 (1 AI chấm, 1 AI QLĐT) · TB 8.8');
    expect(text).toContain('Nguồn điểm: bài đã chấm bằng AI của extension dùng điểm đó; bài chưa chấm dùng điểm AI QLĐT');
  });

  it('buildCommonErrorsPrompt: chỉ liệt kê lỗi, không lộ tên sinh viên', () => {
    const p = buildCommonErrorsPrompt(students, ctx);
    expect(p).not.toMatch(/Nguyễn An|Trần Bình|Lê Chi/);
    expect(p).toContain('Bài 1 — Đề 1 (2 nhận xét)');
    expect(p).toMatchSnapshot();
  });

  it('effectiveScore: bài chưa nộp / chưa có điểm nào → null', () => {
    const [noLink, none] = mk('X', [['', null, '', 0.9], ['g/1', null, '']]).items;
    expect(effectiveScore(noLink, 10)).toBeNull();
    expect(effectiveScore(none, 10)).toBeNull();
  });

  it('itemFeedback: ưu tiên nhận xét AI, rút gọn khoảng trắng', () => {
    expect(itemFeedback(students[0].items[0])).toBe('Làm tốt, thiếu validate input.');
    expect(itemFeedback({ ...students[2].items[0], comment: '  Nhận xét\n\ntrên QLĐT ' })).toBe('Nhận xét trên QLĐT');
  });
});
