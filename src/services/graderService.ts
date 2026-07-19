import { GitHubService } from './githubService';
import { AIService } from './aiService';
import { DEFAULT_CRITERIA, parseScore } from '~/src/core/utils';
import { UI_MESSAGES } from '~/src/core/constants';
import { AppConfig } from '~/src/types';

export interface GradingResult {
  score: string;
  report: string;
  fileList: string[];
}

/**
 * Orchestrates downloading code from GitHub and grading it using AI.
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
  const repoData = await github.getRepoContents(githubUrl, onStatusUpdate || (() => {}));

  if (onFilesDownloaded) {
    onFilesDownloaded(repoData.fileList);
  }

  if (onStatusUpdate) {
    onStatusUpdate("AI đang thực hiện chấm điểm...");
  }

  const ai = new AIService(config);
  const report = await ai.generateGradingReport(
    assignmentText,
    criteriaText || DEFAULT_CRITERIA,
    repoData.content,
    onStatusUpdate
  );

  const score = parseScore(report);
  if (!score) {
    throw new Error(UI_MESSAGES.common.invalidScoreResponse);
  }

  return {
    score,
    report,
    fileList: repoData.fileList
  };
}
