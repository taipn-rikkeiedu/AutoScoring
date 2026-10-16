import React, { useEffect, useState } from 'react';
import { Drawer, Button, Tag, Typography, Flex, Alert, Descriptions, Table, Tooltip, Space, Tabs, Popover } from 'antd';
import {
  LeftOutlined, RightOutlined, RobotOutlined, StarFilled, StarOutlined, CheckCircleFilled, CopyOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { AiResult } from '~/src/hooks/student-monitor/useStudentMonitor';
import { useToast } from '~/src/core/ToastContext';
import { StudentAttendancePanel } from '~/src/components/StudentAttendancePanel';
import type { useStudentMonitor } from '~/src/hooks/student-monitor/useStudentMonitor';
import {
  MonitorRow, Issue, ExamCell, ExamCellKey, fmtPercent, fmtDate, examCellLabel, colorFor
} from '~/src/core/studentMonitor';
import { MonitorLevel, textOn, readableColor } from '~/src/core/monitorLevels';
import { TestColumn, ANALYSIS_LEVELS, fmtScore } from '~/src/core/examAnalysis';

const { Text, Paragraph } = Typography;

type Monitor = ReturnType<typeof useStudentMonitor>;

const DISCLAIMER = 'Nghi vấn chỉ là dấu hiệu cần rà soát (vd vấn đáp lại bài tập), không phải bằng chứng gian lận.';

/** Bật / tắt sinh viên trong danh sách cần rà soát — bấm hoặc dùng phím Enter/Space, hit area chuẩn WCAG 2.2. */
export const WatchStar: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
  <Tooltip title={on ? 'Bỏ khỏi danh sách rà soát' : 'Thêm vào danh sách rà soát'}>
    <button
      type="button"
      role="button"
      aria-label={on ? 'Bỏ khỏi danh sách rà soát' : 'Thêm vào danh sách rà soát'}
      aria-pressed={on}
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
      style={{
        cursor: 'pointer',
        color: on ? '#faad14' : '#bfbfbf',
        background: on ? '#fffbe6' : 'transparent',
        border: on ? '1px solid #ffe58f' : '1px solid transparent',
        borderRadius: '50%',
        width: 26,
        height: 26,
        minWidth: 26,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        marginRight: 6,
        verticalAlign: 'middle',
        transition: 'all 0.2s ease',
        outline: 'none'
      }}
      className="hover:scale-110 hover:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      {on ? <StarFilled style={{ fontSize: 13 }} /> : <StarOutlined style={{ fontSize: 13 }} />}
    </button>
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
  </div>
);

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

/**
 * Nút AI nhận xét gọn: trạng thái nằm ngay trên nút (đang viết → xong màu xanh → lỗi màu đỏ),
 * nội dung nhận xét mở trong khung nổi thay vì chiếm chỗ trong trang. Tạo xong lần đầu thì tự mở.
 */
const AiCommentButton: React.FC<{ ai?: AiResult; onRun: () => void }> = ({ ai, onRun }) => {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (ai?.text && !ai.loading) setOpen(true); }, [ai?.text, ai?.loading]);

  if (ai?.loading) return <Button size="small" icon={<RobotOutlined />} loading>Đang viết…</Button>;
  if (ai?.error) {
    return (
      <Tooltip title={`${ai.error} — bấm để thử lại`}>
        <Button size="small" danger icon={<ReloadOutlined />} onClick={onRun}>AI lỗi · thử lại</Button>
      </Tooltip>
    );
  }
  if (!ai?.text) return <Button size="small" icon={<RobotOutlined />} onClick={onRun}>AI nhận xét</Button>;

  const copy = () => navigator.clipboard.writeText(ai.text!)
    .then(() => showToast('Đã sao chép nhận xét AI.', 'success'))
    .catch(() => showToast('Không sao chép được — kiểm tra quyền Clipboard.', 'error'));
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      title={
        <Flex justify="space-between" align="center" gap={12}>
          <span>Nhận xét AI</span>
          <Space size={4}>
            <Button size="small" icon={<CopyOutlined />} onClick={copy}>Sao chép</Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => { setOpen(false); onRun(); }}>Tạo lại</Button>
          </Space>
        </Flex>
      }
      content={<div style={{ width: 380, maxWidth: '80vw', maxHeight: 320, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{ai.text}</div>}
    >
      <Button size="small" icon={<CheckCircleFilled />} style={{ color: '#389e0d', borderColor: '#b7eb8f', background: '#f6ffed' }}>
        Xem nhận xét AI
      </Button>
    </Popover>
  );
};

