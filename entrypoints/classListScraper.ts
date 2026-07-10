export default defineUnlistedScript(() => {
  const students: any[] = [];
  const rows = Array.from(document.querySelectorAll('tr'));
  
  let nameColIndex = -1;
  let idColIndex = -1;
  let gradeLinkColIndex = -1;
  let statusColIndex = -1;
  let submittedColIndex = -1;
  let completedColIndex = -1;
  
  const headers = Array.from(document.querySelectorAll('th, thead td'));
  headers.forEach((header, index) => {
    const text = header.textContent?.trim().toLowerCase() || '';
    if (text.includes('tên') || text.includes('họ') || text.includes('sinh viên') || text.includes('học viên') || text.includes('name') || text.includes('student')) {
      if (nameColIndex === -1) nameColIndex = index;
    }
    if (text.includes('mã') || text.includes('id') || text.includes('code') || text.includes('msv') || text.includes('mssv')) {
      if (idColIndex === -1) idColIndex = index;
    }
    if (text.includes('trạng thái') || text.includes('status')) {
      if (statusColIndex === -1) statusColIndex = index;
    }
    if (text.includes('số bài đã nộp') || text.includes('đã nộp') || text.includes('submitted')) {
      if (submittedColIndex === -1) submittedColIndex = index;
    }
    if (text.includes('số bài hoàn thành') || (text.includes('hoàn thành') && text.includes('bài'))) {
      if (completedColIndex === -1) completedColIndex = index;
    }
    if (text.includes('chấm') || text.includes('nộp') || text.includes('grade') || text.includes('action') || text.includes('hành động') || text.includes('chi tiết') || text.includes('xem')) {
      if (gradeLinkColIndex === -1) gradeLinkColIndex = index;
    }
  });

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 2) return;
    
    let studentName = '';
    let studentId = '';
    let submissionUrl = '';
    let lmsStatus = '';
    let submittedCount = 0;
    let completedCount = 0;
    
    if (nameColIndex !== -1 && cells[nameColIndex]) {
      studentName = cells[nameColIndex].textContent?.trim() || '';
    }
    if (idColIndex !== -1 && cells[idColIndex]) {
      studentId = cells[idColIndex].textContent?.trim() || '';
    }
    if (statusColIndex !== -1 && cells[statusColIndex]) {
      const selectEl = cells[statusColIndex].querySelector('select');
      if (selectEl) {
        lmsStatus = selectEl.options[selectEl.selectedIndex]?.textContent?.trim() || '';
      } else {
        lmsStatus = cells[statusColIndex].textContent?.trim() || '';
      }
    }
    if (submittedColIndex !== -1 && cells[submittedColIndex]) {
      const val = parseInt(cells[submittedColIndex].textContent?.trim() || '', 10);
      if (!isNaN(val)) submittedCount = val;
    }
    if (completedColIndex !== -1 && cells[completedColIndex]) {
      const selectEl = cells[completedColIndex].querySelector('select');
      const val = selectEl ? parseInt(selectEl.options[selectEl.selectedIndex]?.textContent?.trim() || '', 10) : parseInt(cells[completedColIndex].textContent?.trim() || '', 10);
      if (!isNaN(val)) completedCount = val;
    }
    
    let actionElement: HTMLElement | null = null;
    let dbId = '';
    if (gradeLinkColIndex !== -1 && cells[gradeLinkColIndex]) {
      actionElement = cells[gradeLinkColIndex].querySelector('a, button, [class*="btn"], [class*="button"]') as HTMLElement | null;
    }
    if (!actionElement) {
      const clickables = Array.from(row.querySelectorAll('a, button, [class*="btn"]')) as HTMLElement[];
      actionElement = clickables.find(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('chi tiết') || text.includes('chấm') || text.includes('xem');
      }) || null;
      if (!actionElement && clickables.length > 0) {
        actionElement = clickables[clickables.length - 1];
      }
    }

    if (actionElement) {
      if (actionElement.tagName.toLowerCase() === 'a' && (actionElement as HTMLAnchorElement).href && !(actionElement as HTMLAnchorElement).href.startsWith('javascript:')) {
        submissionUrl = (actionElement as HTMLAnchorElement).href;
      }
      
      const attrs = ['data-id', 'data-student-id', 'data-user-id', 'student-id', 'user-id', 'id', 'value'];
      for (const attr of attrs) {
        const val = actionElement.getAttribute(attr);
        if (val && val.trim().length > 0 && val.trim().length < 50) {
          dbId = val.trim();
          break;
        }
      }
      
      if (!dbId) {
        const onclick = actionElement.getAttribute('onclick') || '';
        const match = onclick.match(/['"]?([a-zA-Z0-9_\-]+)['"]?\s*\)?$/);
        if (match) {
          dbId = match[1];
        } else {
          const matchDigits = onclick.match(/\d+/);
          if (matchDigits) dbId = matchDigits[0];
        }
      }
    }
    
    if (!submissionUrl) {
      const baseLoc = window.location.href.split('?')[0].split('#')[0].replace(/\/+$/, '');
      if (dbId) {
        submissionUrl = baseLoc + '/student/' + dbId;
      } else if (studentId && studentId !== 'N/A') {
        submissionUrl = baseLoc + '/student/' + studentId;
      }
    }
    
    if (!studentName || !studentId) {
      cells.forEach((cell) => {
        const text = cell.textContent?.trim() || '';
        if (!text) return;
        
        if (text.includes('@')) return;
        
        const isIdPattern = /^[A-Z0-9_\-]{4,15}$/i.test(text);
        if (isIdPattern && !studentId && !isNaN(Number(text.slice(-2)))) {
          studentId = text;
          return;
        }
        
        const words = text.split(/\s+/);
        if (words.length >= 2 && words.length <= 5 && /^[A-ZÀ-Ỹ]/.test(words[0])) {
          const lower = text.toLowerCase();
          const isStatus = lower.includes('đã nộp') || lower.includes('chưa nộp') || lower.includes('đã chấm') || lower.includes('chưa chấm') || lower.includes('đạt') || lower.includes('trực tuyến') || lower.includes('hoàn thành');
          if (!isStatus && !studentName) {
            studentName = text;
          }
        }
      });
    }
    
    if (studentName) {
      studentName = studentName.split('\n')[0].trim();
      studentName = studentName.replace(/^(Học viên|Sinh viên|Học sinh):\s*/i, '');
    }
    
    if (studentId) {
      studentId = studentId.split('\n')[0].trim();
    }
    
    if (submissionUrl && (studentName || studentId)) {
      students.push({
        studentId: studentId || 'N/A',
        studentName: studentName || 'Học viên ẩn danh',
        submissionUrl: submissionUrl.split('?')[0].split('#')[0],
        dbId: dbId || '',
        lmsStatus: lmsStatus || '',
        submittedCount: submittedCount,
        completedCount: completedCount
      });
    }
  });
  
  const uniqueStudents: any[] = [];
  const urls = new Set<string>();
  students.forEach(st => {
    if (!urls.has(st.submissionUrl)) {
      urls.add(st.submissionUrl);
      uniqueStudents.push(st);
    }
  });
  
  return uniqueStudents;
});
