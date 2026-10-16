import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert, Button, Card, DatePicker, Drawer, Empty, Flex, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CloudDownloadOutlined, DownloadOutlined, LeftOutlined, ReloadOutlined, RightOutlined, SaveOutlined, SearchOutlined, UndoOutlined
} from '@ant-design/icons';
import { useCare } from '~/src/hooks/take-care/useCare';
import { useToast } from '~/src/core/ToastContext';
import {
  CARE_CATEGORIES, CARE_METHODS, CARE_STATUSES, CareCase, CarePatch, PENDING_STATUS, careStatusColor, optionsWith, patchOf, samePatch
} from '~/src/core/care';
import { weekday } from '~/src/core/attendance';

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
type Care = ReturnType<typeof useCare>;

const fmtDay = (d: string) => (d ? `${weekday(d)} ${dayjs(d).format('DD/MM')}` : '—');

export const CareTab: React.FC = () => {
  const g = useCare();
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: g.statusText }));
    return () => { window.dispatchEvent(new CustomEvent('appGlobalStatus', { detail: null })); };
  }, [g.statusText]);

  const openIndex = openId != null ? g.visibleCases.findIndex(c => c.id === openId) : -1;
  const openCase = openIndex >= 0 ? g.visibleCases[openIndex] : null;
  const pending = g.cases.filter(c => c.status === PENDING_STATUS).length;
  const multiClass = new Set(g.cases.map(c => c.classId)).size > 1;

  const columns: TableColumnsType<CareCase> = [
    {
      title: 'Sinh viên', key: 'name', width: 210, ellipsis: true,
      render: (_, c) => (
        <Flex vertical style={{ minWidth: 0 }}>
          <Text strong ellipsis>{c.studentName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{c.studentCode}{multiClass ? ` · ${c.className}` : ''}</Text>
        </Flex>
      )
    },
    {
      title: 'Buổi nghỉ', key: 'date', width: 170,
      render: (_, c) => (
        <Flex vertical style={{ minWidth: 0 }}>
          <Text>{fmtDay(c.date)} · ca {c.period}</Text>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: c.courseName }}>{c.courseName}</Text>
        </Flex>
      )
    },
    { title: 'Trạng thái', key: 'status', width: 150, render: (_, c) => <Tag color={careStatusColor(c.status)} style={{ margin: 0 }}>{c.status || '—'}</Tag> },
    {
      title: 'Phân loại · kết quả', key: 'result', ellipsis: true,
      render: (_, c) => (c.category || c.result
        ? (
          <Flex vertical style={{ minWidth: 0 }}>
            {c.category && <Text ellipsis>{c.category}{c.careMethod ? ` · ${c.careMethod}` : ''}</Text>}
            {c.result && <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: c.result }}>{c.result}</Text>}
          </Flex>
        )
        : <Text type="secondary">Chưa cập nhật</Text>)
    }
  ];

  return (
    <Flex vertical gap={12} style={{ height: '100%', padding: 16, overflow: 'hidden' }}>
      {/* 1. Lớp + khoảng ngày */}
      <Flex gap={8}>
        <Select
          style={{ flex: 1, minWidth: 0 }}
          placeholder="Tất cả lớp"
          allowClear
          options={g.classes}
          value={g.classId || undefined}
          onChange={(v) => g.setClassId(v || '')}
          onOpenChange={(open) => { if (open && !g.classes.length) g.reloadClasses(); }}
          notFoundContent="Chưa tải được danh sách lớp — cần đăng nhập QLĐT"
          showSearch
          optionFilterProp="label"
          disabled={g.loading}
        />
        <RangePicker
          value={g.range}
          onChange={(v) => { if (v?.[0] && v?.[1]) g.setRange([v[0], v[1]]); }}
          format="DD/MM/YYYY"
          allowClear={false}
          disabled={g.loading}
          presets={[
            { label: 'Hôm nay', value: [dayjs(), dayjs()] },
            { label: '7 ngày qua', value: [dayjs().subtract(6, 'day'), dayjs()] },
            { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs()] },
            { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] }
          ]}
          style={{ width: 250, flexShrink: 0 }}
        />
        <Button
          type={g.cases.length ? 'default' : 'primary'}
          icon={g.cases.length ? <ReloadOutlined /> : <CloudDownloadOutlined />}
          onClick={g.handleLoad}
          loading={g.loading}
        >
          {g.cases.length ? 'Tải lại' : 'Tải'}
        </Button>
      </Flex>

      {/* 2. Tổng quan + lọc */}
      {g.cases.length > 0 && (
        <>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }}>
            <Text>
              <Text strong>{g.cases.length}</Text> ca chăm sóc · <Text strong style={{ color: pending ? '#d46b08' : undefined }}>{pending}</Text> đang xử lý
              {g.meta && <Text type="secondary"> · lớp có {g.meta.totalNoPermitAbsent} buổi nghỉ không phép, đã xử lý {g.meta.totalResolved}</Text>}
            </Text>
          </Card>
          <Flex gap={8} align="center">
            <Flex gap={6} style={{ flex: 1, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {g.statusCounts.map(s => (
                <Tag.CheckableTag
                  key={s.label}
                  checked={g.statusFilters.includes(s.label)}
                  onChange={() => g.toggleStatusFilter(s.label)}
                  style={{ border: '1px solid #d9d9d9', margin: 0, whiteSpace: 'nowrap' }}
                >
                  {s.label} {s.count}
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
            <Tooltip title={`Xuất Excel ${g.visibleCases.length} ca đang hiển thị`}>
              <Button icon={<DownloadOutlined />} onClick={g.handleExport} disabled={!g.visibleCases.length} style={{ flexShrink: 0 }} />
            </Tooltip>
          </Flex>
        </>
      )}

      {/* 3. Danh sách ca */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#fff', borderRadius: 8 }}>
        <Table<CareCase>
          size="small"
          sticky
          rowKey="id"
          pagination={false}
          dataSource={g.visibleCases}
          columns={columns}
          loading={g.loading && !g.cases.length}
          onRow={(c) => ({ onClick: () => setOpenId(c.id), style: { cursor: 'pointer' } })}
          locale={{
            emptyText: <Empty description={g.cases.length
              ? 'Không có ca nào khớp bộ lọc.'
              : 'Chọn lớp và khoảng ngày rồi bấm "Tải". Mỗi ca là 1 buổi nghỉ không phép cần liên hệ.'} />
          }}
        />
      </div>

      <CareDrawer
        g={g}
        item={openCase}
        index={openIndex}
        total={g.visibleCases.length}
        onGo={(i) => { const c = g.visibleCases[i]; if (c) setOpenId(c.id); }}
        onClose={() => setOpenId(null)}
      />
    </Flex>
  );
};

/* ---------- Chi tiết 1 ca: cập nhật lên QLĐT + lịch sử chăm sóc của SV ---------- */
const CareDrawer: React.FC<{
  g: Care;
  item: CareCase | null;
  index: number;
  total: number;
  onGo: (i: number) => void;
  onClose: () => void;
}> = ({ g, item: c, index, total, onGo, onClose }) => {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<CarePatch | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(c ? patchOf(c) : null);
    if (c) g.loadHistory(c.studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id, c?.updatedAt]);

  const dirty = !!(c && draft && !samePatch(draft, patchOf(c)));

  /** Đổi ca / đóng khi còn thay đổi chưa lưu → hỏi trước. */
  const guard = (go: () => void) => {
    if (!dirty) { go(); return; }
    Modal.confirm({
      title: 'Bỏ thay đổi chưa lưu?',
      content: 'Các thay đổi của ca này chưa được lưu lên QLĐT.',
      okText: 'Bỏ thay đổi', okButtonProps: { danger: true }, cancelText: 'Ở lại',
      onOk: go
    });
  };

  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.closest('.ant-select')) return;
      if (e.key === 'ArrowLeft' && index > 0) guard(() => onGo(index - 1));
      if (e.key === 'ArrowRight' && index < total - 1) guard(() => onGo(index + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  });

  if (!c || !draft) return null;
  const set = (k: keyof CarePatch) => (v: string | undefined) => setDraft(d => (d ? { ...d, [k]: v || '' } : d));

  const handleSave = async () => {
    setSaving(true);
    try {
      await g.saveCase(c, draft);
      showToast(`Đã lưu ca chăm sóc ${c.studentName} lên QLĐT.`, 'success');
    } catch (e: any) {
      showToast('Không lưu được lên QLĐT: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const h = g.history[c.studentId];
  const field = (label: string, node: React.ReactNode) => (
    <Flex vertical gap={4}>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      {node}
    </Flex>
  );

  return (
    <Drawer
      open
      onClose={() => guard(onClose)}
      size={500}
      title={
        <Flex vertical>
          <Flex gap={8} align="center" wrap>
            <span>{c.studentName}</span>
            <Tag color={careStatusColor(c.status)} style={{ margin: 0, fontWeight: 'normal' }}>{c.status || '—'}</Tag>
          </Flex>
          <Text type="secondary" style={{ fontWeight: 'normal', fontSize: 13 }}>
            {c.studentCode} · {c.className}{c.phone ? <> · <Text type="secondary" copyable={{ text: c.phone }}>{c.phone}</Text></> : null}
          </Text>
        </Flex>
      }
      extra={
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>{index + 1}/{total}</Text>
          <Tooltip title="Ca trước (←)"><Button icon={<LeftOutlined />} disabled={index <= 0} onClick={() => guard(() => onGo(index - 1))} /></Tooltip>
          <Tooltip title="Ca sau (→)"><Button icon={<RightOutlined />} disabled={index >= total - 1} onClick={() => guard(() => onGo(index + 1))} /></Tooltip>
        </Space>
      }
      footer={
        <Flex justify="space-between" align="center">
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dirty ? 'Có thay đổi chưa lưu' : c.statusChangedAt ? `Cập nhật ${dayjs(c.statusChangedAt).format('HH:mm DD/MM')}` : ''}
          </Text>
          <Space>
            <Button icon={<UndoOutlined />} disabled={!dirty || saving} onClick={() => setDraft(patchOf(c))}>Hoàn tác</Button>
            <Button type="primary" icon={<SaveOutlined />} disabled={!dirty} loading={saving} onClick={handleSave}>Lưu lên QLĐT</Button>
          </Space>
        </Flex>
      }
    >
      <Flex vertical gap={16}>
        <Alert
          type="warning"
          showIcon
          title={<span>Nghỉ không phép <b>{fmtDay(c.date)}</b> · ca {c.period}</span>}
          description={c.courseName}
        />

        <Flex vertical gap={12}>
          <Flex gap={12}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {field('Trạng thái', <Select value={draft.status || undefined} onChange={set('status')} options={optionsWith(CARE_STATUSES, c.status)} style={{ width: '100%' }} />)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {field('Cách chăm sóc', <Select value={draft.careMethod || undefined} onChange={set('careMethod')} allowClear placeholder="Chọn" options={optionsWith(CARE_METHODS, c.careMethod)} style={{ width: '100%' }} />)}
            </div>
          </Flex>
          {field('Phân loại nguyên nhân', <Select value={draft.category || undefined} onChange={set('category')} allowClear placeholder="Chọn" options={optionsWith(CARE_CATEGORIES, c.category)} />)}
          {field('Lý do nghỉ', <Input.TextArea value={draft.reason} onChange={(e) => set('reason')(e.target.value)} autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Sinh viên cho biết lý do…" />)}
          {field('Kết quả chăm sóc', <Input.TextArea value={draft.result} onChange={(e) => set('result')(e.target.value)} autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Đã liên hệ, sinh viên hứa…" />)}
        </Flex>

        {/* Lịch sử chăm sóc của SV */}
        <Flex vertical gap={8}>
          <Flex justify="space-between" align="baseline">
            <Text strong>Lịch sử chăm sóc</Text>
            {h && h !== 'loading' && !('error' in h) && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {h.totalNoPermitAbsent ?? '—'} buổi nghỉ không phép · đã xử lý {h.totalResolved ?? '—'}
              </Text>
            )}
          </Flex>
          {h === 'loading' && <Text type="secondary">Đang tải…</Text>}
          {h && h !== 'loading' && 'error' in h && <Alert type="error" showIcon title={h.error} />}
          {h && h !== 'loading' && !('error' in h) && (h.items.length
            ? h.items.map(x => (
              <div key={x.id} style={{ borderLeft: `3px solid ${x.id === c.id ? '#1677ff' : '#f0f0f0'}`, background: '#fafafa', borderRadius: 4, padding: '6px 10px' }}>
                <Flex justify="space-between" gap={8} wrap>
                  <Text strong>{fmtDay(x.date)} <Text type="secondary" style={{ fontWeight: 'normal' }}>· {x.subjectName}</Text></Text>
                  <Tag color={careStatusColor(x.status)} style={{ margin: 0 }}>{x.status || '—'}</Tag>
                </Flex>
                {(x.category || x.careMethod) && <Text type="secondary" style={{ fontSize: 12 }}>{[x.category, x.careMethod].filter(Boolean).join(' · ')}</Text>}
                {x.result && <Paragraph style={{ margin: 0, fontSize: 13 }} ellipsis={{ rows: 2, expandable: 'collapsible' }}>{x.result}</Paragraph>}
              </div>
            ))
            : <Text type="secondary">Chưa có lịch sử.</Text>)}
        </Flex>
      </Flex>
    </Drawer>
  );
};
