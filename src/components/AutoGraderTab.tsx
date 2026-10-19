import React, { useEffect, useMemo, useState } from 'react';
import {
  Table, Button, Tag, Dropdown, Card, Select, Progress, Space, Typography, Tooltip, Empty, Flex, Input, Drawer, Alert,
  Collapse, Popover, Segmented, ConfigProvider, Modal
} from 'antd';
import type { TableColumnsType, MenuProps } from 'antd';
import {
  CloudDownloadOutlined, CopyOutlined, FileTextOutlined, TableOutlined, SyncOutlined, GithubOutlined, SearchOutlined,
  ThunderboltOutlined, SettingOutlined, LeftOutlined, RightOutlined, DownOutlined, StopOutlined, ReloadOutlined, RobotOutlined, BarChartOutlined
} from '@ant-design/icons';
import { useBatchGrader } from '~/src/hooks/auto-grader/useBatchGrader';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { QldtDiagnoseButton } from './QldtDiagnoseButton';
import { extractComment } from '~/src/core/utils';
import {
  BatchItem, BatchStudent, NOT_SUBMITTED_FILTER, criteriaOf, formatSessionStats, studentAverage
} from '~/src/core/batchGrading';

const { Text, Paragraph } = Typography;
type Grader = ReturnType<typeof useBatchGrader>;

const STRICTNESS = [
  { value: 'Dễ dãi, bỏ qua lỗi nhỏ', label: 'Dễ' },
  { value: 'Bình thường', label: 'Chuẩn' },
  { value: 'Rất khắt khe, trừ điểm nặng mọi lỗi nhỏ', label: 'Khắt khe' }
];

/** "ĐANG CHỜ KIỂM TRA" → "Đang chờ kiểm tra". */
const sentenceCase = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);
const statusColor = (s: string) =>
  /^HOÀN THÀNH$/i.test(s) ? 'green' : /CHƯA/i.test(s) ? 'orange' : /CHỜ/i.test(s) ? 'blue' : 'default';
/** Nhãn ngắn cho ô lọc: "ĐANG CHỜ KIỂM TRA" → "Chờ kiểm tra". */
const shortStatus = (s: string) => sentenceCase(s.replace(/^ĐANG\s+/i, ''));
/** Nhận xét để hiển thị: bỏ thẻ <score> nếu báo cáo không theo mẫu. */
const commentOf = (report?: string) =>
  (extractComment(report || '') || report || '').replace(/<score>[\s\S]*?<\/score>/gi, '').trim();
/** Bỏ tiền tố "[Bài tập]" lặp lại ở mọi đề. */
const cleanTitle = (t: string) => t.replace(/^\s*\[[^\]]*\]\s*/, '') || t;
const shortLink = (url: string) => url.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/^https?:\/\//, '');
const isGradeable = (i: BatchItem) => !!i.link && i.status !== 'success';
const isBusy = (i: BatchItem) => i.status === 'downloading' || i.status === 'grading';

