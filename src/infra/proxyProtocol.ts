/**
 * Giao thức proxy fetch giữa trang extension (popup, cửa sổ nổi) và background service worker.
 * Trang extension không tự gọi API khác nguồn được (CORS) → gửi `FETCH` cho background, background gọi thay.
 * Dùng chung cho cả hai phía để request / response luôn khớp kiểu.
 */

export const FETCH_MESSAGE = 'FETCH';

export interface ProxyRequestInit {
  method?: string;
  headers?: Record<string, string>;
  /** Chỉ cho request ghi nằm trong danh sách cho phép (BACKGROUND_FETCH_PROXY.allowedWrites). */
  body?: string;
}

export interface ProxyRequestMessage {
  type: typeof FETCH_MESSAGE;
  url: string;
  options?: ProxyRequestInit;
}

export type ProxyResponse =
  | { success: true; ok: boolean; status: number; statusText: string; isBinary: false; text: string }
  | { success: true; ok: boolean; status: number; statusText: string; isBinary: true; base64: string }
  | { success: false; error: string };
