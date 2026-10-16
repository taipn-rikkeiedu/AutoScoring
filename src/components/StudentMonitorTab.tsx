import React, { Suspense, lazy, useState } from 'react';
import {
  Table, Button, Select, Input, Tag, Card, Progress, Drawer,
  Typography, Empty, Alert, Tooltip, Badge, Divider, Flex, Dropdown, Checkbox, Segmented, Collapse, Tabs
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CloudDownloadOutlined, DownloadOutlined, SettingOutlined, RobotOutlined, FilterOutlined,
  UnorderedListOutlined, BarChartOutlined, ReloadOutlined, CheckCircleFilled, RightOutlined, CalendarOutlined
} from '@ant-design/icons';
import { useStudentMonitor, MonitorView } from '~/src/hooks/student-monitor/useStudentMonitor';
import { StudentMonitorDrawer, RiskTag, WatchStar } from '~/src/components/StudentMonitorDrawer';
import { DayKindTags, DayLeave } from '~/src/components/StudentAttendancePanel';
import { fmtDay, weekday, isAbsentKind } from '~/src/core/attendance';
import { readableColor } from '~/src/core/monitorLevels';
import {
  MonitorRow, MONITOR_FILTERS, levelFilterKey, fmtPercent, CLASS_AI_KINDS, ClassAiKind
} from '~/src/core/studentMonitor';
import { MonitorTemplatesPanel } from '~/src/components/MonitorTemplatesPanel';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type Monitor = ReturnType<typeof useStudentMonitor>;

// Thư viện biểu đồ khá nặng → chỉ tải khi mở chế độ Biểu đồ
const StudentMonitorCharts = lazy(() =>
  import('~/src/components/StudentMonitorCharts').then(mod => ({ default: mod.StudentMonitorCharts })));

