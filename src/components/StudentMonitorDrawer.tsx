import React, { useEffect } from 'react';
import { Drawer, Button, Tag, Typography, Flex, Alert, Collapse, Descriptions, Table, Tooltip, Space } from 'antd';
import { LeftOutlined, RightOutlined, RobotOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import type { useStudentMonitor } from '~/src/hooks/student-monitor/useStudentMonitor';
import {
  MonitorRow, Issue, ExamCell, ExamCellKey, fmtPercent, fmtDate, examCellLabel, colorFor
} from '~/src/core/studentMonitor';
import { MonitorLevel, MetricKey, textOn, readableColor } from '~/src/core/monitorLevels';
import { TestColumn, ANALYSIS_LEVELS, fmtScore } from '~/src/core/examAnalysis';

const { Text } = Typography;

type Monitor = ReturnType<typeof useStudentMonitor>;

const DISCLAIMER = 'Nghi vấn chỉ là dấu hiệu cần rà soát (vd vấn đáp lại bài tập), không phải bằng chứng gian lận.';

/** Bật / tắt sinh viên trong danh sách cần rà soát — bấm, không cần gõ tên. */
export const WatchStar: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
  <Tooltip title={on ? 'Bỏ khỏi danh sách rà soát' : 'Thêm vào danh sách rà soát'}>
    <span
      role="button"
      aria-label={on ? 'Bỏ khỏi danh sách rà soát' : 'Thêm vào danh sách rà soát'}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      style={{ cursor: 'pointer', color: on ? '#faad14' : '#bfbfbf', padding: '0 4px' }}
    >
      {on ? <StarFilled /> : <StarOutlined />}
    </span>
  </Tooltip>
);

/** Nhãn 1 mức: mức vi phạm tô đặc, mức nhắc sớm tô nhạt, màu theo cấu hình. */
export const LevelTag: React.FC<{ level: Pick<MonitorLevel, 'name' | 'color' | 'violation'>; children?: React.ReactNode }> = ({ level, children }) => (
  <Tag
    style={{
      margin: 0,
      background: level.violation ? level.color : `${level.color}26`,
      color: level.violation ? textOn(level.color) : '#262626',
      borderColor: level.violation ? level.color : `${level.color}99`
    }}
  >
    {children ?? level.name}
  </Tag>
);

export const RiskTag: React.FC<{ row: MonitorRow }> = ({ row }) =>
  row.risk === 'normal' ? <Text type="secondary">{row.riskLevel.name}</Text> : <LevelTag level={row.riskLevel} />;

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
const IssueItem: React.FC<{ issue: Issue; early?: boolean }> = ({ issue, early }) => (
  <div style={{ borderLeft: `3px solid ${issue.color}`, background: '#fafafa', borderRadius: 4, padding: '8px 12px' }}>
    <Flex justify="space-between" align="center" gap={8}>
      <span><Text strong>{issue.title}: {issue.value}</Text> <Text type="secondary">· ngưỡng {issue.threshold}</Text></span>
      <LevelTag level={{ name: issue.levelName, color: issue.color, violation: !early }} />
    </Flex>
    {issue.action && <div>→ {early ? `Nhắc sớm: ${issue.action.charAt(0).toLowerCase()}${issue.action.slice(1)}` : issue.action}</div>}
  </div>
);

