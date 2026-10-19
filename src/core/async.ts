/** Tiện ích bất đồng bộ dùng chung (không phụ thuộc trình duyệt). */

/** Promise kèm hạn chờ: quá hạn thì reject với thông báo cho trước. `ms <= 0` = không giới hạn. */
export function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  if (ms <= 0) return p;
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    p,
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })
  ]).finally(() => clearTimeout(timer));
}
