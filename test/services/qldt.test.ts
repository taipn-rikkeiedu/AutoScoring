import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromeFake, fakeJwt, installChrome, nowSec } from '../fakes/chrome';
import { createServices, Services } from '~/src/services/container';
import { QldtAuthError } from '~/src/services/qldt/errors';

// Mỗi test một bộ service mới (container) → không dính trạng thái nhớ tạm / cache giữa các test
let chromeFake: ChromeFake;
let s: Services['qldt'];
const bearer = (payload: Record<string, unknown>) => `Bearer ${fakeJwt(payload)}`;

beforeEach(() => {
  chromeFake = installChrome();
  chromeFake.tabs = [{ id: 1, url: 'https://qldt.rikkei.edu.vn/home', status: 'complete' }];
  s = createServices().qldt;
});

describe('QldtAuthProvider', () => {
  it('chọn token còn hạn lâu nhất giữa tab và bản đã lưu, lưu lại token được chọn', async () => {
    const stored = bearer({ id: 7, exp: nowSec() + 600 });
    const fresh = fakeJwt({ id: 7, exp: nowSec() + 7200 });
    await chromeFake.local.set({ qldtAuthToken: stored });
    chromeFake.tabTokens = [JSON.stringify(fresh), fakeJwt({ id: 7, exp: nowSec() - 5 })];
    expect(await s.auth.getAuth()).toBe(`Bearer ${fresh}`);
    expect(chromeFake.local.dump().qldtAuthToken).toBe(`Bearer ${fresh}`);
  });

  it('mọi token đã hết hạn → xoá bản lưu, báo hết phiên', async () => {
    await chromeFake.local.set({ qldtAuthToken: bearer({ exp: nowSec() - 60 }) });
    await expect(s.auth.getAuth()).rejects.toThrow(/hết hạn/);
    expect(chromeFake.local.dump().qldtAuthToken).toBeUndefined();
  });

  it('không có token nào → báo chưa đăng nhập', async () => {
    chromeFake.tabs = [];
    await expect(s.auth.getAuth()).rejects.toBeInstanceOf(QldtAuthError);
  });

  it('bỏ qua tab đang ngủ; tab đóng băng chờ tối đa 2,5s rồi dùng token đã lưu', async () => {
    vi.useFakeTimers();
    const stored = bearer({ exp: nowSec() + 600 });
    await chromeFake.local.set({ qldtAuthToken: stored });
    chromeFake.tabs = [{ id: 1, url: 'https://qldt.rikkei.edu.vn/', discarded: true }, { id: 2, url: 'https://qldt.rikkei.edu.vn/', status: 'complete' }];
    chromeFake.tabTokens = 'hang';
    const p = s.auth.getAuth();
    await vi.advanceTimersByTimeAsync(2600);
    expect(await p).toBe(stored);
    expect(chromeFake.tabReads).toBe(1);
    vi.useRealTimers();
  });

  it('nhiều lời gọi song song chỉ đọc tab 1 lần, sau đó dùng lại trong 60s', async () => {
    chromeFake.tabTokens = [fakeJwt({ exp: nowSec() + 3600 })];
    await Promise.all(Array.from({ length: 10 }, () => s.auth.getAuth()));
    await s.auth.getAuth();
    expect(chromeFake.tabReads).toBe(1);
  });
});

describe('QldtHttpClient', () => {
  it('trả phần data, tự gắn token; 401 → QldtAuthError và xoá token đã lưu', async () => {
    await chromeFake.local.set({ qldtAuthToken: 'Bearer x' });
    let sentAuth = '';
    chromeFake.api = (path, init) => {
      sentAuth = init.headers.Authorization;
      return path === '/ok' ? { data: [1, 2] } : path === '/expired' ? { status: 401, data: null } : undefined;
    };
    expect(await s.client.get('/ok')).toEqual([1, 2]);
    expect(sentAuth).toBe('Bearer x');
    await expect(s.client.get('/missing')).rejects.toThrow(/HTTP 404/);
    await expect(s.client.get('/expired')).rejects.toBeInstanceOf(QldtAuthError);
    expect(chromeFake.local.dump().qldtAuthToken).toBeUndefined();
  });

  it('403 → QldtAuthError; getRaw không ném theo statusCode', async () => {
    await chromeFake.local.set({ qldtAuthToken: 'Bearer x' });
    chromeFake.api = (path) => (path === '/forbidden' ? { status: 403, data: null } : { status: 500, data: null });
    await expect(s.client.get('/forbidden')).rejects.toBeInstanceOf(QldtAuthError);
    expect((await s.client.getRaw('/error')).status).toBe(500);
  });
});

