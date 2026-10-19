import { withTimeout } from '~/src/core/async';
import { UI_MESSAGES } from '~/src/core/constants';
import { FETCH_MESSAGE, ProxyRequestInit, ProxyRequestMessage, ProxyResponse } from './proxyProtocol';

/** Response proxy thành công (đã loại trường hợp `success: false`). */
export type ProxySuccess = Extract<ProxyResponse, { success: true }>;

export class ProxyError extends Error {}

/**
 * Client gửi request qua background (nơi duy nhất gửi message `FETCH`).
 * Lỗi vận chuyển (không có background, bị chặn, quá hạn) → `ProxyError`; lỗi HTTP do nơi gọi tự diễn giải từ `status`.
 */
export class BackgroundProxy {
  constructor(private readonly defaultTimeoutMs = 45_000) {}

  fetch(url: string, init: ProxyRequestInit = {}, timeoutMs = this.defaultTimeoutMs): Promise<ProxySuccess> {
    const message: ProxyRequestMessage = { type: FETCH_MESSAGE, url, options: { method: 'GET', ...init } };
    const send = new Promise<ProxySuccess>((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: ProxyResponse | undefined) => {
        if (chrome.runtime.lastError) return reject(new ProxyError(chrome.runtime.lastError.message));
        if (!response) return reject(new ProxyError(UI_MESSAGES.github.noBackgroundResponse));
        if (!response.success) return reject(new ProxyError(response.error || UI_MESSAGES.github.noBackgroundResponse));
        resolve(response);
      });
    });
    const path = (() => { try { return new URL(url).pathname; } catch { return url; } })();
    return withTimeout(send, timeoutMs,
      `Không phản hồi sau ${Math.round(timeoutMs / 1000)}s (${path}). Kiểm tra mạng rồi thử lại; nếu vẫn treo, tắt / bật lại extension.`);
  }
}

export const backgroundProxy = new BackgroundProxy();

/** Base64 → ArrayBuffer (response nhị phân, vd zip GitHub). */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
