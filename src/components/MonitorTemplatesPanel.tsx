import React, { useState } from 'react';
import {
  Button, Input, InputNumber, Tag, Typography, Alert, Tooltip, Divider, Flex, Space, Dropdown, Modal, Popconfirm, List,
  ColorPicker, Checkbox, Collapse, Switch
} from 'antd';
import {
  PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, ReloadOutlined, CheckOutlined, DownOutlined, CloseOutlined,
  LeftOutlined, RightOutlined, MoreOutlined
} from '@ant-design/icons';
import { useToast } from '~/src/core/ToastContext';
import { MetricKey, MonitorLevel, METRICS, LEVEL_PALETTE, newLevelId, formatThreshold } from '~/src/core/monitorLevels';
import { AnalysisRules } from '~/src/core/examAnalysis';
import { MonitorTemplate, describeTemplate, newTemplateId } from '~/src/core/monitorTemplates';
import type { useStudentMonitor } from '~/src/hooks/student-monitor/useStudentMonitor';

const { Text } = Typography;
type Monitor = ReturnType<typeof useStudentMonitor>;

/* ---------- Danh sách mẫu: tạo / sửa / nhân bản / xoá + áp dụng cho tất cả môn hoặc môn đang chọn ---------- */
export const MonitorTemplatesPanel: React.FC<{ m: Monitor }> = ({ m }) => {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<{ template: MonitorTemplate; isNew: boolean } | null>(null);
  const [tableBusy, setTableBusy] = useState(false);
  const overrides = Object.entries(m.assignment.byCourse);
  const nameOf = (id: string) => m.templates.find(t => t.id === id)?.name || '—';
  const shared = m.templateSource === 'supabase';

  const handleDelete = async (t: MonitorTemplate) => {
    try {
      await m.deleteTemplate(t.id);
      showToast(`Đã xoá mẫu "${t.name}".`, 'success');
    } catch (e: any) {
      showToast('Không xoá được mẫu: ' + e.message, 'error');
    }
  };

  const handleCreateTable = async () => {
    setTableBusy(true);
    try {
      await m.createTemplatesTable();
      showToast('Đã tạo bảng mẫu giám sát trên Supabase.', 'success');
    } catch (e: any) {
      showToast('Không tạo được bảng: ' + e.message, 'error');
    } finally {
      setTableBusy(false);
    }
  };

  const applyMenu = (t: MonitorTemplate) => ({
    items: [
      {
        key: 'all',
        label: overrides.length ? `Tất cả môn (bỏ mẫu riêng của ${overrides.length} môn)` : 'Tất cả môn'
      },
      {
        key: 'course',
        label: m.courseId ? `Chỉ môn ${m.courseName}` : 'Chỉ môn đang chọn (chưa chọn môn)',
        disabled: !m.courseId
      }
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'all' && overrides.length > 0) {
        Modal.confirm({
          title: `Áp dụng mẫu "${t.name}" cho tất cả môn?`,
          content: `Hiện đang có ${overrides.length} môn đặt mẫu riêng (${overrides.map(([id, v]) => v.courseName || id).slice(0, 3).join(', ')}${overrides.length > 3 ? '...' : ''}). Thao tác này sẽ xoá cấu hình riêng của các môn này để đồng bộ về mẫu "${t.name}".`,
          okText: 'Đồng ý áp dụng',
          okButtonProps: { danger: true },
          cancelText: 'Huỷ',
          onOk: () => {
            m.applyTemplate(t.id, 'all');
            showToast(`Đã áp dụng mẫu "${t.name}" cho tất cả môn.`, 'success');
          }
        });
        return;
      }
      m.applyTemplate(t.id, key as 'all' | 'course');
      showToast(key === 'all' ? `Áp dụng mẫu "${t.name}" cho tất cả môn.` : `Áp dụng mẫu "${t.name}" cho môn ${m.courseName}.`, 'success');
    }
  });

  return (
    <Flex vertical gap={8}>
      <Flex justify="space-between" align="center">
        <Space size={6}>
          <Text strong>Mẫu giám sát</Text>
          <Tooltip title={shared ? 'Mẫu lưu trên Supabase — mọi người dùng chung' : 'Mẫu chỉ lưu trên máy này'}>
            <Tag color={shared ? 'green' : 'default'} style={{ margin: 0 }}>{shared ? 'Dùng chung' : 'Trên máy'}</Tag>
          </Tooltip>
          <Tooltip title="Tải lại danh sách mẫu">
            <Button type="text" size="small" icon={<ReloadOutlined />} loading={m.templatesLoading} onClick={m.reloadTemplates} />
          </Tooltip>
        </Space>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditing({ template: { ...m.activeTemplate, id: newTemplateId(), name: '' }, isNew: true })}
        >
          Tạo mẫu
        </Button>
      </Flex>

      {m.templateError && (
        <Alert
          type="warning"
          showIcon
          title={m.templateError.tableMissing ? 'Supabase chưa có bảng mẫu giám sát — đang lưu trên máy.' : 'Không đọc được mẫu trên Supabase — đang dùng bản trên máy.'}
          description={m.templateError.tableMissing && !m.canCreateTable
            ? 'Nhập Supabase PAT ở tab Cài đặt rồi bấm khởi tạo cơ sở dữ liệu.'
            : !m.templateError.tableMissing ? m.templateError.message : undefined}
          action={m.templateError.tableMissing && m.canCreateTable
            ? <Button size="small" loading={tableBusy} onClick={handleCreateTable}>Tạo bảng</Button>
            : undefined}
        />
      )}

      <Text type="secondary">
        {m.courseId ? <>Môn <Text strong>{m.courseName}</Text> đang dùng </> : 'Đang dùng '}
        <Text strong>{m.activeTemplate.name}</Text>
        {m.activePerCourse ? ' (mẫu riêng của môn).' : ' (mẫu mặc định).'}
        {m.activePerCourse && <> <a onClick={() => m.clearCourseTemplate()}>Dùng mẫu mặc định</a></>}
      </Text>

      <List
        size="small"
        bordered
        dataSource={m.templates}
        renderItem={(t) => {
          const isDefault = t.id === m.assignment.defaultId;
          const active = t.id === m.activeTemplate.id;
          const courseCount = overrides.filter(([, v]) => v.templateId === t.id).length;
          return (
            <List.Item style={{ display: 'block', background: active ? 'var(--ant-color-primary-bg, #e6f4ff)' : undefined }}>
              <Flex justify="space-between" align="center" gap={8}>
                <Space size={6} wrap style={{ minWidth: 0 }}>
                  <Text strong>{t.name}</Text>
                  {isDefault && <Tag color="blue" style={{ margin: 0 }}>Tất cả môn</Tag>}
                  {t.analysis.enabled === false && <Tag style={{ margin: 0 }}>Tắt nghi vấn BTVN</Tag>}
                  {courseCount > 0 && <Tag style={{ margin: 0 }}>Riêng {courseCount} môn</Tag>}
                </Space>
                <Space size={0} style={{ flexShrink: 0 }}>
                  <Dropdown menu={applyMenu(t)} trigger={['click']}>
                    <Button size="small" type={active ? 'default' : 'link'} icon={active ? <CheckOutlined /> : undefined}>
                      {active ? 'Đang dùng' : 'Áp dụng'} <DownOutlined />
                    </Button>
                  </Dropdown>
                  <Tooltip title="Sửa">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing({ template: t, isNew: false })} style={{ minWidth: 28, height: 28 }} />
                  </Tooltip>
                  <Tooltip title="Nhân bản">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => setEditing({ template: { ...t, id: newTemplateId(), name: `${t.name} (bản sao)` }, isNew: true })}
                      style={{ minWidth: 28, height: 28 }}
                    />
                  </Tooltip>
                  <Popconfirm
                    title={`Xoá mẫu "${t.name}"?`}
                    description={shared ? 'Mẫu dùng chung — xoá cho mọi người. Môn đang dùng sẽ về mẫu mặc định.' : 'Môn đang dùng mẫu này sẽ về mẫu mặc định.'}
                    okText="Xoá"
                    okButtonProps={{ danger: true }}
                    cancelText="Huỷ"
                    disabled={m.templates.length <= 1}
                    onConfirm={() => handleDelete(t)}
                  >
                    <Tooltip title={m.templates.length <= 1 ? 'Phải giữ lại ít nhất 1 mẫu' : 'Xoá'}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={m.templates.length <= 1} style={{ minWidth: 28, height: 28 }} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </Flex>
              <Flex wrap gap={8} style={{ marginTop: 2 }} aria-label={describeTemplate(t)}>
                {t.monitor.levels.map(l => (
                  <Text key={l.id} type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: l.color, marginRight: 4 }} />
                    {l.name}
                  </Text>
                ))}
              </Flex>
            </List.Item>
          );
        }}
      />

      {overrides.length > 0 && (
        <Flex vertical gap={4}>
          <Text type="secondary">Môn đặt mẫu riêng:</Text>
          {overrides.map(([id, v]) => (
            <Flex key={id} justify="space-between" align="center" gap={8}>
              <Text ellipsis style={{ minWidth: 0 }}>{v.courseName || id} → <Text strong>{nameOf(v.templateId)}</Text></Text>
              <Tooltip title="Bỏ mẫu riêng (về mẫu mặc định)">
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => m.clearCourseTemplate(id)} />
              </Tooltip>
            </Flex>
          ))}
        </Flex>
      )}

      {editing && (
        <TemplateEditorModal
          initial={editing.template}
          isNew={editing.isNew}
          shared={shared}
          names={m.templates.filter(t => t.id !== editing.template.id).map(t => t.name.trim().toLowerCase())}
          onCancel={() => setEditing(null)}
          onSave={async (t) => {
            try {
              await m.saveTemplate(t);
              showToast(editing.isNew ? `Đã tạo mẫu "${t.name}".` : `Đã lưu mẫu "${t.name}".`, 'success');
              setEditing(null);
            } catch (e: any) {
              showToast('Không lưu được mẫu: ' + e.message, 'error');
            }
          }}
        />
      )}
    </Flex>
  );
};

