import React, { Suspense, lazy, useState } from 'react';
import {
  Table, Button, Select, Input, InputNumber, Tag, Card, Progress, Drawer,
  Typography, Empty, Alert, Tooltip, Badge, Divider, Flex, Space, Dropdown, Checkbox, Segmented
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CloudDownloadOutlined, DownloadOutlined, SettingOutlined, RobotOutlined, FilterOutlined,
  UnorderedListOutlined, BarChartOutlined
} from '@ant-design/icons';
import { useStudentMonitor, MonitorView } from '~/src/hooks/student-monitor/useStudentMonitor';
import { StudentMonitorDrawer, RiskTag } from '~/src/components/StudentMonitorDrawer';
import {
  MonitorRow, MonitorRules, MONITOR_FILTERS, DEFAULT_MONITOR_RULES, fmtPercent
} from '~/src/core/studentMonitor';
import { AnalysisRules, ANALYSIS_LEVELS, DEFAULT_ANALYSIS_RULES } from '~/src/core/examAnalysis';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type Monitor = ReturnType<typeof useStudentMonitor>;

// Thư viện biểu đồ khá nặng → chỉ tải khi mở chế độ Biểu đồ
const StudentMonitorCharts = lazy(() =>
  import('~/src/components/StudentMonitorCharts').then(mod => ({ default: mod.StudentMonitorCharts })));


const MAX_ISSUE_TAGS = 3;

/** Các vấn đề chính của SV (nặng nhất trước), tối đa 3 nhãn — bấm vào dòng để xem đủ. */
const IssueTags: React.FC<{ row: MonitorRow }> = ({ row }) => {
  const tags: React.ReactNode[] = [
    ...[...row.issues]
      .sort((x, y) => Number(y.severity === 'alarm') - Number(x.severity === 'alarm'))
      .map(i => <Tag key={i.kind} color={i.severity === 'alarm' ? 'red' : 'orange'} variant="filled" style={{ margin: 0 }}>{i.label}</Tag>),
    ...row.early.map(e => <Tag key={`early-${e.kind}`} color="gold" variant="outlined" style={{ margin: 0 }}>Sắp: {e.label}</Tag>),
    ...(row.suspect || row.dups.length
      ? [<Tooltip key="suspect" title={[row.suspect ? ANALYSIS_LEVELS[row.level].label : '', row.dups.length ? 'trùng link bài nộp' : ''].filter(Boolean).join(', ')}>
          <Tag color="purple" variant="filled" style={{ margin: 0 }}>Nghi vấn BTVN</Tag>
        </Tooltip>]
      : [])
  ];
  const hidden = tags.length - MAX_ISSUE_TAGS;
  return (
    <Flex wrap gap={4}>
      {tags.slice(0, MAX_ISSUE_TAGS)}
      {hidden > 0 && <Tag style={{ margin: 0 }}>+{hidden}</Tag>}
    </Flex>
  );
};

