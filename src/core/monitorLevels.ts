/**
 * Các mức giám sát tự cấu hình (vd Cấm thi, Báo động, Cảnh báo, Sắp vượt ngưỡng).
 * Bảng ngưỡng: mỗi mức có ngưỡng riêng cho từng chỉ số (để trống = không xét).
 * Xét từ mức đầu tiên (nặng nhất): SV có một chỉ số chạm ngưỡng của mức nào thì vào mức đó.
 */

export type MetricKey = 'absent' | 'homework' | 'elearning' | 'rpoints' | 'examScore' | 'examAbsent' | 'violations';

export interface MetricDef {
  key: MetricKey;
  label: string;
  /** gte: chạm khi giá trị ≥ ngưỡng · lt: khi < ngưỡng · flag: bật / tắt */
  op: 'gte' | 'lt' | 'flag';
  unit: string;
  hint: string;
  action: string;
}

export const METRICS: MetricDef[] = [
  { key: 'absent', label: 'Nghỉ học', op: 'gte', unit: '%', hint: 'Tỉ lệ nghỉ học từ … % trở lên', action: 'Nhắc nhở chuyên cần, hỏi lý do nghỉ' },
  { key: 'homework', label: 'Thiếu bài tập', op: 'gte', unit: '%', hint: 'Tỉ lệ thiếu bài tập từ … % trở lên', action: 'Nhắc nộp bù bài tập còn thiếu' },
  { key: 'elearning', label: 'Chậm E-learning', op: 'gte', unit: 'bài', hint: 'Chậm E-learning từ … bài trở lên', action: 'Nhắc hoàn thành E-learning trước buổi học' },
  { key: 'rpoints', label: 'R-Point', op: 'lt', unit: 'điểm', hint: 'R-Point dưới … điểm', action: 'Nhắc cải thiện R-Point' },
  { key: 'examScore', label: 'Điểm bài thi', op: 'lt', unit: 'điểm', hint: 'Có phần thi (TN / TL, Hackathon / cuối môn) dưới … điểm', action: 'Hỗ trợ ôn tập phần thi điểm thấp' },
  { key: 'examAbsent', label: 'Vắng thi', op: 'flag', unit: '', hint: 'Không làm bài nào của một đợt thi', action: 'Xác minh lý do vắng thi, hướng dẫn thi bù / thi lại' },
  { key: 'violations', label: 'Số chỉ số vi phạm', op: 'gte', unit: 'chỉ số', hint: 'Có từ … chỉ số chạm một mức vi phạm bất kỳ (vd 2 chỉ số cảnh báo → báo động)', action: '' }
];

export const metricDef = (key: MetricKey) => METRICS.find(m => m.key === key)!;

export interface MonitorLevel {
  id: string;
  name: string;
  color: string;
  /** false = chỉ nhắc sớm (kiểu "Sắp vượt ngưỡng"): không tính là vi phạm, hiện nhãn "Sắp: …". */
  violation: boolean;
  /** Ngưỡng theo chỉ số; null / thiếu = không xét. Vắng thi: 1 = có xét. */
  thresholds: Partial<Record<MetricKey, number | null>>;
}

export interface MonitorConfig {
  levels: MonitorLevel[];
}

export const NORMAL_LEVEL: MonitorLevel = { id: 'normal', name: 'Bình thường', color: '#d9d9d9', violation: false, thresholds: {} };

/** Màu gợi ý khi thêm mức mới (đậm → nhạt). */
export const LEVEL_PALETTE = ['#5c0011', '#cf1322', '#fa8c16', '#fadb14', '#722ed1', '#1677ff', '#13c2c2', '#8c8c8c'];

