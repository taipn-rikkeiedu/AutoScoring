import React from 'react';
import { Tabs } from 'antd';
import { useStudentMonitor } from '~/src/hooks/student-monitor/useStudentMonitor';
import { StudentMonitorTab } from '~/src/components/StudentMonitorTab';
import { StudentLookupTab } from '~/src/components/StudentLookupTab';
import { ClassListTab } from '~/src/components/ClassListTab';

export type StudentSubTab = 'monitor' | 'lookup' | 'class-list';

/**
 * "Quản lý sinh viên": gộp Giám sát học tập, Tra cứu sinh viên và Danh sách lớp.
 * Dữ liệu các lớp đã tải ở Giám sát dùng chung cho Tra cứu.
 */
export const StudentManagementTab: React.FC<{
  subTab: StudentSubTab;
  setSubTab: (t: StudentSubTab) => void;
  setActiveTab: (tab: string) => void;
  isLmsPage: boolean;
  unsupportedPage: React.ReactNode;
}> = ({ subTab, setSubTab, setActiveTab, isLmsPage, unsupportedPage }) => {
  const m = useStudentMonitor();
  const pane = (children: React.ReactNode) => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</div>
  );
  return (
    <>
    {/* Cho nội dung từng tab con chiếm hết chiều cao còn lại để bảng tự cuộn bên trong */}
    <style>{`.student-management-tabs .ant-tabs-content-holder{min-height:0;display:flex}
.student-management-tabs .ant-tabs-content,.student-management-tabs .ant-tabs-tabpane{height:100%;width:100%}`}</style>
    <Tabs
      activeKey={subTab}
      onChange={(k) => setSubTab(k as StudentSubTab)}
      style={{ height: '100%' }}
      tabBarStyle={{ margin: 0, padding: '0 16px', background: '#fff' }}
      className="student-management-tabs"
      items={[
        { key: 'monitor', label: 'Giám sát học tập', children: pane(<StudentMonitorTab m={m} />) },
        { key: 'lookup', label: 'Tra cứu sinh viên', children: pane(<StudentLookupTab m={m} onGoMonitor={() => setSubTab('monitor')} />) },
        {
          key: 'class-list',
          label: 'Danh sách lớp',
          // Danh sách lớp quét từ trang homework-checking nên vẫn cần đang mở trang LMS
          children: pane(isLmsPage ? <ClassListTab setActiveTab={setActiveTab} /> : unsupportedPage)
        }
      ]}
    />
    </>
  );
};