/* ---------- Bảng ngưỡng: dòng = chỉ số, cột = mức (nặng → nhẹ, trái → phải) ---------- */
const LABEL_COL = 150;
const LEVEL_COL = 118;

const LevelMatrix: React.FC<{ levels: MonitorLevel[]; onChange: (levels: MonitorLevel[]) => void }> = ({ levels, onChange }) => {
  const update = (i: number, patch: Partial<MonitorLevel>) => onChange(levels.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const setThreshold = (i: number, metric: MetricKey, v: number | null) =>
    update(i, { thresholds: { ...levels[i].thresholds, [metric]: v } });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...levels];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  const add = () => onChange([...levels, {
    id: newLevelId(), name: `Mức ${levels.length + 1}`, violation: true, thresholds: {},
    color: LEVEL_PALETTE.find(c => !levels.some(l => l.color === c)) || LEVEL_PALETTE[levels.length % LEVEL_PALETTE.length]
  }]);
  const grid = { display: 'grid', gridTemplateColumns: `${LABEL_COL}px repeat(${levels.length}, ${LEVEL_COL}px) 40px`, gap: 6, alignItems: 'center' } as const;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ ...grid, alignItems: 'start' }}>
        <Text type="secondary" style={{ paddingTop: 4 }}>Mức (nặng → nhẹ)</Text>
        {levels.map((l, i) => (
          <Flex key={l.id} vertical gap={4} style={{ borderTop: `3px solid ${l.color}`, paddingTop: 4 }}>
            <Flex gap={4} align="center">
              <ColorPicker
                size="small"
                value={l.color}
                disabledAlpha
                presets={[{ label: 'Gợi ý', colors: LEVEL_PALETTE }]}
                onChangeComplete={(c) => update(i, { color: c.toHexString() })}
              />
              <Input size="small" value={l.name} maxLength={30} onChange={(e) => update(i, { name: e.target.value })} placeholder="Tên mức" />
            </Flex>
            <Flex justify="space-between" align="center">
              <Tooltip title="Bỏ tick: mức chỉ nhắc sớm (như Sắp vượt ngưỡng), không tính là vi phạm">
                <Checkbox checked={l.violation} onChange={(e) => update(i, { violation: e.target.checked })}>
                  <Text style={{ fontSize: 12 }}>Vi phạm</Text>
                </Checkbox>
              </Tooltip>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'left', icon: <LeftOutlined />, label: 'Nặng hơn (sang trái)', disabled: i === 0 },
                    { key: 'right', icon: <RightOutlined />, label: 'Nhẹ hơn (sang phải)', disabled: i === levels.length - 1 },
                    { type: 'divider' },
                    { key: 'delete', icon: <DeleteOutlined />, label: 'Xoá mức', danger: true, disabled: levels.length <= 1 }
                  ],
                  onClick: ({ key }) => {
                    if (key === 'left') move(i, -1);
                    else if (key === 'right') move(i, 1);
                    else onChange(levels.filter((_, j) => j !== i));
                  }
                }}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} aria-label={`Tuỳ chọn mức ${l.name}`} style={{ minWidth: 28, height: 28 }} />
              </Dropdown>
            </Flex>
          </Flex>
        ))}
        <Tooltip title="Thêm mức">
          <Button size="small" icon={<PlusOutlined />} onClick={add} style={{ marginTop: 4 }} />
        </Tooltip>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Flex vertical gap={6}>
        {METRICS.map(d => (
          <div key={d.key} style={grid}>
            <Tooltip title={d.hint} placement="left">
              <Text style={{ cursor: 'help' }}>{d.label}{d.unit ? <Text type="secondary"> ({d.unit})</Text> : null}</Text>
            </Tooltip>
            {levels.map((l, i) => {
              const v = l.thresholds[d.key];
              if (d.op === 'flag') {
                return (
                  <Checkbox key={l.id} checked={!!v} onChange={(e) => setThreshold(i, d.key, e.target.checked ? 1 : null)}>
                    <Text type="secondary" style={{ fontSize: 12 }}>có</Text>
                  </Checkbox>
                );
              }
              return (
                <InputNumber
                  key={l.id}
                  size="small"
                  min={0}
                  max={d.unit === '%' ? 100 : 1000}
                  value={v ?? null}
                  placeholder="—"
                  prefix={<Text type="secondary">{d.op === 'lt' ? '<' : '≥'}</Text>}
                  onChange={(x) => setThreshold(i, d.key, x == null ? null : Number(x))}
                  style={{ width: '100%' }}
                />
              );
            })}
            <span />
          </div>
        ))}
      </Flex>
    </div>
  );
};

