/**
 * Centralized API Endpoints and URL Builder Configuration
 * Quản lý tập trung toàn bộ đường dẫn API của Frontend (AI Providers, GitHub, LMS).
 * Khi cần thay đổi domain, base url hay routing version, chỉ cần sửa tại file này.
 */

export const API_BASE_URLS = {
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  openAi: "https://api.openai.com/v1",
  deepSeek: "https://api.deepseek.com",
  openRouter: "https://openrouter.ai/api/v1",
  ollama: "http://localhost:11434",
  githubApi: "https://api.github.com",
  githubCodeLoad: "https://codeload.github.com",
  lmsPortal: "https://apiportal.rikkei.edu.vn"
} as const;

/**
 * Google Gemini API Routes
 */
export const GEMINI_ENDPOINTS = {
  generateContent: (model: string, apiKey: string) =>
    `${API_BASE_URLS.gemini}/models/${model}:generateContent?key=${apiKey}`,
  modelInfo: (model: string, apiKey: string) =>
    `${API_BASE_URLS.gemini}/models/${model}?key=${apiKey}`,
  listModels: (apiKey: string) =>
    `${API_BASE_URLS.gemini}/models?key=${apiKey}`
};

/**
 * OpenAI Compatible API Routes (OpenAI, DeepSeek, OpenRouter, Custom)
 */
export const OPENAI_COMPATIBLE_ENDPOINTS = {
  chatCompletions: (baseUrl: string = API_BASE_URLS.openAi) =>
    `${baseUrl.replace(/\/+$/, '')}/chat/completions`,
  models: (baseUrl: string = API_BASE_URLS.openAi) =>
    `${baseUrl.replace(/\/+$/, '')}/models`
};

/**
 * Ollama Local AI Routes
 */
export const OLLAMA_ENDPOINTS = {
  generate: (baseUrl: string = API_BASE_URLS.ollama) =>
    `${baseUrl.replace(/\/+$/, '')}/api/generate`,
  tags: (baseUrl: string = API_BASE_URLS.ollama) =>
    `${baseUrl.replace(/\/+$/, '')}/api/tags`
};

/**
 * LMS Portal API Routes
 */
export const LMS_ENDPOINTS = {
  submissions: (sessionId: string) =>
    `${API_BASE_URLS.lmsPortal}/api/v1/sessions/${sessionId}/submissions`
};

/**
 * GitHub API Routes
 */
export const GITHUB_ENDPOINTS = {
  repo: (owner: string, repo: string) =>
    `${API_BASE_URLS.githubApi}/repos/${owner}/${repo}`,
  zipArchive: (owner: string, repo: string, ref: string) =>
    `${API_BASE_URLS.githubCodeLoad}/${owner}/${repo}/zip/refs/heads/${ref}`,
  trees: (owner: string, repo: string, sha: string, recursive: boolean = true) =>
    `${API_BASE_URLS.githubApi}/repos/${owner}/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`,
  blob: (owner: string, repo: string, sha: string) =>
    `${API_BASE_URLS.githubApi}/repos/${owner}/${repo}/git/blobs/${sha}`,
  commits: (owner: string, repo: string, perPage: number = 1) =>
    `${API_BASE_URLS.githubApi}/repos/${owner}/${repo}/commits?per_page=${perPage}`
};
