import { GRADING_TEXT } from '~/src/core/constants';
import { analyzeCode, buildAstSummary } from '~/src/core/codeAnalysis';

/** Nén code trước khi đưa vào prompt: gộp các dòng trắng liên tiếp thành 1 dòng. */
export function compressCode(codeContent: string): string {
  const lines = codeContent.split('\n');
  const compressed: string[] = [];
  let prevBlank = false;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      if (!prevBlank) compressed.push("");
      prevBlank = true;
    } else {
      prevBlank = false;
      compressed.push(line.trimEnd());
    }
  }
  return compressed.join('\n');
}

/** Prompt chấm điểm dùng chung cho mọi luồng chấm (hàng loạt, mini project). */
export function buildGradingPrompt(
  systemPrompt: string,
  assignment: string,
  criteria: string,
  codeContent: string,
  imageCount: number = 0,
  gradingScale: string = "10",
  strictness: string = "Bình thường",
  /** Ảnh trong đề gửi kèm (đứng trước ảnh bài nộp): số thứ tự [Ảnh n] đã gửi / không gửi được. */
  assignmentImages: { sent: number[]; missing: number[] } = { sent: [], missing: [] }
): string {
  const compressed = compressCode(codeContent);
  const { language, metrics } = analyzeCode(compressed);
  const astSummary = buildAstSummary(language, metrics);

  const template = systemPrompt && systemPrompt.trim().length > 0
    ? systemPrompt
    : GRADING_TEXT.defaultSystemPrompt;

  // Thay bằng hàm để "$&", "$'"… trong code mẫu / bài nộp không bị hiểu là mẫu thay thế
  let prompt = template
    .replace(/{{assignment}}/g, () => assignment)
    .replace(/{{criteria}}/g, () => criteria)
    .replace(/{{ast_summary}}/g, () => astSummary)
    .replace(/{{code}}/g, () => compressed)
    .replace(/{{grading_scale}}/g, () => gradingScale)
    .replace(/{{strictness}}/g, () => strictness);

  const { sent, missing } = assignmentImages;
  if (sent.length > 0) {
    prompt += `\n\nẢNH TRONG ĐỀ BÀI: ${sent.length} ảnh đính kèm đầu tiên là ảnh minh hoạ của đề, lần lượt là ${sent.map(n => `[Ảnh ${n}]`).join(', ')} (đúng nhãn trong đề). Đây là yêu cầu / mẫu cần làm theo (giao diện, sơ đồ, kết quả mong đợi…), KHÔNG phải bài làm của sinh viên — hãy đối chiếu bài nộp với các ảnh này.`;
  }
  if (missing.length > 0) {
    prompt += `\n\nKhông gửi kèm được ${missing.map(n => `[Ảnh ${n}]`).join(', ')} của đề — chấm theo phần chữ của đề, không trừ điểm vì thiếu thông tin trong các ảnh đó.`;
  }
  if (imageCount > 0) {
    prompt += sent.length
      ? `\n\nLưu ý: ${imageCount} ảnh đính kèm còn lại (sau ảnh của đề) thuộc bài nộp (ảnh nộp trực tiếp hoặc trích từ file .docx, gồm sơ đồ UML/ERD/kiến trúc) — hãy phân tích khi đánh giá phần thiết kế/sơ đồ nếu tiêu chí có yêu cầu.`
      : `\n\nLưu ý: bài nộp có đính kèm ${imageCount} ảnh sơ đồ (có thể là ảnh nộp trực tiếp hoặc trích từ file .docx, bao gồm sơ đồ UML/ERD/kiến trúc) — hãy phân tích các ảnh này khi đánh giá phần thiết kế/sơ đồ nếu tiêu chí có yêu cầu.`;
  }

  return prompt;
}
