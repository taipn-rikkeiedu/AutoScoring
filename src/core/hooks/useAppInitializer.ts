import { useState, useEffect } from 'react';
import { AppConfig, Student, CareStudent, Submission } from '~/src/types';
import { loadExercises } from '../exerciseLoader';
import { testConnection } from '~/src/services/connectionTester';
import { getClassStudents } from '../classStudentStorage';
import { AI_DEFAULTS, GRADER_IGNORE_DEFAULTS, STORAGE_KEYS, UI_MESSAGES } from '../constants';
import { logger } from '../logger';

const defaultIgnoreItems = [...GRADER_IGNORE_DEFAULTS];

export const defaultConfig: AppConfig = {
  aiProvider: AI_DEFAULTS.provider,
  aiApiKey: "",
  aiApiUrl: "",
  aiModelName: AI_DEFAULTS.geminiModel,
  githubToken: "",
  systemPrompt: "",
  graderIgnoreItems: defaultIgnoreItems,
  exerciseSource: "local",
  exerciseApiUrl: "",
  exerciseApiToken: "",
  uploadedExercises: null,
  supabaseSyncEnabled: false,
  supabaseUrl: "",
  supabaseAnonKey: "",
  supabasePat: ""
};

export function useAppInitializer() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [exerciseTemplates, setExerciseTemplates] = useState<any>({});
  const [supabaseStatus, setSupabaseStatus] = useState<string>(UI_MESSAGES.statuses.supabaseInactive);
  const [aiStatus, setAiStatus] = useState<"success" | "error" | "testing">("testing");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [careStudents, setCareStudents] = useState<CareStudent[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeStudentTransition, setActiveStudentTransition] = useState<any>(null);
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
      STORAGE_KEYS.aiProvider, STORAGE_KEYS.aiApiKey, STORAGE_KEYS.aiApiUrl, STORAGE_KEYS.aiModelName, STORAGE_KEYS.githubToken, STORAGE_KEYS.systemPrompt,
      STORAGE_KEYS.graderIgnoreItems, STORAGE_KEYS.exerciseSource, STORAGE_KEYS.exerciseApiUrl, STORAGE_KEYS.exerciseApiToken, STORAGE_KEYS.uploadedExercises,
      STORAGE_KEYS.supabaseSyncEnabled, STORAGE_KEYS.supabaseUrl, STORAGE_KEYS.supabaseAnonKey, STORAGE_KEYS.supabasePat,
      STORAGE_KEYS.activeStudentTransition, STORAGE_KEYS.careStudents
    ], async (stored: any) => {
      let systemPrompt = stored[STORAGE_KEYS.systemPrompt] || defaultConfig.systemPrompt;
      if (systemPrompt && (systemPrompt.includes("Sai ở đâu & Dòng nào") || systemPrompt.includes("- [Tên file: Dòng X]:"))) {
        systemPrompt = "";
        chrome.storage.local.set({ [STORAGE_KEYS.systemPrompt]: "" });
      }

      const mergedConfig: AppConfig = {
        aiProvider: stored[STORAGE_KEYS.aiProvider] || defaultConfig.aiProvider,
        aiApiKey: stored[STORAGE_KEYS.aiApiKey] || defaultConfig.aiApiKey,
        aiApiUrl: stored[STORAGE_KEYS.aiApiUrl] || defaultConfig.aiApiUrl,
        aiModelName: stored[STORAGE_KEYS.aiModelName] || defaultConfig.aiModelName,
        githubToken: stored[STORAGE_KEYS.githubToken] || defaultConfig.githubToken,
        systemPrompt: systemPrompt,
        graderIgnoreItems: Array.isArray(stored[STORAGE_KEYS.graderIgnoreItems]) ? stored[STORAGE_KEYS.graderIgnoreItems] : defaultConfig.graderIgnoreItems,
        exerciseSource: stored[STORAGE_KEYS.exerciseSource] || defaultConfig.exerciseSource,
        exerciseApiUrl: stored[STORAGE_KEYS.exerciseApiUrl] || defaultConfig.exerciseApiUrl,
        exerciseApiToken: stored[STORAGE_KEYS.exerciseApiToken] || defaultConfig.exerciseApiToken,
        uploadedExercises: stored[STORAGE_KEYS.uploadedExercises] || null,
        supabaseSyncEnabled: !!stored[STORAGE_KEYS.supabaseSyncEnabled],
        supabaseUrl: stored[STORAGE_KEYS.supabaseUrl] || defaultConfig.supabaseUrl,
        supabaseAnonKey: stored[STORAGE_KEYS.supabaseAnonKey] || defaultConfig.supabaseAnonKey,
        supabasePat: stored[STORAGE_KEYS.supabasePat] || defaultConfig.supabasePat
      };

      setConfig(mergedConfig);
      
      if (stored[STORAGE_KEYS.activeStudentTransition]) {
        setActiveStudentTransition(stored[STORAGE_KEYS.activeStudentTransition]);
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          const url = tabs[0].url || "";
          setCurrentTabUrl(url);
          const matchCare = url.match(/\/class\/(\d+)\/take-care/);
          const matchHome = url.match(/\/homework-checking\/(\d+)/);
          const classId = matchCare ? matchCare[1] : (matchHome ? matchHome[1] : null);
          if (classId) {
            setActiveClassId(classId);
            if (stored[STORAGE_KEYS.careStudents]) {
              setCareStudents((stored[STORAGE_KEYS.careStudents] as any)?.[classId] || []);
            }
          }
        }
        setIsLoading(false);
      });
    });

    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local') {
        if (changes[STORAGE_KEYS.activeStudentTransition]) {
          setActiveStudentTransition(changes[STORAGE_KEYS.activeStudentTransition].newValue || null);
        }
        if (changes[STORAGE_KEYS.careStudents] && activeClassId) {
          const allCare = (changes[STORAGE_KEYS.careStudents].newValue as Record<string, CareStudent[]>) || {};
          setCareStudents(allCare[activeClassId] || []);
        }
        if (changes[STORAGE_KEYS.classStudentLists] && activeClassId) {
          const allClasses = (changes[STORAGE_KEYS.classStudentLists].newValue as Record<string, Student[]>) || {};
          setClassStudents(allClasses[activeClassId] || []);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [activeClassId]);

  useEffect(() => {
    if (!activeClassId) return;
    getClassStudents(activeClassId).then(setClassStudents);
  }, [activeClassId]);

  const testAiConnection = async (cfg: AppConfig) => {
    setAiStatus("testing");
    logger.info("AI_SERVICE", `Bắt đầu kiểm tra kết nối tới AI Provider: ${cfg.aiProvider}`);
    try {
      await testConnection(cfg);
      setAiStatus("success");
      logger.success("AI_SERVICE", `Kết nối AI Provider [${cfg.aiProvider}] thành công.`);
    } catch (err: any) {
      setAiStatus("error");
      logger.error("AI_SERVICE", `Kết nối AI Provider [${cfg.aiProvider}] thất bại.`, err.message);
    }
  };

  const loadTemplates = async (cfg: AppConfig) => {
    logger.info("EXERCISE_LOADER", "Bắt đầu tải danh sách đề bài mẫu.");
    try {
      const { templates, statusText } = await loadExercises(cfg);
      setExerciseTemplates(templates);
      setSupabaseStatus(statusText);
      logger.success("EXERCISE_LOADER", `Tải danh sách đề bài thành công: ${statusText}`);
    } catch (err: any) {
      setSupabaseStatus(UI_MESSAGES.statuses.exerciseLoadError);
      logger.error("EXERCISE_LOADER", "Không thể tải danh sách đề bài.", err.message);
    }
  };

  const reloadExercises = async () => {
    if (!config) return;
    await Promise.all([testAiConnection(config), loadTemplates(config)]);
  };

  useEffect(() => {
    if (!isLoading) reloadExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await new Promise<void>((resolve) => {
      chrome.storage.local.set(newConfig, () => resolve());
    });

    const aiKeys = [STORAGE_KEYS.aiProvider, STORAGE_KEYS.aiApiKey, STORAGE_KEYS.aiApiUrl, STORAGE_KEYS.aiModelName, STORAGE_KEYS.systemPrompt];
    const hasAiChanges = aiKeys.some(key => key in newConfig);

    const exKeys = [
      STORAGE_KEYS.exerciseSource, STORAGE_KEYS.uploadedExercises, STORAGE_KEYS.exerciseApiUrl,
      STORAGE_KEYS.exerciseApiToken, STORAGE_KEYS.supabaseUrl, STORAGE_KEYS.supabaseAnonKey, STORAGE_KEYS.supabaseSyncEnabled, STORAGE_KEYS.supabasePat
    ];
    const hasExChanges = exKeys.some(key => key in newConfig);

    if (hasAiChanges) await testAiConnection(updated);
    if (hasExChanges) await loadTemplates(updated);
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
    reloadExercises,
    submissions,
    setSubmissions,
    classStudents,
    setClassStudents,
    careStudents,
    setCareStudents,
    activeClassId,
    setActiveClassId,
    activeStudentTransition,
    currentTabUrl,
    setCurrentTabUrl,
    isLoading
  };
}