/* ---------- Ô chỉ số nhanh ở đầu chi tiết: giá trị lớn, tô màu theo mức nếu chạm ngưỡng ---------- */
const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }> = ({ label, value, sub, color }) => (
  <div style={{ padding: '8px 10px', borderRadius: 8, background: color ? `${color}12` : '#fafafa', border: `1px solid ${color ? `${color}55` : '#f0f0f0'}`, minWidth: 0 }}>
    <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap' }}>{label}</Text>
    <Text strong style={{ fontSize: 16, lineHeight: '24px', color: color ? readableColor(color) : undefined, whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Text>
    {sub && <Text type="secondary" style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</Text>}
  </div>
);

const examText = (v: ExamCell | number | null) => (v === 'absent' ? 'Vắng' : v == null ? '—' : fmtScore(v));

export type DrawerTab = 'issues' | 'attendance' | 'exam' | 'homework' | 'contact';

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
  // Giữ tab đang xem khi chuyển sang SV khác (vd duyệt điểm danh cả lớp)
  const [tab, setTab] = useState<DrawerTab>('issues');

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
  const att = m.attendanceOf(r);
  const abs = r.absence;

  const issuesTab = (
    <Flex vertical gap={8}>
      <Flex justify="space-between" align="center">
        <Text type="secondary">{problems ? `${problems} chỉ số chạm ngưỡng, nặng nhất trước` : 'Không có vấn đề cần xử lý.'}</Text>
        <AiCommentButton ai={ai} onRun={() => m.handleStudentAi(r)} />
      </Flex>
      {r.issues.map(i => <IssueItem key={i.kind} issue={i} />)}
      {r.early.map(e => <IssueItem key={`early-${e.kind}`} issue={e} early />)}
      {hasSuspicion && (
        <Alert
          type="warning"
          showIcon
          title={`Nghi vấn BTVN — ${r.suspect ? ANALYSIS_LEVELS[r.level].label : 'trùng link bài nộp'}`}
          description={<span>Xem chi tiết ở tab <a onClick={() => setTab('homework')}>Bài tập</a>.</span>}
        />
      )}
    </Flex>
  );

  const examTab = (
    <Flex vertical gap={12}>
      <ExamTable row={r} levels={levels} />
      {r.makeupNotes.map(note => <Alert key={note} type="info" showIcon title={note} />)}
      {tests.length > 0 && (
        <Flex vertical gap={10}>
          <Text strong>Nhận xét của giảng viên chấm ({tests.length})</Text>
          {tests.map((t, i) => (
            <div key={i} style={{ background: '#fafafa', borderRadius: 6, padding: '8px 10px' }}>
              <Flex justify="space-between" gap={8}>
                <Text strong>{t.name}</Text>
                {t.absent ? <Text type="secondary">Vắng thi</Text> : <Text>{fmtScore(t.point)}</Text>}
              </Flex>
              {t.comment && <Paragraph style={{ whiteSpace: 'pre-wrap', color: '#595959', margin: '4px 0 0' }} ellipsis={{ rows: 4, expandable: 'collapsible' }}>{t.comment}</Paragraph>}
              {t.link && <a href={t.link} target="_blank" rel="noopener noreferrer">Mở bài làm</a>}
            </div>
          ))}
        </Flex>
      )}
    </Flex>
  );

  const homeworkTab = (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="baseline">
        <Text strong>Bài tập về nhà</Text>
        <Text type="secondary">
          {m.exerciseLoading.has(r.key) ? 'Đang tải…' : r.exercises ? `${r.exercises.length} bài · nộp ${fmtPercent(r.hw)} · điểm AI TB ${fmtScore(r.aiAvg)}` : ''}
        </Text>
      </Flex>
      {r.exercises ? (
        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => String(i)}
          dataSource={r.exercises}
          columns={[
            { title: 'Bài tập', dataIndex: 'title', ellipsis: true },
            { title: 'Điểm AI', key: 'ai', width: 80, align: 'right', render: (_, e) => fmtScore(e.ai) },
            { title: '', key: 'link', width: 70, render: (_, e) => e.link ? <a href={e.link} target="_blank" rel="noopener noreferrer">mở link</a> : null }
          ]}
        />
      ) : <Text type="secondary">{m.exerciseLoading.has(r.key) ? 'Đang tải…' : 'Không tải được bài tập của sinh viên này.'}</Text>}
      {hasSuspicion && (
        <Flex vertical gap={6} style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: '8px 10px' }}>
          <Text strong>Nghi vấn BTVN — {r.suspect ? ANALYSIS_LEVELS[r.level].label : 'trùng link bài nộp'}</Text>
          <Text type="secondary">{DISCLAIMER}</Text>
          {r.reasons.length > 0 && <ul style={{ margin: 0, paddingLeft: 20 }}>{r.reasons.map(x => <li key={x}>{x}</li>)}</ul>}
          {r.dups.map((d, i) => (
            <div key={i}>{d.what} (<a href={d.link} target="_blank" rel="noopener noreferrer">mở link</a>) trùng với {d.others.join(', ')}</div>
          ))}
          <Text>→ Vấn đáp lại 1–2 bài tập đã nộp để xác minh.</Text>
        </Flex>
      )}
    </Flex>
  );

  const contactTab = (
    <Descriptions
      size="small"
      column={1}
      bordered
      items={[
        { key: 'code', label: 'MSSV', children: <Text copyable>{r.code}</Text> },
        { key: 'phone', label: 'SĐT', children: r.phone ? <Text copyable>{r.phone}</Text> : '—' },
        { key: 'email', label: 'Email', children: r.email ? <Text copyable>{r.email}</Text> : '—' },
        { key: 'dob', label: 'Ngày sinh', children: fmtDate(r.dateOfBirth) },
        { key: 'class', label: 'Lớp', children: r.classLabel }
      ]}
    />
  );

  return (
    <Drawer
      open
      onClose={onClose}
      size={560}
      styles={{ body: { paddingTop: 12 } }}
      title={
        <Flex vertical>
          <Flex gap={4} align="center" wrap>
            <WatchStar on={r.watch} onToggle={() => m.toggleWatch(r.name)} />
            <span>{r.name}</span>
            <RiskTag row={r} />
          </Flex>
          <Text type="secondary" style={{ fontWeight: 'normal', fontSize: 13 }}>
            {r.code} · {r.classLabel}{r.phone ? <> · <Text type="secondary" copyable={{ text: r.phone }}>{r.phone}</Text></> : null}
          </Text>
        </Flex>
      }
      extra={
        <Space size={4} align="center">
          <Text type="secondary" style={{ fontSize: 12 }}>{index + 1}/{total}</Text>
          <Tooltip title="Sinh viên trước (phím ←)"><Button icon={<LeftOutlined />} onClick={onPrev} disabled={index <= 0} /></Tooltip>
          <Tooltip title="Sinh viên sau (phím →)"><Button icon={<RightOutlined />} onClick={onNext} disabled={index >= total - 1} /></Tooltip>
        </Space>
      }
    >
      <Flex vertical gap={12}>
        {/* Chỉ số nhanh: nhìn 1 lần là biết SV đang có vấn đề ở đâu */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
          <Kpi
            label="Nghỉ học"
            value={fmtPercent(r.absentRate)}
            sub={abs ? `${abs.absentDays} buổi${abs.maxStreak >= 2 ? ` · LT ${abs.maxStreak}` : ''}` : undefined}
            color={colorFor(levels, 'absent', r.absentRate) || (abs ? colorFor(levels, 'absentStreak', abs.maxStreak) : undefined)}
          />
          <Kpi label="Thiếu bài tập" value={fmtPercent(r.missingHomework)} color={colorFor(levels, 'homework', r.missingHomework)} />
          <Kpi label="Chậm E-learning" value={r.unprepared == null ? '—' : `${r.unprepared} bài`} color={colorFor(levels, 'elearning', r.unprepared)} />
          <Kpi label="R-Point" value={r.rpoints ?? '—'} color={colorFor(levels, 'rpoints', r.rpoints)} />
          <Kpi
            label="Điểm thi"
            value={`HK ${examText(r.absentPhases.includes('hk') ? 'absent' : r.hk)}`}
            sub={`CK ${examText(r.absentPhases.includes('ck') ? 'absent' : r.ck)}`}
            color={r.issues.find(i => i.kind === 'examScore' || i.kind === 'examAbsent')?.color}
          />
        </div>

        <Tabs
          size="small"
          activeKey={tab}
          onChange={(k) => setTab(k as DrawerTab)}
          items={[
            { key: 'issues', label: `Cần xử lý${problems ? ` (${problems})` : ''}`, children: issuesTab },
            {
              key: 'attendance',
              label: `Điểm danh${abs?.absentDays ? ` (${abs.absentDays} nghỉ)` : ''}`,
              children: <StudentAttendancePanel cls={att?.cls || null} s={att?.s || null} />
            },
            { key: 'exam', label: 'Điểm thi', children: examTab },
            { key: 'homework', label: hasSuspicion ? 'Bài tập ⚠' : 'Bài tập', children: homeworkTab },
            { key: 'contact', label: 'Liên hệ', children: contactTab }
          ]}
        />
      </Flex>
    </Drawer>
  );
};
