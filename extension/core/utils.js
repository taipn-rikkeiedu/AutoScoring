export function parseScore(reportText) {
  if (!reportText) return null;
  
  // Ưu tiên trích xuất từ thẻ XML <score>
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
    .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese accents
    .replace(/[\[\](){}\-_.:,]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ') // collapse spacing
    .trim();
}

export function findMatchingTemplate(scrapedName, exerciseTemplates) {
  if (!scrapedName || !exerciseTemplates) return null;
  
  const normScraped = normalizeText(scrapedName);
  
  // Bỏ qua các tên bài tập chung chung/fallback để tránh tự động chọn sai đề bài mẫu
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
  
  // Matches variant patterns like "Tiêu chí chấm bài (AI)::", "Tiêu chí chấm (AI):", "Tiêu chí đánh giá (AI)::"
  const regex = /(?:Tiêu\s*chí\s*chấm\s*(?:bài|điểm)?|Tiêu\s*chí\s*đánh\s*giá|Grading\s*Criteria|AI\s*Criteria|Tiêu\s*chí\s*AI)\s*\(AI\)\s*:{1,2}([\s\S]+)$/i;
  
  const match = assignmentText.match(regex);
  if (match) {
    const criteriaText = match[1].trim();
    // Strip the criteria block from the original prompt description
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

export function exportToExcel(data, sheetName, fileName, columnWidths = null) {
  if (typeof XLSX === 'undefined') {
    console.error("Thư viện XLSX chưa được tải.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (columnWidths) {
    worksheet["!cols"] = columnWidths;
  }

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
