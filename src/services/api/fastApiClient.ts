import { FASTAPI_ENDPOINTS, normalizeBaseUrl } from './endpoints';

export interface FastApiHealthResponse {
  status: string;
  version: string;
  server_time: string;
  gemini_configured: boolean;
  openai_configured: boolean;
  supabase_configured: boolean;
  message: string;
}

export interface CriteriaDetail {
  name: string;
  passed: boolean;
  score: number;
  max_score: number;
  comment: string;
}

export interface ASTMetrics {
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  blank_lines: number;
  total_functions: number;
  total_classes: number;
  cyclomatic_complexity: number;
  complexity_rank: string;
  detected_patterns: string[];
  potential_issues: string[];
}

export interface GradeRequestPayload {
  student_id?: string;
  student_name?: string;
  class_id?: string;
  chapter?: string;
  session?: string;
  assignment_name: string;
  github_url?: string;
  github_token?: string;
  ignore_items?: string[];
  code_content?: string;
  criteria?: string;
  system_prompt?: string;
  provider?: string;
  model_name?: string;
  api_key?: string;
  save_to_supabase?: boolean;
}

export interface GradeResponsePayload {
  success: boolean;
  total_score: number;
  summary_comment: string;
  criteria_details: CriteriaDetail[];
  clean_code_feedback?: string;
  suggestions?: string[];
  raw_markdown?: string;
  file_list?: string[];
  ast_metrics?: ASTMetrics;
  language?: string;
  duration_ms?: number;
}

export interface CodeAnalysisPayload {
  code_content: string;
  language?: string;
  filename?: string;
}

export interface CodeAnalysisResponsePayload {
  success: boolean;
  language: string;
  metrics: ASTMetrics;
  summary: string;
}

export interface GitHubFetchResponsePayload {
  success: boolean;
  owner: string;
  repo: string;
  branch: string;
  total_files: number;
  file_list: string[];
  code_content: string;
  message?: string;
}

export interface CareNotePayload {
  class_id: string;
  student_id: string;
  student_name: string;
  subject_name?: string;
  study_date?: string;
  note?: string;
}

export interface ExercisePayload {
  chapter: string;
  session: string;
  assignment_name: string;
  assignment_text?: string;
  criteria?: string;
}

export interface SubmissionPayload {
  class_id: string;
  student_id: string;
  student_name: string;
  chapter: string;
  session: string;
  assignment_name: string;
  github_url?: string;
  score?: number | null;
  report: string;
  graded_by?: string;
}

export interface DatabaseStatusResponsePayload {
  configured: boolean;
  connected: boolean;
  tables_ready: boolean;
  tables: Record<string, boolean>;
  message: string;
}

export class FastApiClient {
  /**
   * Tạo headers chung kèm x-api-key nếu có
   */
  private static buildHeaders(apiKey?: string, customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    if (apiKey && apiKey.trim()) {
      headers['x-api-key'] = apiKey.trim();
    }
    return headers;
  }

  /**
   * Timeout mặc định cho các request gọi lúc khởi tạo popup (health check, tải đề bài),
   * để tránh treo UI vô thời hạn khi backend Modal đang cold start hoặc mạng lỗi.
   */
  private static readonly INIT_REQUEST_TIMEOUT_MS = 10000;