export const StudentMonitorTab: React.FC = () => {
  const m = useStudentMonitor();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const searchInputRef = React.useRef<any>(null);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: m.statusText }));
    return () => { window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null })); };
  }, [m.statusText]);

  // Phím tắt / để tìm kiếm nhanh
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === '/' && m.view === 'list') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [m.view]);

  const multiClass = new Set(m.rows.map(r => r.classLabel)).size > 1;
  // SV đang xem: duyệt trước / sau theo đúng thứ tự danh sách đang lọc
  const navRows = selectedKey && !m.visibleRows.some(r => r.key === selectedKey) ? m.rows : m.visibleRows;
  const selectedIndex = selectedKey ? navRows.findIndex(r => r.key === selectedKey) : -1;
  const selectedRow = selectedIndex >= 0 ? navRows[selectedIndex] : null;
  const goTo = (i: number) => { const r = navRows[i]; if (r) setSelectedKey(r.key); };

  const getRiskRank = (row: MonitorRow) => (row.risk === 'normal' ? 999 : m.levels.findIndex(l => l.id === row.risk));

  const columns: TableColumnsType<MonitorRow> = [
    {
      title: 'Sinh viên',
      key: 'name',
      width: 230,
      sorter: (a, b) => a.name.localeCompare(b.name, 'vi'),
      render: (_, r) => (
        <Flex align="center" gap={8}>
          <WatchStar on={r.watch} onToggle={() => m.toggleWatch(r.name)} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.name}
            </div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {r.code}{multiClass ? ` · ${r.classLabel}` : ''}
            </Text>
          </div>
        </Flex>
      )
    },
    {
      title: m.absentDate ? `Nghỉ ${weekday(m.absentDate)} ${fmtDay(m.absentDate)}` : 'Tình hình',
      key: 'status',
      render: (_, r) => {
        if (m.absentDate) {
          const day = m.attendanceOf(r)?.s.days[m.absentDate];
          if (!day) return null;
          const absent = day.marks.filter(x => isAbsentKind(x.kind));
          return (
            <Flex vertical gap={2} style={{ minWidth: 0 }}>
              <Flex gap={6} align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {absent.length === day.marks.length && day.marks.length > 1 ? 'Cả ngày' : absent.map(x => `Ca ${x.period}`).join(', ')}
                </Text>
                <DayKindTags day={day} />
              </Flex>
              <DayLeave day={day} compact />
            </Flex>
          );
        }
        return <IssueSummary row={r} />;
      }
    },
    {
      title: 'Mức',
      key: 'risk',
      width: 150,
      align: 'right',
      sorter: (a, b) => getRiskRank(a) - getRiskRank(b),
      render: (_, r) => {
        const issuesSummary = r.issues.length > 0
          ? r.issues.map(i => `• ${i.title}: ${i.value} (${i.levelName})`).join('\n')
          : r.early.length > 0
            ? r.early.map(e => `• Sắp vượt: ${e.title} ${e.threshold}`).join('\n')
            : 'Không có vi phạm';

        return (
          <Flex align="center" justify="flex-end" gap={8}>
            <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{issuesSummary}</div>}>
              <span><RiskTag row={r} /></span>
            </Tooltip>
            <RightOutlined style={{ fontSize: 11, color: '#94a3b8' }} />
          </Flex>
        );
      }
    }
  ];

  // Lọc theo mức đã cấu hình; ẩn mức không có SV (trừ khi đang chọn)
  const levelFilters = m.levels
    .map(l => ({ key: levelFilterKey(l.id), label: l.name, color: l.color }))
    .filter(f => m.filterCounts[f.key] || m.filters.includes(f.key));
  // Mẫu tắt nghi vấn BTVN → ẩn các ô lọc nghi vấn
  const otherFilters = m.rules.enabled === false ? MONITOR_FILTERS.filter(f => f.key !== 'suspect' && f.key !== 'dup') : MONITOR_FILTERS;
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
        <Tooltip title={`Mẫu giám sát đang áp dụng: ${m.activeTemplate.name}${m.activePerCourse ? ' (riêng môn này)' : ''} — bấm để quản lý mẫu & danh sách rà soát`}>
          <Badge dot={m.watchList.length > 0}>
            <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} style={{ maxWidth: 120 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.activeTemplate.name}</span>
            </Button>
          </Badge>
        </Tooltip>
      </Flex>

      {m.classes.length === 0 && !m.busy && (
        <Alert
          type="warning"
          showIcon
          message="Chưa kết nối dữ liệu QLĐT"
          description={
            <span>
              Cần đăng nhập vào hệ thống Quản lý Đào tạo (QLĐT) để tải danh sách lớp và môn học.{' '}
              <a href="https://qldt.rikkei.edu.vn" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                Mở trang QLĐT ↗
              </a>
            </span>
          }
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => m.reloadClasses()}>
              Thử lại
            </Button>
          }
        />
      )}

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
              levels={m.levels}
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
          <Flex gap={4} align="center" style={{ minWidth: 0, flex: 1 }}>
            {/* Nhiều mức thì cuộn ngang, nút Lọc thêm luôn hiện */}
            <Flex gap={6} align="center" style={{ minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none', padding: '2px 0' }}>
            {levelFilters.map(f => {
              const on = m.filters.includes(f.key);
              return (
                <Tag.CheckableTag
                  key={f.key}
                  checked={on}
                  onChange={() => m.toggleFilter(f.key)}
                  style={{
                    border: `1px solid ${on ? '#1677ff' : '#d9d9d9'}`,
                    padding: '3px 10px',
                    marginInlineEnd: 0,
                    whiteSpace: 'nowrap',
                    borderRadius: 6,
                    fontSize: 12,
                    lineHeight: '20px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: f.color, marginRight: 6 }} />
                  {f.label} <b>{m.filterCounts[f.key]}</b>
                </Tag.CheckableTag>
              );
            })}
            </Flex>
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
              <Button size="small" type={otherActive ? 'primary' : 'default'} ghost={!!otherActive} icon={<FilterOutlined />} style={{ flexShrink: 0 }}>
                Lọc thêm{otherActive ? ` (${otherActive})` : ''}
              </Button>
            </Dropdown>
            {m.absenceDates.length > 0 && (
              <Select
                size="small"
                allowClear
                prefix={<CalendarOutlined style={{ color: '#8c8c8c' }} />}
                placeholder="Nghỉ ngày…"
                value={m.absentDate || undefined}
                onChange={(v) => m.setAbsentDate(v || '')}
                popupMatchSelectWidth={false}
                style={{ width: 132, flexShrink: 0 }}
                options={m.absenceDates.map(d => ({ value: d.date, label: `${weekday(d.date)} ${fmtDay(d.date)} · ${d.count} SV nghỉ` }))}
              />
            )}
            {m.chartFilter && (
              <Tag color="blue" closable onClose={m.clearChartFilter} style={{ margin: 0 }}>{m.chartFilter.label}</Tag>
            )}
            {(m.filters.length > 0 || m.chartFilter || m.absentDate) && <Button size="small" type="link" onClick={m.clearFilters}>Bỏ lọc</Button>}
          </Flex>
          <Flex gap={8} style={{ flexShrink: 0 }}>
            <Input.Search
              ref={searchInputRef}
              placeholder="Tìm tên, email, MSSV (phím /)"
              allowClear
              value={m.query}
              onChange={(e) => m.setQuery(e.target.value)}
              style={{ width: 150 }}
            />
            <Tooltip title={`Xuất Excel ${m.visibleRows.length} sinh viên đang hiển thị`}>
              <Button
                icon={<DownloadOutlined />}
                onClick={m.handleExport}
                loading={m.exporting}
                disabled={!m.visibleRows.length}
                style={{ minWidth: 32, height: 32 }}
              />
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
            tabIndex: 0,
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedKey(r.key);
              }
            },
            style: {
              cursor: 'pointer',
              background: r.key === selectedKey ? '#e6f4ff' : undefined,
              outline: 'none'
            },
            className: 'transition-colors hover:bg-slate-50 focus-visible:bg-blue-50 focus-visible:ring-1 focus-visible:ring-blue-400'
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
        total={navRows.length}
        testCols={m.testCols}
        m={m}
        onPrev={() => goTo(selectedIndex - 1)}
        onNext={() => goTo(selectedIndex + 1)}
        onClose={() => setSelectedKey(null)}
      />
    </Flex>
  );
};

