import { SettingsTab } from './controllers/settingsTab.js';
import { SingleGraderTab } from './controllers/singleGraderTab.js';
import { AutoGraderTab } from './controllers/autoGraderTab.js';
import { ExercisesTab } from './controllers/exercisesTab.js';

document.addEventListener("DOMContentLoaded", () => {
  // --- Shared UI Elements ---
  const tabAutoBtn = document.getElementById("tab-auto-btn");
  const tabGraderBtn = document.getElementById("tab-grader-btn");
  const tabClassListBtn = document.getElementById("tab-class-list-btn");
  const tabExercisesBtn = document.getElementById("tab-exercises-btn");
  const tabSettingsBtn = document.getElementById("tab-settings-btn");
  
  const tabAuto = document.getElementById("tab-auto");
  const tabGrader = document.getElementById("tab-grader");
  const tabClassList = document.getElementById("tab-class-list");
  const tabExercises = document.getElementById("tab-exercises");
  const tabSettings = document.getElementById("tab-settings");

  const connBanner = document.getElementById("conn-banner");
  const connText = document.getElementById("conn-text");
  const appVersionTag = document.getElementById("app-version");

  // Shared Modal Elements
  const reportModal = document.getElementById("report-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalReportTitle = document.getElementById("modal-report-title");
  const modalScoreVal = document.getElementById("modal-score-val");
  const modalReportHtml = document.getElementById("modal-report-html");
  const copyReportBtn = document.getElementById("copy-report-btn");
  const copySingleReportBtn = document.getElementById("copy-single-report-btn");

  const appVersion = "3.5.1";

  // --- Shared Context (State & Cross-Tab Callbacks) ---
  const context = {
    config: {
      aiProvider: "gemini",
      aiApiKey: "",
      aiApiUrl: "",
      aiModelName: "gemini-1.5-pro",
      githubToken: "",
      systemPrompt: "",
      graderIgnore: "",
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
      showReportModal(sub);
    },
    onConfigSaved(newConfig) {
      context.config = newConfig;
      testConnectionAndLoadExercises();
    },
    onLibraryChanged() {
      // Refresh options in both graders when library changes
      singleGraderTab.populateChapters();
      autoGraderTab.renderSubmissions();
    }
  };

  // --- Initialize Controllers ---
  const settingsTab = new SettingsTab(context);
  const singleGraderTab = new SingleGraderTab(context);
  const autoGraderTab = new AutoGraderTab(context);
  const exercisesTab = new ExercisesTab(context);

  context.singleGraderTab = singleGraderTab;
  context.autoGraderTab = autoGraderTab;

  // --- Tab Navigation ---
  const activateTab = (activeBtn, activeContent, inactiveBtns, inactiveContents) => {
    activeBtn.classList.add("active");
    activeContent.classList.add("active");
    inactiveBtns.forEach(btn => btn.classList.remove("active"));
    inactiveContents.forEach(c => c.classList.remove("active"));
  };

  tabAutoBtn.addEventListener("click", () => {
    activateTab(tabAutoBtn, tabAuto, [tabGraderBtn, tabClassListBtn, tabExercisesBtn, tabSettingsBtn], [tabGrader, tabClassList, tabExercises, tabSettings]);
    autoGraderTab.triggerPageScan();
  });
  tabGraderBtn.addEventListener("click", () => activateTab(tabGraderBtn, tabGrader, [tabAutoBtn, tabClassListBtn, tabExercisesBtn, tabSettingsBtn], [tabAuto, tabClassList, tabExercises, tabSettings]));
  tabClassListBtn.addEventListener("click", () => {
    activateTab(tabClassListBtn, tabClassList, [tabAutoBtn, tabGraderBtn, tabExercisesBtn, tabSettingsBtn], [tabAuto, tabGrader, tabExercises, tabSettings]);
    autoGraderTab.renderClassList();
  });
  tabExercisesBtn.addEventListener("click", () => activateTab(tabExercisesBtn, tabExercises, [tabAutoBtn, tabGraderBtn, tabClassListBtn, tabSettingsBtn], [tabAuto, tabGrader, tabClassList, tabSettings]));
  tabSettingsBtn.addEventListener("click", () => activateTab(tabSettingsBtn, tabSettings, [tabAutoBtn, tabGraderBtn, tabClassListBtn, tabExercisesBtn], [tabAuto, tabGrader, tabClassList, tabExercises]));

  // --- Load configuration and verify status ---
  const loadStoredConfig = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        "aiProvider", "aiApiKey", "aiApiUrl", "aiModelName", "githubToken", "systemPrompt",
        "graderIgnore", "exerciseSource", "exerciseApiUrl", "exerciseApiToken", "uploadedExercises"
      ], (stored) => {
        if (stored.aiProvider) context.config.aiProvider = stored.aiProvider;
        if (stored.aiApiKey) context.config.aiApiKey = stored.aiApiKey;
        if (stored.aiApiUrl) context.config.aiApiUrl = stored.aiApiUrl;
        if (stored.aiModelName) context.config.aiModelName = stored.aiModelName;
        if (stored.githubToken) context.config.githubToken = stored.githubToken;
        if (stored.systemPrompt) context.config.systemPrompt = stored.systemPrompt;
        if (stored.graderIgnore !== undefined) context.config.graderIgnore = stored.graderIgnore;
        if (stored.exerciseSource) context.config.exerciseSource = stored.exerciseSource;
        if (stored.exerciseApiUrl) context.config.exerciseApiUrl = stored.exerciseApiUrl;
        if (stored.exerciseApiToken) context.config.exerciseApiToken = stored.exerciseApiToken;
        if (stored.uploadedExercises) context.config.uploadedExercises = stored.uploadedExercises;
        resolve();
      });
    });
  };

  async function testConnectionAndLoadExercises() {
    appVersionTag.innerText = `v${appVersion}`;
    connBanner.className = "connection-banner error";
    connText.innerText = "Đang kiểm tra...";
    singleGraderTab.enableGradeButton(false);

    await loadStoredConfig();
    settingsTab.updateConfigFields(context.config);

    let ready = false;
    let providerNameText = "";

    if (context.config.aiProvider === "gemini") {
      ready = !!context.config.aiApiKey;
      providerNameText = `Google Gemini (${context.config.aiModelName})`;
    } else if (context.config.aiProvider === "deepseek") {
      ready = !!context.config.aiApiKey;
      providerNameText = `DeepSeek API (${context.config.aiModelName})`;
    } else if (context.config.aiProvider === "openrouter") {
      ready = !!context.config.aiApiKey;
      providerNameText = `OpenRouter (${context.config.aiModelName})`;
    } else if (context.config.aiProvider === "custom") {
      ready = !!context.config.aiApiKey && !!context.config.aiApiUrl;
      providerNameText = `Custom API (${context.config.aiModelName})`;
    } else if (context.config.aiProvider === "local") {
      ready = !!context.config.aiApiUrl;
      providerNameText = `Ollama Local (${context.config.aiModelName})`;
    }

    if (ready) {
      connBanner.className = "connection-banner success";
      connText.innerText = "AI Sẵn Sàng (Serverless Mode)";
    } else {
      connBanner.className = "connection-banner error";
      connText.innerText = "Chưa cấu hình API Key hợp lệ";
      settingsTab.updateStatusDisplay(providerNameText, !!context.config.githubToken, false, "");
      singleGraderTab.disableSelectors();
      exercisesTab.disableSelectors();
      return;
    }

    let exercisesSourceText = "";
    try {
      if (context.config.exerciseSource === "local") {
        exercisesSourceText = "Cục bộ (exercises.json)";
        const res = await fetch(chrome.runtime.getURL("exercises.json"));
        if (!res.ok) throw new Error("Không tìm thấy file exercises.json trong extension.");
        context.exerciseTemplates = await res.json();
      } else if (context.config.exerciseSource === "upload") {
        exercisesSourceText = "Tải từ file templates.json của người dùng";
        if (context.config.uploadedExercises) {
          context.exerciseTemplates = context.config.uploadedExercises;
        } else {
          exercisesSourceText += " <span style='color:#ef4444;'>(Chưa có file upload, dùng fallback local)</span>";
          const res = await fetch(chrome.runtime.getURL("exercises.json"));
          context.exerciseTemplates = await res.json();
        }
      } else if (context.config.exerciseSource === "api") {
        exercisesSourceText = `REST API (${context.config.exerciseApiUrl})`;
        const headers = {};
        if (context.config.exerciseApiToken) {
          headers["Authorization"] = `Bearer ${context.config.exerciseApiToken}`;
        }
        const res = await fetch(context.config.exerciseApiUrl, { headers });
        if (!res.ok) throw new Error(`API trả về HTTP ${res.status}`);
        context.exerciseTemplates = await res.json();
      }

      settingsTab.updateStatusDisplay(providerNameText, !!context.config.githubToken, true, exercisesSourceText);
      singleGraderTab.populateChapters();
      exercisesTab.populateChapters();
      singleGraderTab.enableGradeButton(true);
      
      autoGraderTab.triggerPageScan();
    } catch (err) {
      console.error(err);
      settingsTab.updateStatusDisplay(providerNameText, !!context.config.githubToken, true, `${exercisesSourceText} (Lỗi: ${err.message})`);
      try {
        const res = await fetch(chrome.runtime.getURL("exercises.json"));
        context.exerciseTemplates = await res.json();
        singleGraderTab.populateChapters();
        exercisesTab.populateChapters();
        singleGraderTab.enableGradeButton(true);
        autoGraderTab.triggerPageScan();
      } catch (fallbackErr) {
        singleGraderTab.disableSelectors();
        exercisesTab.disableSelectors();
      }
    }
  }

  // --- Modal Helpers ---
  function showReportModal(sub) {
    if (!sub || !sub.report) return;
    context.activeReportMarkdown = sub.report;
    modalReportTitle.innerText = sub.exerciseName;
    modalScoreVal.innerText = sub.score ? `${sub.score} / 100` : '-- / 100';
    
    if (sub.score) {
      const score = parseInt(sub.score, 10);
      if (score >= 80) {
        modalScoreVal.style.background = "linear-gradient(135deg, #16a34a, #15803d)";
      } else if (score >= 50) {
        modalScoreVal.style.background = "linear-gradient(135deg, #d97706, #b45309)";
      } else {
        modalScoreVal.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";
      }
    }
    
    if (typeof marked !== 'undefined') {
      modalReportHtml.innerHTML = marked.parse(sub.report);
    } else {
      modalReportHtml.innerText = sub.report;
    }
    reportModal.style.display = 'flex';
  }

  closeModalBtn.addEventListener("click", () => {
    reportModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === reportModal) {
      reportModal.style.display = "none";
    }
  });

  // --- Copy to Clipboard ---
  copyReportBtn.addEventListener("click", () => {
    if (!context.activeReportMarkdown) return;
    navigator.clipboard.writeText(context.activeReportMarkdown).then(() => {
      const origHTML = copyReportBtn.innerHTML;
      copyReportBtn.innerHTML = "✅ Đã sao chép!";
      copyReportBtn.disabled = true;
      setTimeout(() => {
        copyReportBtn.innerHTML = origHTML;
        copyReportBtn.disabled = false;
      }, 1500);
    }).catch(err => {
      console.error(err);
      alert("Không thể sao chép báo cáo.");
    });
  });

  copySingleReportBtn.addEventListener("click", () => {
    if (!context.activeSingleReportMarkdown) return;
    navigator.clipboard.writeText(context.activeSingleReportMarkdown).then(() => {
      const origHTML = copySingleReportBtn.innerHTML;
      copySingleReportBtn.innerHTML = "✅ Đã sao chép!";
      copySingleReportBtn.disabled = true;
      setTimeout(() => {
        copySingleReportBtn.innerHTML = origHTML;
        copySingleReportBtn.disabled = false;
      }, 1500);
    }).catch(err => {
      console.error(err);
      alert("Không thể sao chép báo cáo.");
    });
  });

  testConnectionAndLoadExercises();
});
