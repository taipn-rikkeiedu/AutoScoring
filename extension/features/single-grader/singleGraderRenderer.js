// features/single-grader/singleGraderRenderer.js - UI rendering logic for Single Grader results and dropdowns

export class SingleGraderRenderer {
  constructor(tab) {
    this.tab = tab;
  }

  populateChapters() {
    this.tab.chapterSelect.innerHTML = '<option value="">-- Chọn Chương --</option>';
    const templates = this.tab.context.exerciseTemplates || {};
    const chapters = Object.keys(templates);
    
    if (chapters.length === 0) {
      this.tab.chapterSelect.innerHTML = '<option value="">-- Thư viện trống --</option>';
      return;
    }

    chapters.forEach(ch => {
      const option = document.createElement("option");
      option.value = ch;
      option.textContent = ch;
      this.tab.chapterSelect.appendChild(option);
    });

    this.tab.sessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.tab.sessionSelect.disabled = true;
    this.tab.assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.tab.assignmentSelect.disabled = true;
  }

  onChapterChanged() {
    const templates = this.tab.context.exerciseTemplates || {};
    const selectedChapter = this.tab.chapterSelect.value;
    this.tab.sessionSelect.innerHTML = '<option value="">-- Chọn Session --</option>';
    
    if (!selectedChapter || !templates[selectedChapter]) {
      this.tab.sessionSelect.disabled = true;
      this.tab.assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
      this.tab.assignmentSelect.disabled = true;
      return;
    }

    const sessions = Object.keys(templates[selectedChapter]);
    sessions.forEach(sess => {
      const option = document.createElement("option");
      option.value = sess;
      option.textContent = sess;
      this.tab.sessionSelect.appendChild(option);
    });

    this.tab.sessionSelect.disabled = false;
    this.tab.assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.tab.assignmentSelect.disabled = true;
  }

  onSessionChanged() {
    const templates = this.tab.context.exerciseTemplates || {};
    const selectedChapter = this.tab.chapterSelect.value;
    const selectedSession = this.tab.sessionSelect.value;
    this.tab.assignmentSelect.innerHTML = '<option value="">-- Chọn Bài tập --</option>';

    if (!selectedSession || !templates[selectedChapter] || !templates[selectedChapter][selectedSession]) {
      this.tab.assignmentSelect.disabled = true;
      return;
    }

    const assignments = Object.keys(templates[selectedChapter][selectedSession]);
    assignments.forEach(ass => {
      const option = document.createElement("option");
      option.value = ass;
      option.textContent = ass;
      this.tab.assignmentSelect.appendChild(option);
    });

    this.tab.assignmentSelect.disabled = false;
  }

  updateDetectedSubmissionSelect() {
    if (!this.tab.detectedSubmissionSelect || !this.tab.detectedSelectGroup) return;
    
    this.tab.detectedSubmissionSelect.innerHTML = '<option value="">-- Chọn bài nộp phát hiện trên trang --</option>';
    const submissions = this.tab.context.submissions || [];
    
    if (submissions.length > 0) {
      submissions.forEach((sub, index) => {
        const option = document.createElement("option");
        option.value = index;
        const shortUrl = sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "");
        option.textContent = `${sub.exerciseName} (${shortUrl})`;
        this.tab.detectedSubmissionSelect.appendChild(option);
      });
      this.tab.detectedSelectGroup.style.display = "flex";
    } else {
      this.tab.detectedSelectGroup.style.display = "none";
    }
  }

  onDetectedSubmissionChanged(val) {
    if (!val) {
      this.tab.repoUrlInput.value = "";
      this.tab.chapterSelect.value = "";
      this.tab.chapterSelect.dispatchEvent(new Event("change"));
      return;
    }
    
    const index = parseInt(val, 10);
    const sub = this.tab.context.submissions?.[index];
    if (!sub) return;
    
    this.tab.repoUrlInput.value = sub.githubUrl;
    
    if (sub.matchedTemplate) {
      const { chapter, session, assignmentName } = sub.matchedTemplate;
      
      this.tab.chapterSelect.value = chapter;
      this.tab.chapterSelect.dispatchEvent(new Event("change"));
      
      this.tab.sessionSelect.value = session;
      this.tab.sessionSelect.dispatchEvent(new Event("change"));
      
      this.tab.assignmentSelect.value = assignmentName;
    } else {
      this.tab.chapterSelect.value = "";
      this.tab.chapterSelect.dispatchEvent(new Event("change"));
    }
  }

  renderResults(score, report, fileList) {
    this.tab.scoreVal.innerText = `${score} / 100`;
    const val = parseFloat(score);
    if (val >= 80) this.tab.scoreVal.style.background = "linear-gradient(135deg, #16a34a, #15803d)";
    else if (val >= 50) this.tab.scoreVal.style.background = "linear-gradient(135deg, #d97706, #b45309)";
    else this.tab.scoreVal.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";

    if (typeof marked !== 'undefined') {
      const rawHtml = marked.parse(report);
      this.tab.reportHtml.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
    } else {
      this.tab.reportHtml.innerText = report;
    }

    this.tab.context.activeSingleReportMarkdown = report;

    const existingFileList = this.tab.resultsBox.querySelector(".single-file-list-container");
    if (existingFileList) existingFileList.remove();

    if (fileList && fileList.length > 0) {
      const fileListDiv = document.createElement("div");
      fileListDiv.className = "single-file-list-container";
      fileListDiv.style.marginTop = "10px";
      fileListDiv.style.padding = "8px";
      fileListDiv.style.backgroundColor = "#f8fafc";
      fileListDiv.style.borderRadius = "6px";
      fileListDiv.style.border = "1px solid #e2e8f0";

      const header = document.createElement("div");
      header.style.fontWeight = "600";
      header.style.color = "#475569";
      header.style.fontSize = "0.85rem";
      header.style.cursor = "pointer";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "4px";

      const toggleIcon = document.createElement('span');
      toggleIcon.textContent = '▶';
      toggleIcon.style.fontSize = '0.75rem';
      toggleIcon.style.transition = 'transform 0.2s';

      const headerText = document.createElement("span");
      headerText.textContent = `📁 Xem danh sách tệp tin đã chấm (${fileList.length} file)`;

      header.appendChild(toggleIcon);
      header.appendChild(headerText);

      const fileListUl = document.createElement("ul");
      fileListUl.style.display = "none";
      fileListUl.style.margin = "6px 0 0 16px";
      fileListUl.style.padding = "0";
      fileListUl.style.listStyleType = "none";
      fileListUl.style.maxHeight = "150px";
      fileListUl.style.overflowY = "auto";
      fileListUl.style.fontSize = "0.8rem";
      fileListUl.style.color = "#64748b";

      fileList.forEach(filePath => {
        const li = document.createElement("li");
        li.style.padding = "2px 0";
        li.innerHTML = `📄 <span style="font-family: monospace;">${filePath}</span>`;
        fileListUl.appendChild(li);
      });

      header.addEventListener("click", () => {
        const isCollapsed = fileListUl.style.display === "none";
        fileListUl.style.display = isCollapsed ? "block" : "none";
        toggleIcon.style.transform = isCollapsed ? "rotate(90deg)" : "rotate(0deg)";
      });

      fileListDiv.appendChild(header);
      fileListDiv.appendChild(fileListUl);
      this.tab.resultsBox.insertBefore(fileListDiv, this.tab.reportHtml);
    }

    this.tab.resultsBox.style.display = "flex";
  }

  clearResults() {
    this.tab.resultsBox.style.display = "none";
  }
}
