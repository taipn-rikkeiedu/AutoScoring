import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppConfig, Student, CareStudent, Submission } from '~/src/types';
import { loadExercises } from './exerciseLoader';
import { testConnection } from '~/src/services/connectionTester';

interface AppContextType {
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  exerciseTemplates: Record<string, Record<string, Record<string, { assignment: string; criteria: string }>>>;
  setExerciseTemplates: React.Dispatch<React.SetStateAction<any>>;
  supabaseStatus: string;
  setSupabaseStatus: React.Dispatch<React.SetStateAction<string>>;
  aiStatus: "success" | "error" | "testing";
  setAiStatus: React.Dispatch<React.SetStateAction<"success" | "error" | "testing">>;
  reloadExercises: () => Promise<void>;
  submissions: Submission[];
  setSubmissions: React.Dispatch<React.SetStateAction<Submission[]>>;
  classStudents: Student[];
  setClassStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  careStudents: CareStudent[];
  setCareStudents: React.Dispatch<React.SetStateAction<CareStudent[]>>;
  activeClassId: string | null;
  setActiveClassId: React.Dispatch<React.SetStateAction<string | null>>;
  activeStudentTransition: { studentId?: string; studentName?: string; timestamp: number } | null;
  currentTabUrl: string;
  setCurrentTabUrl: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
}

const defaultIgnoreItems = [
  "build/", "dist/", "target/", "out/", ".vscode/", ".idea/", "env/", "venv/",
  "Scripts/", "Lib/", "scripts/", "lib/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", 
  "composer.lock", "gradlew/mvnw", ".gitignore"
];