/** Cảnh báo cấu hình vô tác dụng: mức nhẹ hơn có ngưỡng không "dễ chạm" hơn mức nặng hơn. */
function shadowWarnings(levels: MonitorLevel[]): string[] {
  const out: string[] = [];
  for (const d of METRICS) {
    if (d.op === 'flag') continue;
    for (let i = 1; i < levels.length; i++) {
      const t = levels[i].thresholds[d.key];
      if (t == null) continue;
      const blocker = levels.slice(0, i).find(h => {
        const ht = h.thresholds[d.key];
        return ht != null && (d.op === 'lt' ? t <= ht : t >= ht);
      });
      if (blocker) {
        out.push(`${d.label}: ngưỡng của "${levels[i].name}" (${formatThreshold(d.key, t)}) đã nằm trong "${blocker.name}" nên mức này không bao giờ xét chỉ số đó.`);
      }
    }
  }
  return out;
}

/* ---------- Tạo / sửa mẫu: tên + bảng mức + ngưỡng nghi vấn BTVN ---------- */
const TemplateEditorModal: React.FC<{
  initial: MonitorTemplate;
  isNew: boolean;
  shared: boolean;
  names: string[];
  onCancel: () => void;
  onSave: (t: MonitorTemplate) => Promise<void>;
}> = ({ initial, isNew, shared, names, onCancel, onSave }) => {
  const [draft, setDraft] = useState<MonitorTemplate>(initial);
  const [saving, setSaving] = useState(false);
  const levels = draft.monitor.levels;
  const a = draft.analysis;
  const setRule = (k: keyof AnalysisRules) => (v: number | null) => setDraft(d => ({ ...d, analysis: { ...d.analysis, [k]: v ?? 0 } }));
  const num = (value: number, onChange: (v: number | null) => void) => (
    <InputNumber size="small" min={0} max={100} value={value} onChange={onChange} disabled={a.enabled === false} style={{ width: 76 }} />
  );
  const row = (label: string, input: React.ReactNode) => (
    <Flex justify="space-between" align="center" gap={8} style={{ maxWidth: 360 }}>
      <Text>{label}</Text>
      {input}
    </Flex>
  );

  const name = draft.name.trim();
  const levelNames = levels.map(l => l.name.trim().toLowerCase());
  const errors = [
    !name && 'Nhập tên mẫu.',
    name && names.includes(name.toLowerCase()) && 'Đã có mẫu trùng tên.',
    levelNames.some(n => !n) && 'Mỗi mức phải có tên.',
    new Set(levelNames).size !== levelNames.length && 'Tên các mức không được trùng nhau.',
    levels.some(l => !Object.values(l.thresholds).some(v => v != null)) && 'Mỗi mức cần ít nhất 1 ngưỡng (hoặc xoá mức đó).'
  ].filter(Boolean) as string[];
  const warnings = shadowWarnings(levels);

  const handleOk = async () => {
    if (errors.length) return;
    setSaving(true);
    await onSave({ ...draft, name, monitor: { levels: levels.map(l => ({ ...l, name: l.name.trim() })) } });
    setSaving(false);
  };

  return (
    <Modal
      open
      title={isNew ? 'Tạo mẫu giám sát' : `Sửa mẫu "${initial.name}"`}
      okText={isNew ? 'Tạo mẫu' : 'Lưu'}
      cancelText="Huỷ"
      onOk={handleOk}
      onCancel={onCancel}
      okButtonProps={{ disabled: errors.length > 0, loading: saving }}
      width={Math.min(LABEL_COL + levels.length * (LEVEL_COL + 6) + 110, 900)}
      destroyOnHidden
    >
      <Flex vertical gap={10}>
        <Input
          autoFocus
          placeholder="Tên mẫu, vd: Môn project, Lớp cần kèm sát"
          value={draft.name}
          maxLength={60}
          onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
        />
        {shared && !isNew && <Text type="secondary">Mẫu dùng chung: thay đổi áp dụng cho mọi người đang dùng mẫu này.</Text>}

        <Divider style={{ margin: '4px 0' }} />
        <Flex vertical gap={2}>
          <Text strong>Các mức giám sát</Text>
          <Text type="secondary">
            Xét từ trái sang phải: sinh viên có một chỉ số chạm ngưỡng của mức nào thì vào mức đó (mức nặng nhất). Ô để trống = không xét.
          </Text>
        </Flex>
        <LevelMatrix levels={levels} onChange={(next) => setDraft(d => ({ ...d, monitor: { levels: next } }))} />
        {warnings.length > 0 && <Alert type="warning" showIcon title="Ngưỡng không có tác dụng" description={warnings.join(' ')} />}

        <Collapse
          size="small"
          items={[{
            key: 'suspect',
            label: `Nghi vấn BTVN ↔ điểm thi${a.enabled === false ? ' — đang tắt' : ''}`,
            extra: (
              <span onClick={(e) => e.stopPropagation()}>
                <Switch
                  size="small"
                  checked={a.enabled !== false}
                  onChange={(on) => setDraft(d => ({ ...d, analysis: { ...d.analysis, enabled: on } }))}
                />
              </span>
            ),
            children: (
              <Flex vertical gap={8} style={{ opacity: a.enabled === false ? 0.5 : 1 }}>
                <Text type="secondary">Tắt cho môn không thi Hackathon hoặc khi sinh viên chưa thi cuối môn — khi đó không gắn cờ nghi vấn / trùng link.</Text>
                {row('Tỉ lệ nộp BTVN từ (%)', num(a.hwMin, setRule('hwMin')))}
                {row('Nghi vấn cao khi thi dưới', num(a.highBelow, setRule('highBelow')))}
                {row('Cần rà soát khi thi dưới', num(a.midBelow, setRule('midBelow')))}
                {row('hoặc chênh BTVN − thi từ', num(a.gapMin, setRule('gapMin')))}
                {row('Điểm AI bài tập TB từ', num(a.aiHigh, setRule('aiHigh')))}
              </Flex>
            )
          }]}
        />

        {errors.length > 0 && name && <Alert type="error" showIcon title={errors[0]} />}
      </Flex>
    </Modal>
  );
};
