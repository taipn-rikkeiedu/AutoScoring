/**
 * Lưu trữ key–value của extension. Code nghiệp vụ phụ thuộc interface `KeyValueStore`, không gọi `chrome.storage` trực tiếp
 * → đổi nơi lưu hoặc thay bằng bản giả khi test mà không sửa nơi dùng.
 */
export interface KeyValueStore {
  get<T = unknown>(key: string): Promise<T | undefined>;
  getMany(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

type AreaName = 'local' | 'session';

/** `chrome.storage.local` (bền, giữ qua lần mở trình duyệt) hoặc `chrome.storage.session` (xoá khi tắt trình duyệt). */
export class ChromeStore implements KeyValueStore {
  constructor(private readonly areaName: AreaName) {}

  /** Đọc lúc gọi (không giữ tham chiếu) — `chrome.storage.session` có thể không có ở một số ngữ cảnh. */
  private get area(): chrome.storage.StorageArea | undefined {
    return (chrome.storage as any)?.[this.areaName];
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    return (await this.getMany([key]))[key] as T | undefined;
  }

  async getMany(keys: string[]): Promise<Record<string, unknown>> {
    const area = this.area;
    return area ? ((await area.get(keys)) as Record<string, unknown>) || {} : {};
  }

  async set(items: Record<string, unknown>): Promise<void> {
    await this.area?.set(items);
  }

  async remove(keys: string | string[]): Promise<void> {
    await this.area?.remove(keys);
  }

  /** Mọi khoá có tiền tố cho trước (vd cache). */
  async keysWithPrefix(prefix: string): Promise<string[]> {
    const all = ((await this.area?.get(null as any)) as Record<string, unknown>) || {};
    return Object.keys(all).filter(k => k.startsWith(prefix));
  }
}

export const localStore = new ChromeStore('local');
export const sessionStore = new ChromeStore('session');
