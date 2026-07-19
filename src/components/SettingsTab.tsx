import React from 'react';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { AI_DEFAULTS, GRADER_IGNORE_DEFAULTS } from '~/src/core/constants';

const defaultGraderIgnoreOptions = [...GRADER_IGNORE_DEFAULTS];

const POPULAR_MODELS: Record<string, { label: string; value: string }[]> = {
  gemini: [
    { label: "Gemini 2.5 Flash (Khuyên dùng)", value: "gemini-2.5-flash" },
    { label: "Gemini 2.5 Pro (Thông minh nhất)", value: "gemini-2.5-pro" },
    { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
    { label: "Gemini 2.0 Pro", value: "gemini-2.0-pro" },
    { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
    { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    { label: "Gemini 2.0 Flash Exp (Thử nghiệm)", value: "gemini-2.0-flash-exp" }
  ],
  openai: [
    { label: "GPT-4o (Khuyên dùng)", value: "gpt-4o" },
    { label: "GPT-4o Mini (Tiết kiệm nhất)", value: "gpt-4o-mini" },
    { label: "o1-mini (Suy luận thông minh)", value: "o1-mini" },
    { label: "o1-preview (Suy luận nâng cao)", value: "o1-preview" }
  ],
  deepseek: [
    { label: "DeepSeek-V3 (deepseek-chat)", value: "deepseek-chat" },
    { label: "DeepSeek Coder (deepseek-coder)", value: "deepseek-coder" }
  ]
};

export const SettingsTab: React.FC = () => {
  const {
    aiProvider,
    setAiProvider,
    aiApiKey,
    setAiApiKey,
    aiUrl,
    setAiUrl,
    aiModelName,
    setAiModelName,
    githubToken,
    setGithubToken,
    systemPrompt,
    setSystemPrompt,
    graderIgnoreItems,
    supabaseSyncEnabled,
    setSupabaseSyncEnabled,
    supabaseUrl,
    setSupabaseUrl,
    supabaseAnonKey,
    setSupabaseAnonKey,
    supabasePat,
    setSupabasePat,
    dbInitialized,
    isMigrating,
    handleMigrateDatabase,
    verifyDatabaseSchema,
    aiReady,
    isTesting,
    expanded,
    supabaseStatus,
    toggleSection,
    handleProviderChange,
    toggleIgnoreItem,
    handleSelectAllIgnore,
    handleDeselectAllIgnore,
    handleResetPrompt,
    handleSave,
    systemLogs,
    loadSystemLogs,
    handleClearLogs,
    handleDownloadLogsZip,
    cacheCount,
    handleClearCodeCache
  } = useSettings();

  const providerNames: Record<string, string> = { gemini: "Google Gemini", openai: "OpenAI", deepseek: "DeepSeek", openrouter: "OpenRouter", local: "Ollama (Local)" };

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      <div className="flex flex-col gap-2.5">
        {/* Section 1: AI Provider Config */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
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
                  <label className="text-[11px] font-bold text-slate-500">API Key:</label>
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
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    placeholder={aiProvider === "local" ? "http://localhost:11434" : "https://api.example.com/v1"}
                  />
                </div>
              )}

              {/* Popular Models Dropdown */}
              {POPULAR_MODELS[aiProvider] && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500">Chọn Model nhanh:</label>
                  <select
                    value={POPULAR_MODELS[aiProvider].some(m => m.value === aiModelName) ? aiModelName : "custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "custom") {
                        setAiModelName(val);
                      } else {
                        setAiModelName("");
                      }
                    }}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                  >
                    {POPULAR_MODELS[aiProvider].map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                    <option value="custom">Khác (Nhập thủ công)...</option>
                  </select>
                </div>
              )}

              {/* Text input for custom/unsupported model name */}
              {(!POPULAR_MODELS[aiProvider] || !POPULAR_MODELS[aiProvider].some(m => m.value === aiModelName)) && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500">Tên Model (Model Name):</label>
                  <input
                    type="text"
                    value={aiModelName}
                    onChange={(e) => setAiModelName(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    placeholder={aiProvider === "gemini" ? AI_DEFAULTS.geminiModel : AI_DEFAULTS.openAiModel}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: GitHub Token Config */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
          <div 
            onClick={() => toggleSection("github")}
            className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">🐙 GitHub Token (Nâng cao)</span>
            <span className="text-[9px] text-slate-400">{expanded.github ? '▲' : '▼'}</span>
          </div>
          {expanded.github && (
            <div className="p-3.5 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">Personal Access Token:</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                  placeholder="ghp_xxxxxxxxxxxx"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1 select-none">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-slate-600">Bộ nhớ đệm mã nguồn (Cache):</span>
                  <span className="text-[10px] text-slate-400 font-medium">Đang lưu trữ: <span className="font-bold text-blue-600">{cacheCount} bài</span> (Hạn dùng 24h)</span>
                </div>
                <button
                  onClick={handleClearCodeCache}
                  className="text-[10.5px] font-bold py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md transition-colors duration-150 active:scale-95 cursor-pointer"
                >
                  🧹 Xóa bộ nhớ đệm
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Grader Ignore Config */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
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
                  <button onClick={handleSelectAllIgnore} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">Chọn tất cả</button>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <button onClick={handleDeselectAllIgnore} className="text-[10px] font-bold text-red-500 hover:text-red-700">Bỏ chọn</button>
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
            </div>
          )}
        </div>

        {/* Section 4: System Prompt Config */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
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
                <button onClick={handleResetPrompt} className="text-[10px] font-bold text-blue-600 hover:text-blue-800">Khôi phục mặc định</button>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm min-h-[120px] resize-y"
              />
            </div>
          )}
        </div>

        {/* Section 5: Supabase Sync Config */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
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
                <div className="flex flex-col gap-3 pl-1">
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
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500">Supabase Personal Access Token (PAT):</label>
                    <input
                      type="password"
                      value={supabasePat}
                      onChange={(e) => setSupabasePat(e.target.value)}
                      className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      placeholder="Nhập PAT để tự động khởi tạo database nếu cần"
                    />
                    <span className="text-[9px] text-slate-400 leading-normal pl-0.5">
                      (*) Token này chỉ dùng để khởi tạo nhanh cấu trúc bảng tự động qua Management API. Bạn có thể tạo PAT tại: Tài khoản Supabase &gt; Access Tokens. Sau khi tạo bảng xong, bạn có thể xóa token này.
                    </span>
                  </div>

                  {/* Cấu trúc DB Status & Run Migration */}
                  <div className="flex flex-col gap-2 mt-2 pt-2.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Trạng thái CSDL trên Server:</span>
                      {dbInitialized === null ? (
                        <span className="text-slate-400 font-semibold animate-pulse">⏳ Đang kiểm tra...</span>
                      ) : dbInitialized ? (
                        <span className="text-green-600 font-bold flex items-center gap-1">🟢 Đã khởi tạo đầy đủ</span>
                      ) : (
                        <span className="text-rose-500 font-bold flex items-center gap-1">🔴 Chưa được khởi tạo</span>
                      )}
                    </div>
                    {!dbInitialized && (
                      <button
                        onClick={handleMigrateDatabase}
                        disabled={isMigrating}
                        className="w-full py-1.5 mt-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border border-blue-700 rounded-md text-[11px] font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        {isMigrating ? "⏳ Đang chạy migrations tạo bảng..." : "⚡ Khởi tạo cấu trúc bảng (Run Migrations)"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 6: System Activity Logs */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
          <div 
            onClick={() => toggleSection("logs")}
            className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">📋 Nhật ký hoạt động hệ thống</span>
            <span className="text-[9px] text-slate-400">{expanded.logs ? '▲' : '▼'}</span>
          </div>
          {expanded.logs && (
            <div className="p-3.5 flex flex-col gap-3">
              <div className="flex justify-between items-center select-none pb-1">
                <span className="text-[10px] text-slate-400 font-semibold">Hiển thị {systemLogs.length} logs mới nhất</span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={loadSystemLogs}
                    className="text-[10px] px-2 py-1 rounded border border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    🔄 Làm mới
                  </button>
                  <button 
                    onClick={handleClearLogs}
                    className="text-[10px] px-2 py-1 rounded border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer transition-colors"
                  >
                    🗑️ Xóa log
                  </button>
                  <button 
                    onClick={handleDownloadLogsZip}
                    className="text-[10px] px-2 py-1 rounded border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer transition-colors font-bold"
                  >
                    📥 Tải tệp log (.zip)
                  </button>
                </div>
              </div>
              
              <div className="border border-slate-200 rounded-md bg-slate-955 p-2 h-[200px] overflow-y-auto font-mono text-[10.5px] leading-relaxed flex flex-col gap-1 select-text">
                {systemLogs.length === 0 ? (
                  <div className="text-slate-500 text-center py-16">Chưa có nhật ký hoạt động nào.</div>
                ) : (
                  systemLogs.map((log, idx) => {
                    const timeStr = new Date(log.timestamp).toLocaleTimeString();
                    let levelColor = "text-slate-400"; // info
                    if (log.level === 'success') levelColor = "text-emerald-400";
                    if (log.level === 'warn') levelColor = "text-amber-400";
                    if (log.level === 'error') levelColor = "text-rose-400 font-bold";

                    return (
                      <div key={idx} className="border-b border-slate-800/40 pb-1 flex flex-col hover:bg-slate-900 px-1 py-0.5 rounded cursor-pointer group" onClick={() => log.details && alert(`[CHI TIẾT LOG]\n${log.details}`)}>
                        <div className="flex items-start gap-1">
                          <span className="text-slate-600 select-none">[{timeStr}]</span>
                          <span className={`${levelColor} uppercase select-none`}>[{log.level}]</span>
                          <span className="text-blue-400 select-none">[{log.module}]</span>
                          <span className="text-slate-200 flex-1">{log.message}</span>
                          {log.details && (
                            <span className="text-[9px] text-slate-500 select-none group-hover:text-blue-300 opacity-60 group-hover:opacity-100 font-semibold transition-all">
                              (xem chi tiết)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isTesting && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[11px] font-bold animate-pulse shadow-sm">
          <span className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></span>
          Đang tự động lưu cài đặt...
        </div>
      )}

      <div className="flex flex-col gap-1 border border-slate-200 border-dashed rounded-md bg-slate-50 p-3 text-xs leading-normal">
        <label className="font-bold text-slate-500">Trạng thái cấu hình hiện tại:</label>
        <div className="text-slate-600 flex flex-col gap-0.5 font-medium">
          <div>
            • AI Provider: {aiReady ? (
              <span className="text-green-600 font-semibold">Sẵn sàng - {providerNames[aiProvider] || "Custom API"}</span>
            ) : (
              <span className="text-red-500 font-semibold">Chưa sẵn sàng (Thiếu API Key/URL)</span>
            )}
          </div>
          <div>• Supabase Cloud: <span className="font-semibold text-slate-700">{supabaseStatus}</span></div>
        </div>
      </div>
    </div>
  );
};