/** Màu điểm theo tỉ lệ thang: ≥ 80% xanh, ≥ 50% vàng, còn lại đỏ. */
const scoreTone = (score: string | null | undefined, scale: string) => {
  const ratio = parseFloat(score || '0') / (parseFloat(scale) || 10);
  return ratio >= 0.8 ? { color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f' }
    : ratio >= 0.5 ? { color: '#d48806', bg: '#fffbe6', border: '#ffe58f' }
      : { color: '#cf1322', bg: '#fff1f0', border: '#ffa39e' };
};

/* ---------- Ô tình trạng 1 bài: cùng kích thước, màu theo tình trạng ---------- */
const ItemCell: React.FC<{ item: BatchItem; scale: string }> = ({ item, scale }) => {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    width: 72, height: 24, borderRadius: 4, fontSize: 12, border: '1px solid', whiteSpace: 'nowrap'
  };
  let style: React.CSSProperties;
  let content: React.ReactNode;
  if (!item.link) {
    style = { ...base, color: '#bfbfbf', borderColor: '#f0f0f0', borderStyle: 'dashed' };
    content = 'Chưa nộp';
  } else if (isBusy(item)) {
    style = { ...base, color: '#1677ff', background: '#e6f4ff', borderColor: '#91caff' };
    content = <><SyncOutlined spin /> Đang chấm</>;
  } else if (item.status === 'error') {
    style = { ...base, color: '#cf1322', background: '#fff1f0', borderColor: '#ffa39e' };
    content = 'Lỗi';
  } else if (item.status === 'success') {
    const tone = scoreTone(item.score, scale);
    style = { ...base, color: tone.color, background: tone.bg, borderColor: tone.border, fontWeight: 600, fontSize: 13 };
    content = item.score;
  } else {
    style = { ...base, color: '#595959', borderColor: '#d9d9d9' };
    content = 'Chưa chấm';
  }
  return (
    <Tooltip title={<>{cleanTitle(item.title)}{item.status === 'error' && item.error ? <><br />{item.error}</> : null}</>}>
      <span style={style}>{content}</span>
    </Tooltip>
  );
};

