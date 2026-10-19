import React, { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { DEFAULT_SYSTEM_PROMPT } from '~/src/core/utils';
import { GRADER_IGNORE_DEFAULTS } from '~/src/core/constants';
import { logger, LogEntry } from '~/src/core/logger';
import JSZip from 'jszip';
import { credentialsFrom } from '~/src/services/ai/aiService';
import { useServices } from '~/src/services/ServicesContext';
import { SupabaseService } from '~/src/services/supabase/supabaseService';

const defaultGraderIgnoreOptions = [...GRADER_IGNORE_DEFAULTS];

export function useSettings() {
  const { config, updateConfig, supabaseStatus } = useApp();
  const { showToast } = useToast();
  const { ai } = useServices();

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
  const [googleApiKey, setGoogleApiKey] = useState(config.googleApiKey || "");
  const [gradingScale, setGradingScaleState] = useState(config.gradingScale || "10");
  const [strictnessLevel, setStrictnessLevelState] = useState(config.strictnessLevel || "Bình thường");

  // Mỗi component gọi useSettings() có state riêng; lưu ngay vào config chung để các tab
  // (Cài đặt, Chấm hàng loạt, Mini project) và luồng chấm bài luôn đọc cùng một giá trị.
  const setGradingScale = (value: string) => {
    setGradingScaleState(value);
    updateConfig({ gradingScale: value });
  };
  const setStrictnessLevel = (value: string) => {
    setStrictnessLevelState(value);
    updateConfig({ strictnessLevel: value });
  };

  const [dbInitialized, setDbInitialized] = useState<boolean | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const [aiReady, setAiReady] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const [providerModels, setProviderModels] = useState<{ label: string; value: string; description?: string }[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const fetchProviderModels = async (isStale: () => boolean = () => false) => {
    const key = (aiApiKey || "").trim();
    setIsLoadingModels(true);
    try {
      const models = await ai.listModels({ provider: aiProvider, apiKey: key, apiUrl: aiApiUrl, modelName: aiModelName });
      // Bỏ qua kết quả của provider cũ nếu người dùng đã đổi provider trong lúc đang tải
      if (isStale()) return;
      // Luôn ghi đè (kể cả rỗng) để không giữ lại danh sách model của provider trước đó
      setProviderModels(models || []);
      if (models && models.length > 0) {
        logger.info("SETTINGS", `Đã tự động tải ${models.length} model hợp lệ trực tiếp từ API của [${aiProvider}].`);
        // Nếu model hiện tại chưa được chọn hoặc rỗng, tự động chọn model đầu tiên
        if (!aiModelName || !models.some(m => m.value === aiModelName)) {
          setAiModelName(models[0].value);
        }
      }
    } catch (err: any) {
      if (isStale()) return;
      setProviderModels([]);
      console.warn(`Lỗi tải danh sách models từ API ${aiProvider}:`, err);
    } finally {
      if (!isStale()) setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setProviderModels([]);
    fetchProviderModels(() => cancelled);
    return () => { cancelled = true; };
  }, [aiProvider, aiApiKey, aiApiUrl]);

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
    setGoogleApiKey(config.googleApiKey || "");
    setGradingScaleState(config.gradingScale || "10");
    setStrictnessLevelState(config.strictnessLevel || "Bình thường");
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
      supabasePat !== config.supabasePat ||
      googleApiKey !== config.googleApiKey;

    if (!hasChanges) return;

    setIsAutoSaving(true);
    const timer = setTimeout(async () => {
      try {
        await updateConfig({
          aiApiKey: aiApiKey.trim(),
          aiApiKeys: { ...(config.aiApiKeys || {}), [aiProvider]: aiApiKey.trim() },
          aiApiUrl: aiApiUrl.trim(),
          aiModelName: aiModelName.trim(),
          githubToken: githubToken.trim(),
          systemPrompt,
          supabaseUrl: supabaseUrl.trim(),
          supabaseAnonKey: supabaseAnonKey.trim(),
          supabasePat: supabasePat.trim(),
          googleApiKey: googleApiKey.trim()
        });
        showToast("Cấu hình đã được tự động lưu!", "success");
      } catch (err: any) {
        showToast(`Lỗi tự động lưu: ${err.message}`, "error");
      } finally {
        setIsAutoSaving(false);
      }
    }, 1200); // 1.2 seconds debounce

    return () => clearTimeout(timer);
  }, [aiProvider, aiApiKey, aiApiUrl, aiModelName, githubToken, systemPrompt, supabaseUrl, supabaseAnonKey, supabasePat, googleApiKey]);

  const loadSystemLogs = async () => {
    const logs = await logger.getLogs();
    setSystemLogs([...logs].reverse());
  };

  const handleClearLogs = async () => {
    await logger.clearLogs();
    setSystemLogs([]);
    showToast("Đã xóa toàn bộ nhật ký hệ thống.", "success");
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

  const [isTestingAi, setIsTestingAi] = useState(false);
  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    try {
      await ai.testConnection(credentialsFrom({
        aiProvider,
        aiApiKey: aiApiKey.trim(),
        aiApiUrl: aiApiUrl.trim(),
        aiModelName: aiModelName.trim()
      }));
      showToast("Kết nối tới AI Provider thành công!", "success");
    } catch (err: any) {
      showToast(`Kết nối thất bại: ${err.message}`, "error");
    } finally {
      setIsTestingAi(false);
    }
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleClearCodeCache = () => {
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

  const handleProviderChange = (provider: string) => {
    // Lưu key của provider hiện tại và nạp key riêng của provider mới
    const nextKeys = { ...(config.aiApiKeys || {}), [aiProvider]: aiApiKey.trim() };
    const nextKey = nextKeys[provider] || "";
    setAiProvider(provider);
    setAiApiKey(nextKey);

    // Model gợi ý của nhà cung cấp mới (registry); nhà cung cấp không có gợi ý (vd tự nhập URL) → giữ model đang nhập
    const defaultModel = ai.describe(provider)?.defaultModel ?? aiModelName;
    const nextApiUrl = aiApiUrl;
    setAiModelName(defaultModel);

    updateConfig({
      aiProvider: provider,
      aiApiKey: nextKey,
      aiApiKeys: nextKeys,
      aiModelName: defaultModel,
      aiApiUrl: nextApiUrl
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

  const verifyDatabaseSchema = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) return;
    const isInit = await SupabaseService.verifyDatabaseSchema({
      ...config,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim()
    });
    setDbInitialized(isInit);
  };

  useEffect(() => {
    if (supabaseSyncEnabled) {
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
    showToast("Đang gửi yêu cầu khởi tạo cơ sở dữ liệu lên Supabase...", "info");
    logger.info("SUPABASE", "Bắt đầu chạy SQL DDL Migrations để tạo cấu trúc bảng...");

    try {
      await SupabaseService.initializeDatabaseSchema({
        ...config,
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim()
      }, supabasePat);
      
      showToast("Khởi tạo cấu trúc bảng Supabase thành công!", "success");
      logger.success("SUPABASE", "Chạy SQL DDL Migrations tạo bảng thành công.");
      await verifyDatabaseSchema();
    } catch (e: any) {
      showToast("Không thể khởi tạo cơ sở dữ liệu: " + e.message, "error");
      logger.error("SUPABASE", "Lỗi chạy DDL SQL Migrations trên Supabase.", e.message);
    } finally {
      setIsMigrating(false);
    }
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
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    updateConfig({
      systemPrompt: DEFAULT_SYSTEM_PROMPT
    }).then(() => {
      showToast("Đã khôi phục System Prompt mặc định!", "success");
    });
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
    googleApiKey,
    setGoogleApiKey,
    gradingScale,
    setGradingScale,
    strictnessLevel,
    setStrictnessLevel,
    providerModels,
    isLoadingModels,
    refreshModels: () => fetchProviderModels(),
    aiReady,
    isTesting: isAutoSaving,
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
