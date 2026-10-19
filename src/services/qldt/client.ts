import { API_BASE_URLS } from '~/src/services/api/endpoints';
import type { BackgroundProxy, ProxySuccess } from '~/src/infra/backgroundProxy';
import type { ProxyRequestInit } from '~/src/infra/proxyProtocol';
import type { QldtAuthProvider } from './auth';
import { QLDT_MESSAGES, QldtAuthError } from './errors';
import type { QldtRawResponse } from './types';

export interface QldtGetOptions {
  /** Bỏ qua cache (nếu client có cache). */
  force?: boolean;
}

/** Gọi API QLĐT (apiportal.rikkei.edu.vn); client tự gắn token đăng nhập. */
export interface QldtClient {
  /** GET, trả phần `data` của response chuẩn QLĐT; lỗi HTTP / statusCode → ném. */
  get<T = any>(path: string, opts?: QldtGetOptions): Promise<T>;
  /** GET thô (không tách `data`, không ném theo statusCode) — thu thập API, chẩn đoán. */
  getRaw(path: string): Promise<QldtRawResponse>;
  /** PATCH (chỉ endpoint background cho phép, vd /take-care-students/:id); trả `data`. */
  patch<T = any>(path: string, body: unknown): Promise<T>;
}

/** Diễn giải response JSON chuẩn của QLĐT ({ data, statusCode, message }): lỗi → ném, thành công → `data`. */
export function unwrapQldtResponse<T>(label: string, res: { ok: boolean; status: number }, text: string, forbidden: string): T {
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* body không phải JSON */ }
  if (res.status === 403) throw new QldtAuthError(forbidden);
  if (!res.ok || (json && typeof json.statusCode === 'number' && json.statusCode >= 400)) {
    const m = json && (json.message || json.error?.message || json.error);
    throw new Error(`${label} → HTTP ${res.status}${m ? ': ' + (Array.isArray(m) ? m.join(', ') : m) : ''}`);
  }
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

export class QldtHttpClient implements QldtClient {
  constructor(
    private readonly auth: QldtAuthProvider,
    private readonly proxy: BackgroundProxy,
    private readonly baseUrl: string = API_BASE_URLS.lmsPortal
  ) {}

  async get<T = any>(path: string): Promise<T> {
    const { res, text } = await this.send(path);
    return unwrapQldtResponse<T>(`GET ${path}`, res, text, QLDT_MESSAGES.forbiddenRead);
  }

  async getRaw(path: string): Promise<QldtRawResponse> {
    const { url, res, text } = await this.send(path);
    return { url, status: res.status ?? 0, text };
  }

  async patch<T = any>(path: string, body: unknown): Promise<T> {
    const { res, text } = await this.send(path, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return unwrapQldtResponse<T>(`PATCH ${path}`, res, text, QLDT_MESSAGES.forbiddenWrite);
  }

  /** Gửi qua proxy kèm token; 401 → bỏ token và ném `QldtAuthError`. */
  private async send(path: string, init: ProxyRequestInit = {}): Promise<{ url: string; res: ProxySuccess; text: string }> {
    const url = new URL(path, this.baseUrl).href;
    const authorization = await this.auth.getAuth();
    const res = await this.proxy.fetch(url, {
      ...init, headers: { Authorization: authorization, Accept: 'application/json', ...init.headers }
    });
    if (res.status === 401) {
      this.auth.invalidate();
      throw new QldtAuthError(QLDT_MESSAGES.expired);
    }
    return { url, res, text: res.isBinary ? '' : res.text };
  }
}
