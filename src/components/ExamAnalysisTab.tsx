import React, { useState } from 'react';
import {
  Table, Button, Select, Input, InputNumber, Tag, Card, Progress, Segmented, Modal, Drawer, Descriptions,
  Typography, Empty, Alert, Tooltip, Space, Badge, Divider
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  BarChartOutlined, CloudDownloadOutlined, DownloadOutlined, ReloadOutlined, SettingOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useExamAnalysis, AnalysisFilter } from '~/src/hooks/exam-analysis/useExamAnalysis';
import {
  AnalysisRules, FlaggedRow, TestColumn, ANALYSIS_LEVELS, DEFAULT_ANALYSIS_RULES, PHASE_LABELS, fmtScore
} from '~/src/core/examAnalysis';

const { Text } = Typography;
const { TextArea } = Input;

const DISCLAIMER = 'Chênh lệch giữa bài tập và điểm thi chỉ là dấu hiệu cần rà soát (vd vấn đáp lại bài tập), không phải bằng chứng gian lận.';

/** Chỉ tô màu mức cần chú ý; mức bình thường / chưa có điểm hiện chữ xám để bảng đỡ rối. */
const LevelLabel: React.FC<{ row: FlaggedRow }> = ({ row }) => {
  const lv = ANALYSIS_LEVELS[row.level];
  if (row.level === 'high' || row.level === 'medium') return <Tag color={lv.color} style={{ margin: 0 }}>{lv.label}</Tag>;
  return <Text type="secondary" style={{ fontSize: 12 }}>{lv.label}</Text>;
};

const fmtGap = (gap: number | null) => (gap == null ? '—' : `${gap > 0 ? '+' : ''}${fmtScore(gap)}`);
const lastName = (name: string) => name.trim().split(/\s+/).pop() || '';

