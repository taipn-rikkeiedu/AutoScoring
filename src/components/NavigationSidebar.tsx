import React, { useEffect, useState } from 'react';
import { useApp } from '~/src/core/AppContext';
import { STORAGE_KEYS, APP_INFO } from '~/src/core/constants';
import { Layout, Menu, Button, Tooltip, Badge, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
  SparklesIcon,
  FolderIcon,
  ChartBarIcon,
  PhoneIcon,
  PinIcon,
  TerminalIcon,
  SettingsIcon,
  WindowIcon,
  ChevronDownIcon,
  ArchiveBoxIcon,
} from '~/src/components/Icons';

const { Sider } = Layout;

interface NavigationSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

function statusDotColor(isSuccess: boolean, isError: boolean): string {
  if (isSuccess) return "green";
  if (isError) return "red";
  return "gold";
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ activeTab, setActiveTab }) => {
  const { supabaseStatus, aiStatus } = useApp();
  const version = APP_INFO.version;
  const [isWindowMode, setIsWindowMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.uiWindowMode, STORAGE_KEYS.uiSidebarCollapsed], (result) => {
      setIsWindowMode(result[STORAGE_KEYS.uiWindowMode] === "window");
      setIsCollapsed(result[STORAGE_KEYS.uiSidebarCollapsed] !== false);
    });
  }, []);

  const handleToggleWindowMode = () => {
    const nextMode = isWindowMode ? "popup" : "window";
    chrome.storage.local.set({ [STORAGE_KEYS.uiWindowMode]: nextMode }, () => {
      if (nextMode === "window") {
        chrome.runtime.sendMessage({ type: "OPEN_FLOATING_WINDOW" }, () => window.close());
      } else {
        window.close();
      }
    });
  };

  const handleToggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    chrome.storage.local.set({ [STORAGE_KEYS.uiSidebarCollapsed]: next });
  };

  const items: MenuProps['items'] = [
    {
      type: 'group',
      label: !isCollapsed && 'Chấm điểm',
      children: [
        {
          key: 'tab-auto',
          icon: <SparklesIcon className="w-4 h-4" />,
          label: (
            <div className="flex justify-between items-center w-full">
              <span>Chấm hàng loạt</span>
              {!isCollapsed && <Badge count="AI" style={{ backgroundColor: '#fadb14', color: '#000', fontSize: '10px' }} />}
            </div>
          ),
        },
        {
          key: 'tab-miniproject',
          icon: <WindowIcon className="w-4 h-4" />,
          label: (
            <div className="flex justify-between items-center w-full">
              <span>Chấm Mini Project</span>
              {!isCollapsed && <Badge count="AI" style={{ backgroundColor: '#fadb14', color: '#000', fontSize: '10px' }} />}
            </div>
          ),
        },
      ],
    },
    {
      type: 'group',
      label: !isCollapsed && 'Quản lý sinh viên',
      children: [
        { key: 'tab-learning-stats', icon: <ChartBarIcon className="w-4 h-4" />, label: 'Giám sát học tập' },
        { key: 'tab-care', icon: <PhoneIcon className="w-4 h-4" />, label: 'Chăm sóc học viên' },
      ],
    },
    {
      type: 'group',
      label: !isCollapsed && 'Hệ thống',
      children: [
        { key: 'tab-qldt-api', icon: <ArchiveBoxIcon className="w-4 h-4" />, label: 'Thu thập API QLĐT' },
        { key: 'tab-settings', icon: <SettingsIcon className="w-4 h-4" />, label: 'Cài đặt' },
      ],
    },
  ];

  return (
    <Sider
      collapsible
      collapsed={isCollapsed}
      onCollapse={setIsCollapsed}
      trigger={null}
      width={220}
      collapsedWidth={60}
      theme="light"
      style={{
        borderRight: '1px solid #f0f0f0',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Brand Header */}
      <div className={`p-3 border-b border-gray-100 flex items-center h-14 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {isCollapsed ? (
          <Tooltip title={`REduX AutoScoring v${version}`} placement="right">
            <div className="w-8 h-8 rounded-md bg-amber-400 flex items-center justify-center text-slate-950 font-extrabold text-sm tracking-wider shadow-sm cursor-pointer">
              RE
            </div>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-amber-400 flex items-center justify-center text-slate-950 font-extrabold text-sm tracking-wider shadow-sm">
                RE
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight">REduX</span>
                <span className="text-[11px] text-sky-700 leading-none font-bold">AutoScoring</span>
              </div>
            </div>
            <Badge count={`v${version}`} style={{ backgroundColor: '#f0f5ff', color: '#2f54eb', borderColor: '#adc6ff' }} />
          </>
        )}
      </div>

      {/* Collapse/Expand Toggle */}
      <div 
        onClick={handleToggleCollapsed}
        className={`flex items-center gap-2 py-2 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer ${isCollapsed ? "justify-center" : "justify-start px-4"}`}
      >
        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "-rotate-90" : "rotate-90"}`} />
        {!isCollapsed && <span className="text-xs font-semibold">Thu gọn</span>}
      </div>

      {/* Navigation List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={(e) => setActiveTab(e.key)}
          items={items}
          style={{ borderRight: 0 }}
        />
      </div>

      {/* Footer Status & Actions */}
      <div className={`p-3 border-t border-gray-100 flex flex-col gap-3 ${isCollapsed ? "items-center" : ""}`}>
        {/* Status Indicators */}
        {isCollapsed ? (
          <Space direction="vertical" size="small" align="center">
            <Tooltip title="Trạng thái Supabase Cloud" placement="right">
              <Badge status={statusDotColor(supabaseStatus.includes("🟢"), supabaseStatus.includes("🔴")) as any} />
            </Tooltip>
            <Tooltip title="Trạng thái AI Provider" placement="right">
              <Badge status={statusDotColor(aiStatus === "success", aiStatus === "error") as any} />
            </Tooltip>
          </Space>
        ) : (
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600 px-1">
            <Tooltip title="Trạng thái Supabase Cloud">
              <div className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setActiveTab("tab-settings")}>
                <Badge status={statusDotColor(supabaseStatus.includes("🟢"), supabaseStatus.includes("🔴")) as any} />
                <span>Cloud</span>
              </div>
            </Tooltip>

            <Tooltip title="Trạng thái AI Provider">
              <div className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setActiveTab("tab-settings")}>
                <Badge status={statusDotColor(aiStatus === "success", aiStatus === "error") as any} />
                <span>AI</span>
              </div>
            </Tooltip>
          </div>
        )}

        {/* Window Mode Toggle */}
        <Tooltip title={isWindowMode ? "Chuyển về dạng popup" : "Mở dạng cửa sổ riêng biệt"} placement={isCollapsed ? "right" : "top"}>
          <Button 
            onClick={handleToggleWindowMode}
            icon={<WindowIcon className="w-4 h-4" />}
            className="w-full text-xs font-semibold flex items-center justify-center"
            type="default"
          >
            {!isCollapsed && (isWindowMode ? "Ghim tiện ích" : "Mở cửa sổ rời")}
          </Button>
        </Tooltip>
      </div>
    </Sider>
  );
};
