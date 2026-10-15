import React from 'react';
import { useClassManager } from '~/src/hooks/class-management/useClassManager';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { Student } from '~/src/types';
import { ExcelExportModal } from '~/src/components/ExcelExportModal';
import { Table, Button, Card, Row, Col, Statistic, Tag, Space, Typography, Tooltip, Empty, Avatar } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  DownloadOutlined,
  SyncOutlined,
  DeleteOutlined,
  LinkOutlined
} from '@ant-design/icons';

interface ClassListTabProps {
  setActiveTab: (tab: string) => void;
}

const { Text } = Typography;

export const ClassListTab: React.FC<ClassListTabProps> = ({ setActiveTab }) => {
  const {
    isScanning,
    showExportModal,
    setShowExportModal,
    statusText,
    statusType,
    stats,
    classStudents,
    handleScanClass,
    handleStudentScroll,
    handleClearClass,
    handleOpenExportModal
  } = useClassManager(setActiveTab);

  const { gradingScale } = useSettings();

  const sortedStudents = [...classStudents].sort((a, b) => {
    const statusA = a.lmsStatus?.toUpperCase() || '';
    const statusB = b.lmsStatus?.toUpperCase() || '';
    
    // Priority 1: Chưa nộp, Chưa hoàn thành, Đang chờ / Chờ kiểm tra
    const getPriority = (status: string, submitted: number) => {
      if (submitted === 0 || status.includes('CHƯA NỘP')) return 1;
      if (status.includes('CHƯA HOÀN THÀNH')) return 1;
      if (status.includes('CHỜ KIỂM TRA') || status.includes('ĐANG CHỜ')) return 1;
      return 2;
    };

    const priorityA = getPriority(statusA, a.submittedCount || 0);
    const priorityB = getPriority(statusB, b.submittedCount || 0);

    return priorityA - priorityB;
  });

  const getStudentScoreInfo = (st: Student) => {
    let score = (st as any).score;
    let report = (st as any).comments;
    if (st.submissions) {
      let latestGraded: any = null;
      for (const key in st.submissions) {
        const sub = st.submissions[key];
        if (sub && sub.score !== undefined && sub.score !== null) {
          if (!latestGraded || new Date(sub.gradedAt || 0) > new Date(latestGraded.gradedAt || 0)) latestGraded = sub;
        }
      }
      if (latestGraded) {
        score = latestGraded.score;
        report = latestGraded.report;
      }
    }
    return { score, report };
  };

  const columns: TableColumnsType<Student> = [
    {
      title: 'Mã SV',
      dataIndex: 'studentId',
      key: 'studentId',
      width: 100,
      render: (text, record) => (
        <Text strong style={{ cursor: 'pointer', color: '#1890ff' }} onClick={() => handleStudentScroll(record)}>
          {text}
        </Text>
      )
    },
    {
      title: 'Học viên',
      key: 'studentInfo',
      render: (_, st) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar size="small" style={{ backgroundColor: '#f0f2f5', color: '#595959', border: '1px solid #d9d9d9' }}>
            {st.studentName ? st.studentName.charAt(0).toUpperCase() : '?'}
          </Avatar>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <a 
              href={st.submissionUrl} 
              target="_blank" 
              rel="noreferrer" 
              onClick={(e) => { 
                if (!e.ctrlKey && !e.metaKey) { 
                  e.preventDefault(); 
                  handleStudentScroll(st); 
                } 
              }} 
              style={{ fontWeight: 600, color: '#262626' }}
            >
              {st.studentName}
            </a>
            {st.githubUrl && (
              <a 
                href={st.githubUrl} 
                target="_blank" 
                rel="noreferrer" 
                style={{ fontSize: '11px', color: '#1890ff', fontFamily: 'monospace' }}
              >
                <LinkOutlined style={{ marginRight: 4 }}/>
                {st.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
              </a>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Trạng thái LMS',
      key: 'lmsStatus',
      align: 'center',
      width: 140,
      render: (_, st) => {
        let statusText = st.lmsStatus || 'CHƯA NỘP';
        let isCompleted = statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA');
        let isPending = statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ');
        
        const submitted = st.submittedCount || 0;
        if (submitted === 0) {
          isCompleted = false;
          isPending = false;
          statusText = 'CHƯA NỘP';
        }

        let color = 'default';
        if (isCompleted) color = 'success';
        else if (isPending) color = 'warning';
        else color = 'error';

        return <Tag color={color} style={{ fontWeight: 'bold' }}>{statusText}</Tag>;
      }
    },
    {
      title: 'Tiến độ bài nộp',
      key: 'progress',
      align: 'center',
      width: 140,
      render: (_, st) => {
        const { score, report } = getStudentScoreInfo(st);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Tag color="processing" style={{ margin: 0 }}>
              {st.completedCount || 0} / {st.submittedCount || 0}
            </Tag>
            {score !== null && score !== undefined && (
              <Tooltip title="Nhấp để xem chi tiết báo cáo">
                <Text 
                  strong 
                  style={{ color: '#389e0d', fontSize: '11px', marginTop: '4px', cursor: 'pointer', borderBottom: '1px dashed #389e0d' }}
                  onClick={() => (window as any).showReportModal?.({ title: `Báo cáo: ${st.studentName}`, score, report })}
                >
                  Điểm: {score}/{gradingScale}
                </Text>
              </Tooltip>
            )}
          </div>
        );
      }
    }
  ];

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: statusText }));
    return () => window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null }));
  }, [statusText]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '16px', overflow: 'hidden' }}>
      
      {/* Stats Summary Cards */}
      {statusType === 'success' && stats.total > 0 ? (
        <Row gutter={8}>
          <Col span={6}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <Statistic title="Sĩ số" value={stats.total} valueStyle={{ color: '#262626', fontWeight: 'bold' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', borderBottom: '2px solid #52c41a' }}>
              <Statistic title="Hoàn thành" value={stats.completed} valueStyle={{ color: '#52c41a', fontWeight: 'bold' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', borderBottom: '2px solid #faad14' }}>
              <Statistic title="Chờ kiểm tra" value={stats.pending} valueStyle={{ color: '#faad14', fontWeight: 'bold' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', borderBottom: '2px solid #ff4d4f' }}>
              <Statistic title="Chưa nộp / Lỗi" value={stats.notCompleted} valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }} />
            </Card>
          </Col>
        </Row>
      ) : null}

      {/* Main Student List Table */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <Table<Student>
          dataSource={sortedStudents.map(st => ({ ...st, key: st.studentId }))}
          columns={columns}
          loading={isScanning && classStudents.length === 0}
          pagination={false}
          size="small"
          sticky
          locale={{
            emptyText: <Empty description="Chưa có dữ liệu lớp học. Mở trang danh sách học viên trên LMS và bấm 'Quét danh sách lớp'." />
          }}
        />
      </div>

      {/* Footer Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          danger 
          icon={<DeleteOutlined />} 
          onClick={handleClearClass}
        >
          Xóa danh sách
        </Button>
        <Space>
          <Button 
            icon={<SyncOutlined />} 
            onClick={handleScanClass} 
            disabled={isScanning}
          >
            Quét danh sách
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleOpenExportModal} 
            disabled={classStudents.length === 0}
          >
            Xuất Excel
          </Button>
        </Space>
      </div>

      {showExportModal && (
        <ExcelExportModal 
          students={classStudents} 
          onClose={() => setShowExportModal(false)} 
          onExport={(msg, type) => (window as any).showToast?.(msg, type)} 
        />
      )}
    </div>
  );
};