/* ---------- Vấn đề chính của 1 SV trên dòng danh sách (nặng nhất trước, tối đa 3 nhãn) ---------- */
const MAX_TAGS = 3;
const IssueSummary: React.FC<{ row: MonitorRow }> = ({ row }) => {
  const items = [
    ...row.issues.map(i => ({ key: i.kind, label: i.label, color: i.color, tip: `${i.levelName}: ${i.title} ${i.threshold}`, dashed: false })),
    ...row.early.map(e => ({ key: `e-${e.kind}`, label: `Sắp: ${e.label}`, color: e.color, tip: `${e.levelName}: ${e.title} ${e.threshold}`, dashed: true }))
  ];
  if (!items.length) return <Text type="secondary" style={{ fontSize: 12 }}>Không có vấn đề</Text>;
  return (
    <Flex gap={4} wrap>
      {items.slice(0, MAX_TAGS).map(x => (
        <Tooltip key={x.key} title={x.tip}>
          <Tag style={{ margin: 0, color: readableColor(x.color), background: x.dashed ? 'transparent' : `${x.color}14`, borderColor: `${x.color}66`, borderStyle: x.dashed ? 'dashed' : 'solid' }}>
            {x.label}
          </Tag>
        </Tooltip>
      ))}
      {items.length > MAX_TAGS && <Tag style={{ margin: 0 }}>+{items.length - MAX_TAGS}</Tag>}
    </Flex>
  );
};

