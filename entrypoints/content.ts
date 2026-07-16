import { highlightLmsTableRows, scrollToElementBelowPopup } from '~/src/core/contentHighlighter';
import { STORAGE_KEYS } from '~/src/core/constants';

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

    if (window === window.top) {
      initializeFloatingWidget();
    }

    const clickHandler = (event: MouseEvent) => {
      // If extension context was invalidated, detach this listener to avoid dead calls
      if (!chrome.runtime?.id || !chrome.storage?.local) {
        document.removeEventListener('click', clickHandler);
        return;
      }

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
                chrome.storage.local.set({ [STORAGE_KEYS.activeStudentTransition]: transitionData }, () => {
                  console.log("REduX: Saved transition student:", transitionData);
                });
              }
            }
          }
          break;
        }
        target = target.parentElement;
      }
    };

    if (isLmsPage) {
      document.addEventListener('click', clickHandler);
    }

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

function initializeFloatingWidget() {
  // Remove existing widget if it exists to clean up dead listeners from invalidated contexts
  const oldContainer = document.getElementById('redux-quick-access-container');
  if (oldContainer) {
    oldContainer.remove();
  }

  const container = document.createElement('div');
  container.id = 'redux-quick-access-container';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  const triggerBtn = document.createElement('button');
  triggerBtn.innerHTML = 'REdux';
  triggerBtn.style.cssText = `
    background: linear-gradient(135deg, rgb(37, 99, 235), rgb(29, 78, 216));
    color: white;
    border-width: medium;
    border-style: none;
    border-color: currentcolor;
    border-image: none;
    border-radius: 9999px;
    padding: 10px 16px;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    box-shadow: rgba(37, 99, 235, 0.4) 0px 4px 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: 0.2s ease-in-out;
    transform: translateY(0px);
  `;

  triggerBtn.addEventListener('mouseenter', () => {
    triggerBtn.style.transform = 'translateY(-2px)';
    triggerBtn.style.boxShadow = 'rgba(37, 99, 235, 0.5) 0px 6px 20px';
  });
  triggerBtn.addEventListener('mouseleave', () => {
    triggerBtn.style.transform = 'translateY(0)';
    triggerBtn.style.boxShadow = 'rgba(37, 99, 235, 0.4) 0px 4px 14px';
  });

  triggerBtn.addEventListener('click', (e) => {
    if (!chrome.runtime?.id) {
      container.remove();
      return;
    }
    e.stopPropagation();
    // Gửi message tới background để mở nhanh extension popup
    chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
  });

  container.appendChild(triggerBtn);
  document.body.appendChild(container);
}
