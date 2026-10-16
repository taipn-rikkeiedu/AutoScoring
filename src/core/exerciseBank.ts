/**
 * Kho đề lấy từ API Quản lý đào tạo (QLĐT): mỗi môn → các buổi → các đề (kèm tiêu chí chấm).
 * Lưu trong chrome.storage và chuyển thành exerciseTemplates (Môn → Buổi → Tên đề → {đề, tiêu chí})
 * để các phần chấm điểm dùng như trước.
 */
import { DEFAULT_CRITERIA } from './utils';
import { htmlToMarkdown } from './htmlContent';

export interface BankHomework {
  id: string;
  title: string;
  assignment: string;   // mô tả đề (+ hướng dẫn), dạng Markdown (giữ link, code mẫu, nhãn [Ảnh n])
  criteria: string;     // tiêu chí chấm trên QLĐT, '' nếu chưa nhập
  images?: string[];    // ảnh trong đề (http(s) / data:), khớp nhãn [Ảnh n]
}

export interface BankSession {
  id: string;
  name: string;
  position: number;
  homework: BankHomework[];
}

export interface BankCourse {
  courseId: string;
  courseName: string;
  syncedAt: string;
  sessions: BankSession[];
}

/** courseId → môn đã tải */
export type ExerciseBank = Record<string, BankCourse>;

export type ExerciseTemplates = Record<string, Record<string, Record<string, { assignment: string; criteria: string }>>>;

/** Đề trên QLĐT (HTML) → Markdown giữ link, code mẫu; ảnh đánh số [Ảnh n] liên tục qua mô tả, hướng dẫn, tiêu chí. */
export function toBankHomework(h: any): BankHomework {
  const images: string[] = [];
  const description = htmlToMarkdown(h.description || h.content || '', images);
  const tutorial = htmlToMarkdown(h.tutorial || '', images);
  const criteria = htmlToMarkdown(h.gradingCriteria || h.criteria || '', images);
  return {
    id: String(h.id),
    title: String(h.title || h.name || `Bài ${h.id}`).trim(),
    assignment: tutorial ? `${description}\n\n## HƯỚNG DẪN\n${tutorial}` : description,
    criteria,
    images
  };
}

/** Đổi kho đề sang dạng exerciseTemplates mà các phần chấm điểm đang dùng. Đề chưa có tiêu chí dùng tiêu chí mặc định. */
export function bankToTemplates(bank: ExerciseBank): ExerciseTemplates {
  const templates: ExerciseTemplates = {};
  for (const course of Object.values(bank)) {
    const chapter = (templates[course.courseName] ||= {});
    for (const s of course.sessions) {
      if (!s.homework.length) continue;
      const session = (chapter[s.name] ||= {});
      for (const h of s.homework) {
        session[h.title] = { assignment: h.assignment, criteria: h.criteria || DEFAULT_CRITERIA };
      }
    }
  }
  return templates;
}

export function bankStats(course: BankCourse) {
  const homework = course.sessions.flatMap(s => s.homework);
  return {
    sessions: course.sessions.filter(s => s.homework.length).length,
    homework: homework.length,
    missingCriteria: homework.filter(h => !h.criteria).length
  };
}