export const StudentMonitorTab: React.FC = () => {
  const m = useStudentMonitor();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: m.statusText }));
    return () => { window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null })); };
  }, [m.statusText]);

  const multiClass = new Set(m.rows.map(r => r.classLabel)).size > 1;
  const settingsChanged = m.watchList.length > 0
    || (Object.keys(DEFAULT_MONITOR_RULES) as (keyof MonitorRules)[]).some(k => m.monitorRules[k] !== DEFAULT_MONITOR_RULES[k])
    || (Object.keys(DEFAULT_ANALYSIS_RULES) as (keyof AnalysisRules)[]).some(k => m.rules[k] !== DEFAULT_ANALYSIS_RULES[k]);
  // SV đang xem: duyệt trước / sau theo đúng thứ tự danh sách đang lọc
  const selectedIndex = selectedKey ? m.visibleRows.findIndex(r => r.key === selectedKey) : -1;
  const selectedRow = selectedIndex >= 0 ? m.visibleRows[selectedIndex] : null;
  const goTo = (i: number) => { const r = m.visibleRows[i]; if (r) setSelectedKey(r.key); };

  const columns: TableColumnsType<MonitorRow> = [
    {
      title: 'Sinh viên', key: 'name', width: 176, ellipsis: true,
      render: (_, r) => (
        <>
          <div>{r.watch && <span title="Trong danh sách rà soát">⭐ </span>}{r.name}</div>
          {multiClass && <Text type="secondary">{r.classLabel}</Text>}
        </>
      )
    },
    { title: 'Mức', key: 'risk', width: 136, render: (_, r) => <RiskTag row={r} /> },
    { title: 'Vấn đề', key: 'issues', render: (_, r) => <IssueTags row={r} /> }
  ];

  const levelFilters = MONITOR_FILTERS.filter(f => f.group === 'level');
  const otherFilters = MONITOR_FILTERS.filter(f => f.group !== 'level');
  const otherActive = otherFilters.filter(f => m.filters.includes(f.key)).length;

  return (
    <Flex vertical gap={12} style={{ height: '100%', padding: 16, overflow: 'hidden' }}>
      {/* Chọn lớp / môn + tải dữ liệu */}
      <Flex gap={8}>
        <Select
          mode="multiple"
          style={{ flex: 3, minWidth: 0 }}
          placeholder="Chọn lớp (được chọn nhiều lớp)"
          options={m.classes}
          value={m.selectedClassIds}
          onChange={m.handleClassChange}
          onOpenChange={(open) => { if (open && !m.classes.length) m.reloadClasses(); }}
          notFoundContent="Chưa tải được danh sách lớp — cần đăng nhập QLĐT"
          optionFilterProp="label"
          maxTagCount="responsive"
          disabled={m.busy}
          allowClear
        />
        <Select
          style={{ flex: 2, minWidth: 0 }}
          placeholder={m.selectedClassIds.length ? 'Chọn môn học' : 'Chọn lớp trước'}
          options={m.courses}
          value={m.courseId || undefined}
          onChange={m.setCourseId}
          showSearch
          optionFilterProp="label"
          disabled={m.busy || !m.selectedClassIds.length}
        />
        <Button type="primary" icon={<CloudDownloadOutlined />} onClick={m.handleLoad} loading={m.busy} disabled={!m.selectedClassIds.length || !m.courseId}>
          Tải dữ liệu
        </Button>
        <Segmented<MonitorView>
          value={m.view}
          onChange={m.setView}
          disabled={!m.rows.length}
          options={[
            { value: 'list', icon: <Tooltip title="Danh sách sinh viên"><UnorderedListOutlined /></Tooltip> },
            { value: 'chart', icon: <Tooltip title="Biểu đồ thống kê"><BarChartOutlined /></Tooltip> }
          ]}
        />
        <Tooltip title="Ngưỡng cảnh báo, nghi vấn & danh sách rà soát">
          <Badge dot={settingsChanged}>
            <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} />
          </Badge>
        </Tooltip>
      </Flex>

      {m.progress && (
        <Progress
          percent={m.progress.total ? Math.round((m.progress.done / m.progress.total) * 100) : 0}
          status="active"
          format={() => `${m.progress!.done}/${m.progress!.total}`}
        />
      )}

      {m.rows.length > 0 && m.view === 'chart' && (
        <Flex vertical gap={12} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Overview m={m} />
          <Suspense fallback={<Flex justify="center" style={{ padding: 24 }}><Text type="secondary">Đang tải biểu đồ…</Text></Flex>}>
            <StudentMonitorCharts
              byRisk={m.overview.byRisk}
              distributions={m.distributions}
              onPickRisk={m.openRiskLevel}
              onPickBin={m.openChartBin}
            />
          </Suspense>
        </Flex>
      )}

      {/* Bộ lọc thông minh (chọn nhiều, khớp bất kỳ) + tìm kiếm + xuất Excel */}
      {m.rows.length > 0 && m.view === 'list' && (
        <Flex justify="space-between" align="center" gap={8}>
          <Flex gap={4} align="center" style={{ minWidth: 0 }}>
            {levelFilters.map(f => {
              const on = m.filters.includes(f.key);
              return (
                <Tag.CheckableTag
                  key={f.key}
                  checked={on}
                  onChange={() => m.toggleFilter(f.key)}
                  style={{ border: `1px solid ${on ? '#1677ff' : '#d9d9d9'}`, padding: '1px 8px', marginInlineEnd: 0 }}
                >
                  {f.label} <b>{m.filterCounts[f.key]}</b>
                </Tag.CheckableTag>
              );
            })}
            <Dropdown
              trigger={['click']}
              popupRender={() => (
                <Card size="small" styles={{ body: { padding: 8 } }}>
                  <Flex vertical gap={6}>
                    {otherFilters.map(f => (
                      <Checkbox key={f.key} checked={m.filters.includes(f.key)} onChange={() => m.toggleFilter(f.key)} disabled={!m.filterCounts[f.key] && !m.filters.includes(f.key)}>
                        {f.label} ({m.filterCounts[f.key]})
                      </Checkbox>
                    ))}
                  </Flex>
                </Card>
              )}
            >
              <Button size="small" type={otherActive ? 'primary' : 'default'} ghost={!!otherActive} icon={<FilterOutlined />}>
                Lọc thêm{otherActive ? ` (${otherActive})` : ''}
              </Button>
            </Dropdown>
            {m.chartFilter && (
              <Tag color="blue" closable onClose={m.clearChartFilter} style={{ margin: 0 }}>{m.chartFilter.label}</Tag>
            )}
            {(m.filters.length > 0 || m.chartFilter) && <Button size="small" type="link" onClick={m.clearFilters}>Bỏ lọc</Button>}
          </Flex>
          <Flex gap={8} style={{ flexShrink: 0 }}>
            <Input.Search
              placeholder="Tìm tên, email, MSSV"
              allowClear
              value={m.query}
              onChange={(e) => m.setQuery(e.target.value)}
              style={{ width: 170 }}
            />
            <Tooltip title={`Xuất Excel ${m.visibleRows.length} sinh viên đang hiển thị`}>
              <Button icon={<DownloadOutlined />} onClick={m.handleExport} disabled={!m.visibleRows.length} />
            </Tooltip>
          </Flex>
        </Flex>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fff', borderRadius: 8, display: m.view === 'list' || !m.rows.length ? undefined : 'none' }}>
        <Table<MonitorRow>
          rowKey="key"
          dataSource={m.visibleRows}
          columns={columns}
          pagination={false}
          size="small"
          sticky
          onRow={(r) => ({
            onClick: () => setSelectedKey(r.key),
            style: { cursor: 'pointer', background: r.key === selectedKey ? '#e6f4ff' : undefined }
          })}
          locale={{
            emptyText: <Empty description={m.rows.length
              ? 'Không có sinh viên nào khớp bộ lọc.'
              : 'Chọn lớp và môn học rồi bấm "Tải dữ liệu". Bấm vào một sinh viên để xem chi tiết.'} />
          }}
        />
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} m={m} />
      <StudentMonitorDrawer
        row={selectedRow}
        index={selectedIndex}
        total={m.visibleRows.length}
        testCols={m.testCols}
        m={m}
        onPrev={() => goTo(selectedIndex - 1)}
        onNext={() => goTo(selectedIndex + 1)}
        onClose={() => setSelectedKey(null)}
      />
    </Flex>
  );
};

