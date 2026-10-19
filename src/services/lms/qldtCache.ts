import { qldtGet } from './qldtApiClient';
import { sessionStore } from '~/src/infra/storage';
import { accountOf } from '~/src/core/jwt';

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

async function readEntry(key: string): Promise<Entry | undefined> {
  const m = memory.get(key);
  if (m) return m;
  try {
    const e = await sessionStore.get<Entry>(key);
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
    try { await sessionStore.set({ [key]: entry }); } catch { /* quá dung lượng → chỉ giữ trong bộ nhớ */ }
    return data;
  }).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Xoá toàn bộ cache (vd khi phiên đăng nhập hết hạn). */
export async function clearQldtCache(): Promise<void> {
  memory.clear();
  try {
    const keys = await sessionStore.keysWithPrefix(PREFIX);
    if (keys.length) await sessionStore.remove(keys);
  } catch { /* bỏ qua */ }
}
