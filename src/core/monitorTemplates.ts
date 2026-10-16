/**
 * Mẫu giám sát: bộ ngưỡng (vi phạm học tập + nghi vấn BTVN) đặt tên, tạo / sửa / xoá được.
 * Áp dụng 1 mẫu cho tất cả môn (mẫu mặc định) hoặc riêng từng môn.
 */
import { AnalysisRules, DEFAULT_ANALYSIS_RULES } from './examAnalysis';
import { MonitorRules, DEFAULT_MONITOR_RULES } from './studentMonitor';

export interface MonitorTemplate {
  id: string;
  name: string;
  monitor: MonitorRules;
  analysis: AnalysisRules;
  updatedAt?: string;
}

/** Mẫu áp dụng: mặc định cho mọi môn, có thể đặt riêng theo courseId (kèm tên môn để hiển thị). */
export interface TemplateAssignment {
  defaultId: string;
  byCourse: Record<string, { templateId: string; courseName: string }>;
}

export const STARTER_TEMPLATES: MonitorTemplate[] = [
  { id: 'standard', name: 'Chuẩn', monitor: DEFAULT_MONITOR_RULES, analysis: DEFAULT_ANALYSIS_RULES },
  {
    id: 'strict',
    name: 'Chặt',
    monitor: {
      absentWarn: 5, absentAlarm: 15, homeworkWarn: 5, homeworkAlarm: 15,
      elearningWarn: 1, elearningAlarm: 2, examPass: 50,
      earlyAbsentFrom: 3, earlyHomeworkFrom: 3, earlyExamTo: 60
    },
    analysis: { hwMin: 70, highBelow: 55, midBelow: 70, gapMin: 30, aiHigh: 75 }
  }
];

export const DEFAULT_ASSIGNMENT: TemplateAssignment = { defaultId: STARTER_TEMPLATES[0].id, byCourse: {} };

/** Đủ trường (bổ sung ngưỡng mới bằng giá trị mặc định khi dữ liệu cũ thiếu). */
export function normalizeTemplate(raw: Partial<MonitorTemplate> & { id: string }): MonitorTemplate {
  return {
    id: raw.id,
    name: (raw.name || '').trim() || 'Mẫu không tên',
    monitor: { ...DEFAULT_MONITOR_RULES, ...(raw.monitor || {}) },
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

/** Tóm tắt ngưỡng chính của mẫu (luôn đúng với số liệu, không cần nhập mô tả). */
export function describeTemplate(t: MonitorTemplate): string {
  const m = t.monitor;
  return `Nghỉ học ${m.absentWarn}% / ${m.absentAlarm}% · Thiếu BT ${m.homeworkWarn}% / ${m.homeworkAlarm}% · `
    + `Chậm E-learning ${m.elearningWarn} / ${m.elearningAlarm} bài · Thi dưới ${m.examPass}`;
}
