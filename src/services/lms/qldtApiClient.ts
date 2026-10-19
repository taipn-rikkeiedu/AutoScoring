import { API_BASE_URLS } from '~/src/services/api';
import { STORAGE_KEYS } from '~/src/core/constants';
import { withTimeout } from '~/src/core/async';
import { backgroundProxy } from '~/src/infra/backgroundProxy';
import { localStore } from '~/src/infra/storage';
import { isExpired, jwtExp, toAuthHeader } from '~/src/core/jwt';

export { jwtExp, toAuthHeader };

/**
 * Client gọi API Quản lý đào tạo (apiportal.rikkei.edu.vn) bằng token đăng nhập QLĐT.
 * Token có 2 nguồn: (1) header Authorization của chính request trang QLĐT gửi thành công (qldt-api-hook bắt, relay lưu
 * vào storage — luôn là token đang dùng được); (2) localStorage của tab QLĐT đang mở. Chọn token còn hạn mới nhất.
 * Request đi qua proxy FETCH ở background (BackgroundProxy) để tránh CORS.
 */

const QLDT_TAB_PATTERN = 'https://qldt.rikkei.edu.vn/*';
/** Tab bị trình duyệt cho "ngủ" (Edge Sleeping tabs) bị đóng băng: chạy script vào đó có thể treo mãi → bỏ qua sau chừng này. */
const TAB_SCRIPT_TIMEOUT_MS = 2500;
export class QldtAuthError extends Error {}

/**
 * Token trong localStorage của các tab QLĐT đang mở: khoá "token" và các khoá có tên chứa token / auth mang JWT
 * (phòng khi QLĐT đổi tên khoá). Bỏ refresh token và tab đang ngủ (Memory Saver) — không chạy script được.
 */
async function readTokensFromQldtTabs(): Promise<string[]> {
  const tabs = await chrome.tabs.query({ url: QLDT_TAB_PATTERN });
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
      }), TAB_SCRIPT_TIMEOUT_MS, 'Tab QLĐT không phản hồi (đang ngủ)');
      if (Array.isArray(res?.result)) out.push(...(res.result as string[]));
    } catch { /* tab chưa tải xong / đang ngủ / bị chặn → thử tab khác, cuối cùng dùng token đã lưu */ }
  }
  return out;
}

/** Token vừa chọn: dùng lại trong chừng này để không phải đọc tab QLĐT ở mỗi request (Giám sát gọi theo từng SV). */
const AUTH_MEMO_MS = 60_000;
let authMemo: { auth: string; at: number } | null = null;
let authInflight: Promise<string> | null = null;

/** Bỏ token đang dùng (API trả 401): xoá cả bản lưu lẫn bản nhớ tạm. */
function dropAuth() {
  authMemo = null;
  localStore.remove(STORAGE_KEYS.qldtAuthToken);
}

export async function getQldtAuth(): Promise<string> {
  if (authMemo && Date.now() - authMemo.at < AUTH_MEMO_MS && !isExpired(authMemo.auth)) return authMemo.auth;
  // Nhiều request song song → chỉ đọc tab 1 lần
  if (!authInflight) {
    authInflight = resolveQldtAuth()
      .then((auth) => { authMemo = { auth, at: Date.now() }; return auth; })
      .finally(() => { authInflight = null; });
  }
  return authInflight;
}

async function resolveQldtAuth(): Promise<string> {
  const cached = await localStore.get<string>(STORAGE_KEYS.qldtAuthToken);
  const candidates = [...new Set([...(await readTokensFromQldtTabs()).map(toAuthHeader), ...(cached ? [cached] : [])])];
  // Token còn hạn lâu nhất trước; token không rõ hạn (không phải JWT) xếp sau, giữ thứ tự tab → đã lưu
  const valid = candidates.filter(a => !isExpired(a)).sort((a, b) => (jwtExp(b) ?? 0) - (jwtExp(a) ?? 0));
  if (valid.length) {
    if (valid[0] !== cached) await localStore.set({ [STORAGE_KEYS.qldtAuthToken]: valid[0] });
    return valid[0];
  }
  if (candidates.length) {
    await localStore.remove(STORAGE_KEYS.qldtAuthToken);
    throw new QldtAuthError('Phiên đăng nhập QLĐT đã hết hạn. Hãy mở qldt.rikkei.edu.vn, đăng nhập lại (hoặc tải lại trang) rồi bấm Thử lại.');
  }
  throw new QldtAuthError('Chưa có phiên đăng nhập QLĐT. Hãy mở qldt.rikkei.edu.vn và đăng nhập một lần, sau đó dùng được ở mọi trang.');
}

const SESSION_EXPIRED = 'Phiên đăng nhập QLĐT đã hết hạn. Hãy mở qldt.rikkei.edu.vn, đăng nhập lại rồi thử lại.';
const jsonHeaders = (auth: string) => ({ Authorization: auth, Accept: 'application/json' });

/** Gửi qua proxy; 401 → bỏ token đang dùng và ném QldtAuthError. */
async function send(path: string, auth: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  const url = new URL(path, API_BASE_URLS.lmsPortal).href;
  const res = await backgroundProxy.fetch(url, { ...init, headers: { ...jsonHeaders(auth), ...init.headers } });
  if (res.status === 401) {
    // Token hết hạn → xoá để lần sau báo đăng nhập lại thay vì dùng tiếp token hỏng
    dropAuth();
    throw new QldtAuthError(SESSION_EXPIRED);
  }
  return { url, res, text: res.isBinary ? '' : res.text };
}

/** Diễn giải response JSON chuẩn của QLĐT ({ data, statusCode, message }): lỗi → ném, thành công → trả `data`. */
function unwrap<T>(label: string, res: { ok: boolean; status: number }, text: string, forbidden: string): T {
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* body không phải JSON */ }
  if (res.status === 403) throw new QldtAuthError(forbidden);
  if (!res.ok || (json && typeof json.statusCode === 'number' && json.statusCode >= 400)) {
    const m = json && (json.message || json.error?.message || json.error);
    throw new Error(`${label} → HTTP ${res.status}${m ? ': ' + (Array.isArray(m) ? m.join(', ') : m) : ''}`);
  }
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

export async function qldtGet<T = any>(path: string, auth: string): Promise<T> {
  const { res, text } = await send(path, auth);
  return unwrap<T>(`GET ${path}`, res, text, 'Tài khoản QLĐT đang đăng nhập không có quyền xem dữ liệu này.');
}

/** GET thô (không tách `data`, không ném lỗi theo statusCode) — dùng để thu thập nguyên response. */
export async function qldtGetRaw(path: string, auth: string): Promise<{ url: string; status: number; text: string }> {
  const { url, res, text } = await send(path, auth);
  return { url, status: res.status ?? 0, text };
}

/** Gửi request ghi (chỉ các endpoint background cho phép, vd PATCH /take-care-students/:id). Trả `data` của response. */
export async function qldtWrite<T = any>(method: 'PATCH', path: string, auth: string, body: unknown): Promise<T> {
  const { res, text } = await send(path, auth, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return unwrap<T>(`${method} ${path}`, res, text, 'Tài khoản QLĐT đang đăng nhập không có quyền sửa dữ liệu này.');
}
