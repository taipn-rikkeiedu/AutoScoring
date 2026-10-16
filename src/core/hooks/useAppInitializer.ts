import { useState, useEffect } from 'react';
import { AppConfig, Submission } from '~/src/types';
import { ExerciseBank, bankToTemplates } from '../exerciseBank';
import { SupabaseService } from '~/src/services/supabaseService';
import { testConnection } from '~/src/services/connectionTester';
import { AI_DEFAULTS, GRADER_IGNORE_DEFAULTS, STORAGE_KEYS, UI_MESSAGES } from '../constants';
import { logger } from '../logger';
import { queryActiveLmsTab } from '../utils';

const defaultIgnoreItems = [...GRADER_IGNORE_DEFAULTS];

export const defaultConfig: AppConfig = {
  aiProvider: AI_DEFAULTS.provider,
  aiApiKey: "",
  aiApiKeys: {},
  aiApiUrl: "",
  aiModelName: AI_DEFAULTS.geminiModel,
  githubToken: "",
  systemPrompt: "",
  graderIgnoreItems: defaultIgnoreItems,
  supabaseSyncEnabled: false,
  supabaseUrl: "",
  supabaseAnonKey: "",
  supabasePat: "",
  googleApiKey: "",
  gradingScale: "10",
  strictnessLevel: "Bình thường"
};

