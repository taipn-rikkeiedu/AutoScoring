// features/single-grader/singleGraderTab.js - Controller for Single Grader tab
import { TabController } from '../../core/tabController.js';
import { matchStudent } from '../../core/utils.js';
import { SingleGraderRenderer } from './singleGraderRenderer.js';
import { SingleGraderGrading } from './singleGraderGrading.js';

export class SingleGraderTab extends TabController {
  constructor(context) {
    super(context);
    this.renderer = new SingleGraderRenderer(this);
    this.grading = new SingleGraderGrading(this);
    this.currentClassId = null;
    this.activeStudent = null;
    this.initialize();
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
  }

  bindEvents() {
    this.chapterSelect.addEventListener("change", () => {
      this.renderer.onChapterChanged();
      this.updateContentScriptCache(null, null, null);
    });
    this.sessionSelect.addEventListener("change", () => {
      this.renderer.onSessionChanged();
      this.updateContentScriptCache(null, null, null);
    });
    this.assignmentSelect.addEventListener("change", () => {
      this.updateContentScriptCache(null, null, null);
    });
    this.repoUrlInput.addEventListener("input", () => {
      this.updateContentScriptCache(null, null, null);
    });
    this.detectedSubmissionSelect.addEventListener("change", (e) => {
      this.renderer.onDetectedSubmissionChanged(e.target.value);
      this.updateContentScriptCache(null, null, null);
    });
    this.gradeBtn.addEventListener("click", () => this.grading.gradeSingleSubmission());
  }

  disableSelectors() {
    this.renderer.disableSelectors();
  }

  populateChapters() {
    this.renderer.populateChapters();
  }

  updateDetectedSubmissionSelect() {
    this.renderer.updateDetectedSubmissionSelect();
  }

  enableGradeButton(enabled) {
    this.gradeBtn.disabled = !enabled;
  }

  updateContentScriptCache(score = null, report = null, fileList = null) {
    const repoUrl = this.repoUrlInput.value.trim();
    const chapter = this.chapterSelect.value;
    const session = this.sessionSelect.value;
    const assignmentName = this.assignmentSelect.value;

    const cacheData = { repoUrl, chapter, session, assignmentName, score, report, fileList };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action: 'updateGradingCache', singleGrader: cacheData },
          () => {
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
          
          const matched = matchStudent(studentList, normalizedTabUrl, pageId, pageName, transition);
          
          if (matched) {
            this.activeStudent = matched;
            if (this.studentResolvedBanner) {
              this.studentResolvedBanner.style.display = "block";
            }
            if (this.studentResolvedInfo) {
              this.studentResolvedInfo.textContent = `${matched.studentName} (${matched.studentId})`;
            }
            
            const matchClass = matched.submissionUrl.match(/\/homework-checking\/(\d+)/);
            if (matchClass) this.currentClassId = matchClass[1];
          } else {
            this.activeStudent = null;
            if (this.studentResolvedBanner) {
              this.studentResolvedBanner.style.display = "none";
            }
          }

          chrome.tabs.sendMessage(activeTab.id, { action: 'getGradingCache' }, (response) => {
            const err = chrome.runtime.lastError;
            if (!err && response && response.singleGrader) {
              const cache = response.singleGrader;
              
              if (cache.repoUrl) this.repoUrlInput.value = cache.repoUrl;
              if (cache.chapter) {
                this.chapterSelect.value = cache.chapter;
                this.renderer.onChapterChanged();
                if (cache.session) {
                  this.sessionSelect.value = cache.session;
                  this.renderer.onSessionChanged();
                  if (cache.assignmentName) {
                    this.assignmentSelect.value = cache.assignmentName;
                  }
                }
              }
              
              if (cache.score && cache.report) {
                this.renderer.renderResults(cache.score, cache.report, cache.fileList);
              } else {
                this.renderer.clearResults();
              }
            }
          });
        });
      };

      if (isWebPage) {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['core/studentScraper.js']
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