describe('CatalogService (qua CachedQldtClient)', () => {
  const data: Record<string, unknown> = {
    '/systems/me': [{ id: 8 }, { id: 21 }],
    '/classes/system/0': [],
    '/classes/system/8': [{ id: 1, name: 'K24-A', studentCount: 30, courses: [{ id: 5, name: 'Môn gán' }] }],
    '/classes/system/21': [{ id: 1, name: 'K24-A', studentCount: 30 }, { id: 141, name: 'K25-B', studentCount: 43 }],
    '/classes/1': { specializes: { semesters: [{ name: 'Kỳ I', courses: [{ id: 5, name: 'Môn gán' }, { id: 6, name: 'Môn kỳ' }] }] } },
    '/sessions/course/5': [{ id: 3, name: 'Buổi 2', position: 2 }, { id: 2, name: 'Buổi 1', position: 1 }]
  };
  beforeEach(async () => {
    await chromeFake.local.set({ qldtAuthToken: bearer({ id: 7 }) });
    chromeFake.api = (path) => (path in data ? { data: data[path] } : undefined);
  });

  it('gộp lớp theo từng hệ, bỏ trùng; môn gộp lớp + chương trình; buổi theo thứ tự', async () => {
    expect(await s.catalog.listClasses()).toEqual([
      { value: '1', label: 'K24-A (30 SV)' }, { value: '141', label: 'K25-B (43 SV)' }
    ]);
    expect(await s.catalog.listCourses('1')).toEqual([
      { value: '5', label: 'Môn gán' }, { value: '6', label: 'Môn kỳ — Kỳ I' }
    ]);
    expect((await s.catalog.listSessions('5')).map(x => x.name)).toEqual(['Buổi 1', 'Buổi 2']);
  });

  it('cache theo tài khoản: gọi lại không gửi request, force thì gửi, tài khoản khác thì gửi', async () => {
    await Promise.all([s.catalog.listClasses(), s.catalog.listClasses()]);
    expect(chromeFake.calls).toHaveLength(4);
    chromeFake.calls = [];
    await s.catalog.listClasses();
    expect(chromeFake.calls).toHaveLength(0);
    await s.catalog.listClasses(true);
    expect(chromeFake.calls).toHaveLength(4);
    chromeFake.calls = [];
    s.auth.invalidate();
    await chromeFake.local.set({ qldtAuthToken: bearer({ id: 8 }) });
    await s.catalog.listClasses();
    expect(chromeFake.calls).toHaveLength(4);
  });

  it('lỗi /systems/me (không phải lỗi đăng nhập) → vẫn dùng /classes/system/0', async () => {
    chromeFake.api = (path) => (path === '/classes/system/0' ? { data: [{ id: 9, name: 'Cũ' }] } : path === '/systems/me' ? { status: 500, data: null } : undefined);
    expect(await s.catalog.listClasses()).toEqual([{ value: '9', label: 'Cũ' }]);
  });
});

describe('CareService', () => {
  it('tự lấy hết các trang; PATCH trả trường QLĐT đã lưu', async () => {
    await chromeFake.local.set({ qldtAuthToken: 'Bearer x' });
    chromeFake.api = (path, init) => {
      if (init.method === 'PATCH') return { data: { ...JSON.parse(init.body!), id: 5, statusChangedAt: 't', updatedAt: 'u' } };
      const page = Number(new URLSearchParams(path.split('?')[1]).get('page'));
      return { body: JSON.stringify({ data: [{ id: page, status: 'Đang xử lý', attendanceDetail: {} }], meta: { total: 2, totalPages: 2, totalNoPermitAbsent: 4, totalResolved: 1 } }) };
    };
    const { items, meta } = await s.care.fetchCases({ classId: '1', startDate: '2026-10-01', endDate: '2026-10-16' });
    expect(items.map(i => i.id)).toEqual([1, 2]);
    expect(meta).toEqual({ total: 2, totalPages: 2, totalNoPermitAbsent: 4, totalResolved: 1 });
    expect(chromeFake.calls[0]).toContain('classId=1');
    const patch = { reason: 'r', result: 'k', status: 'Quay lại học', category: 'Khác', careMethod: 'Nhắn tin' };
    expect(await s.care.update(5, patch)).toEqual({ ...patch, statusChangedAt: 't', updatedAt: 'u' });
  });
});

describe('MonitorService / HomeworkService', () => {
  it('đường dẫn API và chuẩn hoá giá trị rỗng', async () => {
    await chromeFake.local.set({ qldtAuthToken: 'Bearer x' });
    chromeFake.api = (path) => {
      if (path.startsWith('/request-leave')) return { body: JSON.stringify([{ id: 1 }]) };
      if (path.startsWith('/exercise')) return { data: [{ id: 1, course: { id: 5 } }, { id: 2, course: { id: 6 } }, { id: 3 }] };
      return { data: null };
    };
    expect(await s.monitor.classLeaves('1')).toEqual([{ id: 1 }]);
    expect(await s.monitor.classAttendance('1', '5')).toEqual({});
    expect(await s.homework.sessionHomework('9')).toEqual([]);
    expect((await s.homework.studentExercises('3', '5')).map(e => e.id)).toEqual([1, 3]);
    expect(chromeFake.calls).toContain('/attendance?class_id=1&course_id=5');
  });
});
