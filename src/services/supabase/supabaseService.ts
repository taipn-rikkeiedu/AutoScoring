import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig, Student } from '~/src/types';
import { logger } from '~/src/core/logger';

export class SupabaseService {
  private static client: SupabaseClient | null = null;
  private static activeUrl = "";
  private static activeKey = "";

  private static getClient(config: AppConfig): SupabaseClient {
    const url = config.supabaseUrl.trim();
    const key = config.supabaseAnonKey.trim();

    if (!this.client || this.activeUrl !== url || this.activeKey !== key) {
      this.client = createClient(url, key, {
        auth: {
          persistSession: false
        }
      });
      this.activeUrl = url;
      this.activeKey = key;
    }
    return this.client;
  }

  public static isEnabled(config: AppConfig): boolean {
    return !!(config && config.supabaseSyncEnabled && config.supabaseUrl && config.supabaseAnonKey);
  }

  /**
   * Run SQL DDL scripts to create submissions, care_notes, exercises, and class_students tables
   * on the remote Supabase PostgreSQL server using their official Management API.
   */
  public static async initializeDatabaseSchema(config: AppConfig, pat: string): Promise<void> {
    const url = config.supabaseUrl.trim();
    const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.(co|net)/i);
    const projectRef = match ? match[1] : null;

    if (!projectRef) {
      throw new Error("Không thể trích xuất Project Ref từ Supabase URL.");
    }

