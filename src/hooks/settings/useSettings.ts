import React, { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { DEFAULT_SYSTEM_PROMPT } from '~/src/core/utils';
import { testConnection } from '~/src/services/connectionTester';
import { AI_DEFAULTS, GRADER_IGNORE_DEFAULTS } from '~/src/core/constants';
import { AppConfig } from '~/src/types';
import { logger, LogEntry } from '~/src/core/logger';
import JSZip from 'jszip';
import { SupabaseService } from '~/src/services/supabaseService';

const defaultGraderIgnoreOptions = [...GRADER_IGNORE_DEFAULTS];

export function useSettings() {
  const { config, updateConfig, supabaseStatus } = useApp();
  const { showToast } = useToast();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    ai: true,
    github: false,
    ignore: false,
    prompt: false,
    supabase: false,
    logs: false
  });

  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);

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
  const [supabasePat, setSupabasePat] = useState(config.supabasePat || "");

  const [dbInitialized, setDbInitialized] = useState<boolean | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const [aiReady, setAiReady] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

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
    setSupabasePat(config.supabasePat || "");
  }, [config]);

  useEffect(() => {
    const isConfigured = 
      (aiProvider === "local" && aiApiUrl.trim().length > 0) || 
      (aiProvider !== "local" && aiApiKey.trim().length > 0 && aiModelName.trim().length > 0);
    setAiReady(isConfigured);
  }, [aiProvider, aiApiKey, aiApiUrl, aiModelName]);

  // Debounced auto-save for text inputs
  useEffect(() => {
    if (!config) return;

    const hasChanges = 
      aiApiKey !== config.aiApiKey ||
      aiApiUrl !== config.aiApiUrl ||
      aiModelName !== config.aiModelName ||
      githubToken !== config.githubToken ||
      systemPrompt !== config.systemPrompt ||
      supabaseUrl !== config.supabaseUrl ||
      supabaseAnonKey !== config.supabaseAnonKey ||
      supabasePat !== config.supabasePat;

    if (!hasChanges) return;

    setIsAutoSaving(true);
    const timer = setTimeout(async () => {
      try {
        await updateConfig({
          aiApiKey: aiApiKey.trim(),
          aiApiUrl: aiApiUrl.trim(),
          aiModelName: aiModelName.trim(),
          githubToken: githubToken.trim(),
          systemPrompt,
          supabaseUrl: supabaseUrl.trim(),
          supabaseAnonKey: supabaseAnonKey.trim(),
          supabasePat: supabasePat.trim()
        });
        showToast("Cấu hình đã được tự động lưu!", "success");
        await verifyDatabaseSchema();
      } catch (err: any) {
        showToast(`Lỗi tự động lưu: ${err.message}`, "error");
      } finally {
        setIsAutoSaving(false);
      }
    }, 1200); // 1.2 seconds debounce

    return () => clearTimeout(timer);
  }, [aiApiKey, aiApiUrl, aiModelName, githubToken, systemPrompt, supabaseUrl, supabaseAnonKey, supabasePat]);

  const verifyDatabaseSchema = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setDbInitialized(false);
      return;
    }
    const ready = await SupabaseService.checkDatabaseTables({
      ...config,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      supabaseSyncEnabled: true
    });
    setDbInitialized(ready);
  };

  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      verifyDatabaseSchema();
    }
  }, [supabaseSyncEnabled, supabaseUrl, supabaseAnonKey]);

  const handleMigrateDatabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      showToast("Vui lòng nhập Supabase URL và Anon Key trước.", "warning");
      return;
    }
    if (!supabasePat.trim()) {
      showToast("Vui lòng nhập Supabase Personal Access Token (PAT) để tiếp tục.", "warning");
      return;
    }

    setIsMigrating(true);
    showToast("Đang gửi yêu cầu khởi tạo cơ sở dữ liệu lên Supabase Cloud...", "info");
    logger.info("SUPABASE", "Bắt đầu chạy SQL DDL Migrations để tạo cấu trúc bảng...");

    try {
      await SupabaseService.initializeDatabaseSchema({
        ...config,
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
      }, supabasePat);

      showToast("Khởi tạo cấu trúc bảng Supabase thành công!", "success");
      logger.success("SUPABASE", "Chạy SQL DDL Migrations tạo bảng thành công.");
      await verifyDatabaseSchema();
    } catch (err: any) {
      showToast("Không thể khởi tạo cơ sở dữ liệu: " + err.message, "error");
      logger.error("SUPABASE", "Lỗi chạy DDL SQL Migrations trên Supabase.", err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const loadSystemLogs = async () => {
    const logs = await logger.getLogs();
    setSystemLogs([...logs].reverse());
  };

  const handleClearLogs = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ nhật ký hệ thống không?")) {
      await logger.clearLogs();
      setSystemLogs([]);
      showToast("Đã xóa toàn bộ nhật ký hệ thống.", "success");
    }
  };

  const handleDownloadLogsZip = async () => {
    try {
      const logs = await logger.getLogs();
      if (logs.length === 0) {
        showToast("Không có nhật ký nào để tải về.", "warning");
        return;
      }
      
      const zip = new JSZip();
      const logsContent = JSON.stringify(logs, null, 2);
      zip.file("redux_system_logs.json", logsContent);
      
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9
        }
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `redux_system_logs_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Đã tải xuống tệp tin nén nhật ký hệ thống (.zip)!", "success");
    } catch (err: any) {
      showToast("Không thể xuất file nén log: " + err.message, "error");
    }
  };

  const [cacheCount, setCacheCount] = useState(0);

  const loadCacheStats = () => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(null, (allData) => {
      const now = Date.now();
      const keysToRemove: string[] = [];
      let count = 0;
      
      for (const key in allData) {
        if (key.startsWith('code_cache:')) {
          const entry = allData[key] as any;
          if (entry && entry.cachedAt && (now - entry.cachedAt > 24 * 60 * 60 * 1000)) {
            keysToRemove.push(key);
          } else {
            count++;
          }
        }
      }

      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          logger.info("SYSTEM", `Đã tự động dọn dẹp ${keysToRemove.length} bản ghi cache quá hạn (24h) khi tải thống kê.`);
        });
      }

      setCacheCount(count);
    });
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleClearCodeCache = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ đệm mã nguồn không?")) {
      chrome.storage.local.get(null, (allData) => {
        const keysToRemove = Object.keys(allData).filter(k => k.startsWith('code_cache:'));
        if (keysToRemove.length === 0) {
          showToast("Không có bộ nhớ đệm mã nguồn nào để xóa.", "info");
          return;
        }
        chrome.storage.local.remove(keysToRemove, () => {
          setCacheCount(0);
          showToast("Đã xóa toàn bộ bộ nhớ đệm mã nguồn!", "success");
          logger.success("SYSTEM", `Đã xóa sạch bộ nhớ đệm mã nguồn (${keysToRemove.length} bài).`);
        });
      });
    }
  };

  const toggleSection = (section: string) => {
    setExpanded(prev => {
      const nextExpanded = !prev[section];
      if (section === 'logs' && nextExpanded) {
        loadSystemLogs();
      }
      if (section === 'github' && nextExpanded) {
        loadCacheStats();
      }
      return { ...prev, [section]: nextExpanded };
    });
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setAiProvider(provider);
    
    let defaultModel = aiModelName;
    if (provider === "gemini") {
      defaultModel = AI_DEFAULTS.geminiModel;
    } else if (provider === "openai") {
      defaultModel = AI_DEFAULTS.openAiModel;
    } else if (provider === "deepseek") {
      defaultModel = AI_DEFAULTS.deepSeekModel;
    } else if (provider === "openrouter") {
      defaultModel = AI_DEFAULTS.openRouterModel;
    } else if (provider === "local") {
      defaultModel = AI_DEFAULTS.localModel;
    }
    setAiModelName(defaultModel);

    updateConfig({
      aiProvider: provider,
      aiModelName: defaultModel
    }).then(() => {
      showToast("Đã cập nhật AI Provider!", "success");
    });
  };

  const handleSupabaseSyncToggle = (enabled: boolean) => {
    setSupabaseSyncEnabled(enabled);
    updateConfig({
      supabaseSyncEnabled: enabled
    }).then(() => {
      showToast(`Đã ${enabled ? 'bật' : 'tắt'} đồng bộ đám mây!`, "success");
    });
  };

  const toggleIgnoreItem = (item: string) => {
    const updated = graderIgnoreItems.includes(item)
      ? graderIgnoreItems.filter(i => i !== item)
      : [...graderIgnoreItems, item];
    setGraderIgnoreItems(updated);
    updateConfig({
      graderIgnoreItems: updated
    });
  };

  const handleSelectAllIgnore = () => {
    setGraderIgnoreItems(defaultGraderIgnoreOptions);
    updateConfig({
      graderIgnoreItems: defaultGraderIgnoreOptions
    });
  };

  const handleDeselectAllIgnore = () => {
    setGraderIgnoreItems([]);
    updateConfig({
      graderIgnoreItems: []
    });
  };

  const handleResetPrompt = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục system prompt về mặc định không?")) {
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      updateConfig({
        systemPrompt: DEFAULT_SYSTEM_PROMPT
      }).then(() => {
        showToast("Đã khôi phục System Prompt mặc định!", "success");
      });
    }
  };

  return {
    aiProvider,
    setAiProvider,
    aiApiKey,
    setAiApiKey,
    aiUrl: aiApiUrl,
    setAiUrl: setAiApiUrl,
    aiModelName,
    setAiModelName,
    githubToken,
    setGithubToken,
    systemPrompt,
    setSystemPrompt,
    graderIgnoreItems,
    setGraderIgnoreItems,
    supabaseSyncEnabled,
    setSupabaseSyncEnabled: handleSupabaseSyncToggle,
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
    isTesting: isAutoSaving,
    expanded,
    supabaseStatus,
    toggleSection,
    handleProviderChange,
    toggleIgnoreItem,
    handleSelectAllIgnore,
    handleDeselectAllIgnore,
    handleResetPrompt,
    handleSave: () => {},
    systemLogs,
    loadSystemLogs,
    handleClearLogs,
    handleDownloadLogsZip,
    cacheCount,
    handleClearCodeCache,
    loadCacheStats
  };
}
