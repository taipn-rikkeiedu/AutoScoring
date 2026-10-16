import { qldtGet } from './qldtApiClient';

/**
 * Cache cho dữ liệu danh mục ít đổi của QLĐT (hệ đào tạo, danh sách lớp, môn của lớp, buổi của môn) — tránh gọi lại
 * mỗi lần chuyển tab / mở lại popup. Không dùng cho dữ liệu thay đổi liên tục (bài nộp, tiến độ, điểm, điểm danh, chăm sóc).
 * - Bộ nhớ + chrome.storage.session: còn khi mở lại popup, tự xoá khi tắt trình duyệt.
 * - Tách theo tài khoản (id trong token) để đổi tài khoản không thấy lớp của người khác.
 * - Request cùng đường dẫn đang chạy thì dùng chung, không gửi trùng.
 */

export const CATALOG_TTL_MS = 10 * 60 * 1000;
const PREFIX = 'qldtCache:';

interface Entry { at: number; data: unknown }
const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Định danh tài khoản từ JWT (id / sub / email); token không phải JWT → vài ký tự cuối. */
function accountOf(auth: string): string {
  const part = auth.replace(/^Bearer\s+/i, '').split('.')[1];
  try {
    const b64 = (part || '').replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    const id = p.id ?? p.sub ?? p.userId ?? p.email;
    if (id != null) return String(id);
  } catch { /* không phải JWT */ }
  return auth.slice(-16);
}

const session = (): chrome.storage.StorageArea | undefined => (chrome.storage as any).session;

async function readEntry(key: string): Promise<Entry | undefined> {
  const m = memory.get(key);
  if (m) return m;
  try {
    const e = (await session()?.get(key))?.[key] as Entry | undefined;
    if (e) memory.set(key, e);
    return e;
  } catch {
    return undefined;
  }
}

/** GET có cache theo TTL; `force` bỏ qua cache (nút Thử lại / Tải lại) và ghi đè kết quả mới. */
export async function cachedQldtGet<T = any>(path: string, auth: string, opts: { ttlMs?: number; force?: boolean } = {}): Promise<T> {
  const key = `${PREFIX}${accountOf(auth)}:${path}`;
  const ttl = opts.ttlMs ?? CATALOG_TTL_MS;
  if (!opts.force) {
    const e = await readEntry(key);
    if (e && Date.now() - e.at < ttl) return e.data as T;
    const running = inflight.get(key);
    if (running) return running as Promise<T>;
  }
  const p = qldtGet<T>(path, auth).then(async (data) => {
    const entry = { at: Date.now(), data };
    memory.set(key, entry);
    try { await session()?.set({ [key]: entry }); } catch { /* quá dung lượng → chỉ giữ trong bộ nhớ */ }
    return data;
  }).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Xoá toàn bộ cache (vd khi phiên đăng nhập hết hạn). */
export async function clearQldtCache(): Promise<void> {
  memory.clear();
  try {
    const all = (await session()?.get(null)) || {};
    const keys = Object.keys(all).filter(k => k.startsWith(PREFIX));
    if (keys.length) await session()?.remove(keys);
  } catch { /* bỏ qua */ }
}