/* ---------- Tổng quan lớp ---------- */
const Overview: React.FC<{ m: Monitor }> = ({ m }) => {
  const o = m.overview;
  const [kind, setKind] = useState<ClassAiKind>('overall');
  const top = o.topIssues.slice(0, 2).map(t => `${t.label.toLowerCase()} (${t.count} SV)`).join(', ');
  const summary = `${top ? `Nhiều nhất: ${top}` : 'Không có vi phạm'} · nghỉ học TB ${fmtPercent(o.avgAbsent)} · thiếu BT TB ${fmtPercent(o.avgMissingHomework)}`;
  const current = m.classAi[kind];
  const meta = CLASS_AI_KINDS.find(k => k.key === kind)!;

  return (
    <Flex vertical gap={8}>
      <Text type="secondary" ellipsis={{ tooltip: summary }} style={{ minWidth: 0 }}>{summary}</Text>
      {/* AI tổng quan: mỗi loại 1 tab, bấm tạo riêng; kết quả giữ lại khi chuyển tab */}
      <Card size="small" styles={{ body: { padding: '0 12px 12px' } }}>
        <Tabs
          size="small"
          activeKey={kind}
          onChange={(k) => setKind(k as ClassAiKind)}
          tabBarExtraContent={(
            <Button
              size="small"
              type={current?.text ? 'default' : 'primary'}
              icon={current?.text ? <ReloadOutlined /> : <RobotOutlined />}
              loading={current?.loading}
              onClick={() => m.handleClassAi(kind)}
            >
              {current?.text ? 'Tạo lại' : 'AI nhận xét'}
            </Button>
          )}
          items={CLASS_AI_KINDS.map(k => ({
            key: k.key,
            label: (
              <span>
                {k.label}
                {m.classAi[k.key]?.text && <CheckCircleFilled style={{ color: '#52c41a', marginLeft: 4, fontSize: 12 }} />}
              </span>
            )
          }))}
        />
        {current?.error && <Alert type="error" showIcon title={current.error} />}
        {current?.loading && <Text type="secondary">Đang viết nhận xét {meta.label.toLowerCase()}…</Text>}
        {current?.text && !current.loading && (
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 8, expandable: 'collapsible' }}>{current.text}</Paragraph>
        )}
        {!current && <Text type="secondary">{meta.hint} Bấm "AI nhận xét" để tạo.</Text>}
      </Card>
    </Flex>
  );
};

/* ---------- Cài đặt: ngưỡng, nghi vấn, danh sách rà soát ---------- */
const SettingsDrawer: React.FC<{ open: boolean; onClose: () => void; m: Monitor }> = ({ open, onClose, m }) => (
  <Drawer title="Cài đặt giám sát" open={open} onClose={onClose} size={420}>
    <Flex vertical gap={16}>
      <MonitorTemplatesPanel m={m} />
      <Divider style={{ margin: 0 }} />

      {/* Danh sách rà soát: bấm ⭐ trên SV; dán tên chỉ khi đã có sẵn danh sách */}
      <Flex vertical gap={8}>
        <Text strong>⭐ Danh sách cần rà soát ({m.watchList.length} tên)</Text>
        <Text type="secondary">Bấm ☆ cạnh tên sinh viên trong danh sách hoặc trong chi tiết để thêm / bỏ.</Text>
        {m.rows.length > 0 && m.watchMissing.length > 0 && (
          <Alert type="warning" showIcon title={`Không tìm thấy ${m.watchMissing.length} tên trong các lớp đã tải`} description={m.watchMissing.join(', ')} />
        )}
        <Collapse
          size="small"
          items={[{
            key: 'paste',
            label: `Dán danh sách tên có sẵn (${m.watchList.length} tên đã nhận diện)`,
            children: (
              <Flex vertical gap={6}>
                <TextArea
                  rows={5}
                  value={m.watchText}
                  onChange={(e) => m.setWatchText(e.target.value)}
                  placeholder={'Mỗi dòng 1 tên (hoặc cách nhau dấu phẩy), vd:\nĐinh Quang Hào\nNguyễn Duy Đạt'}
                />
                <Flex justify="space-between" align="center">
                  <Text type="secondary">So khớp cả tên gõ không dấu.</Text>
                  <Tag color={m.watchList.length > 0 ? 'blue' : 'default'} style={{ margin: 0 }}>
                    {m.watchList.length} học viên
                  </Tag>
                </Flex>
              </Flex>
            )
          }]}
        />
      </Flex>
    </Flex>
  </Drawer>
);
