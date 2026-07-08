import { DEFAULT_SYSTEM_PROMPT } from '../core/utils.js';

export class AIService {
  constructor(config) {
    this.provider = config.aiProvider;
    this.apiKey = config.aiApiKey;
    this.apiUrl = config.aiApiUrl;
    this.modelName = config.aiModelName;
    this.systemPrompt = config.systemPrompt;
  }

  compressCode(codeContent) {
    const lines = codeContent.split('\n');
    const compressed = [];
    let prevBlank = false;
    
    for (const line of lines) {
      const stripped = line.trim();
      if (!stripped) {
        if (!prevBlank) {
          compressed.push("");
        }
        prevBlank = true;
      } else {
        prevBlank = false;
        compressed.push(line.trimRight());
      }
    }
    return compressed.join('\n');
  }

  buildPrompt(assignment, criteria, codeContent) {
    const compressed = this.compressCode(codeContent);
    const template = this.systemPrompt && this.systemPrompt.trim().length > 0
      ? this.systemPrompt
      : DEFAULT_SYSTEM_PROMPT;

    return template
      .replace("{{assignment}}", assignment)
      .replace("{{criteria}}", criteria)
      .replace("{{code}}", compressed);
  }

  async generateGradingReport(assignment, criteria, codeContent, onStatusUpdate = null, maxRetries = 3, initialDelayMs = 6000) {
    const prompt = this.buildPrompt(assignment, criteria, codeContent);
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        if (this.provider === "gemini") {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2 }
            })
          });

          if (response.status === 429) {
            throw new Error("RATE_LIMIT");
          }

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData?.error?.message || "";
            if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("exhausted")) {
              throw new Error("RATE_LIMIT");
            }
            throw new Error(errMsg || `Lỗi Gemini API (HTTP ${response.status})`);
          }
          
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("Phản hồi của Gemini API rỗng.");
          return text;
        }
        
        if (this.provider === "deepseek" || this.provider === "openrouter" || this.provider === "custom") {
          let baseUrl = this.apiUrl;
          if (this.provider === "deepseek") {
            baseUrl = "https://api.deepseek.com";
          } else if (this.provider === "openrouter") {
            baseUrl = "https://openrouter.ai/api/v1";
          }
          
          const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
          const headers = { 'Content-Type': 'application/json' };
          if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
          }

          const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              model: this.modelName,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2
            })
          });

          if (response.status === 429) {
            throw new Error("RATE_LIMIT");
          }

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData?.error?.message || "";
            if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("exhausted")) {
              throw new Error("RATE_LIMIT");
            }
            throw new Error(errMsg || `Lỗi AI API (HTTP ${response.status})`);
          }

          const data = await response.json();
          const text = data?.choices?.[0]?.message?.content;
          if (!text) throw new Error("Phản hồi của AI Model rỗng.");
          return text;
        }

        if (this.provider === "local") {
          const url = `${this.apiUrl.replace(/\/$/, '')}/api/generate`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.modelName,
              prompt: prompt,
              stream: false
            })
          });

          if (response.status === 429) {
            throw new Error("RATE_LIMIT");
          }

          if (!response.ok) {
            throw new Error(`Lỗi Ollama (HTTP ${response.status})`);
          }

          const data = await response.json();
          const text = data?.response;
          if (!text) throw new Error("Phản hồi của Ollama rỗng.");
          return text;
        }

        throw new Error("Không hỗ trợ AI Provider đã chọn.");
      } catch (err) {
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
          } else {
            console.warn(`Rate limit hit, retrying in ${delay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }
  }
}