export function useAppInitializer() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [exerciseTemplates, setExerciseTemplates] = useState<any>({});
  const [exerciseBank, setExerciseBank] = useState<ExerciseBank>({});
  const [supabaseStatus, setSupabaseStatus] = useState<string>(UI_MESSAGES.statuses.supabaseInactive);
  const [aiStatus, setAiStatus] = useState<"success" | "error" | "testing">("testing");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Clean expired cache (older than 24h)
    chrome.storage.local.get(null, (allData) => {
      const now = Date.now();
      const keysToRemove: string[] = [];
      for (const key in allData) {
        if (key.startsWith('code_cache:')) {
          const entry = allData[key] as any;
          if (entry && entry.cachedAt && (now - entry.cachedAt > 24 * 60 * 60 * 1000)) {
            keysToRemove.push(key);
          }
        }
      }
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => {
          logger.info("SYSTEM", `Đã tự động xóa ${keysToRemove.length} bản ghi cache mã nguồn hết hạn (>24 giờ).`);
        });
      }
    });

    chrome.storage.local.get([
      STORAGE_KEYS.aiProvider, STORAGE_KEYS.aiApiKey, STORAGE_KEYS.aiApiKeys, STORAGE_KEYS.aiApiUrl, STORAGE_KEYS.aiModelName, STORAGE_KEYS.githubToken, STORAGE_KEYS.systemPrompt,
      STORAGE_KEYS.graderIgnoreItems, STORAGE_KEYS.exerciseBank,
      STORAGE_KEYS.supabaseSyncEnabled, STORAGE_KEYS.supabaseUrl, STORAGE_KEYS.supabaseAnonKey, STORAGE_KEYS.supabasePat, STORAGE_KEYS.googleApiKey, STORAGE_KEYS.gradingScale, STORAGE_KEYS.strictnessLevel,
      STORAGE_KEYS.cachedAiStatus, STORAGE_KEYS.cachedSupabaseStatus
    ], async (stored: any) => {
      let systemPrompt = stored[STORAGE_KEYS.systemPrompt] || defaultConfig.systemPrompt;
      if (systemPrompt && (systemPrompt.includes("Sai ở đâu & Dòng nào") || systemPrompt.includes("- [Tên file: Dòng X]:") || systemPrompt.includes("## ĐÁNH GIÁ & NHẬN XÉT CHI TIẾT") || systemPrompt.includes("Mẫu 1: \"Sinh viên đã sửa thành công") || systemPrompt.includes("Tổng điểm: **") || systemPrompt.includes("get_current_user") || systemPrompt.includes("<score>") || !systemPrompt.includes("KHÔNG đưa các thông số kỹ thuật khô khan") || !systemPrompt.includes("CHỈ RA LỖI + GỢI Ý SỬA NGẮN NHẤT"))) {
        systemPrompt = "";
        chrome.storage.local.set({ [STORAGE_KEYS.systemPrompt]: "" });
      }

      const activeProvider: string = stored[STORAGE_KEYS.aiProvider] || defaultConfig.aiProvider;
      const legacyKey: string = stored[STORAGE_KEYS.aiApiKey] || defaultConfig.aiApiKey;
      const aiApiKeys: Record<string, string> = { ...(stored[STORAGE_KEYS.aiApiKeys] || {}) };
      // Migrate legacy single key: attribute it to the provider that was active
      if (legacyKey && !aiApiKeys[activeProvider]) aiApiKeys[activeProvider] = legacyKey;

      const mergedConfig: AppConfig = {
        aiProvider: activeProvider,
        aiApiKey: aiApiKeys[activeProvider] || "",
        aiApiKeys,
        aiApiUrl: stored[STORAGE_KEYS.aiApiUrl] || defaultConfig.aiApiUrl,
        aiModelName: stored[STORAGE_KEYS.aiModelName] || defaultConfig.aiModelName,
        githubToken: stored[STORAGE_KEYS.githubToken] || defaultConfig.githubToken,
        systemPrompt: systemPrompt,
        graderIgnoreItems: Array.isArray(stored[STORAGE_KEYS.graderIgnoreItems]) ? stored[STORAGE_KEYS.graderIgnoreItems] : defaultConfig.graderIgnoreItems,
        supabaseSyncEnabled: stored[STORAGE_KEYS.supabaseSyncEnabled] ?? defaultConfig.supabaseSyncEnabled,
        supabaseUrl: stored[STORAGE_KEYS.supabaseUrl] || defaultConfig.supabaseUrl,
        supabaseAnonKey: stored[STORAGE_KEYS.supabaseAnonKey] || defaultConfig.supabaseAnonKey,
        supabasePat: stored[STORAGE_KEYS.supabasePat] || defaultConfig.supabasePat,
        googleApiKey: stored[STORAGE_KEYS.googleApiKey] || defaultConfig.googleApiKey,
        gradingScale: stored[STORAGE_KEYS.gradingScale] || defaultConfig.gradingScale,
        strictnessLevel: stored[STORAGE_KEYS.strictnessLevel] || defaultConfig.strictnessLevel
      };

      setConfig(mergedConfig);
      
      // Kho đề: các môn đã tải từ QLĐT
      const bank: ExerciseBank = stored[STORAGE_KEYS.exerciseBank] || {};
      setExerciseBank(bank);
      setExerciseTemplates(bankToTemplates(bank));
      if (stored[STORAGE_KEYS.cachedAiStatus]) {
        setAiStatus(stored[STORAGE_KEYS.cachedAiStatus]);
      }
      if (stored[STORAGE_KEYS.cachedSupabaseStatus]) {
        setSupabaseStatus(stored[STORAGE_KEYS.cachedSupabaseStatus]);
      }
      

      queryActiveLmsTab((tab) => {
        if (tab) {
          const url = tab.url || "";
          setCurrentTabUrl(url);
          const matchCare = url.match(/\/class\/(\d+)\/take-care/);
          const matchHome = url.match(/\/homework-checking\/(\d+)/);
          const classId = matchCare ? matchCare[1] : (matchHome ? matchHome[1] : null);
          if (classId) setActiveClassId(classId);
        }
        setIsLoading(false);
      });
    });

  }, [activeClassId]);

  const testAiConnection = async (cfg: AppConfig, silent = false) => {
    if (!silent) setAiStatus("testing");
    logger.info("AI_SERVICE", `Bắt đầu kiểm tra kết nối tới AI Provider: ${cfg.aiProvider}`);
    try {
      await testConnection(cfg);
      setAiStatus("success");
      chrome.storage.local.set({ [STORAGE_KEYS.cachedAiStatus]: "success" });
      logger.success("AI_SERVICE", `Kết nối AI Provider [${cfg.aiProvider}] thành công.`);
    } catch (err: any) {
      setAiStatus("error");
      chrome.storage.local.set({ [STORAGE_KEYS.cachedAiStatus]: "error" });
      logger.error("AI_SERVICE", `Kết nối AI Provider [${cfg.aiProvider}] thất bại.`, err.message);
    }
  };

  /** Kiểm tra kết nối Supabase (dùng cho điểm đã chấm, chăm sóc học viên). */
  const checkSupabase = async (cfg: AppConfig) => {
    let status: string = UI_MESSAGES.statuses.supabaseInactive;
    if (SupabaseService.isEnabled(cfg)) {
      status = (await SupabaseService.verifyDatabaseSchema(cfg)) ? UI_MESSAGES.statuses.supabaseReady : UI_MESSAGES.statuses.supabaseDbError;
    }
    setSupabaseStatus(status);
    chrome.storage.local.set({ [STORAGE_KEYS.cachedSupabaseStatus]: status });
  };

  /** Lưu kho đề (các môn đã tải từ QLĐT) và cập nhật đề cho các phần chấm điểm. */
  const saveExerciseBank = async (bank: ExerciseBank) => {
    setExerciseBank(bank);
    setExerciseTemplates(bankToTemplates(bank));
    await chrome.storage.local.set({ [STORAGE_KEYS.exerciseBank]: bank });
  };

  useEffect(() => {
    if (!isLoading) {
      // Kiểm tra ngầm, không chặn giao diện
      testAiConnection(config, true);
      checkSupabase(config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await new Promise<void>((resolve) => {
      chrome.storage.local.set(newConfig, () => resolve());
    });

    const aiKeys = [STORAGE_KEYS.aiProvider, STORAGE_KEYS.aiApiKey, STORAGE_KEYS.aiApiKeys, STORAGE_KEYS.aiApiUrl, STORAGE_KEYS.aiModelName, STORAGE_KEYS.systemPrompt];
    const hasAiChanges = aiKeys.some(key => key in newConfig);

    const supabaseKeys = [STORAGE_KEYS.supabaseUrl, STORAGE_KEYS.supabaseAnonKey, STORAGE_KEYS.supabaseSyncEnabled];
    const hasSupabaseChanges = supabaseKeys.some(key => key in newConfig);

    if (hasAiChanges) await testAiConnection(updated);
    if (hasSupabaseChanges) await checkSupabase(updated);
  };

  return {
    config,
    updateConfig,
    exerciseTemplates,
    setExerciseTemplates,
    supabaseStatus,
    setSupabaseStatus,
    aiStatus,
    setAiStatus,
    exerciseBank,
    saveExerciseBank,
    submissions,
    setSubmissions,
    activeClassId,
    setActiveClassId,
    currentTabUrl,
    setCurrentTabUrl,
    isLoading
  };
}
