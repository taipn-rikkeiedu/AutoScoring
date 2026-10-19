/** Xử lý token đăng nhập (JWT) — hàm thuần, không phụ thuộc trình duyệt; dùng ở cả trang extension lẫn content script. */

/** Chuẩn hoá token: có thể là chuỗi JSON ("\"eyJ...\"") hoặc đã kèm "Bearer " → luôn dạng "Bearer <token>". */
export function toAuthHeader(rawToken: string): string {
  let token = rawToken.trim();
  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === 'string') token = parsed;
  } catch { /* token thường, không phải JSON */ }
  return /^Bearer\s/i.test(token) ? token : `Bearer ${token}`;
}

/** Payload của JWT (bỏ qua chữ ký); null nếu không phải JWT. */
export function jwtPayload(auth: string): Record<string, any> | null {
  const part = auth.replace(/^Bearer\s+/i, '').split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    return json && typeof json === 'object' ? json : null;
  } catch {
    return null;
  }
}

/** Hạn (giây) ghi trong JWT; null nếu không rõ. */
export function jwtExp(auth: string): number | null {
  const exp = jwtPayload(auth)?.exp;
  return typeof exp === 'number' ? exp : null;
}

/** Đã (hoặc sắp, trong `skewMs`) hết hạn; token không rõ hạn coi là còn dùng được. */
export function isExpired(auth: string, skewMs = 30_000): boolean {
  const exp = jwtExp(auth);
  return exp != null && exp * 1000 <= Date.now() + skewMs;
}

/** Định danh tài khoản trong token (id / sub / userId / email); token không phải JWT → vài ký tự cuối. */
export function accountOf(auth: string): string {
  const p = jwtPayload(auth);
  const id = p?.id ?? p?.sub ?? p?.userId ?? p?.email;
  return id != null ? String(id) : auth.slice(-16);
}
