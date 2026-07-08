// features/auto-grader/autoGraderTab.js - Controller for Bulk Grader tab
import { TabController } from '../../core/tabController.js';
import { findMatchingTemplate } from '../../core/utils.js';
import { AutoGraderRenderer } from './autoGraderRenderer.js';
import { AutoGraderGrading } from './autoGraderGrading.js';

export class AutoGraderTab extends TabController {
  constructor(context) {
    super(context);
    this.isScanning = false;
    this.cachedOptionsHTML = null;
    this.renderer = new AutoGraderRenderer(this);
    this.grading = new AutoGraderGrading(this);
    this.initialize();
  }

  initElements() {
    this.detectedStatusBanner = document.getElementById("detected-status-banner");
    this.tableEl = document.getElementById("detected-table-el");
    this.detectedListBody = document.getElementById("detected-list-body");
    this.emptyState = document.getElementById("auto-empty-state");

    this.rescanPageBtn = document.getElementById("rescan-page-btn");
    this.bulkGradeBtn = document.getElementById("bulk-grade-btn");
    this.selectAllSubs = document.getElementById("select-all-subs");

    this.bulkProgressContainer = document.getElementById("bulk-progress-container");
    this.bulkProgressFill = document.getElementById("bulk-progress-fill");
    this.bulkProgressText = document.getElementById("bulk-progress-text");

    this.bulkStudentResolvedBanner = document.getElementById("bulk-student-resolved-banner");
    this.bulkStudentResolvedInfo = document.getElementById("bulk-student-resolved-info");
  }

  bindEvents() {
    this.rescanPageBtn.addEventListener("click", () => this.triggerPageScan(true));
    this.bulkGradeBtn.addEventListener("click", () => this.grading.runBulkGrading());
    this.selectAllSubs.addEventListener("change", (e) => this.renderer.toggleSelectAll(e.target.checked));
  }

  updateBulkButtonText() {
    this.renderer.updateBulkButtonText();
  }

  renderSubmissions(forceRefresh = false) {
    this.renderer.renderSubmissions(forceRefresh);
  }

