import { GitHubService } from '../githubService.js';
import { AIService } from '../aiService.js';
import { parseScore, findMatchingTemplate, extractComment, DEFAULT_CRITERIA } from '../utils.js';

function scrapeSubmissionsPage() {
  const submissions = [];
  const rows = document.querySelectorAll('tr');
  if (rows.length > 0) {
    let exerciseColIndex = -1;
    let linkColIndex = -1;
    const headers = document.querySelectorAll('th, thead td');
    headers.forEach((header, index) => {
      const text = header.textContent.trim().toLowerCase();
      if (text.includes('bài tập') || text.includes('đề bài') || text.includes('tên')) {
        exerciseColIndex = index;
      }
      if (text.includes('link') || text.includes('github') || text.includes('liên kết')) {
        linkColIndex = index;
      }
    });
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        let githubUrl = '';
        let exerciseName = '';
        
        if (exerciseColIndex !== -1 && cells[exerciseColIndex]) {
          exerciseName = cells[exerciseColIndex].textContent.trim();
        }
        if (linkColIndex !== -1 && cells[linkColIndex]) {
          const a = cells[linkColIndex].querySelector('a[href*="github.com"]');
          if (a) githubUrl = a.href;
        }
        
        if (!githubUrl || !exerciseName) {
          const a = row.querySelector('a[href*="github.com"]');
          if (a) {
            githubUrl = a.href;
            if (!exerciseName) {
              for (let i = 0; i < cells.length; i++) {
                const cellText = cells[i].textContent.trim();
                if (cellText && 
                    !cellText.includes('http') && 
                    !cellText.includes('Github') && 
                    !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(cellText) && 
                    !/^[a-zA-Z0-9.\-_]{1,5}$/.test(cellText) && 
                    !['đã nộp', 'chưa nộp', 'xem github', 'chưa có nhận xét', 'sửa nhận xét'].includes(cellText.toLowerCase())) {
                  exerciseName = cellText;
                  break;
                }
              }
            }
          }
        }
        
        if (githubUrl) {
          const cleanGithub = githubUrl.split('?')[0].split('#')[0];
          submissions.push({
            exerciseName: exerciseName || 'Bài tập không rõ tên',
            githubUrl: cleanGithub
          });
        }
      }
    });
  }
  
  if (submissions.length === 0) {
    const gitLinks = document.querySelectorAll('a[href*="github.com"]');
    gitLinks.forEach(a => {
      const href = a.href.split('?')[0].split('#')[0];
      let parent = a.parentElement;
      let labelText = '';
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
          break;
        }
        parent = parent.parentElement;
      }
      submissions.push({
        exerciseName: labelText || 'Bài tập Github',
        githubUrl: href
      });
    });
  }
  
  const uniqueSubmissions = [];
  const urls = new Set();
  submissions.forEach(sub => {
    if (!urls.has(sub.githubUrl)) {
      urls.add(sub.githubUrl);
      uniqueSubmissions.push(sub);
    }
  });
  
  return uniqueSubmissions;
}

