// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiService, credentialsFrom } from '~/src/services/ai/aiService';
import { AiProviderRegistry, createDefaultAiRegistry } from '~/src/services/ai/registry';
import { RateLimitRetryPolicy } from '~/src/services/ai/retryPolicy';
import { RateLimitError } from '~/src/services/ai/errors';
import { buildGradingPrompt, compressCode } from '~/src/core/prompts/gradingPrompt';
import type { AppConfig } from '~/src/types';

/**
 * Test đặc tả tầng AI: request gửi đi (URL, header, body), cách đọc response, thử lại khi bị giới hạn lưu lượng,
 * kiểm tra kết nối, tải danh sách model, prompt chấm bài.
 * `ai` là lớp nối giữa test và code — đổi cài đặt bên dưới mà giữ nguyên kỳ vọng.
 */
const service = new AiService(createDefaultAiRegistry());
const ai = {
  generate: (prompt: string, creds: { provider: string; modelName: string; apiKey: string; apiUrl: string }, opts: { images?: any[]; onStatus?: (s: string) => void } = {}) =>
    service.generate(prompt, creds, { images: opts.images, onStatus: opts.onStatus }),
  test: (cfg: Partial<AppConfig>) => service.testConnection(credentialsFrom(cfg as AppConfig)),
  listModels: (provider: string, apiKey?: string, apiUrl?: string) =>
    service.listModels({ provider, apiKey: apiKey || '', apiUrl: apiUrl || '', modelName: '' })
};

interface Call { url: string; init: RequestInit }
let calls: Call[];
let respond: (url: string, init: RequestInit) => Response;
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const bodyOf = (c: Call) => JSON.parse(String(c.init.body));
const creds = (provider: string, extra: Partial<{ modelName: string; apiKey: string; apiUrl: string }> = {}) =>
  ({ provider, modelName: 'm1', apiKey: 'k1', apiUrl: '', ...extra });

