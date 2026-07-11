import React, { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { DEFAULT_SYSTEM_PROMPT } from '~/src/core/utils';
import { testConnection } from '~/src/services/connectionTester';

const defaultGraderIgnoreOptions = [
  "build/", "dist/", "target/", "out/", ".vscode/", ".idea/", "env/", "venv/",
  "Scripts/", "Lib/", "scripts/", "lib/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", 
  "composer.lock", "gradlew/mvnw", ".gitignore"
];

export const SettingsTab: React.FC = () => {
  const { config, updateConfig, supabaseStatus } = useApp();
  const { showToast } = useToast();

  // Accordion sections state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    ai: true,
    github: false,
    ignore: false,
    prompt: false,
    supabase: false
  });

  // Local form states
  const [aiProvider, setAiProvider] = useState(config.aiProvider);
  const [aiApiKey, setAiApiKey] = useState(config.aiApiKey);
  const [aiApiUrl, setAiApiUrl] = useState(config.aiApiUrl);
  const [aiModelName, setAiModelName] = useState(config.aiModelName);
  const [githubToken, setGithubToken] = useState(config.githubToken);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || DEFAULT_SYSTEM_PROMPT);
  const [graderIgnoreItems, setGraderIgnoreItems] = useState<string[]>(config.graderIgnoreItems);
  const [supabaseSyncEnabled, setSupabaseSyncEnabled] = useState(config.supabaseSyncEnabled);
  const [supabaseUrl, setSupabaseUrl] = useState(config.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(config.supabaseAnonKey);

  const [aiReady, setAiReady] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Sync state when config updates from context
  useEffect(() => {
    setAiProvider(config.aiProvider);
    setAiApiKey(config.aiApiKey);
    setAiApiUrl(config.aiApiUrl);
    setAiModelName(config.aiModelName);
    setGithubToken(config.githubToken);
    setSystemPrompt(config.systemPrompt || DEFAULT_SYSTEM_PROMPT);
    setGraderIgnoreItems(config.graderIgnoreItems);
    setSupabaseSyncEnabled(config.supabaseSyncEnabled);
    setSupabaseUrl(config.supabaseUrl);
    setSupabaseAnonKey(config.supabaseAnonKey);
  }, [config]);

  // Check if AI is configured and ready
  useEffect(() => {
    const isConfigured = 
      (aiProvider === "local" && aiApiUrl.trim().length > 0) || 
      (aiProvider !== "local" && aiApiKey.trim().length > 0 && aiModelName.trim().length > 0);
    setAiReady(isConfigured);
  }, [aiProvider, aiApiKey, aiApiUrl, aiModelName]);

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setAiProvider(provider);
    
    // Automatically switch model names to sensible defaults if empty or mismatched
    if (provider === "gemini") {
      setAiModelName("gemini-3.5-flash");
    } else if (provider === "openai") {
      setAiModelName("gpt-4o-mini");
    } else if (provider === "deepseek") {
      setAiModelName("deepseek-chat");
    } else if (provider === "openrouter") {
      setAiModelName("qwen/qwen3-coder:free");
    } else if (provider === "local") {
      setAiModelName("deepseek-r1:7b");
    }
  };

  const toggleIgnoreItem = (item: string) => {
    setGraderIgnoreItems(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSelectAllIgnore = () => {
    setGraderIgnoreItems(defaultGraderIgnoreOptions);
  };

  const handleDeselectAllIgnore = () => {
    setGraderIgnoreItems([]);
  };

  const handleResetPrompt = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục system prompt về mặc định không?")) {
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    }
  };

  const handleSave = async () => {
    if (aiProvider !== "local" && !aiApiKey.trim()) {
      showToast("Vui lòng nhập API Key cho nhà cung cấp AI đã chọn.", "warning");
      return;
    }
    if ((aiProvider === "custom" || aiProvider === "local") && !aiApiUrl.trim()) {
      showToast("Vui lòng nhập URL của API.", "warning");
      return;
    }
    if (!aiModelName.trim()) {
      showToast("Vui lòng nhập tên Model.", "warning");
      return;
    }
    if (supabaseSyncEnabled && (!supabaseUrl.trim() || !supabaseAnonKey.trim())) {
      showToast("Vui lòng nhập đầy đủ Supabase URL và Anon Key khi bật đồng bộ.", "warning");
      return;
    }

    setIsTesting(true);
    try {
      // Test AI connection first to let user know if it works
      const testConfig = {
        aiProvider,
        aiApiKey: aiApiKey.trim(),
        aiApiUrl: aiApiUrl.trim(),
        aiModelName: aiModelName.trim(),
        githubToken: githubToken.trim(),
        systemPrompt,
        graderIgnoreItems,
        exerciseSource: config.exerciseSource,
        exerciseApiUrl: config.exerciseApiUrl,
        exerciseApiToken: config.exerciseApiToken,
        uploadedExercises: config.uploadedExercises,
        supabaseSyncEnabled,
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim()
      };

      await testConnection(testConfig);
      showToast("Kết nối AI thành công! Đang lưu cấu hình...", "success");

      // Save to chrome storage
      await updateConfig({
        aiProvider,
        aiApiKey: aiApiKey.trim(),
        aiApiUrl: aiApiUrl.trim(),
        aiModelName: aiModelName.trim(),
        githubToken: githubToken.trim(),
        systemPrompt,
        graderIgnoreItems,
        supabaseSyncEnabled,
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim()
      });
      showToast("Đã lưu cấu hình thành công!", "success");
    } catch (e: any) {
      console.error(e);
      showToast(`Không thể kết nối đến nhà cung cấp AI: ${e.message}. Cấu hình vẫn được lưu nhưng vui lòng kiểm tra lại.`, "warning");
      
      // Save anyway even if connection failed
      await updateConfig({
        aiProvider,
        aiApiKey: aiApiKey.trim(),
        aiApiUrl: aiApiUrl.trim(),
        aiModelName: aiModelName.trim(),
        githubToken: githubToken.trim(),
        systemPrompt,
        graderIgnoreItems,
        supabaseSyncEnabled,
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim()
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getProviderNameText = () => {
    switch (aiProvider) {
      case "gemini": return "Google Gemini";
      case "openai": return "OpenAI";
      case "deepseek": return "DeepSeek";
      case "openrouter": return "OpenRouter";
      case "local": return "Ollama (Local)";
      default: return "Custom API";
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      {/* Accordion Container */}
      <div className="flex flex-col gap-2.5">
        
        {/* Section 1: AI Provider Config */}
        <div className={`border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200`}>
          <div 
            onClick={() => toggleSection("ai")}
            className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">🤖 Cấu Hình AI Provider</span>
            <span className="text-[9px] text-slate-400">{expanded.ai ? '▲' : '▼'}</span>
          </div>
          {expanded.ai && (
            <div className="p-3.5 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">Nhà Cung Cấp AI:</label>
                <select
                  value={aiProvider}
                  onChange={handleProviderChange}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI API</option>
                  <option value="deepseek">DeepSeek API</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="custom">Custom API (OpenAI-compatible)</option>
                  <option value="local">Ollama (Local Model)</option>
                </select>
              </div>

              {aiProvider !== "local" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500">
                    {aiProvider === "gemini" ? "Gemini API Key:" : aiProvider === "openai" ? "OpenAI API Key:" : aiProvider === "deepseek" ? "DeepSeek API Key:" : aiProvider === "openrouter" ? "OpenRouter API Key:" : "API Key:"}
                  </label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    placeholder="Nhập API Key của bạn"
                  />
                </div>
              )}

              {(aiProvider === "custom" || aiProvider === "local") && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500">
                    {aiProvider === "local" ? "Ollama URL:" : "Base URL:"}
                  </label>
                  <input
                    type="text"
                    value={aiApiUrl}
                    onChange={(e) => setAiApiUrl(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    placeholder={aiProvider === "local" ? "http://localhost:11434" : "https://api.example.com/v1"}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">Tên Model (Model Name):</label>
                <input
                  type="text"
                  value={aiModelName}
                  onChange={(e) => setAiModelName(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                  placeholder={
                    aiProvider === "gemini" ? "gemini-3.5-flash" :
                    aiProvider === "openai" ? "gpt-4o-mini" :
                    aiProvider === "deepseek" ? "deepseek-chat" :
                    aiProvider === "openrouter" ? "qwen/qwen3-coder:free" :
                    aiProvider === "local" ? "deepseek-r1:7b" : "gpt-4o-mini"
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: GitHub Token Config */}
        <div className={`border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200`}>
          <div 
            onClick={() => toggleSection("github")}
            className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">🐙 GitHub Token (Nâng cao)</span>
            <span className="text-[9px] text-slate-400">{expanded.github ? '▲' : '▼'}</span>
          </div>
          {expanded.github && (
            <div className="p-3.5 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">Personal Access Token:</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                  placeholder="ghp_xxxxxxxxxxxx"
                />
                <span className="text-[10px] text-slate-400 leading-normal mt-1 block">
                  Giúp tránh bị giới hạn lượt tải code từ GitHub API (đặc biệt khi chấm bài hàng loạt).
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Grader Ignore Config */}
        <div className={`border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200`}>
          <div 
            onClick={() => toggleSection("ignore")}
            className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">📁 Bộ lọc loại trừ (.graderignore)</span>
            <span className="text-[9px] text-slate-400">{expanded.ignore ? '▲' : '▼'}</span>
          </div>
          {expanded.ignore && (
            <div className="p-3.5 flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Chọn tệp/thư mục bỏ qua:</span>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSelectAllIgnore}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <button 
                    onClick={handleDeselectAllIgnore}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-slate-50 p-2.5 rounded-md border border-slate-150">
                {defaultGraderIgnoreOptions.map(item => (
                  <label key={item} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer py-0.5 hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={graderIgnoreItems.includes(item)}
                      onChange={() => toggleIgnoreItem(item)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{item}</span>
                  </label>
                ))}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">
                * node_modules, .venv, .git luôn được tự động loại trừ để tiết kiệm tài nguyên.
              </span>
            </div>
          )}
        </div>

        {/* Section 4: System Prompt Config */}
        <div className={`border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200`}>
          <div 
            onClick={() => toggleSection("prompt")}
            className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">📝 Mẫu System Prompt Chấm Điểm</span>
            <span className="text-[9px] text-slate-400">{expanded.prompt ? '▲' : '▼'}</span>
          </div>
          {expanded.prompt && (
            <div className="p-3.5 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mẫu System Prompt:</span>
                <button 
                  onClick={handleResetPrompt}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                >
                  Khôi phục mặc định
                </button>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm min-h-[140px] resize-y"
                placeholder="Nhập mẫu system prompt chấm điểm..."
              />
              <span className="text-[9px] text-slate-400 leading-normal block mt-1">
                Các biến thay thế: <b>{"{{assignment}}"}</b> (Đề bài), <b>{"{{criteria}}"}</b> (Tiêu chí chấm), <b>{"{{code}}"}</b> (Code học viên).
              </span>
            </div>
          )}
        </div>

        {/* Section 5: Supabase Sync Config */}
        <div className={`border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200`}>
          <div 
            onClick={() => toggleSection("supabase")}
            className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">☁️ Đồng bộ đám mây (Supabase)</span>
            <span className="text-[9px] text-slate-400">{expanded.supabase ? '▲' : '▼'}</span>
          </div>
          {expanded.supabase && (
            <div className="p-3.5 flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={supabaseSyncEnabled}
                  onChange={(e) => setSupabaseSyncEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-700">Kích hoạt đồng bộ đám mây</span>
              </label>

              {supabaseSyncEnabled && (
                <div className="flex flex-col gap-3 animate-fade-in pl-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">Supabase Project URL:</label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      placeholder="https://your-project.supabase.co"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">Supabase Anon Key:</label>
                    <input
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      placeholder="public-anon-key"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isTesting}
        className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md text-xs font-bold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-150 active:scale-[0.98]"
      >
        {isTesting ? "⏳ Đang kiểm tra & lưu..." : "💾 Lưu Cấu Hình"}
      </button>

      {/* Info Status Box */}
      <div className="flex flex-col gap-1 border border-slate-200 border-dashed rounded-md bg-slate-50 p-3 text-xs leading-normal">
        <label className="font-bold text-slate-500">Trạng thái cấu hình hiện tại:</label>
        <div className="text-slate-600 flex flex-col gap-0.5 font-medium">
          <div>
            • AI Provider: {aiReady ? (
              <span className="text-green-600 font-semibold">Sẵn sàng - {getProviderNameText()} ({config.aiModelName})</span>
            ) : (
              <span className="text-red-500 font-semibold">Chưa sẵn sàng (Thiếu API Key/URL)</span>
            )}
          </div>
          <div>
            • GitHub Token: <span className="font-semibold text-slate-700">{config.githubToken ? 'Đã cấu hình' : 'Chưa cấu hình (Giới hạn 60 req/h)'}</span>
          </div>
          <div>
            • Supabase Cloud: <span className="font-semibold text-slate-700">{supabaseStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
