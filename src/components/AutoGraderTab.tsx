import React, { useState } from 'react';
import {
  Table, Button, Tag, Dropdown, Card, Select, Progress, Space, Typography, Tooltip, Empty, Flex, Input, Drawer, Alert, Collapse, ConfigProvider
} from 'antd';
import type { TableColumnsType, MenuProps } from 'antd';
import {
  CloudDownloadOutlined, CopyOutlined, FileTextOutlined, TableOutlined, EyeOutlined, SyncOutlined,
  GithubOutlined, SearchOutlined, CheckOutlined, ArrowsAltOutlined, ShrinkOutlined
} from '@ant-design/icons';
import { useBatchGrader } from '~/src/hooks/auto-grader/useBatchGrader';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { extractComment } from '~/src/core/utils';
import { BatchItem, BatchStudent, NOT_SUBMITTED_FILTER, criteriaOf, studentAverage, submittedCount } from '~/src/core/batchGrading';

const { Text, Paragraph } = Typography;
type Grader = ReturnType<typeof useBatchGrader>;

type Row =
  | { key: string; kind: 'student'; stu: BatchStudent; children: Row[] }
  | { key: string; kind: 'item'; item: BatchItem };

const STUDENT_KEY = (id: string) => `s:${id}`;

/** Màu trạng thái buổi trên QLĐT. */
const statusColor = (s: string) =>
  /^HOÀN THÀNH$/i.test(s) ? 'green' : /CHƯA/i.test(s) ? 'orange' : /CHỜ/i.test(s) ? 'blue' : 'default';

/** "ĐANG CHỜ KIỂM TRA" → "Đang chờ kiểm tra" cho dễ đọc. */
const sentenceCase = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);

const shortLink = (url: string) => url.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/^https?:\/\//, '');

