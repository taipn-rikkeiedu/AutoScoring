import React, { useState } from 'react';
import {
  formatExerciseToMarkdown,
  exportSessionToZip,
  exportLibraryToZip,
  copyMarkdownToClipboard,
  downloadMarkdownFile,
  sanitizeFileName,
  ExerciseLibrary
} from '~/src/core/markdownExporter';
import { Modal, Tabs, Radio, Checkbox, Button, Space, Typography, Badge, Alert } from 'antd';
import { DocumentTextIcon } from '~/src/components/Icons';
import { CopyOutlined, DownloadOutlined, FileZipOutlined, CheckOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

type ExportScope = 'single' | 'session' | 'all';

interface Props {
  selectedChapter: string;
  selectedSession: string;
  selectedAssignment: string;
  promptText: string;
  criteriaText: string;
  exerciseTemplates: ExerciseLibrary;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const MarkdownExportModal: React.FC<Props> = ({
  selectedChapter,
  selectedSession,
  selectedAssignment,
  promptText,
  criteriaText,
  exerciseTemplates,
  onClose,
  onToast
}) => {
  const [scope, setScope] = useState<ExportScope>(
    selectedChapter && selectedSession && selectedAssignment ? 'single' : 'all'
  );
  const [includeRubric, setIncludeRubric] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('options');

  const totalChapters = Object.keys(exerciseTemplates).length;
  let totalAllExercises = 0;
  Object.values(exerciseTemplates).forEach(sessions => {
    Object.values(sessions).forEach(assigns => {
      totalAllExercises += Object.keys(assigns).length;
    });
  });

  const sessionExercises = (selectedChapter && selectedSession && exerciseTemplates[selectedChapter]?.[selectedSession]) || {};
  const sessionExerciseCount = Object.keys(sessionExercises).length;

  const currentMarkdown = formatExerciseToMarkdown({
    chapter: selectedChapter || 'Chưa chọn',
    session: selectedSession || 'Chưa chọn',
    assignmentName: selectedAssignment || 'Bài tập mẫu',
    assignmentText: promptText || '',
    criteriaText: includeRubric ? criteriaText : '',
    includeMetadata
  });

  const handleCopy = async () => {
    if (scope === 'single') {
      const ok = await copyMarkdownToClipboard(currentMarkdown);
      if (ok) {
        setCopied(true);
        onToast('Đã sao chép nội dung Markdown vào bộ nhớ tạm!', 'success');
        setTimeout(() => setCopied(false), 2000);
      } else {
        onToast('Không thể sao chép vào bộ nhớ tạm.', 'error');
      }
    } else if (scope === 'session') {
      const names = Object.keys(sessionExercises).sort();
      const merged = names.map((name) => {
        const ex = sessionExercises[name];
        return formatExerciseToMarkdown({
          chapter: selectedChapter,
          session: selectedSession,
          assignmentName: name,
          assignmentText: ex.assignment || '',
          criteriaText: includeRubric ? (ex.criteria || '') : '',
          includeMetadata
        });
      }).join('\n\n---\n\n');

      const ok = await copyMarkdownToClipboard(merged);
      if (ok) {
        setCopied(true);
        onToast(`Đã sao chép toàn bộ ${names.length} bài tập trong Session!`, 'success');
        setTimeout(() => setCopied(false), 2000);
      } else {
        onToast('Không thể sao chép vào bộ nhớ tạm.', 'error');
      }
    } else {
      onToast('Tùy chọn Toàn bộ Kho đề bài chỉ hỗ trợ tải file nén .zip.', 'warning');
    }
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);

      if (scope === 'single') {
        if (!selectedAssignment) {
          onToast('Vui lòng chọn bài tập trước khi xuất.', 'warning');
          return;
        }
        const safeChapter = sanitizeFileName(selectedChapter, 'Course');
        const safeSession = sanitizeFileName(selectedSession, 'Session');
        const safeName = sanitizeFileName(selectedAssignment, 'Exercise');
        const fileName = `${safeChapter}_${safeSession}_${safeName}.md`;

        downloadMarkdownFile(currentMarkdown, fileName);
        onToast(`Đã xuất bài tập '${selectedAssignment}' sang file .md!`, 'success');
        onClose();
      } else if (scope === 'session') {
        if (!selectedChapter || !selectedSession) {
          onToast('Vui lòng chọn Khóa học và Session cần xuất.', 'warning');
          return;
        }
        if (sessionExerciseCount === 0) {
          onToast('Session này không có bài tập nào để xuất.', 'warning');
          return;
        }
        await exportSessionToZip(selectedChapter, selectedSession, sessionExercises);
        onToast(`Đã xuất ${sessionExerciseCount} bài tập trong Session sang file .zip!`, 'success');
        onClose();
      } else if (scope === 'all') {
        if (totalAllExercises === 0) {
          onToast('Kho đề bài hiện đang trống.', 'warning');
          return;
        }
        const res = await exportLibraryToZip(exerciseTemplates);
        onToast(`Đã xuất toàn bộ Kho đề bài (${res.totalExercises} bài tập) thành công!`, 'success');
        onClose();
      }
    } catch (err: any) {
      console.error('Lỗi xuất tệp:', err);
      onToast(`Lỗi xuất tệp: ${err.message || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const optionsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>PHẠM VI XUẤT ĐỀ BÀI</Text>
        <Radio.Group onChange={(e) => setScope(e.target.value)} value={scope} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          
          <Radio value="single" disabled={!selectedAssignment} style={{ margin: 0, padding: 8, border: '1px solid', borderColor: scope === 'single' ? '#91caff' : '#d9d9d9', backgroundColor: scope === 'single' ? '#e6f7ff' : '#fff', borderRadius: 6 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ fontSize: 12 }}>1. Đề bài đang chọn</Text>
                <Badge count="File .md" style={{ backgroundColor: '#1677ff' }} />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{selectedAssignment || '(Chưa chọn bài tập)'}</Text>
            </div>
          </Radio>

          <Radio value="session" disabled={!selectedSession} style={{ margin: 0, padding: 8, border: '1px solid', borderColor: scope === 'session' ? '#91caff' : '#d9d9d9', backgroundColor: scope === 'session' ? '#e6f7ff' : '#fff', borderRadius: 6 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ fontSize: 12 }}>2. Toàn bộ Session này</Text>
                <Badge count={`File .zip (${sessionExerciseCount} bài)`} style={{ backgroundColor: '#531dab' }} />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{selectedSession ? `${selectedChapter} > ${selectedSession}` : '(Chưa chọn Session)'}</Text>
            </div>
          </Radio>

          <Radio value="all" style={{ margin: 0, padding: 8, border: '1px solid', borderColor: scope === 'all' ? '#91caff' : '#d9d9d9', backgroundColor: scope === 'all' ? '#e6f7ff' : '#fff', borderRadius: 6 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ fontSize: 12 }}>3. Toàn bộ Kho đề bài</Text>
                <Badge count={`Gói .zip (${totalAllExercises} bài)`} style={{ backgroundColor: '#52c41a' }} />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>Bao gồm {totalChapters} khóa học, tạo cấu trúc thư mục và README mục lục.</Text>
            </div>
          </Radio>

        </Radio.Group>
      </div>

      <div>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>CÀI ĐẶT ĐỊNH DẠNG</Text>
        <div style={{ padding: 12, backgroundColor: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Checkbox checked={includeRubric} onChange={(e) => setIncludeRubric(e.target.checked)}>
            <Text style={{ fontSize: 12 }}>Kèm tiêu chí chấm điểm (Rubric / Criteria)</Text>
          </Checkbox>
          <Checkbox checked={includeMetadata} onChange={(e) => setIncludeMetadata(e.target.checked)}>
            <Text style={{ fontSize: 12 }}>Kèm thông tin Khóa học & Ngày xuất (Metadata Header)</Text>
          </Checkbox>
        </div>
      </div>
    </div>
  );

  const previewContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 12 }}>XEM TRƯỚC NỘI DUNG MARKDOWN</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>{currentMarkdown.length} ký tự</Text>
      </div>
      <div style={{ backgroundColor: '#141414', padding: 12, borderRadius: 8, maxHeight: 300, overflowY: 'auto' }}>
        <pre style={{ margin: 0, color: '#f0f0f0', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          {currentMarkdown}
        </pre>
      </div>
    </div>
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DocumentTextIcon className="w-4 h-4 text-blue-600" />
          <span>Xuất Đề Bài Sang Markdown</span>
        </div>
      }
      open={true}
      onCancel={onClose}
      footer={[
        <div key="footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          {scope !== 'all' ? (
            <Button 
              icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
              onClick={handleCopy}
              style={{ color: copied ? '#52c41a' : undefined, borderColor: copied ? '#b7eb8f' : undefined }}
            >
              {copied ? 'Đã chép!' : 'Sao chép'}
            </Button>
          ) : <div />}
          
          <Button
            type="primary"
            icon={scope === 'single' ? <DownloadOutlined /> : <FileZipOutlined />}
            onClick={handleDownload}
            loading={isExporting}
          >
            {scope === 'single'
              ? 'Tải file .md'
              : scope === 'session'
              ? `Tải Session .zip (${sessionExerciseCount} bài)`
              : `Tải Kho đề bài .zip (${totalAllExercises} bài)`}
          </Button>
        </div>
      ]}
      width={500}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          { key: 'options', label: 'Tùy chọn xuất', children: optionsContent },
          ...(scope === 'single' ? [{ key: 'preview', label: 'Xem trước Markdown', children: previewContent }] : [])
        ]}
      />
    </Modal>
  );
};
