export default defineUnlistedScript(() => {
  const submissions: any[] = [];
  
  const rows = document.querySelectorAll('tr');
  if (rows.length > 0) {
    let linkColIndex = -1;
    let nameColIndex = -1;
    const headers = document.querySelectorAll('th, thead td');
    
    headers.forEach((header, index) => {
      const text = header.textContent?.trim().toLowerCase() || '';
      if (linkColIndex === -1 && (text.includes('link') || text.includes('github') || text.includes('liên kết') || text.includes('url'))) {
        if (!text.includes('báo cáo')) {
          linkColIndex = index;
        }
      }
      if (nameColIndex === -1 && (text.includes('tên') || text.includes('học viên') || text.includes('sinh viên') || text.includes('họ tên') || text.includes('thành viên'))) {
        nameColIndex = index;
      }
    });
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        let githubUrl = '';
        let studentName = '';
        
        if (nameColIndex !== -1 && cells[nameColIndex]) {
          const lines = cells[nameColIndex].textContent?.trim().split('\n').map(l => l.trim()).filter(Boolean) || [];
          let extractedName = '';
          if (lines.length > 1 && lines[1] && lines[1] !== 'N/A') {
            extractedName = `${lines[0]} (${lines[1]})`;
          } else if (lines.length > 0) {
            extractedName = lines[0];
          }
          
          if (extractedName && !extractedName.includes('(') && nameColIndex > 0 && cells[nameColIndex - 1]) {
            const prevCellText = cells[nameColIndex - 1].textContent?.trim() || '';
            if (prevCellText.match(/^[a-zA-Z0-9_\-]+$/) && prevCellText.length >= 6) {
              studentName = `${extractedName} (${prevCellText})`;
            } else {
              studentName = extractedName;
            }
          } else {
            studentName = extractedName;
          }
        }
        
        if (linkColIndex !== -1 && cells[linkColIndex]) {
          const a = cells[linkColIndex].querySelector('a[href*="github.com"]') as HTMLAnchorElement | null;
          if (a) githubUrl = a.href;
          else {
            const text = cells[linkColIndex].textContent?.trim() || '';
            if (text.includes('github.com')) githubUrl = text.match(/https?:\/\/[^\s]+/)?.[0] || '';
          }
        }
        
        if (!githubUrl) {
          const a = row.querySelector('a[href*="github.com"]') as HTMLAnchorElement | null;
          if (a) githubUrl = a.href;
        }
        
        if (githubUrl) {
          const cleanGithub = githubUrl.split('?')[0].split('#')[0];
          submissions.push({
            studentName: studentName || 'Học viên ẩn danh',
            githubUrl: cleanGithub,
            exerciseName: 'Mini Project'
          });
        }
      }
    });
  }
  
  if (submissions.length === 0) {
    const gitLinks = document.querySelectorAll('a[href*="github.com"]');
    gitLinks.forEach(a => {
      const href = (a as HTMLAnchorElement).href.split('?')[0].split('#')[0];
      let parent = a.parentElement;
      let sName = '';
      for (let depth = 0; depth < 4; depth++) {
        if (!parent) break;
        const text = parent.innerText || parent.textContent || '';
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        const nameLine = lines.find(l => 
          /^[A-ZÀ-Ỹ]/.test(l.split(' ')[0]) && 
          l.split(' ').length >= 2 && 
          l.split(' ').length <= 5 && 
          !l.includes('github.com')
        );
        if (nameLine) {
          sName = nameLine;
        }
        if (sName) break;
        parent = parent.parentElement;
      }
      submissions.push({
        studentName: sName || 'Học viên ẩn danh',
        githubUrl: href,
        exerciseName: 'Mini Project'
      });
    });
  }
  
  const uniqueSubmissions: any[] = [];
  const seenKeys = new Set<string>();
  submissions.forEach(sub => {
    const key = sub.githubUrl;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueSubmissions.push(sub);
    }
  });
  
  return uniqueSubmissions;
});
