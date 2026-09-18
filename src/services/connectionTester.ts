import { AppConfig } from '~/src/types';
import { UI_MESSAGES } from '~/src/core/constants';
import { AiClient, API_BASE_URLS } from './api';

export async function testConnection(config: AppConfig): Promise<boolean> {
  const provider = config.aiProvider;
  const apiKey = config.aiApiKey;
  const apiUrl = config.aiApiUrl;
  const modelName = config.aiModelName;

  if (provider === "gemini") {
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    return await AiClient.testGemini(modelName, apiKey);
  }

  if (provider === "openai") {
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    return await AiClient.testOpenAiCompatible(API_BASE_URLS.openAi, apiKey);
  }

  if (provider === "deepseek") {
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    return await AiClient.testOpenAiCompatible(API_BASE_URLS.deepSeek, apiKey);
  }

  if (provider === "openrouter") {
    if (!apiKey) throw new Error(UI_MESSAGES.common.missingApiKey);
    return await AiClient.testOpenAiCompatible(API_BASE_URLS.openRouter, apiKey);
  }

  if (provider === "custom") {
    if (!apiUrl) throw new Error(UI_MESSAGES.common.missingBaseUrl);
    return await AiClient.testOpenAiCompatible(apiUrl, apiKey);
  }

  if (provider === "local") {
    const url = apiUrl && apiUrl.trim() ? apiUrl.trim() : API_BASE_URLS.ollama;
    return await AiClient.testOllama(url);
  }

  throw new Error(UI_MESSAGES.common.unsupportedAiProvider);
}
