import { API_BASE_URLS } from '../services/api/endpoints';

export const APP_INFO = {
  name: "REduX",
  version: "4.18.0",
  description: "REduX extension for LMS scraping, GitHub submission loading, AI grading, and Excel reports"
} as const;

export const AI_DEFAULTS = {
  provider: "fastapi_server",
  geminiModel: "gemini-3.1-flash-lite",
  openAiModel: "gpt-4o-mini",
  deepSeekModel: "deepseek-chat",
  openRouterModel: "qwen/qwen3-coder:free",
  localModel: "gemma-4-31b",
  fastApiModel: "gemini-3.1-flash-lite"
} as const;

export const API_ENDPOINTS = {
  geminiBase: API_BASE_URLS.gemini,
  openAiBase: API_BASE_URLS.openAi,
  deepSeekBase: API_BASE_URLS.deepSeek,
  openRouterBase: API_BASE_URLS.openRouter,
  fastApiBase: `${API_BASE_URLS.fastApi}${API_BASE_URLS.fastApiPrefix}`,
  githubApiBase: API_BASE_URLS.githubApi,
  githubCodeLoadBase: API_BASE_URLS.githubCodeLoad
} as const;

export const BACKGROUND_FETCH_PROXY = {
  allowedHosts: ["api.github.com", "codeload.github.com", "raw.githubusercontent.com", "apiportal.rikkei.edu.vn"],
  allowedMethods: ["GET", "HEAD"],
  allowedHeaders: ["accept", "authorization", "user-agent"]
} as const;

export const STORAGE_KEYS = {
  aiProvider: "aiProvider",
  aiApiKey: "aiApiKey",
  aiApiUrl: "aiApiUrl",
  aiModelName: "aiModelName",
  fastApiServerUrl: "fastApiServerUrl",
  fastApiSecretKey: "fastApiSecretKey",
  githubToken: "githubToken",
  systemPrompt: "systemPrompt",
  graderIgnoreItems: "graderIgnoreItems",
  exerciseSource: "exerciseSource",
  exerciseApiUrl: "exerciseApiUrl",
  exerciseApiToken: "exerciseApiToken",
  uploadedExercises: "uploadedExercises",
  supabaseSyncEnabled: "supabaseSyncEnabled",
  supabaseUrl: "supabaseUrl",
  supabaseAnonKey: "supabaseAnonKey",
  supabasePat: "supabasePat",
  googleApiKey: "googleApiKey",
  activeStudentTransition: "activeStudentTransition",
  careStudents: "careStudents",
  classStudentLists: "classStudentLists",
  legacyClassStudentList: "classStudentList",
  detectedSubmissions: "detectedSubmissions",
  customShortcuts: "customShortcuts",
  uiWindowMode: "uiWindowMode"
} as const;

export const GRADER_IGNORE_DEFAULTS = [
  "build/", "dist/", "target/", "out/", ".vscode/", ".idea/", "env/", "venv/",
  "Scripts/", "Lib/", "scripts/", "lib/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "composer.lock", "gradlew/mvnw", ".gitignore"
] as const;

