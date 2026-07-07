import { DEFAULT_SYSTEM_PROMPT } from '../utils.js';

export class SettingsTab {
  constructor(context) {
    this.context = context;
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.aiProviderSelect = document.getElementById("ai-provider");
    this.aiApiKeyInput = document.getElementById("ai-api-key");
    this.aiApiUrlInput = document.getElementById("ai-api-url");
    this.aiModelNameInput = document.getElementById("ai-model-name");
    this.githubTokenInput = document.getElementById("github-token");
    this.graderIgnoreCbs = document.querySelectorAll(".ignore-item-cb");
    this.ignoreSelectAllBtn = document.getElementById("ignore-select-all-btn");
    this.ignoreDeselectAllBtn = document.getElementById("ignore-deselect-all-btn");
    this.systemPromptInput = document.getElementById("system-prompt");
    this.resetPromptBtn = document.getElementById("reset-prompt-btn");
    

    
    this.saveSettingsBtn = document.getElementById("save-settings-btn");
    this.providerInfo = document.getElementById("provider-info");
    
    this.supabaseSyncEnabledCheckbox = document.getElementById("supabase-sync-enabled");
    this.supabaseConfigGroup = document.getElementById("supabase-config-group");
    this.supabaseUrlInput = document.getElementById("supabase-url");
    this.supabaseAnonKeyInput = document.getElementById("supabase-anon-key");
  }

  bindEvents() {
    this.aiProviderSelect.addEventListener("change", () => this.updateFieldsVisibility());

    this.supabaseSyncEnabledCheckbox.addEventListener("change", () => this.updateFieldsVisibility());
    this.saveSettingsBtn.addEventListener("click", () => this.saveConfiguration());
    this.resetPromptBtn.addEventListener("click", () => this.resetSystemPrompt());
    if (this.ignoreSelectAllBtn) {
      this.ignoreSelectAllBtn.addEventListener("click", () => this.toggleAllIgnoreCbs(true));
    }
    if (this.ignoreDeselectAllBtn) {
      this.ignoreDeselectAllBtn.addEventListener("click", () => this.toggleAllIgnoreCbs(false));
    }

    // Accordion headers toggle logic
    const accordionHeaders = document.querySelectorAll(".settings-accordion .accordion-header");
    accordionHeaders.forEach(header => {
      header.addEventListener("click", () => {
        const item = header.closest(".accordion-item");
        if (item) {
          item.classList.toggle("active");
        }
      });
    });
  }

  toggleAllIgnoreCbs(checked) {
    if (this.graderIgnoreCbs) {
      this.graderIgnoreCbs.forEach(cb => {
        cb.checked = checked;
      });
    }
  }

  resetSystemPrompt() {
    if (confirm("Bạn có chắc chắn muốn khôi phục system prompt về mặc định không?")) {
      this.systemPromptInput.value = DEFAULT_SYSTEM_PROMPT;
    }
  }

  updateFieldsVisibility() {
    const provider = this.aiProviderSelect.value;
    const keyGroup = document.getElementById("settings-api-key-group");
    const urlGroup = document.getElementById("settings-api-url-group");
    const lblKey = document.getElementById("lbl-api-key");
    const lblUrl = document.getElementById("lbl-api-url");

    if (provider === "gemini") {
      keyGroup.style.display = "flex";
      urlGroup.style.display = "none";
      lblKey.innerText = "Gemini API Key:";
      if (!this.aiModelNameInput.value || this.aiModelNameInput.value.includes("deepseek") || this.aiModelNameInput.value.includes("qwen")) {
        this.aiModelNameInput.value = "gemini-1.5-pro";
      }
    } else if (provider === "deepseek") {
      keyGroup.style.display = "flex";
      urlGroup.style.display = "none";
      lblKey.innerText = "DeepSeek API Key:";
      if (!this.aiModelNameInput.value || this.aiModelNameInput.value.includes("gemini") || this.aiModelNameInput.value.includes("qwen")) {
        this.aiModelNameInput.value = "deepseek-chat";
      }
    } else if (provider === "openrouter") {
      keyGroup.style.display = "flex";
      urlGroup.style.display = "none";
      lblKey.innerText = "OpenRouter API Key:";
      if (!this.aiModelNameInput.value || this.aiModelNameInput.value.includes("gemini") || this.aiModelNameInput.value.includes("deepseek-")) {
        this.aiModelNameInput.value = "qwen/qwen3-coder:free";
      }
    } else if (provider === "custom") {
      keyGroup.style.display = "flex";
      urlGroup.style.display = "flex";
      lblKey.innerText = "API Key:";
      lblUrl.innerText = "Base URL:";
    } else if (provider === "local") {
      keyGroup.style.display = "none";
      urlGroup.style.display = "flex";
      lblUrl.innerText = "Ollama URL:";
      if (!this.aiModelNameInput.value || this.aiModelNameInput.value.includes("gemini") || this.aiModelNameInput.value.includes("qwen")) {
        this.aiModelNameInput.value = "deepseek-r1:7b";
      }
    }



    if (this.supabaseSyncEnabledCheckbox.checked) {
      this.supabaseConfigGroup.style.display = "block";
    } else {
      this.supabaseConfigGroup.style.display = "none";
    }
  }

