import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Empty, Flex, InputNumber, Select, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import {
  ATTENDANCE_LABELS, AbsenceStreak, ClassAttendance, StudentAttendance, StudentDay, fmtDay, isAbsentKind, weekday
} from '~/src/core/attendance';
import type { MonitorRow } from '~/src/core/studentMonitor';

const { Text } = Typography;

type Entry = { cls: ClassAttendance; s: StudentAttendance; rowKey?: string };

const LEAVE_COLOR: Record<string, string> = { 'Phê duyệt': 'green', 'Từ chối': 'red', 'Đang chờ': 'gold' };

const KindTag: React.FC<{ day: StudentDay }> = ({ day }) => {
  const kinds = [...new Set(day.marks.filter(m => isAbsentKind(m.kind)).map(m => m.kind))];
  return (
    <Space size={4}>
      {kinds.map(k => (
        <Tag key={k} style={{ margin: 0, color: '#fff', background: ATTENDANCE_LABELS[k].color, borderColor: ATTENDANCE_LABELS[k].color }}>
          {ATTENDANCE_LABELS[k].label}
        </Tag>
      ))}
    </Space>
  );
};

/** Đơn xin nghỉ của các ca nghỉ trong ngày (trạng thái + lý do + ảnh minh chứng). */
const LeaveInfo: React.FC<{ day: StudentDay }> = ({ day }) => {
  const leaves = day.marks.filter(m => m.leave).map(m => m.leave!);
  const notes = day.marks.filter(m => !m.leave && m.note).map(m => m.note);
  if (!leaves.length && !notes.length) return <Text type="secondary">Không có đơn</Text>;
  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      {leaves.map((l, i) => (
        <span key={i}>
          <Tag color={LEAVE_COLOR[l.status] || 'default'} style={{ margin: '0 4px 0 0' }}>{l.status || 'Đơn'}</Tag>
          <Text ellipsis={{ tooltip: l.note }} style={{ maxWidth: 260 }}>{l.note || '—'}</Text>
          {l.image && <> · <a href={l.image} target="_blank" rel="noopener noreferrer">ảnh</a></>}
        </span>
      ))}
      {notes.map((n, i) => <Text key={`n${i}`} type="secondary" ellipsis={{ tooltip: n }}>{n}</Text>)}
    </Flex>
  );
};

const periodsText = (day: StudentDay) => {
  const absent = day.marks.filter(m => isAbsentKind(m.kind));
  return absent.length === day.marks.length && day.marks.length > 1 ? 'Cả ngày' : absent.map(m => `Ca ${m.period}`).join(', ');
};

/** Buổi thứ mấy trong chuỗi nghỉ liên tiếp (≥ 2) chứa ngày này. */
const streakAt = (s: StudentAttendance, cls: ClassAttendance, date: string): { pos: number; streak: AbsenceStreak } | null => {
  const streak = s.streaks.find(x => x.from <= date && date <= x.to);
  if (!streak) return null;
  const inRange = cls.dates.filter(d => d >= streak.from && d <= date && s.days[d]);
  return { pos: inRange.length, streak };
};

