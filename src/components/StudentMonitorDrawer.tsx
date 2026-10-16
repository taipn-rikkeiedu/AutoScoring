import React, { useEffect } from 'react';
import { Drawer, Button, Tag, Typography, Flex, Alert, Collapse, Descriptions, Table, Tooltip, Space } from 'antd';
import { LeftOutlined, RightOutlined, RobotOutlined } from '@ant-design/icons';
import type { useStudentMonitor } from '~/src/hooks/student-monitor/useStudentMonitor';
import {
  MonitorRow, MonitorRules, ExamCell, ExamCellKey, RISK_LEVELS, STATUS_COLORS, fmtPercent, fmtDate, examCellLabel
} from '~/src/core/studentMonitor';
import { TestColumn, ANALYSIS_LEVELS, fmtScore } from '~/src/core/examAnalysis';

const { Text } = Typography;

type Monitor = ReturnType<typeof useStudentMonitor>;

const DISCLAIMER = 'Nghi vấn chỉ là dấu hiệu cần rà soát (vd vấn đáp lại bài tập), không phải bằng chứng gian lận.';

const SEVERITY_TAG: Record<'alarm' | 'warning' | 'early', { label: string; color: string }> = {
  alarm: { label: 'Báo động', color: 'red' },
  warning: { label: 'Cảnh báo', color: 'orange' },
  early: { label: 'Sắp vượt', color: 'gold' }
};

export const RiskTag: React.FC<{ row: MonitorRow }> = ({ row }) => {
  const label = RISK_LEVELS[row.risk].label;
  if (row.risk === 'alarm') return <Tag color="#cf1322" variant="solid">{label}</Tag>;
  if (row.risk === 'warning') return <Tag color="orange" variant="solid">{label}</Tag>;
  if (row.risk === 'early') return <Tag color="gold" variant="filled">{label}</Tag>;
  return <Text type="secondary">{label}</Text>;
};

const Section: React.FC<{ title: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }> = ({ title, extra, children }) => (
  <Flex vertical gap={8}>
    <Flex justify="space-between" align="center" gap={8}>
      <Text strong style={{ fontSize: 15 }}>{title}</Text>
      {extra}
    </Flex>
    {children}
  </Flex>
);

/* ---------- 1 vấn đề: tên + giá trị so với ngưỡng, hành động ngay bên dưới ---------- */
const IssueItem: React.FC<{ severity: 'alarm' | 'warning' | 'early'; title: string; value: string; threshold: string; action: string }> =
  ({ severity, title, value, threshold, action }) => {
    const sev = SEVERITY_TAG[severity];
    const color = severity === 'early' ? STATUS_COLORS.early : severity === 'alarm' ? STATUS_COLORS.alarm : STATUS_COLORS.warning;
    return (
      <div style={{ borderLeft: `3px solid ${color}`, background: '#fafafa', borderRadius: 4, padding: '8px 12px' }}>
        <Flex justify="space-between" align="center" gap={8}>
          <span><Text strong>{title}: {value}</Text> <Text type="secondary">· ngưỡng {threshold}</Text></span>
          <Tag color={sev.color} variant="filled" style={{ margin: 0, flexShrink: 0 }}>{sev.label}</Tag>
        </Flex>
        <div>→ {action}</div>
      </div>
    );
  };

/* ---------- Thanh tỉ lệ có vạch ngưỡng (nghỉ học / thiếu bài tập) ---------- */
const Meter: React.FC<{ label: string; value: number | null; warn: number; alarm: number }> = ({ label, value, warn, alarm }) => {
  const max = Math.max(alarm * 1.5, value ?? 0);
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const v = value ?? 0;
  const color = v > alarm ? STATUS_COLORS.alarm : v >= warn ? STATUS_COLORS.warning : '#1677ff';
  return (
    <Flex align="center" gap={12}>
      <Text style={{ width: 96, flexShrink: 0 }}>{label}</Text>
      <div style={{ flex: 1, position: 'relative', height: 30 }}>
        <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 8, background: '#f0f0f0', borderRadius: 4 }} />
        <div style={{ position: 'absolute', top: 6, left: 0, width: pos(v), height: 8, background: color, borderRadius: 4 }} />
        {[warn, alarm].map(t => (
          <React.Fragment key={t}>
            <div style={{ position: 'absolute', top: 2, left: pos(t), width: 1, height: 16, background: '#8c8c8c' }} />
            <Text type="secondary" style={{ position: 'absolute', top: 16, left: pos(t), transform: 'translateX(-50%)', fontSize: 12 }}>{t}%</Text>
          </React.Fragment>
        ))}
      </div>
      <Text strong style={{ width: 64, textAlign: 'right', flexShrink: 0 }}>{fmtPercent(value)}</Text>
    </Flex>
  );
};