  updateConfigFields(config) {
    this.aiProviderSelect.value = config.aiProvider;
    this.aiApiKeyInput.value = config.aiApiKey;
    this.aiApiUrlInput.value = config.aiApiUrl;
    this.aiModelNameInput.value = config.aiModelName;
    this.githubTokenInput.value = config.githubToken;
    
    const ignoreItems = config.graderIgnoreItems || [];
    if (this.graderIgnoreCbs) {
      this.graderIgnoreCbs.forEach(cb => {
        cb.checked = ignoreItems.includes(cb.value);
      });
    }

    this.systemPromptInput.value = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    this.supabaseSyncEnabledCheckbox.checked = !!config.supabaseSyncEnabled;
    this.supabaseUrlInput.value = config.supabaseUrl || "";
    this.supabaseAnonKeyInput.value = config.supabaseAnonKey || "";
    this.updateFieldsVisibility();
  }

  updateStatusDisplay(providerNameText, hasGithubToken, ready, supabaseStatusText) {
    if (ready) {
      this.providerInfo.innerHTML = `
        • Trạng thái AI Provider: <b>Sẵn sàng - ${providerNameText}</b><br>
        • Cấu hình GitHub Token: <b>${hasGithubToken ? 'Đã thiết lập' : 'Không có (Giới hạn 60 req/h)'}</b>
      `;
    } else {
      this.providerInfo.innerHTML = `
        <span style="color:#ef4444;">• AI Provider chưa sẵn sàng: Vui lòng thiết lập API Key hoặc URL tại tab Cài đặt.</span>
      `;
    }

    if (supabaseStatusText) {
      this.providerInfo.innerHTML += `<br>• Trạng thái Supabase Cloud: <b>${supabaseStatusText}</b>`;
    }
  }

  saveConfiguration() {
    const provider = this.aiProviderSelect.value;
    const apiKey = this.aiApiKeyInput.value.trim();
    const apiUrl = this.aiApiUrlInput.value.trim();
    const modelName = this.aiModelNameInput.value.trim();
    const githubToken = this.githubTokenInput.value.trim();
    const systemPrompt = this.systemPromptInput.value;
    
    const graderIgnoreItems = [];
    if (this.graderIgnoreCbs) {
      this.graderIgnoreCbs.forEach(cb => {
        if (cb.checked) {
          graderIgnoreItems.push(cb.value);
        }
      });
    }
    
    const src = "local";
    const exerciseApiUrl = "";
    const exerciseApiToken = "";  

    if (provider !== "local" && !apiKey) {
      window.showToast("Vui lòng nhập API Key cho nhà cung cấp AI đã chọn.", "warning");
      return;
    }
    if ((provider === "custom" || provider === "local") && !apiUrl) {
      window.showToast("Vui lòng nhập URL của API.", "warning");
      return;
    }
    if (!modelName) {
      window.showToast("Vui lòng nhập tên Model.", "warning");
      return;
    }



    const supabaseSyncEnabled = this.supabaseSyncEnabledCheckbox.checked;
    const supabaseUrl = this.supabaseUrlInput.value.trim();
    const supabaseAnonKey = this.supabaseAnonKeyInput.value.trim();

    if (supabaseSyncEnabled && (!supabaseUrl || !supabaseAnonKey)) {
      window.showToast("Vui lòng nhập đầy đủ Supabase URL và Anon Key khi bật đồng bộ.", "warning");
      return;
    }

    const saveConfig = () => {
      const newConfig = {
        aiProvider: provider,
        aiApiKey: apiKey,
        aiApiUrl: apiUrl,
        aiModelName: modelName,
        githubToken: githubToken,
        systemPrompt: systemPrompt,
        graderIgnoreItems: graderIgnoreItems,
        exerciseSource: src,
        exerciseApiUrl: exerciseApiUrl,
        exerciseApiToken: exerciseApiToken,
        supabaseSyncEnabled: supabaseSyncEnabled,
        supabaseUrl: supabaseUrl,
        supabaseAnonKey: supabaseAnonKey,
        uploadedExercises: this.context.config.uploadedExercises
      };

      chrome.storage.local.set(newConfig, () => {
        window.showToast("Đã lưu cấu hình thành công!", "success");
        this.context.onConfigSaved(newConfig);
      });
    };

    saveConfig();
  }
}
