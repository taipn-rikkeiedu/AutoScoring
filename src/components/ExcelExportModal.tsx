import React, { useEffect } from 'react';
import { Student } from '~/src/types';
import { useExcelExporter, FIELDS, StatusFilter } from '~/src/hooks/class-management/useExcelExporter';
import { Modal, Checkbox, Radio, Button, Space, Typography, Row, Col, Badge } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: string; color: string }[] = [
  { value: 'all',          label: 'Tất cả học viên',   icon: '👥', color: 'default' },
  { value: 'completed',    label: 'Hoàn thành',        icon: '✅', color: 'success'  },
  { value: 'notCompleted', label: 'Chưa hoàn thành',   icon: '❌', color: 'error'    },
  { value: 'pending',      label: 'Chờ kiểm tra',      icon: '⏳', color: 'warning'  },
  { value: 'notSubmitted', label: 'Không nộp bài (0)', icon: '⚠️', color: 'error'    },
];

interface Props {
  students: Student[];
  onClose: () => void;
  onExport: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const ExcelExportModal: React.FC<Props> = ({ students, onClose, onExport }) => {
  const {
    selectedFields,
    statusFilter,
    setStatusFilter,
    isExporting,
    toggleField,
    selectAll,
    selectNone,
    filteredStudents,
    activeFieldCount,
    countFor,
    handleCopyToClipboard,
    handleExportExcel
  } = useExcelExporter(students, onExport, onClose);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Modal
      title="Xuất Báo Cáo Excel"
      open={true}
      onCancel={onClose}
      footer={[
        <div key="footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Text strong>{filteredStudents.length}</Text> học viên
          </Text>
          <Space>
            <Button onClick={onClose}>Hủy</Button>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyToClipboard}
              disabled={activeFieldCount === 0 || filteredStudents.length === 0}
            >
              Sao chép
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
              loading={isExporting}
              disabled={activeFieldCount === 0 || filteredStudents.length === 0}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Xuất Excel
            </Button>
          </Space>
        </div>
      ]}
      width={480}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        {/* Fields Selection */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 12 }}>CHỌN TRƯỜNG XUẤT</Text>
            <Space size="small">
              <Button type="link" size="small" onClick={selectAll} style={{ fontSize: 12, padding: 0 }}>Chọn tất cả</Button>
              <Button type="link" size="small" onClick={selectNone} style={{ fontSize: 12, padding: 0, color: '#8c8c8c' }}>Bỏ chọn</Button>
            </Space>
          </div>
          <Row gutter={[8, 8]}>
            {FIELDS.map(f => (
              <Col span={12} key={f.key}>
                <div 
                  style={{ 
                    border: '1px solid', 
                    borderColor: selectedFields[f.key] ? '#b7eb8f' : '#d9d9d9',
                    backgroundColor: selectedFields[f.key] ? '#f6ffed' : '#fafafa',
                    padding: '4px 8px',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleField(f.key)}
                >
                  <Checkbox checked={!!selectedFields[f.key]} style={{ fontSize: 12 }}>
                    {f.label}
                  </Checkbox>
                </div>
              </Col>
            ))}
          </Row>
        </div>

        {/* Filters */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>LỌC THEO TRẠNG THÁI</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STATUS_FILTERS.map(sf => {
              const count = countFor(sf.value);
              const isActive = statusFilter === sf.value;
              return (
                <div 
                  key={sf.value}
                  style={{ 
                    border: '1px solid', 
                    borderColor: isActive ? '#91caff' : '#d9d9d9',
                    backgroundColor: isActive ? '#e6f7ff' : '#fff',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onClick={() => setStatusFilter(sf.value)}
                >
                  <Radio checked={isActive} />
                  <span>{sf.icon}</span>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{sf.label}</Text>
                  <Badge 
                    count={count} 
                    showZero 
                    style={{ backgroundColor: isActive ? '#1677ff' : '#d9d9d9', color: isActive ? '#fff' : '#595959' }} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
