export default defineUnlistedScript(() => {
  const students: any[] = [];
  const tables = Array.from(document.querySelectorAll('table'));
  let mainTable: HTMLTableElement | null = null;

  // Search for the care table matching specific header columns
  for (const table of tables) {
    const headers = Array.from(table.querySelectorAll('th, thead td')).map(el => el.textContent?.trim().toLowerCase() || '');
    const hasStudent = headers.some(t => t.includes('sinh viên') || t.includes('học viên'));
    const hasStatus = headers.some(t => t.includes('trạng thái cs') || t.includes('kết quả') || t.includes('nguyên nhân'));
    if (hasStudent && hasStatus) {
      mainTable = table;
      break;
    }
  }

  // Fallback: match any table with student column
  if (!mainTable) {
    for (const table of tables) {
      const headers = Array.from(table.querySelectorAll('th, thead td')).map(el => el.textContent?.trim().toLowerCase() || '');
      if (headers.some(t => t.includes('sinh viên') || t.includes('học viên'))) {
        mainTable = table;
        break;
      }
    }
  }

  const rows = mainTable ? Array.from(mainTable.querySelectorAll('tbody tr, tr')) : Array.from(document.querySelectorAll('tr'));
  
  let studentColIndex = -1;
  let subjectColIndex = -1;
  let dateColIndex = -1;

  // Get index from the main table if available
  const headersContainer = mainTable || document;
  const headers = Array.from(headersContainer.querySelectorAll('th, thead td'));
  headers.forEach((header, index) => {
    const text = header.textContent?.trim().toLowerCase() || '';
    if (text.includes('sinh viên') || text.includes('học viên') || text.includes('name') || text.includes('student')) {
      studentColIndex = index;
    } else if (text.includes('môn học') || text.includes('subject')) {
      subjectColIndex = index;
    } else if (text.includes('ngày học') || text.includes('ngày') || text.includes('date')) {
      dateColIndex = index;
    }
  });

  if (studentColIndex === -1) studentColIndex = 1;
  if (subjectColIndex === -1) subjectColIndex = 2;
  if (dateColIndex === -1) dateColIndex = 3;

  rows.forEach(row => {
    // Skip headers
    if (row.querySelector('th')) return;

    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length > studentColIndex && cells.length >= 4) {
      const cell = cells[studentColIndex];
      
      // Use innerText to preserve newline block spacing, fallback to textContent
      const rawText = cell.innerText || cell.textContent || '';
      const lines = rawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
      
      if (lines.length > 0) {
        let studentName = lines[0];
        let studentId = lines.length > 1 ? lines[1] : '';

        // If ID is concatenated in textContent fallback, extract it
        if (!studentId && studentName) {
          const match = studentName.match(/^(.*?)([A-Z0-9\-]{4,20})$/);
          if (match) {
            studentName = match[1].trim();
            studentId = match[2].trim();
          }
        }

        if (!studentId) {
          studentId = 'N/A';
        }

        let subjectName = '';
        if (subjectColIndex !== -1 && cells.length > subjectColIndex) {
          subjectName = cells[subjectColIndex].textContent?.trim() || '';
        }
        
        let studyDate = '';
        if (dateColIndex !== -1 && cells.length > dateColIndex) {
          studyDate = cells[dateColIndex].textContent?.trim() || '';
        }
        
        if (studentName && studentName !== 'Sinh viên' && studentName !== 'Student') {
          students.push({
            studentId: studentId,
            studentName: studentName,
            subjectName: subjectName,
            studyDate: studyDate
          });
        }
      }
    }
  });

  const uniqueList: any[] = [];
  const keys = new Set<string>();
  students.forEach(st => {
    const key = `${st.studentId}_${st.subjectName}_${st.studyDate}`;
    if (!keys.has(key)) {
      keys.add(key);
      uniqueList.push(st);
    }
  });

  return uniqueList;
});
