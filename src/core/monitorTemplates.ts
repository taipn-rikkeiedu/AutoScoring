/**
 * Mẫu giám sát: bộ mức (bảng ngưỡng theo chỉ số) + ngưỡng nghi vấn BTVN, đặt tên, tạo / sửa / xoá được.
 * Áp dụng 1 mẫu cho tất cả môn (mẫu mặc định) hoặc riêng từng môn.
 */
import { AnalysisRules, DEFAULT_ANALYSIS_RULES } from './examAnalysis';
import { MonitorConfig, DEFAULT_LEVELS, STRICT_LEVELS, normalizeConfig } from './monitorLevels';

export interface MonitorTemplate {
  id: string;
  name: string;
  monitor: MonitorConfig;
  analysis: AnalysisRules;
  updatedAt?: string;
}

/** Mẫu áp dụng: mặc định cho mọi môn, có thể đặt riêng theo courseId (kèm tên môn để hiển thị). */
export interface TemplateAssignment {
  defaultId: string;
  byCourse: Record<string, { templateId: string; courseName: string }>;
}

export const STARTER_TEMPLATES: MonitorTemplate[] = [
  { id: 'standard', name: 'Chuẩn', monitor: { levels: DEFAULT_LEVELS }, analysis: DEFAULT_ANALYSIS_RULES },
  {
    id: 'strict',
    name: 'Chặt',
    monitor: { levels: STRICT_LEVELS },
    analysis: { hwMin: 70, highBelow: 55, midBelow: 70, gapMin: 30, aiHigh: 75 }
  }
];

export const DEFAULT_ASSIGNMENT: TemplateAssignment = { defaultId: STARTER_TEMPLATES[0].id, byCourse: {} };

/** Ngưỡng cũ đúng bằng mặc định của mẫu khởi đầu → dùng bộ mức mới của mẫu đó (có Cấm thi). */
function starterLevels(id: string, old: any) {
  if (id === 'standard' && old.absentWarn === 10 && old.absentAlarm === 20 && old.homeworkAlarm === 20) return { levels: DEFAULT_LEVELS };
  if (id === 'strict' && old.absentWarn === 5 && old.absentAlarm === 15 && old.homeworkAlarm === 15) return { levels: STRICT_LEVELS };
  return null;
}

/** Đủ trường; mẫu lưu dạng ngưỡng cũ được đổi sang bảng mức. */
export function normalizeTemplate(raw: Partial<MonitorTemplate> & { id: string }): MonitorTemplate {
  const m: any = raw.monitor;
  const legacy = m && typeof m.absentWarn === 'number' ? starterLevels(raw.id, m) : null;
  return {
    id: raw.id,
    name: (raw.name || '').trim() || 'Mẫu không tên',
    monitor: legacy || normalizeConfig(m),
    analysis: { ...DEFAULT_ANALYSIS_RULES, ...(raw.analysis || {}) },
    updatedAt: raw.updatedAt
  };
}

export const newTemplateId = () => `tpl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Mẫu đang áp dụng cho 1 môn: mẫu riêng của môn → mẫu mặc định → mẫu đầu tiên. */
export function resolveTemplate(templates: MonitorTemplate[], assign: TemplateAssignment, courseId: string) {
  const byId = (id?: string) => (id ? templates.find(t => t.id === id) : undefined);
  const own = byId(assign.byCourse[courseId]?.templateId);
  const template = own || byId(assign.defaultId) || templates[0] || STARTER_TEMPLATES[0];
  return { template, perCourse: !!own };
}

/** Tóm tắt các mức của mẫu, vd "Cấm thi · Báo động · Cảnh báo · Sắp vượt ngưỡng". */
export function describeTemplate(t: MonitorTemplate): string {
  return t.monitor.levels.map(l => l.name).join(' · ') || 'Chưa có mức nào';
}
