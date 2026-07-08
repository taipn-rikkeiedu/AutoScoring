// features/exercises/exercisesTab.js - Controller for Exercises tab
import { TabController } from '../../core/tabController.js';
import { DEFAULT_CRITERIA, extractCriteriaFromAssignment, mergeScrapedFrameResults } from '../../core/utils.js';
import { SupabaseService } from '../../services/supabaseService.js';
import { ExercisesRenderer } from './exercisesRenderer.js';

export class ExercisesTab extends TabController {
  constructor(context) {
    super(context);
    this.renderer = new ExercisesRenderer(this);
    this.initialize();
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
    this.exChapterSelect.addEventListener("change", () => this.renderer.onChapterChanged());
    this.exSessionSelect.addEventListener("change", () => this.renderer.onSessionChanged());
    this.exAssignmentSelect.addEventListener("change", () => this.renderer.updateDetailContainer());

    this.exSaveBtn.addEventListener("click", () => this.saveEdits());
    this.exercisesDeleteBtn.addEventListener("click", () => this.deleteAssignment());

    this.exercisesScrapeBtn.addEventListener("click", () => this.runLmsScraper());
    this.closeScrapeModalBtn.addEventListener("click", () => this.scrapeModal.style.display = "none");
    this.confirmScrapeBtn.addEventListener("click", () => this.confirmScrapedAssignment());
  }

  disableSelectors() {
    this.renderer.disableSelectors();
  }

  populateChapters() {
    this.renderer.populateChapters();
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
      }, async () => {
        window.showToast("Đã cập nhật thay đổi đề bài & tiêu chí thành công!", "success");
        this.context.config.exerciseSource = "upload";
        
        if (SupabaseService.isEnabled(this.context.config)) {
          try {
            await SupabaseService.upsertExercise(
              this.context.config,
              chapter,
              session,
              assignmentName,
              this.exPromptText.value,
              this.exCriteriaText.value
            );
          } catch (syncErr) {
            console.warn("Lỗi đồng bộ Supabase:", syncErr);
            window.showToast("Đồng bộ đề bài lên Cloud thất bại: " + syncErr.message, "warning");
          }
        }

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

      if (Object.keys(templates[chapter][session]).length === 0) delete templates[chapter][session];
      if (Object.keys(templates[chapter]).length === 0) delete templates[chapter];

      this.context.exerciseTemplates = templates;

      chrome.storage.local.set({
        uploadedExercises: templates,
        exerciseSource: "upload"
      }, () => {
        window.showToast("Đã xóa bài tập thành công!", "success");
        this.context.config.exerciseSource = "upload";
        
        if (this.context.onLibraryChanged) {
          this.context.onLibraryChanged();
        }
        
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
        files: ['core/lmsScraper.js']
      }, (results) => {
        this.resetScrapeButton();

        if (chrome.runtime.lastError) {
          window.showToast("Lỗi cào dữ liệu: " + chrome.runtime.lastError.message, "error");
          return;
        }

        const bestRes = mergeScrapedFrameResults(results);

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

    templates[chapter][session][name] = { assignment, criteria };
    this.context.exerciseTemplates = templates;

    chrome.storage.local.set({
      uploadedExercises: templates,
      exerciseSource: "upload"
    }, async () => {
      window.showToast(`Đã thêm bài tập "${name}" vào Chương "${chapter}" thành công!`, "success");
      this.context.config.exerciseSource = "upload";
      this.scrapeModal.style.display = "none";

      if (SupabaseService.isEnabled(this.context.config)) {
        try {
          await SupabaseService.upsertExercise(
            this.context.config, chapter, session, name, assignment, criteria
          );
        } catch (syncErr) {
          console.warn("Lỗi đồng bộ Supabase:", syncErr);
          window.showToast("Đồng bộ đề bài lên Cloud thất bại: " + syncErr.message, "warning");
        }
      }

      if (this.context.onLibraryChanged) {
        this.context.onLibraryChanged();
      }

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
