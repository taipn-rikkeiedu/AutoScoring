// features/auto-grader/autoGraderRenderer.js - UI rendering logic for Auto/Bulk Grader tab

export class AutoGraderRenderer {
  constructor(tab) {
    this.tab = tab;
  }

  toggleSelectAll(checked) {
    const submissions = this.tab.context.submissions || [];
    submissions.forEach(sub => {
      sub.checked = checked;
    });
    
    const checkboxes = this.tab.detectedListBody.querySelectorAll('.sub-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = checked;
    });
    this.updateBulkButtonText();
  }

  updateBulkButtonText() {
    const submissions = this.tab.context.submissions || [];
    const checkedCount = submissions.filter(s => s.checked).length;
    const gradeableCount = submissions.filter(s => s.checked && s.matchedTemplate).length;
    this.tab.bulkGradeBtn.disabled = gradeableCount === 0;
    
    if (checkedCount !== gradeableCount) {
      this.tab.bulkGradeBtn.querySelector('span').innerText = `🚀 Chấm ${gradeableCount} Bài (Bỏ qua bài chưa liên kết)`;
    } else {
      this.tab.bulkGradeBtn.querySelector('span').innerText = `🚀 Chấm ${gradeableCount} Bài Đã Chọn`;
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
      badgeEl.onclick = () => this.tab.context.showReportModal(sub);
    } else if (sub.status === 'error') {
      badgeEl.className += ' error';
      badgeEl.textContent = 'Lỗi';
      badgeEl.style.cursor = 'pointer';
      badgeEl.onclick = () => window.showToast(sub.error || 'Lỗi không xác định khi chấm bài.', 'error');
    }
  }

  buildTemplateSelectHTML() {
    if (!this.tab.cachedOptionsHTML) {
      let html = `<option value="">-- Chưa liên kết --</option>`;
      const templates = this.tab.context.exerciseTemplates || {};
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
      this.tab.cachedOptionsHTML = html;
    }
    return `<select class="assignment-map-select">${this.tab.cachedOptionsHTML}</select>`;
  }

  toggleDetailDrawer(index) {
    const detailRow = document.getElementById(`detail-row-${index}`);
    if (detailRow) {
      detailRow.style.display = detailRow.style.display === 'none' ? 'table-row' : 'none';
    }
  }

  updateDetailPreview(index) {
    const sub = this.tab.context.submissions?.[index];
    const promptPreview = document.getElementById(`prompt-preview-${index}`);
    const criteriaPreview = document.getElementById(`criteria-preview-${index}`);
    if (!promptPreview || !criteriaPreview) return;
    
    const templates = this.tab.context.exerciseTemplates;
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
      this.tab.cachedOptionsHTML = null;
    }
    this.tab.context.updateDetectedSubmissionSelect();
    const submissions = this.tab.context.submissions || [];
    
    if (!this.tab.detectedListBody) return;
    this.tab.detectedListBody.innerHTML = '';
    
    if (submissions.length === 0) {
      this.tab.tableEl.style.display = 'none';
      this.tab.emptyState.style.display = 'block';
      this.tab.bulkGradeBtn.disabled = true;
      return;
    }
    
    this.tab.tableEl.style.display = 'table';
    this.tab.emptyState.style.display = 'none';
    
    const fragment = document.createDocumentFragment();
    
    submissions.forEach((sub, index) => {
      const tr = document.createElement('tr');
      tr.id = `sub-row-${index}`;
      
      const tdCheck = document.createElement('td');
      tdCheck.style.textAlign = 'center';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'sub-checkbox';
      checkbox.checked = !!sub.checked;
      checkbox.addEventListener('change', (e) => {
        sub.checked = e.target.checked;
        this.updateBulkButtonText();
      });
      tdCheck.appendChild(checkbox);
      tr.appendChild(tdCheck);
      
      const tdLabel = document.createElement('td');
      tdLabel.style.fontWeight = '500';
      const detailLink = document.createElement('a');
      detailLink.href = '#';
      detailLink.style.textDecoration = 'none';
      detailLink.style.color = 'var(--text-color)';
      detailLink.style.display = 'flex';
      detailLink.style.flexDirection = 'column';
      detailLink.style.gap = '2px';
      
      const mainNameSpan = document.createElement('span');
      mainNameSpan.style.fontWeight = '600';
      mainNameSpan.textContent = sub.exerciseName;
      detailLink.appendChild(mainNameSpan);
      
      if (sub.studentName) {
        const studentSpan = document.createElement('span');
        studentSpan.style.fontSize = '0.75rem';
        studentSpan.style.color = '#64748b';
        studentSpan.textContent = `👤 ${sub.studentName}`;
        detailLink.appendChild(studentSpan);
      }
      
      const githubSpan = document.createElement('span');
      githubSpan.style.fontSize = '0.7rem';
      githubSpan.style.fontFamily = 'monospace';
      githubSpan.style.color = '#94a3b8';
      githubSpan.textContent = sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '');
      detailLink.appendChild(githubSpan);
      
      detailLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleDetailDrawer(index);
      });
      
      tdLabel.appendChild(detailLink);
      tr.appendChild(tdLabel);
      
      const tdMap = document.createElement('td');
      tdMap.innerHTML = this.buildTemplateSelectHTML();
      const select = tdMap.querySelector('select');
      
      if (sub.matchedTemplate) {
        select.value = `${sub.matchedTemplate.chapter}||${sub.matchedTemplate.session}||${sub.matchedTemplate.assignmentName}`;
      } else {
        select.value = '';
      }
      
      select.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) {
          const parts = val.split('||');
          sub.matchedTemplate = {
            chapter: parts[0],
            session: parts[1],
            assignmentName: parts[2]
          };
        } else {
          sub.matchedTemplate = null;
        }
        
        chrome.storage.local.set({ submissionsCache: submissions });
        this.updateDetailPreview(index);
        this.updateBulkButtonText();
      });
      
      tdMap.appendChild(select);
      tr.appendChild(tdMap);
      
      const tdStatus = document.createElement('td');
      tdStatus.style.textAlign = 'center';
      const badgeSpan = document.createElement('span');
      badgeSpan.id = `status-badge-${index}`;
      this.updateStatusBadge(badgeSpan, sub);
      tdStatus.appendChild(badgeSpan);
      tr.appendChild(tdStatus);
      
      const tdAction = document.createElement('td');
      tdAction.style.textAlign = 'center';
      const actionBtn = document.createElement('button');
      actionBtn.id = `btn-grade-${index}`;
      actionBtn.className = 'btn-primary table-action-btn';
      actionBtn.style.padding = '4px 8px';
      actionBtn.style.fontSize = '0.75rem';
      
      if (sub.status === 'success') {
        actionBtn.innerHTML = '🔄 Chấm Lại';
        actionBtn.style.background = '#f1f5f9';
        actionBtn.style.color = '#334155';
        actionBtn.style.border = '1px solid var(--border-color)';
      } else if (sub.status === 'grading' || sub.status === 'downloading') {
        actionBtn.innerHTML = '⏳ Chấm...';
        actionBtn.disabled = true;
      } else {
        actionBtn.innerHTML = '🚀 Chấm Bài';
      }
      
      actionBtn.addEventListener('click', () => {
        this.tab.grading.gradeSingleRow(index);
      });
      
      tdAction.appendChild(actionBtn);
      tr.appendChild(tdAction);
      
      fragment.appendChild(tr);
      
      const trDetail = document.createElement('tr');
      trDetail.id = `detail-row-${index}`;
      trDetail.style.display = 'none';
      trDetail.style.backgroundColor = '#f8fafc';
      
      const tdDetailCol = document.createElement('td');
      tdDetailCol.colSpan = 5;
      tdDetailCol.style.padding = '10px';
      
      const detailsGrid = document.createElement('div');
      detailsGrid.style.display = 'flex';
      detailsGrid.style.flexDirection = 'column';
      detailsGrid.style.gap = '8px';
      
      const promptTitle = document.createElement('div');
      promptTitle.style.fontWeight = '600';
      promptTitle.style.color = '#475569';
      promptTitle.style.fontSize = '0.8rem';
      promptTitle.textContent = '📄 NỘI DUNG ĐỀ BÀI:';
      detailsGrid.appendChild(promptTitle);
      
      const promptContent = document.createElement('pre');
      promptContent.id = `prompt-preview-${index}`;
      promptContent.className = 'detail-preview-box';
      detailsGrid.appendChild(promptContent);
      
      const criteriaTitle = document.createElement('div');
      criteriaTitle.style.fontWeight = '600';
      criteriaTitle.style.color = '#475569';
      criteriaTitle.style.fontSize = '0.8rem';
      criteriaTitle.textContent = '📋 TIÊU CHÍ CHẤM ĐIỂM:';
      detailsGrid.appendChild(criteriaTitle);
      
      const criteriaContent = document.createElement('pre');
      criteriaContent.id = `criteria-preview-${index}`;
      criteriaContent.className = 'detail-preview-box';
      detailsGrid.appendChild(criteriaContent);
      
      tdDetailCol.appendChild(detailsGrid);
      trDetail.appendChild(tdDetailCol);
      fragment.appendChild(trDetail);
    });
    
    this.tab.detectedListBody.appendChild(fragment);
    
    submissions.forEach((sub, index) => {
      this.updateDetailPreview(index);
    });
    
    this.updateBulkButtonText();
  }
}
