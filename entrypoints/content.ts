import { highlightLmsTableRows, scrollToElementBelowPopup } from '~/src/core/contentHighlighter';

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  main() {
    console.log("REduX: Content script loaded.");

    let reduxCachedSubmissions: any = null;
    let reduxCachedSingleGrader: any = null;

    const isLmsPage = window.location.hostname.includes('rikkei.edu.vn');

    if (isLmsPage) {
      highlightLmsTableRows();
      const highlightInterval = setInterval(() => {
        if (!chrome.runtime?.id) {
          clearInterval(highlightInterval);
          return;
        }
        highlightLmsTableRows();
      }, 1500);
    }

    // Listener for messages from extension popup/sidepanel
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      try {
        if (message.action === 'scrollToStudent') {
          const { studentId, studentName } = message;
          console.log("REduX: Received request to scroll to student:", studentId, studentName);

          const rows = Array.from(document.querySelectorAll('tr'));
          let matchedRow: HTMLTableRowElement | null = null;

          // First try matching by ID and Name together or individually in table cells
          for (const row of rows as HTMLTableRowElement[]) {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length >= 4) {
              const rowName = cells[1] ? cells[1].textContent?.trim().split('\n')[0] || '' : '';
              const rowId = cells[3] ? cells[3].textContent?.trim().split('\n')[0] || '' : '';
              
              if (studentId && rowId && (rowId === studentId || rowId.includes(studentId) || studentId.includes(rowId))) {
                matchedRow = row;
                break;
              }
              if (studentName && rowName && (rowName === studentName || rowName.includes(studentName) || studentName.includes(rowName))) {
                matchedRow = row;
              }
            }
          }

          // Fallback: search all cells of all rows for exact match of studentId or studentName
          if (!matchedRow) {
            for (const row of rows as HTMLTableRowElement[]) {
              const cells = Array.from(row.querySelectorAll('td, th'));
              for (const cell of cells) {
                const text = cell.textContent?.trim() || '';
                if (studentId && text === studentId) {
                  matchedRow = row;
                  break;
                }
                if (studentName && text === studentName) {
                  matchedRow = row;
                  break;
                }
              }
              if (matchedRow) break;
            }
          }

          if (matchedRow) {
            // Clear previously selected row highlights
            document.querySelectorAll('.redux-selected-row').forEach(row => {
              row.classList.remove('redux-selected-row');
            });

            // Add selected class to current row
            matchedRow.classList.add('redux-selected-row');

            // Scroll below the extension popup
            scrollToElementBelowPopup(matchedRow);
            
            sendResponse({ success: true });
          } else {
            console.log("REduX: Student row not found on page.");
            sendResponse({ success: false, error: "Không tìm thấy dòng học viên trên trang." });
          }
        } else if (message.action === 'getGradingCache') {
          sendResponse({ 
            submissions: Array.isArray(reduxCachedSubmissions) ? reduxCachedSubmissions : null, 
            singleGrader: reduxCachedSingleGrader 
          });
        } else if (message.action === 'updateGradingCache') {
          if (message.submissions !== undefined) {
            reduxCachedSubmissions = Array.isArray(message.submissions) ? message.submissions : null;
          }
          if (message.singleGrader !== undefined) {
            reduxCachedSingleGrader = message.singleGrader;
            // Tự động điền điểm & nhận xét lên trang LMS hiện tại nếu có thay đổi
            const { score, report } = message.singleGrader;
            if (score && report) {
              const comment = extractCommentInContent(report);
              updateLmsPageInputs(score, comment);
            }
          }
          sendResponse({ success: true });
        }
      } catch (err: any) {
        console.error("REduX: Error in message listener:", err);
        sendResponse({ success: false, error: err.message });
      }
      return true;
    });
  }
});

let lastFilledScore = '';
let lastFilledComment = '';

function extractCommentInContent(reportText: string): string {
  if (!reportText) return "";
  const parts = reportText.split(/##\s*(?:ĐÁNH GIÁ|NHẬN XÉT|Ä\s*Ã\s*NH\s*GI\s*Ã|NHáº¬N\s*XÃ‰T)/i);
  if (parts.length > 1) {
    let comment = parts[1].trim();
    comment = comment.split(/---\n/)[0].trim();
    comment = comment.split(/##\s*/)[0].trim();
    comment = comment.replace(/<score>[\s\S]*<\/score>/gi, '').trim();
    return comment;
  }
  return reportText.substring(0, 300);
}

function updateLmsPageInputs(score: string, comment: string): boolean {
  if (score === lastFilledScore && comment === lastFilledComment) {
    return false;
  }

  const inputs = Array.from(document.querySelectorAll('input'));
  let scoreInput = inputs.find(input => input.type === 'number') as HTMLInputElement | null;
  if (!scoreInput) {
    scoreInput = inputs.find(input => {
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      return name.includes('score') || name.includes('diem') || id.includes('score') || id.includes('diem') || placeholder.includes('điểm');
    }) || null;
  }

  const textareas = Array.from(document.querySelectorAll('textarea'));
  let commentInput = textareas[0] as HTMLTextAreaElement | null;
  if (!commentInput) {
    const editables = Array.from(document.querySelectorAll('[contenteditable="true"]')) as HTMLElement[];
    if (editables.length > 0) {
      commentInput = editables[0] as any;
    }
  }

  let isChanged = false;

  if (scoreInput && score) {
    if (scoreInput.value !== score) {
      scoreInput.value = score;
      scoreInput.dispatchEvent(new Event('input', { bubbles: true }));
      scoreInput.dispatchEvent(new Event('change', { bubbles: true }));
      scoreInput.dispatchEvent(new Event('blur', { bubbles: true }));
      lastFilledScore = score;
      isChanged = true;
      console.log("REduX: Auto-filled score:", score);
    }
  }

  if (commentInput && comment) {
    if (commentInput.tagName === 'TEXTAREA' || commentInput.tagName === 'INPUT') {
      if ((commentInput as any).value !== comment) {
        (commentInput as any).value = comment;
        commentInput.dispatchEvent(new Event('input', { bubbles: true }));
        commentInput.dispatchEvent(new Event('change', { bubbles: true }));
        commentInput.dispatchEvent(new Event('blur', { bubbles: true }));
        lastFilledComment = comment;
        isChanged = true;
        console.log("REduX: Auto-filled comment textarea.");
      }
    } else {
      if (commentInput.innerText !== comment) {
        commentInput.innerHTML = comment.replace(/\n/g, '<br>');
        commentInput.dispatchEvent(new Event('input', { bubbles: true }));
        commentInput.dispatchEvent(new Event('change', { bubbles: true }));
        commentInput.dispatchEvent(new Event('blur', { bubbles: true }));
        lastFilledComment = comment;
        isChanged = true;
        console.log("REduX: Auto-filled comment contenteditable.");
      }
    }
  }

  return isChanged;
}
