import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '~/src/core/AppContext';
import { ToastProvider } from '~/src/core/ToastContext';
import { Header } from '~/src/components/Header';
import { AutoGraderTab } from '~/src/components/AutoGraderTab';
import { SingleGraderTab } from '~/src/components/SingleGraderTab';
import { ClassListTab } from '~/src/components/ClassListTab';
import { CareTab } from '~/src/components/CareTab';
import { ExercisesTab } from '~/src/components/ExercisesTab';
import { SettingsTab } from '~/src/components/SettingsTab';
import { ReportModal } from '~/src/components/ReportModal';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("tab-auto");
  const { isLoading } = useApp();
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    title: string;
    score: string | null;
    report: string;
  }>({
    isOpen: false,
    title: "",
    score: null,
    report: ""
  });

  // Attach report modal trigger to window for legacy support from other contexts
  useEffect(() => {
    (window as any).showReportModal = (data: { title: string; score: string | null; report: string }) => {
      setReportModalData({
        isOpen: true,
        title: data.title,
        score: data.score,
        report: data.report
      });
    };
    return () => {
      delete (window as any).showReportModal;
    };
  }, []);

  // Auto-route based on active browser URL on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const url = tabs[0].url || "";
        let targetTab = "tab-auto";

        if (url.includes("/class/") && url.includes("/take-care")) {
          targetTab = "tab-care";
        } else if (url.includes("/homework-checking/")) {
          targetTab = "tab-class-list";
        } else if (url.includes("/type/elMajor/") && url.includes("/view/")) {
          targetTab = "tab-exercises";
        }
        
        setActiveTab(targetTab);
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 h-full w-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent mb-2.5"></div>
        <span className="text-xs font-bold text-slate-400 animate-pulse">Đang khởi động REduX...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 select-none overflow-hidden">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
        {activeTab === "tab-auto" && <AutoGraderTab />}
        {activeTab === "tab-grader" && <SingleGraderTab />}
        {activeTab === "tab-class-list" && <ClassListTab setActiveTab={setActiveTab} />}
        {activeTab === "tab-care" && <CareTab />}
        {activeTab === "tab-exercises" && <ExercisesTab />}
        {activeTab === "tab-settings" && <SettingsTab />}
      </div>

      <ReportModal
        isOpen={reportModalData.isOpen}
        onClose={() => setReportModalData(prev => ({ ...prev, isOpen: false }))}
        title={reportModalData.title}
        score={reportModalData.score}
        report={reportModalData.report}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
  );
};

export default App;
