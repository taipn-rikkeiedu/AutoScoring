import { highlightLmsTableRows, scrollToElementBelowPopup } from '~/src/core/contentHighlighter';

export default defineContentScript({
  matches: ["https://qldt.rikkei.edu.vn/*"],
  allFrames: true,
  main() {
    console.log("REduX: Content script loaded.");

    let reduxCachedSubmissions: any = null;
    let reduxCachedSingleGrader: any = null;

    // Run highlighter immediately and periodically
    highlightLmsTableRows();
    setInterval(highlightLmsTableRows, 1500);

    document.addEventListener('click', (event) => {
      // Only monitor clicks on the class list / homework checking page
      if (!window.location.pathname.includes('/homework-checking')) {
        return;
      }
      
      let target = event.target as HTMLElement | null;
      while (target && target !== document.body) {
        const text = target.textContent || '';
        const isButton = target.tagName === 'BUTTON' || 
                         target.tagName === 'A' || 
                         target.classList.contains('btn') || 
                         target.tagName === 'SPAN';
                         
        if (isButton && text.trim().toLowerCase() === 'chi tiết') {
          let row: HTMLElement | null = target;
          while (row && row.tagName !== 'TR') {
            row = row.parentElement;
          }
          
          if (row) {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length >= 4) {
              const studentName = cells[1] ? cells[1].textContent?.trim().split('\n')[0] || '' : '';
              const studentId = cells[3] ? cells[3].textContent?.trim().split('\n')[0] || '' : '';
              
              if (studentName || studentId) {
                const transitionData = {
                  studentId: studentId,
                  studentName: studentName,
                  timestamp: Date.now()
                };
                chrome.storage.local.set({ activeStudentTransition: transitionData }, () => {
                  console.log("REduX: Saved transition student:", transitionData);
                });
              }
            }
          }
          break;
        }
        target = target.parentElement;
      }
    });

    // Listener for messages from extension popup/sidepanel
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
