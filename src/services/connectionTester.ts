import { AppConfig } from '~/src/types';
import { API_ENDPOINTS, UI_MESSAGES } from '~/src/core/constants';

export async function testConnection(config: AppConfig): Promise<boolean> {
  const provider = config.aiProvider;
  const apiKey = config.aiApiKey;
  const apiUrl = config.aiApiUrl;
  const modelName = config.aiModelName;

  if (provider === "gemini") {
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    const url = `${API_ENDPOINTS.geminiBase}/models/${modelName}?key=${apiKey}`;
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
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    testUrl = `${API_ENDPOINTS.openAiBase}/models`;
  } else if (provider === "deepseek") {
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    testUrl = `${API_ENDPOINTS.deepSeekBase}/models`;
  } else if (provider === "openrouter") {
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    testUrl = `${API_ENDPOINTS.openRouterBase}/models`;
  } else if (provider === "custom") {
    if (!apiUrl) throw new Error(UI_MESSAGES.common.missingBaseUrl);
    testUrl = `${apiUrl.replace(/\/$/, '')}/models`;
  } else if (provider === "local") {
    if (!apiUrl) throw new Error(UI_MESSAGES.common.missingBaseUrl);
    testUrl = `${apiUrl.replace(/\/$/, '')}/api/tags`;
  } else {
    throw new Error(UI_MESSAGES.common.unsupportedAiProvider);
  }

  const res = await fetch(testUrl, { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Không thể kết nối đến nhà cung cấp AI (HTTP ${res.status})`);
  }
  return true;
}
