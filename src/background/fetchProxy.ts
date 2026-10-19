import { BACKGROUND_FETCH_PROXY, UI_MESSAGES } from '~/src/core/constants';
import type { ProxyRequestMessage, ProxyResponse } from '~/src/infra/proxyProtocol';

/**
 * Proxy fetch của background: chỉ cho host trong allowlist, GET / HEAD, và đúng các request ghi được liệt kê
 * (vd PATCH ca chăm sóc, body JSON nhỏ); chỉ chuyển tiếp header cho phép.
 */

const allowedHosts = new Set<string>(BACKGROUND_FETCH_PROXY.allowedHosts);

/** Kiểm tra + chuẩn hoá request; ném lỗi nếu không được phép. */
export function toSafeFetchRequest(message: Pick<ProxyRequestMessage, 'url' | 'options'>): { url: string; init: RequestInit } {
  const url = new URL(String(message.url || ''));
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) {
    throw new Error(UI_MESSAGES.background.disallowedUrl);
  }

  const raw = message.options || {};
  const method = String(raw.method || 'GET').toUpperCase();
  const isWrite = !(BACKGROUND_FETCH_PROXY.allowedMethods as readonly string[]).includes(method);
  if (isWrite) {
    const allowed = BACKGROUND_FETCH_PROXY.allowedWrites.some(w =>
      w.method === method && w.host === url.hostname && w.path.test(url.pathname));
    const body = raw.body;
    if (!allowed || typeof body !== 'string' || body.length > BACKGROUND_FETCH_PROXY.maxWriteBodyBytes) {
      throw new Error(UI_MESSAGES.background.disallowedMethod);
    }
    try { JSON.parse(body); } catch { throw new Error(UI_MESSAGES.background.disallowedMethod); }
  }

  const allowedHeaders = new Set<string>([...BACKGROUND_FETCH_PROXY.allowedHeaders, ...(isWrite ? ['content-type'] : [])]);
  const headers: Record<string, string> = {};
  Object.entries(raw.headers || {}).forEach(([key, value]) => {
    if (allowedHeaders.has(key.toLowerCase()) && typeof value === 'string') headers[key] = value;
  });

  return { url: url.toString(), init: isWrite ? { method, headers, body: raw.body } : { method, headers } };
}

const isBinaryResponse = (url: string, contentType: string) =>
  contentType.includes('application/zip') || contentType.includes('octet-stream') || url.includes('/zipball/') || url.includes('/zip/');

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/** Handler message `FETCH`: chỉ nhận từ chính extension. Lỗi → `{ success: false, error }`, không ném. */
export async function handleFetchMessage(message: ProxyRequestMessage, sender: chrome.runtime.MessageSender): Promise<ProxyResponse> {
  let request: { url: string; init: RequestInit };
  try {
    if (sender.id !== chrome.runtime.id) throw new Error(UI_MESSAGES.background.invalidSender);
    request = toSafeFetchRequest(message);
  } catch (e: any) {
    return { success: false, error: e.message };
  }
  try {
    const res = await fetch(request.url, request.init);
    const base = { success: true as const, ok: res.ok, status: res.status, statusText: res.statusText };
    return isBinaryResponse(request.url, res.headers.get('content-type') || '')
      ? { ...base, isBinary: true, base64: arrayBufferToBase64(await res.arrayBuffer()) }
      : { ...base, isBinary: false, text: await res.text() };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
