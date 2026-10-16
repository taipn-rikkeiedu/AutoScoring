import React, { useState } from 'react';
import {
  Button, Input, InputNumber, Tag, Typography, Alert, Tooltip, Divider, Flex, Space, Dropdown, Modal, Popconfirm, List
} from 'antd';
import {
  PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined, ReloadOutlined, CheckOutlined, DownOutlined, CloseOutlined
} from '@ant-design/icons';
import { useToast } from '~/src/core/ToastContext';
import { MonitorRules } from '~/src/core/studentMonitor';
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
                  {courseCount > 0 && <Tag style={{ margin: 0 }}>Riêng {courseCount} môn</Tag>}
                </Space>
                <Space size={0} style={{ flexShrink: 0 }}>
                  <Dropdown menu={applyMenu(t)} trigger={['click']}>
                    <Button size="small" type={active ? 'default' : 'link'} icon={active ? <CheckOutlined /> : undefined}>
                      {active ? 'Đang dùng' : 'Áp dụng'} <DownOutlined />
                    </Button>
                  </Dropdown>
                  <Tooltip title="Sửa">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEditing({ template: t, isNew: false })} />
                  </Tooltip>
                  <Tooltip title="Nhân bản">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => setEditing({ template: { ...t, id: newTemplateId(), name: `${t.name} (bản sao)` }, isNew: true })}
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
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={m.templates.length <= 1} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>{describeTemplate(t)}</Text>
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

/* ---------- Tạo / sửa mẫu: tên + toàn bộ ngưỡng ---------- */
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
  const r = draft.monitor;
  const a = draft.analysis;
  const setMonitor = (k: keyof MonitorRules) => (v: number | null) => setDraft(d => ({ ...d, monitor: { ...d.monitor, [k]: v ?? 0 } }));
  const setRule = (k: keyof AnalysisRules) => (v: number | null) => setDraft(d => ({ ...d, analysis: { ...d.analysis, [k]: v ?? 0 } }));
  const num = (value: number, onChange: (v: number | null) => void) => (
    <InputNumber size="small" min={0} max={100} value={value} onChange={onChange} style={{ width: 76 }} />
  );
  const row = (label: string, ...inputs: React.ReactNode[]) => (
    <Flex justify="space-between" align="center" gap={8}>
      <Text>{label}</Text>
      <Space size={4}>{inputs.map((x, i) => <React.Fragment key={i}>{x}</React.Fragment>)}</Space>
    </Flex>
  );

  const name = draft.name.trim();
  const errors = [
    !name && 'Nhập tên mẫu.',
    name && names.includes(name.toLowerCase()) && 'Đã có mẫu trùng tên.',
    r.absentWarn > r.absentAlarm && 'Nghỉ học: ngưỡng cảnh báo phải ≤ báo động.',
    r.homeworkWarn > r.homeworkAlarm && 'Thiếu bài tập: ngưỡng cảnh báo phải ≤ báo động.',
    r.elearningWarn > r.elearningAlarm && 'Chậm E-learning: ngưỡng cảnh báo phải ≤ báo động.'
  ].filter(Boolean) as string[];

  const handleOk = async () => {
    if (errors.length) return;
    setSaving(true);
    await onSave({ ...draft, name });
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
      width={440}
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
        <Flex justify="space-between" align="center">
          <Text strong>Vi phạm học tập</Text>
          <Space size={4}>
            <Text type="warning" strong style={{ width: 76, textAlign: 'center', display: 'inline-block' }}>Cảnh báo</Text>
            <Text type="danger" strong style={{ width: 76, textAlign: 'center', display: 'inline-block' }}>Báo động</Text>
          </Space>
        </Flex>
        {row('Nghỉ học (%)', num(r.absentWarn, setMonitor('absentWarn')), num(r.absentAlarm, setMonitor('absentAlarm')))}
        {row('Thiếu bài tập (%)', num(r.homeworkWarn, setMonitor('homeworkWarn')), num(r.homeworkAlarm, setMonitor('homeworkAlarm')))}
        {row('Chậm E-learning (bài)', num(r.elearningWarn, setMonitor('elearningWarn')), num(r.elearningAlarm, setMonitor('elearningAlarm')))}
        {row('Bài thi dưới (điểm)', num(r.examPass, setMonitor('examPass')), <div style={{ width: 76 }} />)}
        <Text type="secondary">SV có từ 2 lỗi cảnh báo, hoặc vắng thi, cũng là báo động.</Text>

        <Divider style={{ margin: '4px 0' }} />
        <Text strong>Sắp vượt ngưỡng</Text>
        {row('Nghỉ học từ (%)', num(r.earlyAbsentFrom, setMonitor('earlyAbsentFrom')))}
        {row('Thiếu bài tập từ (%)', num(r.earlyHomeworkFrom, setMonitor('earlyHomeworkFrom')))}
        {row('Bài thi đạt nhưng tới (điểm)', num(r.earlyExamTo, setMonitor('earlyExamTo')))}

        <Divider style={{ margin: '4px 0' }} />
        <Text strong>Nghi vấn BTVN ↔ điểm thi</Text>
        {row('Tỉ lệ nộp BTVN từ (%)', num(a.hwMin, setRule('hwMin')))}
        {row('Nghi vấn cao khi thi dưới', num(a.highBelow, setRule('highBelow')))}
        {row('Cần rà soát khi thi dưới', num(a.midBelow, setRule('midBelow')))}
        {row('hoặc chênh BTVN − thi từ', num(a.gapMin, setRule('gapMin')))}
        {row('Điểm AI bài tập TB từ', num(a.aiHigh, setRule('aiHigh')))}

        {errors.length > 0 && name && <Alert type="error" showIcon title={errors[0]} />}
      </Flex>
    </Modal>
  );
};
