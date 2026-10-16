import React from 'react';
import { Empty, Flex, Tag, Tooltip, Typography } from 'antd';
import {
  ATTENDANCE_LABELS, AttendanceKind, ClassAttendance, StudentAttendance, StudentDay, fmtDay, isAbsentKind, weekday
} from '~/src/core/attendance';

const { Text } = Typography;

const LEAVE_COLOR: Record<string, string> = { 'Phê duyệt': 'green', 'Từ chối': 'red', 'Đang chờ': 'gold' };

/** Màu ô 1 ca: nghỉ tô đậm, đi muộn tô nhạt, có mặt xám nhạt. */
const cellStyle = (kind: AttendanceKind): React.CSSProperties => {
  const c = ATTENDANCE_LABELS[kind].color;
  if (isAbsentKind(kind)) return { background: c, color: '#fff' };
  if (kind === 'late') return { background: `${c}22`, color: c };
  return { background: '#f5f5f5', color: '#bfbfbf' };
};

/** Tóm tắt 1 ngày cho dòng danh sách / tooltip, vd "Ca 1 · Không phép". */
export function describeDay(day: StudentDay): string {
  return day.marks.map(m => `Ca ${m.period}: ${ATTENDANCE_LABELS[m.kind].label}${m.leave ? ` (đơn ${m.leave.status.toLowerCase()})` : ''}`).join(' · ');
}

/** Đơn xin nghỉ / ghi chú của các ca nghỉ trong ngày. */
export const DayLeave: React.FC<{ day: StudentDay; compact?: boolean }> = ({ day, compact }) => {
  const leaves = day.marks.filter(m => m.leave).map(m => m.leave!);
  const notes = day.marks.filter(m => !m.leave && m.note).map(m => m.note);
  if (!leaves.length && !notes.length) return <Text type="secondary">Không có đơn xin nghỉ</Text>;
  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      {leaves.map((l, i) => (
        <Flex key={i} gap={6} align="center" style={{ minWidth: 0 }}>
          <Tag color={LEAVE_COLOR[l.status] || 'default'} style={{ margin: 0, flexShrink: 0 }}>Đơn {l.status.toLowerCase() || '—'}</Tag>
          <Text ellipsis={{ tooltip: l.note }} style={{ minWidth: 0, maxWidth: compact ? 220 : undefined }}>{l.note || 'Không ghi lý do'}</Text>
          {l.image && <a href={l.image} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>ảnh</a>}
        </Flex>
      ))}
      {notes.map((n, i) => <Text key={`n${i}`} type="secondary" ellipsis={{ tooltip: n }}>{n}</Text>)}
    </Flex>
  );
};

/** Loại nghỉ của ngày: Có phép / Không phép (ngày nghỉ nhiều ca có thể có cả hai). */
export const DayKindTags: React.FC<{ day: StudentDay }> = ({ day }) => (
  <Flex gap={4}>
    {[...new Set(day.marks.filter(m => isAbsentKind(m.kind)).map(m => m.kind))].map(k => (
      <Tag key={k} style={{ margin: 0, color: '#fff', background: ATTENDANCE_LABELS[k].color, borderColor: ATTENDANCE_LABELS[k].color }}>
        {ATTENDANCE_LABELS[k].label}
      </Tag>
    ))}
  </Flex>
);

const Stat: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <Flex vertical align="center" style={{ flex: 1, minWidth: 64, padding: '6px 4px', borderRadius: 6, background: '#fafafa' }}>
    <Text strong style={{ fontSize: 18, lineHeight: '24px', color: value && color ? color : undefined }}>{value}</Text>
    <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{label}</Text>
  </Flex>
);