export const ExamAnalysisTab: React.FC = () => {
  const a = useExamAnalysis();
  const [detail, setDetail] = useState<FlaggedRow | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: a.statusText }));
    return () => { window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null })); };
  }, [a.statusText]);

  const rulesChanged = (Object.keys(DEFAULT_ANALYSIS_RULES) as (keyof AnalysisRules)[])
    .some(k => a.rules[k] !== DEFAULT_ANALYSIS_RULES[k]);

  const columns: TableColumnsType<FlaggedRow> = [
    {
      title: 'Sinh viên', key: 'name',
      sorter: (x, y) => lastName(x.name).localeCompare(lastName(y.name), 'vi') || x.name.localeCompare(y.name, 'vi'),
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text strong style={{ fontSize: 12 }}>{r.watch && <span title="Trong danh sách rà soát">⭐ </span>}{r.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.code} · {r.classLabel}</Text>
        </div>
      )
    },
    {
      title: <Tooltip title="Tỉ lệ nộp BTVN">BTVN</Tooltip>, key: 'hw', width: 80, align: 'right',
      sorter: (x, y) => (x.hw ?? -1) - (y.hw ?? -1),
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.hw == null ? '—' : `${fmtScore(r.hw)}%`}</Text>
    },
    {
      title: <Tooltip title="Điểm thi cuối môn (chưa có thì lấy Hackathon), thang 100">Điểm thi</Tooltip>, key: 'exam', width: 90, align: 'right',
      sorter: (x, y) => (x.exam ?? -1) - (y.exam ?? -1),
      render: (_, r) => <Text style={{ fontSize: 12 }}>{fmtScore(r.exam)}</Text>
    },
    {
      title: <Tooltip title="Tỉ lệ nộp BTVN − điểm thi">Chênh</Tooltip>, key: 'gap', width: 80, align: 'right',
      sorter: (x, y) => (x.gap ?? -999) - (y.gap ?? -999),
      render: (_, r) => <Text style={{ fontSize: 12 }}>{fmtGap(r.gap)}</Text>
    },
    {
      title: <Space size={4}>Mức<Tooltip title={DISCLAIMER}><InfoCircleOutlined style={{ color: '#8c8c8c' }} /></Tooltip></Space>,
      key: 'level', width: 140,
      sorter: (x, y) => ANALYSIS_LEVELS[x.level].order - ANALYSIS_LEVELS[y.level].order,
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <LevelLabel row={r} />
          {r.level !== 'absent' && r.absentPhases.length > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>Vắng thi {r.absentPhases.map(ph => PHASE_LABELS[ph]).join(', ')}</Text>
          )}
        </div>
      )
    }
  ];

  const filterOptions: { value: AnalysisFilter; label: string }[] = [
    { value: 'all', label: `Tất cả (${a.stats.all})` },
    { value: 'high', label: `Nghi vấn cao (${a.stats.high})` },
    { value: 'medium', label: `Cần rà soát (${a.stats.medium})` },
    { value: 'watch', label: `⭐ DS rà soát (${a.stats.watch})` },
    { value: 'dup', label: `Trùng link (${a.stats.dup})` }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '12px', overflow: 'hidden' }}>
      {/* Chọn lớp / môn */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          mode="multiple"
          style={{ flex: 2, minWidth: 0 }}
          placeholder="Chọn lớp (được chọn nhiều lớp)"
          options={a.classes}
          value={a.selectedClassIds}
          onChange={a.handleClassChange}
          optionFilterProp="label"
          maxTagCount="responsive"
          disabled={a.busy}
          allowClear
        />
        <Select
          style={{ flex: 1, minWidth: 0 }}
          placeholder={a.selectedClassIds.length ? 'Chọn môn học' : 'Chọn lớp trước'}
          options={a.courses}
          value={a.courseId || undefined}
          onChange={a.setCourseId}
          showSearch
          optionFilterProp="label"
          disabled={a.busy || !a.selectedClassIds.length}
        />
        <Tooltip title="Tải lại danh sách lớp">
          <Button icon={<ReloadOutlined />} onClick={a.reloadClasses} disabled={a.busy} />
        </Tooltip>
        <Tooltip title="Quy tắc gắn cờ & danh sách rà soát">
          <Badge dot={rulesChanged || a.watchList.length > 0}>
            <Button icon={<SettingOutlined />} onClick={() => setRulesOpen(true)} />
          </Badge>
        </Tooltip>
      </div>

      {/* Lọc + tìm */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <Segmented<AnalysisFilter> size="small" value={a.filter} onChange={a.setFilter} options={filterOptions} />
        <Input.Search
          size="small"
          placeholder="Tìm tên / MSSV"
          allowClear
          value={a.query}
          onChange={(e) => a.setQuery(e.target.value)}
          style={{ width: 170, flexShrink: 0 }}
        />
      </div>

      {/* Bảng */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <Table<FlaggedRow>
          rowKey="key"
          dataSource={a.visibleRows}
          columns={columns}
          pagination={false}
          size="small"
          sticky
          showSorterTooltip={false}
          onRow={(r) => ({ onClick: () => setDetail(r), style: { cursor: 'pointer' } })}
          locale={{
            emptyText: <Empty description={a.rows.length
              ? 'Không có sinh viên nào khớp bộ lọc.'
              : 'Chọn lớp và môn học rồi bấm "Phân tích". Bấm vào một sinh viên để xem chi tiết.'} />
          }}
        />
      </div>

      {a.progress && (
        <Card size="small" style={{ backgroundColor: '#e6f7ff', borderColor: '#91d5ff', borderRadius: 8 }}>
          <Text strong style={{ color: '#0050b3', fontSize: 12 }}>{a.progress.text} {a.progress.done}/{a.progress.total}</Text>
          <Progress percent={a.progress.total ? Math.round((a.progress.done / a.progress.total) * 100) : 0} status="active" />
        </Card>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tooltip title="Gọi thêm 1 request / sinh viên để lấy điểm AI hệ thống của từng bài tập và phát hiện trùng link bài tập">
            <Button icon={<CloudDownloadOutlined />} onClick={a.handleLoadAi} disabled={a.busy || !a.rows.length}>
              Tải điểm AI bài tập
            </Button>
          </Tooltip>
          <Button icon={<DownloadOutlined />} onClick={a.handleExport} disabled={!a.visibleRows.length}>
            Xuất Excel
          </Button>
        </Space>
        <Button
          type="primary"
          icon={<BarChartOutlined />}
          onClick={a.handleAnalyze}
          loading={a.busy}
          disabled={!a.selectedClassIds.length || !a.courseId}
        >
          Phân tích
        </Button>
      </div>

      <RulesDrawer open={rulesOpen} onClose={() => setRulesOpen(false)} a={a} />
      <StudentDetailModal row={detail} testCols={a.testCols} onClose={() => setDetail(null)} />
    </div>
  );
};

/* ---------- Ngăn kéo: quy tắc gắn cờ + danh sách rà soát ---------- */
const RulesDrawer: React.FC<{ open: boolean; onClose: () => void; a: ReturnType<typeof useExamAnalysis> }> = ({ open, onClose, a }) => {
  const setRule = (k: keyof AnalysisRules) => (v: number | null) => a.setRules(prev => ({ ...prev, [k]: v ?? 0 }));
  const ruleRow = (label: React.ReactNode, k: keyof AnalysisRules, suffix?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ fontSize: 13 }}>{label}</Text>
      <InputNumber size="small" min={0} max={100} value={a.rules[k]} onChange={setRule(k)} suffix={suffix} style={{ width: 80 }} />
    </div>
  );

  return (
    <Drawer
      title="Quy tắc gắn cờ & danh sách rà soát"
      open={open}
      onClose={onClose}
      size={360}
      extra={<Button size="small" onClick={() => a.setRules(DEFAULT_ANALYSIS_RULES)}>Mặc định</Button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Áp dụng cho SV có tỉ lệ nộp BTVN cao. Điểm thi ưu tiên phần tự luận, thang 100.</Text>
        {ruleRow('Tỉ lệ nộp BTVN từ', 'hwMin', '%')}
        {ruleRow(<>Nghi vấn cao khi điểm thi dưới</>, 'highBelow')}
        {ruleRow(<>Cần rà soát khi điểm thi dưới</>, 'midBelow')}
        {ruleRow(<>hoặc chênh BTVN − thi từ</>, 'gapMin')}
        {ruleRow(<>Thêm cờ khi điểm AI bài tập TB từ</>, 'aiHigh')}
      </div>

      <Divider />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Text strong>⭐ Danh sách cần rà soát ({a.watchList.length} tên)</Text>
        <TextArea
          rows={6}
          value={a.watchText}
          onChange={(e) => a.setWatchText(e.target.value)}
          placeholder={'Mỗi dòng 1 tên (hoặc cách nhau dấu phẩy), vd:\nĐinh Quang Hào\nNguyễn Duy Đạt'}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>So khớp cả tên gõ không dấu.</Text>
        {a.rows.length > 0 && a.watchMissing.length > 0 && (
          <Alert
            type="warning"
            showIcon
            title={`Không tìm thấy ${a.watchMissing.length} tên trong các lớp đã chọn`}
            description={a.watchMissing.join(', ')}
          />
        )}
      </div>

      <Divider />
      <Alert type="info" showIcon title={DISCLAIMER} />
    </Drawer>
  );
};

/* ---------- Chi tiết 1 sinh viên ---------- */
const StudentDetailModal: React.FC<{ row: FlaggedRow | null; testCols: TestColumn[]; onClose: () => void }> = ({ row: r, testCols, onClose }) => {
  if (!r) return null;
  const tests = testCols.map(c => r.tests[c.key]).filter(Boolean);
  const section = (title: string) => <Text strong style={{ display: 'block', margin: '16px 0 6px' }}>{title}</Text>;

  return (
    <Modal open onCancel={onClose} footer={null} width={640} title={`${r.watch ? '⭐ ' : ''}${r.name}`}>
      <Text type="secondary" style={{ fontSize: 12 }}>{r.code} · {r.classLabel}</Text>

      <Descriptions
        size="small"
        column={3}
        style={{ marginTop: 12 }}
        items={[
          { key: 'level', label: 'Mức', children: <LevelLabel row={r} /> },
          { key: 'hw', label: 'BTVN', children: r.hw == null ? '—' : `${fmtScore(r.hw)}%` },
          { key: 'absent', label: 'Nghỉ học', children: r.absentRate == null ? '—' : `${fmtScore(r.absentRate)}%` },
          { key: 'hk', label: 'Hackathon', children: `${fmtScore(r.hk)} (TN ${fmtScore(r.hkTN)} / TL ${fmtScore(r.hkTL)})` },
          { key: 'ck', label: 'Cuối môn', children: fmtScore(r.ck) },
          { key: 'ai', label: 'AI bài tập TB', children: fmtScore(r.aiAvg) }
        ]}
      />

      {r.reasons.length > 0 && (
        <>
          {section('Lý do gắn cờ')}
          <ul style={{ margin: 0, paddingLeft: 18 }}>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </>
      )}

      {r.dups.length > 0 && (
        <>
          {section('Trùng link')}
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {r.dups.map((d, i) => (
              <li key={i}>{d.what} (<a href={d.link} target="_blank" rel="noopener noreferrer">mở link</a>) trùng với {d.others.join(', ')}</li>
            ))}
          </ul>
        </>
      )}

      {section('Điểm thi & nhận xét của giảng viên chấm')}
      {tests.length ? tests.map((t, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>
              {t.name} <Text type="secondary" style={{ fontSize: 12 }}>· {t.kind === 'TL' ? 'tự luận' : 'trắc nghiệm'}</Text>
              {t.link && <> · <a href={t.link} target="_blank" rel="noopener noreferrer">bài làm</a></>}
            </span>
            {t.absent ? <Text type="secondary">Vắng thi</Text> : <Text strong>{fmtScore(t.point)}</Text>}
          </div>
          {t.comment && (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#595959', background: '#fafafa', padding: '4px 8px', borderRadius: 4, marginTop: 4 }}>
              {t.comment}
            </div>
          )}
        </div>
      )) : <Text type="secondary">Chưa có điểm thi.</Text>}

      {section('Bài tập về nhà')}
      {r.exercises ? (
        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => String(i)}
          dataSource={r.exercises}
          columns={[
            { title: 'Bài tập', dataIndex: 'title' },
            { title: 'Điểm AI', key: 'ai', width: 80, align: 'right', render: (_, e) => fmtScore(e.ai) },
            { title: '', key: 'link', width: 70, render: (_, e) => e.link ? <a href={e.link} target="_blank" rel="noopener noreferrer">mở link</a> : null }
          ]}
        />
      ) : <Text type="secondary">Bấm "Tải điểm AI bài tập" để xem danh sách bài tập và điểm AI.</Text>}

      {section('Gợi ý rà soát')}
      <Text type="secondary">
        Gọi SV vấn đáp nhanh 5–10 phút: yêu cầu giải thích lại 1–2 bài tập đã nộp (vì sao làm như vậy, sửa trực tiếp 1 chi tiết nhỏ).
        Nếu SV giải thích được thì có thể do áp lực phòng thi; nếu không thì nghi vấn nhờ làm hộ / dùng AI.
      </Text>
      <Alert type="info" showIcon title={DISCLAIMER} style={{ marginTop: 16 }} />
    </Modal>
  );
};
