import { AiClient, API_BASE_URLS } from '~/src/services/api';
import { GitHubService } from '~/src/services/githubService';
import { buildGradingPrompt, compressCode } from '~/src/services/aiService';
import { analyzeCode, ASTMetrics } from '~/src/services/codeAnalysis';
import { DEFAULT_CRITERIA, parseScore } from '~/src/core/utils';
import { AppConfig } from '~/src/types';

export interface GradingResult {
  score: string;
  report: string;
  fileList: string[];
  language?: string;
  astMetrics?: ASTMetrics;
}

const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_INITIAL_DELAY_MS = 6000;

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return message === "RATE_LIMIT" || lower.includes("quota") || lower.includes("rate limit") || lower.includes("429") || lower.includes("exhausted");
}

async function callAiWithRetry(
  provider: string,
  prompt: string,
  config: AppConfig,
  onStatusUpdate: ((status: string) => void) | null
): Promise<string> {
  let attempt = 0;
  while (attempt <= RATE_LIMIT_MAX_RETRIES) {
    try {
      if (provider === "gemini") {
        return await AiClient.generateGemini(prompt, config.aiModelName, config.aiApiKey);
      }
      if (provider === "openai" || provider === "deepseek" || provider === "openrouter" || provider === "custom") {
        let baseUrl = config.aiApiUrl;
        if (provider === "openai") baseUrl = API_BASE_URLS.openAi;
        else if (provider === "deepseek") baseUrl = API_BASE_URLS.deepSeek;
        else if (provider === "openrouter") baseUrl = API_BASE_URLS.openRouter;
        return await AiClient.generateOpenAiCompatible(prompt, config.aiModelName, baseUrl, config.aiApiKey);
      }
      if (provider === "local") {
        const url = config.aiApiUrl && config.aiApiUrl.trim() ? config.aiApiUrl.trim() : API_BASE_URLS.ollama;
        return await AiClient.generateOllama(prompt, config.aiModelName, url);
      }
      throw new Error("Không hỗ trợ AI Provider đã chọn.");
    } catch (err: any) {
      if (!isRateLimitError(err.message || "")) throw err;

      attempt++;
      if (attempt > RATE_LIMIT_MAX_RETRIES) {
        throw new Error(`Bị giới hạn lưu lượng (Rate Limit) và đã thử lại ${RATE_LIMIT_MAX_RETRIES} lần thất bại. Vui lòng đợi và thử lại.`);
      }
      const delay = RATE_LIMIT_INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      onStatusUpdate?.(`Đợi ${Math.round(delay / 1000)}s do hết hạn mức AI (${attempt}/${RATE_LIMIT_MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Không thể tạo báo cáo chấm điểm.");
}

/**
 * Điều phối chấm điểm bài tập từ GitHub URL: tự tải + giải nén mã nguồn
 * client-side (JSZip), phân tích AST, rồi gọi trực tiếp AI Provider (BYOK)
 * theo config.aiProvider đã chọn trong Settings.
 */
export async function gradeSubmission(
  config: AppConfig,
  githubUrl: string,
  assignmentText: string,
  criteriaText: string | null,
  onStatusUpdate: ((status: string) => void) | null = null,
  onFilesDownloaded: ((fileList: string[]) => void) | null = null
): Promise<GradingResult> {
  const github = new GitHubService(config.githubToken, config.graderIgnoreItems);
  const repoData = await github.getRepoContents(githubUrl, (msg) => onStatusUpdate?.(msg));

  if (onFilesDownloaded && repoData.fileList.length > 0) {
    onFilesDownloaded(repoData.fileList);
  }

  onStatusUpdate?.(`Đang gửi bài nộp tới ${config.aiProvider.toUpperCase()} để chấm điểm...`);
  const prompt = buildGradingPrompt(
    config.systemPrompt,
    assignmentText,
    criteriaText || DEFAULT_CRITERIA,
    repoData.content
  );
  const report = await callAiWithRetry(config.aiProvider, prompt, config, onStatusUpdate);

  const scoreStr = parseScore(report) || "0";
  const { language, metrics } = analyzeCode(compressCode(repoData.content));

  return {
    score: scoreStr,
    report,
    fileList: repoData.fileList,
    language,
    astMetrics: metrics
  };
}
