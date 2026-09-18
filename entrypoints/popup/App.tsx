import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '~/src/core/AppContext';
import { ToastProvider } from '~/src/core/ToastContext';
import { NavigationSidebar } from '~/src/components/NavigationSidebar';
import { Header } from '~/src/components/Header';
import { AutoGraderTab } from '~/src/components/AutoGraderTab';
import { ClassListTab } from '~/src/components/ClassListTab';
import { CareTab } from '~/src/components/CareTab';
import { ExercisesTab } from '~/src/components/ExercisesTab';
import { SettingsTab } from '~/src/components/SettingsTab';
import { ShortcutsTab } from '~/src/components/ShortcutsTab';
import { LmsApiTestTab } from '~/src/components/LmsApiTestTab';
import { ReportModal } from '~/src/components/ReportModal';
import { DriveScannerTab } from '~/src/components/DriveScannerTab';
import { LearningStatsTab } from '~/src/components/LearningStatsTab';

const UnsupportedPageWarning: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-50 text-center select-none">
      <h3 className="text-sm font-bold text-slate-800 mb-1.5">Trang web không thuộc LMS</h3>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">
        Tính năng này cần hoạt động trên hệ thống đào tạo Rikkei Education (<span className="font-semibold text-blue-600">rikkei.edu.vn</span>).
      </p>
      <button
        onClick={() => {
          chrome.tabs.create({ url: "https://qldt.rikkei.edu.vn" });
        }}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
      >
        Mở QLDT Rikkei Education
      </button>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("tab-auto");
  const [activeTabUrl, setActiveTabUrl] = useState<string>("");
  const { isLoading } = useApp();
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    title: string;
    score: string | null;
    report: string;
    language?: string;
    astMetrics?: import('~/src/services/codeAnalysis').ASTMetrics;
  }>({
    isOpen: false,
    title: "",
    score: null,
    report: ""
  });

  // Attach report modal trigger to window for legacy support from other contexts
  useEffect(() => {
    (window as any).showReportModal = (data: { title: string; score: string | null; report: string; language?: string; astMetrics?: import('~/src/services/codeAnalysis').ASTMetrics }) => {
      setReportModalData({
        isOpen: true,
        title: data.title,
        score: data.score,
        report: data.report,
        language: data.language,
        astMetrics: data.astMetrics
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
        setActiveTabUrl(url);
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
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-900 text-white h-full w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent mb-3"></div>
        <span className="text-xs font-bold text-slate-300 animate-pulse">Đang khởi động REduX AutoScoring...</span>
      </div>
    );
  }

  const isLmsPage = activeTabUrl.includes('rikkei.edu.vn') || activeTabUrl.includes('localhost') || activeTabUrl.includes('127.0.0.1');

  return (
    <div className="flex h-full w-full bg-slate-50 select-none overflow-hidden font-sans">
      {/* Modern Navigation Sidebar */}
      <NavigationSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 overflow-hidden">
        <Header activeTab={activeTab} />
        
        <main className="flex-1 overflow-hidden flex flex-col bg-slate-50">
          {!isLmsPage && ["tab-auto", "tab-class-list", "tab-care", "tab-exercises", "tab-lms-api", "tab-learning-stats"].includes(activeTab) ? (
            <UnsupportedPageWarning />
          ) : (
            <>
              {activeTab === "tab-auto" && <AutoGraderTab />}
              {activeTab === "tab-class-list" && <ClassListTab setActiveTab={setActiveTab} />}
              {activeTab === "tab-care" && <CareTab />}
              {activeTab === "tab-exercises" && <ExercisesTab />}
              {activeTab === "tab-learning-stats" && <LearningStatsTab />}
              {activeTab === "tab-shortcuts" && <ShortcutsTab />}
              {activeTab === "tab-lms-api" && <LmsApiTestTab />}
              {activeTab === "tab-drive-scanner" && <DriveScannerTab />}
              {activeTab === "tab-settings" && <SettingsTab />}
            </>
          )}
        </main>
      </div>

      {/* Modal View */}
      <ReportModal
        isOpen={reportModalData.isOpen}
        onClose={() => setReportModalData(prev => ({ ...prev, isOpen: false }))}
        title={reportModalData.title}
        score={reportModalData.score}
        report={reportModalData.report}
        language={reportModalData.language}
        astMetrics={reportModalData.astMetrics}
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