export const AutoGraderTab: React.FC = () => {
  const g = useBatchGrader();
  const { gradingScale, setGradingScale, strictnessLevel, setStrictnessLevel } = useSettings();
  const [openId, setOpenId] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const busy = g.loading || !!g.grading;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: g.statusText }));
    return () => { window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null })); };
  }, [g.statusText]);

  // Cột bài: theo thứ tự đề của buổi
  const homework = useMemo(() => {
    const seen = new Map<string, string>();
    g.students.forEach(s => s.items.forEach(i => { if (!seen.has(i.homeworkId)) seen.set(i.homeworkId, i.title); }));
    return [...seen.entries()].map(([id, title], n) => ({ id, title, label: `Bài ${n + 1}` }));
  }, [g.students]);

  const stats = useMemo(() => {
    const items = g.students.flatMap(s => s.items);
    const submitted = items.filter(i => i.link);
    return {
      students: g.students.length,
      submitted: submitted.length,
      graded: submitted.filter(i => i.status === 'success').length,
      errors: submitted.filter(i => i.status === 'error').length,
      toGrade: submitted.filter(i => i.status !== 'success').length,
      missing: items.length - submitted.length
    };
  }, [g.students]);

  // Chọn theo SV = chấm các bài chưa chấm (hoặc lỗi) của SV đó
  const gradeableKeys = (s: BatchStudent) => s.items.filter(isGradeable).map(i => i.key);
  const selectedStudentIds = g.visibleStudents
    .filter(s => { const keys = gradeableKeys(s); return keys.length > 0 && keys.every(k => g.checked.has(k)); })
    .map(s => s.studentId);
  const setStudentSelection = (ids: React.Key[]) => {
    const want = new Set(ids.map(String));
    g.setChecked(prev => {
      const next = new Set(prev);
      g.visibleStudents.forEach(s => gradeableKeys(s).forEach(k => (want.has(s.studentId) ? next.add(k) : next.delete(k))));
      return next;
    });
  };

  const openIndex = openId ? g.visibleStudents.findIndex(s => s.studentId === openId) : -1;
  const openStudent = openIndex >= 0 ? g.visibleStudents[openIndex] : null;

  const columns: TableColumnsType<BatchStudent> = [
    {
      title: 'Sinh viên',
      key: 'name',
      fixed: 'left',
      width: 190,
      ellipsis: true,
      render: (_, s) => (
        <Flex vertical style={{ minWidth: 0 }}>
          <Text strong ellipsis>{s.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{s.code}</Text>
        </Flex>
      )
    },
    {
      title: 'Trạng thái buổi',
      key: 'status',
      width: 150,
      render: (_, s) => <Tag color={statusColor(s.status)} style={{ margin: 0 }}>{sentenceCase(s.status) || 'Chưa có'}</Tag>
    },
    ...homework.map(h => ({
      title: <Tooltip title={cleanTitle(h.title)}><span style={{ cursor: 'help', borderBottom: '1px dotted #bfbfbf' }}>{h.label}</span></Tooltip>,
      key: h.id,
      width: 88,
      align: 'center' as const,
      render: (_: unknown, s: BatchStudent) => {
        const item = s.items.find(i => i.homeworkId === h.id);
        return item ? <ItemCell item={item} scale={g.scale} /> : null;
      }
    })),
    {
      title: 'TB',
      key: 'avg',
      width: 56,
      align: 'center',
      render: (_, s) => {
        const avg = studentAverage(s);
        return avg != null ? <Text strong>{avg}</Text> : <Text type="secondary">—</Text>;
      }
    }
  ];

  const copyMenu: MenuProps['items'] = [
    { key: 'detailed', icon: <FileTextOutlined />, label: 'Báo cáo theo sinh viên', onClick: () => g.handleCopyReport('detailed') },
    { key: 'tsv', icon: <TableOutlined />, label: 'Bảng Excel / Google Sheets', onClick: () => g.handleCopyReport('tsv') },
    { key: 'markdown', icon: <FileTextOutlined />, label: 'Bảng Markdown', onClick: () => g.handleCopyReport('markdown') }
  ];

  const strictLabel = STRICTNESS.find(x => x.value === strictnessLevel)?.label || 'Chuẩn';
  const gradingSettings = (
    <Flex vertical gap={12} style={{ width: 240 }}>
      <Flex vertical gap={4}>
        <Text type="secondary">Mức độ chấm</Text>
        <Segmented block value={strictnessLevel} onChange={(v) => setStrictnessLevel(String(v))} options={STRICTNESS} />
      </Flex>
      <Flex vertical gap={4}>
        <Text type="secondary">Thang điểm</Text>
        <Segmented block value={gradingScale} onChange={(v) => setGradingScale(String(v))} options={[{ value: '10', label: 'Thang 10' }, { value: '100', label: 'Thang 100' }]} />
      </Flex>
    </Flex>
  );

  const percent = stats.submitted ? Math.round((stats.graded / stats.submitted) * 100) : 0;

  return (
    <Flex vertical gap={12} style={{ height: '100%', padding: 16, overflow: 'hidden' }}>
      {/* 1. Chọn buổi */}
      <Flex gap={8}>
        <Select
          style={{ flex: 3, minWidth: 0 }}
          placeholder="Lớp"
          options={g.classes}
          value={g.classId || undefined}
          onChange={g.handleClassChange}
          onOpenChange={(open) => { if (open && !g.classes.length) g.reloadClasses(); }}
          notFoundContent="Chưa tải được danh sách lớp — cần đăng nhập QLĐT"
          showSearch
          optionFilterProp="label"
          disabled={busy}
        />
        <Select
          style={{ flex: 3, minWidth: 0 }}
          placeholder="Môn học"
          options={g.courses}
          value={g.courseId || undefined}
          onChange={g.handleCourseChange}
          showSearch
          optionFilterProp="label"
          disabled={busy || !g.classId}
        />
        <Select
          style={{ flex: 3, minWidth: 0 }}
          placeholder="Buổi"
          options={g.sessions}
          value={g.sessionId || undefined}
          onChange={g.setSessionId}
          showSearch
          optionFilterProp="label"
          disabled={busy || !g.courseId}
        />
        <Button
          type={g.students.length ? 'default' : 'primary'}
          icon={g.students.length ? <ReloadOutlined /> : <CloudDownloadOutlined />}
          onClick={g.handleLoad}
          loading={g.loading}
          disabled={!g.sessionId || !!g.grading}
        >
          {g.students.length ? 'Tải lại' : 'Tải bài nộp'}
        </Button>
      </Flex>

      {g.classesTried && !g.classes.length && (
        <Alert
          type="warning"
          showIcon
          title="Chưa tải được danh sách lớp QLĐT"
          description={<>{g.statusText} Đã đăng nhập mà vẫn lỗi: F5 tab QLĐT rồi bấm Thử lại, hoặc bấm Chẩn đoán và gửi kết quả.</>}
          action={(
            <Space direction="vertical" size={4}>
              <Button size="small" icon={<ReloadOutlined />} onClick={g.reloadClasses} block>Thử lại</Button>
              <QldtDiagnoseButton />
            </Space>
          )}
        />
      )}

      {g.loadProgress && (
        <Progress
          percent={g.loadProgress.total ? Math.round((g.loadProgress.done / g.loadProgress.total) * 100) : 0}
          status="active"
          format={() => `${g.loadProgress!.done}/${g.loadProgress!.total} SV`}
        />
      )}

      {/* 2. Tổng quan buổi + hành động chính */}
      {g.students.length > 0 && (
        <Card size="small" styles={{ body: { padding: '10px 12px' } }}>
          <Flex justify="space-between" align="center" gap={12}>
            <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
              {g.grading ? (
                <Text ellipsis={{ tooltip: g.grading.text }}>
                  <Text strong>Đang chấm {g.grading.done + 1}/{g.grading.total}</Text> · {g.grading.text}
                </Text>
              ) : (
                <Text>
                  <Text strong>{stats.graded}/{stats.submitted}</Text> bài đã chấm
                  <Text type="secondary"> · {stats.students} SV · {stats.missing} bài chưa nộp</Text>
                  {stats.errors > 0 && <Text type="danger"> · {stats.errors} lỗi</Text>}
                </Text>
              )}
              <Progress
                size="small"
                showInfo={false}
                percent={g.grading ? Math.round((g.grading.done / g.grading.total) * 100) : percent}
                status={g.grading ? 'active' : 'normal'}
              />
            </Flex>
            <Space size={8}>
              <Tooltip title="Số liệu bài tập của cả lớp trong buổi (nộp bài, điểm từng bài, sinh viên cần chú ý) + AI liệt kê lỗi phổ biến">
                <Button icon={<BarChartOutlined />} onClick={() => setStatsOpen(true)} disabled={g.loading}>Số liệu buổi</Button>
              </Tooltip>
              <Popover content={gradingSettings} title="Cách chấm" trigger="click" placement="bottomRight">
                <Button icon={<SettingOutlined />} disabled={!!g.grading}>{strictLabel} · {gradingScale}</Button>
              </Popover>
              {g.grading ? (
                <Button danger icon={<StopOutlined />} onClick={g.handleCancel}>Dừng</Button>
              ) : (
                <Tooltip title={g.aiStatus !== 'success' ? 'Chưa kết nối được AI — kiểm tra tab Cài đặt' : 'Chấm các bài chưa chấm của sinh viên đã chọn'}>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={g.handleGradeChecked}
                    disabled={g.loading || !g.checkedItems.length || g.aiStatus !== 'success'}
                  >
                    Chấm {g.checkedItems.length} bài
                  </Button>
                </Tooltip>
              )}
            </Space>
          </Flex>
        </Card>
      )}

      {/* 3. Lọc */}
      {g.students.length > 0 && (
        <Flex gap={8} align="center">
          <Flex gap={6} style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
            {g.statusCounts.map(s => (
              <Tag.CheckableTag
                key={s.label}
                checked={g.statusFilters.includes(s.label)}
                onChange={() => g.toggleStatusFilter(s.label)}
                style={{ border: '1px solid #d9d9d9', margin: 0, whiteSpace: 'nowrap' }}
              >
                {s.label === NOT_SUBMITTED_FILTER ? 'Chưa nộp' : shortStatus(s.label)} {s.count}
              </Tag.CheckableTag>
            ))}
          </Flex>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm sinh viên"
            value={g.query}
            onChange={(e) => g.setQuery(e.target.value)}
            style={{ width: 160, flexShrink: 0 }}
          />
          <Dropdown menu={{ items: copyMenu }} disabled={busy}>
            <Button icon={<CopyOutlined />} style={{ flexShrink: 0 }}>Sao chép <DownOutlined /></Button>
          </Dropdown>
        </Flex>
      )}

      {/* 4. Danh sách: 1 dòng / SV, mỗi bài 1 ô */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fff', borderRadius: 8 }}>
        {/* Dòng đã chọn không tô nền (mặc định chọn sẵn gần hết → cả bảng xanh, khó đọc) */}
        <ConfigProvider theme={{ components: { Table: { rowSelectedBg: 'transparent', rowSelectedHoverBg: '#fafafa' } } }}>
        <Table<BatchStudent>
          size="small"
          sticky
          pagination={false}
          rowKey="studentId"
          dataSource={g.visibleStudents}
          columns={columns}
          scroll={{ x: 'max-content' }}
          loading={g.loading && !g.students.length}
          onRow={(s) => ({
            // Bấm ô checkbox chỉ để chọn, không mở chi tiết
            onClick: (e) => { if (!(e.target as HTMLElement).closest('.ant-table-selection-column')) setOpenId(s.studentId); },
            style: { cursor: 'pointer' }
          })}
          rowSelection={{
            selectedRowKeys: selectedStudentIds,
            onChange: setStudentSelection,
            getCheckboxProps: (s) => ({ disabled: !gradeableKeys(s).length || !!g.grading }),
            columnWidth: 36
          }}
          locale={{
            emptyText: <Empty description={g.students.length
              ? 'Không có sinh viên nào khớp bộ lọc.'
              : 'Chọn lớp, môn và buổi rồi bấm "Tải bài nộp". Bài nộp được khớp đúng đề theo ID trên QLĐT.'} />
          }}
        />
        </ConfigProvider>
      </div>

      <SessionStatsModal open={statsOpen} onClose={() => setStatsOpen(false)} g={g} />

      <StudentGradeDrawer
        student={openStudent}
        index={openIndex}
        total={g.visibleStudents.length}
        homework={homework}
        g={g}
        onPrev={() => openIndex > 0 && setOpenId(g.visibleStudents[openIndex - 1].studentId)}
        onNext={() => openIndex < g.visibleStudents.length - 1 && setOpenId(g.visibleStudents[openIndex + 1].studentId)}
        onClose={() => setOpenId(null)}
      />
    </Flex>
  );
};

/* ---------- Số liệu bài tập của buổi (tính sẵn) + AI liệt kê lỗi phổ biến ---------- */
const SessionStatsModal: React.FC<{ open: boolean; onClose: () => void; g: Grader }> = ({ open, onClose, g }) => {
  const st = g.sessionStats;
  const text = useMemo(() => (open && st ? formatSessionStats(st) : ''), [open, st]);
  const errors = g.commonErrors;
  const canAskAi = g.aiStatus === 'success' && !!st?.withFeedback;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<Flex vertical><span>Số liệu buổi</span><Text type="secondary" style={{ fontWeight: 'normal', fontSize: 13 }}>{st?.ctx.sessionName}</Text></Flex>}
      width={620}
      footer={<Button type="primary" icon={<CopyOutlined />} disabled={!st} onClick={g.copySessionStats}>Sao chép số liệu</Button>}
    >
      <Flex vertical gap={12}>
        {st ? (
          <pre style={{ maxHeight: 340, overflowY: 'auto', background: '#fafafa', borderRadius: 6, padding: '10px 12px', margin: 0, fontSize: 12.5, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {text}
          </pre>
        ) : (
          <Text type="secondary">Tải bài nộp của buổi trước.</Text>
        )}

        {/* Lỗi phổ biến: AI rút từ nhận xét từng bài, chỉ liệt kê */}
        <Card
          size="small"
          title={<span>Lỗi phổ biến <Text type="secondary" style={{ fontWeight: 'normal', fontSize: 12 }}>· AI rút từ {st?.withFeedback || 0} nhận xét</Text></span>}
          extra={(
            <Space size={4}>
              {errors?.text && !errors.loading && <Button size="small" icon={<CopyOutlined />} onClick={g.copyCommonErrors}>Sao chép</Button>}
              <Tooltip title={g.aiStatus !== 'success' ? 'Chưa kết nối được AI — kiểm tra tab Cài đặt' : !st?.withFeedback ? 'Chưa có bài nào có nhận xét — chấm bài trước' : undefined}>
                <Button size="small" icon={errors?.text ? <ReloadOutlined /> : <RobotOutlined />} loading={errors?.loading} disabled={!canAskAi} onClick={g.handleCommonErrors}>
                  {errors?.text ? 'Liệt kê lại' : 'AI liệt kê lỗi'}
                </Button>
              </Tooltip>
            </Space>
          )}
        >
          {errors?.error && <Alert type="error" showIcon title={errors.error} />}
          {errors?.loading && <Text type="secondary">Đang liệt kê lỗi…</Text>}
          {errors?.text && !errors.loading && <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{errors.text}</Paragraph>}
          {!errors && (
            <Text type="secondary">
              {st?.withFeedback ? 'Bấm "AI liệt kê lỗi" để gom lỗi lặp lại theo từng bài.' : 'Chưa có bài nào có nhận xét (AI chấm của extension hoặc nhận xét trên QLĐT).'}
            </Text>
          )}
        </Card>
      </Flex>
    </Modal>
  );
};

/* ---------- Đề dạng Markdown: link bấm được, code mẫu giữ thụt dòng, ảnh có nhãn ---------- */
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)\]]+)/g;

