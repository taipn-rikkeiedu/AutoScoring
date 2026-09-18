import { GitHubService } from '~/src/services/githubService';
import { buildGradingPrompt, compressCode, callAiWithRateLimitRetry } from '~/src/services/aiService';
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
  const credentials = {
    provider: config.aiProvider,
    modelName: config.aiModelName,
    apiKey: config.aiApiKey,
    apiUrl: config.aiApiUrl
  };
  const report = await callAiWithRateLimitRetry(prompt, credentials, onStatusUpdate);

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
