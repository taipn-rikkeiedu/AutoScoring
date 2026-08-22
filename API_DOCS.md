# 📖 REduX AI Backend - API Documentation for Frontend

> **Tài liệu hướng dẫn tích hợp Frontend (React, Vue, Chrome Extension, AutoScoring)**  
> **Base URL:** `http://localhost:8000/api/v1`  
> **Interactive Swagger UI:** `http://localhost:8000/api/v1/docs`  
> **ReDoc:** `http://localhost:8000/api/v1/redoc`  

---

## 📑 Mục lục
1. [Xác thực & Bảo mật (Authentication)](#1-xác-thực--bảo-mật-authentication)
2. [Cơ chế BYOK (Bring Your Own Key)](#2-cơ-chế-byok-bring-your-own-key)
3. [TypeScript Interfaces & Types](#3-typescript-interfaces--types)
4. [Chi tiết các Endpoints](#4-chi-tiết-các-endpoints)
   - [3.1. Kiểm tra kết nối (Health Check)](#41-kiểm-tra-kết-nối-health-check)
   - [3.2. Chấm điểm bài tập (Full JSON)](#42-chấm-điểm-bài-tập-full-json)
   - [3.3. Chấm điểm bài tập Real-time (SSE Stream)](#43-chấm-điểm-bài-tập-real-time-sse-stream)
   - [3.4. Phân tích AST & Độ phức tạp mã nguồn](#44-phân-tích-ast--độ-phức-tạp-mã-nguồn)
   - [3.5. Đồng bộ Barem & Vector Search (RAG)](#45-đồng-bộ-barem--vector-search-rag)
   - [3.6. Lấy lịch sử bài nộp theo lớp](#46-lấy-lịch-sử-bài-nộp-theo-lớp)
5. [Code mẫu tích hợp Client (TypeScript)](#5-code-mẫu-tích-hợp-client-typescript)
6. [Mã lỗi HTTP thường gặp & Xử lý](#6-mã-lỗi-http-thường-gặp--xử-lý)

---

## 1. Xác thực & Bảo mật (Authentication)

Nếu server bật xác thực (`SERVER_SECRET_KEY` được định nghĩa trong `.env`), tất cả các request gửi từ Frontend (trừ endpoint `/health` và `/`) cần đính kèm một trong hai Header sau:

```http
x-api-key: redux_secret_key_change_me_in_production
```
*hoặc*
```http
Authorization: Bearer redux_secret_key_change_me_in_production
```

---

## 2. Cơ chế BYOK (Bring Your Own Key)

Hệ thống hỗ trợ cơ chế **BYOK (Bring Your Own Key)** cho các nhà cung cấp AI:
- Frontend có thể truyền trực tiếp `api_key` của người dùng (Gemini, OpenAI, DeepSeek) trong body của request.
- **Thứ tự ưu tiên:**
  1. Nếu request body có trường `api_key` $\rightarrow$ Sử dụng key do Frontend gửi sang.
  2. Nếu không có hoặc để `null` $\rightarrow$ Fallback lấy key mặc định từ `.env` trên Server.

---

## 3. TypeScript Interfaces & Types

Tạo file `src/types/aiBackend.ts` trong mã nguồn Frontend:

```typescript
// Nhà cung cấp AI hỗ trợ
export type AIProvider = 'gemini' | 'openai' | 'deepseek';

// Payload gửi lên để chấm bài
export interface GradeRequest {
  code_content: string;               // [Bắt buộc] Nội dung mã nguồn bài làm
  assignment_name?: string;           // Tên bài tập
  student_id?: string;               // Mã học viên
  student_name?: string;             // Tên học viên
  class_id?: string;                 // Mã lớp
  chapter?: string;                  // Chương học
  session?: string;                  // Buổi học
  github_url?: string;               // URL bài nộp github
  criteria?: string;                 // Barem tiêu chí (để trống nếu muốn RAG tự động tìm)
  system_prompt?: string;            // System Prompt tuỳ biến
  provider?: AIProvider;             // 'gemini' | 'openai' | 'deepseek' (Mặc định: 'gemini')
  model_name?: string;               // 'gemini-2.5-flash', 'gpt-4o-mini', 'deepseek-chat'
  api_key?: string;                  // BYOK: API Key người dùng nhập từ Frontend
  save_to_supabase?: boolean;        // Lưu kết quả vào DB Supabase (Mặc định: true)
}

// Chi tiết điểm từng tiêu chí
export interface CriteriaDetail {
  name: string;
  passed: boolean;
  score: number;
  max_score: number;
  comment: string;
}

// Kết quả phân tích cú pháp AST & Cyclomatic Complexity
export interface ASTMetrics {
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  blank_lines: number;
  total_functions: number;
  total_classes: number;
  cyclomatic_complexity: number;
  complexity_rank: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  detected_patterns: string[];
  potential_issues: string[];
}

// Kết quả chấm điểm trả về
export interface GradeResult {
  success: boolean;
  total_score: number;
  summary_comment: string;
  criteria_details: CriteriaDetail[];
  clean_code_feedback: string;
  suggestions: string[];
  raw_markdown: string;
  ast_metrics?: ASTMetrics;
  language?: string;
  duration_ms?: number;
}

// Sự kiện Streaming thời gian thực (SSE)
export interface StreamProgressEvent {
  step: number;
  total_steps: number;
  status: 'ANALYZING_CODE' | 'RAG_SEARCHING' | 'AI_SCORING' | 'COMPLETED';
  message: string;
  data?: GradeResult;
}

// Yêu cầu phân tích cú pháp AST độc lập
export interface CodeAnalysisRequest {
  code_content: string;
  language?: string;
  filename?: string;
}

export interface CodeAnalysisResponse {
  success: boolean;
  language: string;
  metrics: ASTMetrics;
  summary: string;
}

// Thông tin trạng thái Server
export interface HealthResponse {
  status: string;
  version: string;
  server_time: string;
  gemini_configured: boolean;
  openai_configured: boolean;
  supabase_configured: boolean;
  message: string;
}
```

---

## 4. Chi tiết các Endpoints

### 4.1. Kiểm tra kết nối (Health Check)
Dùng để kiểm tra trạng thái hoạt động của Backend và cấu hình các Provider.

- **URL:** `GET /health`
- **Yêu cầu Auth:** Không

#### Response mẫu (200 OK):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "server_time": "2026-08-20T12:53:02.374051Z",
  "gemini_configured": true,
  "openai_configured": false,
  "supabase_configured": false,
  "message": "REduX AI Core Server is running smoothly"
}
```

---

### 4.2. Chấm điểm bài tập (Full JSON)
Thực hiện toàn bộ quy trình: Phân tích AST $\rightarrow$ Tìm barem RAG $\rightarrow$ Gọi AI $\rightarrow$ Trả kết quả JSON tổng hợp.

- **URL:** `POST /grade`
- **Headers:** `Content-Type: application/json`

#### Request Body:
```json
{
  "student_id": "HV_001",
  "student_name": "Nguyễn Văn A",
  "class_id": "JAVA_K24",
  "chapter": "Chương 2",
  "session": "Buổi 3",
  "assignment_name": "Tính diện tích hình tròn",
  "code_content": "public class Circle { public double getArea(double r) { return Math.PI * r * r; } }",
  "criteria": "",
  "provider": "gemini",
  "model_name": "gemini-2.5-flash",
  "api_key": "AIzaSy..."
}
```

#### Response mẫu (200 OK):
```json
{
  "success": true,
  "total_score": 9.5,
  "summary_comment": "Bài làm hoàn thành tốt, đúng công thức toán học và cấu trúc code chuẩn.",
  "criteria_details": [
    {
      "name": "Tính đúng đắn",
      "passed": true,
      "score": 5.0,
      "max_score": 5.0,
      "comment": "Công thức tính chính xác."
    },
    {
      "name": "Clean Code & Naming",
      "passed": true,
      "score": 4.5,
      "max_score": 5.0,
      "comment": "Tên hàm rõ nghĩa, nên validate r > 0."
    }
  ],
  "clean_code_feedback": "Nên bổ sung kiểm tra dữ liệu đầu vào r >= 0 trước khi tính.",
  "suggestions": [
    "Thêm validation: if (r < 0) throw new IllegalArgumentException(\"Bán kính phải >= 0\");"
  ],
  "raw_markdown": "```json\n...\n```",
  "ast_metrics": {
    "total_lines": 1,
    "code_lines": 1,
    "comment_lines": 0,
    "blank_lines": 0,
    "total_functions": 1,
    "total_classes": 1,
    "cyclomatic_complexity": 1,
    "complexity_rank": "A",
    "detected_patterns": ["METHOD_DECLARATION", "CLASS_DECLARATION"],
    "potential_issues": []
  },
  "language": "java",
  "duration_ms": 1240
}
```

---

### 4.3. Chấm điểm bài tập Real-time (SSE Stream)
Nhận luồng sự kiện Server-Sent Events (SSE) theo từng bước để làm thanh tiến trình thời gian thực.

- **URL:** `POST /grade/stream`
- **Headers:** `Content-Type: application/json`
- **Request Body:** Tương tự như `/grade`
- **Response Format:** `text/event-stream`

#### Dòng dữ liệu Server bắn về (Mỗi sự kiện cách nhau bởi `\n\n`):
```text
{"step": 1, "total_steps": 4, "status": "ANALYZING_CODE", "message": "Đang phân tích cú pháp tĩnh AST & đo độ phức tạp code..."}

{"step": 2, "total_steps": 4, "status": "RAG_SEARCHING", "message": "Đã nhận diện JAVA (1 dòng). Đang truy xuất barem tiêu chí..."}

{"step": 3, "total_steps": 4, "status": "AI_SCORING", "message": "Đang gửi dữ liệu tới AI (GEMINI)..."}

{"step": 4, "total_steps": 4, "status": "COMPLETED", "message": "Chấm điểm hoàn tất! Điểm: 9.5/10", "data": { ...GradeResult Object... }}
```

---

### 4.4. Phân tích AST & Độ phức tạp mã nguồn
Phân tích tĩnh mã nguồn cục bộ (không gọi AI, tốc độ < 10ms, không tốn chi phí token).

- **URL:** `POST /analyze`
- **Request Body:**
```json
{
  "code_content": "function fibonacci(n) { if (n <= 1) return n; return fibonacci(n-1) + fibonacci(n-2); }",
  "language": "javascript",
  "filename": "fib.js"
}
```

#### Response mẫu (200 OK):
```json
{
  "success": true,
  "language": "javascript",
  "metrics": {
    "total_lines": 1,
    "code_lines": 1,
    "comment_lines": 0,
    "blank_lines": 0,
    "total_functions": 1,
    "total_classes": 0,
    "cyclomatic_complexity": 2,
    "complexity_rank": "A",
    "detected_patterns": ["ARROW_OR_FUNCTION", "RECURSION"],
    "potential_issues": []
  },
  "summary": "Ngôn ngữ: JAVASCRIPT | Dòng code: 1 | Số hàm: 1 | Số class: 0 | Độ phức tạp $CCN$: 2 (A)"
}
```

---

### 4.5. Đồng bộ Barem & Vector Search (RAG)

#### A. Đồng bộ Barem và sinh Vector Embedding lên Supabase:
- **URL:** `POST /rag/sync`
- **Request Body:**
```json
{
  "chapter": "Chương 1",
  "session": "Buổi 1",
  "assignment_name": "In chuỗi Hello World",
  "criteria_content": "1. In đúng dòng chữ 'Hello World'\n2. Đặt tên file là Main.java",
  "sample_solution": "public class Main { public static void main(String[] args) { System.out.println(\"Hello World\"); } }"
}
```

#### B. Tìm kiếm Barem theo độ tương đồng ngữ nghĩa:
- **URL:** `POST /rag/search`
- **Request Body:**
```json
{
  "query_text": "Chương 1 Buổi 1 In chuỗi Hello World",
  "match_threshold": 0.5,
  "limit": 2
}
```

---

### 4.6. Lấy lịch sử bài nộp theo lớp
- **URL:** `GET /submissions?class_id=JAVA_K24`
- **Query Params:** `class_id` (Bắt buộc)

---

## 5. Code mẫu tích hợp Client (TypeScript)

### 🔹 5.1. Hàm kiểm tra kết nối Server (Ping)
```typescript
export async function checkServerHealth(baseUrl = "http://localhost:8000/api/v1"): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "healthy";
  } catch (err) {
    console.error("Không thể kết nối Backend:", err);
    return false;
  }
}
```

---

### 🔹 5.2. Hàm gọi chấm bài (JSON Chuẩn)
```typescript
import { GradeRequest, GradeResult } from './types/aiBackend';

export async function gradeSubmission(
  payload: GradeRequest,
  baseUrl = "http://localhost:8000/api/v1",
  serverSecretKey?: string
): Promise<GradeResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (serverSecretKey) {
    headers["x-api-key"] = serverSecretKey;
  }

  const response = await fetch(`${baseUrl}/grade`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Lỗi HTTP ${response.status}`);
  }

  return await response.json();
}
```

---

### 🔹 5.3. Hàm gọi chấm bài Real-time (SSE Streaming)
```typescript
import { GradeRequest, GradeResult, StreamProgressEvent } from './types/aiBackend';

export async function gradeSubmissionStream(
  payload: GradeRequest,
  onProgress: (event: StreamProgressEvent) => void,
  baseUrl = "http://localhost:8000/api/v1",
  serverSecretKey?: string
): Promise<GradeResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (serverSecretKey) {
    headers["x-api-key"] = serverSecretKey;
  }

  const response = await fetch(`${baseUrl}/grade/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Không thể đọc luồng dữ liệu (ReadableStream không khả dụng)");

  const decoder = new TextDecoder("utf-8");
  let finalResult: GradeResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n\n").filter(line => line.trim().length > 0);

    for (const line of lines) {
      try {
        const event: StreamProgressEvent = JSON.parse(line.trim());
        onProgress(event);
        if (event.status === "COMPLETED" && event.data) {
          finalResult = event.data;
        }
      } catch (parseErr) {
        console.warn("Bỏ qua frame lỗi:", line, parseErr);
      }
    }
  }

  if (!finalResult) {
    throw new Error("Luồng dữ liệu kết thúc nhưng không có kết quả hoàn chỉnh.");
  }

  return finalResult;
}
```

---

## 6. Mã lỗi HTTP thường gặp & Xử lý

| Mã lỗi | Nguyên nhân | Hướng xử lý ở Frontend |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Thiếu API Key (khi cả request lẫn server đều không có key), hoặc payload rỗng | Hiển thị thông báo nhắc người dùng nhập API Key trong phần Settings |
| **`401 Unauthorized`** | Header `x-api-key` hoặc Bearer Token không khớp `SERVER_SECRET_KEY` | Kiểm tra lại Backend Secret Key trong cài đặt |
| **`429 Too Many Requests`** | API Key bị quá giới hạn Rate Limit của Google/OpenAI | Hiển thị thông báo yêu cầu chờ 1 phút hoặc chuyển sang Provider/Key khác |
| **`500 Internal Server Error`** | Lỗi xử lý backend không xác định | Hiển thị log lỗi chi tiết từ `errorData.detail` |
