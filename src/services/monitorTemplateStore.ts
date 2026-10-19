import { AppConfig } from '~/src/types';
import { STORAGE_KEYS } from '~/src/core/constants';
import { localStore } from '~/src/infra/storage';
import { MonitorTemplate, STARTER_TEMPLATES, normalizeTemplate } from '~/src/core/monitorTemplates';
import { SupabaseService } from '~/src/services/supabase/supabaseService';

/**
 * Lưu mẫu giám sát: Supabase (dùng chung) khi đã bật đồng bộ, bản sao trên máy để dùng khi mất kết nối.
 * Chưa bật Supabase hoặc chưa có bảng → chỉ lưu trên máy.
 */
export type TemplateSource = 'supabase' | 'local';

export interface TemplateLoadResult {
  templates: MonitorTemplate[];
  source: TemplateSource;
  /** Lỗi khi đọc Supabase (vd. chưa tạo bảng) — đang dùng bản trên máy. */
  error?: string;
  tableMissing?: boolean;
}

export async function readLocalTemplates(): Promise<MonitorTemplate[]> {
  const list = await localStore.get(STORAGE_KEYS.monitorTemplates);
  return Array.isArray(list) ? list.map(normalizeTemplate) : [];
}

export const writeLocalTemplates = (templates: MonitorTemplate[]) =>
  localStore.set({ [STORAGE_KEYS.monitorTemplates]: templates });

const fromRow = (row: any): MonitorTemplate => normalizeTemplate({
  id: row.id, name: row.name, monitor: row.monitor_rules, analysis: row.analysis_rules, updatedAt: row.updated_at
});

export async function loadMonitorTemplates(config: AppConfig): Promise<TemplateLoadResult> {
  const local = await readLocalTemplates();
  const fallback = local.length ? local : STARTER_TEMPLATES;
  if (!SupabaseService.isEnabled(config)) return { templates: fallback, source: 'local' };
  try {
    let templates = (await SupabaseService.listMonitorTemplates(config)).map(fromRow);
    if (!templates.length) {
      // Lần đầu dùng chung: đưa mẫu đang có trên máy (hoặc mẫu khởi đầu) lên Supabase
      await SupabaseService.upsertMonitorTemplates(config, fallback);
      templates = fallback;
    }
    await writeLocalTemplates(templates);
    return { templates, source: 'supabase' };
  } catch (e: any) {
    const error = e.message || String(e);
    return { templates: fallback, source: 'local', error, tableMissing: /monitor_templates/i.test(error) };
  }
}

export async function saveMonitorTemplate(config: AppConfig, source: TemplateSource, template: MonitorTemplate) {
  if (source === 'supabase') await SupabaseService.upsertMonitorTemplates(config, [template]);
}

export async function removeMonitorTemplate(config: AppConfig, source: TemplateSource, id: string) {
  if (source === 'supabase') await SupabaseService.deleteMonitorTemplate(config, id);
}
