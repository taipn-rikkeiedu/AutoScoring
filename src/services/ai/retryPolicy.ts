import { isRateLimitError } from './errors';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
}

/**
 * Thử lại khi bị giới hạn lưu lượng: chờ tăng dần (initial × 2^(n−1)), giữ nguyên model người dùng chọn.
 * Lỗi khác ném ngay. `sleep` truyền vào được để test không phải chờ thật.
 */
export class RateLimitRetryPolicy {
  constructor(
    private readonly maxRetries = 3,
    private readonly initialDelayMs = 6000,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise(r => setTimeout(r, ms))
  ) {}

  async run<T>(task: () => Promise<T>, onStatus?: ((status: string) => void) | null, opts: RetryOptions = {}): Promise<T> {
    const maxRetries = opts.maxRetries ?? this.maxRetries;
    const initialDelayMs = opts.initialDelayMs ?? this.initialDelayMs;
    for (let attempt = 0; ; attempt++) {
      try {
        return await task();
      } catch (err) {
        if (!isRateLimitError(err)) throw err;
        if (attempt + 1 > maxRetries) {
          throw new Error(`Bị giới hạn lưu lượng (Rate Limit) và đã thử lại ${maxRetries} lần thất bại. Vui lòng đợi và thử lại.`);
        }
        const delay = initialDelayMs * Math.pow(2, attempt);
        onStatus?.(`Đợi ${Math.round(delay / 1000)}s do hết hạn mức AI (${attempt + 1}/${maxRetries})...`);
        await this.sleep(delay);
      }
    }
  }
}
