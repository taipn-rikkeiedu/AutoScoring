import React, { useMemo, useState } from 'react';
import { Input, Card, Flex, Typography, Empty, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { plainText } from '~/src/core/examAnalysis';
import { MonitorRow, fmtDate } from '~/src/core/studentMonitor';
import { StudentMonitorDrawer, RiskTag } from '~/src/components/StudentMonitorDrawer';
import { IssueTags, Monitor } from '~/src/components/StudentMonitorTab';

const { Text } = Typography;

const MAX_RESULTS = 50;
const digits = (s: string) => s.replace(/\D/g, '');

/** Khớp tên (không dấu), MSSV, email, hoặc SĐT (chỉ so phần chữ số, bỏ khoảng trắng / dấu chấm). */
function matches(r: MonitorRow, q: string, qDigits: string): boolean {
  if (plainText(r.name).includes(q) || plainText(r.code).includes(q) || plainText(r.email).includes(q)) return true;
  return qDigits.length >= 3 && digits(r.phone).includes(qDigits);
}

/**
 * Tra cứu sinh viên trong các lớp đã tải ở Giám sát học tập.
 * Mỗi kết quả hiện ngay thông tin liên hệ + tình hình học tập; bấm để mở chi tiết đầy đủ.
 */
export const StudentLookupTab: React.FC<{ m: Monitor; onGoMonitor: () => void }> = ({ m, onGoMonitor }) => {
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = plainText(query);
    if (!q) return [];
    return m.rows.filter(r => matches(r, q, digits(query))).slice(0, MAX_RESULTS);
  }, [m.rows, query]);

  const classCount = new Set(m.rows.map(r => r.classLabel)).size;
  const selectedIndex = selectedKey ? results.findIndex(r => r.key === selectedKey) : -1;

  if (!m.rows.length) {
    return (
      <Flex vertical align="center" justify="center" style={{ height: '100%', padding: 16 }}>
        <Empty description="Chưa có dữ liệu sinh viên. Tra cứu tìm trong các lớp đã tải ở Giám sát học tập.">
          <Button type="primary" onClick={onGoMonitor}>Sang Giám sát học tập để tải lớp</Button>
        </Empty>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={12} style={{ height: '100%', padding: 16, overflow: 'hidden' }}>
      <Input
        size="large"
        allowClear
        autoFocus
        prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
        placeholder="Nhập tên, MSSV, email hoặc số điện thoại"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedKey(null); }}
      />
      <Text type="secondary">
        {query.trim()
          ? `${results.length}${results.length === MAX_RESULTS ? '+' : ''} kết quả`
          : `Tìm trong ${m.rows.length} sinh viên của ${classCount} lớp đã tải (${m.courseName || 'môn đang chọn'}).`}
      </Text>

      <Flex vertical gap={8} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {query.trim() && !results.length && <Empty description="Không tìm thấy sinh viên phù hợp." />}
        {results.map(r => (
          <Card
            key={r.key}
            size="small"
            hoverable
            onClick={() => setSelectedKey(r.key)}
            style={{ borderColor: r.key === selectedKey ? '#1677ff' : undefined }}
          >
            <Flex justify="space-between" align="center" gap={8}>
              <Text strong>{r.name}</Text>
              <RiskTag row={r} />
            </Flex>
            <Flex wrap gap="4px 16px" style={{ margin: '4px 0' }} onClick={(e) => e.stopPropagation()}>
              <Text type="secondary">{r.classLabel}</Text>
              <Text copyable>{r.code}</Text>
              {r.email && <Text copyable>{r.email}</Text>}
              {r.phone && <Text copyable>{r.phone}</Text>}
              {r.dateOfBirth && <Text type="secondary">Sinh {fmtDate(r.dateOfBirth)}</Text>}
            </Flex>
            {(r.issues.length > 0 || r.early.length > 0 || r.suspect) && <IssueTags row={r} />}
          </Card>
        ))}
      </Flex>

      <StudentMonitorDrawer
        row={selectedIndex >= 0 ? results[selectedIndex] : null}
        index={selectedIndex}
        total={results.length}
        testCols={m.testCols}
        m={m}
        onPrev={() => { const r = results[selectedIndex - 1]; if (r) setSelectedKey(r.key); }}
        onNext={() => { const r = results[selectedIndex + 1]; if (r) setSelectedKey(r.key); }}
        onClose={() => setSelectedKey(null)}
      />
    </Flex>
  );
};
