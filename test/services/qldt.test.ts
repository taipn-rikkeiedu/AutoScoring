import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromeFake, fakeJwt, installChrome, nowSec } from '../fakes/chrome';

// Các module QLĐT giữ trạng thái (token nhớ tạm, cache) → nạp lại module mới cho mỗi test
let chromeFake: ChromeFake;
const load = async () => ({
  client: await import('~/src/services/lms/qldtApiClient'),
  catalog: await import('~/src/services/lms/examAnalysisService'),
  care: await import('~/src/services/lms/careService')
});
const bearer = (payload: Record<string, unknown>) => `Bearer ${fakeJwt(payload)}`;

beforeEach(() => {
  vi.resetModules();
  chromeFake = installChrome();
  chromeFake.tabs = [{ id: 1, url: 'https://qldt.rikkei.edu.vn/home', status: 'complete' }];
});

describe('getQldtAuth', () => {
  it('chọn token còn hạn lâu nhất giữa tab và bản đã lưu, lưu lại token được chọn', async () => {
    const stored = bearer({ id: 7, exp: nowSec() + 600 });
    const fresh = fakeJwt({ id: 7, exp: nowSec() + 7200 });
    await chromeFake.local.set({ qldtAuthToken: stored });
    chromeFake.tabTokens = [JSON.stringify(fresh), fakeJwt({ id: 7, exp: nowSec() - 5 })];
    const { client } = await load();
    expect(await client.getQldtAuth()).toBe(`Bearer ${fresh}`);
    expect(chromeFake.local.dump().qldtAuthToken).toBe(`Bearer ${fresh}`);
  });

  it('mọi token đã hết hạn → xoá bản lưu, báo hết phiên', async () => {
    await chromeFake.local.set({ qldtAuthToken: bearer({ exp: nowSec() - 60 }) });
    const { client } = await load();
    await expect(client.getQldtAuth()).rejects.toThrow(/hết hạn/);
    expect(chromeFake.local.dump().qldtAuthToken).toBeUndefined();
  });

  it('không có token nào → báo chưa đăng nhập', async () => {
    chromeFake.tabs = [];
    const { client } = await load();
    await expect(client.getQldtAuth()).rejects.toBeInstanceOf(client.QldtAuthError);
  });

  it('bỏ qua tab đang ngủ; tab đóng băng chờ tối đa 2,5s rồi dùng token đã lưu', async () => {
    vi.useFakeTimers();
    const stored = bearer({ exp: nowSec() + 600 });
    await chromeFake.local.set({ qldtAuthToken: stored });
    chromeFake.tabs = [{ id: 1, url: 'https://qldt.rikkei.edu.vn/', discarded: true }, { id: 2, url: 'https://qldt.rikkei.edu.vn/', status: 'complete' }];
    chromeFake.tabTokens = 'hang';
    const { client } = await load();
    const p = client.getQldtAuth();
    await vi.advanceTimersByTimeAsync(2600);
    expect(await p).toBe(stored);
    expect(chromeFake.tabReads).toBe(1);
    vi.useRealTimers();
  });

  it('nhiều lời gọi song song chỉ đọc tab 1 lần, sau đó dùng lại trong 60s', async () => {
    chromeFake.tabTokens = [fakeJwt({ exp: nowSec() + 3600 })];
    const { client } = await load();
    await Promise.all(Array.from({ length: 10 }, () => client.getQldtAuth()));
    await client.getQldtAuth();
    expect(chromeFake.tabReads).toBe(1);
  });
});

describe('qldtGet', () => {
  it('trả phần data; 401 → QldtAuthError và xoá token đã lưu', async () => {
    await chromeFake.local.set({ qldtAuthToken: 'Bearer x' });
    chromeFake.api = (path) => (path === '/ok' ? { data: [1, 2] } : path === '/expired' ? { status: 401, data: null } : undefined);
    const { client } = await load();
    expect(await client.qldtGet('/ok', 'Bearer x')).toEqual([1, 2]);
    await expect(client.qldtGet('/expired', 'Bearer x')).rejects.toBeInstanceOf(client.QldtAuthError);
    expect(chromeFake.local.dump().qldtAuthToken).toBeUndefined();
    await expect(client.qldtGet('/missing', 'Bearer x')).rejects.toThrow(/HTTP 404/);
  });
});

