import { UI_MESSAGES } from '~/src/core/constants';
import type { AppConfig } from '~/src/types';
import type { AiProviderDescriptor, AiProviderRegistry } from './registry';
import { RateLimitRetryPolicy, RetryOptions } from './retryPolicy';
import type { AiCredentials, ImageAttachment, ModelOption } from './types';

export type { AiCredentials, ImageAttachment, ModelOption } from './types';

/** Thông tin kết nối AI từ cấu hình (một chỗ duy nhất, trước dựng lặp ở 4 nơi). */
export const credentialsFrom = (config: Pick<AppConfig, 'aiProvider' | 'aiModelName' | 'aiApiKey' | 'aiApiUrl'>): AiCredentials => ({
  provider: config.aiProvider, modelName: config.aiModelName, apiKey: config.aiApiKey, apiUrl: config.aiApiUrl
});

export interface AiGenerateOptions extends RetryOptions {
  images?: ImageAttachment[];
  onStatus?: ((status: string) => void) | null;
}

/**
 * Cổng gọi AI cho toàn ứng dụng: chọn nhà cung cấp theo cấu hình (registry), áp chính sách thử lại khi bị giới hạn.
 * Nơi dùng không biết / không rẽ nhánh theo nhà cung cấp cụ thể.
 */
export class AiService {
  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly retry: RateLimitRetryPolicy = new RateLimitRetryPolicy()
  ) {}

  /** Mô tả nhà cung cấp (model gợi ý, link lấy key…); không có → undefined. */
  describe(providerId: string): AiProviderDescriptor | undefined {
    return this.registry.get(providerId);
  }

  async generate(prompt: string, creds: AiCredentials, opts: AiGenerateOptions = {}): Promise<string> {
    const d = this.registry.get(creds.provider);
    if (!d) throw new Error('Không hỗ trợ AI Provider đã chọn.');
    const provider = d.create(creds);
    return this.retry.run(() => provider.generate(prompt, creds.modelName, { temperature: 0, images: opts.images }), opts.onStatus, opts);
  }

  /** Kiểm tra cấu hình đủ (key / URL) rồi thử kết nối; lỗi → ném kèm lý do. */
  async testConnection(creds: AiCredentials): Promise<void> {
    const d = this.registry.get(creds.provider);
    if (!d) throw new Error(UI_MESSAGES.common.unsupportedAiProvider);
    if (d.requiresApiKey && !creds.apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    if (d.requiresBaseUrl && !creds.apiUrl) throw new Error(UI_MESSAGES.common.missingBaseUrl);
    await d.create(creds).testConnection(creds.modelName);
  }

  /** Danh sách model của nhà cung cấp; thiếu key (với nhà cung cấp cần key) hoặc lỗi → rỗng. */
  async listModels(creds: AiCredentials): Promise<ModelOption[]> {
    const d = this.registry.get(creds.provider);
    if (!d) return [];
    if (d.requiresApiKey && !creds.apiKey?.trim()) return [];
    return d.create(creds).listModels();
  }
}