/* ---------- Điểm danh của 1 SV: số liệu nhanh → lịch các buổi → danh sách buổi nghỉ ---------- */
export const StudentAttendancePanel: React.FC<{ cls: ClassAttendance | null; s: StudentAttendance | null }> = ({ cls, s }) => {
  if (!cls || !s) return <Empty description="Chưa có dữ liệu điểm danh của sinh viên này." />;
  const days = cls.dates.filter(d => s.days[d]);
  const count = (k: AttendanceKind) => days.filter(d => s.days[d].marks.some(m => m.kind === k)).length;
  const inStreak = (d: string) => s.streaks.some(x => x.from <= d && d <= x.to);
  const absentDays = [...days].reverse().filter(d => s.days[d].absent);

  return (
    <Flex vertical gap={16}>
      {/* Số liệu nhanh */}
      <Flex gap={6} wrap>
        <Stat label="Buổi học" value={days.length} />
        <Stat label="Có phép" value={s.excusedDays} color={ATTENDANCE_LABELS.excused.color} />
        <Stat label="Không phép" value={s.unexcusedDays} color={ATTENDANCE_LABELS.unexcused.color} />
        <Stat label="Đi muộn" value={count('late')} color={ATTENDANCE_LABELS.late.color} />
        <Stat label="Liên tiếp tối đa" value={s.maxStreak} color={s.maxStreak >= 2 ? ATTENDANCE_LABELS.unexcused.color : undefined} />
      </Flex>

      {/* Lịch các buổi: mỗi ô 1 ngày học, chia theo ca; khung đỏ = nằm trong chuỗi nghỉ liên tiếp */}
      <Flex vertical gap={6}>
        <Flex justify="space-between" align="baseline" wrap gap={8}>
          <Text strong>Các buổi học</Text>
          <Flex gap={10} wrap>
            {(['excused', 'unexcused', 'late'] as const).map(k => (
              <Text key={k} type="secondary" style={{ fontSize: 12 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 4, ...cellStyle(k) }} />
                {ATTENDANCE_LABELS[k].label}
              </Text>
            ))}
            <Text type="secondary" style={{ fontSize: 12 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 4, border: '2px solid #cf1322' }} />
              Nghỉ liên tiếp
            </Text>
          </Flex>
        </Flex>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
          {cls.dates.map(d => {
            const day = s.days[d];
            return (
              <Tooltip key={d} title={day ? `${weekday(d)} ${fmtDay(d)} — ${describeDay(day)}` : `${weekday(d)} ${fmtDay(d)} — chưa có điểm danh`}>
                <div
                  style={{
                    borderRadius: 6, overflow: 'hidden', textAlign: 'center', cursor: 'default',
                    border: day && inStreak(d) ? '2px solid #cf1322' : '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ fontSize: 11, lineHeight: '16px', color: '#8c8c8c' }}>{weekday(d)} {fmtDay(d)}</div>
                  <Flex>
                    {day
                      ? day.marks.map(m => (
                        <div key={m.period} style={{ flex: 1, height: 20, lineHeight: '20px', fontSize: 11, fontWeight: 600, ...cellStyle(m.kind) }}>
                          {ATTENDANCE_LABELS[m.kind].short}
                        </div>
                      ))
                      : <div style={{ flex: 1, height: 20, background: 'repeating-linear-gradient(45deg,#fafafa,#fafafa 4px,#f0f0f0 4px,#f0f0f0 8px)' }} />}
                  </Flex>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </Flex>

      {/* Các buổi nghỉ (mới nhất trước) */}
      <Flex vertical gap={6}>
        <Text strong>Các buổi nghỉ ({absentDays.length})</Text>
        {!absentDays.length && <Text type="secondary">Không nghỉ buổi nào.</Text>}
        {absentDays.map(d => {
          const day = s.days[d];
          const streak = s.streaks.find(x => x.from <= d && d <= x.to);
          const absentPeriods = day.marks.filter(m => isAbsentKind(m.kind));
          return (
            <div key={d} style={{ borderLeft: `3px solid ${ATTENDANCE_LABELS[day.excused ? 'excused' : 'unexcused'].color}`, background: '#fafafa', borderRadius: 4, padding: '6px 10px' }}>
              <Flex justify="space-between" align="center" gap={8} wrap>
                <Flex gap={8} align="center" wrap>
                  <Text strong>{weekday(d)} {fmtDay(d)}</Text>
                  <Text type="secondary">
                    {absentPeriods.length === day.marks.length && day.marks.length > 1 ? 'cả ngày' : absentPeriods.map(m => `ca ${m.period}`).join(', ')}
                  </Text>
                  <DayKindTags day={day} />
                </Flex>
                {streak && <Tag color="red" style={{ margin: 0 }}>chuỗi {streak.days} buổi ({fmtDay(streak.from)}–{fmtDay(streak.to)})</Tag>}
              </Flex>
              <div style={{ marginTop: 4 }}><DayLeave day={day} /></div>
            </div>
          );
        })}
      </Flex>
    </Flex>
  );
};
