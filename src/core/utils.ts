import { Student } from '~/src/types';
import { GRADING_TEXT } from './constants';

export function parseScore(reportText: string | null): string | null {
  if (!reportText) return null;
  
  let match = reportText.match(/<score>\s*(\d+(?:[.,]\d+)?)\s*<\/score>/i);
  if (match) return match[1].replace(',', '.');

  match = reportText.match(/(?:Tổng điểm|TỔNG ĐIỂM|Total Score|Score|Points)?:\s*\*{0,2}(\d+(?:[.,]\d+)?)\*{0,2}\s*\/\s*(?:100|10)/i);
  if (match) return match[1].replace(',', '.');

  match = reportText.match(/(?:Tổng điểm|TỔNG ĐIỂM|Total Score|Score|Points):\s*\*{0,2}(\d+(?:[.,]\d+)?)\*{0,2}/i);
  if (match) return match[1].replace(',', '.');

  match = reportText.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(?:100|10)/);
  if (match) return match[1].replace(',', '.');
  
  return null;
}

export function normalizeText(str: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\[\](){}\-_.:,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Từ chung xuất hiện ở hầu hết tên bài, không mang tính phân biệt đề → bỏ khi so khớp tiêu đề.
const MATCH_STOPWORDS = new Set([
  'bai', 'tap', 'thuc', 'hanh', 'session', 'ss', 'buoi', 'phien', 'lesson', 'hoc',
  'homework', 'exercise', 'ex', 'lab', 'project', 'de', 'so', 'va', 'cua', 'cac',
  'voi', 'cho', 'trong', 'la', 'mot', 'nhung', 'the', 'and', 'of', 'to', 'in'
]);

const SESSION_NO_REGEX = /\b(?:session|ss|buoi|phien|lesson|bai hoc|chuong|tuan|week)\s*0*(\d+)\b/;
const EXERCISE_NO_REGEX = /\b(?:bai(?! hoc)(?: tap)?(?: thuc hanh)?|thuc hanh|exercise|ex|lab)\s*0*(\d+)\b/;

interface ParsedExerciseLabel {
  full: string;
  title: string;
  tokens: Set<string>;
  sessionNo: number | null;
  exerciseNo: number | null;
}

/** Bỏ các tiền tố dạng "[Bài tập thực hành 2]", "[Session 05 - ...]" trong tên bài trên trang chấm. */
function stripLabelPrefixes(raw: string): string {
  let text = raw.split('\n')[0].trim();
  for (let i = 0; i < 3 && /^\s*[\[(（]/.test(text); i++) {
    text = text.replace(/^\s*[\[(（][^\])）]*[\])）]\s*[:\-–]?\s*/, '');
  }
  return text;
}

function parseExerciseLabel(raw: string, sessionLabel?: string): ParsedExerciseLabel {
  const full = normalizeText(raw);
  const sessionSource = sessionLabel !== undefined ? normalizeText(sessionLabel) : full;
  const sessionMatch = sessionSource.match(SESSION_NO_REGEX);

  // Số bài chỉ lấy ngoài phần tiền tố trong ngoặc: "[Bài tập thực hành 2]" thường là số đợt, không phải số bài.
  const unprefixed = normalizeText(stripLabelPrefixes(raw));
  const exerciseMatch = unprefixed.replace(SESSION_NO_REGEX, ' ').match(EXERCISE_NO_REGEX);

  // Tiêu đề: bỏ tiền tố trong ngoặc, bỏ "Session xx -", "Bài 2:" ở đầu.
  const title = unprefixed
    .replace(new RegExp('^' + SESSION_NO_REGEX.source + '\\s*'), '')
    .replace(new RegExp('^' + EXERCISE_NO_REGEX.source + '\\s*'), '')
    .trim();
  const tokens = new Set(
    title.split(' ').filter(w => w.length > 1 && !/^\d+$/.test(w) && !MATCH_STOPWORDS.has(w))
  );

  return {
    full,
    title,
    tokens,
    sessionNo: sessionMatch ? parseInt(sessionMatch[1], 10) : null,
    exerciseNo: exerciseMatch ? parseInt(exerciseMatch[1], 10) : null,
  };
}

function diceSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  a.forEach(w => { if (b.has(w)) common++; });
  return (2 * common) / (a.size + b.size);
}

