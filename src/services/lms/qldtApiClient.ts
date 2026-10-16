import { API_BASE_URLS } from '~/src/services/api';
import { STORAGE_KEYS } from '~/src/core/constants';

/**
 * Client gọi API Quản lý đào tạo (apiportal.rikkei.edu.vn) bằng token đăng nhập QLĐT.
 * Token có 2 nguồn: (1) header Authorization của chính request trang QLĐT gửi thành công (qldt-api-hook bắt, relay lưu
 * vào storage — luôn là token đang dùng được); (2) localStorage của tab QLĐT đang mở. Chọn token còn hạn mới nhất.
 * Request đi qua proxy FETCH ở background (chỉ cho phép GET) để tránh CORS.
 */

const QLDT_TAB_PATTERN = 'https://qldt.rikkei.edu.vn/*';

export class QldtAuthError extends Error {}

/** Chuẩn hoá token đọc từ localStorage: có thể là chuỗi JSON ("\"eyJ...\"") hoặc đã kèm "Bearer ". */
export function toAuthHeader(rawToken: string): string {
  let token = rawToken.trim();
  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === 'string') token = parsed;
  } catch { /* token thường, không phải JSON */ }
  return /^Bearer\s/i.test(token) ? token : `Bearer ${token}`;
}

/** Hạn (giây) ghi trong JWT; null nếu token không phải JWT. */
export function jwtExp(auth: string): number | null {
  const part = auth.replace(/^Bearer\s+/i, '').split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}
const isExpired = (auth: string) => { const exp = jwtExp(auth); return exp != null && exp * 1000 <= Date.now() + 30_000; };

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
      const [res] = await chrome.scripting.executeScript({
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
      });
      if (Array.isArray(res?.result)) out.push(...(res.result as string[]));
    } catch { /* tab chưa tải xong / bị chặn → thử tab khác */ }
  }
  return out;
}

export async function getQldtAuth(): Promise<string> {
  const cached = (await chrome.storage.local.get(STORAGE_KEYS.qldtAuthToken))[STORAGE_KEYS.qldtAuthToken] as string | undefined;
  const candidates = [...new Set([...(await readTokensFromQldtTabs()).map(toAuthHeader), ...(cached ? [cached] : [])])];
  // Token còn hạn lâu nhất trước; token không rõ hạn (không phải JWT) xếp sau, giữ thứ tự tab → đã lưu
  const valid = candidates.filter(a => !isExpired(a)).sort((a, b) => (jwtExp(b) ?? 0) - (jwtExp(a) ?? 0));
  if (valid.length) {
    if (valid[0] !== cached) await chrome.storage.local.set({ [STORAGE_KEYS.qldtAuthToken]: valid[0] });
    return valid[0];
  }
  if (candidates.length) {
    await chrome.storage.local.remove(STORAGE_KEYS.qldtAuthToken);
    throw new QldtAuthError('Phiên đăng nhập QLĐT đã hết hạn. Hãy mở qldt.rikkei.edu.vn, đăng nhập lại (hoặc tải lại trang) rồi bấm Thử lại.');
  }
  throw new QldtAuthError('Chưa có phiên đăng nhập QLĐT. Hãy mở qldt.rikkei.edu.vn và đăng nhập một lần, sau đó dùng được ở mọi trang.');
}

export function qldtGet<T = any>(path: string, auth: string): Promise<T> {
  const url = new URL(path, API_BASE_URLS.lmsPortal).href;
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'FETCH', url, options: { method: 'GET', headers: { Authorization: auth, Accept: 'application/json' } } },
      (response) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!response || !response.success) return reject(new Error(response?.error || 'Không phản hồi từ background proxy'));

        let json: any = null;
        try { json = response.text ? JSON.parse(response.text) : null; } catch { /* body không phải JSON */ }

        if (response.status === 401) {
          // Token đã lưu hết hạn → xoá để lần sau báo đăng nhập lại thay vì dùng tiếp token hỏng
          chrome.storage.local.remove(STORAGE_KEYS.qldtAuthToken);
          return reject(new QldtAuthError('Phiên đăng nhập QLĐT đã hết hạn. Hãy mở qldt.rikkei.edu.vn, đăng nhập lại rồi thử lại.'));
        }
        if (response.status === 403) {
          return reject(new QldtAuthError('Tài khoản QLĐT đang đăng nhập không có quyền xem dữ liệu này.'));
        }
        if (!response.ok || (json && typeof json.statusCode === 'number' && json.statusCode >= 400)) {
          const m = json && (json.message || json.error?.message || json.error);
          return reject(new Error(`GET ${path} → HTTP ${response.status}${m ? ': ' + (Array.isArray(m) ? m.join(', ') : m) : ''}`));
        }
        resolve(json && typeof json === 'object' && 'data' in json ? json.data : json);
      }
    );
  });
}

/** GET thô (không tách `data`, không ném lỗi theo statusCode) — dùng để thu thập nguyên response. */
export function qldtGetRaw(path: string, auth: string): Promise<{ url: string; status: number; text: string }> {
  const url = new URL(path, API_BASE_URLS.lmsPortal).href;
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'FETCH', url, options: { method: 'GET', headers: { Authorization: auth, Accept: 'application/json' } } },
      (response) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!response || !response.success) return reject(new Error(response?.error || 'Không phản hồi từ background proxy'));
        if (response.status === 401) {
          chrome.storage.local.remove(STORAGE_KEYS.qldtAuthToken);
          return reject(new QldtAuthError('Phiên đăng nhập QLĐT đã hết hạn. Hãy mở qldt.rikkei.edu.vn, đăng nhập lại rồi thử lại.'));
        }
        resolve({ url, status: response.status ?? 0, text: response.text ?? '' });
      }
    );
  });
}

/** Gửi request ghi (chỉ các endpoint background cho phép, vd PATCH /take-care-students/:id). Trả `data` của response. */
export function qldtWrite<T = any>(method: 'PATCH', path: string, auth: string, body: unknown): Promise<T> {
  const url = new URL(path, API_BASE_URLS.lmsPortal).href;
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'FETCH', url,
        options: { method, headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      },
      (response) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!response || !response.success) return reject(new Error(response?.error || 'Không phản hồi từ background proxy'));
        let json: any = null;
        try { json = response.text ? JSON.parse(response.text) : null; } catch { /* body không phải JSON */ }
        if (response.status === 401) {
          chrome.storage.local.remove(STORAGE_KEYS.qldtAuthToken);
          return reject(new QldtAuthError('Phiên đăng nhập QLĐT đã hết hạn. Hãy mở qldt.rikkei.edu.vn, đăng nhập lại rồi thử lại.'));
        }
        if (response.status === 403) return reject(new QldtAuthError('Tài khoản QLĐT đang đăng nhập không có quyền sửa dữ liệu này.'));
        if (!response.ok || (json && typeof json.statusCode === 'number' && json.statusCode >= 400)) {
          const m = json && (json.message || json.error?.message || json.error);
          return reject(new Error(`${method} ${path} → HTTP ${response.status}${m ? ': ' + (Array.isArray(m) ? m.join(', ') : m) : ''}`));
        }
        resolve(json && typeof json === 'object' && 'data' in json ? json.data : json);
      }
    );
  });
}
