import React, { useState } from 'react';
import {
  Table, Button, Select, Input, InputNumber, Tag, Card, Progress, Modal, Drawer, Descriptions,
  Typography, Empty, Alert, Tooltip, Badge, Divider, Flex, Space, Dropdown, Checkbox
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CloudDownloadOutlined, DownloadOutlined, SettingOutlined, RobotOutlined, FileSearchOutlined, FilterOutlined
} from '@ant-design/icons';
import { useStudentMonitor } from '~/src/hooks/student-monitor/useStudentMonitor';
import {
  MonitorRow, MonitorRules, MONITOR_FILTERS, RISK_LEVELS, DEFAULT_MONITOR_RULES, EXAM_CELLS, fmtPercent, fmtExamCell
} from '~/src/core/studentMonitor';
import { AnalysisRules, TestColumn, ANALYSIS_LEVELS, DEFAULT_ANALYSIS_RULES, fmtScore } from '~/src/core/examAnalysis';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type Monitor = ReturnType<typeof useStudentMonitor>;

const DISCLAIMER = 'Nghi vấn chỉ là dấu hiệu cần rà soát (vd vấn đáp lại bài tập), không phải bằng chứng gian lận.';

const RiskTag: React.FC<{ row: MonitorRow }> = ({ row }) => {
  const label = RISK_LEVELS[row.risk].label;
  if (row.risk === 'alarm') return <Tag color="error" variant="solid">{label}</Tag>;
  if (row.risk === 'warning') return <Tag color="warning" variant="solid">{label}</Tag>;
  if (row.risk === 'early') return <Tag color="gold" variant="filled">{label}</Tag>;
  return <Text type="secondary">{label}</Text>;
};

const MAX_ISSUE_TAGS = 3;

