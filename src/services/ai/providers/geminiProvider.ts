import { GEMINI_ENDPOINTS } from '~/src/services/api/endpoints';
import { RateLimitError, mentionsRateLimit } from '../errors';
import { emitRateLimitInfo, readErrorBody } from '../http';
import type { AiProvider, GenerateOptions, ModelOption } from '../types';

/** Thứ tự gợi ý model Gemini (nhỏ = ưu tiên). */
function modelRank(id: string): number {
  const v = id.toLowerCase();
  if (v.includes('3.1') && v.includes('flash')) return 0;
  if (v.includes('gemma') && (v.includes('4') || v.includes('31b'))) return 1;
  if (v.includes('2.5') && v.includes('flash')) return 2;
  if (v.includes('2.5') && v.includes('pro')) return 3;
  if (v.includes('2.0') && v.includes('flash')) return 4;
  if (v.includes('2.0') && v.includes('pro')) return 5;
  if (v.includes('1.5') && v.includes('flash')) return 6;
  if (v.includes('1.5') && v.includes('pro')) return 7;
  return 10;
}

const NON_TEXT_MODELS = ['embedding', 'aqa', 'imagen', 'veo'];

/** Google Gemini (Generative Language API), key trong query string. */
export class GeminiProvider implements AiProvider {
  constructor(private readonly apiKey: string) {}

  async generate(prompt: string, model: string, { temperature = 0, images = [] }: GenerateOptions = {}): Promise<string> {
    const parts: any[] = [{ text: prompt }, ...images.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.base64 } }))];
    const res = await fetch(GEMINI_ENDPOINTS.generateContent(model, this.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature } })
    });
    emitRateLimitInfo(res);
    if (res.status === 429) throw new RateLimitError();
    if (!res.ok) {
      const message = (await readErrorBody(res))?.error?.message || '';
      if (mentionsRateLimit(message)) throw new RateLimitError();
      throw new Error(message || `Lỗi Gemini API (HTTP ${res.status})`);
    }
    const text = (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Phản hồi của Gemini API rỗng.');
    return text;
  }

  async testConnection(model: string): Promise<void> {
    const res = await fetch(GEMINI_ENDPOINTS.modelInfo(model, this.apiKey));
    if (!res.ok) throw new Error((await readErrorBody(res))?.error?.message || `Lỗi Gemini API (HTTP ${res.status})`);
  }

  async listModels(): Promise<ModelOption[]> {
    if (!this.apiKey.trim()) return [];
    try {
      const res = await fetch(GEMINI_ENDPOINTS.listModels(this.apiKey.trim()));
      if (!res.ok) throw new Error((await readErrorBody(res))?.error?.message || `HTTP ${res.status}`);
      const raw: any[] = (await res.json()).models || [];
      return raw
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent')
          && !NON_TEXT_MODELS.some(x => String(m.name || '').includes(x)))
        .map(m => {
          const id = String(m.name || '').replace(/^models\//, '');
          return { label: `${m.displayName || id} (${id})`, value: id, description: m.description || '' };
        })
        .sort((a, b) => modelRank(a.value) - modelRank(b.value));
    } catch (err) {
      console.warn('Không thể tải danh sách model từ Google GenAI API:', err);
      return [];
    }
  }
}
