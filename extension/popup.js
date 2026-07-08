// popup.js - Extension popup entrypoint
import { SettingsTab } from './features/settings/settingsTab.js';
import { SingleGraderTab } from './features/single-grader/singleGraderTab.js';
import { AutoGraderTab } from './features/auto-grader/autoGraderTab.js';
import { ClassListTab } from './features/class-list/classListTab.js';
import { ExercisesTab } from './features/exercises/exercisesTab.js';
import { CareTab } from './features/care/careTab.js';
import { SupabaseService } from './services/supabaseService.js';
import { AIService } from './services/aiService.js';
import { Navigation } from './core/navigation.js';
import { ReportModal } from './core/modal.js';
import { loadExercises } from './core/exerciseLoader.js';

document.addEventListener("DOMContentLoaded", () => {
  const tabSelect = document.getElementById("tab-navigator-select");
  const tabAuto = document.getElementById("tab-auto");
  const tabGrader = document.getElementById("tab-grader");
  const tabClassList = document.getElementById("tab-class-list");
  const tabCare = document.getElementById("tab-care");
  const tabExercises = document.getElementById("tab-exercises");
  const tabSettings = document.getElementById("tab-settings");

  const appVersionTag = document.getElementById("app-version");
  const supabaseStatusTag = document.getElementById("supabase-status-tag");

  const appVersion = chrome.runtime.getManifest().version;

  const context = {
    config: {
      aiProvider: "gemini",
      aiApiKey: "",
      aiApiUrl: "",
      aiModelName: "gemini-3.5-flash",
      githubToken: "",
      systemPrompt: "",
      graderIgnoreItems: [
        "build/", "dist/", "target/", "out/", ".vscode/", ".idea/", "env/", "venv/",
        "Scripts/", "Lib/", "scripts/", "lib/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", 
        "composer.lock", "gradlew/mvnw", ".gitignore"
      ],
      exerciseSource: "local",
      exerciseApiUrl: "",
      exerciseApiToken: "",
      uploadedExercises: null
    },
    exerciseTemplates: {},
    submissions: [],
    activeReportMarkdown: "",
    activeSingleReportMarkdown: "",

    updateDetectedSubmissionSelect() {
      singleGraderTab.updateDetectedSubmissionSelect();
    },
    showReportModal(sub) {
      reportModal.showReportModal(sub);
    },
    onConfigSaved(newConfig) {
      context.config = newConfig;
      testConnectionAndLoadExercises();
    },
    onLibraryChanged() {
      singleGraderTab.populateChapters();
      autoGraderTab.renderSubmissions();
      classListTab.renderClassList();
    }
  };

  const settingsTab = new SettingsTab(context);
  const singleGraderTab = new SingleGraderTab(context);
  const autoGraderTab = new AutoGraderTab(context);
  const classListTab = new ClassListTab(context);
  const exercisesTab = new ExercisesTab(context);
  const careTab = new CareTab(context);

  context.singleGraderTab = singleGraderTab;
  context.autoGraderTab = autoGraderTab;
  context.classListTab = classListTab;
  context.careTab = careTab;

  const navigation = new Navigation(context, {
    tabSelect, tabAuto, tabGrader, tabClassList, tabCare, tabExercises, tabSettings
  });

  const reportModal = new ReportModal(context);

  if (supabaseStatusTag) {
    supabaseStatusTag.addEventListener("click", () => {
      tabSelect.value = "tab-settings";
      navigation.activateTabById("tab-settings");
    });
  }

  const loadStoredConfig = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        "aiProvider", "aiApiKey", "aiApiUrl", "aiModelName", "githubToken", "systemPrompt",
        "graderIgnoreItems", "exerciseSource", "exerciseApiUrl", "exerciseApiToken", "uploadedExercises",
        "supabaseSyncEnabled", "supabaseUrl", "supabaseAnonKey"
      ], (stored) => {
        if (stored.aiProvider) context.config.aiProvider = stored.aiProvider;
        if (stored.aiApiKey) context.config.aiApiKey = stored.aiApiKey;
        if (stored.aiApiUrl) context.config.aiApiUrl = stored.aiApiUrl;
        if (stored.aiModelName) context.config.aiModelName = stored.aiModelName;
        if (stored.githubToken) context.config.githubToken = stored.githubToken;
        if (stored.systemPrompt) context.config.systemPrompt = stored.systemPrompt;
        if (stored.graderIgnoreItems !== undefined) context.config.graderIgnoreItems = stored.graderIgnoreItems;
        if (stored.exerciseSource) context.config.exerciseSource = stored.exerciseSource;
        if (stored.exerciseApiUrl) context.config.exerciseApiUrl = stored.exerciseApiUrl;
        if (stored.exerciseApiToken) context.config.exerciseApiToken = stored.exerciseApiToken;
        if (stored.uploadedExercises) context.config.uploadedExercises = stored.uploadedExercises;
        if (stored.supabaseSyncEnabled !== undefined) context.config.supabaseSyncEnabled = stored.supabaseSyncEnabled;
        if (stored.supabaseUrl) context.config.supabaseUrl = stored.supabaseUrl;
        if (stored.supabaseAnonKey) context.config.supabaseAnonKey = stored.supabaseAnonKey;
        resolve();
      });
    });
  };

  async function testConnectionAndLoadExercises() {
    appVersionTag.innerText = `v${appVersion}`;
    appVersionTag.className = "version-tag error";
    singleGraderTab.enableGradeButton(false);

    await loadStoredConfig();
    settingsTab.updateConfigFields(context.config);

    let ready = false;
    let providerNameText = "";

    try {
      if (context.config.aiProvider === "gemini") {
        providerNameText = `Google Gemini (${context.config.aiModelName})`;
      } else if (context.config.aiProvider === "deepseek") {
        providerNameText = `DeepSeek API (${context.config.aiModelName})`;
      } else if (context.config.aiProvider === "openrouter") {
        providerNameText = `OpenRouter (${context.config.aiModelName})`;
      } else if (context.config.aiProvider === "custom") {
        providerNameText = `Custom API (${context.config.aiModelName})`;
      } else if (context.config.aiProvider === "local") {
        providerNameText = `Ollama Local (${context.config.aiModelName})`;
      }

      await AIService.testConnection(context.config);
      ready = true;
    } catch (testErr) {
      console.warn("AI connection test failed:", testErr);
      providerNameText += ` (Lỗi: ${testErr.message})`;
      ready = false;
    }

    if (ready) {
      appVersionTag.className = "version-tag success";
      appVersionTag.title = "AI Provider: Kết nối thành công";
    } else {
      appVersionTag.className = "version-tag error";
      appVersionTag.title = "AI Provider: Lỗi kết nối hoặc cấu hình sai";
    }

    try {
      const supabaseStatusText = await loadExercises(context, supabaseStatusTag, SupabaseService);
      settingsTab.updateStatusDisplay(providerNameText, !!context.config.githubToken, ready, supabaseStatusText);
      singleGraderTab.populateChapters();
      exercisesTab.populateChapters();
      singleGraderTab.enableGradeButton(ready);
      navigation.detectActiveTabAndNavigate();
    } catch (err) {
      console.error("Lỗi trong quá trình khởi tạo cấu hình:", err);
      try {
        const supabaseStatusText = await loadExercises(context, supabaseStatusTag, SupabaseService);
        singleGraderTab.populateChapters();
        exercisesTab.populateChapters();
        singleGraderTab.enableGradeButton(ready);
        navigation.detectActiveTabAndNavigate();
      } catch (fallbackErr) {
        console.error("Lỗi fallback khởi động:", fallbackErr);
        singleGraderTab.disableSelectors();
        exercisesTab.disableSelectors();
      }
    }
  }

  testConnectionAndLoadExercises();
});
