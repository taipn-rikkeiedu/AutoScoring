import { GitHubService } from '~/src/services/github/githubClient';
import { buildGradingPrompt, compressCode } from '~/src/core/prompts/gradingPrompt';
import { credentialsFrom } from '~/src/services/ai/aiService';
import { services } from '~/src/services/container';
import { analyzeCode, ASTMetrics } from '~/src/core/codeAnalysis';
import { proxyFetchText } from '~/src/services/github/backgroundFetch';
import { DEFAULT_CRITERIA, parseScore } from '~/src/core/utils';
import { AppConfig } from '~/src/types';
import { loadAssignmentImages } from '~/src/services/assignmentImages';

export interface GradingResult {
  score: string;
  report: string;
  fileList: string[];
  language?: string;
  astMetrics?: ASTMetrics;
  imagesAttached?: number;
  imagesSkipped?: number;
  /** Số ảnh trong đề đã gửi kèm / không gửi được. */
  assignmentImagesAttached?: number;
  assignmentImagesMissing?: number;
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
  onFilesDownloaded: ((fileList: string[]) => void) | null = null,
  /** Ảnh trong đề (địa chỉ theo thứ tự [Ảnh n]) — tải và gửi kèm cho AI. */
  options: { assignmentImages?: string[] } = {}
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

  // Ảnh trong đề (giao diện mẫu, sơ đồ…) gửi kèm trước ảnh của bài nộp
  const assignmentImgs = options.assignmentImages?.length
    ? await loadAssignmentImages(options.assignmentImages)
    : { images: [], numbers: [], failed: [] };
  const credentials = credentialsFrom(config);
  const callAi = (withAssignmentImages: boolean) => {
    const sent = withAssignmentImages ? assignmentImgs.numbers : [];
    const missing = withAssignmentImages ? assignmentImgs.failed : [...assignmentImgs.numbers, ...assignmentImgs.failed].sort((a, b) => a - b);
    const prompt = buildGradingPrompt(
      config.systemPrompt,
      assignmentText,
      criteriaText || DEFAULT_CRITERIA,
      repoData.content,
      repoData.images.length,
      config.gradingScale,
      config.strictnessLevel,
      { sent, missing }
    );
    const images = withAssignmentImages ? [...assignmentImgs.images, ...repoData.images] : repoData.images;
    return { sent, missing, run: () => services.ai.generate(prompt, credentials, { onStatus: onStatusUpdate, images }) };
  };

  onStatusUpdate?.(`Đang gửi bài nộp tới ${config.aiProvider.toUpperCase()} để chấm điểm...`);
  let attempt = callAi(assignmentImgs.images.length > 0);
  let report: string;
  try {
    report = await attempt.run();
  } catch (e: any) {
    // Model không đọc được ảnh → chấm lại chỉ với phần chữ của đề
    if (!assignmentImgs.images.length || !/image|vision|multimodal|image_url|inline_data|content.*(array|type)|unsupported/i.test(e?.message || '')) throw e;
    onStatusUpdate?.('Model không nhận ảnh của đề — chấm lại chỉ với phần chữ của đề...');
    attempt = callAi(false);
    report = await attempt.run();
  }
  const sentNumbers = attempt.sent;
  const missingNumbers = attempt.missing;

  const scoreStr = parseScore(report) || "0";
  const { language, metrics } = analyzeCode(compressCode(repoData.content));

  return {
    score: scoreStr,
    report,
    fileList: repoData.fileList,
    language,
    astMetrics: metrics,
    imagesAttached: repoData.images.length,
    assignmentImagesAttached: sentNumbers.length,
    assignmentImagesMissing: missingNumbers.length,
    imagesSkipped: repoData.skippedImageCount
  };
}
