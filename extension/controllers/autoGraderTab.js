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

export class AutoGraderTab {
  constructor(context) {
    this.context = context;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.detectedTableEl = document.getElementById("detected-table-el");
    this.detectedListBody = document.getElementById("detected-list-body");
    this.autoEmptyState = document.getElementById("auto-empty-state");
    this.rescanPageBtn = document.getElementById("rescan-page-btn");
    this.bulkGradeBtn = document.getElementById("bulk-grade-btn");
    this.selectAllSubs = document.getElementById("select-all-subs");

    this.bulkProgressContainer = document.getElementById("bulk-progress-container");
    this.bulkProgressFill = document.getElementById("bulk-progress-fill");
    this.bulkProgressText = document.getElementById("bulk-progress-text");
  }

  bindEvents() {
    this.rescanPageBtn.addEventListener("click", () => this.triggerPageScan());
    this.bulkGradeBtn.addEventListener("click", () => this.runBulkGrading());
    this.selectAllSubs.addEventListener("change", (e) => this.toggleSelectAll(e.target.checked));
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
      badgeEl.onclick = () => alert(sub.error || 'Lỗi không xác định khi chấm bài.');
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
      alert("Vui lòng điền GitHub URL.");
      return;
    }
    if (!sub.matchedTemplate) {
      alert("Vui lòng liên kết bài tập với đề bài trong hệ thống.");
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

      const github = new GitHubService(this.context.config.githubToken);
      const repoData = await github.getRepoContents(sub.githubUrl, (msg) => {
        sub.status = 'downloading';
        badgeEl.textContent = 'Tải code...';
      });

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
}
