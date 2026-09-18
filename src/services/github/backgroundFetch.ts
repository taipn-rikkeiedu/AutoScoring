import { UI_MESSAGES } from '~/src/core/constants';

interface BackgroundFetchResponse {
  success: boolean;
  ok?: boolean;
  status?: number;
  statusText?: string;
  base64?: string;
  text?: string;
  isBinary?: boolean;
  error?: string;
}

/**
 * Gọi fetch qua background service worker (chrome.runtime.sendMessage), vì popup/content
 * script không đủ quyền CORS để gọi trực tiếp api.github.com/codeload.github.com với header
 * Authorization tùy ý. Background chỉ cho phép GET/HEAD tới host trong allowlist
 * (xem BACKGROUND_FETCH_PROXY trong core/constants.ts).
 */
async function proxyFetch(url: string, headers: Record<string, string> = {}): Promise<BackgroundFetchResponse> {
  const response: BackgroundFetchResponse = await chrome.runtime.sendMessage({
    type: "FETCH",
    url,
    options: { method: "GET", headers }
  });
  if (!response) throw new Error(UI_MESSAGES.github.noBackgroundResponse);
  return response;
}

export async function proxyFetchJson(url: string, headers: Record<string, string> = {}): Promise<any | null> {
  const response = await proxyFetch(url, headers);
  if (!response.success || !response.ok || response.isBinary || !response.text) return null;
  try {
    return JSON.parse(response.text);
  } catch {
    return null;
  }
}

export async function proxyFetchBinary(url: string, headers: Record<string, string> = {}): Promise<ArrayBuffer> {
  const response = await proxyFetch(url, headers);
  if (!response.success) throw new Error(response.error || UI_MESSAGES.github.noBackgroundResponse);
  if (!response.ok) throw new Error(response.error || `HTTP ${response.status}`);
  if (!response.isBinary || !response.base64) throw new Error(UI_MESSAGES.github.emptyBinary);

  const binaryStr = atob(response.base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}
