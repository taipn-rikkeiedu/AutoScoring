// core/contentHighlighter.js - Highlights rows on Rikkei LMS pages dynamically

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
