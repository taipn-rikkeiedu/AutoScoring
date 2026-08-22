import { FastApiClient } from '~/src/services/api';
import { DEFAULT_CRITERIA, parseScore } from '~/src/core/utils';
import { UI_MESSAGES } from '~/src/core/constants';
import { AppConfig } from '~/src/types';

export interface GradingResult {
  score: string;
  report: string;
  fileList: string[];
}

/**
 * Điều phối chấm điểm bài tập:
 * Frontend chỉ gọi API xuống Backend.
 * Backend tự động tải mã nguồn GitHub, giải nén ZIP, phân tích AST, gọi AI và lưu CSDL.
 */
export async function gradeSubmission(
  config: AppConfig,
  githubUrl: string,
  assignmentText: string,
  criteriaText: string | null,
  onStatusUpdate: ((status: string) => void) | null = null,
  onFilesDownloaded: ((fileList: string[]) => void) | null = null
): Promise<GradingResult> {
  if (onStatusUpdate) {
    onStatusUpdate("Đang gửi yêu cầu tới FastAPI Server (Backend tự động tải GitHub, phân tích AST & chấm điểm)...");
  }

  let backendProvider = "gemini";
  const lowerModel = (config.aiModelName || "").toLowerCase();
  if (lowerModel.startsWith("gpt") || lowerModel.startsWith("o1") || lowerModel.startsWith("chatgpt")) {
    backendProvider = "openai";
  } else if (lowerModel.startsWith("deepseek")) {
    backendProvider = "deepseek";
  } else {
    backendProvider = "gemini";
  }

  const serverUrl = config.fastApiServerUrl || config.aiApiUrl || undefined;
  const serverKey = config.fastApiSecretKey || config.aiApiKey || undefined;

  const result = await FastApiClient.gradeSubmission({
    github_url: githubUrl,
    github_token: config.githubToken || undefined,
    ignore_items: config.graderIgnoreItems || undefined,
    assignment_name: assignmentText,
    criteria: criteriaText || DEFAULT_CRITERIA,
    system_prompt: config.systemPrompt || undefined,
    provider: backendProvider,
    model_name: config.aiModelName || undefined,
    save_to_supabase: true
  }, serverUrl, serverKey);

  if (onFilesDownloaded && result.file_list && result.file_list.length > 0) {
    onFilesDownloaded(result.file_list);
  }

  let reportText = result.raw_markdown || result.summary_comment || "";
  let scoreStr = result.total_score ? String(result.total_score) : null;

  if (!scoreStr) {
    scoreStr = parseScore(reportText);
  }
  if (!scoreStr) {
    scoreStr = String(result.total_score || 0);
  }

  return {
    score: scoreStr,
    report: reportText,
    fileList: result.file_list || []
  };
}
