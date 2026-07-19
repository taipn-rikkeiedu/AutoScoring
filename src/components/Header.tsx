import React from 'react';
import { useApp } from '~/src/core/AppContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { supabaseStatus, aiStatus } = useApp();
  const version = chrome.runtime.getManifest().version;

  const handleSupabaseClick = () => {
    setActiveTab("tab-settings");
    // Scroll to supabase config accordion item if needed, but since it's Settings Tab, it's fine
  };

  return (
    <header className="flex items-center justify-between px-4.5 py-2.5 border-b border-slate-200 bg-white select-none">
      <div className="flex items-center justify-start h-7 w-[90px] flex-shrink-0">
        <img src="/logo.png" className="max-h-full max-w-full object-contain block" alt="REduX Logo" />
      </div>

      <div className="flex-1 max-w-[200px] mx-4">
        <select
          id="tab-navigator-select"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
        >
          <option value="tab-auto">⚡ Chấm Hàng Loạt</option>
          <option value="tab-class-list">👥 Quản Lý Lớp Học</option>
          <option value="tab-care">📞 Chăm Sóc SV</option>
          <option value="tab-exercises">📚 Đề Bài</option>
          <option value="tab-shortcuts">📌 Lối Tắt Nhanh</option>
          <option value="tab-lms-api">🧪 LMS API Test</option>
          <option value="tab-settings">⚙️ Cài Đặt</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        {supabaseStatus.includes("🟢") ? (
          <span
            onClick={handleSupabaseClick}
            className="text-[10px] font-bold py-0.5 px-1.5 rounded-full cursor-pointer bg-green-100 text-green-700 border border-green-200 transition-colors hover:bg-green-200"
            title="Supabase Cloud: Đồng bộ sẵn sàng"
          >
            Cloud
          </span>
        ) : supabaseStatus.includes("🔴") ? (
          <span
            onClick={handleSupabaseClick}
            className="text-[10px] font-bold py-0.5 px-1.5 rounded-full cursor-pointer bg-red-100 text-red-700 border border-red-200 transition-colors hover:bg-red-200"
            title="Supabase Cloud: Lỗi kết nối CSDL"
          >
            Cloud
          </span>
        ) : null}

        <span
          className={`text-[10px] font-bold py-0.5 px-1.5 rounded-full border ${
            aiStatus === "success" ? "bg-green-100 text-green-700 border-green-200" :
            aiStatus === "error" ? "bg-red-100 text-red-700 border-red-200" :
            "bg-slate-100 text-slate-600 border-slate-200 animate-pulse"
          }`}
          title={
            aiStatus === "success" ? "AI Provider: Kết nối thành công" :
            aiStatus === "error" ? "AI Provider: Lỗi kết nối hoặc cấu hình sai" :
            "AI Provider: Đang kiểm tra kết nối..."
          }
        >
          v{version}
        </span>
      </div>
    </header>
  );
};
