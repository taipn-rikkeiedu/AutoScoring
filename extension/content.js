// content.js - Runs locally on qldt.rikkei.edu.vn to track clicked student rows
document.addEventListener('click', (event) => {
  // Only monitor clicks on the class list / homework checking page
  if (!window.location.pathname.includes('/homework-checking')) {
    return;
  }
  
  let target = event.target;
  while (target && target !== document.body) {
    const text = target.textContent || '';
    const isButton = target.tagName === 'BUTTON' || 
                     target.tagName === 'A' || 
                     target.classList.contains('btn') || 
                     target.tagName === 'SPAN';
                     
    if (isButton && text.trim().toLowerCase() === 'chi tiết') {
      let row = target;
      while (row && row.tagName !== 'TR') {
        row = row.parentElement;
      }
      
      if (row) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length >= 4) {
          // Column index 1 is Student Name ("Tên")
          // Column index 3 is Student ID ("MSSV")
          const studentName = cells[1] ? cells[1].textContent.trim().split('\n')[0] : '';
          const studentId = cells[3] ? cells[3].textContent.trim().split('\n')[0] : '';
          
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
  if (message.action === 'scrollToStudent') {
    const { studentId, studentName } = message;
    console.log("REduX: Received request to scroll to student:", studentId, studentName);

    const rows = Array.from(document.querySelectorAll('tr'));
    let matchedRow = null;

    // First try matching by ID and Name together or individually in table cells
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length >= 4) {
        const rowName = cells[1] ? cells[1].textContent.trim().split('\n')[0] : '';
        const rowId = cells[3] ? cells[3].textContent.trim().split('\n')[0] : '';
        
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
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td, th'));
        for (const cell of cells) {
          const text = cell.textContent.trim();
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
  }
  return true;
});

// Inject custom highlight styles once
const reduxStyleId = 'redux-highlight-styles';
if (!document.getElementById(reduxStyleId)) {
  const styleEl = document.createElement('style');
  styleEl.id = reduxStyleId;
  styleEl.textContent = `
    tr.redux-row-pending td, tr.redux-row-pending {
      background-color: #fffbeb !important;
    }
    tr.redux-row-not-completed td, tr.redux-row-not-completed {
      background-color: #fef2f2 !important;
    }
    tr.redux-selected-row td, tr.redux-selected-row {
      background-color: #fca5a5 !important;
      color: #7f1d1d !important;
      font-weight: bold !important;
    }
  `;
  document.head.appendChild(styleEl);
}

// Function to highlight table rows on the main LMS page itself
function highlightLmsTableRows() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    // Find the status column index in this table
    let statusColIndex = -1;
    const headers = Array.from(table.querySelectorAll('th, thead td'));
    headers.forEach((header, index) => {
      const text = header.textContent.trim().toLowerCase();
      if (text.includes('trạng thái') || text.includes('status')) {
        statusColIndex = index;
      }
    });

    const rows = Array.from(table.querySelectorAll('tbody tr, tr'));
    rows.forEach(row => {
      // Skip headers
      if (row.querySelector('th')) return;

      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 2) return;

      let isPending = false;
      let isNotCompleted = false;

      // If status column is found, check only that cell. Otherwise check all cells as fallback.
      if (statusColIndex !== -1 && cells[statusColIndex]) {
        const cell = cells[statusColIndex];
        let text = '';
        const selectEl = cell.querySelector('select');
        if (selectEl) {
          text = selectEl.options[selectEl.selectedIndex]?.textContent.trim().toUpperCase() || '';
        } else {
          text = cell.textContent.trim().toUpperCase();
        }

        if (text.includes('CHỜ KIỂM TRA') || text.includes('ĐANG CHỜ') || text.includes('KIỂM TRA')) {
          isPending = true;
        } else if (text.includes('CHƯA HOÀN THÀNH') || text.includes('CHƯA NỘP') || text === 'CHƯA ĐẠT') {
          isNotCompleted = true;
        }
      } else {
        // Fallback: check all cells
        cells.forEach(cell => {
          let text = '';
          const selectEl = cell.querySelector('select');
          if (selectEl) {
            text = selectEl.options[selectEl.selectedIndex]?.textContent.trim().toUpperCase() || '';
          } else {
            text = cell.textContent.trim().toUpperCase();
          }

          if (text.includes('CHỜ KIỂM TRA') || text.includes('ĐANG CHỜ') || text.includes('KIỂM TRA')) {
            isPending = true;
          } else if (text.includes('CHƯA HOÀN THÀNH') || text.includes('CHƯA NỘP') || text === 'CHƯA ĐẠT') {
            isNotCompleted = true;
          }
        });
      }

      // Update classes instead of direct style properties to avoid CPU reflow overhead
      if (isPending) {
        if (!row.classList.contains('redux-row-pending')) {
          row.classList.add('redux-row-pending');
        }
        if (row.classList.contains('redux-row-not-completed')) {
          row.classList.remove('redux-row-not-completed');
        }
      } else if (isNotCompleted) {
        if (!row.classList.contains('redux-row-not-completed')) {
          row.classList.add('redux-row-not-completed');
        }
        if (row.classList.contains('redux-row-pending')) {
          row.classList.remove('redux-row-pending');
        }
      } else {
        if (row.classList.contains('redux-row-pending')) {
          row.classList.remove('redux-row-pending');
        }
        if (row.classList.contains('redux-row-not-completed')) {
          row.classList.remove('redux-row-not-completed');
        }
      }
    });
  });
}

// Run immediately and periodically to color code dynamic content
highlightLmsTableRows();
window.addEventListener('DOMContentLoaded', highlightLmsTableRows);
window.addEventListener('load', highlightLmsTableRows);
setInterval(highlightLmsTableRows, 1500);

// Helper function to scroll element below the extension popup
function scrollToElementBelowPopup(element) {
  // Find the scrollable ancestor (if any)
  let parent = element.parentElement;
  let scrollContainer = window;
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
      scrollContainer = parent;
      break;
    }
    parent = parent.parentElement;
  }

  if (scrollContainer === window) {
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    // We want the element to sit around 180px above the bottom of the viewport
    // This places it below the 600px tall extension popup.
    const targetScrollTop = absoluteElementTop - (window.innerHeight - 180);
    window.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  } else {
    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const relativeElementTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
    const targetScrollTop = relativeElementTop - (scrollContainer.clientHeight - 100);
    scrollContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  }
}

