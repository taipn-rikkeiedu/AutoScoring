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
