import { describe, expect, it, vi } from 'vitest';
import { toSafeFetchRequest } from '~/src/background/fetchProxy';
import { MessageRouter } from '~/src/background/messageRouter';
import { BackgroundProxy, ProxyError, base64ToArrayBuffer } from '~/src/infra/backgroundProxy';
import { ChromeStore } from '~/src/infra/storage';
import { accountOf, isExpired, jwtExp, toAuthHeader } from '~/src/core/jwt';
import { withTimeout } from '~/src/core/async';
import { fakeJwt, installChrome, nowSec } from '../fakes/chrome';

describe('toSafeFetchRequest (allowlist của proxy)', () => {
  const api = 'https://apiportal.rikkei.edu.vn';

  it('GET tới host cho phép: chỉ giữ header cho phép', () => {
    const r = toSafeFetchRequest({ url: `${api}/classes/1`, options: { headers: { Authorization: 'Bearer x', Cookie: 'c=1', Accept: 'a' } } });
    expect(r).toEqual({ url: `${api}/classes/1`, init: { method: 'GET', headers: { Authorization: 'Bearer x', Accept: 'a' } } });
  });

  it.each([
    ['http (không phải https)', { url: 'http://apiportal.rikkei.edu.vn/x' }],
    ['host lạ', { url: 'https://evil.example.com/x' }],
    ['POST không nằm trong danh sách ghi', { url: `${api}/students`, options: { method: 'POST', body: '{}' } }],
    ['PATCH sai đường dẫn', { url: `${api}/students/1`, options: { method: 'PATCH', body: '{}' } }],
    ['PATCH body không phải JSON', { url: `${api}/take-care-students/5`, options: { method: 'PATCH', body: 'abc' } }],
    ['PATCH body quá lớn', { url: `${api}/take-care-students/5`, options: { method: 'PATCH', body: JSON.stringify({ a: 'x'.repeat(20_000) }) } }]
  ])('chặn: %s', (_, msg) => {
    expect(() => toSafeFetchRequest(msg as any)).toThrow();
  });

  it('PATCH ca chăm sóc được phép, giữ body + Content-Type', () => {
    const body = JSON.stringify({ status: 'Quay lại học' });
    const r = toSafeFetchRequest({ url: `${api}/take-care-students/5`, options: { method: 'patch', body, headers: { 'Content-Type': 'application/json' } } });
    expect(r.init).toEqual({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
  });
});

describe('MessageRouter', () => {
  const sender = {} as chrome.runtime.MessageSender;

  it('handler trả Promise → phản hồi bất đồng bộ; lỗi → { success: false }', async () => {
    const router = new MessageRouter()
      .register('OK', async () => ({ success: true }))
      .register('BOOM', async () => { throw new Error('hỏng'); })
      .register('FIRE', () => undefined);
    const replies: unknown[] = [];
    expect(router.dispatch({ type: 'OK' }, sender, r => replies.push(r))).toBe(true);
    expect(router.dispatch({ type: 'BOOM' }, sender, r => replies.push(r))).toBe(true);
    expect(router.dispatch({ type: 'FIRE' }, sender, r => replies.push(r))).toBe(false);
    expect(router.dispatch({ type: 'UNKNOWN' }, sender, r => replies.push(r))).toBe(false);
    await new Promise(r => setTimeout(r, 0));
    expect(replies).toEqual([{ success: true }, { success: false, error: 'hỏng' }]);
  });
});

describe('BackgroundProxy', () => {
  it('trả response thành công; lỗi vận chuyển → ProxyError; quá hạn → lỗi', async () => {
    const fake = installChrome();
    fake.api = (path) => (path === '/ok' ? { data: 1 } : undefined);
    const proxy = new BackgroundProxy(1000);
    const ok = await proxy.fetch('https://apiportal.rikkei.edu.vn/ok');
    expect(ok).toMatchObject({ success: true, status: 200, isBinary: false });

    (globalThis as any).chrome.runtime.sendMessage = (_m: unknown, cb: (r: unknown) => void) => cb({ success: false, error: 'chặn' });
    await expect(proxy.fetch('https://x/y')).rejects.toBeInstanceOf(ProxyError);

    vi.useFakeTimers();
    (globalThis as any).chrome.runtime.sendMessage = () => {};
    const p = proxy.fetch('https://x/slow', {}, 500);
    const assertion = expect(p).rejects.toThrow(/Không phản hồi sau/);
    await vi.advanceTimersByTimeAsync(600);
    await assertion;
    vi.useRealTimers();
  });

  it('base64ToArrayBuffer', () => {
    expect([...new Uint8Array(base64ToArrayBuffer(btoa('AB')))]).toEqual([65, 66]);
  });
});

describe('ChromeStore', () => {
  it('get / getMany / set / remove / keysWithPrefix', async () => {
    installChrome();
    const store = new ChromeStore('session');
    await store.set({ 'p:a': 1, 'p:b': 2, q: 3 });
    expect(await store.get('p:a')).toBe(1);
    expect(await store.getMany(['p:b', 'q', 'none'])).toEqual({ 'p:b': 2, q: 3 });
    expect((await store.keysWithPrefix('p:')).sort()).toEqual(['p:a', 'p:b']);
    await store.remove(['p:a']);
    expect(await store.get('p:a')).toBeUndefined();
  });

  it('vùng lưu không tồn tại → không lỗi', async () => {
    (globalThis as any).chrome = { storage: {} };
    const store = new ChromeStore('session');
    await store.set({ a: 1 });
    expect(await store.get('a')).toBeUndefined();
  });
});

describe('jwt + async', () => {
  it('toAuthHeader / jwtExp / isExpired / accountOf', () => {
    const t = fakeJwt({ id: 42, exp: nowSec() + 3600 });
    expect(toAuthHeader(JSON.stringify(t))).toBe(`Bearer ${t}`);
    expect(toAuthHeader(`Bearer ${t}`)).toBe(`Bearer ${t}`);
    expect(jwtExp(`Bearer ${t}`)).toBeGreaterThan(nowSec());
    expect(isExpired(`Bearer ${fakeJwt({ exp: nowSec() - 1 })}`)).toBe(true);
    expect(isExpired('Bearer không-phải-jwt')).toBe(false);
    expect(accountOf(`Bearer ${t}`)).toBe('42');
    expect(accountOf('Bearer abcdefghijklmnopqrstuvwxyz')).toBe('klmnopqrstuvwxyz');
  });

  it('withTimeout: ms <= 0 không giới hạn', async () => {
    await expect(withTimeout(Promise.resolve(1), 0, 'x')).resolves.toBe(1);
  });
});
