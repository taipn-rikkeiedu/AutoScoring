import { OPENAI_COMPATIBLE_ENDPOINTS } from '~/src/services/api/endpoints';
import { RateLimitError, mentionsRateLimit } from '../errors';
import { emitRateLimitInfo, readErrorBody } from '../http';
import type { AiProvider, GenerateOptions, ModelOption } from '../types';

/** Mọi API tương thích OpenAI Chat Completions (OpenAI, DeepSeek, Groq, xAI Grok, OpenRouter, tự nhập URL). */
export class OpenAiCompatibleProvider implements AiProvider {
  constructor(private readonly baseUrl: string, private readonly apiKey?: string) {}

  private authHeader(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  async generate(prompt: string, model: string, { temperature = 0, images = [] }: GenerateOptions = {}): Promise<string> {
    const content = images.length
      ? [{ type: 'text', text: prompt }, ...images.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } }))]
      : prompt;
    const res = await fetch(OPENAI_COMPATIBLE_ENDPOINTS.chatCompletions(this.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeader() },
      body: JSON.stringify({ model, messages: [{ role: 'user', content }], temperature })
    });
    emitRateLimitInfo(res);
    if (res.status === 429) throw new RateLimitError();
    if (!res.ok) {
      const message = (await readErrorBody(res))?.error?.message || '';
      if (mentionsRateLimit(message)) throw new RateLimitError();
      throw new Error(message || `Lỗi AI API (HTTP ${res.status})`);
    }
    const text = (await res.json())?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Phản hồi của AI Model rỗng.');
    return text;
  }

  async testConnection(): Promise<void> {
    const res = await fetch(OPENAI_COMPATIBLE_ENDPOINTS.models(this.baseUrl), {
      headers: { 'Content-Type': 'application/json', ...this.authHeader() }
    });
    if (!res.ok) {
      throw new Error((await readErrorBody(res))?.error?.message || `Không thể kết nối đến nhà cung cấp AI (HTTP ${res.status})`);
    }
  }

  async listModels(): Promise<ModelOption[]> {
    try {
      const res = await fetch(OPENAI_COMPATIBLE_ENDPOINTS.models(this.baseUrl), {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey.trim()}` } : {}
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || data.models || [])
        .map((m: any) => ({ label: m.id || m.name, value: m.id || m.name, description: m.id || '' }))
        .filter((m: ModelOption) => Boolean(m.value));
    } catch (e) {
      console.warn('Lỗi tải models từ OpenAI-compatible API:', e);
      return [];
    }
  }
}