function scoreTemplateMatch(scraped: ParsedExerciseLabel, template: ParsedExerciseLabel): number {
  // Khác Session hoặc khác số bài (khi cả hai bên đều có) → chắc chắn không phải cùng đề.
  if (scraped.sessionNo !== null && template.sessionNo !== null && scraped.sessionNo !== template.sessionNo) return 0;
  if (scraped.exerciseNo !== null && template.exerciseNo !== null && scraped.exerciseNo !== template.exerciseNo) return 0;

  const sessionConfirmed = scraped.sessionNo !== null && scraped.sessionNo === template.sessionNo;
  const exerciseConfirmed = scraped.exerciseNo !== null && scraped.exerciseNo === template.exerciseNo;

  if (scraped.title && scraped.title === template.title) {
    return 90 + (sessionConfirmed ? 5 : 0) + (exerciseConfirmed ? 5 : 0);
  }

  const titleSim = diceSimilarity(scraped.tokens, template.tokens);
  if (titleSim > 0) {
    // Tiêu đề phải giống đủ nhiều; nếu số bài/Session đã khớp thì nới lỏng hơn.
    const minSim = exerciseConfirmed || sessionConfirmed ? 0.4 : 0.6;
    if (titleSim < minSim) return 0;
    return titleSim * 70 + (sessionConfirmed ? 15 : 0) + (exerciseConfirmed ? 15 : 0);
  }

  // Một trong hai bên không có tiêu đề riêng (vd đề chỉ tên "Bài 2"): chỉ chấp nhận khi số bài khớp.
  if ((scraped.tokens.size === 0 || template.tokens.size === 0) && exerciseConfirmed) {
    return 40 + (sessionConfirmed ? 30 : 0);
  }
  return 0;
}

export function findMatchingTemplate(
  scrapedName: string | null,
  exerciseTemplates: Record<string, Record<string, Record<string, any>>> | null
): { chapter: string; session: string; assignmentName: string; matchScore: number } | null {
  if (!scrapedName || !exerciseTemplates) return null;

  const scraped = parseExerciseLabel(scrapedName);
  if (scraped.tokens.size === 0 && scraped.exerciseNo === null) {
    // Tên chung chung ("Bài tập", "Bài tập Github"...) → không đủ thông tin để đoán.
    return null;
  }

  const MIN_SCORE = 50;
  const AMBIGUITY_GAP = 5;
  let best: { chapter: string; session: string; assignmentName: string; matchScore: number } | null = null;
  let secondScore = 0;

  for (const chapter in exerciseTemplates) {
    for (const session in exerciseTemplates[chapter]) {
      for (const assignmentName in exerciseTemplates[chapter][session]) {
        const template = parseExerciseLabel(assignmentName, session);
        const score = scoreTemplateMatch(scraped, template);
        if (score <= 0) continue;

        if (!best || score > best.matchScore) {
          secondScore = best?.matchScore ?? 0;
          best = { chapter, session, assignmentName, matchScore: score };
        } else if (score > secondScore) {
          secondScore = score;
        }
      }
    }
  }

  if (!best || best.matchScore < MIN_SCORE) return null;
  // Nhiều đề điểm sát nhau (vd "Bài 2" ở nhiều Session) → để trống cho người dùng tự chọn thay vì đoán sai.
  if (best.matchScore - secondScore < AMBIGUITY_GAP) return null;
  return best;
}