/* ---------- Bảng điểm thi 2×2 + điểm tổng hợp từng đợt ---------- */
const ExamValue: React.FC<{ value: ExamCell | number | null; rules: MonitorRules }> = ({ value, rules }) => {
  if (value === 'absent') return <Text type="secondary">Vắng</Text>;
  if (value == null) return <Text type="secondary">—</Text>;
  if (value < rules.examPass) return <Text type="danger" strong>{fmtScore(value)}</Text>;
  if (value <= rules.earlyExamTo) return <Text type="warning" strong>{fmtScore(value)}</Text>;
  return <Text>{fmtScore(value)}</Text>;
};

const ExamTable: React.FC<{ row: MonitorRow; rules: MonitorRules }> = ({ row: r, rules }) => {
  const parts = (a: ExamCellKey, b: ExamCellKey) => [
    { label: examCellLabel(r, a).replace(/^(HK|CK) /, ''), value: r[a] },
    { label: examCellLabel(r, b).replace(/^(HK|CK) /, ''), value: r[b] }
  ];
  const data = [
    { key: 'hk', phase: 'Hackathon', parts: parts('hkTNCell', 'hkTLCell'), total: r.absentPhases.includes('hk') ? 'absent' as const : r.hk },
    {
      key: 'ck', phase: r.examType === 'PROJECT' ? 'Cuối môn (project)' : 'Cuối môn',
      parts: parts('ckTNCell', 'ckTLCell'), total: r.absentPhases.includes('ck') ? 'absent' as const : r.ck
    }
  ];
  return (
    <Table
      size="small"
      bordered
      pagination={false}
      dataSource={data}
      columns={[
        { title: 'Đợt thi', dataIndex: 'phase', key: 'phase' },
        {
          title: 'Thành phần', key: 'parts',
          render: (_, d) => (
            <Flex gap={16} wrap>
              {d.parts.map(p => <span key={p.label}><Text type="secondary">{p.label} </Text><ExamValue value={p.value} rules={rules} /></span>)}
            </Flex>
          )
        },
        {
          title: <Tooltip title="Theo công thức của môn trên QLĐT: Hackathon = 30% TN + 70% TL; cuối môn tự luận = 30% TN + 70% TL; cuối môn project = 70% sản phẩm + 30% kiến thức">Tổng</Tooltip>,
          key: 'total', align: 'right', render: (_, d) => <ExamValue value={d.total} rules={rules} />
        }
      ]}
    />
  );
};

