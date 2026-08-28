/**
 * Centralized API Endpoints and URL Builder Configuration
 * Quản lý tập trung toàn bộ đường dẫn API của Frontend (FastAPI, AI Providers, GitHub, LMS, Supabase).
 * Khi cần thay đổi domain, base url hay routing version, chỉ cần sửa tại file này.
 */

export const API_BASE_URLS = {
  fastApi: "http://localhost:8000",
  fastApiPrefix: "/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  openAi: "https://api.openai.com/v1",
  deepSeek: "https://api.deepseek.com",
  openRouter: "https://openrouter.ai/api/v1",
  ollama: "http://localhost:11434",
  githubApi: "https://api.github.com",
  githubCodeLoad: "https://codeload.github.com",
  lmsPortal: "https://apiportal.rikkei.edu.vn",
  supabaseCloud: "https://api.supabase.com/v1"
} as const;

/**
 * Chuẩn hóa Base URL cho FastAPI Server
 * Tự động loại bỏ dấu gạch chéo cuối dòng và tiền tố /api/v1 nếu người dùng đã nhập.
 */
export function normalizeBaseUrl(url?: string, defaultBase: string = API_BASE_URLS.fastApi): string {
  if (!url || !url.trim()) return defaultBase;
  return url.trim().replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
}

/**
 * FastAPI Backend API Routes (REduX AI Core Server)
 */
export const FASTAPI_ENDPOINTS = {
  root: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}/`,
  health: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/health`,
  githubFetch: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/github/fetch`,
  grade: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/grade`,
  gradeStream: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/grade/stream`,
  analyze: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/analyze`,
  ragSync: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/rag/sync`,
  ragSearch: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/rag/search`,
  submissions: (classId?: string, baseUrl?: string) => 
    classId 
      ? `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/submissions?class_id=${encodeURIComponent(classId)}`
      : `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/submissions`,
  submissionsBulk: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/submissions/bulk`,
  careNotes: (classId?: string, baseUrl?: string) => 
    classId
      ? `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/care-notes?class_id=${encodeURIComponent(classId)}`
      : `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/care-notes`,
  careNotesBulk: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/care-notes/bulk`,
  exercises: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/exercises`,
  exercisesSync: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/exercises/sync`,
  dbStatus: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/db/status`,
  dbMigrate: (baseUrl?: string) => `${normalizeBaseUrl(baseUrl)}${API_BASE_URLS.fastApiPrefix}/db/migrate`
};

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

/**
 * Supabase Management API Routes
 */
export const SUPABASE_ENDPOINTS = {
  sqlQuery: (projectRef: string) => 
    `${API_BASE_URLS.supabaseCloud}/projects/${projectRef}/db/query`
};
