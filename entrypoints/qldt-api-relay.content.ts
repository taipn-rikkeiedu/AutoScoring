import { STORAGE_KEYS } from '~/src/core/constants';
import { toAuthHeader } from '~/src/services/lms/qldtApiClient';

/**
 * Cầu nối (ISOLATED world) trên trang QLĐT: nhận response từ qldt-api-hook và gửi về background để lưu,
 * chỉ khi người dùng đã bật "Ghi API" trong extension.
 * Luôn lưu token Authorization mà trang vừa dùng thành công → extension có phiên QLĐT kể cả khi tab sau đó bị đóng / ngủ.
 */
export default defineContentScript({
  matches: ['https://qldt.rikkei.edu.vn/*'],
  runAt: 'document_start',
  main() {
    let enabled = false;
    chrome.storage.local.get(STORAGE_KEYS.qldtApiRecording, (res) => { enabled = !!res[STORAGE_KEYS.qldtApiRecording]; });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.qldtApiRecording]) enabled = !!changes[STORAGE_KEYS.qldtApiRecording].newValue;
    });

    let savedAuth = '';
    window.addEventListener('message', (e) => {
      if (e.source !== window || e.data?.source !== 'redux-qldt-auth' || typeof e.data.auth !== 'string') return;
      const auth = toAuthHeader(e.data.auth);
      if (auth === savedAuth || auth.length > 8000) return;
      savedAuth = auth;
      chrome.storage.local.set({ [STORAGE_KEYS.qldtAuthToken]: auth }).catch(() => { /* extension đang tải lại */ });
    });

    window.addEventListener('message', (e) => {
      if (e.source !== window || e.data?.source !== 'redux-qldt-api' || !enabled) return;
      const { method, url, status, body, requestBody } = e.data;
      chrome.runtime.sendMessage({ type: 'QLDT_API_RECORD', method, url, status, body, requestBody }).catch(() => { /* extension đang tải lại */ });
    });
  }
});
