import { GitHubService } from '../githubService.js';
import { AIService } from '../aiService.js';
import { parseScore, DEFAULT_CRITERIA } from '../utils.js';
import { SupabaseService } from '../supabaseService.js';

function scrapeStudentDetailInfo() {
  let studentName = '';
  let studentId = '';
  
  const pageText = document.body.innerText || '';
  // Tìm mã MSSV dạng PTIT-HCM-008 hoặc PTIT HCM 008, PTIT_HCM_008
  const idMatch = pageText.match(/PTIT[-_\s]?[A-Z]+[-_\s]?\d+/i);
  if (idMatch) {
    studentId = idMatch[0].trim().replace(/[\s_]/g, '-').toUpperCase();
  }
  
  // Dò tìm tên học sinh hiển thị trên các thẻ tiêu đề hoặc breadcrumbs
  const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .student-name, [class*="student-name"], [class*="user-name"], .breadcrumb, [class*="title"], [class*="header"]'));
  for (const el of elements) {
    const text = el.textContent.trim();
    if (text && text.length > 2 && text.length < 50 && !text.includes('http') && !text.includes('/') && /^[A-ZÀ-Ỹ]/.test(text.split(' ')[0])) {
      studentName = text.split('\n')[0].trim();
      break;
    }
  }
  
  return { studentId, studentName };
}

export class SingleGraderTab {
  constructor(context) {
    this.context = context;
    this.initElements();
    this.bindEvents();
    this.resolveStudentFromTabUrl();
  }

  initElements() {
    this.repoUrlInput = document.getElementById("repo-url");
    this.chapterSelect = document.getElementById("chapter-select");
    this.sessionSelect = document.getElementById("session-select");
    this.assignmentSelect = document.getElementById("assignment-select");
    this.gradeBtn = document.getElementById("grade-btn");
    
    this.detectedSelectGroup = document.getElementById("detected-select-group");
    this.detectedSubmissionSelect = document.getElementById("detected-submission-select");

    this.statusBox = document.getElementById("status-box");
    this.statusMessage = document.getElementById("status-message");
    this.resultsBox = document.getElementById("results-box");
    this.scoreVal = document.getElementById("score-val");
    this.reportHtml = document.getElementById("report-html");

    this.studentResolvedBanner = document.getElementById("student-resolved-banner");
    this.studentResolvedInfo = document.getElementById("student-resolved-info");
    this.activeStudent = null;
  }

  bindEvents() {
    this.chapterSelect.addEventListener("change", () => {
      this.onChapterChanged();
      this.updateContentScriptCache(null, null, null);
    });
    this.sessionSelect.addEventListener("change", () => {
      this.onSessionChanged();
      this.updateContentScriptCache(null, null, null);
    });
    this.assignmentSelect.addEventListener("change", () => {
      this.updateContentScriptCache(null, null, null);
    });
    this.repoUrlInput.addEventListener("input", () => {
      this.updateContentScriptCache(null, null, null);
    });
    this.detectedSubmissionSelect.addEventListener("change", (e) => {
      this.onDetectedSubmissionChanged(e.target.value);
      this.updateContentScriptCache(null, null, null);
    });
    this.gradeBtn.addEventListener("click", () => this.gradeSingleSubmission());
  }

  disableSelectors() {
    this.chapterSelect.innerHTML = '<option value="">-- Lỗi cấu hình bài tập --</option>';
    this.sessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.sessionSelect.disabled = true;
    this.assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.assignmentSelect.disabled = true;
  }

  populateChapters() {
    this.chapterSelect.innerHTML = '<option value="">-- Chọn Chương --</option>';
    const templates = this.context.exerciseTemplates || {};
    const chapters = Object.keys(templates);
    
    if (chapters.length === 0) {
      this.chapterSelect.innerHTML = '<option value="">-- Thư viện trống --</option>';
      return;
    }

    chapters.forEach(ch => {
      const option = document.createElement("option");
      option.value = ch;
      option.textContent = ch;
      this.chapterSelect.appendChild(option);
    });

    this.sessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.sessionSelect.disabled = true;
    this.assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.assignmentSelect.disabled = true;
  }

