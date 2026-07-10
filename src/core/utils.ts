import { Student } from '~/src/types';

export function parseScore(reportText: string | null): string | null {
  if (!reportText) return null;
  
  let match = reportText.match(/<score>\s*(\d+(?:[.,]\d+)?)\s*<\/score>/i);
  if (match) return match[1].replace(',', '.');

  match = reportText.match(/(\d+(?:[.,]\d+)?)\s*\/\s*100/);
  if (match) return match[1].replace(',', '.');
  
  match = reportText.match(/(?:Tổng điểm|TỔNG|Score|Points):\s*\*{0,2}(\d+(?:[.,]\d+)?)\*{0,2}/i);
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

export function findMatchingTemplate(
  scrapedName: string | null,
  exerciseTemplates: Record<string, Record<string, Record<string, any>>> | null
): { chapter: string; session: string; assignmentName: string; matchScore: number } | null {
  if (!scrapedName || !exerciseTemplates) return null;
  
  const normScraped = normalizeText(scrapedName);
  
  const genericNames = [
    'bai tap', 'bai thuc hanh', 'thuc hanh', 'homework', 'project', 'quiz', 'lab',
    'bai tap github', 'bai tap khong ro ten'
  ];
  if (genericNames.includes(normScraped)) {
    return null;
  }
  
  let bestMatch: { chapter: string; session: string; assignmentName: string; matchScore: number } | null = null;
  let maxScore = 0;
  
  for (const chapter in exerciseTemplates) {
    for (const session in exerciseTemplates[chapter]) {
      for (const assignmentName in exerciseTemplates[chapter][session]) {
        const normTemplate = normalizeText(assignmentName);
        
        let score = 0;
        if (normScraped === normTemplate) {
          score = 100;
        } else if (normScraped.includes(normTemplate) || normTemplate.includes(normScraped)) {
          score = 80 + (Math.min(normScraped.length, normTemplate.length) / Math.max(normScraped.length, normTemplate.length)) * 10;
        } else {
          const wordsScraped = normScraped.split(' ').filter(w => w.length > 1);
          const wordsTemplate = normTemplate.split(' ').filter(w => w.length > 1);
          if (wordsScraped.length > 0 && wordsTemplate.length > 0) {
            const intersection = wordsScraped.filter(w => wordsTemplate.includes(w));
            const overlap = intersection.length / Math.max(wordsScraped.length, wordsTemplate.length);
            score = overlap * 70;
          }
        }
        
        if (score > maxScore) {
          maxScore = score;
          bestMatch = { chapter, session, assignmentName, matchScore: score };
        }
      }
    }
  }
  
  return (bestMatch && bestMatch.matchScore >= 30) ? bestMatch : null;
}

export function extractComment(reportText: string | null): string {
  if (!reportText) return '';
  const parts = reportText.split(/##\s*(?:ĐÁNH\s*GIÁ|NHẬN\s*XÉT)/i);
  if (parts.length > 1) {
    let comment = parts[1].trim();
    comment = comment.split(/---\n/)[0].trim();
    comment = comment.split(/##\s*/)[0].trim();
    return comment;
  }
  return reportText.substring(0, 150) + '...';
}

export const DEFAULT_CRITERIA = `Đúng yêu cầu bài toán. Có thể không cần quan tâm phần Yêu cầu nộp bài.`;

export const DEFAULT_SYSTEM_PROMPT = `Bạn là chuyên gia chấm điểm mã nguồn. Hãy đánh giá mã nguồn học viên theo thang 100 điểm dựa trên ĐỀ BÀI và TIÊU CHÍ.

YÊU CẦU QUAN TRỌNG: Phản hồi phải CỰC KỲ NGẮN GỌN, súc tích, đi thẳng vào lỗi sai và lược bỏ mọi từ ngữ thừa, lời chào hay kết luận.

Định dạng phản hồi bắt buộc (tuân thủ 100% Markdown):
## ĐÁNH GIÁ & NHẬN XÉT CHI TIẾT
- [Tên file: Dòng X]: [Giải thích lỗi cực ngắn gọn, tối đa 15 từ]
- [Tên file: Dòng Y]: [Giải thích lỗi cực ngắn gọn, tối đa 15 từ]
(Nếu code hoàn toàn đúng, chỉ ghi duy nhất 1 dòng: "Mã nguồn chính xác, đạt yêu cầu.")

## TỔNG ĐIỂM
Tổng điểm: **[Điểm số]/100**

<score>[Điểm số]</score>

---
ĐỀ BÀI:
{{assignment}}

TIÊU CHÍ:
{{criteria}}

MÃ NGUỒN:
{{code}}`;

export function extractCriteriaFromAssignment(assignmentText: string | null): { assignment: string; criteria: string | null } {
  if (!assignmentText) return { assignment: '', criteria: null };
  
  const regex = /(?:Tiêu\s*chí\s*chấm\s*(?:bài|điểm|thi)?|Tiêu\s*chí\s*đánh\s*giá|Tiêu\s*chí\s*AI|Grading\s*Criteria|AI\s*Criteria|Rubric|Criteria)(?:\s*[\(（]AI[\)）])?\s*:?\s*([\s\S]+)$/i;
  
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

export function mergeScrapedFrameResults(results: any[] | null): any {
  let bestRes: any = null;
  if (!results || results.length === 0) return null;
  for (const frameResult of results) {
    const res = frameResult.result;
    if (res && res.success) {
      if (!bestRes) {
        bestRes = res;
      } else {
        const currentLen = (bestRes.assignment || "").trim().length;
        const newLen = (res.assignment || "").trim().length;
        const isDefaultMsg = (text: string) => !text || text.includes("Không tìm thấy nội dung đề bài tự động");
        
        if (isDefaultMsg(bestRes.assignment) && !isDefaultMsg(res.assignment)) {
          bestRes = res;
        } else if (!isDefaultMsg(res.assignment) && newLen > currentLen) {
          bestRes = res;
        }
        
        if (!bestRes.chapter || bestRes.chapter === "Khóa học mặc định") {
          if (res.chapter && res.chapter !== "Khóa học mặc định") bestRes.chapter = res.chapter;
        }
        if (!bestRes.session || bestRes.session === "Session 01: Nhập môn") {
          if (res.session && res.session !== "Session 01: Nhập môn") bestRes.session = res.session;
        }
        if (!bestRes.assignmentName || bestRes.assignmentName === "Bài tập mới") {
          if (res.assignmentName && res.assignmentName !== "Bài tập mới") bestRes.assignmentName = res.assignmentName;
        }
      }
    }
  }
  return bestRes;
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
