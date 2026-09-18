import { AppConfig } from '~/src/types';
import { UI_MESSAGES } from '~/src/core/constants';
import { AiClient, API_BASE_URLS } from './api';
import { resolveOpenAiCompatibleBaseUrl } from './aiService';

export async function testConnection(config: AppConfig): Promise<boolean> {
  const provider = config.aiProvider;
  const apiKey = config.aiApiKey;
  const apiUrl = config.aiApiUrl;
  const modelName = config.aiModelName;

  if (provider === "gemini") {
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    return await AiClient.testGemini(modelName, apiKey);
  }

  if (provider === "openai" || provider === "deepseek" || provider === "openrouter" || provider === "custom") {
    if (provider === "custom") {
      if (!apiUrl) throw new Error(UI_MESSAGES.common.missingBaseUrl);
    } else if (!apiKey) {
      throw new Error(UI_MESSAGES.common.missingApiKey);
    }
    return await AiClient.testOpenAiCompatible(resolveOpenAiCompatibleBaseUrl(provider, apiUrl), apiKey);
  }

  if (provider === "local") {
    const url = apiUrl && apiUrl.trim() ? apiUrl.trim() : API_BASE_URLS.ollama;
    return await AiClient.testOllama(url);
  }

  throw new Error(UI_MESSAGES.common.unsupportedAiProvider);
}
