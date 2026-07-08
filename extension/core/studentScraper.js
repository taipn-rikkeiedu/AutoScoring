// core/studentScraper.js - Injected script to scrape student detail info
(() => {
  let studentName = '';
  let studentId = '';
  
  const pageText = document.body.innerText || '';
  const idMatch = pageText.match(/PTIT[-_\s]?[A-Z]+[-_\s]?\d+/i);
  if (idMatch) {
    studentId = idMatch[0].trim().replace(/[\s_]/g, '-').toUpperCase();
  }
  
  const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .student-name, [class*="student-name"], [class*="user-name"], .breadcrumb, [class*="title"], [class*="header"]'));
  for (const el of elements) {
    const text = el.textContent.trim();
    if (text && text.length > 2 && text.length < 50 && !text.includes('http') && !text.includes('/') && /^[A-ZÀ-Ỹ]/.test(text.split(' ')[0])) {
      studentName = text.split('\n')[0].trim();
      break;
    }
  }
  
  return { studentId, studentName };
})();
