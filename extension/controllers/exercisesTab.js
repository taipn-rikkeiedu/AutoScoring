import { DEFAULT_CRITERIA, extractCriteriaFromAssignment } from '../utils.js';

export class ExercisesTab {
  constructor(context) {
    this.context = context;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.exercisesScrapeBtn = document.getElementById("exercises-scrape-btn");
    this.exercisesDeleteBtn = document.getElementById("exercises-delete-btn");

    this.exChapterSelect = document.getElementById("ex-chapter-select");
    this.exSessionSelect = document.getElementById("ex-session-select");
    this.exAssignmentSelect = document.getElementById("ex-assignment-select");

    this.exDetailContainer = document.getElementById("ex-detail-container");
    this.exPromptText = document.getElementById("ex-prompt-text");
    this.exCriteriaText = document.getElementById("ex-criteria-text");
    this.exSaveBtn = document.getElementById("ex-save-btn");

    // Re-use Scrape Modal Elements from DOM
    this.scrapeModal = document.getElementById("scrape-modal");
    this.closeScrapeModalBtn = document.getElementById("close-scrape-modal-btn");
    this.scrapeChapterInput = document.getElementById("scrape-chapter");
    this.scrapeSessionInput = document.getElementById("scrape-session");
    this.scrapeAssignmentNameInput = document.getElementById("scrape-assignment-name");
    this.scrapeAssignmentTextInput = document.getElementById("scrape-assignment-text");
    this.scrapeCriteriaTextInput = document.getElementById("scrape-criteria-text");
    this.confirmScrapeBtn = document.getElementById("confirm-scrape-btn");
  }

  bindEvents() {
    this.exChapterSelect.addEventListener("change", () => this.onChapterChanged());
    this.exSessionSelect.addEventListener("change", () => this.onSessionChanged());
    this.exAssignmentSelect.addEventListener("change", () => this.updateDetailContainer());

    this.exSaveBtn.addEventListener("click", () => this.saveEdits());
    this.exercisesDeleteBtn.addEventListener("click", () => this.deleteAssignment());

    this.exercisesScrapeBtn.addEventListener("click", () => this.runLmsScraper());
    this.closeScrapeModalBtn.addEventListener("click", () => this.scrapeModal.style.display = "none");
    this.confirmScrapeBtn.addEventListener("click", () => this.confirmScrapedAssignment());
  }

  disableSelectors() {
    this.exChapterSelect.innerHTML = '<option value="">-- Lỗi cấu hình bài tập --</option>';
    this.exSessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.exSessionSelect.disabled = true;
    this.exAssignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.exAssignmentSelect.disabled = true;
  }

  populateChapters() {
    this.exChapterSelect.innerHTML = '<option value="">-- Chọn Chương --</option>';
    const templates = this.context.exerciseTemplates || {};
    const chapters = Object.keys(templates);

    if (chapters.length === 0) {
      this.exChapterSelect.innerHTML = '<option value="">-- Thư viện trống --</option>';
      return;
    }

    chapters.forEach(ch => {
      const option = document.createElement("option");
      option.value = ch;
      option.textContent = ch;
      this.exChapterSelect.appendChild(option);
    });

    this.exSessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.exSessionSelect.disabled = true;
    this.exAssignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.exAssignmentSelect.disabled = true;
    this.updateDetailContainer();
  }

  onChapterChanged() {
    const templates = this.context.exerciseTemplates || {};
    const selectedChapter = this.exChapterSelect.value;
    this.exSessionSelect.innerHTML = '<option value="">-- Chọn Session --</option>';

    if (!selectedChapter || !templates[selectedChapter]) {
      this.exSessionSelect.disabled = true;
      this.exAssignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
      this.exAssignmentSelect.disabled = true;
      this.updateDetailContainer();
      return;
    }

    const sessions = Object.keys(templates[selectedChapter]);
    sessions.forEach(sess => {
      const option = document.createElement("option");
      option.value = sess;
      option.textContent = sess;
      this.exSessionSelect.appendChild(option);
    });

    this.exSessionSelect.disabled = false;
    this.exAssignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.exAssignmentSelect.disabled = true;
    this.updateDetailContainer();
  }

