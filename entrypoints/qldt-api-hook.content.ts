/**
 * Chạy trong MAIN world của trang QLĐT: quan sát các request tới apiportal.rikkei.edu.vn mà chính trang web gửi
 * (GET và các request ghi POST / PUT / PATCH / DELETE), rồi chuyển sang script cầu nối (qldt-api-relay)
 * qua window.postMessage. Chỉ quan sát — không sửa, không tự gửi request.
 * Bỏ qua request đăng nhập / token / mật khẩu (không ghi body của chúng).
 * Riêng header Authorization của request thành công được chuyển cho relay để extension luôn có token đang dùng được
 * (không phụ thuộc trang lưu token ở khoá nào); token này không bao giờ được ghi vào kho API.
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
    const SKIP_PATH = /login|logout|password|token|otp|refresh|auth/i;
    const SECRET_FIELD = /"(password|passwd|pwd|otp|token|accessToken|refreshToken)"\s*:/i;
    const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

    const isTarget = (url: string, method: string) => {
      if (!METHODS.has((method || 'GET').toUpperCase())) return false;
      try {
        const u = new URL(url, location.href);
        return u.hostname === 'apiportal.rikkei.edu.vn' && !SKIP_PATH.test(u.pathname);
      } catch {
        return false;
      }
    };

    /** Body đã gửi → chuỗi (FormData: chỉ tên trường, tệp ghi "[tệp]"). */
    const bodyText = (body: any): string => {
      if (body == null) return '';
      if (typeof body === 'string') return body;
      if (body instanceof URLSearchParams) return body.toString();
      if (body instanceof FormData) {
        const o: Record<string, string> = {};
        body.forEach((v, k) => { o[k] = typeof v === 'string' ? v : '[tệp]'; });
        return JSON.stringify(o);
      }
      if (body instanceof Blob || body instanceof ArrayBuffer) return '[dữ liệu nhị phân]';
      try { return JSON.stringify(body); } catch { return String(body); }
    };

    let lastAuth = '';
    const reportAuth = (auth: string, status: number) => {
      if (!auth || status < 200 || status >= 400 || auth === lastAuth) return;
      lastAuth = auth;
      window.postMessage({ source: 'redux-qldt-auth', auth }, location.origin);
    };
    const authOf = (input: RequestInfo | URL, init?: RequestInit): string => {
      try {
        return new Headers(init?.headers || (input instanceof Request ? input.headers : undefined)).get('authorization') || '';
      } catch {
        return '';
      }
    };

    const report = (method: string, url: string, status: number, body: string, requestBody: string) => {
      if (requestBody && SECRET_FIELD.test(requestBody)) return; // không bao giờ ghi body có mật khẩu / token
      window.postMessage({
        source: SOURCE, method: method.toUpperCase(), url: new URL(url, location.href).href, status, body, requestBody
      }, location.origin);
    };

    /* fetch */
    const origFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const res = await origFetch.call(this, input, init);
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const method = init?.method || (input instanceof Request ? input.method : 'GET');
        if (isTarget(url, method)) {
          reportAuth(authOf(input, init), res.status);
          const reqBody = bodyText(init?.body);
          res.clone().text().then(text => report(method, url, res.status, text, reqBody)).catch(() => {});
        }
      } catch { /* không ảnh hưởng trang */ }
      return res;
    };

    /* XMLHttpRequest (axios) */
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    const setHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (this: any, name: string, value: string) {
      if (this.__redux && /^authorization$/i.test(name)) this.__redux.auth = value;
      // eslint-disable-next-line prefer-rest-params
      return setHeader.apply(this, arguments as any);
    };
    XMLHttpRequest.prototype.open = function (this: any, method: string, url: string | URL) {
      this.__redux = { method, url: String(url) };
      // eslint-disable-next-line prefer-rest-params
      return open.apply(this, arguments as any);
    };
    XMLHttpRequest.prototype.send = function (this: any, body?: any) {
      const info = this.__redux;
      if (info && isTarget(info.url, info.method)) {
        const reqBody = bodyText(body);
        this.addEventListener('loadend', () => {
          reportAuth(info.auth || '', this.status);
          try {
            const text = this.responseType === '' || this.responseType === 'text'
              ? this.responseText
              : this.responseType === 'json' ? JSON.stringify(this.response) : '';
            report(info.method, info.url, this.status, text, reqBody);
          } catch { /* bỏ qua */ }
        });
      }
      // eslint-disable-next-line prefer-rest-params
      return send.apply(this, arguments as any);
    };
  }
});