  updateContentScriptCache() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action: 'updateGradingCache', submissions: this.context.submissions },
          () => {
            if (chrome.runtime.lastError) {
              console.warn("REduX: updateContentScriptCache failed:", chrome.runtime.lastError.message);
            }
          }
        );
      }
    });
  }

  executePageScrape(activeTab, shouldMerge = false) {
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['core/submissionsScraper.js']
    }, (results) => {
      this.isScanning = false;
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        if (this.detectedStatusBanner) {
          this.detectedStatusBanner.innerHTML = "❌ Không thể quét trang: " + chrome.runtime.lastError.message;
          this.detectedStatusBanner.style.backgroundColor = "#fef2f2";
          this.detectedStatusBanner.style.color = "#991b1b";
          this.detectedStatusBanner.style.borderLeftColor = "#ef4444";
        }
        this.context.submissions = [];
        this.renderSubmissions();
        return;
      }
      
      if (results && results[0] && results[0].result) {
        const scrapedItems = results[0].result;
        
        const mapAndResolve = (cachedList = []) => {
          this.context.submissions = scrapedItems.map(item => {
            const cachedItem = cachedList ? cachedList.find(c => c.githubUrl === item.githubUrl) : null;
            const match = findMatchingTemplate(item.exerciseName, this.context.exerciseTemplates);
            if (cachedItem) {
              return {
                exerciseName: item.exerciseName,
                studentName: item.studentName || cachedItem.studentName || '',
                githubUrl: item.githubUrl,
                checked: cachedItem.checked !== undefined ? cachedItem.checked : true,
                matchedTemplate: cachedItem.matchedTemplate || match,
                status: cachedItem.status || 'pending',
                score: cachedItem.score !== undefined ? cachedItem.score : null,
                report: cachedItem.report || null,
                error: cachedItem.error || null,
                fileList: cachedItem.fileList || null
              };
            } else {
              return {
                exerciseName: item.exerciseName,
                studentName: item.studentName || '',
                githubUrl: item.githubUrl,
                checked: true,
                matchedTemplate: match,
                status: 'pending',
                score: null,
                report: null,
                error: null,
                fileList: null
              };
            }
          });
          
          this.updateContentScriptCache();
          
          const foundCount = this.context.submissions.length;
          if (this.detectedStatusBanner) {
            if (foundCount > 0) {
              this.detectedStatusBanner.innerHTML = `✅ Đã tìm thấy ${foundCount} bài tập chứa liên kết GitHub trên trang.`;
              this.detectedStatusBanner.style.backgroundColor = "#f0fdf4";
              this.detectedStatusBanner.style.color = "#166534";
              this.detectedStatusBanner.style.borderLeftColor = "#22c55e";
            } else {
              this.detectedStatusBanner.innerHTML = "❓ Không tìm thấy bài tập nộp trên trang này.";
              this.detectedStatusBanner.style.backgroundColor = "#fffbeb";
              this.detectedStatusBanner.style.color = "#b45309";
              this.detectedStatusBanner.style.borderLeftColor = "#f59e0b";
            }
          }
          this.renderSubmissions();
        };

        if (shouldMerge) {
          chrome.tabs.sendMessage(activeTab.id, { action: 'getGradingCache' }, (response) => {
            const err = chrome.runtime.lastError;
            const cachedList = (!err && response) ? response.submissions : null;
            mapAndResolve(cachedList);
          });
        } else {
          mapAndResolve(null);
        }
      } else {
        if (this.detectedStatusBanner) {
          this.detectedStatusBanner.innerHTML = "❓ Không tìm thấy bài tập nào.";
          this.detectedStatusBanner.style.backgroundColor = "#f1f5f9";
          this.detectedStatusBanner.style.color = "#475569";
          this.detectedStatusBanner.style.borderLeftColor = "#64748b";
        }
        this.context.submissions = [];
        this.updateContentScriptCache();
        this.renderSubmissions();
      }
    });
  }

  triggerPageScan(forceScan = false) {
    if (this.isScanning) return;
    this.isScanning = true;

    if (this.detectedStatusBanner) {
      this.detectedStatusBanner.innerHTML = "🔍 Đang tìm kiếm các bài tập trên trang... ";
      this.detectedStatusBanner.style.backgroundColor = "#f1f5f9";
      this.detectedStatusBanner.style.color = "#334155";
      this.detectedStatusBanner.style.borderLeftColor = "#3b82f6";
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        this.isScanning = false;
        if (this.detectedStatusBanner) {
          this.detectedStatusBanner.innerHTML = "❌ Lỗi: Không thể truy cập tab hiện tại.";
          this.detectedStatusBanner.style.backgroundColor = "#fef2f2";
          this.detectedStatusBanner.style.color = "#991b1b";
          this.detectedStatusBanner.style.borderLeftColor = "#ef4444";
        }
        return;
      }
      
      const activeTab = tabs[0];
      const isWebPage = activeTab.url && (activeTab.url.startsWith("http://") || activeTab.url.startsWith("https://"));
      
      if (!isWebPage) {
        this.isScanning = false;
        if (this.detectedStatusBanner) {
          this.detectedStatusBanner.innerHTML = "💡 Hãy mở trang web có bài tập của học viên để quét.";
          this.detectedStatusBanner.style.backgroundColor = "#fffbeb";
          this.detectedStatusBanner.style.color = "#b45309";
          this.detectedStatusBanner.style.borderLeftColor = "#f59e0b";
        }
        this.context.submissions = [];
        this.renderSubmissions();
        return;
      }
      
      if (!forceScan) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'getGradingCache' }, (response) => {
          const err = chrome.runtime.lastError;
          if (err || !response || !Array.isArray(response.submissions)) {
            this.executePageScrape(activeTab, false);
          } else {
            this.context.submissions = response.submissions;
            if (this.detectedStatusBanner) {
              this.detectedStatusBanner.innerHTML = `✅ Đã khôi phục trạng thái chấm (${this.context.submissions.length} bài) từ bộ nhớ tab hiện tại.`;
              this.detectedStatusBanner.style.backgroundColor = "#f0fdf4";
              this.detectedStatusBanner.style.color = "#166534";
              this.detectedStatusBanner.style.borderLeftColor = "#22c55e";
            }
            this.renderSubmissions();
            this.isScanning = false;
          }
        });
      } else {
        this.executePageScrape(activeTab, true);
      }
    });
  }
}
