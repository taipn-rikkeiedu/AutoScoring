import { highlightLmsTableRows, scrollToElementBelowPopup } from '~/src/core/contentHighlighter';
import { STORAGE_KEYS } from '~/src/core/constants';

export default defineContentScript({
  matches: ["https://qldt.rikkei.edu.vn/*"],
  allFrames: true,
  main() {
    console.log("REduX: Content script loaded.");

    let reduxCachedSubmissions: any = null;
    let reduxCachedSingleGrader: any = null;

    // Run highlighter immediately and periodically, clear interval if context invalidates
    highlightLmsTableRows();
    const highlightInterval = setInterval(() => {
      if (!chrome.runtime?.id) {
        clearInterval(highlightInterval);
        return;
      }
      highlightLmsTableRows();
    }, 1500);

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

    document.addEventListener('click', clickHandler);

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
  triggerBtn.innerHTML = '🚀 Lối tắt';
  triggerBtn.style.cssText = `
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    border: none;
    border-radius: 9999px;
    padding: 10px 16px;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease-in-out;
  `;

  triggerBtn.addEventListener('mouseenter', () => {
    triggerBtn.style.transform = 'translateY(-2px)';
    triggerBtn.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.5)';
  });
  triggerBtn.addEventListener('mouseleave', () => {
    triggerBtn.style.transform = 'translateY(0)';
    triggerBtn.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.4)';
  });

  const menu = document.createElement('div');
  menu.style.cssText = `
    display: none;
    position: absolute;
    bottom: 50px;
    right: 0;
    width: 260px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(8px);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    padding: 12px;
    flex-direction: column;
    gap: 8px;
    transition: all 0.2s ease;
  `;

  triggerBtn.addEventListener('click', (e) => {
    // If context is invalidated, cleanly remove widget to avoid dead interactions
    if (!chrome.runtime?.id || !chrome.storage?.local) {
      container.remove();
      return;
    }
    e.stopPropagation();
    const isHidden = menu.style.display === 'none';
    menu.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      renderShortcutList(menu);
    }
  });

  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });

  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  container.appendChild(menu);
  container.appendChild(triggerBtn);
  document.body.appendChild(container);
}

function renderShortcutList(menuElement: HTMLDivElement) {
  if (!chrome.runtime?.id || !chrome.storage?.local) {
    return;
  }
  menuElement.innerHTML = `
    <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
      📌 Lối tắt truy cập nhanh
    </div>
  `;

  chrome.storage.local.get(STORAGE_KEYS.customShortcuts, (res) => {
    const list = (res[STORAGE_KEYS.customShortcuts] as any[]) || [];
    if (list.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'font-size: 11px; color: #94a3b8; text-align: center; padding: 12px 0; font-style: italic;';
      emptyDiv.textContent = 'Chưa cấu hình lối tắt nào. Hãy mở popup extension để thêm!';
      menuElement.appendChild(emptyDiv);
      return;
    }

    const sorted = [...list].sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.name.localeCompare(b.name);
    });

    const itemsWrapper = document.createElement('div');
    itemsWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 6px; max-h: 220px; overflow-y: auto;';

    sorted.forEach((item: any) => {
      const itemRow = document.createElement('div');
      itemRow.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-radius: 6px;
        background: #f8fafc;
        border: 1px solid #f1f5f9;
        transition: all 0.15s ease;
        gap: 8px;
      `;

      const titleSpan = document.createElement('span');
      titleSpan.textContent = `${item.isPinned ? '📌 ' : ''}${item.name}`;
      titleSpan.style.cssText = 'font-size: 11px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;';
      titleSpan.title = item.name;

      const goBtn = document.createElement('button');
      goBtn.innerHTML = 'Vào ➔';
      goBtn.style.cssText = `
        background: #0f172a;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 3px 6px;
        font-size: 9px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
      `;
      
      goBtn.addEventListener('click', () => {
        window.location.href = item.url;
      });

      itemRow.appendChild(titleSpan);
      itemRow.appendChild(goBtn);
      itemsWrapper.appendChild(itemRow);
    });

    menuElement.appendChild(itemsWrapper);
  });
}
