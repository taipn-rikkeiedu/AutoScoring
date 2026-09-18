import { AppConfig } from '~/src/types';
import { logger } from '~/src/core/logger';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

/**
 * SupabaseService (Direct Client)
 * Kết nối trực tiếp tới Supabase bằng @supabase/supabase-js (anon key),
 * không qua backend trung gian. Yêu cầu Row Level Security (RLS) đã được
 * cấu hình đúng trên 3 bảng care_notes/exercises/submissions vì anon key
 * nằm công khai trong mã nguồn extension.
 */
export class SupabaseService {
  public static isEnabled(config: AppConfig): boolean {
    return config.supabaseSyncEnabled && isSupabaseConfigured(config);
  }

  public static async verifyDatabaseSchema(config: AppConfig): Promise<boolean> {
    const client = getSupabaseClient(config);
    if (!client) return false;
    try {
      const { error } = await client.from("submissions").select("class_id").limit(1);
      if (error && error.code === '42P01') {
        // relation does not exist
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  public static async initializeDatabaseSchema(config: AppConfig, pat: string): Promise<void> {
    const match = config.supabaseUrl.trim().match(/https:\/\/([a-z0-9]+)\.supabase\.(co|net)/i);
    const ref = match ? match[1] : null;
    if (!ref) throw new Error("Không thể trích xuất Project Ref từ Supabase URL.");
    if (!pat || !pat.trim()) throw new Error("Vui lòng nhập Supabase Personal Access Token (PAT).");

    const query = `
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

    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/db/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Lỗi ${res.status}: ${errText}`);
    }
  }

  /* -------------------------------------------------------------
   * Care Notes Operations
   * ------------------------------------------------------------- */
  public static async upsertCareNote(
    config: AppConfig,
    classId: string,
    studentId: string,
    studentName: string,
    subjectName: string,
    studyDate: string,
    note: string
  ): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error("Supabase chưa được cấu hình.");
    try {
      const { error } = await client.from("care_notes").upsert({
        class_id: classId,
        student_id: studentId,
        student_name: studentName,
        subject_name: subjectName || "",
        study_date: studyDate || "",
        note: note || "",
        updated_at: new Date().toISOString()
      }, { onConflict: "class_id,student_id,subject_name,study_date" });
      if (error) throw new Error(error.message);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi gửi thông tin chăm sóc học viên lên Supabase.", e.message || e);
      throw e;
    }
  }

  public static async pullCareNotes(config: AppConfig, classId: string): Promise<any[]> {
    const client = getSupabaseClient(config);
    if (!client) return [];
    try {
      const { data, error } = await client.from("care_notes").select("*").eq("class_id", classId);
      if (error) throw new Error(error.message);
      return data || [];
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi tải thông tin chăm sóc học viên từ Supabase.", e.message || e);
      return [];
    }
  }

  /* -------------------------------------------------------------
   * Exercises Bank Operations
   * ------------------------------------------------------------- */
  public static async upsertExercise(
    config: AppConfig,
    chapter: string,
    session: string,
    assignmentName: string,
    assignmentText: string,
    criteria: string
  ): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error("Supabase chưa được cấu hình.");
    try {
      const { error } = await client.from("exercises").upsert({
        chapter,
        session,
        assignment_name: assignmentName,
        assignment_text: assignmentText || "",
        criteria: criteria || "",
        updated_at: new Date().toISOString()
      }, { onConflict: "chapter,session,assignment_name" });
      if (error) throw new Error(error.message);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi đồng bộ đề bài mẫu lên Supabase.", e.message || e);
      throw e;
    }
  }

  public static async pullExercises(config: AppConfig): Promise<any[]> {
    const client = getSupabaseClient(config);
    if (!client) return [];
    try {
      const { data, error } = await client.from("exercises").select("*");
      if (error) throw new Error(error.message);
      return data || [];
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi tải danh sách đề bài từ Supabase.", e.message || e);
      throw e;
    }
  }

  /* -------------------------------------------------------------
   * Submissions Operations
   * ------------------------------------------------------------- */
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
    const client = getSupabaseClient(config);
    if (!client) throw new Error("Supabase chưa được cấu hình.");
    try {
      const { error } = await client.from("submissions").upsert({
        class_id: classId,
        student_id: studentId,
        student_name: studentName,
        chapter,
        session,
        assignment_name: assignmentName,
        github_url: githubUrl || "",
        score: score !== null ? parseFloat(score) : null,
        report: report || "",
        graded_at: new Date().toISOString()
      }, { onConflict: "class_id,student_id,chapter,session,assignment_name" });
      if (error) throw new Error(error.message);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi lưu điểm học viên lên Supabase.", e.message || e);
      throw e;
    }
  }

  public static async pullSubmissions(config: AppConfig, classId: string): Promise<any[]> {
    const client = getSupabaseClient(config);
    if (!client) return [];
    try {
      const { data, error } = await client.from("submissions").select("*").eq("class_id", classId);
      if (error) throw new Error(error.message);
      return data || [];
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi tải lịch sử chấm bài từ Supabase.", e.message || e);
      return [];
    }
  }
}
