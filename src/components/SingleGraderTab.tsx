import React, { useState } from 'react';
import { useApp } from '~/src/core/AppContext';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useSingleGrader } from '~/src/hooks/single-grader/useSingleGrader';
import { AstMetricsPanel } from '~/src/components/AstMetricsPanel';
import { Select, Input, Button, Card, Typography, Spin, Alert, Tag, Collapse, Space } from 'antd';
import { CopyOutlined, CheckOutlined, UserOutlined, FolderOpenOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

export const SingleGraderTab: React.FC = () => {
  const {
    activeStudent,
    repoUrl,
    setRepoUrl,
    selectedChapter,
    setSelectedChapter,
    selectedSession,
    setSelectedSession,
    selectedAssignment,
    setSelectedAssignment,
    detectedSubIndex,
    isGrading,
    statusMessage,
    results,
    isFileTreeExpanded,
    setIsFileTreeExpanded,
    detectedSubmissions,
    chapters,
    sessions,
    assignments,
    aiStatus,
    handleDetectedSubmissionChange,
    handleGradeSingle,
    handleCopyReport
  } = useSingleGrader();

  const [isCopied, setIsCopied] = useState(false);

  const onCopy = () => {
    handleCopyReport();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const parsedMarkdown = results?.report ? DOMPurify.sanitize(marked.parse(results.report) as string) : '';
  const { config } = useApp();
  const gradingScale = config.gradingScale || '10';
  const numericScore = results ? parseFloat(results.score) : NaN;
  let badgeColor = 'error';
  if (!isNaN(numericScore)) {
    const ratio = numericScore / (parseFloat(gradingScale) || 10);
    if (ratio >= 0.8) badgeColor = 'success';
    else if (ratio >= 0.5) badgeColor = 'warning';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 16, gap: 16, overflowY: 'auto' }}>
      {activeStudent && (
        <Alert
          message={
            <span>
              👤 Đang chấm cho: <Text strong>{activeStudent.studentName} ({activeStudent.studentId})</Text>
            </span>
          }
          type="info"
          showIcon={false}
          style={{ backgroundColor: '#e6f4ff', borderColor: '#91caff', borderLeft: '4px solid #fadb14' }}
        />
      )}

      {detectedSubmissions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text strong style={{ fontSize: 12.5, color: '#64748b' }}>Bài nộp phát hiện trên trang:</Text>
          <Select
            value={detectedSubIndex}
            onChange={(val) => handleDetectedSubmissionChange({ target: { value: val } } as any)}
            placeholder="-- Chọn bài nộp phát hiện trên trang --"
            style={{ width: '100%' }}
            options={[
              { value: '', label: '-- Chọn bài nộp phát hiện trên trang --' },
              ...detectedSubmissions.map((sub, idx) => ({
                value: String(idx),
                label: `${sub.exerciseName} (${sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")})`
              }))
            ]}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Text strong style={{ fontSize: 12.5, color: '#64748b' }}>GitHub Repository URL:</Text>
        <Input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/repository"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text strong style={{ fontSize: 12.5, color: '#64748b' }}>Chọn Chương:</Text>
          <Select
            value={selectedChapter}
            onChange={setSelectedChapter}
            placeholder="-- Chọn Chương --"
            options={[
              { value: '', label: '-- Chọn Chương --' },
              ...chapters.map(c => ({ value: c, label: c }))
            ]}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text strong style={{ fontSize: 12.5, color: '#64748b' }}>Chọn Session:</Text>
            <Select
              value={selectedSession}
              onChange={setSelectedSession}
              disabled={!selectedChapter}
              placeholder="-- Chọn --"
              options={[
                { value: '', label: '-- Chọn --' },
                ...sessions.map(s => ({ value: s, label: s }))
              ]}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text strong style={{ fontSize: 12.5, color: '#64748b' }}>Chọn Bài tập:</Text>
            <Select
              value={selectedAssignment}
              onChange={setSelectedAssignment}
              disabled={!selectedSession}
              placeholder="-- Chọn --"
              options={[
                { value: '', label: '-- Chọn --' },
                ...assignments.map(a => ({ value: a, label: a }))
              ]}
            />
          </div>
        </div>
      </div>

      <Button
        type="primary"
        onClick={handleGradeSingle}
        disabled={isGrading || aiStatus !== "success"}
        loading={isGrading}
        block
        style={{
          backgroundColor: (isGrading || aiStatus !== "success") ? undefined : '#fbbf24',
          color: (isGrading || aiStatus !== "success") ? undefined : '#020617',
          fontWeight: 'bold',
          borderColor: 'transparent'
        }}
      >
        {isGrading ? "Đang chấm..." : "🚀 Bắt đầu Chấm điểm"}
      </Button>

      {isGrading && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert message={statusMessage} type="info" showIcon icon={<Spin size="small" />} />
          <Card loading={true} />
        </Space>
      )}

      {results && (
        <Card size="small" title="Kết Quả Đánh Giá" extra={
          <Space>
            <Button
              size="small"
              icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={onCopy}
              type={isCopied ? "dashed" : "default"}
              style={{ color: isCopied ? '#52c41a' : undefined, borderColor: isCopied ? '#52c41a' : undefined }}
            >
              {isCopied ? "Đã sao chép" : "Sao chép"}
            </Button>
            <Tag color={badgeColor} style={{ margin: 0, fontWeight: 'bold' }}>
              {results.score} / {gradingScale}
            </Tag>
          </Space>
        }>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {results.fileList && results.fileList.length > 0 && (
              <Collapse
                size="small"
                activeKey={isFileTreeExpanded ? ['1'] : []}
                onChange={() => setIsFileTreeExpanded(!isFileTreeExpanded)}
                items={[{
                  key: '1',
                  label: <Text strong type="secondary" style={{ fontSize: 12 }}><FolderOpenOutlined /> Xem tệp đã chấm ({results.fileList.length} file)</Text>,
                  children: (
                    <ul style={{ maxHeight: 140, overflowY: 'auto', paddingLeft: 16, margin: 0, listStyle: 'none', fontSize: 12, fontFamily: 'monospace' }}>
                      {results.fileList.map((file, idx) => <li key={idx}>📄 {file}</li>)}
                    </ul>
                  )
                }]}
              />
            )}

            <AstMetricsPanel language={results.language} metrics={results.astMetrics} />

            {(!!results.imagesAttached || !!results.imagesSkipped) && (
              <Space direction="vertical" size={2}>
                {!!results.imagesAttached && (
                  <Text type="secondary" style={{ fontSize: 12, color: '#0369a1' }}>📎 Đã gửi kèm {results.imagesAttached} ảnh sơ đồ cho AI</Text>
                )}
                {!!results.imagesSkipped && (
                  <Text type="warning" style={{ fontSize: 12, color: '#b45309' }}>⚠️ Bỏ qua {results.imagesSkipped} ảnh (định dạng không hỗ trợ hoặc vượt giới hạn dung lượng)</Text>
                )}
              </Space>
            )}

            <div
              className="prose prose-sm max-w-none"
              style={{ fontSize: 12 }}
              dangerouslySetInnerHTML={{ __html: parsedMarkdown }}
            />
          </Space>
        </Card>
      )}
    </div>
  );
};
