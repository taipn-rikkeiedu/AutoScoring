import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '~/src/core/AppContext';
import { ToastProvider } from '~/src/core/ToastContext';
import { NavigationSidebar } from '~/src/components/NavigationSidebar';
import { Header } from '~/src/components/Header';
import { AutoGraderTab } from '~/src/components/AutoGraderTab';
import { MiniProjectTab } from '~/src/components/MiniProjectTab';
import { CareTab } from '~/src/components/CareTab';
import { ExercisesTab } from '~/src/components/ExercisesTab';
import { SettingsTab } from '~/src/components/SettingsTab';
import { ReportModal } from '~/src/components/ReportModal';
import { StudentManagementTab, StudentSubTab } from '~/src/components/StudentManagementTab';
import { queryActiveLmsTab } from '~/src/core/utils';
import { ConfigProvider, Layout, Spin, Result, Button, App as AntdApp } from 'antd';
import viVN from 'antd/locale/vi_VN';

const { Content } = Layout;

const UnsupportedPageWarning: React.FC = () => {
  return (
    <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <Result
        status="warning"
        title="Trang web không thuộc LMS"
        subTitle={<>Tính năng này cần hoạt động trên hệ thống đào tạo Rikkei Education (<strong style={{ color: '#1890ff' }}>rikkei.edu.vn</strong>).</>}
        extra={
          <Button type="primary" onClick={() => chrome.tabs.create({ url: "https://qldt.rikkei.edu.vn" })}>
            Mở QLDT Rikkei Education
          </Button>
        }
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("tab-auto");
  const [studentSubTab, setStudentSubTab] = useState<StudentSubTab>("monitor");
  const [activeTabUrl, setActiveTabUrl] = useState<string>("");
  const { isLoading } = useApp();
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    title: string;
    score: string | null;
    report: string;
    language?: string;
    astMetrics?: import('~/src/services/codeAnalysis').ASTMetrics;
    imagesAttached?: number;
    imagesSkipped?: number;
  }>({
    isOpen: false,
    title: "",
    score: null,
    report: ""
  });

  useEffect(() => {
    (window as any).showReportModal = (data: { title: string; score: string | null; report: string; language?: string; astMetrics?: import('~/src/services/codeAnalysis').ASTMetrics; imagesAttached?: number; imagesSkipped?: number }) => {
      setReportModalData({
        isOpen: true,
        title: data.title,
        score: data.score,
        report: data.report,
        language: data.language,
        astMetrics: data.astMetrics,
        imagesAttached: data.imagesAttached,
        imagesSkipped: data.imagesSkipped
      });
    };
    return () => {
      delete (window as any).showReportModal;
    };
  }, []);

  useEffect(() => {
    queryActiveLmsTab((tab) => {
      if (tab) {
        const url = tab.url || "";
        setActiveTabUrl(url);
        let targetTab = "tab-auto";

        if (url.includes("/class/") && url.includes("/take-care")) {
          targetTab = "tab-care";
        } else if (url.includes("/homework-checking/")) {
          targetTab = "tab-students";
          setStudentSubTab("class-list");
        } else if (url.includes("/type/elMajor/") && url.includes("/view/")) {
          targetTab = "tab-exercises";
        } else if (url.includes("/learning-statistics")) {
          targetTab = "tab-students";
          setStudentSubTab("monitor");
        } else if (url.includes("/practice-result/")) {
          targetTab = "tab-miniproject";
        }
        
        setActiveTab(targetTab);
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', background: '#001529' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Đang khởi động REduX AutoScoring...</div>
      </div>
    );
  }

  const isLmsPage = activeTabUrl.includes('rikkei.edu.vn') || activeTabUrl.includes('localhost') || activeTabUrl.includes('127.0.0.1');

  return (
    <Layout style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <NavigationSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <Layout style={{ overflow: 'hidden', background: '#f5f5f5' }}>
        <Header activeTab={activeTab} />
        
        <Content style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {!isLmsPage && ["tab-auto", "tab-miniproject", "tab-care", "tab-exercises"].includes(activeTab) ? (
            <UnsupportedPageWarning />
          ) : (
            <>
              {activeTab === "tab-auto" && <AutoGraderTab />}
              {activeTab === "tab-miniproject" && <MiniProjectTab />}
              {activeTab === "tab-care" && <CareTab />}
              {activeTab === "tab-exercises" && <ExercisesTab />}
              {activeTab === "tab-students" && (
                <StudentManagementTab
                  subTab={studentSubTab}
                  setSubTab={setStudentSubTab}
                  setActiveTab={setActiveTab}
                  isLmsPage={isLmsPage}
                  unsupportedPage={<UnsupportedPageWarning />}
                />
              )}
              {activeTab === "tab-settings" && <SettingsTab />}
            </>
          )}
        </Content>
      </Layout>

      <ReportModal
        isOpen={reportModalData.isOpen}
        onClose={() => setReportModalData(prev => ({ ...prev, isOpen: false }))}
        title={reportModalData.title}
        score={reportModalData.score}
        report={reportModalData.report}
        language={reportModalData.language}
        astMetrics={reportModalData.astMetrics}
        imagesAttached={reportModalData.imagesAttached}
        imagesSkipped={reportModalData.imagesSkipped}
      />
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <ConfigProvider 
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
          }
        }
      }}
    >
      <AntdApp>
        <ToastProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ToastProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
