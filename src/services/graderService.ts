import { GitHubService } from '~/src/services/githubService';
import { buildGradingPrompt, compressCode, callAiWithRateLimitRetry } from '~/src/services/aiService';
import { analyzeCode, ASTMetrics } from '~/src/services/codeAnalysis';
import { proxyFetchText } from '~/src/services/github/backgroundFetch';
import { DEFAULT_CRITERIA, parseScore } from '~/src/core/utils';
import { AppConfig } from '~/src/types';

export interface GradingResult {
  score: string;
  report: string;
  fileList: string[];
  language?: string;
  astMetrics?: ASTMetrics;
  imagesAttached?: number;
  imagesSkipped?: number;
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
  let repoData = { content: "", fileList: [] as string[], images: [] as any[], skippedImageCount: 0 };
  
  if (githubUrl.includes("docs.google.com/document/d/")) {
    const docIdMatch = githubUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (docIdMatch) {
      onStatusUpdate?.("Đang tải nội dung từ Google Docs...");
      const docId = docIdMatch[1];
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      try {
        const text = await proxyFetchText(exportUrl);
        repoData.content = "[NỘI DUNG TÀI LIỆU GOOGLE DOCS]\n" + text;
        repoData.fileList = ["google_doc.txt"];
      } catch (err: any) {
        throw new Error("Lỗi đọc Google Docs (Đảm bảo tài liệu được chia sẻ công khai): " + err.message);
      }
    } else {
      throw new Error("URL Google Docs không hợp lệ.");
    }
  } else {
    const github = new GitHubService(config.githubToken, config.graderIgnoreItems);
    repoData = await github.getRepoContents(githubUrl, (msg) => onStatusUpdate?.(msg));
  }

  if (onFilesDownloaded && repoData.fileList.length > 0) {
    onFilesDownloaded(repoData.fileList);
  }

  onStatusUpdate?.(`Đang gửi bài nộp tới ${config.aiProvider.toUpperCase()} để chấm điểm...`);
  const prompt = buildGradingPrompt(
    config.systemPrompt,
    assignmentText,
    criteriaText || DEFAULT_CRITERIA,
    repoData.content,
    repoData.images.length,
    config.gradingScale,
    config.strictnessLevel
  );
  const credentials = {
    provider: config.aiProvider,
    modelName: config.aiModelName,
    apiKey: config.aiApiKey,
    apiUrl: config.aiApiUrl
  };
  const report = await callAiWithRateLimitRetry(prompt, credentials, onStatusUpdate, 3, 6000, repoData.images);

  const scoreStr = parseScore(report) || "0";
  const { language, metrics } = analyzeCode(compressCode(repoData.content));

  return {
    score: scoreStr,
    report,
    fileList: repoData.fileList,
    language,
    astMetrics: metrics,
    imagesAttached: repoData.images.length,
    imagesSkipped: repoData.skippedImageCount
  };
}
