import React from 'react';
import { useLearningStatsManager } from '~/src/hooks/learning-stats/useLearningStatsManager';
import { LearningStatRow, ExamCell, LEARNING_STATS_RISK_PERCENT } from '~/src/core/learningStats';
import { fmtScore } from '~/src/core/examAnalysis';
import { Table, Button, Select, Input, Tag, Card, Typography, Empty, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { CloudDownloadOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const DANGER = '#cf1322';
const EXAM_FAIL_BELOW = 50;
/** Ô vi phạm: nghỉ học / thiếu bài tập từ 10%, chậm e-learning từ 1 bài → tô nền đỏ. */
const HIGHLIGHT_PERCENT_FROM = 10;
const HIGHLIGHT_CELL: React.CSSProperties = { background: '#ffccc7' };
const HIGHLIGHT_TEXT: React.CSSProperties = { color: '#a8071a', fontWeight: 600 };
const isHighPercent = (v: number | null) => v != null && v >= HIGHLIGHT_PERCENT_FROM;
const isUnprepared = (v: number | null) => v != null && v >= 1;
const highlightCell = (on: boolean) => ({ style: on ? HIGHLIGHT_CELL : undefined });

const lastName = (name: string) => name.trim().split(/\s+/).pop() || '';
const examValue = (v: ExamCell) => (typeof v === 'number' ? v : -1);

const Percent: React.FC<{ value: number | null }> = ({ value }) => (
  <Text style={{ fontSize: 12, ...(isHighPercent(value) ? HIGHLIGHT_TEXT : {}) }}>
    {value == null ? '—' : `${fmtScore(value)}%`}
  </Text>
);

const Exam: React.FC<{ value: ExamCell }> = ({ value }) => {
  if (value === 'absent') return <Text type="secondary" style={{ fontSize: 12 }}>Vắng</Text>;
  return <Text style={{ fontSize: 12, color: value != null && value < EXAM_FAIL_BELOW ? DANGER : undefined }}>{fmtScore(value)}</Text>;
};

const examColumn = (key: 'hkTN' | 'hkTL' | 'ckTN' | 'ckTL', title: string, tip: string) => ({
  title: <Tooltip title={tip}>{title}</Tooltip>, key, width: 70, align: 'right' as const,
  sorter: (x: LearningStatRow, y: LearningStatRow) => examValue(x[key]) - examValue(y[key]),
  render: (_: unknown, r: LearningStatRow) => <Exam value={r[key]} />
});

export const LearningStatsTab: React.FC = () => {
  const s = useLearningStatsManager();

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: s.statusText }));
    return () => { window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null })); };
  }, [s.statusText]);

  const columns: TableColumnsType<LearningStatRow> = [
    { title: 'STT', dataIndex: 'no', key: 'no', width: 50, sorter: (x, y) => x.no - y.no },
    {
      title: 'Học viên', key: 'name',
      sorter: (x, y) => lastName(x.name).localeCompare(lastName(y.name), 'vi') || x.name.localeCompare(y.name, 'vi'),
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text strong style={{ fontSize: 12 }}>
            {r.name}
            {r.studentStatus && r.studentStatus !== 'ĐANG HỌC' && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>{r.studentStatus}</Tag>}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
        </div>
      )
    },
    {
      title: 'Nghỉ học', key: 'absentRate', width: 80, align: 'right',
      sorter: (x, y) => (x.absentRate ?? -1) - (y.absentRate ?? -1),
      onCell: (r) => highlightCell(isHighPercent(r.absentRate)),
      render: (_, r) => <Percent value={r.absentRate} />
    },
    {
      title: 'Thiếu BT', key: 'missingHomework', width: 80, align: 'right',
      sorter: (x, y) => (x.missingHomework ?? -1) - (y.missingHomework ?? -1),
      onCell: (r) => highlightCell(isHighPercent(r.missingHomework)),
      render: (_, r) => <Percent value={r.missingHomework} />
    },
    {
      title: <Tooltip title="Số bài e-learning chậm tiến độ (vi phạm không chuẩn bị bài)">Chậm E-learning</Tooltip>,
      key: 'unprepared', width: 90, align: 'right',
      sorter: (x, y) => (x.unprepared ?? -1) - (y.unprepared ?? -1),
      onCell: (r) => highlightCell(isUnprepared(r.unprepared)),
      render: (_, r) => <Text style={{ fontSize: 12, ...(isUnprepared(r.unprepared) ? HIGHLIGHT_TEXT : {}) }}>{r.unprepared ?? '—'}</Text>
    },
    examColumn('hkTN', 'HK TN', 'Hackathon — trắc nghiệm'),
    examColumn('hkTL', 'HK TL', 'Hackathon — tự luận'),
    examColumn('ckTN', 'CK TN', 'Thi cuối môn — trắc nghiệm'),
    examColumn('ckTL', 'CK TL', 'Thi cuối môn — tự luận'),
    {
      title: 'R-Points', key: 'rpoints', width: 80, align: 'right',
      sorter: (x, y) => (x.rpoints ?? -1) - (y.rpoints ?? -1),
      render: (_, r) => r.rpoints == null ? <Text type="secondary" style={{ fontSize: 12 }}>Chưa có</Text> : <Text style={{ fontSize: 12 }}>{fmtScore(r.rpoints)}</Text>
    }
  ];

  const summary = s.data?.summary;
  const pct = (n: number) => (summary?.total ? `${((n / summary.total) * 100).toFixed(2)}%` : '—');
  const cards = summary ? [
    { label: `Nghỉ học trên ${LEARNING_STATS_RISK_PERCENT}%`, value: summary.absentOver10 },
    { label: `Thiếu bài tập trên ${LEARNING_STATS_RISK_PERCENT}%`, value: summary.homeworkOver10 },
    { label: 'Vi phạm không chuẩn bị bài', value: summary.unprepared }
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '12px', overflow: 'hidden' }}>
      {/* Chọn lớp / môn */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          style={{ flex: 1, minWidth: 0 }}
          placeholder="Chọn lớp"
          options={s.classes}
          value={s.classId || undefined}
          onChange={s.handleClassChange}
          showSearch
          optionFilterProp="label"
          disabled={s.isLoading}
        />
        <Select
          style={{ flex: 1, minWidth: 0 }}
          placeholder={s.classId ? 'Chọn môn học' : 'Chọn lớp trước'}
          options={s.courses}
          value={s.courseId || undefined}
          onChange={s.handleCourseChange}
          showSearch
          optionFilterProp="label"
          disabled={s.isLoading || !s.classId}
        />
        <Tooltip title="Tải lại danh sách lớp">
          <Button icon={<ReloadOutlined />} onClick={s.reloadClasses} disabled={s.isLoading} />
        </Tooltip>
      </div>

      {/* Tóm tắt */}
      {summary && (
        <div style={{ display: 'flex', gap: 8 }}>
          {cards.map(c => (
            <Card key={c.label} size="small" style={{ flex: 1 }} styles={{ body: { padding: '6px 12px' } }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>{c.label}</div>
              <div>
                <Text strong style={{ fontSize: 16, color: c.value > 0 ? DANGER : '#389e0d' }}>{pct(c.value)}</Text>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{c.value}/{summary.total} SV</Text>
              </div>
            </Card>
          ))}
        </div>
      )}

      {s.data && (
        <Input.Search
          size="small"
          placeholder="Tìm tên / email / MSSV"
          allowClear
          value={s.filterText}
          onChange={(e) => s.setFilterText(e.target.value)}
        />
      )}

      {/* Bảng */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <Table<LearningStatRow>
          rowKey="key"
          dataSource={s.displayedRows}
          columns={columns}
          pagination={false}
          size="small"
          sticky
          scroll={{ x: 'max-content' }}
          showSorterTooltip={false}
          loading={s.isLoading}
          locale={{
            emptyText: <Empty description={s.data
              ? 'Không có học viên nào khớp bộ lọc.'
              : 'Chọn lớp và môn học rồi bấm "Tải dữ liệu". Cần đăng nhập QLĐT ít nhất một lần.'} />
          }}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button icon={<DownloadOutlined />} onClick={s.handleExport} disabled={!s.displayedRows.length}>
          Xuất Excel
        </Button>
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          onClick={s.handleLoad}
          loading={s.isLoading}
          disabled={!s.classId || !s.courseId}
        >
          Tải dữ liệu
        </Button>
      </div>
    </div>
  );
};
