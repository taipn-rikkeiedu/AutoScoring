/** Khoảng cách tối thiểu giữa 2 lần gọi API (ms) */
export const MIN_REQUEST_INTERVAL_MS = 3000; // 3 giây

export class RateLimiter {
  private lastRequestTime = 0;

  canRequest(): { allowed: boolean; waitMs?: number } {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      return { allowed: false, waitMs: MIN_REQUEST_INTERVAL_MS - elapsed };
    }
    return { allowed: true };
  }

  recordRequest(): void {
    this.lastRequestTime = Date.now();
  }
}
export const rateLimiter = new RateLimiter();