export const StudentMonitorDrawer: React.FC<{
  row: MonitorRow | null;
  index: number;
  total: number;
  testCols: TestColumn[];
  m: Monitor;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}> = ({ row: r, index, total, testCols, m, onPrev, onNext, onClose }) => {
  // Phím ← → để chuyển sinh viên khi đang mở
  useEffect(() => {
    if (!r) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [r, onPrev, onNext]);

  if (!r) return null;
  const rules = m.monitorRules;
  const ai = m.studentAi[r.key];
  const tests = testCols.map(c => r.tests[c.key]).filter(t => t && (t.comment || t.link));
  const problems = r.issues.length + r.early.length;
  const hasSuspicion = r.suspect || r.dups.length > 0;

  return (
    <Drawer
      open
      onClose={onClose}
      size={540}
      title={
        <Flex vertical>
          <Flex gap={8} align="center" wrap>
            <span>{r.watch && '⭐ '}{r.name}</span>
            <RiskTag row={r} />
          </Flex>
          <Text type="secondary" style={{ fontWeight: 'normal' }}>{r.code} · {r.classLabel}</Text>
        </Flex>
      }
      extra={
        <Space size={4}>
          <Text type="secondary">{index + 1}/{total}</Text>
          <Tooltip title="Sinh viên trước (←)"><Button icon={<LeftOutlined />} onClick={onPrev} disabled={index <= 0} /></Tooltip>
          <Tooltip title="Sinh viên sau (→)"><Button icon={<RightOutlined />} onClick={onNext} disabled={index >= total - 1} /></Tooltip>
        </Space>
      }
    >
      <Flex vertical gap={24}>
        {/* 1. Cần xử lý: vấn đề + hành động đi kèm */}
        <Section
          title={problems ? `Cần xử lý (${problems})` : 'Cần xử lý'}
          extra={<Button size="small" icon={<RobotOutlined />} onClick={() => m.handleStudentAi(r)} loading={ai?.loading}>AI nhận xét</Button>}
        >
          {ai?.error && <Alert type="error" showIcon title={ai.error} />}
          {ai?.text && <Alert type="info" title={<span style={{ whiteSpace: 'pre-wrap' }}>{ai.text}</span>} />}
          {problems === 0 && <Text type="secondary">Không có vấn đề cần xử lý.</Text>}
          {r.issues.map(i => <IssueItem key={i.kind} severity={i.severity} title={i.title} value={i.value} threshold={i.threshold} action={i.action} />)}
          {r.early.map(e => <IssueItem key={`early-${e.kind}`} severity="early" title={e.title} value={e.value} threshold={e.threshold} action={e.action} />)}
        </Section>

        {/* 2. Chỉ số học tập */}
        <Section title="Chỉ số học tập">
          <Meter label="Nghỉ học" value={r.absentRate} warn={rules.absentWarn} alarm={rules.absentAlarm} />
          <Meter label="Thiếu bài tập" value={r.missingHomework} warn={rules.homeworkWarn} alarm={rules.homeworkAlarm} />
          <Descriptions
            size="small"
            column={3}
            items={[
              { key: 'el', label: 'Chậm E-learning', children: r.unprepared == null ? '—' : `${r.unprepared} bài` },
              { key: 'rp', label: 'R-Points', children: r.rpoints ?? '—' },
              { key: 'ai', label: 'Điểm AI BT TB', children: fmtScore(r.aiAvg) }
            ]}
          />
        </Section>

        {/* 3. Điểm thi + nhận xét của GV chấm */}
        <Section title="Điểm thi">
          <ExamTable row={r} rules={rules} />
          {r.makeupNotes.map(note => <Alert key={note} type="info" showIcon title={note} />)}
          {tests.length > 0 && (
            <Collapse
              size="small"
              items={[{
                key: 'comments',
                label: `Nhận xét của giảng viên chấm (${tests.length})`,
                children: (
                  <Flex vertical gap={12}>
                    {tests.map((t, i) => (
                      <div key={i}>
                        <Flex justify="space-between" gap={8}>
                          <Text strong>{t.name}</Text>
                          {t.absent ? <Text type="secondary">Vắng thi</Text> : <Text>{fmtScore(t.point)}</Text>}
                        </Flex>
                        {t.comment && <div style={{ whiteSpace: 'pre-wrap', color: '#595959', marginTop: 4 }}>{t.comment}</div>}
                        {t.link && <a href={t.link} target="_blank" rel="noopener noreferrer">Mở bài làm</a>}
                      </div>
                    ))}
                  </Flex>
                )
              }]}
            />
          )}
        </Section>

        {/* 4. Nghi vấn BTVN (thu gọn) */}
        {hasSuspicion && (
          <Collapse
            size="small"
            items={[{
              key: 'suspect',
              label: <span>Nghi vấn BTVN — {r.suspect ? ANALYSIS_LEVELS[r.level].label : 'trùng link bài nộp'}</span>,
              children: (
                <Flex vertical gap={8}>
                  <Text type="secondary">{DISCLAIMER}</Text>
                  {r.reasons.length > 0 && <ul style={{ margin: 0, paddingLeft: 20 }}>{r.reasons.map(x => <li key={x}>{x}</li>)}</ul>}
                  {r.dups.map((d, i) => (
                    <div key={i}>{d.what} (<a href={d.link} target="_blank" rel="noopener noreferrer">mở link</a>) trùng với {d.others.join(', ')}</div>
                  ))}
                  <Text type="secondary">→ Vấn đáp lại 1–2 bài tập đã nộp để xác minh.</Text>
                  {r.exercises && (
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
                  )}
                </Flex>
              )
            }]}
          />
        )}

        {/* 5. Liên hệ */}
        <Section title="Liên hệ">
          <Descriptions
            size="small"
            column={1}
            items={[
              { key: 'code', label: 'MSSV', children: <Text copyable>{r.code}</Text> },
              { key: 'email', label: 'Email', children: r.email ? <Text copyable>{r.email}</Text> : '—' },
              { key: 'phone', label: 'SĐT', children: r.phone ? <Text copyable>{r.phone}</Text> : '—' },
              { key: 'dob', label: 'Ngày sinh', children: fmtDate(r.dateOfBirth) },
              { key: 'class', label: 'Lớp', children: r.classLabel }
            ]}
          />
        </Section>
      </Flex>
    </Drawer>
  );
};
