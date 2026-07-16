/** Số lỗi 5xx liên tiếp tối đa trước khi circuit breaker ngắt */
export const CIRCUIT_BREAKER_THRESHOLD = 2;

/** Thời gian chờ (ms) trước khi circuit breaker cho phép thử lại */
export const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 phút

export class CircuitBreaker {
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private isOpen = false;

  canRequest(): { allowed: boolean; reason?: string } {
    if (!this.isOpen) return { allowed: true };

    const elapsed = Date.now() - this.lastFailureTime;
    if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
      console.warn(`[LMS API] Circuit breaker: Đã qua cooldown, cho phép thử lại.`);
      return { allowed: true };
    }

    const remainingSec = Math.ceil((CIRCUIT_BREAKER_COOLDOWN_MS - elapsed) / 1000);
    return {
      allowed: false,
      reason: `⛔ Circuit breaker ĐANG MỞ — Server đã trả lỗi 5xx ${this.consecutiveFailures} lần liên tiếp. ` +
              `Tự động chặn request để bảo vệ server. Thử lại sau ${remainingSec}s.`
    };
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.isOpen = false;
  }

  recordServerError(status: number): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    console.error(`[LMS API] ⚠️ Lỗi server ${status} (${this.consecutiveFailures}/${CIRCUIT_BREAKER_THRESHOLD})`);

    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.isOpen = true;
      console.error(`[LMS API] ⛔ CIRCUIT BREAKER ĐÃ MỞ trong ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s.`);
    }
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.isOpen = false;
    this.lastFailureTime = 0;
  }
}
export const circuitBreaker = new CircuitBreaker();