  onChapterChanged() {
    const templates = this.context.exerciseTemplates || {};
    const selectedChapter = this.chapterSelect.value;
    this.sessionSelect.innerHTML = '<option value="">-- Chọn Session --</option>';
    
    if (!selectedChapter || !templates[selectedChapter]) {
      this.sessionSelect.disabled = true;
      this.assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
      this.assignmentSelect.disabled = true;
      return;
    }

    const sessions = Object.keys(templates[selectedChapter]);
    sessions.forEach(sess => {
      const option = document.createElement("option");
      option.value = sess;
      option.textContent = sess;
      this.sessionSelect.appendChild(option);
    });

    this.sessionSelect.disabled = false;
    this.assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.assignmentSelect.disabled = true;
  }

  onSessionChanged() {
    const templates = this.context.exerciseTemplates || {};
    const selectedChapter = this.chapterSelect.value;
    const selectedSession = this.sessionSelect.value;
    this.assignmentSelect.innerHTML = '<option value="">-- Chọn Bài tập --</option>';

    if (!selectedSession || !templates[selectedChapter] || !templates[selectedChapter][selectedSession]) {
      this.assignmentSelect.disabled = true;
      return;
    }

    const assignments = Object.keys(templates[selectedChapter][selectedSession]);
    assignments.forEach(ass => {
      const option = document.createElement("option");
      option.value = ass;
      option.textContent = ass;
      this.assignmentSelect.appendChild(option);
    });

    this.assignmentSelect.disabled = false;
  }

