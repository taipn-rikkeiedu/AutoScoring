import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { BugOutlined, CopyOutlined } from '@ant-design/icons';
import { logger } from '~/src/core/logger';
import { diagnoseQldt } from '~/src/services/lms/qldtDiagnostics';
import { useClipboard } from '~/src/hooks/common/useClipboard';

/** Chạy chẩn đoán kết nối QLĐT, hiện kết quả để sao chép gửi hỗ trợ. */
export const QldtDiagnoseButton: React.FC<{ size?: 'small' | 'middle' }> = ({ size = 'small' }) => {
  const copy = useClipboard();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    try {
      const text = await diagnoseQldt();
      setReport(text);
      logger.info('QLDT', 'Chẩn đoán kết nối QLĐT', text);
    } catch (e: any) {
      setReport('Chẩn đoán lỗi: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button size={size} icon={<BugOutlined />} loading={running} onClick={run}>Chẩn đoán</Button>
      <Modal
        open={report != null}
        onCancel={() => setReport(null)}
        title="Chẩn đoán kết nối QLĐT"
        width={640}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={() => copy(report || '', 'Đã sao chép kết quả chẩn đoán.')}>Sao chép</Button>
        ]}
      >
        <pre style={{ maxHeight: 420, overflow: 'auto', background: '#f6f8fa', padding: 10, borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap', margin: 0 }}>{report}</pre>
      </Modal>
    </>
  );
};