  onSessionChanged() {
    const templates = this.context.exerciseTemplates || {};
    const selectedChapter = this.exChapterSelect.value;
    const selectedSession = this.exSessionSelect.value;
    this.exAssignmentSelect.innerHTML = '<option value="">-- Chọn Bài tập --</option>';

    if (!selectedSession || !templates[selectedChapter] || !templates[selectedChapter][selectedSession]) {
      this.exAssignmentSelect.disabled = true;
      this.updateDetailContainer();
      return;
    }

    const assignments = Object.keys(templates[selectedChapter][selectedSession]);
    assignments.forEach(ass => {
      const option = document.createElement("option");
      option.value = ass;
      option.textContent = ass;
      this.exAssignmentSelect.appendChild(option);
    });

    this.exAssignmentSelect.disabled = false;
    this.updateDetailContainer();
  }

  updateDetailContainer() {
    const chapter = this.exChapterSelect.value;
    const session = this.exSessionSelect.value;
    const assignmentName = this.exAssignmentSelect.value;

    if (chapter && session && assignmentName) {
      const template = this.context.exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
      if (template) {
        this.exPromptText.value = template.assignment || "";
        this.exCriteriaText.value = template.criteria || "";
        this.exDetailContainer.style.display = "flex";
        this.exercisesDeleteBtn.disabled = false;
        return;
      }
    }

    this.exDetailContainer.style.display = "none";
    this.exercisesDeleteBtn.disabled = true;
  }

  saveEdits() {
    const chapter = this.exChapterSelect.value;
    const session = this.exSessionSelect.value;
    const assignmentName = this.exAssignmentSelect.value;

    if (chapter && session && assignmentName) {
      const templates = this.context.exerciseTemplates;
      if (!templates[chapter]) templates[chapter] = {};
      if (!templates[chapter][session]) templates[chapter][session] = {};
      if (!templates[chapter][session][assignmentName]) templates[chapter][session][assignmentName] = {};

      templates[chapter][session][assignmentName].assignment = this.exPromptText.value;
      templates[chapter][session][assignmentName].criteria = this.exCriteriaText.value;

      chrome.storage.local.set({
        uploadedExercises: templates,
        exerciseSource: "upload"
      }, () => {
        window.showToast("Đã cập nhật thay đổi đề bài & tiêu chí thành công!", "success");
        this.context.config.exerciseSource = "upload";
        // Notify context that library has changed to reload other tabs' dropdowns
        if (this.context.onLibraryChanged) {
          this.context.onLibraryChanged();
        }
      });
    }
  }