/* ---------- Thanh tỉ lệ có vạch ngưỡng (nghỉ học / thiếu bài tập) ---------- */
const Meter: React.FC<{ label: string; value: number | null; metric: MetricKey; levels: MonitorLevel[] }> = ({ label, value, metric, levels }) => {
  const marks = [...new Map(levels.filter(l => l.thresholds[metric] != null).map(l => [l.thresholds[metric] as number, l.color])).entries()]
    .map(([t, color]) => ({ t, color }));
  const max = Math.max(Math.max(1, ...marks.map(m => m.t)) * 1.3, value ?? 0);
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const v = value ?? 0;
  const color = colorFor(levels, metric, value) || '#1677ff';
  return (
    <Flex align="center" gap={12}>
      <Text style={{ width: 96, flexShrink: 0 }}>{label}</Text>
      <div style={{ flex: 1, position: 'relative', height: 30 }}>
        <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 8, background: '#f0f0f0', borderRadius: 4 }} />
        <div style={{ position: 'absolute', top: 6, left: 0, width: pos(v), height: 8, background: color, borderRadius: 4 }} />
        {marks.map(m => (
          <React.Fragment key={m.t}>
            <div style={{ position: 'absolute', top: 2, left: pos(m.t), width: 2, height: 16, background: m.color }} />
            <Text type="secondary" style={{ position: 'absolute', top: 16, left: pos(m.t), transform: 'translateX(-50%)', fontSize: 12 }}>{m.t}%</Text>
          </React.Fragment>
        ))}
      </div>
      <Text strong style={{ width: 64, textAlign: 'right', flexShrink: 0 }}>{fmtPercent(value)}</Text>
    </Flex>
  );
};

/* ---------- Bảng điểm thi 2×2 + điểm tổng hợp từng đợt ---------- */
const ExamValue: React.FC<{ value: ExamCell | number | null; levels: MonitorLevel[] }> = ({ value, levels }) => {
  if (value === 'absent') return <Text type="secondary">Vắng</Text>;
  if (value == null) return <Text type="secondary">—</Text>;
  const color = colorFor(levels, 'examScore', value);
  return color ? <Text strong style={{ color: readableColor(color) }}>{fmtScore(value)}</Text> : <Text>{fmtScore(value)}</Text>;
};

const ExamTable: React.FC<{ row: MonitorRow; levels: MonitorLevel[] }> = ({ row: r, levels }) => {
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
              {d.parts.map(p => <span key={p.label}><Text type="secondary">{p.label} </Text><ExamValue value={p.value} levels={levels} /></span>)}
            </Flex>
          )
        },
        {
          title: <Tooltip title="Theo công thức của môn trên QLĐT: Hackathon = 30% TN + 70% TL; cuối môn tự luận = 30% TN + 70% TL; cuối môn project = 70% sản phẩm + 30% kiến thức">Tổng</Tooltip>,
          key: 'total', align: 'right', render: (_, d) => <ExamValue value={d.total} levels={levels} />
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

  useEffect(() => {
    if (r && !r.exercises) m.loadStudentExercises(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.key, r?.exercises]);

  if (!r) return null;
  const levels = m.levels;
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
          <Flex gap={4} align="center" wrap>
            <WatchStar on={r.watch} onToggle={() => m.toggleWatch(r.name)} />
            <span>{r.name}</span>
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
          {r.issues.map(i => <IssueItem key={i.kind} issue={i} />)}
          {r.early.map(e => <IssueItem key={`early-${e.kind}`} issue={e} early />)}
        </Section>

        {/* 2. Chỉ số học tập */}
        <Section title="Chỉ số học tập">
          <Meter label="Nghỉ học" value={r.absentRate} metric="absent" levels={levels} />
          <Meter label="Thiếu bài tập" value={r.missingHomework} metric="homework" levels={levels} />
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
          <ExamTable row={r} levels={levels} />
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

        {/* 4. Bài tập về nhà + điểm AI của hệ thống (tự tải khi mở) */}
        <Collapse
          size="small"
          items={[{
            key: 'exercises',
            label: m.exerciseLoading.has(r.key) ? 'Bài tập về nhà — đang tải…'
              : r.exercises ? `Bài tập về nhà — ${r.exercises.length} bài · điểm AI TB ${fmtScore(r.aiAvg)}`
              : 'Bài tập về nhà — chưa tải được',
            children: r.exercises ? (
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
            ) : <Text type="secondary">{m.exerciseLoading.has(r.key) ? 'Đang tải…' : 'Không tải được bài tập của sinh viên này.'}</Text>
          }]}
        />

        {/* 5. Nghi vấn BTVN (thu gọn) */}
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
                </Flex>
              )
            }]}
          />
        )}

        {/* 6. Liên hệ */}
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
