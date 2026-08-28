import { API_BASE_URLS, FASTAPI_ENDPOINTS } from '~/src/services/api/endpoints';
import { BACKGROUND_FETCH_PROXY, STORAGE_KEYS, UI_MESSAGES } from '~/src/core/constants';

export default defineBackground(() => {
  const allowedFetchHosts = new Set<string>(BACKGROUND_FETCH_PROXY.allowedHosts);

  // --- Warm-up định kỳ cho FastAPI Backend (Modal serverless bị "ngủ" khi rảnh, cold start ~5-30s) ---
  // Ping /health mỗi vài phút để giữ container luôn "ấm", tránh việc user phải chờ cold start
  // ngay lúc mở popup. Alarm vẫn chạy được dù popup đang đóng vì service worker được đánh thức bởi alarm.
  const BACKEND_WARMUP_ALARM = "redux-backend-warmup";
  const WARMUP_INTERVAL_MINUTES = 4;

  const warmUpBackend = async () => {
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEYS.fastApiServerUrl, STORAGE_KEYS.fastApiSecretKey]) as Record<string, string | undefined>;
      const baseUrl: string = stored[STORAGE_KEYS.fastApiServerUrl] || API_BASE_URLS.fastApi;
      const secretKey = stored[STORAGE_KEYS.fastApiSecretKey];
      const url = FASTAPI_ENDPOINTS.health(baseUrl);
      const headers: Record<string, string> = {};
      if (secretKey) headers["x-api-key"] = secretKey;
      await fetch(url, { headers });
    } catch {
      // Bỏ qua lỗi warm-up: đây chỉ là ping nền, không cần báo lỗi cho user.
    }
  };

  chrome.alarms.create(BACKEND_WARMUP_ALARM, { periodInMinutes: WARMUP_INTERVAL_MINUTES });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === BACKEND_WARMUP_ALARM) warmUpBackend();
  });

  // Ping ngay khi extension được cài đặt/cập nhật hoặc trình duyệt khởi động,
  // để backend đã "ấm" sẵn trước khi user kịp mở popup lần đầu.
  chrome.runtime.onInstalled.addListener(() => warmUpBackend());
  chrome.runtime.onStartup.addListener(() => warmUpBackend());

  // --- Chuyển đổi nhanh giữa dạng cửa sổ nổi (window) và dạng ghim cứng trên toolbar (popup) ---
  const FLOATING_WINDOW_SIZE = { width: 420, height: 720 };
  let defaultPopupPath = "";
  let floatingWindowId: number | null = null;

  const getDefaultPopupPath = async (): Promise<string> => {
    if (!defaultPopupPath) {
      defaultPopupPath = (await chrome.action.getPopup({})) || "popup.html";
    }
    return defaultPopupPath;
  };

  // getPopup() có thể trả về đường dẫn tương đối ("popup.html") hoặc URL tuyệt đối
  // ("chrome-extension://<id>/popup.html") tùy trình duyệt, nên resolve qua URL() thay vì
  // chrome.runtime.getURL() để tránh bị nhân đôi tiền tố chrome-extension://.
  const buildFloatingWindowUrl = (popupPath: string): string => {
    const url = new URL(popupPath, chrome.runtime.getURL("/"));
    url.searchParams.set("mode", "window");
    return url.toString();
  };

  const applyPopupModeFromStorage = async () => {
    const popupPath = await getDefaultPopupPath();
    const stored = await chrome.storage.local.get(STORAGE_KEYS.uiWindowMode);
    const mode = stored[STORAGE_KEYS.uiWindowMode] === "window" ? "window" : "popup";
    // Chế độ "window": bỏ popup mặc định để chrome.action.onClicked tự mở cửa sổ nổi.
    // Chế độ "popup": khôi phục hành vi ghim cứng như cũ (click icon mở popup thả xuống).
    await chrome.action.setPopup({ popup: mode === "popup" ? popupPath : "" });
  };

  applyPopupModeFromStorage();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEYS.uiWindowMode]) {
      applyPopupModeFromStorage();
    }
  });

  const openOrFocusFloatingWindow = async () => {
    if (floatingWindowId !== null) {
      try {
        await chrome.windows.update(floatingWindowId, { focused: true });
        return;
      } catch {
        floatingWindowId = null;
      }
    }

    // Phục hồi ID của cửa sổ nổi trong trường hợp Service Worker bị ngủ đông rồi thức dậy
    try {
      const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("/*") });
      const windowTab = tabs.find(t => t.url && t.url.includes("mode=window"));
      if (windowTab && windowTab.windowId) {
        floatingWindowId = windowTab.windowId;
        await chrome.windows.update(floatingWindowId, { focused: true });
        return;
      }
    } catch (e) {
      console.error("Lỗi khi tìm kiếm cửa sổ nổi:", e);
    }

    const popupPath = await getDefaultPopupPath();
    const win = await chrome.windows.create({
      url: buildFloatingWindowUrl(popupPath),
      type: "popup",
      width: FLOATING_WINDOW_SIZE.width,
      height: FLOATING_WINDOW_SIZE.height
    });
    floatingWindowId = win?.id ?? null;
  };

  chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === floatingWindowId) {
      floatingWindowId = null;
    }
  });

  chrome.action.onClicked.addListener(() => {
    openOrFocusFloatingWindow();
  });

  const getSafeFetchRequest = (message: any): { url: string; options: RequestInit } => {
    const requestUrl = new URL(String(message.url || ""));
    if (requestUrl.protocol !== "https:" || !allowedFetchHosts.has(requestUrl.hostname)) {
      throw new Error(UI_MESSAGES.background.disallowedUrl);
    }

    const rawOptions = message.options || {};
    const method = String(rawOptions.method || "GET").toUpperCase();
    if (!BACKGROUND_FETCH_PROXY.allowedMethods.includes(method as any)) {
      throw new Error(UI_MESSAGES.background.disallowedMethod);
    }

    const allowedHeaderNames = new Set<string>(BACKGROUND_FETCH_PROXY.allowedHeaders);
    const headers: Record<string, string> = {};
    const rawHeaders = rawOptions.headers || {};
    Object.entries(rawHeaders).forEach(([key, value]) => {
      const normalizedKey = key.toLowerCase();
      if (allowedHeaderNames.has(normalizedKey) && typeof value === "string") {
        headers[key] = value;
      }
    });

    return {
      url: requestUrl.toString(),
      options: { method, headers }
    };
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "FETCH") {
      let request: { url: string; options: RequestInit };
      try {
        if (sender.id !== chrome.runtime.id) {
          throw new Error(UI_MESSAGES.background.invalidSender);
        }
        request = getSafeFetchRequest(message);
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
        return false;
      }
      
      fetch(request.url, request.options)
        .then(async response => {
          const ok = response.ok;
          const status = response.status;
          const statusText = response.statusText;
          
          // Xác định kiểu dữ liệu trả về để nén nhị phân hoặc text
          const contentType = response.headers.get("content-type") || "";
          const isBinary = contentType.includes("application/zip") || 
                           contentType.includes("octet-stream") || 
                           request.url.includes("/zipball/") || 
                           request.url.includes("/zip/");
  
          if (isBinary) {
            const buffer = await response.arrayBuffer();
            // Chuyển ArrayBuffer thành chuỗi Base64
            const bytes = new Uint8Array(buffer);
            let binary = "";
            const chunk = 8192;
            for (let i = 0; i < bytes.length; i += chunk) {
              binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
            }
            const base64 = btoa(binary);
            sendResponse({ success: true, ok, status, statusText, base64, isBinary: true });
          } else {
            const text = await response.text();
            sendResponse({ success: true, ok, status, statusText, text, isBinary: false });
          }
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
        
      return true; // Giữ kết nối bất đồng bộ để gửi sendResponse sau
    }

    if (message.type === "SAFE_NAVIGATE") {
      const { targetUrl, tabId, currentUrl } = message;

      const performNavigation = (id: number, current: string) => {
        const isSameOrigin = (url1: string, url2: string): boolean => {
          try {
            const u1 = new URL(url1);
            const u2 = new URL(url2);
            return u1.origin === u2.origin;
          } catch {
            return url1.includes('rikkei.edu.vn') && url2.includes('rikkei.edu.vn');
          }
        };

        if (current === targetUrl) {
          chrome.tabs.reload(id);
        } else if (isSameOrigin(current, targetUrl)) {
          chrome.tabs.update(id, { url: targetUrl }, () => {
            chrome.tabs.reload(id);
          });
        } else {
          chrome.tabs.update(id, { url: targetUrl });
        }
      };

      if (tabId) {
        performNavigation(tabId, currentUrl || '');
      } else {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            performNavigation(tabs[0].id, tabs[0].url || '');
          } else {
            chrome.tabs.create({ url: targetUrl });
          }
        });
      }
      sendResponse({ success: true });
      return false;
    }

    if (message.type === "OPEN_FLOATING_WINDOW") {
      openOrFocusFloatingWindow()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }
  });
});
