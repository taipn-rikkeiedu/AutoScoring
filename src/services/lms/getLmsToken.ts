import { queryActiveLmsTab } from '~/src/core/utils';

/**
 * Đọc token đăng nhập LMS từ localStorage của tab LMS đang mở (key "token").
 * Yêu cầu: người dùng đang có 1 tab mở trang qldt.rikkei.edu.vn hoặc lms-admin.rikkei.edu.vn và đã đăng nhập.
 */
export function getLmsTokenFromActiveTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    queryActiveLmsTab((tab) => {
      if (!tab?.id || !tab.url || !tab.url.includes('rikkei.edu.vn')) {
        reject(new Error('Không tìm thấy tab LMS đang mở. Hãy mở trang qldt.rikkei.edu.vn hoặc lms-admin.rikkei.edu.vn và đăng nhập trước.'));
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => localStorage.getItem('token'),
        },
        (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          const token = results?.[0]?.result;
          if (!token) {
            reject(new Error('Không tìm thấy token trong localStorage. Hãy đăng nhập lại trên LMS.'));
            return;
          }
          resolve(token as string);
        }
      );
    });
  });
}
