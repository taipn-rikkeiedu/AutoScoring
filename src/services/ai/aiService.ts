import { GRADING_TEXT } from '~/src/core/constants';
import { AppConfig } from '~/src/types';
import { FastApiClient, AiClient, API_BASE_URLS } from '~/src/services/api';

export class AIService {
  private provider: string;
  private apiKey: string;
  private apiUrl: string;
  private fastApiServerUrl: string;
  private fastApiSecretKey: string;
  private modelName: string;
  private systemPrompt: string;
  private googleApiKey: string;

  constructor(config: AppConfig) {
    this.provider = config.aiProvider;
    this.apiKey = config.aiApiKey;
    this.apiUrl = config.aiApiUrl;
    this.fastApiServerUrl = config.fastApiServerUrl || config.aiApiUrl;
    this.fastApiSecretKey = config.fastApiSecretKey || config.aiApiKey;
    this.modelName = config.aiModelName;
    this.systemPrompt = config.systemPrompt;
    this.googleApiKey = config.googleApiKey || "";
  }

  private compressCode(codeContent: string): string {
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

  private buildPrompt(assignment: string, criteria: string, codeContent: string): string {
    const compressed = this.compressCode(codeContent);
    const template = this.systemPrompt && this.systemPrompt.trim().length > 0
      ? this.systemPrompt
      : GRADING_TEXT.defaultSystemPrompt;

    return template
      .replace("{{assignment}}", assignment)
      .replace("{{criteria}}", criteria)
      .replace("{{code}}", compressed);
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

        if (this.provider === "fastapi_server") {
          let backendProvider = "gemini";
          const lowerModel = (this.modelName || "").toLowerCase();
          if (lowerModel.startsWith("gpt") || lowerModel.startsWith("o1") || lowerModel.startsWith("chatgpt")) {
            backendProvider = "openai";
          } else if (lowerModel.startsWith("deepseek")) {
            backendProvider = "deepseek";
          } else {
            backendProvider = "gemini";
          }

          if (onStatusUpdate) onStatusUpdate("Đang gửi bài nộp tới REduX FastAPI Server để phân tích AST & chấm điểm...");

          // Nếu chưa cấu hình system prompt riêng, dùng prompt ngắn gọn mặc định của
          // extension thay vì để trống — để trống sẽ khiến backend rơi về prompt JSON
          // chi tiết (DEFAULT_SYSTEM_PROMPT) vốn khiến Gemini mất nhiều thời gian suy luận hơn.
          const effectiveSystemPrompt = this.systemPrompt && this.systemPrompt.trim().length > 0
            ? this.systemPrompt
            : GRADING_TEXT.defaultSystemPrompt;

          const data = await FastApiClient.gradeSubmission({
            assignment_name: assignment,
            criteria: criteria,
            code_content: codeContent,
            system_prompt: effectiveSystemPrompt,
            provider: backendProvider,
            model_name: this.modelName || undefined,
            api_key: this.googleApiKey ? this.googleApiKey.trim() : undefined
          }, this.fastApiServerUrl, this.fastApiSecretKey);

          if (data.raw_markdown) return data.raw_markdown;
          if (data.summary_comment) {
            let output = data.summary_comment;
            if (data.criteria_details && data.criteria_details.length > 0) {
              output += "\n\n### Tiêu chí chi tiết:\n" + data.criteria_details.map((c: any) => `- ${c.passed ? '✅' : '❌'} **${c.name}** (${c.score}/${c.max_score}đ): ${c.comment}`).join('\n');
            }
            output += `\n\nTổng điểm: ${data.total_score}/100`;
            return output;
          }
          throw new Error("Phản hồi từ FastAPI Server rỗng.");
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