  deleteAssignment() {
    const chapter = this.exChapterSelect.value;
    const session = this.exSessionSelect.value;
    const assignmentName = this.exAssignmentSelect.value;

    if (!chapter || !session || !assignmentName) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa bài tập "${assignmentName}" khỏi ngân hàng không?`)) {
      return;
    }

    const templates = this.context.exerciseTemplates;
    if (templates[chapter]?.[session]?.[assignmentName]) {
      delete templates[chapter][session][assignmentName];

      // Clean empty sessions or chapters
      if (Object.keys(templates[chapter][session]).length === 0) {
        delete templates[chapter][session];
      }
      if (Object.keys(templates[chapter]).length === 0) {
        delete templates[chapter];
      }

      this.context.exerciseTemplates = templates;

      chrome.storage.local.set({
        uploadedExercises: templates,
        exerciseSource: "upload"
      }, () => {
        window.showToast("Đã xóa bài tập thành công!", "success");
        this.context.config.exerciseSource = "upload";
        
        // Notify other tabs
        if (this.context.onLibraryChanged) {
          this.context.onLibraryChanged();
        }
        
        // Reload this tab dropdowns
        this.populateChapters();
      });
    }
  }

  async runLmsScraper() {
    this.exercisesScrapeBtn.disabled = true;
    this.exercisesScrapeBtn.querySelector('span').innerText = "⏳ Đang cào dữ liệu...";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        window.showToast("Không thể kết nối đến trang hiện tại.", "error");
        this.resetScrapeButton();
        return;
      }

      const activeTab = tabs[0];
      const isWebPage = activeTab.url && (activeTab.url.startsWith("http://") || activeTab.url.startsWith("https://"));

      if (!isWebPage) {
        window.showToast("Vui lòng mở trang web LMS học viên để cào đề bài.", "warning");
        this.resetScrapeButton();
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id, allFrames: true },
        files: ['lmsScraper.js']
      }, (results) => {
        this.resetScrapeButton();

        if (chrome.runtime.lastError) {
          window.showToast("Lỗi cào dữ liệu: " + chrome.runtime.lastError.message, "error");
          return;
        }

        let bestRes = null;
        if (results && results.length > 0) {
          for (const frameResult of results) {
            const res = frameResult.result;
            if (res && res.success) {
              if (!bestRes) {
                bestRes = res;
              } else {
                const currentLen = (bestRes.assignment || "").trim().length;
                const newLen = (res.assignment || "").trim().length;
                
                const isDefaultMsg = (text) => !text || text.includes("Không tìm thấy nội dung đề bài tự động");
                
                if (isDefaultMsg(bestRes.assignment) && !isDefaultMsg(res.assignment)) {
                  bestRes = res;
                } else if (!isDefaultMsg(res.assignment) && newLen > currentLen) {
                  bestRes = res;
                }
                
                if (!bestRes.chapter || bestRes.chapter === "Khóa học mặc định") {
                  if (res.chapter && res.chapter !== "Khóa học mặc định") {
                    bestRes.chapter = res.chapter;
                  }
                }
                if (!bestRes.session || bestRes.session === "Session 01: Nhập môn") {
                  if (res.session && res.session !== "Session 01: Nhập môn") {
                    bestRes.session = res.session;
                  }
                }
                if (!bestRes.assignmentName || bestRes.assignmentName === "Bài tập mới") {
                  if (res.assignmentName && res.assignmentName !== "Bài tập mới") {
                    bestRes.assignmentName = res.assignmentName;
                  }
                }
              }
            }
          }
        }

        if (bestRes && bestRes.success) {
          const parsed = extractCriteriaFromAssignment(bestRes.assignment);

          this.scrapeChapterInput.value = bestRes.chapter;
          this.scrapeSessionInput.value = bestRes.session;
          this.scrapeAssignmentNameInput.value = bestRes.assignmentName;
          this.scrapeAssignmentTextInput.value = parsed.assignment;
          this.scrapeCriteriaTextInput.value = parsed.criteria || DEFAULT_CRITERIA;

          this.scrapeModal.style.display = "flex";
        } else {
          window.showToast("Không lấy được kết quả từ trang web. Vui lòng mở trang chứa đề bài.", "warning");
        }
      });
    });
  }

  resetScrapeButton() {
    this.exercisesScrapeBtn.disabled = false;
    this.exercisesScrapeBtn.querySelector('span').innerText = "📥 Cào đề bài từ LMS";
  }

  confirmScrapedAssignment() {
    const chapter = this.scrapeChapterInput.value.trim();
    const session = this.scrapeSessionInput.value.trim();
    const name = this.scrapeAssignmentNameInput.value.trim();
    const assignment = this.scrapeAssignmentTextInput.value.trim();
    const criteria = this.scrapeCriteriaTextInput.value.trim();

    if (!chapter || !session || !name || !assignment) {
      window.showToast("Vui lòng nhập đầy đủ thông tin bài tập.", "warning");
      return;
    }

    const templates = this.context.exerciseTemplates || {};
    if (!templates[chapter]) templates[chapter] = {};
    if (!templates[chapter][session]) templates[chapter][session] = {};

    templates[chapter][session][name] = {
      assignment,
      criteria
    };

    this.context.exerciseTemplates = templates;

    chrome.storage.local.set({
      uploadedExercises: templates,
      exerciseSource: "upload"
    }, () => {
      window.showToast(`Đã thêm bài tập "${name}" vào Chương "${chapter}" thành công!`, "success");
      this.context.config.exerciseSource = "upload";
      this.scrapeModal.style.display = "none";

      // Notify other tabs
      if (this.context.onLibraryChanged) {
        this.context.onLibraryChanged();
      }

      // Reload this tab and select the newly added assignment
      this.populateChapters();

      this.exChapterSelect.value = chapter;
      this.exChapterSelect.dispatchEvent(new Event("change"));

      this.exSessionSelect.value = session;
      this.exSessionSelect.dispatchEvent(new Event("change"));

      this.exAssignmentSelect.value = name;
      this.exAssignmentSelect.dispatchEvent(new Event("change"));
    });
  }
}