export const GRADING_TEXT = {
  defaultCriteria: "Đúng yêu cầu bài toán. Có thể không cần quan tâm phần Yêu cầu nộp bài.",
  defaultSystemPrompt: `Bạn là chuyên gia chấm điểm mã nguồn. Hãy đánh giá mã nguồn học viên theo thang 100 điểm dựa trên ĐỀ BÀI và TIÊU CHÍ.

YÊU CẦU QUAN TRỌNG VỀ PHẢN HỒI:
- Phải CỰC KỲ NGẮN GỌN, súc tích, tự nhiên, lược bỏ mọi từ ngữ thừa, lời chào hay kết luận xã giao.
- Tuyệt đối không dùng dấu in đậm (dấu **) và không sử dụng các thẻ HTML hay thẻ XML phụ như <score>.
- Phần nhận xét chỉ viết duy nhất một đoạn văn ngắn gọn, tự nhiên từ 1 đến 3 câu. Nêu rõ các module/endpoint/chức năng đã làm tốt, giải pháp bảo mật/xử lý bẫy dữ liệu, các mã lỗi HTTP tương ứng. Tiếp theo chỉ ra các phần còn thiếu sót như endpoint chưa làm, thiếu cấu hình, thiếu test case/báo cáo phân tích hoặc minh chứng chạy chương trình, lỗi định dạng tên repository GitHub (nếu có).

Định dạng phản hồi bắt buộc (tuân thủ 100% Markdown):
[Đoạn văn nhận xét tự nhiên, súc tích: Nêu rõ các module/endpoint/chức năng đã làm tốt, giải pháp bảo mật/xử lý bẫy dữ liệu, các mã lỗi HTTP tương ứng. Tiếp theo chỉ ra các phần còn thiếu sót như endpoint chưa làm, thiếu cấu hình, thiếu test case/báo cáo phân tích hoặc minh chứng chạy chương trình].

Tổng điểm: [Điểm]/100

---
Ví dụ nhận xét mẫu chuẩn:
Sinh viên đã hoàn thành tốt các yêu cầu về xây dựng Middleware phân quyền RBAC và cấu hình bảo mật CORS. Hệ thống sử dụng \`FastAPI\` với cấu trúc module rõ ràng, triển khai \`Custom Middleware\` để kiểm tra \`X-User-Role\` và trả về mã lỗi 403 Forbidden chính xác khi truy cập trái phép. Cấu hình CORS được thiết lập nghiêm ngặt với whitelist domain cụ thể, loại bỏ hoàn toàn wildcard \`*\`. Tuy nhiên, sinh viên thiếu file \`requirements.txt\` và chưa cung cấp báo cáo kiểm thử (test cases) hoặc minh chứng chạy chương trình cụ thể cho các kịch bản phân quyền và CORS theo yêu cầu.

Tổng điểm: 85/100

---
ĐỀ BÀI:
{{assignment}}

TIÊU CHÍ:
{{criteria}}

MÃ NGUỒN:
{{code}}`
} as const;

export const UI_MESSAGES = {
  statuses: {
    supabaseInactive: "Chưa kích hoạt",
    supabaseReady: "🟢 Sẵn sàng",
    supabaseDbError: "🔴 Lỗi kết nối CSDL",
    exerciseLoadError: "🔴 Lỗi tải ngân hàng"
  },
  common: {
    noActiveTab: "Không tìm thấy tab trình duyệt đang hoạt động.",
    currentTabUnavailable: "❌ Lỗi: Không thể truy cập tab hiện tại.",
    unsupportedAiProvider: "Không hỗ trợ AI Provider đã chọn.",
    missingApiKey: "Chưa cấu hình API Key",
    missingBaseUrl: "Chưa cấu hình Base URL",
    emptyAiResponse: "Phản hồi của AI Model rỗng.",
    invalidScoreResponse: "AI không trả về điểm số hợp lệ hoặc sai định dạng mẫu phản hồi.",
    excelExportFailed: "Không thể xuất Excel: "
  },
  github: {
    invalidUrl: "GitHub URL không hợp lệ. Hãy điền theo mẫu: https://github.com/user/repo-name",
    emptyBinary: "Không có dữ liệu nhị phân để tạo Blob",
    noBackgroundResponse: "Không nhận được phản hồi từ Background Service Worker",
    findingDefaultBranch: "Đang dò tìm nhánh mặc định...",
    downloadingZip: "Đang tải toàn bộ mã nguồn (.ZIP)...",
    extractingZip: "Giải nén và phân tích mã nguồn...",
    zipFallback: "Tải ZIP thất bại. Đang thử dùng Git Trees API...",
    noValidSource: "Không tìm thấy mã nguồn hợp lệ trong Repo."
  },
  background: {
    disallowedUrl: "URL không được phép proxy qua background.",
    disallowedMethod: "Background proxy chỉ cho phép GET/HEAD.",
    invalidSender: "Nguồn message không hợp lệ."
  },
  supabase: {
    invalidUrl: "Supabase URL không hợp lệ."
  }
} as const;