export function extractComment(reportText: string | null): string {
  if (!reportText) return '';

  // Case 1: Heading style with ## ĐÁNH GIÁ
  const headingParts = reportText.split(/##\s*(?:ĐÁNH\s*GIÁ|NHẬN\s*XÉT|ĐÁNH GIÁ & NHẬN XÉT CHI TIẾT)/i);
  if (headingParts.length > 1) {
    let comment = headingParts[1].trim();
    comment = comment.split(/---\n/)[0].trim();
    comment = comment.split(/##\s*/)[0].trim();
    return comment;
  }

  // Case 2: Clean single paragraph format (before "Tổng điểm:" or "<score>")
  let comment = reportText;
  comment = comment.split(/(?:Tổng điểm|TỔNG ĐIỂM|Total Score|Score):/i)[0].trim();
  comment = comment.split(/<score>/i)[0].trim();
  if (comment && comment.length > 0) {
    return comment;
  }

  return reportText.substring(0, 150) + '...';
}

export const DEFAULT_CRITERIA = GRADING_TEXT.defaultCriteria;
export const DEFAULT_SYSTEM_PROMPT = GRADING_TEXT.defaultSystemPrompt;

export function extractCriteriaFromAssignment(assignmentText: string | null): { assignment: string; criteria: string | null } {
  if (!assignmentText) return { assignment: '', criteria: null };
  
  const regex = /(?:Tiêu\s*chí\s*chấm\s*(?:bài|điểm|thi)?|Tiêu\s*chí\s*đánh\s*giá|Tiêu\s*chí\s*AI|Tieu\s*chi\s*cham\s*(?:bai|diem|thi)?|Tieu\s*chi\s*danh\s*gia|Tieu\s*chi\s*AI|Grading\s*Criteria|AI\s*Criteria|Rubric|Criteria)(?:\s*[\(（]AI[\)）])?\s*:?\s*([\s\S]+)$/i;
  
  const match = assignmentText.match(regex);
  if (match) {
    const criteriaText = match[1].trim();
    const cleanAssignment = assignmentText.replace(regex, '').trim();
    return {
      assignment: cleanAssignment,
      criteria: criteriaText
    };
  }
  
  return {
    assignment: assignmentText,
    criteria: null
  };
}

export function matchStudent(
  studentList: Student[],
  normalizedTabUrl: string,
  pageId: string | null,
  pageName: string | null,
  transition: { studentId?: string; studentName?: string; timestamp: number } | null
): Student | undefined {
  return studentList.find(st => {
    if (st.submissionUrl === normalizedTabUrl) return true;
    if (st.dbId && normalizedTabUrl.includes(st.dbId)) return true;
    if (st.studentId && st.studentId !== 'N/A' && normalizedTabUrl.includes(st.studentId)) return true;
    
    if (pageId && st.studentId && st.studentId !== 'N/A') {
      const cleanStId = st.studentId.replace(/[\s_-]/g, '').toUpperCase();
      const cleanPageId = pageId.replace(/[\s_-]/g, '').toUpperCase();
      if (cleanStId === cleanPageId) return true;
    }
    
    if (pageName && st.studentName) {
      const cleanStName = st.studentName.toLowerCase();
      const cleanPageName = pageName.toLowerCase();
      if (cleanStName.includes(cleanPageName) || cleanPageName.includes(cleanStName)) return true;
    }
    
    if (transition && Date.now() - transition.timestamp < 300000) {
      if (st.studentId && st.studentId !== 'N/A' && transition.studentId && st.studentId.toLowerCase() === transition.studentId.toLowerCase()) return true;
      if (st.studentName && transition.studentName && st.studentName.toLowerCase() === transition.studentName.toLowerCase()) return true;
    }
    return false;
  });
}

/**
 * Lấy tab đang active mà người dùng thực sự làm việc (trang LMS).
 *
 * Không dùng `currentWindow`/`lastFocusedWindow`: khi extension chạy ở dạng
 * cửa sổ nổi (floating window, xem OPEN_FLOATING_WINDOW trong background.ts),
 * cửa sổ nổi đó (window.type = "popup") đang là cửa sổ có focus tại thời
 * điểm gọi API, nên cả `currentWindow` lẫn `lastFocusedWindow` đều trỏ
 * ngược vào chính nó (tức trang popup.html của extension) thay vì cửa sổ
 * trình duyệt chính chứa trang LMS phía sau, khiến mọi thao tác quét/điều
 * hướng nhắm nhầm tab.
 *
 * Cách đáng tin cậy: liệt kê tất cả cửa sổ có `windowTypes: ['normal']`
 * (loại trừ hẳn cửa sổ popup của chính extension, dù nó có focus hay
 * không), rồi lấy tab active trong cửa sổ normal đang focus gần nhất
 * (fallback cửa sổ normal đầu tiên nếu không cửa sổ nào đang focus).
 */
export function queryActiveLmsTab(callback: (tab: chrome.tabs.Tab | undefined) => void): void {
  chrome.windows.getAll({ windowTypes: ['normal'], populate: true }, (windows) => {
    // 1. Lấy cửa sổ normal đang có focus (thường không có nếu popup đang focus)
    let targetWindow = windows.find(w => w.focused);
    
    // 2. Nếu không có, tìm cửa sổ normal có active tab là rikkei.edu.vn
    if (!targetWindow) {
      targetWindow = windows.find(w => {
        const activeTab = w.tabs?.find(t => t.active);
        return activeTab?.url?.includes('rikkei.edu.vn') || activeTab?.url?.includes('localhost');
      });
    }

    // 3. Fallback: cửa sổ đầu tiên
    if (!targetWindow) {
      targetWindow = windows[0];
    }

    const activeTab = targetWindow?.tabs?.find(t => t.active);
    callback(activeTab);
  });
}

/**
 * Safe navigation utility to handle SPA redirects inside Chrome extension.
 * Sends a message to the background service worker to perform navigation and reload safely
 * without being interrupted if the popup closes.
 */
export function safeNavigate(targetUrl: string): void {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    window.location.href = targetUrl;
    return;
  }

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tabId = tabs?.[0]?.id;
    const currentUrl = tabs?.[0]?.url || '';
    chrome.runtime.sendMessage({ 
      type: "SAFE_NAVIGATE", 
      targetUrl, 
      tabId, 
      currentUrl 
    });
  });
}
