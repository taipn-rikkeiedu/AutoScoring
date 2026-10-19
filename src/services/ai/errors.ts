/** Nhà cung cấp báo hết hạn mức / giới hạn lưu lượng (HTTP 429, "quota", "exhausted"…) → nên chờ rồi thử lại. */
export class RateLimitError extends Error {
  constructor() {
    super('RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

const RATE_LIMIT_TEXT = /quota|rate limit|exhausted/i;

/** Thông điệp lỗi của nhà cung cấp có phải về hạn mức không. */
export const mentionsRateLimit = (message: string) => RATE_LIMIT_TEXT.test(message);

/** Lỗi bất kỳ (kể cả lỗi mạng có "429" / "too many requests") có nên thử lại theo chính sách giới hạn lưu lượng. */
export function isRateLimitError(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  const message = (err as any)?.message || '';
  return message === 'RATE_LIMIT' || /quota|rate limit|429|exhausted|too many requests/i.test(message);
}
