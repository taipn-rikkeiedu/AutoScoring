import { AppConfig } from '~/src/types';

export async function testConnection(config: AppConfig): Promise<boolean> {
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
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (provider === "openai") {
    if (!apiKey) throw new Error("Chưa cấu hình API Key");
    testUrl = "https://api.openai.com/v1/models";
  } else if (provider === "deepseek") {
    if (!apiKey) throw new Error("Chưa cấu hình API Key");
    testUrl = "https://api.deepseek.com/models";
  } else if (provider === "openrouter") {
    if (!apiKey) throw new Error("Chưa cấu hình API Key");
    testUrl = "https://openrouter.ai/api/v1/models";
  } else if (provider === "custom") {
    if (!apiUrl) throw new Error("Chưa cấu hình Base URL");
    testUrl = `${apiUrl.replace(/\/$/, '')}/models`;
  } else if (provider === "local") {
    if (!apiUrl) throw new Error("Chưa cấu hình Base URL");
    testUrl = `${apiUrl.replace(/\/$/, '')}/api/tags`;
  } else {
    throw new Error("Không hỗ trợ AI Provider đã chọn.");
  }

  const res = await fetch(testUrl, { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Không thể kết nối đến nhà cung cấp AI (HTTP ${res.status})`);
  }
  return true;
}
