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
import { ShortcutsTab } from '~/src/components/ShortcutsTab';
import { LmsApiTestTab } from '~/src/components/LmsApiTestTab';
import { QuickAccessBar } from '~/src/components/QuickAccessBar';
import { ReportModal } from '~/src/components/ReportModal';

const UnsupportedPageWarning: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-50 text-center select-none">
      <div className="text-5xl mb-4 animate-bounce">🚀</div>
      <h3 className="text-base font-bold text-slate-800 mb-2">Trang web không được hỗ trợ</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6">
        Tiện ích REduX AutoScoring chỉ hoạt động trên hệ thống LMS Rikkei Education (<span className="font-semibold text-blue-600">rikkei.edu.vn</span>).
      </p>
      <button
        onClick={() => {
          chrome.tabs.create({ url: "https://qldt.rikkei.edu.vn" });
        }}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer"
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
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 h-full w-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent mb-2.5"></div>
        <span className="text-xs font-bold text-slate-400 animate-pulse">Đang khởi động REduX...</span>
      </div>
    );
  }

  const isLmsPage = activeTabUrl.includes('rikkei.edu.vn') || activeTabUrl.includes('localhost') || activeTabUrl.includes('127.0.0.1');

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 select-none overflow-hidden">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <QuickAccessBar />
      
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
        {!isLmsPage && ["tab-auto", "tab-grader", "tab-class-list", "tab-care", "tab-exercises", "tab-lms-api"].includes(activeTab) ? (
          <UnsupportedPageWarning />
        ) : (
          <>
            {activeTab === "tab-auto" && <AutoGraderTab />}
            {activeTab === "tab-grader" && <SingleGraderTab />}
            {activeTab === "tab-class-list" && <ClassListTab setActiveTab={setActiveTab} />}
            {activeTab === "tab-care" && <CareTab />}
            {activeTab === "tab-exercises" && <ExercisesTab />}
            {activeTab === "tab-shortcuts" && <ShortcutsTab />}
            {activeTab === "tab-lms-api" && <LmsApiTestTab />}
            {activeTab === "tab-settings" && <SettingsTab />}
          </>
        )}
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