export const AutoGraderTab: React.FC = () => {
  const g = useBatchGrader();
  const { gradingScale, setGradingScale, strictnessLevel, setStrictnessLevel } = useSettings();
  const [expanded, setExpanded] = useState<React.Key[]>([]);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const busy = g.loading || !!g.grading;

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: g.statusText }));
    return () => { window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null })); };
  }, [g.statusText]);

  const detailItem = detailKey ? g.students.flatMap(s => s.items).find(i => i.key === detailKey) || null : null;

  const dataSource: Row[] = g.visibleStudents.map(stu => ({
    key: STUDENT_KEY(stu.studentId),
    kind: 'student',
    stu,
    children: stu.items.map(item => ({ key: item.key, kind: 'item' as const, item }))
  }));

  const scoreCell = (item: BatchItem) => {
    if (!item.link) return <Text type="secondary">—</Text>;
    if (item.status === 'downloading') return <Tag color="blue" icon={<SyncOutlined spin />} style={{ margin: 0 }}>Tải code</Tag>;
    if (item.status === 'grading') return <Tag color="orange" icon={<SyncOutlined spin />} style={{ margin: 0 }}>Đang chấm</Tag>;
    if (item.status === 'error') {
      return <Tooltip title={item.error}><Tag color="error" style={{ margin: 0 }}>Lỗi</Tag></Tooltip>;
    }
    if (item.status === 'success') {
      const high = parseFloat(item.score || '0') / (parseFloat(g.scale) || 10) >= 0.8;
      return (
        <Tooltip title="Sao chép nhận xét & điểm">
          <Button
            size="small"
            shape="round"
            icon={<CopyOutlined />}
            style={{ fontWeight: 600, color: high ? '#389e0d' : '#d48806', borderColor: high ? '#b7eb8f' : '#ffe58f' }}
            onClick={(e) => { e.stopPropagation(); g.copyItemComment(item); }}
          >
            {item.score}/{g.scale}
          </Button>
        </Tooltip>
      );
    }
    return <Text type="secondary">Chưa chấm</Text>;
  };

  const columns: TableColumnsType<Row> = [
    {
      title: 'Sinh viên / Bài tập',
      key: 'name',
      ellipsis: true,
      // Dòng bài tập: tên đề trải sang cả cột trạng thái cho đủ chỗ
      onCell: (r) => (r.kind === 'item' ? { colSpan: 2 } : {}),
      render: (_, r) => r.kind === 'student' ? (
        <span>
          <Text strong>{r.stu.name}</Text>
          {r.stu.code && <Text type="secondary"> · {r.stu.code}</Text>}
        </span>
      ) : (
        <Flex vertical style={{ minWidth: 0 }}>
          <Text ellipsis={{ tooltip: r.item.title }}>{r.item.title}</Text>
          <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
            {r.item.link
              ? <a href={r.item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <GithubOutlined /> {shortLink(r.item.link)}
                </a>
              : 'Chưa nộp'}
            {r.item.sysAi && ` · AI hệ thống ${r.item.sysAi}`}
          </Text>
        </Flex>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 210,
      onCell: (r) => (r.kind === 'item' ? { colSpan: 0 } : {}),
      render: (_, r) => r.kind === 'student' ? (
        <Space size={6} style={{ whiteSpace: 'nowrap' }}>
          <Tag color={statusColor(r.stu.status)} style={{ margin: 0 }}>{sentenceCase(r.stu.status) || 'Chưa có'}</Tag>
          <Text type={submittedCount(r.stu) ? 'secondary' : 'danger'}>nộp {submittedCount(r.stu)}/{r.stu.items.length}</Text>
        </Space>
      ) : null
    },
    {
      title: 'Điểm',
      key: 'score',
      width: 120,
      align: 'center',
      render: (_, r) => {
        if (r.kind === 'item') return scoreCell(r.item);
        const avg = studentAverage(r.stu);
        return avg != null ? <Text strong>TB {avg}</Text> : null;
      }
    },
    {
      title: '',
      key: 'actions',
      width: 92,
      align: 'right',
      render: (_, r) => r.kind === 'item' ? (
        <Space size={0}>
          <Tooltip title="Xem đề, tiêu chí & nhận xét">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); setDetailKey(r.item.key); }} />
          </Tooltip>
          {r.item.link && (
            <Tooltip title={r.item.status === 'success' ? 'Chấm lại' : 'Chấm bài này'}>
              <Button
                type="text"
                size="small"
                icon={<SyncOutlined />}
                disabled={!!g.grading || r.item.status === 'grading' || r.item.status === 'downloading' || g.aiStatus !== 'success'}
                onClick={(e) => { e.stopPropagation(); g.handleGradeOne(r.item); }}
              />
            </Tooltip>
          )}
        </Space>
      ) : null
    }
  ];

  const copyMenu: MenuProps['items'] = [
    { key: 'detailed', icon: <FileTextOutlined />, label: 'Báo cáo theo sinh viên', onClick: () => g.handleCopyReport('detailed') },
    { key: 'tsv', icon: <TableOutlined />, label: 'Bảng Excel / Google Sheets', onClick: () => g.handleCopyReport('tsv') },
    { key: 'markdown', icon: <FileTextOutlined />, label: 'Bảng Markdown', onClick: () => g.handleCopyReport('markdown') }
  ];

  const allExpanded = dataSource.length > 0 && expanded.length >= dataSource.length;

  return (
    <Flex vertical gap={12} style={{ height: '100%', padding: 16, overflow: 'hidden' }}>
      {/* Lớp → môn → buổi */}
      <Flex gap={8}>
        <Select
          style={{ flex: 3, minWidth: 0 }}
          placeholder="Chọn lớp"
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
          placeholder={g.classId ? 'Chọn môn' : 'Chọn lớp trước'}
          options={g.courses}
          value={g.courseId || undefined}
          onChange={g.handleCourseChange}
          showSearch
          optionFilterProp="label"
          disabled={busy || !g.classId}
        />
        <Select
          style={{ flex: 3, minWidth: 0 }}
          placeholder={g.courseId ? 'Chọn buổi' : 'Chọn môn trước'}
          options={g.sessions}
          value={g.sessionId || undefined}
          onChange={g.setSessionId}
          showSearch
          optionFilterProp="label"
          disabled={busy || !g.courseId}
        />
        <Button type="primary" icon={<CloudDownloadOutlined />} onClick={g.handleLoad} loading={g.loading} disabled={!g.sessionId || !!g.grading}>
          Tải bài nộp
        </Button>
      </Flex>

      {g.loadProgress && (
        <Progress
          percent={g.loadProgress.total ? Math.round((g.loadProgress.done / g.loadProgress.total) * 100) : 0}
          status="active"
          format={() => `${g.loadProgress!.done}/${g.loadProgress!.total} SV`}
        />
      )}

      {/* Lọc theo trạng thái buổi + tìm SV */}
      {g.students.length > 0 && (
        <Flex gap={6} align="center">
          {g.statusCounts.map(s => (
            <Tag.CheckableTag
              key={s.label}
              checked={g.statusFilters.includes(s.label)}
              onChange={() => g.toggleStatusFilter(s.label)}
              style={{ border: '1px solid #d9d9d9', margin: 0, whiteSpace: 'nowrap' }}
            >
              {s.label === NOT_SUBMITTED_FILTER ? s.label : sentenceCase(s.label)} <b>{s.count}</b>
            </Tag.CheckableTag>
          ))}
          <div style={{ flex: 1 }} />
          <Input
            allowClear
            size="small"
            prefix={<SearchOutlined />}
            placeholder="Tìm tên, MSSV"
            value={g.query}
            onChange={(e) => g.setQuery(e.target.value)}
            style={{ width: 140, flexShrink: 0 }}
          />
          <Tooltip title={allExpanded ? 'Thu gọn tất cả' : 'Mở tất cả sinh viên'}>
            <Button
              size="small"
              icon={allExpanded ? <ShrinkOutlined /> : <ArrowsAltOutlined />}
              onClick={() => setExpanded(allExpanded ? [] : dataSource.map(r => r.key))}
            />
          </Tooltip>
          <Dropdown menu={{ items: copyMenu }} disabled={busy}>
            <Tooltip title="Sao chép báo cáo cả buổi"><Button size="small" icon={<CopyOutlined />} /></Tooltip>
          </Dropdown>
        </Flex>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fff', borderRadius: 8 }}>
        <ConfigProvider theme={{ components: { Table: { rowSelectedBg: 'transparent', rowSelectedHoverBg: '#fafafa' } } }}>
        <Table<Row>
          size="small"
          sticky
          pagination={false}
          dataSource={dataSource}
          columns={columns}
          loading={g.loading && !g.students.length}
          expandable={{
            expandedRowKeys: expanded,
            onExpandedRowsChange: (keys) => setExpanded([...keys]),
            indentSize: 12
          }}
          onRow={(r) => ({
            onClick: () => {
              if (r.kind === 'student') setExpanded(prev => (prev.includes(r.key) ? prev.filter(k => k !== r.key) : [...prev, r.key]));
              else setDetailKey(r.item.key);
            },
            style: { cursor: 'pointer' }
          })}
          rowSelection={{
            checkStrictly: false,
            selectedRowKeys: [...g.checked],
            onChange: (keys) => g.setChecked(new Set(keys.map(String).filter(k => !k.startsWith('s:')))),
            getCheckboxProps: (r) => ({
              disabled: r.kind === 'item' ? !r.item.link : !submittedCount(r.stu)
            })
          }}
          locale={{
            emptyText: <Empty description={g.students.length
              ? 'Không có sinh viên nào khớp bộ lọc.'
              : 'Chọn lớp → môn → buổi rồi bấm "Tải bài nộp". Bài nộp được khớp đúng đề theo ID trên QLĐT.'} />
          }}
        />
        </ConfigProvider>
      </div>

      {g.grading && (
        <Card size="small">
          <Flex justify="space-between" align="center" gap={8}>
            <Text ellipsis style={{ minWidth: 0 }}>{g.grading.text}</Text>
            <Button size="small" danger onClick={g.handleCancel}>Dừng</Button>
          </Flex>
          <Progress percent={Math.round((g.grading.done / g.grading.total) * 100)} format={() => `${g.grading!.done}/${g.grading!.total}`} status="active" />
        </Card>
      )}

      {/* Cách chấm + bắt đầu chấm */}
      <Flex justify="space-between" align="center" gap={8}>
        <Space>
          <Select
            value={strictnessLevel}
            onChange={setStrictnessLevel}
            style={{ width: 120 }}
            options={[
              { value: 'Dễ dãi, bỏ qua lỗi nhỏ', label: '🟢 Chấm dễ' },
              { value: 'Bình thường', label: '🟡 Chuẩn' },
              { value: 'Rất khắt khe, trừ điểm nặng mọi lỗi nhỏ', label: '🔴 Khắt khe' }
            ]}
          />
          <Select
            value={gradingScale}
            onChange={setGradingScale}
            style={{ width: 110 }}
            options={[{ value: '10', label: 'Thang 10' }, { value: '100', label: 'Thang 100' }]}
          />
        </Space>
        <Tooltip title={g.aiStatus !== 'success' ? 'Chưa kết nối được AI — kiểm tra tab Cài đặt' : undefined}>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={g.handleGradeChecked}
            disabled={!!g.grading || g.loading || !g.checkedItems.length || g.aiStatus !== 'success'}
            loading={!!g.grading}
          >
            {g.grading ? 'Đang chấm…' : `Chấm ${g.checkedItems.length} bài đã chọn`}
          </Button>
        </Tooltip>
      </Flex>

      <ItemDetailDrawer item={detailItem} g={g} onClose={() => setDetailKey(null)} />
    </Flex>
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
                {line ? <RichLine text={heading ? heading[1] : line} /> : '\u00a0'}
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);

/* ---------- Chi tiết 1 bài: đề, tiêu chí, nhận xét ---------- */
const ItemDetailDrawer: React.FC<{ item: BatchItem | null; g: Grader; onClose: () => void }> = ({ item, g, onClose }) => {
  const block = (text: string) => (
    <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0, maxHeight: 260, overflowY: 'auto' }}>{text}</Paragraph>
  );
  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      size={460}
      title={item ? <Flex vertical><Text strong ellipsis>{item.title}</Text><Text type="secondary" style={{ fontWeight: 400 }}>{item.studentName}</Text></Flex> : null}
      extra={item?.link && (
        <Button
          size="small"
          icon={<SyncOutlined />}
          disabled={!!g.grading || item.status === 'grading' || item.status === 'downloading' || g.aiStatus !== 'success'}
          onClick={() => g.handleGradeOne(item)}
        >
          {item.status === 'success' ? 'Chấm lại' : 'Chấm'}
        </Button>
      )}
    >
      {item && (
        <Flex vertical gap={12}>
          {item.link
            ? <a href={item.link} target="_blank" rel="noopener noreferrer"><GithubOutlined /> {shortLink(item.link)}</a>
            : <Alert type="warning" showIcon title="Sinh viên chưa nộp bài này." />}

          {item.status === 'error' && <Alert type="error" showIcon title={item.error} />}
          {item.status === 'success' && (
            <Card
              size="small"
              title={`Nhận xét — ${item.score}/${g.scale}`}
              extra={
                <Space size={4}>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => g.copyItemComment(item)}>Sao chép</Button>
                  <Button
                    size="small"
                    onClick={() => (window as any).showReportModal?.({
                      title: `${item.studentName} — ${item.title}`, score: item.score, report: item.report || '',
                      language: item.language, astMetrics: item.astMetrics, imagesAttached: item.imagesAttached, imagesSkipped: item.imagesSkipped
                    })}
                  >
                    Báo cáo đầy đủ
                  </Button>
                </Space>
              }
            >
              {block(extractComment(item.report || '') || item.report || '')}
              {(item.assignmentImagesAttached || item.assignmentImagesMissing) ? (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  Ảnh của đề: đã gửi kèm {item.assignmentImagesAttached || 0}
                  {item.assignmentImagesMissing ? `, không gửi được ${item.assignmentImagesMissing}` : ''}.
                </Text>
              ) : null}
            </Card>
          )}

          <Collapse
            size="small"
            defaultActiveKey={item.status === 'success' ? [] : ['assignment']}
            items={[
              {
                key: 'assignment',
                label: item.images.length ? `Đề bài · ${item.images.length} ảnh (gửi kèm cho AI)` : 'Đề bài',
                children: <AssignmentView text={item.assignment || '(Đề không có mô tả)'} images={item.images} />
              },
              {
                key: 'criteria',
                label: item.criteria ? 'Tiêu chí chấm' : 'Tiêu chí chấm (mặc định — đề chưa có tiêu chí trên QLĐT)',
                children: <AssignmentView text={criteriaOf(item)} />
              },
              ...(item.comment ? [{ key: 'comment', label: 'Nhận xét hiện có trên QLĐT', children: block(item.comment) }] : []),
              ...(item.fileList?.length ? [{
                key: 'files',
                label: `Tệp mã nguồn đã đọc (${item.fileList.length})`,
                children: <div style={{ fontFamily: 'monospace', fontSize: 12, maxHeight: 200, overflowY: 'auto' }}>{item.fileList.map(f => <div key={f}>{f}</div>)}</div>
              }] : [])
            ]}
          />
          {item.sysAi && <Text type="secondary">Điểm AI của hệ thống QLĐT: {item.sysAi} (chỉ để tham khảo, extension luôn chấm lại).</Text>}
        </Flex>
      )}
    </Drawer>
  );
};
