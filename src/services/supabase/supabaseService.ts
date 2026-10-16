import { AppConfig } from '~/src/types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

/** Bảng còn dùng: mẫu giám sát học tập (dùng chung). */
const REQUIRED_TABLES = ['monitor_templates'] as const;
/** Bảng của chức năng đã bỏ (kho đề, kết quả chấm đồng bộ, ghi chú chăm sóc — nay lưu thẳng trên QLĐT) — xoá khi khởi tạo lại. */
export const OBSOLETE_TABLES = ['exercises', 'submissions', 'care_notes'] as const;

const MONITOR_TEMPLATES_SQL = `
  CREATE TABLE IF NOT EXISTS monitor_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    monitor_rules JSONB NOT NULL,
    analysis_rules JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
  );
  ALTER TABLE monitor_templates ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Public access to monitor_templates" ON monitor_templates;
  CREATE POLICY "Public access to monitor_templates" ON monitor_templates FOR ALL USING (true) WITH CHECK (true);
`;

/** Bảng không tồn tại: Postgres 42P01 hoặc PostgREST "Could not find the table … in the schema cache". */
const isMissingTable = (error: any) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /could not find the table/i.test(error.message || ''));

/**
 * SupabaseService (Direct Client)
 * Kết nối trực tiếp tới Supabase bằng @supabase/supabase-js (anon key),
 * không qua backend trung gian. Yêu cầu Row Level Security (RLS) đã được
 * cấu hình đúng trên bảng monitor_templates vì anon key
 * nằm công khai trong mã nguồn extension.
 */
export class SupabaseService {
  public static isEnabled(config: AppConfig): boolean {
    return config.supabaseSyncEnabled && isSupabaseConfigured(config);
  }

  /** Đã khởi tạo đủ các bảng còn dùng chưa. */
  public static async verifyDatabaseSchema(config: AppConfig): Promise<boolean> {
    const client = getSupabaseClient(config);
    if (!client) return false;
    try {
      for (const table of REQUIRED_TABLES) {
        const { error } = await client.from(table).select('*').limit(1);
        if (isMissingTable(error)) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Chạy SQL bằng Supabase Management API (cần Personal Access Token) — POST /v1/projects/{ref}/database/query. */
  private static async runSql(config: AppConfig, pat: string, query: string): Promise<void> {
    const match = config.supabaseUrl.trim().match(/https:\/\/([a-z0-9]+)\.supabase\.(co|net)/i);
    const ref = match ? match[1] : null;
    if (!ref) throw new Error("Không thể trích xuất Project Ref từ Supabase URL.");
    if (!pat || !pat.trim()) throw new Error("Vui lòng nhập Supabase Personal Access Token (PAT).");

    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat.trim()}`,
        'Content-Type': 'application/json'
      },
      // Làm mới schema cache của PostgREST để bảng vừa tạo dùng được ngay qua API
      body: JSON.stringify({ query: `${query}
NOTIFY pgrst, 'reload schema';` })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Lỗi ${res.status}: ${errText}`);
    }
  }

  /**
   * Khởi tạo CSDL: tạo / cập nhật monitor_templates và XOÁ VĨNH VIỄN các bảng của chức năng đã bỏ
   * (exercises, submissions, care_notes). Giao diện phải hỏi xác nhận trước khi gọi.
   */
  public static async initializeDatabaseSchema(config: AppConfig, pat: string): Promise<void> {
    await SupabaseService.runSql(config, pat, `
      -- Xoá bảng của chức năng đã bỏ (kho đề, kết quả chấm đồng bộ)
      ${OBSOLETE_TABLES.map(t => `DROP TABLE IF EXISTS ${t};`).join('\n      ')}
      ${MONITOR_TEMPLATES_SQL}
    `);
  }

  /** Chỉ tạo bảng mẫu giám sát (không đụng tới bảng khác) — dùng cho nút "Tạo bảng" ở Giám sát học tập. */
  public static async createMonitorTemplatesTable(config: AppConfig, pat: string): Promise<void> {
    await SupabaseService.runSql(config, pat, MONITOR_TEMPLATES_SQL);
  }

  /* -------------------------------------------------------------
   * Monitor Templates (mẫu giám sát học tập dùng chung)
   * ------------------------------------------------------------- */
  public static async listMonitorTemplates(config: AppConfig): Promise<any[]> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error("Supabase chưa được cấu hình.");
    const { data, error } = await client.from("monitor_templates").select("*").order("updated_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  public static async upsertMonitorTemplates(
    config: AppConfig,
    templates: { id: string; name: string; monitor: object; analysis: object }[]
  ): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error("Supabase chưa được cấu hình.");
    const { error } = await client.from("monitor_templates").upsert(templates.map(t => ({
      id: t.id,
      name: t.name,
      monitor_rules: t.monitor,
      analysis_rules: t.analysis,
      updated_at: new Date().toISOString()
    })));
    if (error) throw new Error(error.message);
  }

  public static async deleteMonitorTemplate(config: AppConfig, id: string): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error("Supabase chưa được cấu hình.");
    const { error } = await client.from("monitor_templates").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}
