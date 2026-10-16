/**
 * Chạy trong MAIN world của trang QLĐT: bắt response các request GET tới apiportal.rikkei.edu.vn
 * mà chính trang web gọi, rồi chuyển sang script cầu nối (qldt-api-relay) qua window.postMessage.
 * Chỉ đọc response, không sửa request; bỏ qua request đăng nhập / token / mật khẩu.
 */
export default defineContentScript({
  matches: ['https://qldt.rikkei.edu.vn/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    const w = window as any;
    if (w.__reduxQldtHook) return;
    w.__reduxQldtHook = true;

    const SOURCE = 'redux-qldt-api';
    const SKIP = /login|logout|password|token|otp|refresh/i;

    const isTarget = (url: string, method: string) => {
      if ((method || 'GET').toUpperCase() !== 'GET') return false;
      try {
        const u = new URL(url, location.href);
        return u.hostname === 'apiportal.rikkei.edu.vn' && !SKIP.test(u.pathname);
      } catch {
        return false;
      }
    };

    const report = (url: string, status: number, body: string) => {
      window.postMessage({ source: SOURCE, url: new URL(url, location.href).href, status, body }, location.origin);
    };

    /* fetch */
    const origFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const res = await origFetch.call(this, input, init);
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const method = init?.method || (input instanceof Request ? input.method : 'GET');
        if (isTarget(url, method)) res.clone().text().then(text => report(url, res.status, text)).catch(() => {});
      } catch { /* không ảnh hưởng trang */ }
      return res;
    };

    /* XMLHttpRequest (axios) */
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (this: any, method: string, url: string | URL) {
      this.__redux = { method, url: String(url) };
      // eslint-disable-next-line prefer-rest-params
      return open.apply(this, arguments as any);
    };
    XMLHttpRequest.prototype.send = function (this: any) {
      const info = this.__redux;
      if (info && isTarget(info.url, info.method)) {
        this.addEventListener('loadend', () => {
          try {
            const body = this.responseType === '' || this.responseType === 'text'
              ? this.responseText
              : this.responseType === 'json' ? JSON.stringify(this.response) : '';
            if (body) report(info.url, this.status, body);
          } catch { /* bỏ qua */ }
        });
      }
      // eslint-disable-next-line prefer-rest-params
      return send.apply(this, arguments as any);
    };
  }
});
