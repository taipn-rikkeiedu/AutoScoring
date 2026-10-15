export default defineUnlistedScript(() => {
  let studentName = '';
  let studentId = '';
  
  const pageText = document.body.innerText || '';
  
  const detailMatch = pageText.match(/Chi ti[eế]t b[aà]i n[oộ]p\s*(?:—|-)\s*([^(]+)(?:\(([^)]+)\))?/i);
  if (detailMatch) {
    studentName = detailMatch[1].trim();
    if (detailMatch[2]) {
      studentId = detailMatch[2].trim();
    }
  } else {
    const idMatch = pageText.match(/(?:PTIT|N\d{2}|JV\d{4}|HCM\d{2})[-_\s]?[A-Z0-9]+[-_\s]?\d+/i) || pageText.match(/\b([A-Z]{1,4}\d{2,6}[A-Z0-9]*)\b/i);
    if (idMatch) {
      studentId = idMatch[1] || idMatch[0].trim().replace(/[\s_]/g, '-').toUpperCase();
    }
    
    const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .student-name, [class*="student-name"], [class*="user-name"], .breadcrumb, [class*="title"], [class*="header"]'));
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (text && text.length > 2 && text.length < 50 && !text.includes('http') && !text.includes('/') && /^[A-ZÀ-Ỹ]/.test(text.split(' ')[0])) {
        studentName = text.split('\n')[0].trim();
        break;
      }
    }
  }
  
  return { studentId, studentName };
});
