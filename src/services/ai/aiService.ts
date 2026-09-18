import { GRADING_TEXT } from '~/src/core/constants';
import { AppConfig } from '~/src/types';
import { AiClient, API_BASE_URLS } from '~/src/services/api';
import { analyzeCode, buildAstSummary } from '~/src/services/codeAnalysis';

/** Nén code trước khi đưa vào prompt: gộp các dòng trắng liên tiếp thành 1 dòng. */
export function compressCode(codeContent: string): string {
  const lines = codeContent.split('\n');
  const compressed: string[] = [];
  let prevBlank = false;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      if (!prevBlank) compressed.push("");
      prevBlank = true;
    } else {
      prevBlank = false;
      compressed.push(line.trimEnd());
    }
  }
  return compressed.join('\n');
}

/** Build prompt chấm điểm dùng chung cho mọi luồng BYOK (single/bulk grading). */
export function buildGradingPrompt(
  systemPrompt: string,
  assignment: string,
  criteria: string,
  codeContent: string
): string {
  const compressed = compressCode(codeContent);
  const { language, metrics } = analyzeCode(compressed);
  const astSummary = buildAstSummary(language, metrics);

  const template = systemPrompt && systemPrompt.trim().length > 0
    ? systemPrompt
    : GRADING_TEXT.defaultSystemPrompt;

  return template
    .replace("{{assignment}}", assignment)
    .replace("{{criteria}}", criteria)
    .replace("{{ast_summary}}", astSummary)
    .replace("{{code}}", compressed);
}

export interface AiCredentials {
  provider: string;
  modelName: string;
  apiKey: string;
  apiUrl: string;
}

/** Resolve base URL của các provider tương thích OpenAI (openai/deepseek/openrouter dùng URL cố định, custom dùng URL người dùng nhập). */
export function resolveOpenAiCompatibleBaseUrl(provider: string, configuredUrl: string): string {
  if (provider === "openai") return API_BASE_URLS.openAi;
  if (provider === "deepseek") return API_BASE_URLS.deepSeek;
  if (provider === "openrouter") return API_BASE_URLS.openRouter;
  return configuredUrl;
}

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return message === "RATE_LIMIT" || lower.includes("quota") || lower.includes("rate limit") || lower.includes("429") || lower.includes("exhausted");
}

/** Gọi thẳng AI Provider (BYOK) theo config.aiProvider, không retry. Dùng chung cho mọi luồng chấm điểm. */
async function callAiProvider(prompt: string, { provider, modelName, apiKey, apiUrl }: AiCredentials): Promise<string> {
  if (provider === "gemini") {
    return await AiClient.generateGemini(prompt, modelName, apiKey);
  }
  if (provider === "openai" || provider === "deepseek" || provider === "openrouter" || provider === "custom") {
    const baseUrl = resolveOpenAiCompatibleBaseUrl(provider, apiUrl);
    return await AiClient.generateOpenAiCompatible(prompt, modelName, baseUrl, apiKey);
  }
  if (provider === "local") {
    const url = apiUrl && apiUrl.trim() ? apiUrl.trim() : API_BASE_URLS.ollama;
    return await AiClient.generateOllama(prompt, modelName, url);
  }
  throw new Error("Không hỗ trợ AI Provider đã chọn.");
}

/** Gọi AI Provider với retry tự động khi bị rate limit (exponential backoff). Dùng chung cho single/bulk grading. */
export async function callAiWithRateLimitRetry(
  prompt: string,
  credentials: AiCredentials,
  onStatusUpdate: ((status: string) => void) | null = null,
  maxRetries = 3,
  initialDelayMs = 6000
): Promise<string> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await callAiProvider(prompt, credentials);
    } catch (err: any) {
      if (!isRateLimitError(err.message || "")) throw err;

      attempt++;
      if (attempt > maxRetries) {
        throw new Error(`Bị giới hạn lưu lượng (Rate Limit) và đã thử lại ${maxRetries} lần thất bại. Vui lòng đợi và thử lại.`);
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      onStatusUpdate?.(`Đợi ${Math.round(delay / 1000)}s do hết hạn mức AI (${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Không thể tạo báo cáo chấm điểm.");
}

export class AIService {
  private readonly credentials: AiCredentials;
  private readonly systemPrompt: string;

  constructor(config: AppConfig) {
    this.credentials = {
      provider: config.aiProvider,
      modelName: config.aiModelName,
      apiKey: config.aiApiKey,
      apiUrl: config.aiApiUrl
    };
    this.systemPrompt = config.systemPrompt;
  }

  private buildPrompt(assignment: string, criteria: string, codeContent: string): string {
    return buildGradingPrompt(this.systemPrompt, assignment, criteria, codeContent);
  }

  async generateGradingReport(
    assignment: string,
    criteria: string,
    codeContent: string,
    onStatusUpdate: ((status: string) => void) | null = null,
    maxRetries = 3,
    initialDelayMs = 6000
  ): Promise<string> {
    const prompt = this.buildPrompt(assignment, criteria, codeContent);
    return callAiWithRateLimitRetry(prompt, this.credentials, onStatusUpdate, maxRetries, initialDelayMs);
  }
}