export const StudentAbsenceView: React.FC<{
  classes: ClassAttendance[];
  rows: MonitorRow[];
  onOpenStudent: (rowKey: string) => void;
}> = ({ classes, rows, onOpenStudent }) => {
  const multiClass = classes.length > 1;
  const rowKeyOf = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(r => map.set(`${r.classLabel}|${r.studentId}`, r.key));
    return map;
  }, [rows]);
  const entries: Entry[] = useMemo(() => classes.flatMap(cls =>
    Object.values(cls.students).map(s => ({ cls, s, rowKey: rowKeyOf.get(`${cls.classLabel}|${s.studentId}`) }))), [classes, rowKeyOf]);
  const allDates = useMemo(() => [...new Set(classes.flatMap(c => c.dates))].sort(), [classes]);

  const [date, setDate] = useState('');
  const [minStreak, setMinStreak] = useState(2);
  const [onlyAbsent, setOnlyAbsent] = useState(true);
  useEffect(() => { if (!allDates.includes(date)) setDate(allDates[allDates.length - 1] || ''); }, [allDates]);

  if (!classes.length) {
    return <Empty description='Chưa có dữ liệu điểm danh. Bấm "Tải dữ liệu" (cần quyền xem điểm danh của lớp trên QLĐT).' />;
  }

  const nameCell = (e: Entry) => (
    <Flex vertical style={{ minWidth: 0 }}>
      {e.rowKey
        ? <a onClick={() => onOpenStudent(e.rowKey!)} style={{ fontWeight: 500 }}>{e.s.name}</a>
        : <Text strong>{e.s.name}</Text>}
      <Text type="secondary" style={{ fontSize: 12 }}>{e.s.code}{multiClass ? ` · ${e.cls.classLabel}` : ''}</Text>
    </Flex>
  );

  /* ---------- 1. Theo ngày ---------- */
  const dayIndex = allDates.indexOf(date);
  const dayRows = entries.filter(e => e.s.days[date]?.absent)
    .sort((a, b) => Number(a.s.days[date].excused) - Number(b.s.days[date].excused) || a.s.name.localeCompare(b.s.name, 'vi'));
  const hasSchedule = entries.filter(e => e.s.days[date]).length;
  const excused = dayRows.filter(e => e.s.days[date].excused).length;
  const byDay = (
    <Flex vertical gap={8}>
      <Flex gap={8} align="center" wrap>
        <Button icon={<LeftOutlined />} disabled={dayIndex <= 0} onClick={() => setDate(allDates[dayIndex - 1])} />
        <Select
          value={date}
          onChange={setDate}
          style={{ width: 170 }}
          options={[...allDates].reverse().map(d => {
            const n = entries.filter(e => e.s.days[d]?.absent).length;
            return { value: d, label: `${weekday(d)} ${fmtDay(d)} · ${n} nghỉ` };
          })}
        />
        <Button icon={<RightOutlined />} disabled={dayIndex >= allDates.length - 1} onClick={() => setDate(allDates[dayIndex + 1])} />
        <Text>
          <Text strong>{dayRows.length}</Text>/{hasSchedule} SV nghỉ
          <Text type="secondary"> · {excused} có phép · {dayRows.length - excused} không phép</Text>
        </Text>
      </Flex>
      <Table<Entry>
        size="small"
        pagination={false}
        rowKey={e => `${e.cls.classLabel}|${e.s.studentId}`}
        dataSource={dayRows}
        locale={{ emptyText: <Empty description="Không có sinh viên nghỉ ngày này." /> }}
        columns={[
          { title: 'Sinh viên', key: 'name', width: 200, render: (_, e) => nameCell(e) },
          { title: 'Ca', key: 'period', width: 90, render: (_, e) => periodsText(e.s.days[date]) },
          { title: 'Loại', key: 'kind', width: 130, render: (_, e) => <KindTag day={e.s.days[date]} /> },
          {
            title: 'Liên tiếp', key: 'streak', width: 90,
            render: (_, e) => {
              const at = streakAt(e.s, e.cls, date);
              return at ? <Tooltip title={`${fmtDay(at.streak.from)} → ${fmtDay(at.streak.to)}`}><Tag color="red" style={{ margin: 0 }}>buổi {at.pos}/{at.streak.days}</Tag></Tooltip> : null;
            }
          },
          { title: 'Đơn xin nghỉ / ghi chú', key: 'leave', render: (_, e) => <LeaveInfo day={e.s.days[date]} /> }
        ]}
      />
    </Flex>
  );

  /* ---------- 2. Nghỉ liên tiếp ---------- */
  const lastDateOf = (cls: ClassAttendance) => cls.dates[cls.dates.length - 1];
  const streakRows = entries
    .flatMap(e => e.s.streaks.filter(x => x.days >= minStreak).map(x => ({ ...e, streak: x })))
    .sort((a, b) => b.streak.days - a.streak.days || b.streak.to.localeCompare(a.streak.to));
  const streakTab = (
    <Flex vertical gap={8}>
      <Flex gap={8} align="center">
        <Text>Nghỉ từ</Text>
        <InputNumber min={2} max={30} value={minStreak} onChange={(v) => setMinStreak(v || 2)} style={{ width: 64 }} />
        <Text>buổi học liên tiếp (tính cả có phép) — {new Set(streakRows.map(r => `${r.cls.classLabel}|${r.s.studentId}`)).size} SV</Text>
      </Flex>
      <Table
        size="small"
        pagination={false}
        rowKey={r => `${r.cls.classLabel}|${r.s.studentId}|${r.streak.from}`}
        dataSource={streakRows}
        locale={{ emptyText: <Empty description={`Không có sinh viên nghỉ từ ${minStreak} buổi liên tiếp.`} /> }}
        columns={[
          { title: 'Sinh viên', key: 'name', width: 200, render: (_, r) => nameCell(r) },
          {
            title: 'Chuỗi nghỉ', key: 'range',
            render: (_, r) => (
              <Space size={6} wrap>
                <Text strong>{fmtDay(r.streak.from)} → {fmtDay(r.streak.to)}</Text>
                <Tag color="red" style={{ margin: 0 }}>{r.streak.days} buổi</Tag>
                {r.streak.to === lastDateOf(r.cls) && <Tag color="volcano" style={{ margin: 0 }}>đang nghỉ</Tag>}
              </Space>
            )
          },
          {
            title: 'Có phép / không phép', key: 'split', width: 200,
            render: (_, r) => <Text>{r.streak.excused} có phép · <Text type={r.streak.days - r.streak.excused ? 'danger' : undefined}>{r.streak.days - r.streak.excused} không phép</Text></Text>
          }
        ]}
      />
    </Flex>
  );

  /* ---------- 3. Bảng điểm danh SV × ngày ---------- */
  const gridRows = entries
    .filter(e => !onlyAbsent || e.s.absentDays > 0)
    .sort((a, b) => b.s.absentDays - a.s.absentDays || a.s.name.localeCompare(b.s.name, 'vi'));
  const gridColumns: TableColumnsType<Entry> = [
    { title: 'Sinh viên', key: 'name', width: 180, fixed: 'left', render: (_, e) => nameCell(e) },
    {
      title: 'Nghỉ', key: 'count', width: 64, fixed: 'left', align: 'center',
      render: (_, e) => <Tooltip title={`${e.s.excusedDays} có phép · ${e.s.unexcusedDays} không phép`}><Text strong={e.s.absentDays > 0}>{e.s.absentDays}</Text></Tooltip>
    },
    ...allDates.map(d => ({
      title: <Flex vertical align="center" style={{ lineHeight: 1.2 }}><span>{fmtDay(d)}</span><Text type="secondary" style={{ fontSize: 11 }}>{weekday(d)}</Text></Flex>,
      key: d,
      width: 46,
      align: 'center' as const,
      render: (_: unknown, e: Entry) => {
        const day = e.s.days[d];
        if (!day) return <Text type="secondary">–</Text>;
        return (
          <Tooltip title={day.marks.map(m => `Ca ${m.period}: ${ATTENDANCE_LABELS[m.kind].label}${m.leave ? ` (đơn ${m.leave.status.toLowerCase()})` : ''}`).join(' · ')}>
            <Flex gap={2} justify="center">
              {day.marks.map(m => {
                const a = ATTENDANCE_LABELS[m.kind];
                const absent = isAbsentKind(m.kind);
                return (
                  <span
                    key={m.period}
                    style={{
                      display: 'inline-block', minWidth: 14, height: 18, lineHeight: '18px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                      background: absent ? a.color : 'transparent', color: absent ? '#fff' : a.color
                    }}
                  >
                    {a.short}
                  </span>
                );
              })}
            </Flex>
          </Tooltip>
        );
      }
    }))
  ];
  const grid = (
    <Flex vertical gap={8}>
      <Flex gap={12} align="center" wrap>
        <Checkbox checked={onlyAbsent} onChange={(e) => setOnlyAbsent(e.target.checked)}>Chỉ sinh viên có nghỉ</Checkbox>
        <Text type="secondary">
          {(['excused', 'unexcused', 'late'] as const).map(k => `${ATTENDANCE_LABELS[k].short} = ${ATTENDANCE_LABELS[k].label}`).join(' · ')} · mỗi ô là 1 ca
        </Text>
      </Flex>
      <Table<Entry>
        size="small"
        pagination={false}
        sticky
        scroll={{ x: 'max-content' }}
        rowKey={e => `${e.cls.classLabel}|${e.s.studentId}`}
        dataSource={gridRows}
        columns={gridColumns}
        locale={{ emptyText: <Empty description="Không có sinh viên nghỉ." /> }}
      />
    </Flex>
  );

  return (
    <Tabs
      size="small"
      items={[
        { key: 'day', label: 'Theo ngày', children: byDay },
        { key: 'streak', label: `Nghỉ liên tiếp (${new Set(entries.filter(e => e.s.maxStreak >= 2).map(e => e.s.studentId)).size})`, children: streakTab },
        { key: 'grid', label: 'Bảng điểm danh', children: grid }
      ]}
    />
  );
};