function scrapeClassPage() {
  const students = [];
  const rows = Array.from(document.querySelectorAll('tr'));
  
  let nameColIndex = -1;
  let idColIndex = -1;
  let gradeLinkColIndex = -1;
  let statusColIndex = -1;
  let submittedColIndex = -1;
  let completedColIndex = -1;
  
  const headers = Array.from(document.querySelectorAll('th, thead td'));
  headers.forEach((header, index) => {
    const text = header.textContent.trim().toLowerCase();
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
      studentName = cells[nameColIndex].textContent.trim();
    }
    if (idColIndex !== -1 && cells[idColIndex]) {
      studentId = cells[idColIndex].textContent.trim();
    }
    if (statusColIndex !== -1 && cells[statusColIndex]) {
      const selectEl = cells[statusColIndex].querySelector('select');
      if (selectEl) {
        lmsStatus = selectEl.options[selectEl.selectedIndex]?.textContent.trim();
      } else {
        lmsStatus = cells[statusColIndex].textContent.trim();
      }
    }
    if (submittedColIndex !== -1 && cells[submittedColIndex]) {
      const val = parseInt(cells[submittedColIndex].textContent.trim(), 10);
      if (!isNaN(val)) submittedCount = val;
    }
    if (completedColIndex !== -1 && cells[completedColIndex]) {
      const selectEl = cells[completedColIndex].querySelector('select');
      const val = selectEl ? parseInt(selectEl.options[selectEl.selectedIndex]?.textContent.trim(), 10) : parseInt(cells[completedColIndex].textContent.trim(), 10);
      if (!isNaN(val)) completedCount = val;
    }
    
    let actionElement = null;
    let dbId = '';
    if (gradeLinkColIndex !== -1 && cells[gradeLinkColIndex]) {
      actionElement = cells[gradeLinkColIndex].querySelector('a, button, [class*="btn"], [class*="button"]');
    }
    if (!actionElement) {
      const clickables = Array.from(row.querySelectorAll('a, button, [class*="btn"]'));
      actionElement = clickables.find(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('chi tiết') || text.includes('chấm') || text.includes('xem');
      });
      if (!actionElement && clickables.length > 0) {
        actionElement = clickables[clickables.length - 1];
      }
    }

    if (actionElement) {
      if (actionElement.tagName.toLowerCase() === 'a' && actionElement.href && !actionElement.href.startsWith('javascript:')) {
        submissionUrl = actionElement.href;
      }
      
      // Extract student internal ID (dbId) from button attributes or onclick
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
    
    // Fallback: If no submissionUrl, construct a unique identifier URL based on studentId (MSSV) or dbId
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
        const text = cell.textContent.trim();
        if (!text) return;
        
        if (text.includes('@')) return;
        
        const isIdPattern = /^[A-Z0-9_\-]{4,15}$/i.test(text);
        if (isIdPattern && !studentId && !isNaN(text.slice(-2))) {
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
  
  const uniqueStudents = [];
  const urls = new Set();
  students.forEach(st => {
    if (!urls.has(st.submissionUrl)) {
      urls.add(st.submissionUrl);
      uniqueStudents.push(st);
    }
  });
  
  return uniqueStudents;
}

export class AutoGraderTab {
  constructor(context) {
    this.context = context;
    this.initElements();
    this.bindEvents();
    this.renderClassList();
  }

  initElements() {
    // Tab elements
    this.bulkGraderView = document.getElementById("bulk-grader-view");
    this.classListView = document.getElementById("class-list-view");

    // Mode 1: Bulk Grader elements
    this.detectedTableEl = document.getElementById("detected-table-el");
    this.detectedListBody = document.getElementById("detected-list-body");
    this.autoEmptyState = document.getElementById("auto-empty-state");
    this.rescanPageBtn = document.getElementById("rescan-page-btn");
    this.bulkGradeBtn = document.getElementById("bulk-grade-btn");
    this.selectAllSubs = document.getElementById("select-all-subs");

    this.bulkProgressContainer = document.getElementById("bulk-progress-container");
    this.bulkProgressFill = document.getElementById("bulk-progress-fill");
    this.bulkProgressText = document.getElementById("bulk-progress-text");

    // Mode 2: Class Student List elements
    this.classTableEl = document.getElementById("class-table-el");
    this.classListBody = document.getElementById("class-list-body");
    this.classEmptyState = document.getElementById("class-empty-state");
    this.classStatusBanner = document.getElementById("class-status-banner");
    
    this.clearClassBtn = document.getElementById("clear-class-btn");
    this.scanClassBtn = document.getElementById("scan-class-btn");
    this.exportClassCsvBtn = document.getElementById("export-class-csv-btn");
  }

  bindEvents() {
    // Mode switcher triggers - removed because class list is now a separate tab

    // Mode 1: Bulk Grader events
    this.rescanPageBtn.addEventListener("click", () => this.triggerPageScan());
    this.bulkGradeBtn.addEventListener("click", () => this.runBulkGrading());
    this.selectAllSubs.addEventListener("change", (e) => this.toggleSelectAll(e.target.checked));

    // Mode 2: Class list events
    this.clearClassBtn.addEventListener("click", () => this.clearClassList());
    this.scanClassBtn.addEventListener("click", () => this.triggerClassScan());
    this.exportClassCsvBtn.addEventListener("click", () => this.exportClassListExcel());
  }

  toggleSelectAll(checked) {
    const submissions = this.context.submissions || [];
    submissions.forEach(sub => {
      sub.checked = checked;
    });
    
    const checkboxes = this.detectedListBody.querySelectorAll('.sub-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = checked;
    });
    this.updateBulkButtonText();
  }

  updateBulkButtonText() {
    const submissions = this.context.submissions || [];
    const checkedCount = submissions.filter(s => s.checked).length;
    const gradeableCount = submissions.filter(s => s.checked && s.matchedTemplate).length;
    this.bulkGradeBtn.disabled = gradeableCount === 0;
    
    if (checkedCount !== gradeableCount) {
      this.bulkGradeBtn.querySelector('span').innerText = `🚀 Chấm ${gradeableCount} Bài (Bỏ qua bài chưa liên kết)`;
    } else {
      this.bulkGradeBtn.querySelector('span').innerText = `🚀 Chấm ${gradeableCount} Bài Đã Chọn`;
    }
  }

  updateStatusBadge(badgeEl, sub) {
    badgeEl.className = 'badge-status';
    if (sub.status === 'pending') {
      badgeEl.className += ' pending';
      badgeEl.textContent = 'Chờ chấm';
      badgeEl.style.cursor = 'default';
      badgeEl.onclick = null;
    } else if (sub.status === 'downloading') {
      badgeEl.className += ' grading';
      badgeEl.textContent = 'Tải code...';
      badgeEl.style.cursor = 'default';
      badgeEl.onclick = null;
    } else if (sub.status === 'grading') {
      badgeEl.className += ' grading';
      badgeEl.textContent = 'AI chấm...';
      badgeEl.style.cursor = 'default';
      badgeEl.onclick = null;
    } else if (sub.status === 'success') {
      badgeEl.className += ' success';
      badgeEl.textContent = `${sub.score || '--'} / 100`;
      badgeEl.style.cursor = 'pointer';
      badgeEl.onclick = () => this.context.showReportModal(sub);
    } else if (sub.status === 'error') {
      badgeEl.className += ' error';
      badgeEl.textContent = 'Lỗi';
      badgeEl.style.cursor = 'pointer';
      badgeEl.onclick = () => window.showToast(sub.error || 'Lỗi không xác định khi chấm bài.', 'error');
    }
  }

  buildTemplateSelectHTML() {
    if (!this.cachedOptionsHTML) {
      let html = `<option value="">-- Chưa liên kết --</option>`;
      const templates = this.context.exerciseTemplates || {};
      for (const chapter in templates) {
        html += `<optgroup label="${chapter}">`;
        for (const session in templates[chapter]) {
          for (const assignmentName in templates[chapter][session]) {
            const valueStr = `${chapter}||${session}||${assignmentName}`;
            html += `<option value="${valueStr}">${session} - ${assignmentName}</option>`;
          }
        }
        html += `</optgroup>`;
      }
      this.cachedOptionsHTML = html;
    }
    return `<select class="assignment-map-select">${this.cachedOptionsHTML}</select>`;
  }

  toggleDetailDrawer(index) {
    const detailRow = document.getElementById(`detail-row-${index}`);
    detailRow.style.display = detailRow.style.display === 'none' ? 'table-row' : 'none';
  }

  updateDetailPreview(index) {
    const sub = this.context.submissions?.[index];
    const promptPreview = document.getElementById(`prompt-preview-${index}`);
    const criteriaPreview = document.getElementById(`criteria-preview-${index}`);
    if (!promptPreview || !criteriaPreview) return;
    
    const templates = this.context.exerciseTemplates;
    if (sub.matchedTemplate && templates) {
      const { chapter, session, assignmentName } = sub.matchedTemplate;
      try {
        const data = templates[chapter][session][assignmentName];
        promptPreview.textContent = data.assignment || 'Chưa cấu hình nội dung đề bài.';
        criteriaPreview.textContent = data.criteria || 'Chưa cấu hình tiêu chí chấm.';
      } catch (e) {
        promptPreview.textContent = 'Lỗi truy xuất dữ liệu đề bài.';
        criteriaPreview.textContent = 'Lỗi truy xuất tiêu chí.';
      }
    } else {
      promptPreview.innerHTML = '<span style="color:#ef4444; font-style:italic;">Chưa liên kết đề bài. Vui lòng chọn đề bài tương ứng phía trên.</span>';
      criteriaPreview.innerHTML = '<span style="color:#ef4444; font-style:italic;">Chưa liên kết đề bài.</span>';
    }
  }

  renderSubmissions(forceRefresh = false) {
    if (forceRefresh) {
      this.cachedOptionsHTML = null;
    }
    this.context.updateDetectedSubmissionSelect();
    const submissions = this.context.submissions || [];
    
    if (submissions.length === 0) {
      this.detectedTableEl.style.display = 'none';
      this.autoEmptyState.style.display = 'block';
      this.bulkGradeBtn.disabled = true;
      this.bulkGradeBtn.querySelector('span').innerText = '🚀 Chấm 0 Bài Đã Chọn';
      return;
    }
    
    this.detectedTableEl.style.display = 'table';
    this.autoEmptyState.style.display = 'none';
    this.detectedListBody.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    submissions.forEach((sub, index) => {
      // 1. Create main row
      const trMain = document.createElement('tr');
      trMain.id = `main-row-${index}`;
      
      const tdCheck = document.createElement('td');
      tdCheck.style.textAlign = 'center';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = sub.checked;
      checkbox.className = 'sub-checkbox';
      checkbox.dataset.index = index;
      checkbox.addEventListener('change', (e) => {
        this.context.submissions[index].checked = e.target.checked;
        this.updateBulkButtonText();
      });
      tdCheck.appendChild(checkbox);
      trMain.appendChild(tdCheck);
      
      const tdName = document.createElement('td');
      const titleSpan = document.createElement('span');
      titleSpan.style.fontWeight = '600';
      titleSpan.style.color = '#334155';
      titleSpan.textContent = sub.exerciseName;
      tdName.appendChild(titleSpan);
      
      const linkA = document.createElement('a');
      linkA.className = 'sub-repo-link';
      linkA.href = sub.githubUrl;
      linkA.target = '_blank';
      linkA.textContent = sub.githubUrl;
      tdName.appendChild(linkA);
      trMain.appendChild(tdName);
      
      const tdMap = document.createElement('td');
      tdMap.innerHTML = this.buildTemplateSelectHTML();
      const selectEl = tdMap.querySelector('select');
      if (sub.matchedTemplate) {
        const { chapter, session, assignmentName } = sub.matchedTemplate;
        selectEl.value = `${chapter}||${session}||${assignmentName}`;
      } else {
        selectEl.classList.add('unmapped');
      }
      selectEl.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) {
          const parts = val.split('||');
          this.context.submissions[index].matchedTemplate = {
            chapter: parts[0],
            session: parts[1],
            assignmentName: parts[2]
          };
          selectEl.classList.remove('unmapped');
        } else {
          this.context.submissions[index].matchedTemplate = null;
          selectEl.classList.add('unmapped');
        }
        this.updateDetailPreview(index);
        this.updateBulkButtonText();
        this.context.updateDetectedSubmissionSelect();
      });
      trMain.appendChild(tdMap);
      
      const tdStatus = document.createElement('td');
      tdStatus.style.textAlign = 'center';
      const statusBadge = document.createElement('span');
      statusBadge.id = `status-badge-${index}`;
      this.updateStatusBadge(statusBadge, sub);
      tdStatus.appendChild(statusBadge);
      trMain.appendChild(tdStatus);
      
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'center';
      tdActions.style.whiteSpace = 'nowrap';
      
      const btnDetail = document.createElement('button');
      btnDetail.className = 'btn-row-action';
      btnDetail.style.marginRight = '4px';
      btnDetail.textContent = 'Chi tiết';
      btnDetail.addEventListener('click', () => this.toggleDetailDrawer(index));
      tdActions.appendChild(btnDetail);
      
      const btnGrade = document.createElement('button');
      btnGrade.className = 'btn-row-action btn-row-grade';
      btnGrade.textContent = 'Chấm';
      btnGrade.id = `btn-grade-${index}`;
      btnGrade.addEventListener('click', () => this.gradeSingleRow(index));
      tdActions.appendChild(btnGrade);
      
      trMain.appendChild(tdActions);
      this.detectedListBody.appendChild(trMain);
      
      // 2. Create detail row (collapsible drawer)
      const trDetail = document.createElement('tr');
      trDetail.id = `detail-row-${index}`;
      trDetail.className = 'detail-drawer';
      trDetail.style.display = 'none';
      
      const tdDetailCol = document.createElement('td');
      tdDetailCol.colSpan = 5;
      
      const containerDiv = document.createElement('div');
      containerDiv.className = 'detail-container';
      
      const fieldGit = document.createElement('div');
      fieldGit.className = 'detail-field';
      const labelGit = document.createElement('label');
      labelGit.textContent = 'Đường dẫn GitHub Repository (chỉnh sửa nếu bị cào sai):';
      fieldGit.appendChild(labelGit);
      const inputGit = document.createElement('input');
      inputGit.type = 'text';
      inputGit.value = sub.githubUrl;
      inputGit.className = 'edit-github-input';
      inputGit.addEventListener('input', (e) => {
        const newUrl = e.target.value.trim();
        this.context.submissions[index].githubUrl = newUrl;
        linkA.href = newUrl;
        linkA.textContent = newUrl;
        this.context.updateDetectedSubmissionSelect();
      });
      fieldGit.appendChild(inputGit);
      containerDiv.appendChild(fieldGit);
      
      // File List collapsible section
      const fileListDiv = document.createElement('div');
      fileListDiv.className = 'detail-field file-list-container';
      fileListDiv.style.marginTop = '8px';
      
      const fileListHeader = document.createElement('div');
      fileListHeader.className = 'file-list-header';
      fileListHeader.style.fontWeight = '600';
      fileListHeader.style.color = '#475569';
      fileListHeader.style.cursor = 'pointer';
      fileListHeader.style.display = 'flex';
      fileListHeader.style.alignItems = 'center';
      fileListHeader.style.gap = '4px';
      
      const toggleIcon = document.createElement('span');
      toggleIcon.textContent = '▶';
      toggleIcon.style.fontSize = '0.75rem';
      toggleIcon.style.transition = 'transform 0.2s';
      
      const headerText = document.createElement('span');
      headerText.id = `file-list-header-text-${index}`;
      headerText.textContent = sub.fileList ? `📁 Danh sách tệp tin (${sub.fileList.length} file)` : '📁 Danh sách tệp tin (Chưa tải)';
      
      fileListHeader.appendChild(toggleIcon);
      fileListHeader.appendChild(headerText);
      
      const fileListUl = document.createElement('ul');
      fileListUl.id = `file-list-items-${index}`;
      fileListUl.className = 'file-list-items';
      fileListUl.style.display = 'none';
      fileListUl.style.margin = '4px 0 0 16px';
      fileListUl.style.padding = '0';
      fileListUl.style.listStyleType = 'none';
      fileListUl.style.maxHeight = '150px';
      fileListUl.style.overflowY = 'auto';
      fileListUl.style.fontSize = '0.8rem';
      fileListUl.style.color = '#64748b';
      
      if (sub.fileList) {
        sub.fileList.forEach(filePath => {
          const li = document.createElement('li');
          li.style.padding = '2px 0';
          li.style.display = 'flex';
          li.style.alignItems = 'center';
          li.style.gap = '4px';
          li.innerHTML = `📄 <span style="font-family: monospace;">${filePath}</span>`;
          fileListUl.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.style.fontStyle = 'italic';
        li.textContent = 'Hãy chạy chấm điểm để xem danh sách file.';
        fileListUl.appendChild(li);
      }
      
      fileListHeader.addEventListener('click', () => {
        const isCollapsed = fileListUl.style.display === 'none';
        fileListUl.style.display = isCollapsed ? 'block' : 'none';
        toggleIcon.style.transform = isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)';
      });
      
      fileListDiv.appendChild(fileListHeader);
      fileListDiv.appendChild(fileListUl);
      containerDiv.appendChild(fileListDiv);
      
      const fieldPrompt = document.createElement('div');
      fieldPrompt.className = 'detail-field';
      fieldPrompt.style.marginTop = '8px';
      const labelPrompt = document.createElement('label');
      labelPrompt.textContent = 'Đề bài (Prompt) xem trước:';
      fieldPrompt.appendChild(labelPrompt);
      const divPrompt = document.createElement('div');
      divPrompt.id = `prompt-preview-${index}`;
      divPrompt.className = 'prompt-preview';
      fieldPrompt.appendChild(divPrompt);
      containerDiv.appendChild(fieldPrompt);

      const fieldCriteria = document.createElement('div');
      fieldCriteria.className = 'detail-field';
      fieldCriteria.style.marginTop = '8px';
      const labelCriteria = document.createElement('label');
      labelCriteria.textContent = 'Tiêu chí chấm điểm:';
      fieldCriteria.appendChild(labelCriteria);
      const divCriteria = document.createElement('div');
      divCriteria.id = `criteria-preview-${index}`;
      divCriteria.className = 'criteria-preview';
      fieldCriteria.appendChild(divCriteria);
      containerDiv.appendChild(fieldCriteria);
      
      const aiResultsDiv = document.createElement('div');
      aiResultsDiv.id = `ai-results-drawer-${index}`;
      aiResultsDiv.className = 'ai-results-drawer';
      aiResultsDiv.style.display = sub.report ? 'block' : 'none';
      aiResultsDiv.style.marginTop = '10px';
      aiResultsDiv.style.paddingTop = '10px';
      aiResultsDiv.style.borderTop = '1px dashed #cbd5e1';
      
      const aiLabel = document.createElement('div');
      aiLabel.style.fontWeight = '600';
      aiLabel.style.color = '#1e3a8a';
      aiLabel.style.marginBottom = '4px';
      aiLabel.textContent = 'Nhận xét từ AI:';
      aiResultsDiv.appendChild(aiLabel);
      
      const aiComment = document.createElement('div');
      aiComment.id = `ai-comment-${index}`;
      aiComment.className = 'ai-comment-box';
      aiComment.textContent = sub.report ? extractComment(sub.report) : '';
      aiResultsDiv.appendChild(aiComment);
      
      const btnViewReport = document.createElement('button');
      btnViewReport.className = 'btn-primary';
      btnViewReport.style.marginTop = '8px';
      btnViewReport.style.padding = '6px 12px';
      btnViewReport.style.fontSize = '0.8rem';
      btnViewReport.style.width = 'auto';
      btnViewReport.textContent = '📄 Xem Báo Cáo Đầy Đủ (Markdown)';
      btnViewReport.addEventListener('click', () => {
        this.context.showReportModal(this.context.submissions[index]);
      });
      aiResultsDiv.appendChild(btnViewReport);
      
      containerDiv.appendChild(aiResultsDiv);
      tdDetailCol.appendChild(containerDiv);
      trDetail.appendChild(tdDetailCol);
      
      fragment.appendChild(trMain);
      fragment.appendChild(trDetail);
    });
    
    this.detectedListBody.appendChild(fragment);
    
    // Update preview details for all rows in DOM
    submissions.forEach((sub, index) => {
      this.updateDetailPreview(index);
    });
    
    this.updateBulkButtonText();
  }



  triggerPageScan() {
    const statusBanner = document.getElementById("detected-status-banner");
    statusBanner.innerHTML = "🔍 Đang tìm kiếm các bài tập trên trang... ";
    statusBanner.style.backgroundColor = "#f1f5f9";
    statusBanner.style.color = "#334155";
    statusBanner.style.borderLeftColor = "#3b82f6";
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        statusBanner.innerHTML = "❌ Lỗi: Không thể truy cập tab hiện tại.";
        statusBanner.style.backgroundColor = "#fef2f2";
        statusBanner.style.color = "#991b1b";
        statusBanner.style.borderLeftColor = "#ef4444";
        return;
      }
      
      const activeTab = tabs[0];
      const isWebPage = activeTab.url && (activeTab.url.startsWith("http://") || activeTab.url.startsWith("https://"));
      
      if (!isWebPage) {
        statusBanner.innerHTML = "💡 Hãy mở trang web có bài tập của học viên để quét.";
        statusBanner.style.backgroundColor = "#fffbeb";
        statusBanner.style.color = "#b45309";
        statusBanner.style.borderLeftColor = "#f59e0b";
        this.context.submissions = [];
        this.renderSubmissions();
        return;
      }
      
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: scrapeSubmissionsPage
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          statusBanner.innerHTML = "❌ Không thể quét trang: " + chrome.runtime.lastError.message;
          statusBanner.style.backgroundColor = "#fef2f2";
          statusBanner.style.color = "#991b1b";
          statusBanner.style.borderLeftColor = "#ef4444";
          this.context.submissions = [];
          this.renderSubmissions();
          return;
        }
        
        if (results && results[0] && results[0].result) {
          const scrapedItems = results[0].result;
          
          this.context.submissions = scrapedItems.map(item => {
            const match = findMatchingTemplate(item.exerciseName, this.context.exerciseTemplates);
            return {
              exerciseName: item.exerciseName,
              githubUrl: item.githubUrl,
              checked: true,
              matchedTemplate: match,
              status: 'pending',
              score: null,
              report: null,
              error: null
            };
          });
          
          const foundCount = this.context.submissions.length;
          if (foundCount > 0) {
            statusBanner.innerHTML = `✅ Đã tìm thấy ${foundCount} bài tập chứa liên kết GitHub trên trang.`;
            statusBanner.style.backgroundColor = "#f0fdf4";
            statusBanner.style.color = "#166534";
            statusBanner.style.borderLeftColor = "#22c55e";
          } else {
            statusBanner.innerHTML = "❓ Không tìm thấy bài tập nộp trên trang này.";
            statusBanner.style.backgroundColor = "#fffbeb";
            statusBanner.style.color = "#b45309";
            statusBanner.style.borderLeftColor = "#f59e0b";
          }
          
          this.renderSubmissions();
        } else {
          statusBanner.innerHTML = "❓ Không tìm thấy bài tập nào.";
          statusBanner.style.backgroundColor = "#f1f5f9";
          statusBanner.style.color = "#475569";
          statusBanner.style.borderLeftColor = "#64748b";
          this.context.submissions = [];
          this.renderSubmissions();
        }
      });
    });
  }

  async gradeSingleRow(index) {
    const sub = this.context.submissions[index];
    if (!sub.githubUrl) {
      window.showToast("Vui lòng điền GitHub URL.", "warning");
      return;
    }
    if (!sub.matchedTemplate) {
      window.showToast("Vui lòng liên kết bài tập với đề bài trong hệ thống.", "warning");
      return;
    }
    
    sub.status = 'downloading';
    sub.score = null;
    sub.report = null;
    sub.error = null;
    
    const badgeEl = document.getElementById(`status-badge-${index}`);
    const btnGrade = document.getElementById(`btn-grade-${index}`);
    this.updateStatusBadge(badgeEl, sub);
    btnGrade.disabled = true;
    
    const aiResultsDiv = document.getElementById(`ai-results-drawer-${index}`);
    const aiComment = document.getElementById(`ai-comment-${index}`);
    if (aiResultsDiv) aiResultsDiv.style.display = 'none';
    
    try {
      const { chapter, session, assignmentName } = sub.matchedTemplate;
      const template = this.context.exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
      if (!template || !template.assignment) {
        throw new Error("Không lấy được nội dung đề bài để thực hiện chấm.");
      }

      const activeCriteria = template.criteria && template.criteria.trim().length > 0
        ? template.criteria
        : DEFAULT_CRITERIA;

      const github = new GitHubService(this.context.config.githubToken, this.context.config.graderIgnoreItems);
      const repoData = await github.getRepoContents(sub.githubUrl, (msg) => {
        sub.status = 'downloading';
        badgeEl.textContent = 'Tải code...';
      });

      sub.fileList = repoData.fileList;
      
      // Update drawer file list dynamically
      const domHeaderText = document.getElementById(`file-list-header-text-${index}`);
      const domFileListUl = document.getElementById(`file-list-items-${index}`);
      if (domHeaderText && domFileListUl && sub.fileList) {
        domHeaderText.textContent = `📁 Danh sách tệp tin (${sub.fileList.length} file)`;
        domFileListUl.innerHTML = '';
        sub.fileList.forEach(filePath => {
          const li = document.createElement('li');
          li.style.padding = '2px 0';
          li.style.display = 'flex';
          li.style.alignItems = 'center';
          li.style.gap = '4px';
          li.innerHTML = `📄 <span style="font-family: monospace;">${filePath}</span>`;
          domFileListUl.appendChild(li);
        });
      }

      sub.status = 'grading';
      this.updateStatusBadge(badgeEl, sub);
      
      const ai = new AIService(this.context.config);
      const report = await ai.generateGradingReport(template.assignment, activeCriteria, repoData.content);

      const score = parseScore(report);
      sub.status = 'success';
      sub.score = score;
      sub.report = report;
      
      this.updateStatusBadge(badgeEl, sub);
      if (aiResultsDiv && aiComment) {
        aiComment.textContent = extractComment(report);
        aiResultsDiv.style.display = 'block';
      }
    } catch (e) {
      console.error(e);
      sub.status = 'error';
      sub.error = e.message;
      this.updateStatusBadge(badgeEl, sub);
    } finally {
      btnGrade.disabled = false;
    }
  }

  async runBulkGrading() {
    const checkedRows = this.context.submissions.filter(s => s.checked && s.matchedTemplate);
    if (checkedRows.length === 0) return;
    
    this.bulkGradeBtn.disabled = true;
    this.rescanPageBtn.disabled = true;
    
    this.bulkProgressContainer.style.display = 'block';
    this.bulkProgressText.style.display = 'block';
    this.bulkProgressFill.style.width = '0%';
    
    let gradedCount = 0;
    const totalToGrade = checkedRows.length;
    
    for (let i = 0; i < this.context.submissions.length; i++) {
      const sub = this.context.submissions[i];
      if (!sub.checked || !sub.matchedTemplate) continue;
      
      this.bulkProgressText.innerText = `Đang chấm bài: ${sub.exerciseName} (${gradedCount + 1}/${totalToGrade})...`;
      this.bulkProgressFill.style.width = `${(gradedCount / totalToGrade) * 100}%`;
      
      await this.gradeSingleRow(i);
      gradedCount++;
    }
    
    this.bulkProgressFill.style.width = '100%';
    this.bulkProgressText.innerText = `Hoàn thành chấm điểm ${totalToGrade} bài!`;
    
    this.bulkGradeBtn.disabled = false;
    this.rescanPageBtn.disabled = false;
    this.updateBulkButtonText();
    
    setTimeout(() => {
      this.bulkProgressContainer.style.display = 'none';
      this.bulkProgressText.style.display = 'none';
    }, 4000);
  }

    // switchMode method removed as class list is now a separate tab

  clearClassList() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách lớp học hiện tại? Dữ liệu điểm và nhận xét đã lưu sẽ bị xóa.")) {
      chrome.storage.local.set({ classStudentList: [] }, () => {
        this.renderClassList();
        if (this.context.singleGraderTab) {
          this.context.singleGraderTab.resolveStudentFromTabUrl();
        }
      });
    }
  }

  triggerClassScan() {
    this.classStatusBanner.innerHTML = "🔍 Đang cào danh sách lớp từ trang...";
    this.classStatusBanner.style.backgroundColor = "#f1f5f9";
    this.classStatusBanner.style.color = "#334155";
    this.classStatusBanner.style.borderLeftColor = "#3b82f6";
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        this.classStatusBanner.innerHTML = "❌ Lỗi: Không thể truy cập tab hiện tại.";
        this.classStatusBanner.style.backgroundColor = "#fef2f2";
        this.classStatusBanner.style.color = "#991b1b";
        this.classStatusBanner.style.borderLeftColor = "#ef4444";
        return;
      }
      
      const activeTab = tabs[0];
      const isWebPage = activeTab.url && (activeTab.url.startsWith("http://") || activeTab.url.startsWith("https://"));
      
      if (!isWebPage) {
        this.classStatusBanner.innerHTML = "💡 Vui lòng mở trang danh sách lớp học trên LMS để quét.";
        this.classStatusBanner.style.backgroundColor = "#fffbeb";
        this.classStatusBanner.style.color = "#b45309";
        this.classStatusBanner.style.borderLeftColor = "#f59e0b";
        return;
      }
      
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: scrapeClassPage
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          this.classStatusBanner.innerHTML = "❌ Không thể quét trang: " + chrome.runtime.lastError.message;
          this.classStatusBanner.style.backgroundColor = "#fef2f2";
          this.classStatusBanner.style.color = "#991b1b";
          this.classStatusBanner.style.borderLeftColor = "#ef4444";
          return;
        }
        
        if (results && results[0] && results[0].result) {
          const scrapedStudents = results[0].result;
          
          if (scrapedStudents.length > 0) {
            chrome.storage.local.get("classStudentList", (res) => {
              const existingList = res.classStudentList || [];
              const updatedList = scrapedStudents.map(newSt => {
                const existing = existingList.find(st => st.submissionUrl === newSt.submissionUrl || (st.studentId && st.studentId !== 'N/A' && st.studentId === newSt.studentId));
                return {
                  studentId: newSt.studentId,
                  studentName: newSt.studentName,
                  submissionUrl: newSt.submissionUrl,
                  dbId: newSt.dbId || (existing ? (existing.dbId || '') : ''),
                  lmsStatus: newSt.lmsStatus || (existing ? (existing.lmsStatus || '') : ''),
                  submittedCount: newSt.submittedCount !== undefined ? newSt.submittedCount : (existing ? (existing.submittedCount || 0) : 0),
                  completedCount: newSt.completedCount !== undefined ? newSt.completedCount : (existing ? (existing.completedCount || 0) : 0),
                  githubUrl: existing ? (existing.githubUrl || '') : '',
                  score: existing ? existing.score : null,
                  comments: existing ? existing.comments : null,
                  assignmentName: existing ? (existing.assignmentName || '') : ''
                };
              });
              
              chrome.storage.local.set({ classStudentList: updatedList }, () => {
                this.classStatusBanner.innerHTML = `✅ Đã quét thành công ${updatedList.length} học viên từ trang danh sách lớp.`;
                this.classStatusBanner.style.backgroundColor = "#f0fdf4";
                this.classStatusBanner.style.color = "#166534";
                this.classStatusBanner.style.borderLeftColor = "#22c55e";
                this.renderClassList();
                
                if (this.context.singleGraderTab) {
                  this.context.singleGraderTab.resolveStudentFromTabUrl();
                }
              });
            });
          } else {
            this.classStatusBanner.innerHTML = "❓ Không tìm thấy cấu trúc bảng/danh sách học viên trên trang.";
            this.classStatusBanner.style.backgroundColor = "#fffbeb";
            this.classStatusBanner.style.color = "#b45309";
            this.classStatusBanner.style.borderLeftColor = "#f59e0b";
          }
        } else {
          this.classStatusBanner.innerHTML = "❓ Không tìm thấy dữ liệu học viên.";
          this.classStatusBanner.style.backgroundColor = "#f1f5f9";
          this.classStatusBanner.style.color = "#475569";
          this.classStatusBanner.style.borderLeftColor = "#64748b";
        }
      });
    });
  }

  renderClassList() {
    if (!this.classListBody) return; // Guard for initialization timing
    chrome.storage.local.get("classStudentList", (res) => {
      const studentList = res.classStudentList || [];
      
      if (studentList.length === 0) {
        this.classTableEl.style.display = 'none';
        this.classEmptyState.style.display = 'block';
        this.exportClassCsvBtn.disabled = true;
        return;
      }
      
      this.classTableEl.style.display = 'table';
      this.classEmptyState.style.display = 'none';
      this.exportClassCsvBtn.disabled = false;
      this.classListBody.innerHTML = '';
      
      const fragment = document.createDocumentFragment();
      
      const total = studentList.length;
      let completedCount = 0;
      let notCompletedCount = 0;
      let pendingCount = 0;
      let gradedCount = 0;
      
      studentList.forEach(st => {
        const statusText = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : '';
        const isCompleted = statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA');
        const isPending = statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ') || statusText.includes('KIỂM TRA');
        const isNotCompleted = statusText.includes('CHƯA HOÀN THÀNH') || (!isCompleted && !isPending && statusText.length > 0);
        
        if (isCompleted) {
          completedCount++;
        } else if (isPending) {
          pendingCount++;
        } else {
          notCompletedCount++;
        }
        
        if (isCompleted || isNotCompleted || (st.score !== null && st.score !== undefined)) {
          gradedCount++;
        }
      });
      
      this.classStatusBanner.innerHTML = `📊 <b>Thống kê lớp học:</b> Sĩ số: <b>${total}</b> | Hoàn thành: <span class="badge-status success" style="font-weight:bold;">${completedCount}</span> | Chưa hoàn thành: <span class="badge-status pending" style="font-weight:bold;">${notCompletedCount}</span> | Chờ kiểm tra: <span class="badge-status warning" style="font-weight:bold;">${pendingCount}</span> | Đã chấm: <b>${gradedCount}</b>`;
      this.classStatusBanner.style.backgroundColor = "#f8fafc";
      this.classStatusBanner.style.color = "#1e293b";
      this.classStatusBanner.style.borderLeftColor = "#3b82f6";

      studentList.forEach((st, index) => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.style.fontWeight = '600';
        tdId.style.color = '#475569';
        tdId.textContent = st.studentId;
        tr.appendChild(tdId);
        
        const tdName = document.createElement('td');
        const nameLink = document.createElement('a');
        nameLink.href = st.submissionUrl;
        nameLink.target = '_blank';
        nameLink.style.fontWeight = '600';
        nameLink.style.color = '#1e293b';
        nameLink.style.textDecoration = 'none';
        nameLink.textContent = st.studentName;
        tdName.appendChild(nameLink);
        
        if (st.githubUrl) {
          const githubLink = document.createElement('a');
          githubLink.className = 'sub-repo-link';
          githubLink.href = st.githubUrl;
          githubLink.target = '_blank';
          githubLink.textContent = st.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "");
          tdName.appendChild(githubLink);
        }
        tr.appendChild(tdName);
        
        const tdLmsStatus = document.createElement('td');
        tdLmsStatus.style.textAlign = 'center';
        const lmsBadge = document.createElement('span');
        lmsBadge.className = 'badge-status';
        
        const statusText = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : 'CHƯA NỘP';
        lmsBadge.textContent = statusText;
        
        if (statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA')) {
          lmsBadge.className += ' success';
        } else if (statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ') || statusText.includes('KIỂM TRA')) {
          lmsBadge.className += ' warning';
        } else {
          lmsBadge.className += ' pending';
        }
        tdLmsStatus.appendChild(lmsBadge);
        tr.appendChild(tdLmsStatus);
        
        const tdScore = document.createElement('td');
        tdScore.style.textAlign = 'center';
        
        const ratioBadge = document.createElement('span');
        ratioBadge.className = 'badge-status';
        
        const subCount = st.submittedCount || 0;
        const compCount = st.completedCount || 0;
        ratioBadge.textContent = `${compCount} / ${subCount}`;
        
        if (compCount === subCount && subCount > 0) {
          ratioBadge.className += ' success';
        } else if (compCount < subCount) {
          ratioBadge.className += ' warning';
        } else {
          ratioBadge.className += ' pending';
        }
        
        if (st.score !== null && st.score !== undefined) {
          ratioBadge.title = `Điểm AI: ${st.score}/100. Click để xem nhận xét chi tiết.`;
          ratioBadge.style.cursor = 'pointer';
          ratioBadge.style.borderBottom = '2px dashed #15803d';
          
          ratioBadge.addEventListener('click', () => {
            this.context.showReportModal({
              exerciseName: `Báo cáo chấm điểm: ${st.studentName} - ${st.studentId}`,
              score: st.score,
              report: st.comments
            });
          });
          
          const aiScoreText = document.createElement('div');
          aiScoreText.style.fontSize = '0.7rem';
          aiScoreText.style.color = '#15803d';
          aiScoreText.style.fontWeight = '600';
          aiScoreText.style.marginTop = '2px';
          aiScoreText.textContent = `AI: ${st.score}/100`;
          
          tdScore.appendChild(ratioBadge);
          tdScore.appendChild(aiScoreText);
        } else {
          tdScore.appendChild(ratioBadge);
        }
        
        tr.appendChild(tdScore);
        
        const tdActions = document.createElement('td');
        tdActions.style.textAlign = 'center';
        
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-row-action';
        btnDelete.style.borderColor = '#fca5a5';
        btnDelete.style.color = '#ef4444';
        btnDelete.textContent = 'Xóa';
        btnDelete.addEventListener('click', () => {
          if (confirm(`Xóa học viên ${st.studentName} khỏi danh sách?`)) {
            const updated = studentList.filter((_, idx) => idx !== index);
            chrome.storage.local.set({ classStudentList: updated }, () => {
              this.renderClassList();
              if (this.context.singleGraderTab) {
                this.context.singleGraderTab.resolveStudentFromTabUrl();
              }
            });
          }
        });
        tdActions.appendChild(btnDelete);
        tr.appendChild(tdActions);
        
        fragment.appendChild(tr);
      });
      
      this.classListBody.appendChild(fragment);
    });
  }

  exportClassListExcel() {
    chrome.storage.local.get("classStudentList", (res) => {
      const studentList = res.classStudentList || [];
      if (studentList.length === 0) {
        window.showToast("Không có dữ liệu học viên để xuất Excel.", "warning");
        return;
      }

      // Chuẩn bị dữ liệu cho SheetJS
      const data = studentList.map(st => {
        return {
          "Mã SV": st.studentId || "",
          "Họ và Tên": st.studentName || "",
          "Trạng thái LMS": st.lmsStatus || "",
          "Số bài đã nộp": st.submittedCount || 0,
          "Số bài hoàn thành": st.completedCount || 0,
          "Điểm số AI": st.score !== null && st.score !== undefined ? st.score : "Chưa chấm",
          "Link GitHub": st.githubUrl || "",
          "Link LMS": st.submissionUrl || "",
          "Nhận xét AI": st.comments || ""
        };
      });

      // Tạo workbook và worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách lớp");

      // Định cấu hình độ rộng cột cho đẹp mắt
      const max_widths = [
        { wch: 15 }, // Mã SV
        { wch: 25 }, // Họ Tên
        { wch: 18 }, // Trạng thái LMS
        { wch: 15 }, // Số bài đã nộp
        { wch: 18 }, // Số bài hoàn thành
        { wch: 12 }, // Điểm số AI
        { wch: 30 }, // Link GitHub
        { wch: 30 }, // Link LMS
        { wch: 50 }  // Nhận xét AI
      ];
      worksheet["!cols"] = max_widths;

      // Xuất và tải file XLSX xuống
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bao_cao_diem_lop_hoc_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

