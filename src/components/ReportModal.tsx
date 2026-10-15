import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useToast } from '~/src/core/ToastContext';
import { AstMetricsPanel } from '~/src/components/AstMetricsPanel';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { ASTMetrics } from '~/src/services/codeAnalysis';
import { Modal, Button, Tag, Space, Alert } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  score: string | null;
  report: string;
  language?: string;
  astMetrics?: ASTMetrics;
  imagesAttached?: number;
  imagesSkipped?: number;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, title, score, report, language, astMetrics, imagesAttached, imagesSkipped }) => {
  const [isCopied, setIsCopied] = useState(false);
  const { showToast } = useToast();
  const { gradingScale } = useSettings();

  const parsedMarkdown = report ? DOMPurify.sanitize(marked.parse(report) as string) : '';
  const numericScore = score ? parseFloat(score) : NaN;

  let badgeColor = 'error';
  if (!isNaN(numericScore)) {
    const ratio = numericScore / (parseFloat(gradingScale) || 10);
    if (ratio >= 0.8) badgeColor = 'success';
    else if (ratio >= 0.5) badgeColor = 'warning';
  }

  const handleCopy = () => {
    if (!report) return;
    let textToCopy = report.replace(/<score>[\s\S]*?<\/score>/gi, '').trim();
    if (score && !textToCopy.toLowerCase().includes('tổng điểm')) {
      textToCopy = `${textToCopy}\n\nTổng điểm: ${score}/${gradingScale}`;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      showToast("Đã sao chép báo cáo vào bộ nhớ tạm!", "success");
      setTimeout(() => setIsCopied(false), 1500);
    }).catch(err => {
      console.error(err);
      showToast("Lỗi sao chép báo cáo.", "error");
    });
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={700}
      centered
      destroyOnClose
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 16 }}>
             {title}
          </div>
          <Space>
             <Button 
               icon={isCopied ? <CheckOutlined /> : <CopyOutlined />} 
               onClick={handleCopy} 
               size="small"
             >
               {isCopied ? "Đã sao chép" : "Sao chép"}
             </Button>
             <Tag color={badgeColor} style={{ margin: 0, fontSize: 14, padding: '2px 8px' }}>
               {score !== null ? `${score} / ${gradingScale}` : `-- / ${gradingScale}`}
             </Tag>
          </Space>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <AstMetricsPanel language={language} metrics={astMetrics} />
        
        {(!!imagesAttached || !!imagesSkipped) && (
          <Space direction="vertical" size={4}>
            {!!imagesAttached && (
              <Alert type="info" showIcon message={`Đã gửi kèm ${imagesAttached} ảnh sơ đồ cho AI`} style={{ padding: '4px 12px' }} />
            )}
            {!!imagesSkipped && (
              <Alert type="warning" showIcon message={`Bỏ qua ${imagesSkipped} ảnh (định dạng không hỗ trợ hoặc vượt dung lượng)`} style={{ padding: '4px 12px' }} />
            )}
          </Space>
        )}
        
        {report ? (
          <div
            className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-xs 
              prose-headings:font-bold prose-headings:text-slate-800 prose-headings:my-2
              prose-p:my-1 prose-ul:my-1 prose-li:my-0.5
              prose-strong:text-slate-800"
            dangerouslySetInnerHTML={{ __html: parsedMarkdown }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
            Không có dữ liệu báo cáo.
          </div>
        )}
      </div>
    </Modal>
  );
};