beforeEach(() => {
  calls = [];
  respond = () => json({}, 404);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => { calls.push({ url: String(url), init }); return respond(String(url), init); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('generate — request theo từng nhà cung cấp', () => {
  const img = { mimeType: 'image/png', base64: 'AAA' };

  it('Gemini: URL có key, parts gồm chữ + ảnh, temperature 0', async () => {
    respond = () => json({ candidates: [{ content: { parts: [{ text: 'KQ' }] } }] });
    expect(await ai.generate('P', creds('gemini'), { images: [img] })).toBe('KQ');
    expect(calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/m1:generateContent?key=k1');
    expect(bodyOf(calls[0])).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'P' }, { inline_data: { mime_type: 'image/png', data: 'AAA' } }] }],
      generationConfig: { temperature: 0 }
    });
  });

  it.each([
    ['openai', 'https://api.openai.com/v1/chat/completions'],
    ['deepseek', 'https://api.deepseek.com/chat/completions'],
    ['openrouter', 'https://openrouter.ai/api/v1/chat/completions'],
    ['groq', 'https://api.groq.com/openai/v1/chat/completions'],
    ['grok', 'https://api.x.ai/v1/chat/completions']
  ])('%s: URL cố định, Bearer key', async (provider, url) => {
    respond = () => json({ choices: [{ message: { content: 'OK' } }] });
    expect(await ai.generate('P', creds(provider, { apiUrl: 'https://bo-qua.example' }))).toBe('OK');
    expect(calls[0].url).toBe(url);
    expect((calls[0].init.headers as any).Authorization).toBe('Bearer k1');
    expect(bodyOf(calls[0])).toEqual({ model: 'm1', messages: [{ role: 'user', content: 'P' }], temperature: 0 });
  });

  it('custom: dùng URL người dùng nhập; ảnh gửi dạng image_url', async () => {
    respond = () => json({ choices: [{ message: { content: 'OK' } }] });
    await ai.generate('P', creds('custom', { apiUrl: 'https://my.ai/v1/' }), { images: [img] });
    expect(calls[0].url).toBe('https://my.ai/v1/chat/completions');
    expect(bodyOf(calls[0]).messages[0].content).toEqual([
      { type: 'text', text: 'P' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } }
    ]);
  });

  it('Ollama: URL mặc định, stream false, ảnh base64', async () => {
    respond = () => json({ response: 'OL' });
    expect(await ai.generate('P', creds('local'), { images: [img] })).toBe('OL');
    expect(calls[0].url).toBe('http://localhost:11434/api/generate');
    expect(bodyOf(calls[0])).toEqual({ model: 'm1', prompt: 'P', stream: false, options: { temperature: 0 }, images: ['AAA'] });
  });

  it('nhà cung cấp không hỗ trợ / response rỗng / lỗi HTTP kèm thông điệp', async () => {
    await expect(ai.generate('P', creds('claude'))).rejects.toThrow('Không hỗ trợ AI Provider đã chọn.');
    respond = () => json({ candidates: [] });
    await expect(ai.generate('P', creds('gemini'))).rejects.toThrow('Phản hồi của Gemini API rỗng.');
    respond = () => json({ error: { message: 'API key not valid' } }, 400);
    await expect(ai.generate('P', creds('gemini'))).rejects.toThrow('API key not valid');
    respond = () => json({}, 500);
    await expect(ai.generate('P', creds('openai'))).rejects.toThrow('Lỗi AI API (HTTP 500)');
    await expect(ai.generate('P', creds('local'))).rejects.toThrow('Lỗi Ollama (HTTP 500)');
  });

  it('báo hạn mức còn lại qua sự kiện aiRateLimit', async () => {
    const seen: any[] = [];
    window.addEventListener('aiRateLimit', (e: any) => seen.push(e.detail));
    respond = () => json({ choices: [{ message: { content: 'OK' } }] }, 200, { 'x-ratelimit-remaining-requests': '9' });
    await ai.generate('P', creds('openai'));
    expect(seen).toEqual([{ req: '9', tokens: 'N/A' }]);
  });
});

describe('thử lại khi bị giới hạn lưu lượng', () => {
  it('429 → chờ 6s, 12s rồi thành công; báo trạng thái từng lần', async () => {
    vi.useFakeTimers();
    let n = 0;
    respond = () => (++n <= 2 ? json({}, 429) : json({ choices: [{ message: { content: 'OK' } }] }));
    const status: string[] = [];
    const p = ai.generate('P', creds('openai'), { onStatus: s => status.push(s) });
    await vi.advanceTimersByTimeAsync(6000 + 12000);
    expect(await p).toBe('OK');
    expect(status).toEqual(['Đợi 6s do hết hạn mức AI (1/3)...', 'Đợi 12s do hết hạn mức AI (2/3)...']);
  });

  it('thông điệp "quota" cũng tính là giới hạn; hết lượt → thông báo rõ', async () => {
    vi.useFakeTimers();
    respond = () => json({ error: { message: 'Resource has been exhausted (e.g. check quota).' } }, 400);
    const p = ai.generate('P', creds('gemini'));
    const check = expect(p).rejects.toThrow('Bị giới hạn lưu lượng (Rate Limit) và đã thử lại 3 lần thất bại. Vui lòng đợi và thử lại.');
    await vi.advanceTimersByTimeAsync(6000 + 12000 + 24000);
    await check;
    expect(calls).toHaveLength(4);
  });

  it('lỗi khác không thử lại', async () => {
    respond = () => json({ error: { message: 'bad request' } }, 400);
    await expect(ai.generate('P', creds('openai'))).rejects.toThrow('bad request');
    expect(calls).toHaveLength(1);
  });
});

