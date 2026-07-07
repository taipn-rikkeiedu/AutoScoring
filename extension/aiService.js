import { DEFAULT_SYSTEM_PROMPT } from './utils.js';

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

  async generateGradingReport(assignment, criteria, codeContent) {
    const prompt = this.buildPrompt(assignment, criteria, codeContent);

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

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Lỗi Gemini API (HTTP ${response.status})`);
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

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Lỗi AI API (HTTP ${response.status})`);
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

      if (!response.ok) {
        throw new Error(`Lỗi Ollama (HTTP ${response.status})`);
      }

      const data = await response.json();
      const text = data?.response;
      if (!text) throw new Error("Phản hồi của Ollama rỗng.");
      return text;
    }

    throw new Error("Không hỗ trợ AI Provider đã chọn.");
  }

  static async testConnection(config) {
    const provider = config.aiProvider;
    const apiKey = config.aiApiKey;
    const apiUrl = config.aiApiUrl;
    const modelName = config.aiModelName;

    if (provider === "gemini") {
      if (!apiKey) throw new Error("Chưa cấu hình API Key");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Lỗi Gemini API (HTTP ${res.status})`);
      }
      return true;
    }

    let testUrl = "";
    const headers = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (provider === "deepseek") {
      if (!apiKey) throw new Error("Chưa cấu hình API Key");
      testUrl = "https://api.deepseek.com/models";
    } else if (provider === "openrouter") {
      if (!apiKey) throw new Error("Chưa cấu hình API Key");
      testUrl = "https://openrouter.ai/api/v1/models";
    } else if (provider === "custom") {
      if (!apiUrl) throw new Error("Chưa cấu hình Base URL");
      testUrl = `${apiUrl.replace(/\/$/, '')}/models`;
    } else if (provider === "local") {
      if (!apiUrl) throw new Error("Chưa cấu hình Ollama URL");
      testUrl = `${apiUrl.replace(/\/$/, '')}/api/tags`;
    }

    const res = await fetch(testUrl, { headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Lỗi API (HTTP ${res.status})`);
    }
    return true;
  }
}
