export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "FETCH") {
      const { url, options } = message;
      
      fetch(url, options)
        .then(async response => {
          const ok = response.ok;
          const status = response.status;
          const statusText = response.statusText;
          
          // Xác định kiểu dữ liệu trả về để nén nhị phân hoặc text
          const contentType = response.headers.get("content-type") || "";
          const isBinary = contentType.includes("application/zip") || 
                           contentType.includes("octet-stream") || 
                           url.includes("/zipball/") || 
                           url.includes("/zip/");
  
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
  });
});
