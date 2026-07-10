export default defineUnlistedScript(() => {
  const submissions: any[] = [];
  
  let pageExerciseName = "";
  const activeSelectors = [
    '.ant-tree-node-selected', 
    '.is-active', 
    '.active', 
    '.selected', 
    '[class*="node-selected"]', 
    '[class*="menu-item-selected"]',
    '[class*="active-menu"]'
  ];
  
  let activeNode: HTMLElement | null = null;
  for (const selector of activeSelectors) {
    activeNode = document.querySelector(selector);
    if (activeNode && (activeNode.textContent?.trim().length || 0) > 3) {
      break;
    }
  }
  
  if (activeNode) {
    const clone = activeNode.cloneNode(true) as HTMLElement;
    const extra = clone.querySelectorAll('button, a, input, svg, i, [class*="btn"], [class*="button"], [class*="icon"]');
    extra.forEach(el => el.remove());
    pageExerciseName = clone.textContent?.trim().split('\n')[0].trim() || '';
    pageExerciseName = pageExerciseName.replace(/^[\[\]0-9a-zA-Z\s\-]+Thực hành\s*\d*\]\s*/i, '');
    pageExerciseName = pageExerciseName.replace(/^\[[^\]]+\]\s*/, '');
  }
  
  if (!pageExerciseName) {
    const pageTitle = document.querySelector('.title, .header, h2, h1');
    if (pageTitle) {
      pageExerciseName = pageTitle.textContent?.trim().split('\n')[0].trim() || '';
    }
  }

  const rows = document.querySelectorAll('tr');
  if (rows.length > 0) {
    let exerciseColIndex = -1;
    let linkColIndex = -1;
    let nameColIndex = -1;
    const headers = document.querySelectorAll('th, thead td');
    
    headers.forEach((header, index) => {
      const text = header.textContent?.trim().toLowerCase() || '';
      if (text.includes('bài tập') || text.includes('đề bài') || text.includes('tên bài')) {
        exerciseColIndex = index;
      }
      if (text.includes('link') || text.includes('github') || text.includes('liên kết')) {
        linkColIndex = index;
      }
      if (text.includes('tên') || text.includes('học viên') || text.includes('sinh viên') || text.includes('họ tên')) {
        if (!text.includes('bài tập') && !text.includes('đề bài')) {
          nameColIndex = index;
        }
      }
    });
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        let githubUrl = '';
        let exerciseName = '';
        let studentName = '';
        
        if (exerciseColIndex !== -1 && cells[exerciseColIndex]) {
          exerciseName = cells[exerciseColIndex].textContent?.trim() || '';
        } else if (pageExerciseName) {
          exerciseName = pageExerciseName;
        }
        
        if (nameColIndex !== -1 && cells[nameColIndex]) {
          const lines = cells[nameColIndex].textContent?.trim().split('\n').map(l => l.trim()).filter(Boolean) || [];
          if (lines.length > 1 && lines[1] && lines[1] !== 'N/A') {
            studentName = `${lines[0]} (${lines[1]})`;
          } else if (lines.length > 0) {
            studentName = lines[0];
          }
        }
        
        if (linkColIndex !== -1 && cells[linkColIndex]) {
          const a = cells[linkColIndex].querySelector('a[href*="github.com"]') as HTMLAnchorElement | null;
          if (a) githubUrl = a.href;
        }
        
        if (!githubUrl) {
          const a = row.querySelector('a[href*="github.com"]') as HTMLAnchorElement | null;
          if (a) githubUrl = a.href;
        }
        
        if ((nameColIndex !== -1 && !studentName) || !exerciseName) {
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i].textContent?.trim() || '';
            if (cellText && 
                !cellText.includes('http') && 
                !cellText.includes('Github') && 
                !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(cellText) && 
                !/^[a-zA-Z0-9.\-_]{1,5}$/.test(cellText)) {
              const lower = cellText.toLowerCase();
              const isStatus = ['đã nộp', 'chưa nộp', 'xem github', 'chưa có nhận xét', 'sửa nhận xét'].includes(lower);
              if (!isStatus) {
                if (nameColIndex !== -1 && !studentName && /^[A-ZÀ-Ỹ]/.test(cellText.split(' ')[0])) {
                   studentName = cellText.split('\n')[0].trim();
                } else if (!exerciseName) {
                   exerciseName = cellText.split('\n')[0].trim();
                }
              }
            }
          }
        }
        
        if (githubUrl) {
          const cleanGithub = githubUrl.split('?')[0].split('#')[0];
          submissions.push({
            exerciseName: exerciseName || pageExerciseName || 'Bài tập Github',
            studentName: studentName || '',
            githubUrl: cleanGithub
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
      let labelText = '';
      let sName = '';
      for (let depth = 0; depth < 4; depth++) {
        if (!parent) break;
        const text = parent.innerText || parent.textContent || '';
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const exerciseLine = lines.find(l => 
          (l.includes('Bài tập') || l.includes('Bài ') || l.includes('API') || l.includes('[')) && 
          !l.includes('github.com')
        );
        if (exerciseLine) {
          labelText = exerciseLine;
        }
        
        const nameLine = lines.find(l => 
          /^[A-ZÀ-Ỹ]/.test(l.split(' ')[0]) && 
          l.split(' ').length >= 2 && 
          l.split(' ').length <= 5 && 
          !l.includes('Bài tập') && !l.includes('Bài ') && !l.includes('API') && !l.includes('[') && !l.includes('github.com')
        );
        if (nameLine) {
          sName = nameLine;
        }
        if (labelText && sName) break;
        parent = parent.parentElement;
      }
      submissions.push({
        exerciseName: labelText || pageExerciseName || 'Bài tập Github',
        studentName: sName || '',
        githubUrl: href
      });
    });
  }
  
  const uniqueSubmissions: any[] = [];
  const urls = new Set<string>();
  submissions.forEach(sub => {
    if (!urls.has(sub.githubUrl)) {
      urls.add(sub.githubUrl);
      uniqueSubmissions.push(sub);
    }
  });
  
  return uniqueSubmissions;
});
