import React from 'react';
import { Card, Flex, Typography } from 'antd';
import { Bar, Column } from '@ant-design/plots';
import type { Distribution, DistributionBin, MonitorFilter, RiskLevel } from '~/src/core/studentMonitor';
import { RISK_LEVELS, STATUS_COLORS } from '~/src/core/studentMonitor';

const { Text } = Typography;

const RISK_COLORS: Record<RiskLevel, string> = {
  alarm: STATUS_COLORS.alarm, warning: STATUS_COLORS.warning, early: STATUS_COLORS.early, normal: '#d9d9d9'
};

const AXIS_TEXT = { labelFill: '#595959', labelFontSize: 12 };

/** Gắn sự kiện bấm vào 1 cột / 1 đoạn của biểu đồ (chỉ khi bấm trúng cột — có dữ liệu kèm theo). */
const onElementClick = (handler: (datum: any) => void) => (_chart: unknown, event: any) => {
  if (event?.type === 'click' && event.data?.data) handler(event.data.data);
};

const pct = (count: number, total: number) => (total ? `${Math.round((count / total) * 100)}%` : '');

/* ---------- Mức rủi ro: 1 thanh xếp chồng ---------- */
const RiskBar: React.FC<{ byRisk: Record<RiskLevel, number>; onPick: (level: MonitorFilter) => void }> = ({ byRisk, onPick }) => {
  const order: RiskLevel[] = ['alarm', 'warning', 'early', 'normal'];
  const data = order.map(level => ({ group: 'Lớp', level: RISK_LEVELS[level].label, key: level, count: byRisk[level] }));
  const total = order.reduce((s, l) => s + byRisk[l], 0) || 1;
  return (
    <Bar
      data={data}
      xField="group"
      yField="count"
      colorField="level"
      stack
      height={92}
      paddingRight={0}
      marginRight={0}
      insetRight={0}
      autoFit
      animate={false}
      scale={{
        color: { domain: order.map(l => RISK_LEVELS[l].label), range: order.map(l => RISK_COLORS[l]) },
        y: { domain: [0, total], nice: false }
      }}
      axis={false}
      legend={{ color: { position: 'top', layout: { justifyContent: 'flex-start' }, itemLabelFontSize: 12, itemMarker: 'square' } }}
      style={{ maxWidth: 28, inset: 1, radius: 4 }}
      label={{
        text: (d: any) => (d.count / total >= 0.08 ? String(d.count) : ''),
        position: 'inside',
        style: { fill: '#fff', fontSize: 12, fontWeight: 600 }
      }}
      tooltip={{ title: (d: any) => d.level, items: [(d: any) => ({ name: 'Số SV', value: `${d.count} (${pct(d.count, total)})` })] }}
      interaction={{ tooltip: { shared: false } }}
      onEvent={onElementClick((d) => { if (d.count) onPick(d.key as MonitorFilter); })}
    />
  );
};

/* ---------- Phân bố 1 chỉ số: cột theo khoảng ---------- */
const DistributionColumn: React.FC<{ dist: Distribution; onPick: (title: string, bin: DistributionBin) => void }> = ({ dist, onPick }) => {
  const max = Math.max(1, ...dist.bins.map(b => b.count));
  const total = dist.bins.reduce((sum, b) => sum + b.count, 0);
  return (
  <Card size="small" style={{ minWidth: 0 }} styles={{ body: { padding: '8px 12px 4px' } }}>
    <Flex justify="space-between" align="baseline" gap={8}>
      <Text strong>{dist.title}</Text>
      <Text type="secondary">{dist.subtitle}</Text>
    </Flex>
    <Column
      data={dist.bins}
      xField="label"
      yField="count"
      colorField="status"
      height={150}
      autoFit
      animate={false}
      scale={{
        color: { domain: Object.keys(STATUS_COLORS), range: Object.values(STATUS_COLORS) },
        y: { domain: [0, max * 1.25], nice: false }
      }}
      legend={false}
      axis={{ y: false, x: { title: false, tick: false, ...AXIS_TEXT } }}
      style={{ maxWidth: 24, radiusTopLeft: 4, radiusTopRight: 4 }}
      label={{ text: (d: DistributionBin) => (d.count ? String(d.count) : ''), position: 'top', textBaseline: 'bottom', dy: -4, fill: '#262626', fontSize: 12 }}
      tooltip={{ title: (d: DistributionBin) => `${dist.title}: ${d.label}`, items: [(d: DistributionBin) => ({ name: 'Số SV', value: `${d.count} (${pct(d.count, total)})` })] }}
      onEvent={onElementClick((d: DistributionBin) => onPick(dist.title, d))}
    />
  </Card>
  );
};

export const StudentMonitorCharts: React.FC<{
  byRisk: Record<RiskLevel, number>;
  distributions: Distribution[];
  onPickRisk: (level: MonitorFilter) => void;
  onPickBin: (title: string, bin: DistributionBin) => void;
}> = ({ byRisk, distributions, onPickRisk, onPickBin }) => (
  <Flex vertical gap={12} style={{ minWidth: 0 }}>
    <Card size="small" style={{ minWidth: 0 }} styles={{ body: { padding: '8px 12px 0' } }}>
      <Text strong>Mức rủi ro</Text>
      <RiskBar byRisk={byRisk} onPick={onPickRisk} />
    </Card>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
      {distributions.map(d => <DistributionColumn key={d.key} dist={d} onPick={onPickBin} />)}
    </div>
    <Text type="secondary">Bấm vào một cột để xem danh sách sinh viên trong khoảng đó.</Text>
  </Flex>
);