    const sqlScript = `
      -- 1. Tạo bảng submissions
      CREATE TABLE IF NOT EXISTS submissions (
        class_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        chapter TEXT NOT NULL,
        session TEXT NOT NULL,
        assignment_name TEXT NOT NULL,
        github_url TEXT NOT NULL,
        score NUMERIC,
        report TEXT NOT NULL,
        graded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        PRIMARY KEY (class_id, student_id, chapter, session, assignment_name)
      );

      -- 2. Tạo bảng care_notes
      CREATE TABLE IF NOT EXISTS care_notes (
        class_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        subject_name TEXT NOT NULL,
        study_date TEXT NOT NULL,
        note TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        PRIMARY KEY (class_id, student_id, subject_name, study_date)
      );

      -- 3. Tạo bảng exercises
      CREATE TABLE IF NOT EXISTS exercises (
        chapter TEXT NOT NULL,
        session TEXT NOT NULL,
        assignment_name TEXT NOT NULL,
        assignment_text TEXT NOT NULL,
        criteria TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        PRIMARY KEY (chapter, session, assignment_name)
      );

      -- Bật Row Level Security (RLS)
      ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE care_notes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

      -- Xóa policies cũ nếu đã tồn tại
      DROP POLICY IF EXISTS "Public access to submissions" ON submissions;
      DROP POLICY IF EXISTS "Public access to care_notes" ON care_notes;
      DROP POLICY IF EXISTS "Public access to exercises" ON exercises;

      -- Cấu hình quyền đọc/ghi công khai (Zero Setup) cho các bảng
      CREATE POLICY "Public access to submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Public access to care_notes" ON care_notes FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Public access to exercises" ON exercises FOR ALL USING (true) WITH CHECK (true);
    `;

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/db/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pat.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: sqlScript
      })
    });

    if (!response.ok) {
      const errMsg = await response.text();
      throw new Error(errMsg || `Lỗi HTTP ${response.status}`);
    }
  }

  /**
   * Verify if all necessary tables exist in the Supabase database schema
   */
  public static async checkDatabaseTables(config: AppConfig): Promise<boolean> {
    if (!this.isEnabled(config)) return false;
    try {
      const client = this.getClient(config);
      
      const [r1, r2, r3] = await Promise.all([
        client.from('submissions').select('class_id').limit(1),
        client.from('care_notes').select('class_id').limit(1),
        client.from('exercises').select('chapter').limit(1)
      ]);

      const errors = [r1.error, r2.error, r3.error].filter(Boolean);
      if (errors.length > 0) {
        const hasTableMissing = errors.some(e => 
          e?.message?.includes("does not exist") || 
          e?.code === "42P01" || 
          e?.message?.includes("PGRST116")
        );
        if (hasTableMissing) return false;
      }
      return true;
    } catch (e) {
      console.error("Supabase tables verification error:", e);
      return false;
    }
  }

  public static async upsertCareNote(
    config: AppConfig, 
    classId: string, 
    studentId: string, 
    studentName: string, 
    subjectName: string, 
    studyDate: string, 
    note: string
  ): Promise<void> {
    if (!this.isEnabled(config)) return;
    try {
      const client = this.getClient(config);
      const { error } = await client
        .from('care_notes')
        .upsert({
          class_id: classId,
          student_id: studentId,
          student_name: studentName,
          subject_name: subjectName,
          study_date: studyDate,
          note: note,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'class_id,student_id,subject_name,study_date'
        });

      if (error) throw new Error(error.message);
    } catch (e: any) {
      console.error("Supabase upsertCareNote error:", e);
      logger.error("SUPABASE", "Lỗi gửi thông tin chăm sóc học viên lên Supabase.", e.message || e);
      throw e;
    }
  }

  public static async pullCareNotes(config: AppConfig, classId: string): Promise<any[]> {
    if (!this.isEnabled(config)) return [];
    try {
      const client = this.getClient(config);
      const { data, error } = await client
        .from('care_notes')
        .select('*')
        .eq('class_id', classId);

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e: any) {
      console.error("Supabase pullCareNotes error:", e);
      logger.error("SUPABASE", "Lỗi tải thông tin chăm sóc học viên từ Supabase.", e.message || e);
      throw e;
    }
  }

  public static async upsertExercise(
    config: AppConfig, 
    chapter: string, 
    session: string, 
    assignmentName: string, 
    assignmentText: string, 
    criteria: string
  ): Promise<void> {
    if (!this.isEnabled(config)) return;
    try {
      const client = this.getClient(config);
      const { error } = await client
        .from('exercises')
        .upsert({
          chapter: chapter,
          session: session,
          assignment_name: assignmentName,
          assignment_text: assignmentText,
          criteria: criteria,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'chapter,session,assignment_name'
        });

      if (error) throw new Error(error.message);
    } catch (e: any) {
      console.error("Supabase upsertExercise error:", e);
      logger.error("SUPABASE", "Lỗi đồng bộ đề bài mẫu lên Supabase.", e.message || e);
      throw e;
    }
  }

  public static async pullExercises(config: AppConfig): Promise<any[]> {
    if (!this.isEnabled(config)) return [];
    try {
      const client = this.getClient(config);
      const { data, error } = await client
        .from('exercises')
        .select('*');

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e: any) {
      console.error("Supabase pullExercises error:", e);
      logger.error("SUPABASE", "Lỗi tải danh sách đề bài từ Supabase.", e.message || e);
      throw e;
    }
  }

  public static async upsertSubmission(
    config: AppConfig, 
    classId: string, 
    studentId: string, 
    studentName: string, 
    chapter: string, 
    session: string, 
    assignmentName: string, 
    githubUrl: string, 
    score: string | null, 
    report: string
  ): Promise<void> {
    if (!this.isEnabled(config)) return;
    try {
      const client = this.getClient(config);
      const { error } = await client
        .from('submissions')
        .upsert({
          class_id: classId,
          student_id: studentId,
          student_name: studentName,
          chapter: chapter,
          session: session,
          assignment_name: assignmentName,
          github_url: githubUrl || "",
          score: score !== null ? parseFloat(score) : null,
          report: report || "",
          graded_at: new Date().toISOString()
        }, {
          onConflict: 'class_id,student_id,chapter,session,assignment_name'
        });

      if (error) throw new Error(error.message);
    } catch (e: any) {
      console.error("Supabase upsertSubmission error:", e);
      logger.error("SUPABASE", "Lỗi tải điểm học viên lên Supabase.", e.message || e);
      throw e;
    }
  }

  public static async pullSubmissions(config: AppConfig, classId: string): Promise<any[]> {
    if (!this.isEnabled(config)) return [];
    try {
      const client = this.getClient(config);
      const { data, error } = await client
        .from('submissions')
        .select('*')
        .eq('class_id', classId);

      if (error) throw new Error(error.message);
      return data || [];
    } catch (e: any) {
      console.error("Supabase pullSubmissions error:", e);
      logger.error("SUPABASE", "Lỗi tải lịch sử chấm bài của lớp từ Supabase.", e.message || e);
      throw e;
    }
  }

}
