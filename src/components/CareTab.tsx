import React from 'react';
import { useTakeCare } from '~/src/hooks/take-care/useTakeCare';
import { CareStudent } from '~/src/types';
import { Table, Button, Alert, Space, Input, Tag, Avatar, Typography, Empty } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  SyncOutlined,
  DeleteOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export const CareTab: React.FC = () => {
  const {
    isScanning,
    statusText,
    statusType,
    careStudents,
    handleScanCare,
    handleSaveNote,
    handleClearList,
    handleExportExcel,
    handleCopyReport
  } = useTakeCare();

  const columns: TableColumnsType<CareStudent> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_, __, index) => <Text type="secondary" style={{ fontSize: 12 }}>{index + 1}</Text>
    },
    {
      title: 'Ghi chú chăm sóc',
      key: 'note',
      render: (_, st) => (
        <Input
          defaultValue={st.note || ""}
          onBlur={(e) => handleSaveNote(st.studentId, st.subjectName, st.studyDate, e.target.value.trim())}
          onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
          placeholder="Nhập ghi chú liên hệ..."
          size="small"
          style={{ minWidth: 200, fontSize: 12 }}
        />
      )
    },
    {
      title: 'Mã SV',
      dataIndex: 'studentId',
      key: 'studentId',
      width: 100,
      render: (text) => <Text strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</Text>
    },
    {
      title: 'Họ và Tên',
      key: 'studentName',
      width: 180,
      render: (_, st) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar size="small" style={{ backgroundColor: '#f0f2f5', color: '#595959', border: '1px solid #d9d9d9' }}>
            {st.studentName ? st.studentName.charAt(0).toUpperCase() : '?'}
          </Avatar>
          <Text strong style={{ fontSize: 12 }}>{st.studentName}</Text>
        </div>
      )
    },
    {
      title: 'Môn học',
      dataIndex: 'subjectName',
      key: 'subjectName',
      width: 150,
      render: (text) => <Tag color="blue">{text || "-"}</Tag>
    },
    {
      title: 'Ngày học',
      dataIndex: 'studyDate',
      key: 'studyDate',
      width: 110,
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text || "-"}</Text>
    }
  ];

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: statusText }));
    return () => window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null }));
  }, [statusText]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '16px', overflow: 'hidden' }}>
      


      {/* Table Container */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <Table<CareStudent>
          dataSource={careStudents.map(st => ({ ...st, key: `${st.studentId}_${st.subjectName}_${st.studyDate}` }))}
          columns={columns}
          pagination={false}
          size="small"
          sticky
          locale={{
            emptyText: <Empty description="Chưa có dữ liệu chăm sóc. Mở trang Chăm sóc học viên trên LMS (/class/*/take-care) và bấm 'Quét dữ liệu'." />
          }}
        />
      </div>

      {/* Footer Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button 
          danger 
          icon={<DeleteOutlined />} 
          onClick={handleClearList}
        >
          Xóa danh sách
        </Button>
        <Space>
          <Button 
            icon={<SyncOutlined />} 
            onClick={handleScanCare} 
            disabled={isScanning}
          >
            Quét dữ liệu
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExportExcel} 
            disabled={careStudents.length === 0}
          >
            Xuất Excel
          </Button>
        </Space>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
        <Button onClick={handleCopyReport} disabled={careStudents.length === 0} icon={<CopyOutlined />}>Sao chép</Button>
      </div>
    </div>
  );
};
