import { withTimeout } from '~/src/core/async';
import { isExpired, jwtExp, toAuthHeader } from '~/src/core/jwt';
import type { KeyValueStore } from '~/src/infra/storage';
import { QLDT_MESSAGES, QldtAuthError } from './errors';

/**
 * Lấy token đăng nhập QLĐT. Mỗi nguồn token là 1 `TokenSource`; `QldtAuthProvider` gộp các nguồn,
 * chọn token còn hạn lâu nhất, lưu lại và nhớ tạm để không phải đọc tab ở mỗi request.
 *
 * Token đã lưu còn được cập nhật bởi content script (qldt-api-relay) từ header Authorization của chính request
 * trang QLĐT gửi thành công → dùng được kể cả khi tab QLĐT đã đóng / đang ngủ.
 */

/** Một nguồn token; trả các giá trị header "Bearer …" (có thể rỗng). */
export interface TokenSource {
  read(): Promise<string[]>;
}

/**
 * Token trong localStorage của các tab QLĐT đang mở: khoá "token" và các khoá có tên chứa token / auth mang JWT
 * (phòng khi QLĐT đổi tên khoá). Bỏ refresh token, tab đang ngủ; tab đóng băng (Edge Sleeping tabs) bỏ qua sau hạn chờ.
 */
export class TabTokenSource implements TokenSource {
  constructor(
    private readonly urlPattern = 'https://qldt.rikkei.edu.vn/*',
    private readonly scriptTimeoutMs = 2500
  ) {}

  async read(): Promise<string[]> {
    const tabs = await chrome.tabs.query({ url: this.urlPattern });
    const out: string[] = [];
    for (const tab of tabs) {
      if (!tab.id || tab.discarded || (tab.status as string) === 'unloaded') continue;
      try {
        const [res] = await withTimeout(chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const found: string[] = [];
            const main = localStorage.getItem('token');
            if (main) found.push(main);
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i) || '';
              if (k === 'token' || !/token|auth|jwt/i.test(k) || /refresh/i.test(k)) continue;
              const m = (localStorage.getItem(k) || '').match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
              if (m) found.push(m[0]);
            }
            return found;
          }
        }), this.scriptTimeoutMs, 'Tab QLĐT không phản hồi (đang ngủ)');
        if (Array.isArray(res?.result)) out.push(...(res.result as string[]).map(toAuthHeader));
      } catch { /* tab chưa tải xong / đang ngủ / bị chặn → thử tab khác, cuối cùng dùng token đã lưu */ }
    }
    return out;
  }
}

/** Token đã lưu trong storage của extension. */
export class StoredTokenSource implements TokenSource {
  constructor(private readonly store: KeyValueStore, private readonly key: string) {}

  async read(): Promise<string[]> {
    const v = await this.current();
    return v ? [v] : [];
  }

  current(): Promise<string | undefined> {
    return this.store.get<string>(this.key);
  }

  save(auth: string): Promise<void> {
    return this.store.set({ [this.key]: auth });
  }

  clear(): Promise<void> {
    return this.store.remove(this.key);
  }
}

export class QldtAuthProvider {
  private memo: { auth: string; at: number } | null = null;
  private inflight: Promise<string> | null = null;

  constructor(
    private readonly live: TokenSource,
    private readonly stored: StoredTokenSource,
    /** Dùng lại token vừa chọn trong chừng này (Giám sát gọi API theo từng sinh viên). */
    private readonly memoMs = 60_000
  ) {}

  /** Header Authorization đang dùng được; ném `QldtAuthError` nếu chưa đăng nhập / mọi token đã hết hạn. */
  getAuth(): Promise<string> {
    if (this.memo && Date.now() - this.memo.at < this.memoMs && !isExpired(this.memo.auth)) return Promise.resolve(this.memo.auth);
    // Nhiều request song song → chỉ đọc nguồn token 1 lần
    if (!this.inflight) {
      this.inflight = this.resolve()
        .then((auth) => { this.memo = { auth, at: Date.now() }; return auth; })
        .finally(() => { this.inflight = null; });
    }
    return this.inflight;
  }

  /** API báo hết phiên (401): bỏ token đang dùng để lần sau báo đăng nhập lại thay vì dùng tiếp token hỏng. */
  invalidate(): void {
    this.memo = null;
    this.stored.clear();
  }

  private async resolve(): Promise<string> {
    const saved = await this.stored.current();
    const candidates = [...new Set([...(await this.live.read()), ...(saved ? [saved] : [])])];
    // Token còn hạn lâu nhất trước; token không rõ hạn (không phải JWT) xếp sau, giữ thứ tự nguồn
    const valid = candidates.filter(a => !isExpired(a)).sort((a, b) => (jwtExp(b) ?? 0) - (jwtExp(a) ?? 0));
    if (valid.length) {
      if (valid[0] !== saved) await this.stored.save(valid[0]);
      return valid[0];
    }
    if (candidates.length) {
      await this.stored.clear();
      throw new QldtAuthError(QLDT_MESSAGES.allExpired);
    }
    throw new QldtAuthError(QLDT_MESSAGES.noSession);
  }
}
