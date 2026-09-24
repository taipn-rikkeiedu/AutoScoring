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

  const [rateLimit, setRateLimit] = React.useState<{ req: string, tokens: string } | null>(null);

  React.useEffect(() => {
    const handleRateLimit = (e: any) => {
      setRateLimit(e.detail);
    };
    window.addEventListener('aiRateLimit', handleRateLimit);
    return () => window.removeEventListener('aiRateLimit', handleRateLimit);
  }, []);

  return (
    <header className="flex flex-col topbar px-4 py-2.5 select-none w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-heading leading-tight">
            {currentTabInfo.title}
          </h1>
          <p className="text-[12.5px] text-muted font-normal mt-0.5">
            {currentTabInfo.subtitle}
          </p>
        </div>
        {rateLimit && (
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 border border-slate-200 rounded px-2 py-1 bg-white shadow-sm mt-1">
            <span title="Requests Limit">Req: <strong className="text-sky-600">{rateLimit.req}</strong></span>
            <span className="w-[1px] h-3 bg-slate-200"></span>
            <span title="Tokens Limit">Token: <strong className="text-emerald-600">{rateLimit.tokens}</strong></span>
          </div>
        )}
      </div>
      <QuickAccessBar />
    </header>
  );
};
