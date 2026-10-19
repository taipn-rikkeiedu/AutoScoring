import { accountOf } from '~/src/core/jwt';
import type { KeyValueStore } from '~/src/infra/storage';
import type { QldtAuthProvider } from './auth';
import type { QldtClient, QldtGetOptions } from './client';
import type { QldtRawResponse } from './types';

interface Entry { at: number; data: unknown }

/**
 * Decorator thêm cache cho `get` của một `QldtClient` — chỉ cấp client này cho service đọc dữ liệu ít đổi
 * (danh mục: hệ đào tạo, lớp, môn, buổi). Dữ liệu thay đổi liên tục dùng client không cache.
 * - Bộ nhớ + store (chrome.storage.session): còn khi mở lại popup, tự xoá khi tắt trình duyệt.
 * - Tách theo tài khoản (id trong token) để đổi tài khoản không thấy dữ liệu của người khác.
 * - Request cùng đường dẫn đang chạy thì dùng chung, không gửi trùng; `force` bỏ qua cache và ghi đè.
 */
export class CachedQldtClient implements QldtClient {
  static readonly PREFIX = 'qldtCache:';
  private readonly memory = new Map<string, Entry>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly inner: QldtClient,
    private readonly auth: QldtAuthProvider,
    private readonly store: KeyValueStore,
    private readonly ttlMs = 10 * 60 * 1000
  ) {}

  async get<T = any>(path: string, opts: QldtGetOptions = {}): Promise<T> {
    const key = `${CachedQldtClient.PREFIX}${accountOf(await this.auth.getAuth())}:${path}`;
    if (!opts.force) {
      const e = await this.read(key);
      if (e && Date.now() - e.at < this.ttlMs) return e.data as T;
      const running = this.inflight.get(key);
      if (running) return running as Promise<T>;
    }
    const p = this.inner.get<T>(path).then(async (data) => {
      const entry = { at: Date.now(), data };
      this.memory.set(key, entry);
      try { await this.store.set({ [key]: entry }); } catch { /* quá dung lượng → chỉ giữ trong bộ nhớ */ }
      return data;
    }).finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  getRaw(path: string): Promise<QldtRawResponse> {
    return this.inner.getRaw(path);
  }

  patch<T = any>(path: string, body: unknown): Promise<T> {
    return this.inner.patch<T>(path, body);
  }

  private async read(key: string): Promise<Entry | undefined> {
    const m = this.memory.get(key);
    if (m) return m;
    try {
      const e = await this.store.get<Entry>(key);
      if (e) this.memory.set(key, e);
      return e;
    } catch {
      return undefined;
    }
  }
}
