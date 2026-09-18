import React, { useEffect, useState } from 'react';
import { useApp } from '~/src/core/AppContext';
import { STORAGE_KEYS, APP_INFO } from '~/src/core/constants';
import {
  SparklesIcon,
  FolderIcon,
  UsersIcon,
  PhoneIcon,
  BookOpenIcon,
  PinIcon,
  TerminalIcon,
  SettingsIcon,
  WindowIcon,
  TableCellsIcon,
  ChevronDownIcon,
} from '~/src/components/Icons';

interface NavigationSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const EXPANDED_WIDTH = "w-[185px]";
const COLLAPSED_WIDTH = "w-12";

function statusDotColor(isSuccess: boolean, isError: boolean): string {
  if (isSuccess) return "bg-emerald-500";
  if (isError) return "bg-rose-500";
  return "bg-amber-400";
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

  const menuGroups: MenuGroup[] = [
    {
      title: "Chấm điểm",
      items: [
        { id: "tab-auto", label: "Chấm hàng loạt", icon: SparklesIcon, badge: "AI" },
        { id: "tab-drive-scanner", label: "Quét Google Drive", icon: FolderIcon },
      ],
    },
    {
      title: "Quản lý LMS",
      items: [
        { id: "tab-class-list", label: "Danh sách lớp", icon: UsersIcon },
        { id: "tab-care", label: "Chăm sóc học viên", icon: PhoneIcon },
        { id: "tab-exercises", label: "Kho đề bài", icon: BookOpenIcon },
        { id: "tab-learning-stats", label: "Giám sát học tập", icon: TableCellsIcon },
      ],
    },
    {
      title: "Hệ thống",
      items: [
        { id: "tab-shortcuts", label: "Lối tắt nhanh", icon: PinIcon },
        { id: "tab-lms-api", label: "LMS API Test", icon: TerminalIcon },
        { id: "tab-settings", label: "Cài đặt", icon: SettingsIcon },
      ],
    },
  ];

  return (
    <aside className={`${isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH} h-full flex-shrink-0 bg-sky-50/60 text-slate-700 flex flex-col justify-between border-r border-sky-200 select-none transition-[width] duration-150`}>
      {/* Brand Header */}
      <div className={`px-2 py-3 border-b border-sky-200 bg-white flex items-center ${isCollapsed ? "justify-center" : "justify-between px-3.5"}`}>
        {isCollapsed ? (
          <div className="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center text-slate-950 font-extrabold text-xs tracking-wider shadow-xs" title={`REduX AutoScoring v${version}`}>
            RE
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center text-slate-950 font-extrabold text-xs tracking-wider shadow-xs">
                RE
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-xs tracking-tight">REduX</span>
                <span className="text-[9px] text-sky-700 leading-none font-bold">AutoScoring</span>
              </div>
            </div>
            <span className="text-[9px] font-mono text-sky-800 px-1.5 py-0.5 rounded bg-sky-100 border border-sky-300 font-semibold">
              v{version}
            </span>
          </>
        )}
      </div>

      {/* Collapse/Expand Toggle */}
      <button
        type="button"
        onClick={handleToggleCollapsed}
        className={`flex items-center gap-1.5 py-1.5 border-b border-sky-200 bg-white hover:bg-sky-50 text-sky-700 transition-colors cursor-pointer ${isCollapsed ? "justify-center px-2" : "justify-start px-3"}`}
        title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
      >
        <ChevronDownIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : "rotate-90"}`} />
        {!isCollapsed && <span className="text-[10.5px] font-semibold">Thu gọn</span>}
      </button>

      {/* Navigation List */}
      <div className={`flex-1 overflow-y-auto py-2.5 flex flex-col gap-3 scrollbar-none ${isCollapsed ? "px-1.5" : "px-2"}`}>
        {menuGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            {!isCollapsed && (
              <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-sky-900/80">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-md text-xs transition-colors cursor-pointer text-left ${
                    isCollapsed ? "justify-center px-2 py-2" : "justify-between px-2.5 py-1.5"
                  } ${
                    isActive
                      ? "bg-sky-500 text-white font-bold shadow-xs"
                      : "text-slate-700 hover:bg-sky-100 hover:text-sky-900 font-medium"
                  }`}
                >
                  <div className={`flex items-center gap-2 truncate ${isCollapsed ? "relative" : ""}`}>
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white" : "text-sky-600"}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {isCollapsed && item.badge && (
                      <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded flex-shrink-0 ${
                        isActive ? "bg-amber-400 text-slate-950" : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Status & Actions */}
      <div className={`p-2 border-t border-sky-200 bg-white flex flex-col gap-2 ${isCollapsed ? "items-center" : ""}`}>
        {/* Status Indicators */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("tab-settings")}
              className={`w-2 h-2 rounded-full cursor-pointer ${statusDotColor(supabaseStatus.includes("🟢"), supabaseStatus.includes("🔴"))}`}
              title="Trạng thái Supabase Cloud"
            />
            <button
              type="button"
              onClick={() => setActiveTab("tab-settings")}
              className={`w-2 h-2 rounded-full cursor-pointer ${statusDotColor(aiStatus === "success", aiStatus === "error")}`}
              title="Trạng thái AI Provider"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] font-semibold px-1 text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab("tab-settings")}
              className="flex items-center gap-1.5 cursor-pointer hover:text-sky-700 transition-colors"
              title="Trạng thái Supabase Cloud"
            >
              <span className={`w-2 h-2 rounded-full ${statusDotColor(supabaseStatus.includes("🟢"), supabaseStatus.includes("🔴"))}`} />
              <span>Cloud</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tab-settings")}
              className="flex items-center gap-1.5 cursor-pointer hover:text-sky-700 transition-colors"
              title="Trạng thái AI Provider"
            >
              <span className={`w-2 h-2 rounded-full ${statusDotColor(aiStatus === "success", aiStatus === "error")}`} />
              <span>AI</span>
            </button>
          </div>
        )}

        {/* Window Mode Toggle */}
        <button
          type="button"
          onClick={handleToggleWindowMode}
          title={isWindowMode ? "Chuyển về dạng popup" : "Mở dạng cửa sổ riêng biệt"}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 transition-colors cursor-pointer ${
            isCollapsed ? "w-8 px-0" : "w-full px-2"
          }`}
        >
          <WindowIcon className="w-3.5 h-3.5 text-sky-700 flex-shrink-0" />
          {!isCollapsed && <span>{isWindowMode ? "Ghim tiện ích" : "Mở cửa sổ rời"}</span>}
        </button>
      </div>
    </aside>
  );
};
