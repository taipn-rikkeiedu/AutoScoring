// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  BatchStudent, buildSessionAiPrompt, buildStudentItems, itemFeedback, parseSessionHomework, parseSessionStudents,
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

describe('buildSessionAiPrompt', () => {
  const mk = (name: string, rows: [string, string | null, string][]): BatchStudent => ({
    studentId: name, name, code: 'SV', status: rows.every(r => r[0]) ? 'HOÀN THÀNH' : 'CHƯA HOÀN THÀNH', completed: null,
    items: rows.map(([link, score, report], n) => ({
      key: `${name}:${n}`, studentId: name, studentName: name, homeworkId: `h${n}`, title: `[Bài tập] Đề ${n + 1}`,
      assignment: '', criteria: '', images: [], link, sysAi: '', comment: '',
      status: score ? 'success' : 'pending', score, report: report ? `${report}\n<score>${score}</score>` : undefined
    }))
  });
  const students = [
    mk('Nguyễn An', [['g/1', '9', 'Làm tốt, thiếu validate input.'], ['g/2', '7', 'Chưa xử lý mảng rỗng.']]),
    mk('Trần Bình', [['g/3', '4', 'Sai vòng lặp.'], ['', null, '']]),
    mk('Lê Chi', [['', null, ''], ['', null, '']])
  ];
  const ctx = { className: 'Lớp A', courseName: 'Lập trình C', sessionName: 'Session 05', scale: '10' };

  it('gửi lớp: không lộ tên sinh viên', () => {
    const p = buildSessionAiPrompt('class', students, ctx);
    expect(p).not.toContain('Nguyễn An');
    expect(p).toMatchSnapshot();
  });
  it('báo cáo: có tên, nhóm cần chú ý, nhóm làm tốt', () => {
    expect(buildSessionAiPrompt('report', students, ctx)).toMatchSnapshot();
  });
  it('itemFeedback: ưu tiên nhận xét AI, rút gọn khoảng trắng', () => {
    expect(itemFeedback(students[0].items[0])).toBe('Làm tốt, thiếu validate input.');
    expect(itemFeedback({ ...students[2].items[0], comment: '  Nhận xét\n\ntrên QLĐT ' })).toBe('Nhận xét trên QLĐT');
  });
});