describe('kiểm tra kết nối', () => {
  const cfg = (provider: string, extra: Partial<AppConfig> = {}) => ({ aiProvider: provider, aiApiKey: 'k1', aiApiUrl: '', aiModelName: 'm1', ...extra });

  it('Gemini: lấy thông tin model; thiếu key → báo', async () => {
    respond = () => json({});
    await ai.test(cfg('gemini'));
    expect(calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/m1?key=k1');
    await expect(ai.test(cfg('gemini', { aiApiKey: '' }))).rejects.toThrow('Chưa cấu hình API Key');
  });

  it('OpenAI / DeepSeek / OpenRouter: GET /models; custom cần Base URL', async () => {
    respond = () => json({ data: [] });
    await ai.test(cfg('deepseek'));
    expect(calls[0].url).toBe('https://api.deepseek.com/models');
    await expect(ai.test(cfg('openai', { aiApiKey: '' }))).rejects.toThrow('Chưa cấu hình API Key');
    await expect(ai.test(cfg('custom'))).rejects.toThrow('Chưa cấu hình Base URL');
    await ai.test(cfg('custom', { aiApiUrl: 'https://my.ai/v1', aiApiKey: '' }));
    expect(calls.at(-1)!.url).toBe('https://my.ai/v1/models');
  });

  it('Ollama: GET /api/tags tại URL nhập (hoặc mặc định)', async () => {
    respond = () => json({ models: [] });
    await ai.test(cfg('local', { aiApiUrl: 'http://pc:11434/' }));
    expect(calls[0].url).toBe('http://pc:11434/api/tags');
  });

  it('lỗi HTTP → thông điệp của nhà cung cấp', async () => {
    respond = () => json({ error: { message: 'Incorrect API key' } }, 401);
    await expect(ai.test(cfg('openai'))).rejects.toThrow('Incorrect API key');
  });

  // ĐÃ SỬA (5.26.4): trước đây Groq / Grok chấm được nhưng kiểm tra kết nối báo "Không hỗ trợ" → trạng thái AI đỏ, khoá nút chấm
  it.each([['groq', 'https://api.groq.com/openai/v1/models'], ['grok', 'https://api.x.ai/v1/models']])('%s: kiểm tra kết nối qua /models', async (provider, url) => {
    respond = () => json({ data: [] });
    await ai.test(cfg(provider));
    expect(calls[0].url).toBe(url);
    await expect(ai.test(cfg(provider, { aiApiKey: '' }))).rejects.toThrow('Chưa cấu hình API Key');
  });

  it('nhà cung cấp không có trong danh sách (vd claude đã ẩn) → báo không hỗ trợ', async () => {
    await expect(ai.test(cfg('claude'))).rejects.toThrow('Không hỗ trợ');
  });
});

describe('tải danh sách model', () => {
  it('Gemini: lọc model sinh nội dung, bỏ embedding, sắp ưu tiên', async () => {
    respond = () => json({ models: [
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'] }
    ] });
    expect(await ai.listModels('gemini', 'k1')).toEqual([
      { label: 'Gemini 2.5 Flash (gemini-2.5-flash)', value: 'gemini-2.5-flash', description: '' },
      { label: 'Gemini 1.5 Pro (gemini-1.5-pro)', value: 'gemini-1.5-pro', description: '' }
    ]);
    expect(await ai.listModels('gemini', '')).toEqual([]);
  });

  it('nhóm tương thích OpenAI: data[].id, cần key (trừ custom); lỗi → rỗng', async () => {
    respond = () => json({ data: [{ id: 'gpt-x' }, { id: '' }] });
    expect(await ai.listModels('deepseek', 'k1')).toEqual([{ label: 'gpt-x', value: 'gpt-x', description: 'gpt-x' }]);
    expect(calls[0].url).toBe('https://api.deepseek.com/models');
    expect(await ai.listModels('openai', '')).toEqual([]);
    await ai.listModels('custom', '', 'https://my.ai/v1');
    expect(calls.at(-1)!.url).toBe('https://my.ai/v1/models');
    respond = () => json({}, 500);
    expect(await ai.listModels('groq', 'k1')).toEqual([]);
  });

  it('Ollama: tên + dung lượng', async () => {
    respond = () => json({ models: [{ name: 'llama3', size: 4 * 1024 * 1024 }] });
    expect(await ai.listModels('local')).toEqual([{ label: 'llama3 (4 MB)', value: 'llama3', description: 'llama3' }]);
  });

  // ĐÃ SỬA (5.26.4): trước đây Grok không tải được model; OpenAI tải theo URL tuỳ chỉnh còn sót lại thay vì URL OpenAI
  it('Grok tải được model; OpenAI luôn dùng URL của OpenAI', async () => {
    respond = () => json({ data: [{ id: 'grok-2' }] });
    expect(await ai.listModels('grok', 'k1')).toEqual([{ label: 'grok-2', value: 'grok-2', description: 'grok-2' }]);
    await ai.listModels('openai', 'k1', 'https://con-sot.example/v1');
    expect(calls.at(-1)!.url).toBe('https://api.openai.com/v1/models');
  });
});

describe('prompt chấm bài', () => {
  it('compressCode gộp dòng trắng, bỏ khoảng trắng cuối dòng', () => {
    expect(compressCode('a  \n\n\n\nb\n')).toBe('a\n\nb\n');
  });

  it('thay biến mẫu (kể cả chuỗi $& trong code), thêm ghi chú ảnh', () => {
    const p = buildGradingPrompt('{{assignment}}|{{criteria}}|{{grading_scale}}|{{strictness}}|{{code}}', 'Đề', 'TC', 'x = "$&"', 2, '100', 'Khắt khe', { sent: [1], missing: [2] });
    expect(p).toMatchSnapshot();
  });

  it('prompt hệ thống rỗng → dùng mẫu mặc định', () => {
    expect(buildGradingPrompt('', 'Đề', 'TC', 'print(1)')).toContain('Đề');
  });
});

describe('registry + chính sách thử lại (mở rộng không sửa code cũ)', () => {
  it('đăng ký nhà cung cấp mới chỉ cần 1 mô tả', async () => {
    const registry = new AiProviderRegistry().register({
      id: 'fake', defaultModel: 'fm', requiresApiKey: false, requiresBaseUrl: false,
      create: () => ({ generate: async (p, m) => `${m}:${p}`, testConnection: async () => {}, listModels: async () => [] })
    });
    const svc = new AiService(registry);
    expect(await svc.generate('hi', { provider: 'fake', modelName: 'x', apiKey: '', apiUrl: '' })).toBe('x:hi');
    expect(svc.describe('fake')?.defaultModel).toBe('fm');
  });

  it('danh sách nhà cung cấp mặc định (không còn claude) + model gợi ý', () => {
    const r = createDefaultAiRegistry();
    expect(r.list().map(d => d.id)).toEqual(['gemini', 'openai', 'deepseek', 'groq', 'grok', 'openrouter', 'local', 'custom']);
    expect(r.get('custom')?.defaultModel).toBeUndefined();
    expect(r.get('groq')?.apiKeyUrl).toBe('https://console.groq.com/keys');
  });

  it('RateLimitRetryPolicy: sleep truyền vào, ghi đè số lần / thời gian chờ', async () => {
    const waits: number[] = [];
    const policy = new RateLimitRetryPolicy(3, 6000, async (ms) => { waits.push(ms); });
    let n = 0;
    expect(await policy.run(async () => { if (++n < 3) throw new RateLimitError(); return 'ok'; }, null, { initialDelayMs: 100 })).toBe('ok');
    expect(waits).toEqual([100, 200]);
    await expect(policy.run(async () => { throw new RateLimitError(); }, null, { maxRetries: 1 })).rejects.toThrow('đã thử lại 1 lần');
  });
});