/** Các vấn đề chính của SV (nặng nhất trước), tối đa 3 nhãn — bấm vào dòng để xem đủ. */
const IssueTags: React.FC<{ row: MonitorRow }> = ({ row }) => {
  const tags: React.ReactNode[] = [
    ...[...row.issues]
      .sort((x, y) => Number(y.severity === 'alarm') - Number(x.severity === 'alarm'))
      .map(i => <Tag key={i.kind} color={i.severity === 'alarm' ? 'error' : 'warning'} variant="filled" style={{ margin: 0 }}>{i.label}</Tag>),
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
  const [detail, setDetail] = useState<MonitorRow | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: m.statusText }));
    return () => { window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null })); };
  }, [m.statusText]);

  const multiClass = new Set(m.rows.map(r => r.classLabel)).size > 1;
  const settingsChanged = m.watchList.length > 0
    || (Object.keys(DEFAULT_MONITOR_RULES) as (keyof MonitorRules)[]).some(k => m.monitorRules[k] !== DEFAULT_MONITOR_RULES[k])
    || (Object.keys(DEFAULT_ANALYSIS_RULES) as (keyof AnalysisRules)[]).some(k => m.rules[k] !== DEFAULT_ANALYSIS_RULES[k]);
  const toggleExpand = (key: string) =>
    setExpandedKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

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

      {m.rows.length > 0 && <Overview m={m} />}

      {/* Bộ lọc thông minh (chọn nhiều, khớp bất kỳ) + tìm kiếm + xuất Excel */}
      {m.rows.length > 0 && (
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
            {m.filters.length > 0 && <Button size="small" type="link" onClick={m.clearFilters}>Bỏ lọc</Button>}
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

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fff', borderRadius: 8 }}>
        <Table<MonitorRow>
          rowKey="key"
          dataSource={m.visibleRows}
          columns={columns}
          pagination={false}
          size="small"
          sticky
          expandable={{
            showExpandColumn: false,
            expandedRowKeys: expandedKeys,
            onExpand: (_, r) => toggleExpand(r.key),
            expandedRowRender: (r) => <StudentDetails row={r} m={m} onOpenExams={() => setDetail(r)} />
          }}
          onRow={(r) => ({ onClick: () => toggleExpand(r.key), style: { cursor: 'pointer' } })}
          locale={{
            emptyText: <Empty description={m.rows.length
              ? 'Không có sinh viên nào khớp bộ lọc.'
              : 'Chọn lớp và môn học rồi bấm "Tải dữ liệu". Bấm vào một sinh viên để xem đầy đủ thông tin.'} />
          }}
        />
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} m={m} />
      <ExamDetailModal row={detail} testCols={m.testCols} onClose={() => setDetail(null)} />
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

/* ---------- Thông tin đầy đủ khi mở 1 SV ---------- */
const StudentDetails: React.FC<{ row: MonitorRow; m: Monitor; onOpenExams: () => void }> = ({ row: r, m, onOpenExams }) => {
  const ai = m.studentAi[r.key];
  return (
    <Flex vertical gap={8} onClick={(e) => e.stopPropagation()}>
      <Descriptions
        size="small"
        column={4}
        items={[
          { key: 'absent', label: 'Nghỉ học', children: fmtPercent(r.absentRate) },
          { key: 'hw', label: 'Thiếu BT', children: fmtPercent(r.missingHomework) },
          { key: 'el', label: 'Chậm EL', children: r.unprepared ?? '—' },
          { key: 'rp', label: 'R-Points', children: r.rpoints ?? '—' },
          ...EXAM_CELLS.map(c => ({ key: c.key, label: c.label, children: fmtExamCell(r[c.key]) })),
          { key: 'code', label: 'MSSV', children: r.code },
          { key: 'email', label: 'Email', children: r.email || '—', span: 2 },
          { key: 'ai', label: 'AI BT TB', children: fmtScore(r.aiAvg) }
        ]}
      />
      {r.actions.length > 0 && (
        <div>
          <Text strong>Gợi ý hành động</Text>
          <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{r.actions.map(a => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      {r.reasons.length > 0 && (
        <div>
          <Text strong>Dấu hiệu nghi vấn</Text> <Text type="secondary">— {DISCLAIMER}</Text>
          <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{r.reasons.map(x => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      <Space>
        <Button size="small" icon={<FileSearchOutlined />} onClick={onOpenExams}>Điểm thi & nhận xét GV</Button>
        <Button size="small" icon={<RobotOutlined />} onClick={() => m.handleStudentAi(r)} loading={ai?.loading}>AI nhận xét</Button>
      </Space>
      {ai?.error && <Alert type="error" showIcon title={ai.error} />}
      {ai?.text && <Alert type="info" title={<span style={{ whiteSpace: 'pre-wrap' }}>{ai.text}</span>} />}
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

/* ---------- Điểm thi, nhận xét GV chấm, bài tập ---------- */
const ExamDetailModal: React.FC<{ row: MonitorRow | null; testCols: TestColumn[]; onClose: () => void }> = ({ row: r, testCols, onClose }) => {
  if (!r) return null;
  const tests = testCols.map(c => r.tests[c.key]).filter(Boolean);
  const section = (title: string) => <Text strong style={{ display: 'block', margin: '16px 0 6px' }}>{title}</Text>;
  return (
    <Modal open onCancel={onClose} footer={null} width={640} title={`${r.name} — ${r.code}`}>
      {section('Điểm thi & nhận xét của giảng viên chấm')}
      {tests.length ? tests.map((t, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <Flex justify="space-between" gap={8}>
            <span>
              {t.name} <Text type="secondary">· {t.kind === 'TL' ? 'tự luận' : 'trắc nghiệm'}</Text>
              {t.link && <> · <a href={t.link} target="_blank" rel="noopener noreferrer">bài làm</a></>}
            </span>
            {t.absent ? <Text type="secondary">Vắng thi</Text> : <Text strong>{fmtScore(t.point)}</Text>}
          </Flex>
          {t.comment && (
            <div style={{ whiteSpace: 'pre-wrap', color: '#595959', background: '#fafafa', padding: '4px 8px', borderRadius: 4, marginTop: 4 }}>
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
      ) : <Text type="secondary">Mở ⚙ Cài đặt → "Tải điểm AI bài tập" để xem danh sách bài tập và điểm AI.</Text>}
    </Modal>
  );
};
