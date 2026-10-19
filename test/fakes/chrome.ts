/**
 * Giả lập tối thiểu API `chrome` cho test: storage (local / session), runtime.sendMessage (proxy FETCH), tabs, scripting.
 * Mỗi test gọi `installChrome()` (đã gọi sẵn trong setup) rồi tuỳ biến `api` / `tabs` / `tabTokens`.
 */

export interface FakeResponse { status?: number; data?: unknown; body?: string }
type ApiHandler = (path: string, init: { method: string; body?: string; headers: Record<string, string> }) => FakeResponse | undefined;

function createArea() {
  let store: Record<string, unknown> = {};
  return {
    dump: () => store,
    clear: () => { store = {}; },
    get: async (keys?: string | string[] | null) => {
      if (keys == null) return { ...store };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter(k => k in store).map(k => [k, store[k]]));
    },
    set: async (items: Record<string, unknown>) => { Object.assign(store, items); },
    remove: async (keys: string | string[]) => { (Array.isArray(keys) ? keys : [keys]).forEach(k => delete store[k]); }
  };
}

export interface ChromeFake {
  local: ReturnType<typeof createArea>;
  session: ReturnType<typeof createArea>;
  /** Trả response cho request qua proxy FETCH theo đường dẫn; undefined → HTTP 404. */
  api: ApiHandler;
  /** Danh sách request đã gửi (đường dẫn kèm query). */
  calls: string[];
  tabs: { id: number; url: string; status?: string; discarded?: boolean }[];
  /** Kết quả script đọc token trong tab; `'hang'` = tab đóng băng (không bao giờ trả về). */
  tabTokens: string[] | 'hang';
  tabReads: number;
}

export function installChrome(): ChromeFake {
  const fake: ChromeFake = {
    local: createArea(), session: createArea(), api: () => undefined, calls: [], tabs: [], tabTokens: [], tabReads: 0
  };
  const storageArea = (a: ReturnType<typeof createArea>) => ({
    get: (keys: any, cb?: (r: any) => void) => { const p = a.get(keys); if (cb) p.then(cb); return p; },
    set: (items: any, cb?: () => void) => { const p = a.set(items); if (cb) p.then(cb); return p; },
    remove: (keys: any, cb?: () => void) => { const p = a.remove(keys); if (cb) p.then(cb); return p; }
  });
  (globalThis as any).chrome = {
    storage: { local: storageArea(fake.local), session: storageArea(fake.session), onChanged: { addListener() {}, removeListener() {} } },
    runtime: {
      id: 'test', lastError: undefined,
      getManifest: () => ({ version: '0.0.0-test' }),
      sendMessage: (msg: any, cb?: (r: any) => void) => {
        const respond = (r: any) => (cb ? setTimeout(() => cb(r), 0) : undefined);
        if (msg?.type !== 'FETCH') { respond(undefined); return Promise.resolve(undefined); }
        const u = new URL(msg.url);
        const path = u.pathname + u.search;
        fake.calls.push(path);
        const opts = msg.options || {};
        const r = fake.api(path, { method: opts.method || 'GET', body: opts.body, headers: opts.headers || {} });
        const status = r?.status ?? (r ? 200 : 404);
        const text = r?.body ?? JSON.stringify(r ? { data: r.data, statusCode: status } : { message: 'Not Found', statusCode: 404 });
        const res = { success: true, ok: status < 400, status, text, isBinary: false };
        respond(res);
        return Promise.resolve(res);
      }
    },
    tabs: { query: async () => fake.tabs, create: async () => ({}), sendMessage: (_id: number, _m: unknown, cb?: (r: unknown) => void) => { cb?.(undefined); return Promise.resolve(undefined); } },
    windows: {
      getAll: (_opts: unknown, cb?: (w: unknown[]) => void) => {
        const wins = [{ focused: true, tabs: fake.tabs.map((t, i) => ({ ...t, active: i === 0 })) }];
        if (cb) cb(wins);
        return Promise.resolve(wins);
      }
    },
    scripting: {
      executeScript: () => {
        fake.tabReads++;
        if (fake.tabTokens === 'hang') return new Promise(() => {});
        return Promise.resolve([{ result: fake.tabTokens }]);
      }
    }
  };
  return fake;
}

/** JWT giả (không ký) với payload cho trước. */
export function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`;
}

export const nowSec = () => Math.floor(Date.now() / 1000);
