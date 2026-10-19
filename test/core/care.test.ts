import { describe, expect, it } from 'vitest';
import { careStatusColor, optionsWith, parseCareCase, parseCareHistory, patchOf, samePatch } from '~/src/core/care';

const raw = {
  id: 39918, reason: null, status: 'Đang xử lý', statusChangedAt: null, category: null, careMethod: null, result: null, imageUrl: null,
  createdAt: '2026-10-16T06:17:07.949Z', updatedAt: '2026-10-16T06:17:07.949Z',
  attendanceDetail: {
    student: { id: 1590, studentCode: 'SV0001', fullName: 'Sinh Viên 1', phone: '0900000000', email: 'user1@example.com' },
    attendance: { date: '2026-10-16', period: 4, classes: { id: 141, name: 'Lớp A' }, courses: { name: 'Môn B' } }
  }
};

describe('care', () => {
  it('parseCareCase làm phẳng ca chăm sóc', () => {
    expect(parseCareCase(raw)).toMatchSnapshot();
  });

  it('parseCareHistory sắp ngày mới trước', () => {
    const h = parseCareHistory({
      student: { totalNoPermitAbsent: 54, totalResolved: 0 },
      history: [
        { id: 1, status: 'Quay lại học', attendanceDetail: { date: '2026-10-15', subjectName: 'M', teacherName: 'GV' } },
        { id: 2, status: 'Đang xử lý', attendanceDetail: { date: '2026-10-16' } }
      ]
    });
    expect(h.items.map(i => i.id)).toEqual([2, 1]);
    expect([h.totalNoPermitAbsent, h.totalResolved]).toEqual([54, 0]);
  });

  it('samePatch coi null và rỗng như nhau', () => {
    const c = parseCareCase(raw);
    expect(samePatch(patchOf(c), { reason: '', result: '', status: 'Đang xử lý', category: '', careMethod: '' })).toBe(true);
    expect(samePatch(patchOf(c), { ...patchOf(c), result: 'x' })).toBe(false);
  });

  it('màu trạng thái và lựa chọn có giá trị lạ', () => {
    expect(['Đang xử lý', 'Quay lại học', 'Không liên lạc được, chuyển CTSV', 'Xin học lại môn', 'Khác'].map(careStatusColor))
      .toEqual(['orange', 'green', 'red', 'purple', 'default']);
    expect(optionsWith(['A'], 'KHÁCH QUAN').map(o => o.value)).toEqual(['A', 'KHÁCH QUAN']);
    expect(optionsWith(['A'], 'A')).toHaveLength(1);
  });
});
