import { GEMINI_ENDPOINTS, OPENAI_COMPATIBLE_ENDPOINTS, OLLAMA_ENDPOINTS, API_BASE_URLS, normalizeBaseUrl } from './endpoints';

export class AiClient {
  /**
   * Tự động truy vấn danh sách tất cả các Model hợp lệ từ Google GenAI API
   */
  static async fetchGenAiModels(apiKey: string): Promise<{ label: string; value: string; description?: string }[]> {
    if (!apiKey || !apiKey.trim()) return [];
    const url = GEMINI_ENDPOINTS.listModels(apiKey.trim());

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawModels: any[] = data.models || [];

      const validModels = rawModels
        .filter((m: any) => {
          const methods: string[] = m.supportedGenerationMethods || [];
          const name: string = m.name || "";
          return methods.includes("generateContent") && !name.includes("embedding") && !name.includes("aqa") && !name.includes("imagen") && !name.includes("veo");
        })
        .map((m: any) => {
          const cleanId = (m.name || "").replace(/^models\//, "");
          const displayName = m.displayName || cleanId;
          return {
            label: `${displayName} (${cleanId})`,
            value: cleanId,
            description: m.description || ""
          };
        });

      validModels.sort((a, b) => {
        const valA = a.value.toLowerCase();
        const valB = b.value.toLowerCase();
        const score = (v: string) => {
          if (v.includes("3.1") && v.includes("flash")) return 0;
          if (v.includes("gemma") && (v.includes("4") || v.includes("31b"))) return 1;
          if (v.includes("2.5") && v.includes("flash")) return 2;
          if (v.includes("2.5") && v.includes("pro")) return 3;
          if (v.includes("2.0") && v.includes("flash")) return 4;
          if (v.includes("2.0") && v.includes("pro")) return 5;
          if (v.includes("1.5") && v.includes("flash")) return 6;
          if (v.includes("1.5") && v.includes("pro")) return 7;
          return 10;
        };
        return score(valA) - score(valB);
      });

      return validModels;
    } catch (err: any) {
      console.warn("Không thể tải danh sách model từ Google GenAI API:", err);
      return [];
    }
  }

  /**
   * Tự động truy vấn danh sách Model hợp lệ trực tiếp từ API của Provider đã chọn (Google, OpenAI, Anthropic, DeepSeek, Ollama...)
   */
  static async fetchModelsForProvider(
    provider: string,
    apiKey?: string,
    apiUrl?: string,
    fastApiUrl?: string,
    fastApiSecretKey?: string
  ): Promise<{ label: string; value: string; description?: string }[] & { authError?: boolean }> {
    const cleanProvider = (provider || "gemini").toLowerCase().trim();

    // 1. Google Gemini / GenAI (Direct API nếu có key trực tiếp)
    if ((cleanProvider === "gemini" || cleanProvider === "google") && apiKey && apiKey.trim()) {
      return await this.fetchGenAiModels(apiKey.trim());
    }

    // 2. FastAPI Server Mode (Backend tự động gọi trực tiếp Google API bằng Secrets)
    if (cleanProvider === "fastapi_server" || cleanProvider === "gemini") {
      let authError = false;
      try {
        const host = normalizeBaseUrl(fastApiUrl);
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        const token = (fastApiSecretKey || apiKey || "").trim();
        if (token) {
          headers["x-api-key"] = token;
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`${host}/api/v1/models?provider=gemini`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.models && data.models.length > 0) {
            const list = data.models.map((m: any) => ({
              label: m.display_name || m.id,
              value: m.id,
              description: m.description || ""
            }));
            return list;
          }
        } else {
          console.warn(`Lỗi API /models (HTTP ${res.status}):`, await res.text().catch(() => ""));
          authError = res.status === 401;
        }
      } catch (err) {
        console.warn("Lỗi kết nối tới Backend /api/v1/models:", err);
      }
      const fallback: any = [
        { label: "Google Gemini 3.1 Flash Lite (Khuyên dùng - Siêu nhanh & Tiết kiệm)", value: "gemini-3.1-flash-lite", description: "Tốc độ phản hồi tức thì, 1M context, hạn mức cao" },
        { label: "Google Gemma 4 31B (Mã nguồn mở & Suy luận Code)", value: "gemma-4-31b", description: "Mô hình dense 31B đa năng, 256K context, thinking mode" },
        { label: "Google Gemini 2.5 Flash", value: "gemini-2.5-flash", description: "Tốc độ nhanh, phản hồi chính xác" },
        { label: "Google Gemini 2.5 Pro", value: "gemini-2.5-pro", description: "Mô hình suy luận chuyên sâu" },
        { label: "OpenAI GPT-4o Mini", value: "gpt-4o-mini", description: "Mô hình nhanh của OpenAI" },
        { label: "DeepSeek Chat (V3)", value: "deepseek-chat", description: "Mô hình DeepSeek" }
      ];
      fallback.authError = authError;
      return fallback;
    }

