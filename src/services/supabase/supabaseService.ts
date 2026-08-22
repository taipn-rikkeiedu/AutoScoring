import { AppConfig } from '~/src/types';
import { logger } from '~/src/core/logger';
import { FastApiClient } from '~/src/services/api';

/**
 * SupabaseService (Proxy Client)
 * Chuyển toàn bộ thao tác CSDL về Backend FastAPI Server.
 * Phía Frontend không giữ kết nối trực tiếp đến DB, chỉ gọi qua REST API chuẩn.
 */
export class SupabaseService {
  private static getBackendCredentials(config: AppConfig) {
    const url = config.fastApiServerUrl || (config.aiProvider === "fastapi_server" ? config.aiApiUrl : undefined);
    const key = config.fastApiSecretKey || (config.aiProvider === "fastapi_server" ? config.aiApiKey : undefined);
    return { url, key };
  }

  public static isEnabled(config: AppConfig): boolean {
    return true;
  }

  /**
   * Khởi tạo cấu trúc bảng thông qua Backend FastAPI Server
   */
  public static async initializeDatabaseSchema(config: AppConfig, pat: string): Promise<void> {
    const { url, key } = this.getBackendCredentials(config);
    try {
      await FastApiClient.runDatabaseMigration(pat, url, key);
      logger.success("SUPABASE", "Khởi tạo cấu trúc bảng CSDL thành công qua Backend.");
    } catch (err: any) {
      logger.error("SUPABASE", "Lỗi khởi tạo CSDL qua Backend.", err.message || err);
      throw err;
    }
  }

  /**
   * Kiểm tra trạng thái các bảng CSDL thông qua Backend FastAPI Server
   */
  public static async checkDatabaseTables(config: AppConfig): Promise<boolean> {
    const { url, key } = this.getBackendCredentials(config);
    try {
      const status = await FastApiClient.getDatabaseStatus(url, key);
      return status.tables_ready;
    } catch (e: any) {
      logger.warn("SUPABASE", `Không thể kiểm tra trạng thái CSDL: ${e.message}`);
      return false;
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
    const { url, key } = this.getBackendCredentials(config);
    try {
      await FastApiClient.upsertCareNote({
        class_id: classId,
        student_id: studentId,
        student_name: studentName,
        subject_name: subjectName,
        study_date: studyDate,
        note: note
      }, url, key);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi gửi thông tin chăm sóc học viên qua Backend API.", e.message || e);
      throw e;
    }
  }

  public static async pullCareNotes(config: AppConfig, classId: string): Promise<any[]> {
    const { url, key } = this.getBackendCredentials(config);
    try {
      return await FastApiClient.pullCareNotes(classId, url, key);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi tải thông tin chăm sóc học viên qua Backend API.", e.message || e);
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
    const { url, key } = this.getBackendCredentials(config);
    try {
      await FastApiClient.upsertExercise({
        chapter,
        session,
        assignment_name: assignmentName,
        assignment_text: assignmentText,
        criteria
      }, url, key);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi đồng bộ đề bài mẫu qua Backend API.", e.message || e);
      throw e;
    }
  }

  public static async pullExercises(config: AppConfig): Promise<any[]> {
    const { url, key } = this.getBackendCredentials(config);
    try {
      return await FastApiClient.pullExercises(url, key);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi tải danh sách đề bài qua Backend API.", e.message || e);
      return [];
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
    const { url, key } = this.getBackendCredentials(config);
    try {
      await FastApiClient.upsertSubmission({
        class_id: classId,
        student_id: studentId,
        student_name: studentName,
        chapter: chapter,
        session: session,
        assignment_name: assignmentName,
        github_url: githubUrl || "",
        score: score !== null ? parseFloat(score) : null,
        report: report || ""
      }, url, key);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi lưu điểm học viên qua Backend API.", e.message || e);
      throw e;
    }
  }

  public static async pullSubmissions(config: AppConfig, classId: string): Promise<any[]> {
    const { url, key } = this.getBackendCredentials(config);
    try {
      return await FastApiClient.pullSubmissions(classId, url, key);
    } catch (e: any) {
      logger.error("SUPABASE", "Lỗi tải lịch sử chấm bài qua Backend API.", e.message || e);
      return [];
    }
  }
}
