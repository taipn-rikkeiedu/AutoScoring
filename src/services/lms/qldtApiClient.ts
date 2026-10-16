import { API_BASE_URLS } from '~/src/services/api';
import { STORAGE_KEYS } from '~/src/core/constants';

/**
 * Client gọi API Quản lý đào tạo (apiportal.rikkei.edu.vn) bằng token đăng nhập QLĐT.
 * Token lấy từ một tab QLĐT bất kỳ đang mở và được lưu lại, nên dùng được cả khi không mở trang QLĐT.
 * Request đi qua proxy FETCH ở background (chỉ cho phép GET) để tránh CORS.
 */

const QLDT_TAB_PATTERN = 'https://qldt.rikkei.edu.vn/*';

export class QldtAuthError extends Error {}

/** Chuẩn hoá token đọc từ localStorage: có thể là chuỗi JSON ("\"eyJ...\"") hoặc đã kèm "Bearer ". */
function toAuthHeader(rawToken: string): string {
  let token = rawToken.trim();
  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === 'string') token = parsed;
  } catch { /* token thường, không phải JSON */ }
  return /^Bearer\s/i.test(token) ? token : `Bearer ${token}`;
}

/** Đọc token từ localStorage của các tab QLĐT đang mở (ở bất kỳ cửa sổ nào). */
async function readTokenFromQldtTabs(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ url: QLDT_TAB_PATTERN });
  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => localStorage.getItem('token') });
      if (res?.result) return res.result as string;
    } catch { /* tab chưa tải xong / bị chặn → thử tab khác */ }
  }
  return null;
}

export async function getQldtAuth(): Promise<string> {
  const fromTab = await readTokenFromQldtTabs();
  if (fromTab) {
    const auth = toAuthHeader(fromTab);
    await chrome.storage.local.set({ [STORAGE_KEYS.qldtAuthToken]: auth });
    return auth;
  }
  const cached = (await chrome.storage.local.get(STORAGE_KEYS.qldtAuthToken))[STORAGE_KEYS.qldtAuthToken];
  if (cached) return cached as string;
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

        // In response ra Console để đối chiếu dữ liệu QLĐT: phần data dạng JSON (giống file response mẫu) + object để mở xem
        const logged = json && typeof json === 'object' && 'data' in json ? json.data : (json ?? response.text);
        console.log(`[QLĐT API] GET ${path} → HTTP ${response.status}\n${JSON.stringify(logged, null, 2)}`);
        console.log(`[QLĐT API] GET ${path} (object)`, logged);

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
