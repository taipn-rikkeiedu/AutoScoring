/** Tiện ích HTTP dùng chung cho các nhà cung cấp AI. */

/** Đọc body lỗi JSON (không ném nếu body không phải JSON). */
export const readErrorBody = (res: Response): Promise<any> => res.json().catch(() => ({}));

/** Báo hạn mức còn lại (header x-ratelimit-*) cho giao diện qua sự kiện `aiRateLimit` (Header hiển thị). */
export function emitRateLimitInfo(res: Response): void {
  const req = res.headers.get('x-ratelimit-remaining-requests');
  const tokens = res.headers.get('x-ratelimit-remaining-tokens');
  if ((req !== null || tokens !== null) && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aiRateLimit', { detail: { req: req || 'N/A', tokens: tokens || 'N/A' } }));
  }
}
