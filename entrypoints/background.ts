import { BACKGROUND_FETCH_PROXY, UI_MESSAGES } from '~/src/core/constants';

export default defineBackground(() => {
  const allowedFetchHosts = new Set<string>(BACKGROUND_FETCH_PROXY.allowedHosts);

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

    if (message.type === "OPEN_POPUP") {
      if (chrome.action && chrome.action.openPopup) {
        chrome.action.openPopup().catch((err) => {
          console.error("Failed to open popup:", err);
        });
      }
      sendResponse({ success: true });
      return false;
    }
  });
});
