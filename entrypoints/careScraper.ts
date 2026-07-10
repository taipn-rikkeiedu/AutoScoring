export default defineUnlistedScript(() => {
  const students: any[] = [];
  const rows = Array.from(document.querySelectorAll('tr'));
  
  let studentColIndex = -1;
  let subjectColIndex = -1;
  let dateColIndex = -1;
  const headers = Array.from(document.querySelectorAll('th, thead td'));
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
    if (cells.length > studentColIndex && cells.length >= 4) {
      const cell = cells[studentColIndex];
      const lines = (cell.textContent || '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
      
      if (lines.length > 0) {
        const studentName = lines[0];
        const studentId = lines.length > 1 ? lines[1] : 'N/A';

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
