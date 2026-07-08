// core/utils.js - Shared parsing and student matching helpers

export function parseScore(reportText) {
  if (!reportText) return null;
  
  let match = reportText.match(/<score>\s*(\d+(?:[.,]\d+)?)\s*<\/score>/i);
  if (match) return match[1].replace(',', '.');

  match = reportText.match(/(\d+(?:[.,]\d+)?)\s*\/\s*100/);
  if (match) return match[1].replace(',', '.');
  
  match = reportText.match(/(?:Tổng điểm|TỔNG|Score|Points):\s*\*{0,2}(\d+(?:[.,]\d+)?)\*{0,2}/i);
  if (match) return match[1].replace(',', '.');
  
  return null;
}

export function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\[\](){}\-_.:,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findMatchingTemplate(scrapedName, exerciseTemplates) {
  if (!scrapedName || !exerciseTemplates) return null;
  
  const normScraped = normalizeText(scrapedName);
  
  const genericNames = [
    'bai tap', 'bai thuc hanh', 'thuc hanh', 'homework', 'project', 'quiz', 'lab',
    'bai tap github', 'bai tap khong ro ten'
  ];
  if (genericNames.includes(normScraped)) {
    return null;
  }
  
  let bestMatch = null;
  let maxScore = 0;
  
  for (const chapter in exerciseTemplates) {
    for (const session in exerciseTemplates[chapter]) {
      for (const assignmentName in exerciseTemplates[chapter][session]) {
        const normTemplate = normalizeText(assignmentName);
        
        let score = 0;
        if (normScraped === normTemplate) {
          score = 100;
        } else if (normScraped.includes(normTemplate) || normTemplate.includes(normScraped)) {
          score = 80 + Math.min(normScraped.length, normTemplate.length) / Math.max(normScraped.length, normTemplate.length) * 10;
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

export function extractComment(reportText) {
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

export const DEFAULT_SYSTEM_PROMPT = `Bạn là chuyên gia chấm điểm mã nguồn. Hãy đánh giá mã nguồn dưới đây theo thang 100 điểm dựa trên ĐỀ BÀI và TIÊU CHÍ.
Hãy thực hiện các bước suy luận sau:
1. Đọc kỹ MÃ NGUỒN và đối chiếu với ĐỀ BÀI.
2. Đánh giá chi tiết từng TIÊU CHÍ chấm bài được cung cấp.
3. Chỉ ra rõ ràng các lỗi sai nếu có (file nào, dòng nào) và giải thích tại sao sai.
4. Đưa ra tổng điểm chính xác dựa trên việc cộng/trừ các lỗi ở trên và bọc tổng điểm cuối cùng trong thẻ <score>[Điểm]</score> ở cuối câu trả lời.

Yêu cầu phản hồi ngắn gọn, đi thẳng vào vấn đề và tuân thủ nghiêm ngặt định dạng Markdown dưới đây. Không viết lời mở đầu, lời chào hay kết luận ngoài mẫu này:

## ĐÁNH GIÁ & NHẬN XÉT CHI TIẾT
- **Sai ở đâu & Dòng nào**: [Chỉ rõ tên file và số dòng cụ thể bị lỗi trong code học viên]
- **Tại sao sai**: [Giải thích ngắn gọn lý do tại sao sai]

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

export function extractCriteriaFromAssignment(assignmentText) {
  if (!assignmentText) return { assignment: '', criteria: null };
  
  const regex = /(?:Tiêu\s*chí\s*chấm\s*(?:bài|điểm)?|Tiêu\s*chí\s*đánh\s*giá|Grading\s*Criteria|AI\s*Criteria|Tiêu\s*chí\s*AI)\s*\(AI\)\s*:{1,2}([\s\S]+)$/i;
  
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

export function mergeScrapedFrameResults(results) {
  let bestRes = null;
  if (!results || results.length === 0) return null;
  for (const frameResult of results) {
    const res = frameResult.result;
    if (res && res.success) {
      if (!bestRes) {
        bestRes = res;
      } else {
        const currentLen = (bestRes.assignment || "").trim().length;
        const newLen = (res.assignment || "").trim().length;
        const isDefaultMsg = (text) => !text || text.includes("Không tìm thấy nội dung đề bài tự động");
        
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

export function matchStudent(studentList, normalizedTabUrl, pageId, pageName, transition) {
  return studentList.find(st => {
    if (st.submissionUrl === normalizedTabUrl) return true;
    if (st.dbId && normalizedTabUrl.includes(st.dbId)) return true;
    if (st.studentId && st.studentId !== 'N/A' && normalizedTabUrl.includes(st.studentId)) return true;
    if (pageId && st.studentId && st.studentId !== 'N/A' && st.studentId.replace(/[\s_-]/g, '').toUpperCase() === pageId.replace(/[\s_-]/g, '').toUpperCase()) return true;
    if (pageName && st.studentName && (st.studentName.toLowerCase().includes(pageName.toLowerCase()) || pageName.toLowerCase().includes(st.studentName.toLowerCase()))) return true;
    if (transition && Date.now() - transition.timestamp < 300000) {
      if (st.studentId && st.studentId !== 'N/A' && transition.studentId && st.studentId.toLowerCase() === transition.studentId.toLowerCase()) return true;
      if (st.studentName && transition.studentName && st.studentName.toLowerCase() === transition.studentName.toLowerCase()) return true;
    }
    return false;
  });
}