/* ---------- Tổng quan lớp ---------- */
const Overview: React.FC<{ m: Monitor }> = ({ m }) => {
  const o = m.overview;
  const top = o.topIssues.slice(0, 2).map(t => `${t.label.toLowerCase()} (${t.count} SV)`).join(', ');
  const summary = `${top ? `Nhiều nhất: ${top}` : 'Không có vi phạm'} · nghỉ học TB ${fmtPercent(o.avgAbsent)} · thiếu BT TB ${fmtPercent(o.avgMissingHomework)}`;
  return (
    <Flex vertical gap={8}>
      <Flex justify="space-between" align="center" gap={8}>
        <Text type="secondary" ellipsis={{ tooltip: summary }} style={{ minWidth: 0 }}>{summary}</Text>
        <Button size="small" icon={<RobotOutlined />} onClick={m.handleClassAi} loading={m.classAi?.loading} style={{ flexShrink: 0 }}>
          AI tổng quan lớp
        </Button>
      </Flex>
      {m.classAi?.error && <Alert type="error" showIcon title={m.classAi.error} />}
      {m.classAi?.text && (
        <Alert
          type="info"
          title={<Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 3, expandable: 'collapsible' }}>{m.classAi.text}</Paragraph>}
        />
      )}
    </Flex>
  );
};