  updateDetectedSubmissionSelect() {
    if (!this.detectedSubmissionSelect || !this.detectedSelectGroup) return;
    
    this.detectedSubmissionSelect.innerHTML = '<option value="">-- Chọn bài nộp phát hiện trên trang --</option>';
    const submissions = this.context.submissions || [];
    
    if (submissions.length > 0) {
      submissions.forEach((sub, index) => {
        const option = document.createElement("option");
        option.value = index;
        const shortUrl = sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "");
        option.textContent = `${sub.exerciseName} (${shortUrl})`;
        this.detectedSubmissionSelect.appendChild(option);
      });
      this.detectedSelectGroup.style.display = "flex";
    } else {
      this.detectedSelectGroup.style.display = "none";
    }
  }

  onDetectedSubmissionChanged(val) {
    if (!val) {
      this.repoUrlInput.value = "";
      this.chapterSelect.value = "";
      this.chapterSelect.dispatchEvent(new Event("change"));
      return;
    }
    
    const index = parseInt(val, 10);
    const sub = this.context.submissions?.[index];
    if (!sub) return;
    
    this.repoUrlInput.value = sub.githubUrl;
    
    if (sub.matchedTemplate) {
      const { chapter, session, assignmentName } = sub.matchedTemplate;
      
      this.chapterSelect.value = chapter;
      this.chapterSelect.dispatchEvent(new Event("change"));
      
      this.sessionSelect.value = session;
      this.sessionSelect.dispatchEvent(new Event("change"));
      
      this.assignmentSelect.value = assignmentName;
    } else {
      this.chapterSelect.value = "";
      this.chapterSelect.dispatchEvent(new Event("change"));
    }
  }

  enableGradeButton(enabled) {
    this.gradeBtn.disabled = !enabled;
  }

  async gradeSingleSubmission() {
    const repoUrl = this.repoUrlInput.value.trim();
    const chapter = this.chapterSelect.value;
    const session = this.sessionSelect.value;
    const assignmentName = this.assignmentSelect.value;

    if (!repoUrl) {
      window.showToast("Vui lòng nhập GitHub Repository URL.", "warning");
      return;
    }
    if (!chapter || !session || !assignmentName) {
      window.showToast("Vui lòng chọn đầy đủ Chương, Session và Bài tập.", "warning");
      return;
    }

    this.gradeBtn.disabled = true;
    this.resultsBox.style.display = "none";
    this.statusBox.style.display = "flex";

    try {
      const template = this.context.exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
      if (!template || !template.assignment) {
        throw new Error("Mẫu bài tập thiếu nội dung đề bài.");
      }

      const activeCriteria = template.criteria && template.criteria.trim().length > 0
        ? template.criteria
        : DEFAULT_CRITERIA;

      const github = new GitHubService(this.context.config.githubToken, this.context.config.graderIgnoreItems);
      const repoData = await github.getRepoContents(repoUrl, (msg) => {
        this.statusMessage.innerText = msg;
      });

      this.statusMessage.innerText = "AI đang thực hiện chấm điểm...";
      const ai = new AIService(this.context.config);
      const report = await ai.generateGradingReport(template.assignment, activeCriteria, repoData.content);

      this.statusBox.style.display = "none";
      this.context.activeSingleReportMarkdown = report;

      const score = parseScore(report);
      this.scoreVal.innerText = score ? `${score} / 100` : "N/A";
      
      if (score) {
        const val = parseFloat(score);
        if (val >= 80) this.scoreVal.style.background = "linear-gradient(135deg, #16a34a, #15803d)";
        else if (val >= 50) this.scoreVal.style.background = "linear-gradient(135deg, #d97706, #b45309)";
        else this.scoreVal.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";
      }

      if (typeof marked !== 'undefined') {
        this.reportHtml.innerHTML = marked.parse(report);
      } else {
        this.reportHtml.innerText = report;
      }

      // Render file list if present in repoData
      const existingFileList = this.resultsBox.querySelector(".single-file-list-container");
      if (existingFileList) existingFileList.remove();
      
      if (repoData.fileList && repoData.fileList.length > 0) {
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
        headerText.textContent = `📁 Xem danh sách tệp tin đã chấm (${repoData.fileList.length} file)`;
        
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
        
        repoData.fileList.forEach(filePath => {
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
        
        // Append before reportHtml
        this.resultsBox.insertBefore(fileListDiv, this.reportHtml);
      }

      this.resultsBox.style.display = "flex";

      // Save to Class Student Database if matched
      if (this.activeStudent) {
        chrome.storage.local.get("classStudentList", (res) => {
          const studentList = res.classStudentList || [];
          const idx = studentList.findIndex(st => st.submissionUrl === this.activeStudent.submissionUrl);
          if (idx !== -1) {
            studentList[idx].score = score ? parseFloat(score) : null;
            studentList[idx].comments = report;
            studentList[idx].githubUrl = repoUrl;
            studentList[idx].assignmentName = assignmentName;
            
             const classIdMatch = (studentList[idx].submissionUrl || "").match(/\/homework-checking\/(\d+)/);
             const classId = classIdMatch ? classIdMatch[1] : "unknown";

             chrome.storage.local.set({ classStudentList: studentList }, async () => {
               console.log("Updated student grading in list:", studentList[idx]);
                if (SupabaseService.isEnabled(this.context.config) && classId !== "unknown") {
                  try {
                    await SupabaseService.upsertClassStudents(this.context.config, classId, [studentList[idx]]);
                  } catch (syncErr) {
                    console.warn("Lỗi đồng bộ Supabase:", syncErr);
                    window.showToast("Đồng bộ kết quả lên Cloud thất bại: " + syncErr.message, "warning");
                  }
                }
               if (this.context.autoGraderTab) {
                 this.context.autoGraderTab.renderClassList();
               }
             });
          }
        });
      }
      this.updateContentScriptCache(score, report, repoData.fileList);
    } catch (err) {
      console.error(err);
      window.showToast(`Lỗi: ${err.message}`, "error");
      this.statusBox.style.display = "none";
    } finally {
      this.gradeBtn.disabled = false;
    }
  }

  updateContentScriptCache(score = null, report = null, fileList = null) {
    const repoUrl = this.repoUrlInput.value.trim();
    const chapter = this.chapterSelect.value;
    const session = this.sessionSelect.value;
    const assignmentName = this.assignmentSelect.value;

    const cacheData = {
      repoUrl,
      chapter,
      session,
      assignmentName,
      score,
      report,
      fileList
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action: 'updateGradingCache', singleGrader: cacheData },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn("REduX: updateContentScriptCache (single) failed:", chrome.runtime.lastError.message);
            }
          }
        );
      }
    });
  }

  resolveStudentFromTabUrl() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const activeTab = tabs[0];
      const url = activeTab.url;
      if (!url) return;
      
      const normalizedTabUrl = url.split('?')[0].split('#')[0];
      const isWebPage = url.startsWith("http://") || url.startsWith("https://");
      
      const doMatching = (scrapedInfo = null) => {
        const pageId = scrapedInfo?.studentId;
        const pageName = scrapedInfo?.studentName;
        
        chrome.storage.local.get(["classStudentList", "activeStudentTransition"], (res) => {
          const studentList = res.classStudentList || [];
          const transition = res.activeStudentTransition || null;
          
          const matched = studentList.find(st => {
            // Cấp độ 1: Khớp chính xác hoặc khớp URL chứa ID
            if (st.submissionUrl === normalizedTabUrl) return true;
            if (st.dbId && normalizedTabUrl.includes(st.dbId)) return true;
            if (st.studentId && st.studentId !== 'N/A' && normalizedTabUrl.includes(st.studentId)) return true;
            
            // Cấp độ 2: Khớp mã MSSV cào được từ trang hiện tại
            if (pageId && st.studentId && st.studentId !== 'N/A' && st.studentId.replace(/[\s_-]/g, '').toUpperCase() === pageId.replace(/[\s_-]/g, '').toUpperCase()) return true;
            
            // Cấp độ 3: Khớp họ tên cào được từ trang hiện tại
            if (pageName && st.studentName && (st.studentName.toLowerCase().includes(pageName.toLowerCase()) || pageName.toLowerCase().includes(st.studentName.toLowerCase()))) return true;
            
            // Cấp độ 4: Khớp thông tin chuyển hướng vừa được click (activeStudentTransition)
            if (transition && Date.now() - transition.timestamp < 300000) {
              if (st.studentId && st.studentId !== 'N/A' && transition.studentId && st.studentId.toLowerCase() === transition.studentId.toLowerCase()) return true;
              if (st.studentName && transition.studentName && st.studentName.toLowerCase() === transition.studentName.toLowerCase()) return true;
            }
            
            return false;
          });
          
          if (matched) {
            this.activeStudent = matched;
            if (this.studentResolvedBanner) {
              this.studentResolvedBanner.style.display = "block";
            }
            if (this.studentResolvedInfo) {
              this.studentResolvedInfo.textContent = `${matched.studentName} (${matched.studentId})`;
            }
          } else {
            this.activeStudent = null;
            if (this.studentResolvedBanner) {
              this.studentResolvedBanner.style.display = "none";
            }
          }

          // Check Single Grader cache from content script
          chrome.tabs.sendMessage(activeTab.id, { action: 'getGradingCache' }, (response) => {
            const err = chrome.runtime.lastError;
            if (!err && response && response.singleGrader) {
              const cache = response.singleGrader;
              
              if (cache.repoUrl) this.repoUrlInput.value = cache.repoUrl;
              
              if (cache.chapter) {
                this.chapterSelect.value = cache.chapter;
                this.onChapterChanged();
                if (cache.session) {
                  this.sessionSelect.value = cache.session;
                  this.onSessionChanged();
                  if (cache.assignmentName) {
                    this.assignmentSelect.value = cache.assignmentName;
                  }
                }
              }
              
              if (cache.score && cache.report) {
                this.scoreVal.innerText = `${cache.score} / 100`;
                const val = parseFloat(cache.score);
                if (val >= 80) this.scoreVal.style.background = "linear-gradient(135deg, #16a34a, #15803d)";
                else if (val >= 50) this.scoreVal.style.background = "linear-gradient(135deg, #d97706, #b45309)";
                else this.scoreVal.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";
                
                if (typeof marked !== 'undefined') {
                  this.reportHtml.innerHTML = marked.parse(cache.report);
                } else {
                  this.reportHtml.innerText = cache.report;
                }
                
                this.context.activeSingleReportMarkdown = cache.report;
                
                const existingFileList = this.resultsBox.querySelector(".single-file-list-container");
                if (existingFileList) existingFileList.remove();
                
                if (cache.fileList && cache.fileList.length > 0) {
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
                  headerText.textContent = `📁 Xem danh sách tệp tin đã chấm (${cache.fileList.length} file)`;
                  
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
                  
                  cache.fileList.forEach(filePath => {
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
                  this.resultsBox.insertBefore(fileListDiv, this.reportHtml);
                }
                
                this.resultsBox.style.display = "flex";
              } else {
                this.resultsBox.style.display = "none";
              }
            }
          });
        });
      };

      if (isWebPage) {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: scrapeStudentDetailInfo
        }, (results) => {
          if (chrome.runtime.lastError || !results || !results[0]) {
            doMatching(null);
          } else {
            doMatching(results[0].result);
          }
        });
      } else {
        doMatching(null);
      }
    });
  }
}
