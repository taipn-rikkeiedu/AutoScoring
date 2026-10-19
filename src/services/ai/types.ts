/** Ảnh gửi kèm cho model (đề bài, sơ đồ trong bài nộp). */
export interface ImageAttachment {
  mimeType: string;
  base64: string;
}

/** Cấu hình kết nối AI người dùng chọn trong Cài đặt (BYOK). */
export interface AiCredentials {
  provider: string;
  modelName: string;
  apiKey: string;
  apiUrl: string;
}

export interface ModelOption {
  label: string;
  value: string;
  description?: string;
}

export interface GenerateOptions {
  temperature?: number;
  images?: ImageAttachment[];
}

/**
 * Một nhà cung cấp AI (Strategy). Lỗi giới hạn lưu lượng → ném `RateLimitError` để chính sách thử lại xử lý.
 * Được tạo cho 1 bộ thông tin kết nối (key, URL) qua `AiProviderDescriptor.create`.
 */
export interface AiProvider {
  generate(prompt: string, model: string, opts?: GenerateOptions): Promise<string>;
  /** Ném lỗi (thông điệp của nhà cung cấp) nếu không kết nối được. */
  testConnection(model: string): Promise<void>;
  /** Danh sách model; lỗi → rỗng (không chặn người dùng nhập tay). */
  listModels(): Promise<ModelOption[]>;
}
