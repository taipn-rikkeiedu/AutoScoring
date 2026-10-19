import { OLLAMA_ENDPOINTS } from '~/src/services/api/endpoints';
import { RateLimitError } from '../errors';
import { readErrorBody } from '../http';
import type { AiProvider, GenerateOptions, ModelOption } from '../types';

/** Ollama chạy cục bộ (không cần key). */
export class OllamaProvider implements AiProvider {
  constructor(private readonly baseUrl: string) {}

  async generate(prompt: string, model: string, { temperature = 0, images = [] }: GenerateOptions = {}): Promise<string> {
    const body: Record<string, unknown> = { model, prompt, stream: false, options: { temperature } };
    if (images.length) body.images = images.map(img => img.base64);
    const res = await fetch(OLLAMA_ENDPOINTS.generate(this.baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.status === 429) throw new RateLimitError();
    if (!res.ok) throw new Error(`Lỗi Ollama (HTTP ${res.status})`);
    const text = (await res.json())?.response;
    if (!text) throw new Error('Phản hồi của Ollama rỗng.');
    return text;
  }

  async testConnection(): Promise<void> {
    const res = await fetch(OLLAMA_ENDPOINTS.tags(this.baseUrl));
    if (!res.ok) throw new Error((await readErrorBody(res))?.error || `Không thể kết nối đến Ollama (HTTP ${res.status})`);
  }

  async listModels(): Promise<ModelOption[]> {
    try {
      const res = await fetch(OLLAMA_ENDPOINTS.tags(this.baseUrl));
      if (!res.ok) return [];
      return ((await res.json()).models || []).map((m: any) => ({
        label: `${m.name} (${Math.round((m.size || 0) / (1024 * 1024))} MB)`,
        value: m.name,
        description: m.name
      }));
    } catch (e) {
      console.warn('Lỗi tải models từ Ollama:', e);
      return [];
    }
  }
}