describe('danh mục lớp / môn / buổi', () => {
  const data: Record<string, unknown> = {
    '/systems/me': [{ id: 8 }, { id: 21 }],
    '/classes/system/0': [],
    '/classes/system/8': [{ id: 1, name: 'K24-A', studentCount: 30, courses: [{ id: 5, name: 'Môn gán' }] }],
    '/classes/system/21': [{ id: 1, name: 'K24-A', studentCount: 30 }, { id: 141, name: 'K25-B', studentCount: 43 }],
    '/classes/1': { specializes: { semesters: [{ name: 'Kỳ I', courses: [{ id: 5, name: 'Môn gán' }, { id: 6, name: 'Môn kỳ' }] }] } },
    '/sessions/course/5': [{ id: 3, name: 'Buổi 2', position: 2 }, { id: 2, name: 'Buổi 1', position: 1 }]
  };
  beforeEach(() => { chromeFake.api = (path) => (path in data ? { data: data[path] } : undefined); });

  it('gộp lớp theo từng hệ, bỏ trùng; lỗi /systems/me không làm hỏng danh sách', async () => {
    const { catalog } = await load();
    const auth = bearer({ id: 7 });
    expect(await catalog.listQldtClasses(auth)).toEqual([
      { value: '1', label: 'K24-A (30 SV)' }, { value: '141', label: 'K25-B (43 SV)' }
    ]);
    expect(await catalog.listQldtCourses(auth, '1')).toEqual([
      { value: '5', label: 'Môn gán' }, { value: '6', label: 'Môn kỳ — Kỳ I' }
    ]);
    expect((await catalog.fetchCourseSessions(auth, '5')).map(s => s.name)).toEqual(['Buổi 1', 'Buổi 2']);
  });

  it('cache theo tài khoản: gọi lại không gửi request, force thì gửi, tài khoản khác thì gửi', async () => {
    const { catalog } = await load();
    const a = bearer({ id: 7 });
    await Promise.all([catalog.listQldtClasses(a), catalog.listQldtClasses(a)]);
    expect(chromeFake.calls).toHaveLength(4);
    chromeFake.calls = [];
    await catalog.listQldtClasses(a);
    expect(chromeFake.calls).toHaveLength(0);
    await catalog.listQldtClasses(a, true);
    expect(chromeFake.calls).toHaveLength(4);
    chromeFake.calls = [];
    await catalog.listQldtClasses(bearer({ id: 8 }));
    expect(chromeFake.calls).toHaveLength(4);
  });

  it('lỗi /systems/me (không phải lỗi đăng nhập) → vẫn dùng /classes/system/0', async () => {
    chromeFake.api = (path) => (path === '/classes/system/0' ? { data: [{ id: 9, name: 'Cũ' }] } : path === '/systems/me' ? { status: 500, data: null } : undefined);
    const { catalog } = await load();
    expect(await catalog.listQldtClasses(bearer({ id: 1 }))).toEqual([{ value: '9', label: 'Cũ' }]);
  });
});

describe('careService', () => {
  it('tự lấy hết các trang; PATCH trả trường QLĐT đã lưu', async () => {
    chromeFake.api = (path, init) => {
      if (init.method === 'PATCH') return { data: { ...JSON.parse(init.body!), id: 5, statusChangedAt: 't', updatedAt: 'u' } };
      const page = Number(new URLSearchParams(path.split('?')[1]).get('page'));
      return { body: JSON.stringify({ data: [{ id: page, status: 'Đang xử lý', attendanceDetail: {} }], meta: { total: 2, totalPages: 2, totalNoPermitAbsent: 4, totalResolved: 1 } }) };
    };
    const { care } = await load();
    const { items, meta } = await care.fetchCareCases('Bearer x', { classId: '1', startDate: '2026-10-01', endDate: '2026-10-16' });
    expect(items.map(i => i.id)).toEqual([1, 2]);
    expect(meta).toEqual({ total: 2, totalPages: 2, totalNoPermitAbsent: 4, totalResolved: 1 });
    expect(chromeFake.calls[0]).toContain('classId=1');
    const patch = { reason: 'r', result: 'k', status: 'Quay lại học', category: 'Khác', careMethod: 'Nhắn tin' };
    expect(await care.updateCareCase('Bearer x', 5, patch)).toEqual({ ...patch, statusChangedAt: 't', updatedAt: 'u' });
  });
});
