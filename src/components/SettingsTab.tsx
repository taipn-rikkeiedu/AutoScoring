import React, { useState, useEffect } from 'react';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { GRADER_IGNORE_DEFAULTS } from '~/src/core/constants';
import { 
  RefreshIcon, 
  TrashIcon, 
  DownloadIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CheckIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArchiveBoxIcon
} from '~/src/components/Icons';

const defaultGraderIgnoreOptions = [...GRADER_IGNORE_DEFAULTS];

type SubTab = 'ai' | 'rules' | 'logs';

export const SettingsTab: React.FC = () => {
  const {
    aiProvider,
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
    providerModels,
    isLoadingModels,
    refreshModels,
    aiReady,
    isTesting,
    isTestingAi,
    handleTestAiConnection,
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
    loadCacheStats,
    supabaseSyncEnabled,
    setSupabaseSyncEnabled,
    supabaseUrl,
    setSupabaseUrl,
    supabaseAnonKey,
    setSupabaseAnonKey,
    exerciseSource,
    setExerciseSource,
    exerciseApiUrl,
    setExerciseApiUrl,
    exerciseApiToken,
    setExerciseApiToken,
    supabasePat,
    setSupabasePat,
    dbInitialized,
    isMigrating,
    handleMigrateDatabase
  } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('ai');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showPat, setShowPat] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'logs') {
      loadSystemLogs();
      loadCacheStats();
    }
  }, [activeSubTab]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden select-none">
      {/* Compact Segmented Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        {/* Sub-tab Navigation */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-lg border border-slate-200/80 gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'ai'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>AI & Kết nối</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'rules'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <DocumentTextIcon className="w-3.5 h-3.5" />
            <span>Barem & Quy tắc</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ArchiveBoxIcon className="w-3.5 h-3.5" />
            <span>Bộ nhớ & Log</span>
          </button>
        </div>

        {/* Auto-save Status Indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          {isTesting ? (
            <span className="text-amber-600 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Đang lưu...
            </span>
          ) : (
            <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Tự động lưu
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {/* ================= TAB 1: AI & KẾT NỐI ================= */}
        {activeSubTab === 'ai' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* AI Provider & Models Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
              {/* Provider Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Nhà cung cấp AI (Provider)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    aiReady 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {aiReady ? '🟢 Đã sẵn sàng' : '🟡 Cần bổ sung cấu hình'}
                  </span>
                </label>
                <select
                  value={aiProvider}
                  onChange={handleProviderChange}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer transition-all"
                >
                  <option value="gemini">💎 Google Gemini (GenAI API Direct)</option>
                  <option value="claude">🧠 Anthropic Claude (Direct API)</option>
                  <option value="openai">⚡ OpenAI (GPT-4o, o1 Direct)</option>
                  <option value="deepseek">🐋 DeepSeek (DeepSeek-V3 Direct)</option>
                  <option value="openrouter">🌐 OpenRouter (Multi-model Gateway)</option>
                  <option value="local">💻 Ollama Local (Mô hình chạy cục bộ)</option>
                  <option value="custom">⚙️ Custom OpenAI-Compatible Provider</option>
                </select>
              </div>

              {aiProvider !== 'local' && (
                <div className="flex flex-col gap-1 pt-0.5">
                  <label className="text-[11px] font-semibold text-slate-600">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder={
                        aiProvider === 'gemini' ? "AIzaSy..." :
                        aiProvider === 'claude' ? "sk-ant-..." :
                        aiProvider === 'openai' ? "sk-proj-..." :
                        aiProvider === 'deepseek' ? "sk-..." :
                        "Nhập API Key của bạn..."
                      }
                      className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title={showApiKey ? "Ẩn API Key" : "Hiện API Key"}
                    >
                      {showApiKey ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {(aiProvider === 'custom' || aiProvider === 'local') && (
                <div className="flex flex-col gap-1 pt-0.5">
                  <label className="text-[11px] font-semibold text-slate-600">
                    {aiProvider === 'local' ? "Ollama Endpoint URL" : "Base URL (OpenAI-compatible)"}
                  </label>
                  <input
                    type="text"
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    placeholder={aiProvider === 'local' ? "http://localhost:11434" : "https://api.example.com/v1"}
                    className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {/* Model Selection & Auto-fetch */}
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <span>Mô hình AI (Model)</span>
                    {providerModels && providerModels.length > 0 && (
                      <span className="text-[10px] bg-sky-50 text-sky-700 font-semibold border border-sky-200 px-1.5 py-0.2 rounded">
                        {providerModels.length} models từ API
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={refreshModels}
                    disabled={isLoadingModels}
                    className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-50"
                    title="Truy vấn danh sách model mới nhất từ API"
                  >
                    <RefreshIcon className={`w-3 h-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                    <span>Làm mới model</span>
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
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg py-1.5 px-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {providerModels.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                    <option value="custom">Khác (Nhập model thủ công)...</option>
                  </select>
                ) : null}

                {(!providerModels || providerModels.length === 0 || !providerModels.some(m => m.value === aiModelName)) && (
                  <input
                    type="text"
                    value={aiModelName}
                    onChange={(e) => setAiModelName(e.target.value)}
                    placeholder="Tên model (vd: gemini-2.5-flash, gpt-4o, claude-3-5-sonnet...)"
                    className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                )}
              </div>
            </div>

            {/* GitHub Token Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  GitHub Personal Access Token (PAT)
                </label>
                <div className="relative">
                  <input
                    type={showGithubToken ? "text" : "password"}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx (chấm repository private & tăng limit API)"
                    className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={showGithubToken ? "Ẩn Token" : "Hiện Token"}
                  >
                    {showGithubToken ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Supabase Cloud Sync Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Đồng bộ Cloud (Supabase)</h3>
                  <p className="text-[10px] text-slate-500">Lưu điểm, ghi chú & đề bài lên Supabase của bạn (tùy chọn)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSupabaseSyncEnabled(!supabaseSyncEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                    supabaseSyncEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${
                      supabaseSyncEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {supabaseSyncEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600">Supabase Project URL</label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xxxx.supabase.co"
                      className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600">Anon Public Key</label>
                    <div className="relative">
                      <input
                        type={showAnonKey ? "text" : "password"}
                        value={supabaseAnonKey}
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        placeholder="eyJhbGciOi..."
                        className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAnonKey(!showAnonKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title={showAnonKey ? "Ẩn Anon Key" : "Hiện Anon Key"}
                      >
                        {showAnonKey ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {supabaseSyncEnabled && (
                <div className="flex flex-col gap-2 pt-2 mt-2 border-t border-slate-100">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600">Personal Access Token (Tùy chọn cho Zero Setup)</label>
                    <div className="relative">
                      <input
                        type={showPat ? "text" : "password"}
                        value={supabasePat}
                        onChange={(e) => setSupabasePat(e.target.value)}
                        placeholder="sbp_xxxxxxxxxxxx"
                        className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPat(!showPat)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title={showPat ? "Ẩn PAT" : "Hiện PAT"}
                      >
                        {showPat ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg mt-1">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-700">Trạng thái Cơ sở dữ liệu:</span>
                      <span className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${dbInitialized ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {dbInitialized === null ? (
                          <><span>⏳</span> Đang kiểm tra...</>
                        ) : dbInitialized ? (
                          <><span>🟢</span> Đã khởi tạo bảng thành công</>
                        ) : (
                          <><span>🟡</span> Chưa tạo bảng (hoặc lỗi kết nối)</>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleMigrateDatabase}
                      disabled={isMigrating || dbInitialized === true}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer border border-indigo-200 flex items-center gap-1.5"
                    >
                      {isMigrating && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isMigrating ? "Đang tạo DB..." : dbInitialized ? "Đã Setup" : "Khởi tạo DB (Zero Setup)"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Test Connection Action Button */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleTestAiConnection}
                disabled={isTestingAi}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-xs active:scale-98 cursor-pointer"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
                <span>{isTestingAi ? 'Đang kiểm tra...' : 'Kiểm tra kết nối AI'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2: BAREM & QUY TẮC ================= */}
        {activeSubTab === 'rules' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* Exercise Source Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Nguồn Ngân Hàng Bài Tập</span>
                </label>
                <select
                  value={exerciseSource}
                  onChange={(e) => setExerciseSource(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg py-2 px-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer transition-all"
                >
                  <option value="local">📁 Local (Mặc định - exercises.json)</option>
                  <option value="api">🌐 API Server (Tải từ máy chủ từ xa)</option>
                </select>
              </div>

              {exerciseSource === 'api' && (
                <>
                  <div className="flex flex-col gap-1 pt-0.5">
                    <label className="text-[11px] font-semibold text-slate-600">Exercise API URL</label>
                    <input
                      type="text"
                      value={exerciseApiUrl}
                      onChange={(e) => setExerciseApiUrl(e.target.value)}
                      placeholder="https://api.example.com/exercises"
                      className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1 pt-0.5">
                    <label className="text-[11px] font-semibold text-slate-600">API Token (Tùy chọn)</label>
                    <input
                      type="text"
                      value={exerciseApiToken}
                      onChange={(e) => setExerciseApiToken(e.target.value)}
                      placeholder="Bearer token..."
                      className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* .graderignore Chip/Tag Selector */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Danh Sách Bỏ Qua (.graderignore)</h3>
                  <p className="text-[10px] text-slate-500">Bấm vào thẻ để bật/tắt tệp và thư mục gửi cho AI</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {graderIgnoreItems.length}/{defaultGraderIgnoreOptions.length} đã chọn
                  </span>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleSelectAllIgnore}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllIgnore}
                    className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Tag Pills List */}
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-50/70 rounded-lg border border-slate-100">
                {defaultGraderIgnoreOptions.map((item) => {
                  const isChecked = graderIgnoreItems.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleIgnoreItem(item)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer border select-none ${
                        isChecked
                          ? 'bg-sky-500 text-white font-medium border-sky-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isChecked && <CheckIcon className="w-3 h-3 text-white flex-shrink-0" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* System Prompt Editor */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Mẫu Câu Lệnh (System Prompt)</h3>
                  <p className="text-[10px] text-slate-500">Tùy chỉnh hướng dẫn chấm bài cho AI</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                >
                  Khôi phục mặc định
                </button>
              </div>

              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                placeholder="Nhập prompt tùy chỉnh cho AI..."
                className="w-full text-xs font-mono text-slate-800 bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed text-[11px]"
              />
            </div>
          </div>
        )}

        {/* ================= TAB 3: BỘ NHỚ & LOG ================= */}
        {activeSubTab === 'logs' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* Cache Management Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Bộ nhớ đệm mã nguồn (Cache)</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đã lưu trữ: <span className="font-bold text-sky-600">{cacheCount} repositories</span> (Tự động xóa sau 24h)
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearCodeCache}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Xóa Cache</span>
              </button>
            </div>

            {/* System Logs Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800">Nhật ký hoạt động</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                    {systemLogs.length} dòng
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadLogsZip}
                    className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>Tải ZIP</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="text-xs text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    Xóa nhật ký
                  </button>
                </div>
              </div>

              {/* Monospaced Log Console */}
              <div className="bg-slate-900 text-slate-200 rounded-lg p-3 max-h-52 overflow-y-auto font-mono text-[10.5px] space-y-1 select-text border border-slate-800">
                {systemLogs.length === 0 ? (
                  <div className="text-slate-500 text-center py-6">Chưa có nhật ký hoạt động nào.</div>
                ) : (
                  systemLogs.map((log, idx) => (
                    <div key={idx} className="border-b border-slate-800/60 pb-1 leading-relaxed">
                      <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span
                        className={`font-bold ${
                          log.level === 'success'
                            ? 'text-emerald-400'
                            : log.level === 'error'
                            ? 'text-rose-400'
                            : log.level === 'warn'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        [{log.module}]
                      </span>{' '}
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
