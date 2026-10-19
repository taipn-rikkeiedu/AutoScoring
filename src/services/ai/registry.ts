import { AI_DEFAULTS } from '~/src/core/constants';
import { API_BASE_URLS } from '~/src/services/api/endpoints';
import { GeminiProvider } from './providers/geminiProvider';
import { OpenAiCompatibleProvider } from './providers/openAiCompatibleProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import type { AiCredentials, AiProvider } from './types';

/**
 * Mô tả 1 nhà cung cấp AI — MỘT chỗ duy nhất chứa mọi thông tin về nhà cung cấp (trước rải ở 6 chuỗi if):
 * cách tạo kết nối, model gợi ý, link lấy key, cần key / URL không.
 * Thêm nhà cung cấp = đăng ký thêm 1 mô tả (Open/Closed), không sửa nơi dùng.
 */
export interface AiProviderDescriptor {
  id: string;
  /** Model chọn sẵn khi đổi sang nhà cung cấp này; không có → giữ model đang nhập. */
  defaultModel?: string;
  apiKeyUrl?: string;
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
  create(creds: AiCredentials): AiProvider;
}

export class AiProviderRegistry {
  private readonly items = new Map<string, AiProviderDescriptor>();

  register(d: AiProviderDescriptor): this {
    this.items.set(d.id, d);
    return this;
  }

  get(id: string): AiProviderDescriptor | undefined {
    return this.items.get(id);
  }

  list(): AiProviderDescriptor[] {
    return [...this.items.values()];
  }
}

/** Nhà cung cấp tương thích OpenAI với URL cố định. */
const openAiCompatible = (id: string, baseUrl: string, defaultModel: string, apiKeyUrl: string): AiProviderDescriptor => ({
  id, defaultModel, apiKeyUrl, requiresApiKey: true, requiresBaseUrl: false,
  create: (c) => new OpenAiCompatibleProvider(baseUrl, c.apiKey)
});

export function createDefaultAiRegistry(): AiProviderRegistry {
  return new AiProviderRegistry()
    .register({
      id: 'gemini', defaultModel: AI_DEFAULTS.geminiModel, apiKeyUrl: 'https://aistudio.google.com/app/apikey',
      requiresApiKey: true, requiresBaseUrl: false,
      create: (c) => new GeminiProvider(c.apiKey)
    })
    .register(openAiCompatible('openai', API_BASE_URLS.openAi, AI_DEFAULTS.openAiModel, 'https://platform.openai.com/api-keys'))
    .register(openAiCompatible('deepseek', API_BASE_URLS.deepSeek, AI_DEFAULTS.deepSeekModel, 'https://platform.deepseek.com/api_keys'))
    .register(openAiCompatible('groq', API_BASE_URLS.groq, AI_DEFAULTS.groqModel, 'https://console.groq.com/keys'))
    .register(openAiCompatible('grok', API_BASE_URLS.grok, AI_DEFAULTS.grokModel, 'https://console.x.ai/'))
    .register(openAiCompatible('openrouter', API_BASE_URLS.openRouter, AI_DEFAULTS.openRouterModel, 'https://openrouter.ai/keys'))
    .register({
      id: 'local', defaultModel: AI_DEFAULTS.localModel, requiresApiKey: false, requiresBaseUrl: false,
      create: (c) => new OllamaProvider(c.apiUrl?.trim() || API_BASE_URLS.ollama)
    })
    .register({
      id: 'custom', requiresApiKey: false, requiresBaseUrl: true,
      create: (c) => new OpenAiCompatibleProvider(c.apiUrl, c.apiKey)
    });
}
