import React, { createContext, useContext } from 'react';
import { useAppInitializer } from './hooks/useAppInitializer';
import { AppConfig, Student, CareStudent, Submission } from '~/src/types';

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

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useAppInitializer();
  return (
    <AppContext.Provider value={value}>
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
