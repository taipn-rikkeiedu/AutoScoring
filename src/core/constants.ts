export const APP_INFO = {
  name: "REduX",
  version: "4.0.7",
  description: "REduX extension for LMS scraping, GitHub submission loading, AI grading, and Excel reports"
} as const;

export const AI_DEFAULTS = {
  provider: "gemini",
  geminiModel: "gemini-2.5-flash",
  openAiModel: "gpt-4o-mini",
  deepSeekModel: "deepseek-chat",
  openRouterModel: "qwen/qwen3-coder:free",
  localModel: "deepseek-r1:7b"
} as const;

export const API_ENDPOINTS = {
  geminiBase: "https://generativelanguage.googleapis.com/v1beta",
  openAiBase: "https://api.openai.com/v1",
  deepSeekBase: "https://api.deepseek.com",
  openRouterBase: "https://openrouter.ai/api/v1",
  githubApiBase: "https://api.github.com",
  githubCodeLoadBase: "https://codeload.github.com"
} as const;

export const BACKGROUND_FETCH_PROXY = {
  allowedHosts: ["api.github.com", "codeload.github.com", "raw.githubusercontent.com"],
  allowedMethods: ["GET", "HEAD"],
  allowedHeaders: ["accept", "authorization", "user-agent"]
} as const;

export const STORAGE_KEYS = {
  aiProvider: "aiProvider",
  aiApiKey: "aiApiKey",
  aiApiUrl: "aiApiUrl",
  aiModelName: "aiModelName",
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
  activeStudentTransition: "activeStudentTransition",
  careStudents: "careStudents",
  classStudentLists: "classStudentLists",
  legacyClassStudentList: "classStudentList",
  detectedSubmissions: "detectedSubmissions",
  customShortcuts: "customShortcuts"
} as const;

export const GRADER_IGNORE_DEFAULTS = [
  "build/", "dist/", "target/", "out/", ".vscode/", ".idea/", "env/", "venv/",
  "Scripts/", "Lib/", "scripts/", "lib/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "composer.lock", "gradlew/mvnw", ".gitignore"
] as const;

export const GRADING_TEXT = {
  defaultCriteria: "Đúng yêu cầu bài toán. Có thể không cần quan tâm phần Yêu cầu nộp bài.",
  defaultSystemPrompt: `Bạn là chuyên gia chấm điểm mã nguồn. Hãy đánh giá mã nguồn học viên theo thang 100 điểm dựa trên ĐỀ BÀI và TIÊU CHÍ.

YÊU CẦU QUAN TRỌNG: Phản hồi phải CỰC KỲ NGẮN GỌN, súc tích, đi thẳng vào lỗi sai và lược bỏ mọi từ ngữ thừa, lời chào hay kết luận.

Định dạng phản hồi bắt buộc (tuân thủ 100% Markdown):
## ĐÁNH GIÁ & NHẬN XÉT CHI TIẾT
- [Tên file: Dòng X]: [Giải thích lỗi cực ngắn gọn, tối đa 15 từ]
- [Tên file: Dòng Y]: [Giải thích lỗi cực ngắn gọn, tối đa 15 từ]
(Nếu code hoàn toàn đúng, chỉ ghi duy nhất 1 dòng: "Mã nguồn chính xác, đạt yêu cầu.")

## TỔNG ĐIỂM
Tổng điểm: **[Điểm số]/100**

<score>[Điểm số]</score>

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