  private static async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Hết thời gian chờ phản hồi từ Server (quá ${timeoutMs / 1000}s).`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Kiểm tra trạng thái hoạt động của FastAPI Server
   */
  static async checkHealth(baseUrl?: string, apiKey?: string): Promise<FastApiHealthResponse> {
    const url = FASTAPI_ENDPOINTS.health(baseUrl);
    const headers = this.buildHeaders(apiKey);

    try {
      const res = await this.fetchWithTimeout(url, { headers }, this.INIT_REQUEST_TIMEOUT_MS);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.detail || `FastAPI Server trả về lỗi (HTTP ${res.status})`);
      }
      return await res.json();
    } catch (err: any) {
      if (err.message && (err.message.includes("FastAPI Server") || err.message.includes("HTTP") || err.message.includes("Hết thời gian chờ"))) {
        throw err;
      }
      const host = normalizeBaseUrl(baseUrl);
      throw new Error(`Không thể kết nối đến FastAPI Server tại ${host}. Vui lòng kiểm tra backend đã được khởi chạy chưa (chạy file start_backend.bat) và kiểm tra tường lửa.`);
    }
  }

  /**
   * Tải và giải nén mã nguồn GitHub trực tiếp trên Backend
   */
  static async fetchGitHubRepo(
    githubUrl: string,
    token?: string,
    branch?: string,
    ignoreItems?: string[],
    baseUrl?: string,
    apiKey?: string
  ): Promise<GitHubFetchResponsePayload> {
    const url = FASTAPI_ENDPOINTS.githubFetch(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        github_url: githubUrl,
        token: token || undefined,
        branch: branch || undefined,
        ignore_items: ignoreItems || undefined
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi tải repo từ GitHub (HTTP ${res.status})`);
    }

    return await res.json();
  }

  /**
   * Gửi mã nguồn bài làm (hoặc github_url) tới FastAPI Server để phân tích AST & chấm điểm AI
   */
  static async gradeSubmission(
    payload: GradeRequestPayload, 
    baseUrl?: string, 
    apiKey?: string
  ): Promise<GradeResponsePayload> {
    const url = FASTAPI_ENDPOINTS.grade(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (res.status === 429) {
      throw new Error("RATE_LIMIT");
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi từ FastAPI Server (HTTP ${res.status})`);
    }

    return await res.json();
  }

  /**
   * Phân tích cú pháp AST và đo độ phức tạp code
   */
  static async analyzeCode(
    payload: CodeAnalysisPayload, 
    baseUrl?: string, 
    apiKey?: string
  ): Promise<CodeAnalysisResponsePayload> {
    const url = FASTAPI_ENDPOINTS.analyze(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi phân tích AST (HTTP ${res.status})`);
    }

    return await res.json();
  }

  /* -------------------------------------------------------------
   * DATABASE OPERATIONS: Care Notes
   * ------------------------------------------------------------- */
  static async pullCareNotes(classId: string, baseUrl?: string, apiKey?: string): Promise<CareNotePayload[]> {
    const url = FASTAPI_ENDPOINTS.careNotes(classId, baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi tải ghi chú chăm sóc (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.items || [];
  }

  static async upsertCareNote(payload: CareNotePayload, baseUrl?: string, apiKey?: string): Promise<boolean> {
    const url = FASTAPI_ENDPOINTS.careNotes(undefined, baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi lưu ghi chú chăm sóc (HTTP ${res.status})`);
    }
    return true;
  }

  static async bulkUpsertCareNotes(classId: string, items: CareNotePayload[], baseUrl?: string, apiKey?: string): Promise<number> {
    const url = FASTAPI_ENDPOINTS.careNotesBulk(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ class_id: classId, items })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi bulk upsert care notes (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.count || 0;
  }

  /* -------------------------------------------------------------
   * DATABASE OPERATIONS: Exercises Bank
   * ------------------------------------------------------------- */
  static async pullExercises(baseUrl?: string, apiKey?: string): Promise<ExercisePayload[]> {
    const url = FASTAPI_ENDPOINTS.exercises(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await this.fetchWithTimeout(url, { headers }, this.INIT_REQUEST_TIMEOUT_MS);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi tải ngân hàng đề bài (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.items || [];
  }

  static async upsertExercise(payload: ExercisePayload, baseUrl?: string, apiKey?: string): Promise<boolean> {
    const url = FASTAPI_ENDPOINTS.exercises(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi lưu đề bài mẫu (HTTP ${res.status})`);
    }
    return true;
  }

  static async syncExercises(items: ExercisePayload[], baseUrl?: string, apiKey?: string): Promise<number> {
    const url = FASTAPI_ENDPOINTS.exercisesSync(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi đồng bộ đề bài mẫu (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.count || 0;
  }

  /* -------------------------------------------------------------
   * DATABASE OPERATIONS: Submissions
   * ------------------------------------------------------------- */
  static async pullSubmissions(classId: string, baseUrl?: string, apiKey?: string): Promise<SubmissionPayload[]> {
    const url = FASTAPI_ENDPOINTS.submissions(classId, baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Không thể lấy lịch sử nộp bài (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.items || [];
  }

  static async upsertSubmission(payload: SubmissionPayload, baseUrl?: string, apiKey?: string): Promise<boolean> {
    const url = FASTAPI_ENDPOINTS.submissions(undefined, baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi lưu kết quả bài nộp (HTTP ${res.status})`);
    }
    return true;
  }

  static async bulkUpsertSubmissions(classId: string, items: SubmissionPayload[], baseUrl?: string, apiKey?: string): Promise<number> {
    const url = FASTAPI_ENDPOINTS.submissionsBulk(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ class_id: classId, items })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi lưu hàng loạt bài nộp (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.count || 0;
  }

  /* -------------------------------------------------------------
   * DATABASE OPERATIONS: Admin & Status & Migration
   * ------------------------------------------------------------- */
  static async getDatabaseStatus(baseUrl?: string, apiKey?: string): Promise<DatabaseStatusResponsePayload> {
    const url = FASTAPI_ENDPOINTS.dbStatus(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi kiểm tra trạng thái CSDL (HTTP ${res.status})`);
    }
    return await res.json();
  }

  static async runDatabaseMigration(pat?: string, baseUrl?: string, apiKey?: string): Promise<boolean> {
    const url = FASTAPI_ENDPOINTS.dbMigrate(baseUrl);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ personal_access_token: pat || undefined })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.detail || `Lỗi chạy migration CSDL (HTTP ${res.status})`);
    }
    return true;
  }
}
