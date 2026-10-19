import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import dashboard from '../fixtures/dashboard.json';
import attendance from '../fixtures/attendance.json';
import leaves from '../fixtures/leaves.json';
import {
  DEFAULT_ANALYSIS_RULES, TestColumn, flagRows, linkKey, parseClassDashboard, parseWatchList, plainText, sortTestColumns
} from '~/src/core/examAnalysis';
import {
  CLASS_AI_KINDS, buildClassAiPrompt, buildDistributions, buildStudentPrompt, evaluateMonitor, parseMonitorClass, summarizeClass
} from '~/src/core/studentMonitor';
import { DEFAULT_LEVELS, STRICT_LEVELS, normalizeConfig } from '~/src/core/monitorLevels';
import { parseClassAttendance } from '~/src/core/attendance';

// Một số phép tính phụ thuộc ngày hiện tại (bài thi sắp tới, chuỗi vắng…) → cố định thời gian
beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-16T10:00:00+07:00')); });
afterAll(() => { vi.useRealTimers(); });

describe('examAnalysis', () => {
  it('parseClassDashboard + flagRows', () => {
    const cols = new Map<string, TestColumn>();
    const rows = parseClassDashboard(dashboard, 'Lớp A', cols);
    expect(rows).toHaveLength(dashboard.studentsInClass.length);
    expect(sortTestColumns(cols.values())).toMatchSnapshot('cột thi');
    expect(flagRows(rows, DEFAULT_ANALYSIS_RULES, ['Sinh Vien 1', 'Không Có Tên'])).toMatchSnapshot('đánh dấu');
  });

  it('tiện ích chuỗi', () => {
    expect(plainText('  Đặng   Văn Ân ')).toMatchSnapshot();
    expect(parseWatchList('Nguyễn A\nTrần B, Lê C;  \n')).toMatchSnapshot();
    expect(['https://github.com/User/Repo.git', 'https://github.com/user/repo/tree/main', 'không phải link'].map(linkKey)).toMatchSnapshot();
  });
});

describe('studentMonitor', () => {
  const cols = new Map<string, TestColumn>();
  const base = parseMonitorClass(dashboard, 'Lớp A', cols);

  it.each([['mặc định', DEFAULT_LEVELS], ['khắt khe', STRICT_LEVELS]])('evaluateMonitor — mẫu %s', (_, levels) => {
    const config = normalizeConfig({ levels }, levels);
    const { rows, watchMissing } = evaluateMonitor(base, config, DEFAULT_ANALYSIS_RULES, ['Sinh Viên 1']);
    expect(watchMissing).toEqual([]);
    expect(rows).toMatchSnapshot('rows');
    expect(summarizeClass(rows, config.levels)).toMatchSnapshot('tổng quan');
    expect(buildDistributions(rows, config.levels)).toMatchSnapshot('phân bố');
  });

  it('prompt AI theo từng loại + từng sinh viên', () => {
    const config = normalizeConfig({ levels: DEFAULT_LEVELS }, DEFAULT_LEVELS);
    const { rows } = evaluateMonitor(base, config, DEFAULT_ANALYSIS_RULES, []);
    for (const k of CLASS_AI_KINDS) expect(buildClassAiPrompt(k.key, rows, 'Môn B', config.levels)).toMatchSnapshot(k.key);
    expect(buildStudentPrompt(rows[0], 'Môn B')).toMatchSnapshot('sinh viên');
  });
});

describe('attendance', () => {
  it('parseClassAttendance nối điểm danh với đơn nghỉ', () => {
    expect(parseClassAttendance(attendance, leaves, 'Lớp A')).toMatchSnapshot();
  });
});
