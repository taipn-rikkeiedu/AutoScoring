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

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ activeTab, setActiveTab }) => {
  const { supabaseStatus, aiStatus } = useApp();
  const version = APP_INFO.version;
  const [isWindowMode, setIsWindowMode] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.uiWindowMode, (result) => {
      setIsWindowMode(result[STORAGE_KEYS.uiWindowMode] === "window");
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
    <aside className="w-[185px] h-full flex-shrink-0 bg-sky-50/60 text-slate-700 flex flex-col justify-between border-r border-sky-200 select-none">
      {/* Brand Header */}
      <div className="px-3.5 py-3 border-b border-sky-200 bg-white flex items-center justify-between">
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
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-2.5 px-2 flex flex-col gap-3 scrollbar-none">
        {menuGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-sky-900/80">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left ${
                    isActive
                      ? "bg-sky-500 text-white font-bold shadow-xs"
                      : "text-slate-700 hover:bg-sky-100 hover:text-sky-900 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white" : "text-sky-600"}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
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
      <div className="p-2.5 border-t border-sky-200 bg-white flex flex-col gap-2">
        {/* Status Indicators */}
        <div className="flex items-center justify-between text-[10px] font-semibold px-1 text-slate-600">
          <div
            onClick={() => setActiveTab("tab-settings")}
            className="flex items-center gap-1.5 cursor-pointer hover:text-sky-700 transition-colors"
            title="Trạng thái Supabase Cloud"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseStatus.includes("🟢")
                  ? "bg-emerald-500"
                  : supabaseStatus.includes("🔴")
                  ? "bg-rose-500"
                  : "bg-amber-400"
              }`}
            />
            <span>Cloud</span>
          </div>

          <div
            onClick={() => setActiveTab("tab-settings")}
            className="flex items-center gap-1.5 cursor-pointer hover:text-sky-700 transition-colors"
            title="Trạng thái AI Provider"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus === "success"
                  ? "bg-emerald-500"
                  : aiStatus === "error"
                  ? "bg-rose-500"
                  : "bg-amber-400"
              }`}
            />
            <span>AI</span>
          </div>
        </div>

        {/* Window Mode Toggle */}
        <button
          type="button"
          onClick={handleToggleWindowMode}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-semibold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 transition-colors cursor-pointer"
          title={isWindowMode ? "Chuyển về dạng popup" : "Mở dạng cửa sổ riêng biệt"}
        >
          <WindowIcon className="w-3.5 h-3.5 text-sky-700" />
          <span>{isWindowMode ? "Ghim tiện ích" : "Mở cửa sổ rời"}</span>
        </button>
      </div>
    </aside>
  );
};
