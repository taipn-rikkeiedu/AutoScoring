import React from 'react';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { AI_DEFAULTS, GRADER_IGNORE_DEFAULTS } from '~/src/core/constants';
import { DownloadIcon, RefreshIcon, TrashIcon } from '~/src/components/Icons';

const defaultGraderIgnoreOptions = [...GRADER_IGNORE_DEFAULTS];

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
    googleApiKey,
    setGoogleApiKey,
    fastApiServerUrl,
    setFastApiServerUrl,
    fastApiSecretKey,
    setFastApiSecretKey,
    providerModels,
    isLoadingModels,
    refreshModels,
    dbInitialized,
    isMigrating,
    handleMigrateDatabase,
    verifyDatabaseSchema,
    aiReady,
    isTesting,
    isTestingAi,
    handleTestAiConnection,
    expanded,
    supabaseStatus,
    toggleSection,
    handleProviderChange,
    toggleIgnoreItem,
    handleSelectAllIgnore,
    handleDeselectAllIgnore,
    handleResetPrompt,
    systemLogs,
    loadSystemLogs,
    handleClearLogs,
    handleDownloadLogsZip,
    cacheCount,
    handleClearCodeCache,
    loadCacheStats
  } = useSettings();

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-sky-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
              ⚙️
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">Cài Đặt Hệ Thống</h2>
              <p className="text-[10px] text-sky-700 font-normal">Cấu hình kết nối AI, GitHub và Database</p>
            </div>
          </div>
          {isTesting && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              Đang lưu...
            </div>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {/* Accordion 1: Cấu hình AI Provider */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('ai')}
            className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-100/50 flex items-center justify-between text-left transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🤖</span>
              <div>
                <h3 className="text-xs font-bold text-slate-700">Mô Hình AI Chấm Điểm</h3>
                <p className="text-[10px] text-slate-500">Tự động truy vấn danh sách Model từ nhà cung cấp API</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiReady ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Đã cấu hình
                </span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                  Chưa xong
                </span>
              )}
              <span className="text-xs text-slate-400">{expanded.ai ? '▲' : '▼'}</span>
            </div>
          </button>

          {expanded.ai && (
            <div className="p-3.5 space-y-3">
              {/* Chọn Provider */}
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-medium text-slate-500">Nhà cung cấp (Provider):</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="fastapi_server">🚀 REduX AI Backend Server (Khuyên dùng - Client/Server)</option>
                  <option value="gemini">Google Gemini (GenAI API Direct)</option>
                  <option value="claude">Anthropic Claude (Direct API)</option>
                  <option value="openai">OpenAI (GPT-4o, o1-mini Direct)</option>
                  <option value="deepseek">DeepSeek (DeepSeek-V3 Direct)</option>
                  <option value="openrouter">OpenRouter (Multi-model Gateway)</option>
                  <option value="local">Ollama Local (Mô hình chạy cục bộ)</option>
                  <option value="custom">Custom OpenAI-Compatible Provider</option>
                </select>
              </div>

              {/* FastAPI Server Cloud Security Notice */}
              {aiProvider === "fastapi_server" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2.5 flex items-start gap-2">
                  <span className="text-emerald-600 text-sm">🔒</span>
                  <div className="text-[11px] text-emerald-800 leading-snug">
                    <span className="font-semibold">Bảo mật Cloud:</span> Toàn bộ API Key (Google Gemini, OpenAI, DeepSeek, Supabase) được quản lý tập trung trong <b>Modal Secrets</b>. Phía Frontend không lưu bất kỳ API Key nhạy cảm nào.
                  </div>
                </div>
              )}

              {/* FastAPI Server Custom URL */}
              {aiProvider === "fastapi_server" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-medium text-slate-500">Đường dẫn Backend Server (Modal App URL):</label>
                  <input
                    type="text"
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                    placeholder="https://<username>--redux-ai-backend-fastapi-app.modal.run hoặc http://localhost:8000"
                  />
                </div>
              )}

              {/* API Key / Secret Key */}
              {aiProvider !== "local" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-medium text-slate-500 flex items-center justify-between">
                    <span>{aiProvider === "fastapi_server" ? "Mã bảo mật Backend (x-api-key):" : "API Key:"}</span>
                    <span className="text-[10px] text-slate-400">
                      {aiProvider === "fastapi_server" && "(Trùng với SERVER_SECRET_KEY trong Modal Secret)"}
                    </span>
                  </label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                    placeholder={
                      aiProvider === "gemini" ? "AIzaSy..." :
                      aiProvider === "claude" ? "sk-ant-..." :
                      aiProvider === "openai" ? "sk-proj-..." :
                      aiProvider === "deepseek" ? "sk-..." :
                      aiProvider === "fastapi_server" ? "Nhập SERVER_SECRET_KEY..." :
                      "Nhập API key của bạn..."
                    }
                  />
                </div>
              )}

              {/* Custom URL cho OpenAI Compatible hoặc Ollama */}
              {(aiProvider === "custom" || aiProvider === "local") && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-medium text-slate-500">
                    {aiProvider === "local" ? "Ollama Endpoint URL:" : "Base URL (OpenAI-compatible):"}
                  </label>
                  <input
                    type="text"
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                    placeholder={aiProvider === "local" ? "http://localhost:11434" : "https://api.example.com/v1"}
                  />
                </div>
              )}

              {/* Dynamic Models Dropdown - Tự động tải từ API */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-medium text-slate-500 flex items-center gap-1.5">
                    <span>Mô hình AI (Model):</span>
                    {providerModels && providerModels.length > 0 && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-semibold border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {providerModels.length} models từ API
                      </span>
                    )}
                    {isLoadingModels && (
                      <span className="text-[9.5px] text-blue-500 font-medium animate-pulse flex items-center gap-1">
                        <RefreshIcon className="w-2.5 h-2.5 animate-spin" />
                        Đang truy vấn API...
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={refreshModels}
                    disabled={isLoadingModels}
                    title="Truy vấn API nhà cung cấp để cập nhật danh sách model hợp lệ"
                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 disabled:opacity-50 font-medium"
                  >
                    <RefreshIcon className={`w-3 h-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                    <span>Làm mới từ API</span>
                  </button>
                </div>

                {providerModels && providerModels.length > 0 ? (
                  <select
                    value={providerModels.some(m => m.value === aiModelName) ? aiModelName : "custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "custom") {
                        setAiModelName(val);
                      } else {
                        setAiModelName("");
                      }
                    }}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {providerModels.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                    <option value="custom">Khác (Nhập model thủ công)...</option>
                  </select>
                ) : (
                  <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                    💡 Nhập API Key hoặc khởi động Ollama/Backend và bấm <b>"Làm mới từ API"</b> để tự động nhận diện danh sách model hợp lệ.
                  </div>
                )}

                {/* Input nhập thủ công nếu chọn Khác hoặc chưa tải được danh sách */}
                {(!providerModels || providerModels.length === 0 || !providerModels.some(m => m.value === aiModelName)) && (
                  <input
                    type="text"
                    value={aiModelName}
                    onChange={(e) => setAiModelName(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px] mt-1"
                    placeholder="Nhập tên model (ví dụ: gemini-2.5-flash, claude-3-5-sonnet-20241022, gpt-4o)..."
                  />
                )}
              </div>

              {/* Nút Kiểm tra kết nối */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${aiReady ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                  <span className="text-[11px] text-slate-500">
                    {aiReady ? 'Cấu hình đã sẵn sàng' : 'Chưa hoàn tất cấu hình'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTestAiConnection}
                  disabled={isTestingAi}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <RefreshIcon className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
                  <span>{isTestingAi ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Cấu hình GitHub Token */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('github')}
            className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-100/50 flex items-center justify-between text-left transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🐙</span>
              <div>
                <h3 className="text-xs font-bold text-slate-700">GitHub Access Token</h3>
                <p className="text-[10px] text-slate-500">Tùy chọn tải repository riêng tư (Private repo) và nâng hạn mức API</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{expanded.github ? '▲' : '▼'}</span>
          </button>

          {expanded.github && (
            <div className="p-3.5 space-y-2">
              <label className="text-[10.5px] font-medium text-slate-500">Personal Access Token (PAT):</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Tạo token tại GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens. Cần quyền <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">repo</code> nếu chấm bài repository riêng tư.
              </p>
            </div>
          )}
        </div>

        {/* Accordion 3: Danh sách loại trừ .graderignore */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('ignore')}
            className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-100/50 flex items-center justify-between text-left transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🚫</span>
              <div>
                <h3 className="text-xs font-bold text-slate-700">Danh Sách Bỏ Qua (.graderignore)</h3>
                <p className="text-[10px] text-slate-500">Loại bỏ các tệp rác, thư mục build trước khi gửi cho AI</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{expanded.ignore ? '▲' : '▼'}</span>
          </button>

          {expanded.ignore && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10.5px] font-medium text-slate-500">
                  Đã chọn {graderIgnoreItems.length}/{defaultGraderIgnoreOptions.length} mục
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllIgnore}
                    className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllIgnore}
                    className="text-[10px] text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {defaultGraderIgnoreOptions.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-1.5 p-1.5 rounded hover:bg-slate-50 cursor-pointer text-[11px] text-slate-700 select-none border border-transparent hover:border-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={graderIgnoreItems.includes(item)}
                      onChange={() => toggleIgnoreItem(item)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-mono text-[10.5px] truncate">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Accordion 4: System Prompt */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('prompt')}
            className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-100/50 flex items-center justify-between text-left transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">📝</span>
              <div>
                <h3 className="text-xs font-bold text-slate-700">Mẫu Câu Lệnh (System Prompt)</h3>
                <p className="text-[10px] text-slate-500">Tùy chỉnh hướng dẫn và barem chấm điểm của AI</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{expanded.prompt ? '▲' : '▼'}</span>
          </button>

          {expanded.prompt && (
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] font-medium text-slate-500">Prompt mẫu:</label>
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  Khôi phục mặc định
                </button>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="w-full text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed text-[11px]"
                placeholder="Nhập prompt tùy chỉnh..."
              />
            </div>
          )}
        </div>

        {/* Accordion 5: Nhật ký hệ thống & Cache */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => {
              toggleSection('logs');
              if (!expanded.logs) {
                loadSystemLogs();
                loadCacheStats();
              }
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-100/50 flex items-center justify-between text-left transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">📋</span>
              <div>
                <h3 className="text-xs font-bold text-slate-700">Nhật Ký & Bộ Nhớ Tạm (Cache)</h3>
                <p className="text-[10px] text-slate-500">Tra cứu log hoạt động hệ thống và quản lý cache repo</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{expanded.logs ? '▲' : '▼'}</span>
          </button>

          {expanded.logs && (
            <div className="p-3.5 space-y-3">
              {/* Cache Stats */}
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Mã nguồn đã cache: </span>
                  <span className="text-blue-600 font-bold">{cacheCount} repositories</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearCodeCache}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <TrashIcon className="w-3 h-3" />
                  <span>Xóa Cache</span>
                </button>
              </div>

              {/* Logs Table Actions */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">Nhật ký ({systemLogs.length})</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadLogsZip}
                    className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-medium"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>Tải về .zip</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="text-[11px] text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Xóa nhật ký
                  </button>
                </div>
              </div>

              {/* Logs Output Container */}
              <div className="bg-slate-900 text-slate-200 rounded-md p-2.5 max-h-48 overflow-y-auto font-mono text-[10.5px] space-y-1 select-text">
                {systemLogs.length === 0 ? (
                  <div className="text-slate-500 text-center py-4">Chưa có nhật ký hoạt động.</div>
                ) : (
                  systemLogs.map((log, idx) => (
                    <div key={idx} className="border-b border-slate-800/60 pb-1">
                      <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                      <span className={`font-bold ${
                        log.level === 'success' ? 'text-emerald-400' :
                        log.level === 'error' ? 'text-rose-400' :
                        log.level === 'warn' ? 'text-amber-400' : 'text-cyan-400'
                      }`}>[{log.module}]</span>{" "}
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
