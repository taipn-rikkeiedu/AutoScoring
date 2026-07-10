// core/careScraper.js - Injected script to scrape student care info from active tab
(() => {
  const students = [];
  const rows = Array.from(document.querySelectorAll('tr'));
  
  let studentColIndex = -1;
  let subjectColIndex = -1;
  let dateColIndex = -1;
  const headers = Array.from(document.querySelectorAll('th, thead td'));
  headers.forEach((header, index) => {
    const text = header.textContent.trim().toLowerCase();
    if (text.includes('sinh viên') || text.includes('học viên') || text.includes('name') || text.includes('student')) {
      studentColIndex = index;
    } else if (text.includes('môn học') || text.includes('subject')) {
      subjectColIndex = index;
    } else if (text.includes('ngày học') || text.includes('ngày') || text.includes('date')) {
      dateColIndex = index;
    }
  });

  if (studentColIndex === -1) {
    studentColIndex = 1;
  }
  if (subjectColIndex === -1) {
    subjectColIndex = 2;
  }
  if (dateColIndex === -1) {
    dateColIndex = 3;
  }

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length > studentColIndex && cells.length >= 2) {
      const cell = cells[studentColIndex];
      const divs = Array.from(cell.querySelectorAll('div, span, p'));
      let studentName = '';
      let studentId = '';
      
      if (divs.length >= 2) {
        studentName = divs[0].textContent.trim();
        for (let k = 1; k < divs.length; k++) {
          const text = divs[k].textContent.trim();
          if (text && text.length > 0 && !text.includes(studentName)) {
            studentId = text;
            break;
          }
        }
      }
      
      if (!studentName || !studentId) {
        const lines = cell.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        studentName = lines[0] || '';
        studentId = lines[1] || '';
      }

      let subjectName = '';
      if (subjectColIndex !== -1 && cells.length > subjectColIndex) {
        subjectName = cells[subjectColIndex].textContent.trim();
      }
      
      let studyDate = '';
      if (dateColIndex !== -1 && cells.length > dateColIndex) {
        studyDate = cells[dateColIndex].textContent.trim();
      }
      
      if (studentName && studentId && studentName !== 'Sinh viên' && studentName !== 'Student') {
        students.push({
          studentId: studentId.split('\n')[0].trim(),
          studentName: studentName.split('\n')[0].trim(),
          subjectName: subjectName,
          studyDate: studyDate
        });
      }
    }
  });

  const uniqueList = [];
  const keys = new Set();
  students.forEach(st => {
    const key = `${st.studentId}_${st.subjectName}_${st.studyDate}`;
    if (!keys.has(key)) {
      keys.add(key);
      uniqueList.push(st);
    }
  });

  return uniqueList;
})();
