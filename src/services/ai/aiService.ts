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

export class AIService {
  private provider: string;
  private apiKey: string;
  private apiUrl: string;
  private modelName: string;
  private systemPrompt: string;

  constructor(config: AppConfig) {
    this.provider = config.aiProvider;
    this.apiKey = config.aiApiKey;
    this.apiUrl = config.aiApiUrl;
    this.modelName = config.aiModelName;
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
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        if (this.provider === "gemini") {
          return await AiClient.generateGemini(prompt, this.modelName, this.apiKey);
        }
        
        if (this.provider === "openai" || this.provider === "deepseek" || this.provider === "openrouter" || this.provider === "custom") {
          let baseUrl = this.apiUrl;
          if (this.provider === "openai") baseUrl = API_BASE_URLS.openAi;
          else if (this.provider === "deepseek") baseUrl = API_BASE_URLS.deepSeek;
          else if (this.provider === "openrouter") baseUrl = API_BASE_URLS.openRouter;
          
          return await AiClient.generateOpenAiCompatible(prompt, this.modelName, baseUrl, this.apiKey);
        }

        if (this.provider === "local") {
          const url = this.apiUrl && this.apiUrl.trim() ? this.apiUrl.trim() : API_BASE_URLS.ollama;
          return await AiClient.generateOllama(prompt, this.modelName, url);
        }

        throw new Error("Không hỗ trợ AI Provider đã chọn.");
      } catch (err: any) {
        const isRateLimit = err.message === "RATE_LIMIT" || 
                            err.message.toLowerCase().includes("quota") || 
                            err.message.toLowerCase().includes("rate limit") || 
                            err.message.toLowerCase().includes("429") ||
                            err.message.toLowerCase().includes("exhausted");

        if (isRateLimit) {
          attempt++;
          if (attempt > maxRetries) {
            throw new Error(`Bị giới hạn lưu lượng (Rate Limit) và đã thử lại ${maxRetries} lần thất bại. Vui lòng đợi và thử lại.`);
          }
          const delay = initialDelayMs * Math.pow(2, attempt - 1);
          if (onStatusUpdate) {
            onStatusUpdate(`Đợi ${Math.round(delay / 1000)}s do hết hạn mức AI (${attempt}/${maxRetries})...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }
    throw new Error("Không thể tạo báo cáo chấm điểm.");
  }
}
