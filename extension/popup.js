import { SettingsTab } from './controllers/settingsTab.js';
import { SingleGraderTab } from './controllers/singleGraderTab.js';
import { AutoGraderTab } from './controllers/autoGraderTab.js';
import { ExercisesTab } from './controllers/exercisesTab.js';
import { CareTab } from './controllers/careTab.js';
import { SupabaseService } from './supabaseService.js';

document.addEventListener("DOMContentLoaded", () => {
  // --- Shared UI Elements ---
  const tabSelect = document.getElementById("tab-navigator-select");
  
  const tabAuto = document.getElementById("tab-auto");
  const tabGrader = document.getElementById("tab-grader");
  const tabClassList = document.getElementById("tab-class-list");
  const tabCare = document.getElementById("tab-care");
  const tabExercises = document.getElementById("tab-exercises");
  const tabSettings = document.getElementById("tab-settings");

  const appVersionTag = document.getElementById("app-version");

  // Shared Modal Elements
  const reportModal = document.getElementById("report-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalReportTitle = document.getElementById("modal-report-title");
  const modalScoreVal = document.getElementById("modal-score-val");
  const modalReportHtml = document.getElementById("modal-report-html");
  const copyReportBtn = document.getElementById("copy-report-btn");
  const copySingleReportBtn = document.getElementById("copy-single-report-btn");

  const appVersion = "3.6.0";

  // --- Shared Context (State & Cross-Tab Callbacks) ---
  const context = {
    config: {
      aiProvider: "gemini",
      aiApiKey: "",
      aiApiUrl: "",
      aiModelName: "gemini-1.5-pro",
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
  const careTab = new CareTab(context);

  context.singleGraderTab = singleGraderTab;
  context.autoGraderTab = autoGraderTab;
  context.careTab = careTab;

  // --- Tab Navigation ---
  const detectAndLoadClassListSync = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const url = tabs[0].url || "";
        const match = url.match(/\/homework-checking\/(\d+)/);
        if (match && autoGraderTab) {
          autoGraderTab.loadClassListData(match[1]);
        } else {
          autoGraderTab.renderClassList();
        }
      } else {
        autoGraderTab.renderClassList();
      }
    });
  };

  const activateTabById = (targetId) => {
    const tabContents = [tabAuto, tabGrader, tabClassList, tabCare, tabExercises, tabSettings];
    tabContents.forEach(content => {
      if (content.id === targetId) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });

    // Run tab-specific actions
    if (targetId === "tab-auto") {
      autoGraderTab.triggerPageScan();
    } else if (targetId === "tab-class-list") {
      detectAndLoadClassListSync();
    } else if (targetId === "tab-care") {
      careTab.detectActiveTabAndLoad();
    }
  };

  const detectActiveTabAndNavigate = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        tabSelect.value = "tab-auto";
        activateTabById("tab-auto");
        return;
      }

      const url = tabs[0].url || "";
      let targetTab = "tab-auto";

      if (url.includes("/class/") && url.includes("/take-care")) {
        targetTab = "tab-care";
      } else if (url.includes("/homework-checking/")) {
        targetTab = "tab-class-list";
      } else if (url.includes("/type/elMajor/") && url.includes("/view/")) {
        targetTab = "tab-exercises";
      } else if (url.includes("/detailLinkGithub")) {
        targetTab = "tab-auto";
      } else {
        tabSelect.value = "tab-auto";
        activateTabById("tab-auto");
        return;
      }

      tabSelect.value = targetTab;
      activateTabById(targetTab);
    });
  };

  tabSelect.addEventListener("change", (e) => {
    activateTabById(e.target.value);
  });

  // --- Load configuration and verify status ---
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
      appVersionTag.className = "version-tag success";
    } else {
      appVersionTag.className = "version-tag error";
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
      }

      if (SupabaseService.isEnabled(context.config)) {
        try {
          const cloudExercises = await SupabaseService.pullExercises(context.config);
          if (cloudExercises && cloudExercises.length > 0) {
            cloudExercises.forEach(ex => {
              const chap = ex.chapter;
              const sess = ex.session;
              const name = ex.assignment_name;
              if (!context.exerciseTemplates[chap]) context.exerciseTemplates[chap] = {};
              if (!context.exerciseTemplates[chap][sess]) context.exerciseTemplates[chap][sess] = {};
              context.exerciseTemplates[chap][sess][name] = {
                assignment: ex.assignment_text || "",
                criteria: ex.criteria || ""
              };
            });
          }
        } catch (exErr) {
          console.error("Lỗi đồng bộ đề bài từ Supabase:", exErr);
        }
      }

      settingsTab.updateStatusDisplay(providerNameText, !!context.config.githubToken, ready, exercisesSourceText);
      singleGraderTab.populateChapters();
      exercisesTab.populateChapters();
      singleGraderTab.enableGradeButton(ready);
      
      detectActiveTabAndNavigate();
    } catch (err) {
      console.error(err);
      settingsTab.updateStatusDisplay(providerNameText, !!context.config.githubToken, ready, `${exercisesSourceText} (Lỗi: ${err.message})`);
      try {
        const res = await fetch(chrome.runtime.getURL("exercises.json"));
        context.exerciseTemplates = await res.json();

        if (SupabaseService.isEnabled(context.config)) {
          try {
            const cloudExercises = await SupabaseService.pullExercises(context.config);
            if (cloudExercises && cloudExercises.length > 0) {
              cloudExercises.forEach(ex => {
                const chap = ex.chapter;
                const sess = ex.session;
                const name = ex.assignment_name;
                if (!context.exerciseTemplates[chap]) context.exerciseTemplates[chap] = {};
                if (!context.exerciseTemplates[chap][sess]) context.exerciseTemplates[chap][sess] = {};
                context.exerciseTemplates[chap][sess][name] = {
                  assignment: ex.assignment_text || "",
                  criteria: ex.criteria || ""
                };
              });
            }
          } catch (exErr) {
            console.error("Lỗi đồng bộ đề bài từ Supabase:", exErr);
          }
        }

        singleGraderTab.populateChapters();
        exercisesTab.populateChapters();
        singleGraderTab.enableGradeButton(ready);
        detectActiveTabAndNavigate();
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
      const score = parseFloat(sub.score);
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
      window.showToast("Không thể sao chép báo cáo.", "error");
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
      window.showToast("Không thể sao chép báo cáo.", "error");
    });
  });

  testConnectionAndLoadExercises();
});

// Toast notification helper accessible globally
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const iconEl = document.createElement('span');
  iconEl.className = 'toast-icon';
  iconEl.innerText = icons[type] || 'ℹ️';

  const messageEl = document.createElement('span');
  messageEl.className = 'toast-message';
  messageEl.innerText = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => {
    removeToast(toast);
  };

  toast.appendChild(iconEl);
  toast.appendChild(messageEl);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  const timeoutId = setTimeout(() => {
    removeToast(toast);
  }, duration);

  function removeToast(el) {
    if (el.parentNode) {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => {
        el.remove();
      }, { once: true });
    }
  }
}
window.showToast = showToast;
