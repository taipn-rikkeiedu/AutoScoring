import React from 'react';
import { QuickAccessBar } from '~/src/components/QuickAccessBar';

interface HeaderProps {
  activeTab: string;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  "tab-auto": {
    title: "Chấm bài tự động",
    subtitle: "Tải mã nguồn và chấm điểm theo tiêu chí bài tập",
  },
  "tab-drive-scanner": {
    title: "Quét Google Drive",
    subtitle: "Trích xuất bài nộp từ thư mục Google Drive",
  },
  "tab-class-list": {
    title: "Quản lý lớp học",
    subtitle: "Tiến độ học tập và xuất bảng điểm Excel",
  },
  "tab-care": {
    title: "Chăm sóc học viên",
    subtitle: "Nhật ký liên hệ và hỗ trợ học viên",
  },
  "tab-exercises": {
    title: "Kho đề bài",
    subtitle: "Quản lý đề bài và thang điểm chấm",
  },
  "tab-shortcuts": {
    title: "Lối tắt nhanh",
    subtitle: "Truy cập nhanh các liên kết thường dùng",
  },
  "tab-lms-api": {
    title: "LMS API Test",
    subtitle: "Kiểm tra kết nối và dữ liệu từ API LMS",
  },
  "tab-settings": {
    title: "Cài đặt hệ thống",
    subtitle: "Cấu hình AI, Supabase Cloud và quy tắc chấm",
  },
};

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const currentTabInfo = TAB_TITLES[activeTab] || {
    title: "REduX AutoScoring",
    subtitle: "Công cụ hỗ trợ quản trị và chấm điểm đào tạo",
  };

  return (
    <header className="flex flex-col bg-white border-b border-slate-200 px-4 py-2.5 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-800 leading-tight">
            {currentTabInfo.title}
          </h1>
          <p className="text-[11px] text-slate-500 font-normal">
            {currentTabInfo.subtitle}
          </p>
        </div>
      </div>
      <QuickAccessBar />
    </header>
  );
};
