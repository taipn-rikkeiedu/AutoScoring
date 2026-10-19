import { UI_MESSAGES } from '~/src/core/constants';
import { backgroundProxy, base64ToArrayBuffer, ProxySuccess } from '~/src/infra/backgroundProxy';

/**
 * Gọi api.github.com / codeload.github.com / Google Docs qua background (BackgroundProxy), vì trang extension không gọi
 * thẳng được với header Authorization tuỳ ý (CORS). Background chỉ cho GET/HEAD tới host trong allowlist
 * (BACKGROUND_FETCH_PROXY trong core/constants.ts).
 * Không giới hạn thời gian: tải zip repo lớn có thể lâu.
 */
const NO_TIMEOUT = 0;

const proxyFetch = (url: string, headers: Record<string, string> = {}): Promise<ProxySuccess> =>
  backgroundProxy.fetch(url, { method: 'GET', headers }, NO_TIMEOUT);

export async function proxyFetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  let response: ProxySuccess;
  try {
    response = await proxyFetch(url, headers);
  } catch {
    return null;
  }
  if (!response.ok || response.isBinary || !response.text) return null;
  try {
    return JSON.parse(response.text);
  } catch {
    return null;
  }
}

export async function proxyFetchBinary(url: string, headers: Record<string, string> = {}): Promise<ArrayBuffer> {
  const response = await proxyFetch(url, headers);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.isBinary || !response.base64) throw new Error(UI_MESSAGES.github.emptyBinary);
  return base64ToArrayBuffer(response.base64);
}

export async function proxyFetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const response = await proxyFetch(url, headers);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.isBinary) throw new Error('Không lấy được dữ liệu văn bản');
  return response.text;
}