const defaultConfig: AppConfig = {
  aiProvider: "gemini",
  aiApiKey: "",
  aiApiUrl: "",
  aiModelName: "gemini-3.5-flash",
  githubToken: "",
  systemPrompt: "",
  graderIgnoreItems: defaultIgnoreItems,
  exerciseSource: "local",
  exerciseApiUrl: "",
  exerciseApiToken: "",
  uploadedExercises: null,
  supabaseSyncEnabled: false,
  supabaseUrl: "",
  supabaseAnonKey: ""
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [exerciseTemplates, setExerciseTemplates] = useState<any>({});
  const [supabaseStatus, setSupabaseStatus] = useState<string>("Chưa kích hoạt");
  const [aiStatus, setAiStatus] = useState<"success" | "error" | "testing">("testing");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [careStudents, setCareStudents] = useState<CareStudent[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeStudentTransition, setActiveStudentTransition] = useState<any>(null);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and load everything from chrome.storage.local
  useEffect(() => {
    chrome.storage.local.get([
      "aiProvider", "aiApiKey", "aiApiUrl", "aiModelName", "githubToken", "systemPrompt",
      "graderIgnoreItems", "exerciseSource", "exerciseApiUrl", "exerciseApiToken", "uploadedExercises",
      "supabaseSyncEnabled", "supabaseUrl", "supabaseAnonKey",
      "activeStudentTransition", "careStudents"
    ], async (stored: any) => {
      let systemPrompt = stored.systemPrompt || defaultConfig.systemPrompt;
      if (systemPrompt && systemPrompt.includes("Sai ở đâu & Dòng nào")) {
        systemPrompt = "";
        chrome.storage.local.set({ systemPrompt: "" });
      }

      // Build config object combining stored values and defaults
      const mergedConfig: AppConfig = {
        aiProvider: stored.aiProvider || defaultConfig.aiProvider,
        aiApiKey: stored.aiApiKey || defaultConfig.aiApiKey,
        aiApiUrl: stored.aiApiUrl || defaultConfig.aiApiUrl,
        aiModelName: stored.aiModelName || defaultConfig.aiModelName,
        githubToken: stored.githubToken || defaultConfig.githubToken,
        systemPrompt: systemPrompt,
        graderIgnoreItems: Array.isArray(stored.graderIgnoreItems) ? stored.graderIgnoreItems : defaultConfig.graderIgnoreItems,
        exerciseSource: stored.exerciseSource || defaultConfig.exerciseSource,
        exerciseApiUrl: stored.exerciseApiUrl || defaultConfig.exerciseApiUrl,
        exerciseApiToken: stored.exerciseApiToken || defaultConfig.exerciseApiToken,
        uploadedExercises: stored.uploadedExercises || null,
        supabaseSyncEnabled: !!stored.supabaseSyncEnabled,
        supabaseUrl: stored.supabaseUrl || defaultConfig.supabaseUrl,
        supabaseAnonKey: stored.supabaseAnonKey || defaultConfig.supabaseAnonKey
      };

      setConfig(mergedConfig);
      
      if (stored.activeStudentTransition) {
        setActiveStudentTransition(stored.activeStudentTransition);
      }

      // Load care students list
      if (stored.careStudents) {
        // Find if active class ID can be detected from current URL
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs && tabs[0]) {
            const url = tabs[0].url || "";
            setCurrentTabUrl(url);
            
            // Try to match Class ID from take-care page
            const matchCare = url.match(/\/class\/(\d+)\/take-care/);
            const matchHome = url.match(/\/homework-checking\/(\d+)/);
            const classId = matchCare ? matchCare[1] : (matchHome ? matchHome[1] : null);
            
            if (classId) {
              setActiveClassId(classId);
              setCareStudents((stored.careStudents as any)?.[classId] || []);
            }
          }
          setIsLoading(false);
        });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) {
            setCurrentTabUrl(tabs[0].url || "");
          }
          setIsLoading(false);
        });
      }
    });

    // Listen to chrome.storage changes (for transitions from content script)
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local') {
        if (changes.activeStudentTransition) {
          setActiveStudentTransition(changes.activeStudentTransition.newValue || null);
        }
        if (changes.careStudents && activeClassId) {
          const allCare = (changes.careStudents.newValue as Record<string, CareStudent[]>) || {};
          setCareStudents(allCare[activeClassId] || []);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [activeClassId]);

  const testAiConnection = async (cfg: AppConfig) => {
    setAiStatus("testing");
    try {
      await testConnection(cfg);
      setAiStatus("success");
    } catch (e) {
      console.warn("AI connection test failed:", e);
      setAiStatus("error");
    }
  };

  const loadTemplates = async (cfg: AppConfig) => {
    try {
      const { templates, statusText } = await loadExercises(cfg);
      setExerciseTemplates(templates);
      setSupabaseStatus(statusText);
    } catch (e) {
      console.error("Failed to load exercises:", e);
      setSupabaseStatus("🔴 Lỗi tải ngân hàng");
    }
  };

  // Load/Reload exercises
  const reloadExercises = async () => {
    if (!config) return;
    await Promise.all([
      testAiConnection(config),
      loadTemplates(config)
    ]);
  };

  useEffect(() => {
    if (!isLoading) {
      reloadExercises();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Update configuration helper
  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await new Promise<void>((resolve) => {
      chrome.storage.local.set(newConfig, () => {
        resolve();
      });
    });

    // Check what changed and reload selectively to optimize network traffic & token usage
    const aiKeys = ["aiProvider", "aiApiKey", "aiApiUrl", "aiModelName", "systemPrompt"];
    const hasAiChanges = aiKeys.some(key => key in newConfig);

    const exKeys = ["exerciseSource", "uploadedExercises", "exerciseApiUrl", "exerciseApiToken", "supabaseUrl", "supabaseAnonKey", "supabaseSyncEnabled"];
    const hasExChanges = exKeys.some(key => key in newConfig);

    if (hasAiChanges) {
      await testAiConnection(updated);
    }
    if (hasExChanges) {
      await loadTemplates(updated);
    }
  };

  return (
    <AppContext.Provider value={{
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
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
