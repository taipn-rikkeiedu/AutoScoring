import { describe, expect, it } from 'vitest';
import { extractComment, parseScore } from '~/src/core/utils';

describe('parseScore', () => {
  it.each([
    ['<score> 8,5 </score>', '8.5'],
    ['Tổng điểm: **7**/10', '7'],
    ['Score: 92', '92'],
    ['được 6/10 điểm', '6'],
    ['không có điểm', null],
    [null, null]
  ])('%s → %s', (input, expected) => {
    expect(parseScore(input)).toBe(expected);
  });
});

describe('extractComment', () => {
  it('lấy phần sau tiêu đề ĐÁNH GIÁ', () => {
    expect(extractComment('# Báo cáo\n## ĐÁNH GIÁ\nCode gọn.\n---\nchi tiết')).toBe('Code gọn.');
  });
  it('bỏ phần điểm ở cuối', () => {
    expect(extractComment('Thiếu validate.\nTổng điểm: 7/10')).toMatchSnapshot();
    expect(extractComment('Ổn.<score>9</score>')).toMatchSnapshot();
  });
  it('rỗng → rỗng', () => {
    expect(extractComment(null)).toBe('');
  });
});