/* ---------- Cài đặt: ngưỡng, nghi vấn, danh sách rà soát ---------- */
const SettingsDrawer: React.FC<{ open: boolean; onClose: () => void; m: Monitor }> = ({ open, onClose, m }) => {
  const setMonitor = (k: keyof MonitorRules) => (v: number | null) => m.setMonitorRules(prev => ({ ...prev, [k]: v ?? 0 }));
  const setRule = (k: keyof AnalysisRules) => (v: number | null) => m.setRules(prev => ({ ...prev, [k]: v ?? 0 }));
  const num = (value: number, onChange: (v: number | null) => void, suffix?: string) => (
    <InputNumber size="small" min={0} max={100} value={value} onChange={onChange} suffix={suffix} style={{ width: 76 }} />
  );
  const row = (label: string, ...inputs: React.ReactNode[]) => (
    <Flex justify="space-between" align="center" gap={8}>
      <Text>{label}</Text>
      <Space size={4}>{inputs.map((x, i) => <React.Fragment key={i}>{x}</React.Fragment>)}</Space>
    </Flex>
  );
  const r = m.monitorRules;
  const a = m.rules;

  return (
    <Drawer
      title="Cài đặt giám sát"
      open={open}
      onClose={onClose}
      size={380}
      extra={<Button size="small" onClick={() => { m.setMonitorRules(DEFAULT_MONITOR_RULES); m.setRules(DEFAULT_ANALYSIS_RULES); }}>Mặc định</Button>}
    >
      <Flex vertical gap={10}>
        <Text strong>Cảnh báo / Báo động</Text>
        <Text type="secondary">SV có từ 2 lỗi cảnh báo, hoặc vắng thi, cũng là báo động.</Text>
        <Flex justify="flex-end" gap={4}>
          <Text type="warning" strong style={{ width: 76, textAlign: 'center' }}>Cảnh báo</Text>
          <Text type="danger" strong style={{ width: 76, textAlign: 'center' }}>Báo động</Text>
        </Flex>
        {row('Nghỉ học (%)', num(r.absentWarn, setMonitor('absentWarn')), num(r.absentAlarm, setMonitor('absentAlarm')))}
        {row('Thiếu bài tập (%)', num(r.homeworkWarn, setMonitor('homeworkWarn')), num(r.homeworkAlarm, setMonitor('homeworkAlarm')))}
        {row('Chậm E-learning (bài)', num(r.elearningWarn, setMonitor('elearningWarn')), num(r.elearningAlarm, setMonitor('elearningAlarm')))}
        {row('Bài thi dưới (điểm)', num(r.examPass, setMonitor('examPass')), <div style={{ width: 76 }} />)}

        <Divider style={{ margin: '6px 0' }} />
        <Text strong>Sắp vượt ngưỡng</Text>
        {row('Nghỉ học từ (%)', num(r.earlyAbsentFrom, setMonitor('earlyAbsentFrom')))}
        {row('Thiếu bài tập từ (%)', num(r.earlyHomeworkFrom, setMonitor('earlyHomeworkFrom')))}
        {row('Bài thi đạt nhưng tới (điểm)', num(r.earlyExamTo, setMonitor('earlyExamTo')))}

        <Divider style={{ margin: '6px 0' }} />
        <Text strong>Nghi vấn BTVN ↔ điểm thi</Text>
        <Text type="secondary">Xét SV nộp nhiều BTVN. Điểm thi ưu tiên phần tự luận.</Text>
        {row('Tỉ lệ nộp BTVN từ (%)', num(a.hwMin, setRule('hwMin')))}
        {row('Nghi vấn cao khi thi dưới', num(a.highBelow, setRule('highBelow')))}
        {row('Cần rà soát khi thi dưới', num(a.midBelow, setRule('midBelow')))}
        {row('hoặc chênh BTVN − thi từ', num(a.gapMin, setRule('gapMin')))}
        {row('Điểm AI bài tập TB từ', num(a.aiHigh, setRule('aiHigh')))}
        <Button icon={<CloudDownloadOutlined />} onClick={m.handleLoadExerciseAi} disabled={m.busy || !m.rows.length}>
          Tải điểm AI bài tập ({m.visibleRows.length} SV đang hiển thị)
        </Button>

        <Divider style={{ margin: '6px 0' }} />
        <Text strong>⭐ Danh sách cần rà soát ({m.watchList.length} tên)</Text>
        <TextArea
          rows={5}
          value={m.watchText}
          onChange={(e) => m.setWatchText(e.target.value)}
          placeholder={'Mỗi dòng 1 tên (hoặc cách nhau dấu phẩy), vd:\nĐinh Quang Hào\nNguyễn Duy Đạt'}
        />
        <Text type="secondary">So khớp cả tên gõ không dấu.</Text>
        {m.rows.length > 0 && m.watchMissing.length > 0 && (
          <Alert type="warning" showIcon title={`Không tìm thấy ${m.watchMissing.length} tên`} description={m.watchMissing.join(', ')} />
        )}
      </Flex>
    </Drawer>
  );
};