const RichLine: React.FC<{ text: string }> = ({ text }) => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    const href = m[2] || m[3];
    parts.push(<a key={m.index} href={href} target="_blank" rel="noopener noreferrer">{m[1] || href}</a>);
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
};

const AssignmentView: React.FC<{ text: string; images?: string[] }> = ({ text, images = [] }) => (
  <div style={{ maxHeight: 420, overflowY: 'auto' }}>
    {images.length > 0 && (
      <Flex wrap gap={8} style={{ marginBottom: 8 }}>
        {images.map((src, i) => (
          <a key={src} href={src.startsWith('data:') ? undefined : src} target="_blank" rel="noopener noreferrer" style={{ textAlign: 'center' }}>
            <img src={src} alt={`Ảnh ${i + 1}`} style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0', display: 'block' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Ảnh {i + 1}</Text>
          </a>
        ))}
      </Flex>
    )}
    {text.split(/(```[^\n]*\n[\s\S]*?\n```)/).map((part, i) => {
      if (i % 2) {
        const body = part.replace(/^```[^\n]*\n/, '').replace(/\n```$/, '');
        return (
          <pre key={i} style={{ background: '#f6f8fa', padding: 8, borderRadius: 6, fontSize: 12, overflowX: 'auto', margin: '6px 0' }}>{body}</pre>
        );
      }
      return (
        <div key={i} style={{ whiteSpace: 'pre-wrap' }}>
          {part.replace(/^\n+|\n+$/g, '').split('\n').map((line, j) => {
            const heading = /^#{1,6}\s+(.*)$/.exec(line);
            return (
              <div key={j} style={heading ? { fontWeight: 600, marginTop: j ? 4 : 0 } : undefined}>
                {line ? <RichLine text={heading ? heading[1] : line} /> : ' '}
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);

/* ---------- Chi tiết 1 SV: từng bài với điểm, nhận xét, đề ---------- */
const StudentGradeDrawer: React.FC<{
  student: BatchStudent | null;
  index: number;
  total: number;
  homework: { id: string; label: string }[];
  g: Grader;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}> = ({ student: s, index, total, homework, g, onPrev, onNext, onClose }) => {
  // Phím ← → để chuyển sinh viên
  useEffect(() => {
    if (!s) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [s, onPrev, onNext]);

  if (!s) return null;
  const avg = studentAverage(s);
  const canGrade = g.aiStatus === 'success' && !g.grading;

  return (
    <Drawer
      open
      onClose={onClose}
      size={520}
      title={
        <Flex vertical>
          <Flex gap={8} align="center" wrap>
            <span>{s.name}</span>
            <Tag color={statusColor(s.status)} style={{ margin: 0, fontWeight: 'normal' }}>{sentenceCase(s.status) || 'Chưa có trạng thái'}</Tag>
          </Flex>
          <Text type="secondary" style={{ fontWeight: 'normal' }}>
            {s.code}{avg != null ? ` · điểm TB ${avg}/${g.scale}` : ''}
          </Text>
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
      <Flex vertical gap={12}>
        {s.items.map(item => {
          const label = homework.find(h => h.id === item.homeworkId)?.label || 'Bài';
          return (
            <Card
              key={item.key}
              size="small"
              title={<Text strong ellipsis={{ tooltip: item.title }}>{label} · {cleanTitle(item.title)}</Text>}
              extra={<ItemCell item={item} scale={g.scale} />}
            >
              <Flex vertical gap={10}>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noopener noreferrer"><GithubOutlined /> {shortLink(item.link)}</a>
                ) : (
                  <Text type="secondary">Sinh viên chưa nộp bài này.</Text>
                )}

                {item.status === 'error' && <Alert type="error" showIcon title="Chấm lỗi" description={item.error} />}

                {item.status === 'success' && (
                  <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }} ellipsis={{ rows: 6, expandable: 'collapsible' }}>
                    {commentOf(item.report)}
                  </Paragraph>
                )}

                {item.link && (
                  <Flex gap={8} wrap>
                    {item.status === 'success' && (
                      <Button type="primary" icon={<CopyOutlined />} onClick={() => g.copyItemComment(item)}>Chép nhận xét & điểm</Button>
                    )}
                    <Button
                      icon={<ThunderboltOutlined />}
                      loading={isBusy(item)}
                      disabled={!canGrade || isBusy(item)}
                      onClick={() => g.handleGradeOne(item)}
                    >
                      {item.status === 'success' || item.status === 'error' ? 'Chấm lại' : 'Chấm bài này'}
                    </Button>
                    {item.status === 'success' && (
                      <Button
                        type="text"
                        onClick={() => (window as any).showReportModal?.({
                          title: `${s.name} — ${cleanTitle(item.title)}`, score: item.score, report: item.report || '',
                          language: item.language, astMetrics: item.astMetrics, imagesAttached: item.imagesAttached, imagesSkipped: item.imagesSkipped
                        })}
                      >
                        Báo cáo đầy đủ
                      </Button>
                    )}
                  </Flex>
                )}

                {(item.sysAi || item.comment || item.assignmentImagesAttached || item.assignmentImagesMissing) ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {[
                      item.sysAi && `AI hệ thống QLĐT: ${item.sysAi}`,
                      item.comment && 'đã có nhận xét trên QLĐT',
                      (item.assignmentImagesAttached || item.assignmentImagesMissing)
                        && `ảnh của đề gửi kèm ${item.assignmentImagesAttached || 0}${item.assignmentImagesMissing ? `, thiếu ${item.assignmentImagesMissing}` : ''}`
                    ].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}

                <Collapse
                  size="small"
                  ghost
                  items={[
                    {
                      key: 'assignment',
                      label: item.images.length ? `Đề bài (${item.images.length} ảnh)` : 'Đề bài',
                      children: <AssignmentView text={item.assignment || '(Đề không có mô tả)'} images={item.images} />
                    },
                    {
                      key: 'criteria',
                      label: item.criteria ? 'Tiêu chí chấm' : 'Tiêu chí chấm (mặc định)',
                      children: <AssignmentView text={criteriaOf(item)} />
                    },
                    ...(item.comment ? [{ key: 'comment', label: 'Nhận xét hiện có trên QLĐT', children: <AssignmentView text={item.comment} /> }] : [])
                  ]}
                />
              </Flex>
            </Card>
          );
        })}
      </Flex>
    </Drawer>
  );
};
