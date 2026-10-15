import React, { useState, useMemo } from 'react';
import { useMiniProjectGrader } from '~/src/hooks/auto-grader/useMiniProjectGrader';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { Submission } from '~/src/types';
import { DEFAULT_CRITERIA, extractComment } from '~/src/core/utils';
import { Table, Button, Tag, Dropdown, Card, Select, Progress, Space, Typography, Tooltip, Empty } from 'antd';
import type { TableColumnsType, TableProps, MenuProps } from 'antd';
import {
  SyncOutlined,
  CopyOutlined,
  FileTextOutlined,
  TableOutlined,
  EyeOutlined,
  StarOutlined,
  GithubOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

export const MiniProjectTab: React.FC = () => {
  const {
    submissions,
    setSubmissions,
    syncDetectedSubmissions,
    updateContentScriptCache,
    isScanning,
    scanStatus,
    expandedRows,
    isBulkGrading,
    bulkProgress,
    bulkProgressText,
    exerciseTemplates,
    aiStatus,
    handleRescan,
    toggleRowExpansion,
    handleGradeSingleRow,
    handleBulkGrading,
    handleCancelBulkGrading,
    handleCopySingleSubmission,
    handleCopyReport
  } = useMiniProjectGrader();

  const [globalTemplateVal, setGlobalTemplateVal] = useState<string>('');
  const [copiedScoreIndex, setCopiedScoreIndex] = useState<number | null>(null);

  React.useEffect(() => {
    if (!globalTemplateVal && submissions.length > 0) {
      const firstWithTemplate = submissions.find(s => s.matchedTemplate);
      if (firstWithTemplate?.matchedTemplate) {
        const mt = firstWithTemplate.matchedTemplate;
        setGlobalTemplateVal(`${mt.chapter}||${mt.session}||${mt.assignmentName}`);
      }
    }
  }, [submissions, globalTemplateVal]);

  const handleGlobalTemplateChange = (val: string) => {
    setGlobalTemplateVal(val);
    const updated = submissions.map(s => {
      let matchedTemplate = undefined;
      if (val) {
        const parts = val.split('||');
        matchedTemplate = { chapter: parts[0], session: parts[1], assignmentName: parts[2], isManual: true };
      }
      return { ...s, matchedTemplate };
    });
    setSubmissions(updated);
    syncDetectedSubmissions(updated);
    updateContentScriptCache(updated);
  };

  const selectedRowKeys = useMemo(() => {
    return submissions.map((sub, idx) => sub.checked ? idx : -1).filter(idx => idx !== -1);
  }, [submissions]);

  const checkedCount = selectedRowKeys.length;
  const gradeableCount = submissions.filter(s => s.checked && s.matchedTemplate).length;

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    const updated = submissions.map((sub, idx) => ({
      ...sub,
      checked: newSelectedRowKeys.includes(idx)
    }));
    setSubmissions(updated);
    syncDetectedSubmissions(updated);
    updateContentScriptCache(updated);
  };

  const rowSelection: TableProps<Submission>['rowSelection'] = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const { gradingScale, setGradingScale, strictnessLevel, setStrictnessLevel } = useSettings();

  const handleCopyScoreComment = (sub: Submission, index: number) => {
    let textToCopy = (sub.report || '').replace(/<score>[\s\S]*?<\/score>/gi, '').trim();
    if (sub.score && !textToCopy.toLowerCase().includes('tổng điểm')) {
      const comment = extractComment(sub.report || '') || textToCopy;
      textToCopy = `${comment}\n\nTổng điểm: ${sub.score}/${gradingScale}`;
    }

    if (!textToCopy) {
      (window as any).showToast?.("Không có nội dung nhận xét để sao chép.", "warning");
      return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedScoreIndex(index);
      setTimeout(() => setCopiedScoreIndex(null), 1500);
      (window as any).showToast?.(`Đã sao chép nhận xét & điểm (${sub.score || '--'}/${gradingScale})!`, "success");
    }).catch(err => {
      (window as any).showToast?.("Không thể sao chép.", "error");
    });
  };

  const templateOptions = useMemo(() => {
    const options: { value: string; label: string; group?: string }[] = [];
    for (const chapter in exerciseTemplates) {
      for (const session in exerciseTemplates[chapter]) {
        for (const name in exerciseTemplates[chapter][session]) {
          const searchStr = `${session} ${name}`.toLowerCase();
          if (searchStr.includes('mini') || searchStr.includes('project') || searchStr.includes('hackathon')) {
            options.push({
              value: `${chapter}||${session}||${name}`,
              label: `${session} - ${name}`,
              group: chapter
            });
          }
        }
      }
    }
    return options;
  }, [exerciseTemplates]);

  const getStatusBadge = (sub: Submission, index: number) => {
    if (sub.status === 'downloading') return <Tag color="blue">Đang tải code...</Tag>;
    if (sub.status === 'grading') return <Tag color="orange" icon={<SyncOutlined spin />}>Đang chấm...</Tag>;
    if (sub.status === 'success') {
      const isCopied = copiedScoreIndex === index;
      const scoreNum = parseFloat(sub.score || '0');
      const isHigh = scoreNum / (parseFloat(gradingScale) || 10) >= 0.8;
      return (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            style={{ 
              backgroundColor: isCopied ? '#52c41a' : (isHigh ? '#52c41a' : '#faad14'),
              borderColor: isCopied ? '#52c41a' : (isHigh ? '#52c41a' : '#faad14'),
              borderRadius: '20px',
              fontWeight: 'bold',
              minWidth: '60px'
            }}
            onClick={(e) => { e.stopPropagation(); handleCopyScoreComment(sub, index); }}
            title="Nhấp 1-click: Sao chép ngay nhận xét vào bộ nhớ tạm"
          >
            {isCopied ? "Đã chép" : `${sub.score || '--'} / ${gradingScale}`}
          </Button>
          <Tooltip title="Xem báo cáo">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                (window as any).showReportModal?.({
                  title: `Báo cáo: ${sub.studentName} - ${sub.exerciseName}`,
                  score: sub.score,
                  report: sub.report || "",
                  language: sub.language,
                  astMetrics: sub.astMetrics,
                  imagesAttached: sub.imagesAttached,
                  imagesSkipped: sub.imagesSkipped
                });
              }}
            />
          </Tooltip>
        </Space>
      );
    }
    if (sub.status === 'error') {
      return (
        <Tag color="error" style={{ cursor: 'pointer' }} onClick={(e) => {
          e.stopPropagation();
          (window as any).showToast?.((sub as any).error || 'Lỗi chấm bài.', 'error');
        }}>
          Lỗi
        </Tag>
      );
    }
    return <Tag color="default">Chờ chấm</Tag>;
  };

  const columns: TableColumnsType<Submission> = [
    {
      title: 'Bài tập trên trang',
      dataIndex: 'exerciseName',
      key: 'exerciseName',
      render: (_, sub, index) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text strong style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => toggleRowExpansion(index)}>
              {sub.studentName || sub.exerciseName}
            </Text>
            {sub.studentName && <Text type="secondary" style={{ fontSize: 12 }}>{sub.exerciseName}</Text>}
            <Space size={4}>
              <GithubOutlined style={{ color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }} ellipsis={{ tooltip: sub.githubUrl }}>
                {sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
              </Text>
            </Space>
          </div>
          <Tooltip title="Sao chép tên đề & link GitHub">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                handleCopySingleSubmission(sub);
              }}
            />
          </Tooltip>
        </div>
      )
    },
    {
      title: 'Đề bài liên kết',
      key: 'template',
      width: 250,
      render: (_, sub) => {
        const template = sub.matchedTemplate 
          ? exerciseTemplates?.[sub.matchedTemplate.chapter]?.[sub.matchedTemplate.session]?.[sub.matchedTemplate.assignmentName] 
          : null;
        return (
          <Tag color={template ? 'blue' : 'warning'} style={{ width: '100%', whiteSpace: 'normal' }}>
            {template ? `${sub.matchedTemplate?.session} - ${sub.matchedTemplate?.assignmentName}` : 'Chưa chọn đề chung'}
          </Tag>
        );
      }
    },
    {
      title: 'Điểm số',
      key: 'status',
      align: 'center',
      width: 140,
      render: (_, sub, index) => getStatusBadge(sub, index)
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 120,
      render: (_, sub, index) => (
        <Button 
          type={sub.status === 'success' ? 'default' : 'primary'}
          size="small"
          disabled={sub.status === 'grading' || sub.status === 'downloading'}
          onClick={(e) => {
            e.stopPropagation();
            handleGradeSingleRow(index);
          }}
        >
          {sub.status === 'success' ? 'Chấm lại' : (sub.status === 'grading' || sub.status === 'downloading' ? 'Đang chấm' : 'Chấm bài')}
        </Button>
      )
    }
  ];

  const expandedRowRender = (sub: Submission, index: number) => {
    const template = sub.matchedTemplate 
      ? exerciseTemplates?.[sub.matchedTemplate.chapter]?.[sub.matchedTemplate.session]?.[sub.matchedTemplate.assignmentName] 
      : null;

    return (
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Card size="small" title="Đề bài:" type="inner">
            <Paragraph style={{ fontSize: 12, maxHeight: 100, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {template ? template.assignment : 'Chưa liên kết đề bài.'}
            </Paragraph>
          </Card>
          <Card size="small" title="Tiêu chí chấm (Rubric):" type="inner">
            <Paragraph style={{ fontSize: 12, maxHeight: 100, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {template ? (template.criteria || DEFAULT_CRITERIA) : 'Chưa liên kết đề bài.'}
            </Paragraph>
          </Card>
        </div>

        {sub.status === 'success' && (
          <div style={{ marginTop: 16 }}>
            {sub.fileList && sub.fileList.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Text strong type="secondary" style={{ fontSize: 12 }}>Tệp mã nguồn ({sub.fileList.length}):</Text>
                <div style={{ background: '#fff', border: '1px solid #d9d9d9', padding: 8, maxHeight: 80, overflowY: 'auto', borderRadius: 6, marginTop: 4 }}>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, fontFamily: 'monospace' }}>
                    {sub.fileList.map((file, fIdx) => <li key={fIdx}>{file}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {sub.report && (
              <div>
                <Text strong type="secondary" style={{ fontSize: 12 }}>Nhận xét chi tiết:</Text>
                <div style={{ background: '#fff', border: '1px solid #d9d9d9', padding: 12, maxHeight: 120, overflowY: 'auto', borderRadius: 6, marginTop: 4, fontSize: 12, whiteSpace: 'pre-line' }}>
                  {extractComment(sub.report)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const copyMenuOptions: MenuProps['items'] = [
    {
      key: '1',
      label: 'Danh sách Báo cáo chi tiết',
      icon: <FileTextOutlined />,
      onClick: () => handleCopyReport('detailed')
    },
    {
      key: '2',
      label: 'Link & Tên đề ngắn gọn',
      icon: <CopyOutlined />,
      onClick: () => handleCopyReport('simple')
    },
    {
      key: '3',
      label: 'Bảng Excel / Google Sheets',
      icon: <TableOutlined style={{ color: '#d48806' }}/>,
      onClick: () => handleCopyReport('tsv')
    },
    {
      key: '4',
      label: 'Bảng Markdown Table (.md)',
      icon: <FileTextOutlined style={{ color: '#1890ff' }}/>,
      onClick: () => handleCopyReport('markdown')
    }
  ];

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: scanStatus }));
    return () => window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null }));
  }, [scanStatus]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '16px', overflow: 'hidden' }}>
      




      {/* Main Table Container */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <Table<Submission>
          dataSource={submissions.map((sub, i) => ({ ...sub, key: i }))}
          columns={columns}
          rowSelection={rowSelection}
          loading={isScanning && submissions.length === 0}
          pagination={false}
          size="small"
          sticky
          expandable={{
            expandedRowRender: (record, index) => expandedRowRender(record, index),
            expandedRowKeys: Object.keys(expandedRows).map(Number).filter(k => expandedRows[k]),
            onExpand: (_, record) => toggleRowExpansion((record as any).key)
          }}
          locale={{
            emptyText: <Empty description="Không tìm thấy bài tập nào. Chuyển tới trang nộp bài tập học viên trên LMS hoặc bấm Quét lại trang." />
          }}
        />
      </div>

      {/* Progress Bar when Bulk Grading */}
      {isBulkGrading && (
        <Card size="small" style={{ backgroundColor: '#e6f7ff', borderColor: '#91d5ff', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text strong style={{ color: '#0050b3', fontSize: 12 }}>{bulkProgressText}</Text>
            <Button size="small" danger onClick={handleCancelBulkGrading}>Hủy</Button>
          </div>
          <Progress 
            percent={bulkProgress} 
            status={bulkProgressText.includes("Lỗi") ? "exception" : "active"}
            strokeColor={bulkProgress === 100 ? '#52c41a' : '#1890ff'}
          />
        </Card>
      )}

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<SyncOutlined />} onClick={handleRescan} disabled={isScanning || isBulkGrading}>
            Quét lại trang
          </Button>

          {submissions.length > 0 && (
            <Dropdown menu={{ items: copyMenuOptions }} disabled={isScanning || isBulkGrading}>
              <Button icon={<CopyOutlined />}>
                {checkedCount > 0 ? `Sao chép (${checkedCount})` : 'Sao chép báo cáo'}
              </Button>
            </Dropdown>
          )}
        </Space>

        <Space>
          <Select
            showSearch
            placeholder="-- Chọn đề --"
            optionFilterProp="label"
            style={{ width: 200 }}
            value={globalTemplateVal || undefined}
            onChange={handleGlobalTemplateChange}
            status={!globalTemplateVal ? 'warning' : ''}
            options={templateOptions}
          />
          <Select
            value={strictnessLevel}
            onChange={(val) => setStrictnessLevel(val)}
            style={{ width: 110 }}
            options={[
              { value: 'Dễ dãi, bỏ qua lỗi nhỏ', label: '🟢 Chấm dễ' },
              { value: 'Bình thường', label: '🟡 Chuẩn' },
              { value: 'Rất khắt khe, trừ điểm nặng mọi lỗi nhỏ', label: '🔴 Khắt khe' }
            ]}
          />
          <Select
            value={gradingScale}
            onChange={(val) => setGradingScale(val)}
            style={{ width: 110 }}
            options={[
              { value: '10', label: 'Thang 10' },
              { value: '100', label: 'Thang 100' }
            ]}
          />
          {submissions.length > 0 && (
            <Tag color="blue" style={{ marginRight: 8, margin: 0 }}>{checkedCount}/{submissions.length} ĐÃ CHỌN</Tag>
          )}
          <Button 
            type="primary" 
            style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#000', fontWeight: 'bold' }}
            onClick={handleBulkGrading}
            disabled={isBulkGrading || gradeableCount === 0 || aiStatus !== "success"}
            loading={isBulkGrading}
          >
            {isBulkGrading ? "Đang chấm..." : `Chấm ${gradeableCount} bài đã chọn`}
          </Button>
        </Space>
      </div>
    </div>
  );
};
