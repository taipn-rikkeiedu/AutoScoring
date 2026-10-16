import React from 'react';
import { Layout, Typography, Space } from 'antd';

const { Header: AntHeader } = Layout;
const { Title, Text } = Typography;

interface HeaderProps {
  activeTab: string;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  "tab-auto": {
    title: "Chấm hàng loạt",
    subtitle: "Lấy bài nộp theo buổi từ QLĐT, khớp đúng đề và chấm bằng AI",
  },
  "tab-miniproject": {
    title: "Chấm Mini Project",
    subtitle: "Chấm điểm chung 1 đề cho toàn bộ học viên",
  },
  "tab-drive-scanner": {
    title: "Quét Google Drive",
    subtitle: "Trích xuất bài nộp từ thư mục Google Drive",
  },
  "tab-care": {
    title: "Chăm sóc học viên",
    subtitle: "Ca nghỉ không phép cần liên hệ — cập nhật thẳng lên QLĐT",
  },
  "tab-qldt-api": {
    title: "Thu thập API QLĐT",
    subtitle: "Ghi lại và quét các API của Quản lý đào tạo, xuất file JSON",
  },
  "tab-learning-stats": {
    title: "Giám sát học tập",
    subtitle: "Cảnh báo vi phạm học tập và nghi vấn BTVN theo lớp, môn",
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
  const [globalStatus, setGlobalStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleRateLimit = (e: any) => {
      setRateLimit(e.detail);
    };
    const handleGlobalStatus = (e: any) => {
      setGlobalStatus(e.detail);
    };
    window.addEventListener('aiRateLimit', handleRateLimit);
    window.addEventListener('appGlobalStatus', handleGlobalStatus);
    return () => {
      window.removeEventListener('aiRateLimit', handleRateLimit);
      window.removeEventListener('appGlobalStatus', handleGlobalStatus);
    };
  }, []);

  return (
    <AntHeader style={{ background: '#fff', padding: '8px 16px', height: 'auto', lineHeight: 'normal', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', width: '100%', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
            {currentTabInfo.title}
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {globalStatus || currentTabInfo.subtitle}
          </Text>
        </div>
        {rateLimit && (
          <Space size="small" style={{ fontSize: '12px', border: '1px solid #d9d9d9', borderRadius: '4px', padding: '2px 8px', background: '#fafafa' }}>
            <span title="Requests Limit">Req: <strong style={{ color: '#0958d9' }}>{rateLimit.req}</strong></span>
            <span style={{ width: '1px', height: '12px', background: '#d9d9d9', display: 'inline-block' }}></span>
            <span title="Tokens Limit">Token: <strong style={{ color: '#389e0d' }}>{rateLimit.tokens}</strong></span>
          </Space>
        )}
      </div>
    </AntHeader>
  );
};
