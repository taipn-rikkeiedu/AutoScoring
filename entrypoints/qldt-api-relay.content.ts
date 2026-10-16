import { STORAGE_KEYS } from '~/src/core/constants';

/**
 * Cầu nối (ISOLATED world) trên trang QLĐT: nhận response từ qldt-api-hook và gửi về background để lưu,
 * chỉ khi người dùng đã bật "Ghi API" trong extension.
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

    window.addEventListener('message', (e) => {
      if (e.source !== window || e.data?.source !== 'redux-qldt-api' || !enabled) return;
      const { method, url, status, body, requestBody } = e.data;
      chrome.runtime.sendMessage({ type: 'QLDT_API_RECORD', method, url, status, body, requestBody }).catch(() => { /* extension đang tải lại */ });
    });
  }
});