export const DEFAULT_LEVELS: MonitorLevel[] = [
  { id: 'ban', name: 'Cấm thi', color: '#5c0011', violation: true, thresholds: { absent: 20, homework: 20, elearning: 3, rpoints: 80 } },
  { id: 'alarm', name: 'Báo động', color: '#cf1322', violation: true, thresholds: { absent: 15, homework: 15, elearning: 2, examAbsent: 1, violations: 2 } },
  { id: 'warning', name: 'Cảnh báo', color: '#fa8c16', violation: true, thresholds: { absent: 10, homework: 10, elearning: 1, examScore: 50 } },
  { id: 'early', name: 'Sắp vượt ngưỡng', color: '#fadb14', violation: false, thresholds: { absent: 7, homework: 7, examScore: 55 } }
];

export const STRICT_LEVELS: MonitorLevel[] = [
  DEFAULT_LEVELS[0],
  { id: 'alarm', name: 'Báo động', color: '#cf1322', violation: true, thresholds: { absent: 12, homework: 12, elearning: 2, examAbsent: 1, violations: 2 } },
  { id: 'warning', name: 'Cảnh báo', color: '#fa8c16', violation: true, thresholds: { absent: 5, homework: 5, elearning: 1, examScore: 50 } },
  { id: 'early', name: 'Sắp vượt ngưỡng', color: '#fadb14', violation: false, thresholds: { absent: 3, homework: 3, examScore: 60 } }
];

export const newLevelId = () => `lv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Chữ trên nền màu của mức: nền sáng → chữ tối. */
export function textOn(color: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#262626' : '#fff';
}

/** Màu chữ đọc được trên nền trắng: màu quá sáng (vàng) thì đổi sang vàng đậm. */
export function readableColor(color: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color || '');
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.75 ? '#ad8b00' : color;
}

/** Ngưỡng dạng chữ, vd "≥ 20%", "< 80 điểm", "có". */
export function formatThreshold(metric: MetricKey, value: number): string {
  const d = metricDef(metric);
  if (d.op === 'flag') return 'có';
  const unit = d.unit === '%' ? '%' : d.unit ? ` ${d.unit}` : '';
  return `${d.op === 'lt' ? '<' : '≥'} ${value}${unit}`;
}

/** Ngưỡng cũ (trước khi có bảng mức) → bảng mức tương ứng, thêm mức Cấm thi mặc định. */
export function levelsFromLegacy(old: any): MonitorLevel[] {
  const n = (v: any, fallback: number) => (typeof v === 'number' ? v : fallback);
  return [
    DEFAULT_LEVELS[0],
    {
      id: 'alarm', name: 'Báo động', color: '#cf1322', violation: true,
      thresholds: { absent: n(old.absentAlarm, 15), homework: n(old.homeworkAlarm, 15), elearning: n(old.elearningAlarm, 2), examAbsent: 1, violations: 2 }
    },
    {
      id: 'warning', name: 'Cảnh báo', color: '#fa8c16', violation: true,
      thresholds: { absent: n(old.absentWarn, 10), homework: n(old.homeworkWarn, 10), elearning: n(old.elearningWarn, 1), examScore: n(old.examPass, 50) }
    },
    {
      id: 'early', name: 'Sắp vượt ngưỡng', color: '#fadb14', violation: false,
      thresholds: { absent: n(old.earlyAbsentFrom, 7), homework: n(old.earlyHomeworkFrom, 7), examScore: n(old.earlyExamTo, 55) }
    }
  ];
}

/** Đọc cấu hình mức đã lưu (kể cả dạng ngưỡng cũ); thiếu thì dùng mặc định. */
export function normalizeConfig(raw: any, fallback: MonitorLevel[] = DEFAULT_LEVELS): MonitorConfig {
  if (raw && Array.isArray(raw.levels) && raw.levels.length) {
    return {
      levels: raw.levels.map((l: any, i: number) => ({
        id: String(l.id || newLevelId()),
        name: String(l.name || `Mức ${i + 1}`),
        color: String(l.color || LEVEL_PALETTE[i % LEVEL_PALETTE.length]),
        violation: l.violation !== false,
        thresholds: { ...(l.thresholds || {}) }
      }))
    };
  }
  if (raw && typeof raw.absentWarn === 'number') return { levels: levelsFromLegacy(raw) };
  return { levels: fallback };
}