    // 3. Anthropic Claude
    if (cleanProvider === "claude" || cleanProvider === "anthropic") {
      if (!apiKey || !apiKey.trim()) return [];
      try {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey.trim(),
            "anthropic-version": "2023-06-01",
            "dangerously-allow-browser": "true"
          }
        });
        if (res.ok) {
          const data = await res.json();
          return (data.data || []).map((m: any) => ({
            label: m.display_name ? `${m.display_name} (${m.id})` : m.id,
            value: m.id,
            description: m.id
          }));
        }
      } catch (e) {
        console.warn("Lỗi tải models từ Anthropic API:", e);
      }
      return [];
    }

    // 4. OpenAI / DeepSeek / OpenRouter / Custom
    if (cleanProvider === "openai" || cleanProvider === "deepseek" || cleanProvider === "openrouter" || cleanProvider === "custom") {
      let baseUrl = apiUrl && apiUrl.trim() ? apiUrl.trim() : API_BASE_URLS.openAi;
      if (cleanProvider === "deepseek") baseUrl = API_BASE_URLS.deepSeek;
      if (cleanProvider === "openrouter") baseUrl = API_BASE_URLS.openRouter;

      if (!apiKey && cleanProvider !== "custom") return [];
      const url = `${baseUrl.replace(/\/+$/, '')}/models`;
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;

      try {
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          const list = data.data || data.models || [];
          return list
            .map((m: any) => ({
              label: m.id || m.name,
              value: m.id || m.name,
              description: m.id || ""
            }))
            .filter((m: any) => Boolean(m.value));
        }
      } catch (e) {
        console.warn("Lỗi tải models từ OpenAI-compatible API:", e);
      }
      return [];
    }

    // 5. Ollama Local
    if (cleanProvider === "local" || cleanProvider === "ollama") {
      const url = `${(apiUrl && apiUrl.trim() ? apiUrl.trim() : API_BASE_URLS.ollama).replace(/\/+$/, '')}/api/tags`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          return (data.models || []).map((m: any) => ({
            label: `${m.name} (${Math.round((m.size || 0) / (1024 * 1024))} MB)`,
            value: m.name,
            description: m.name
          }));
        }
      } catch (e) {
        console.warn("Lỗi tải models từ Ollama:", e);
      }
      return [];
    }

    return [];
  }

  /**
   * Kiểm tra kết nối Google Gemini API
   */
  static async testGemini(model: string, apiKey: string): Promise<boolean> {
    const url = GEMINI_ENDPOINTS.modelInfo(model, apiKey);
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Lỗi Gemini API (HTTP ${res.status})`);
    }
    return true;
  }

  /**
   * Gọi Google Gemini API để chấm điểm
   */
  static async generateGemini(prompt: string, model: string, apiKey: string, temperature: number = 0.0): Promise<string> {
    const url = GEMINI_ENDPOINTS.generateContent(model, apiKey);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature }
      })
    });

    if (response.status === 429) throw new Error("RATE_LIMIT");
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

  /**
   * Kiểm tra kết nối OpenAI Compatible API (OpenAI, DeepSeek, OpenRouter, Custom)
   */
  static async testOpenAiCompatible(baseUrl: string, apiKey?: string): Promise<boolean> {
    const url = OPENAI_COMPATIBLE_ENDPOINTS.models(baseUrl);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Không thể kết nối đến nhà cung cấp AI (HTTP ${res.status})`);
    }
    return true;
  }

  /**
   * Gọi OpenAI Compatible API (OpenAI, DeepSeek, OpenRouter, Custom)
   */
  static async generateOpenAiCompatible(
    prompt: string, 
    model: string, 
    baseUrl: string, 
    apiKey?: string, 
    temperature: number = 0.0
  ): Promise<string> {
    const url = OPENAI_COMPATIBLE_ENDPOINTS.chatCompletions(baseUrl);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature
      })
    });

    if (response.status === 429) throw new Error("RATE_LIMIT");
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

  /**
   * Kiểm tra kết nối Ollama Local Model
   */
  static async testOllama(baseUrl: string = API_BASE_URLS.ollama): Promise<boolean> {
    const url = OLLAMA_ENDPOINTS.tags(baseUrl);
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || `Không thể kết nối đến Ollama (HTTP ${res.status})`);
    }
    return true;
  }

  /**
   * Gọi Ollama Local Model
   */
  static async generateOllama(
    prompt: string, 
    model: string, 
    baseUrl: string = API_BASE_URLS.ollama, 
    temperature: number = 0.0
  ): Promise<string> {
    const url = OLLAMA_ENDPOINTS.generate(baseUrl);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature }
      })
    });

    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (!response.ok) throw new Error(`Lỗi Ollama (HTTP ${response.status})`);

    const data = await response.json();
    const text = data?.response;
    if (!text) throw new Error("Phản hồi của Ollama rỗng.");
    return text;
  }
}
