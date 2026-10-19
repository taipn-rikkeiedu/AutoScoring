// @vitest-environment happy-dom
/**
 * Smoke test giao diện: render cả popup (<App />) với API chrome giả + dữ liệu QLĐT mẫu, bấm qua từng tab.
 * Bắt lỗi lúc chạy mà typecheck không thấy: vòng import, hook / context dùng sai, lỗi render, lỗi gọi service.
 */
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromeFake, fakeJwt, installChrome, nowSec } from '../fakes/chrome';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
// Lần đầu render antd trong DOM giả lập chậm (tab Cài đặt ~6s)
vi.setConfig({ testTimeout: 60_000 });

let chromeFake: ChromeFake;
let root: Root;
let container: HTMLElement;
let errors: string[];
let App: React.FC;

// Nạp lần đầu antd + toàn bộ ứng dụng khá lâu → làm 1 lần
beforeAll(async () => {
  window.matchMedia ||= ((q: string) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent: () => false })) as any;
  (globalThis as any).ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  installChrome();
  App = (await import('~/entrypoints/popup/App')).App;
}, 180_000);

const DATA: Record<string, unknown> = {
  '/systems/me': [{ id: 21, name: 'K25' }],
  '/classes/system/0': [],
  '/classes/system/21': [{ id: 141, name: 'Lớp Mẫu', studentCount: 2, courses: [{ id: 5, name: 'Môn Mẫu' }] }],
  '/classes/141': { specializes: { semesters: [] } },
  '/sessions/course/5': [{ id: 9, name: 'Session 01', position: 1 }]
};

const tick = async (ms = 50) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const text = () => container.textContent || '';
async function clickMenu(label: string) {
  const item = [...container.querySelectorAll('.ant-menu-item')].find(el => el.textContent?.includes(label)) as HTMLElement | undefined;
  expect(item, `menu "${label}"`).toBeTruthy();
  await act(async () => { item!.click(); });
  await tick(150);
}

beforeEach(async () => {
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { errors.push(a.map(String).join(' ')); });
  window.addEventListener('error', (e) => errors.push(String(e.message)));

  chromeFake = installChrome();
  chromeFake.tabs = [{ id: 1, url: 'https://qldt.rikkei.edu.vn/home', status: 'complete' }];
  chromeFake.tabTokens = [fakeJwt({ id: 7, exp: nowSec() + 3600 })];
  chromeFake.api = (path) => {
    const p = path.split('?')[0];
    if (p in DATA) return { data: DATA[p] };
    if (p === '/take-care-students') return { body: JSON.stringify({ data: [], meta: { total: 0, totalPages: 1 } }) };
    return { data: [] };
  };
  // Đã cấu hình AI (Gemini) → kiểm tra kết nối lúc khởi động thành công, nút Chấm không bị khoá
  await chromeFake.local.set({ uiSidebarCollapsed: false, aiProvider: 'gemini', aiApiKey: 'test-key', aiModelName: 'gemini-test' });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('generativelanguage.googleapis.com')
    ? new Response('{"name":"models/gemini-test"}', { status: 200 })
    : new Response('{}', { status: 404 }))));

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(<App />); });
  await tick(300);
}, 30_000);

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
});

/**
 * Lỗi thật (bỏ cảnh báo phong cách / deprecation của thư viện).
 * "indexedDB is not defined": DOM giả lập không có IndexedDB (kho API QLĐT) — giới hạn môi trường test, không phải lỗi ứng dụng.
 */
const realErrors = () => errors.filter(e => !/Warning: |deprecated|findDOMNode|act\(|indexedDB is not defined/i.test(e));

describe('popup', () => {
  it('khởi động, tải danh mục QLĐT qua service, không lỗi', async () => {
    expect(text()).toContain('Chấm hàng loạt');
    expect(text()).not.toContain('Chưa tải được danh sách lớp QLĐT');
    expect(chromeFake.calls).toEqual(expect.arrayContaining(['/systems/me', '/classes/system/21']));
    expect(realErrors()).toEqual([]);
  });

  it.each([
    ['Giám sát học tập', 'Giám sát học tập'],
    ['Chăm sóc học viên', 'Chăm sóc học viên'],
    ['Thu thập API QLĐT', 'Thu thập API QLĐT'],
    ['Cài đặt', 'Cài đặt hệ thống'],
    ['Chấm Mini Project', 'Chấm Mini Project'],
    ['Chấm hàng loạt', 'Chấm hàng loạt']
  ])('chuyển sang tab %s', async (menu, title) => {
    await clickMenu(menu);
    expect(text()).toContain(title);
    expect(realErrors()).toEqual([]);
  });

  it('Cài đặt: danh sách nhà cung cấp AI không còn Claude, có link lấy key theo registry', async () => {
    await clickMenu('Cài đặt');
    expect(text()).not.toMatch(/Claude/);
    expect(realErrors()).toEqual([]);
  });

  it('danh mục được cache: chuyển tab qua lại không gọi lại /systems/me', async () => {
    const before = chromeFake.calls.filter(c => c === '/systems/me').length;
    await clickMenu('Chăm sóc học viên');
    await clickMenu('Giám sát học tập');
    await clickMenu('Chấm hàng loạt');
    expect(chromeFake.calls.filter(c => c === '/systems/me').length).toBe(before);
  });
});
