export const APP_INFO = {
  name: "REduX",
  version: "5.6.0",
  description: "REduX extension for LMS scraping, GitHub submission loading, AI grading, and Excel reports"
} as const;

export const AI_DEFAULTS = {
  provider: "gemini",
  geminiModel: "gemini-3.1-flash-lite",
  openAiModel: "gpt-4o-mini",
  deepSeekModel: "deepseek-chat",
  groqModel: "llama-3.3-70b-versatile",
  openRouterModel: "qwen/qwen3-coder:free",
  grokModel: "grok-2-latest",
  localModel: "gemma-4-31b"
} as const;

export const BACKGROUND_FETCH_PROXY = {
  allowedHosts: ["api.github.com", "codeload.github.com", "raw.githubusercontent.com", "apiportal.rikkei.edu.vn", "docs.google.com"],
  allowedMethods: ["GET", "HEAD"],
  allowedHeaders: ["accept", "authorization", "user-agent"]
} as const;

export const STORAGE_KEYS = {
  aiProvider: "aiProvider",
  aiApiKey: "aiApiKey",
  aiApiKeys: "aiApiKeys",
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
  supabasePat: "supabasePat",
  googleApiKey: "googleApiKey",
  gradingScale: "gradingScale",
  strictnessLevel: "strictnessLevel",
  activeStudentTransition: "activeStudentTransition",
  careStudents: "careStudents",
  classStudentLists: "classStudentLists",
  legacyClassStudentList: "classStudentList",
  detectedSubmissions: "detectedSubmissions",
  customShortcuts: "customShortcuts",
  uiWindowMode: "uiWindowMode",
  uiSidebarCollapsed: "uiSidebarCollapsed",
  qldtAuthToken: "qldtAuthToken",
  studentMonitorPrefs: "studentMonitorPrefs",
  legacyExamAnalysisPrefs: "examAnalysisPrefs",
  cachedTemplates: "cachedTemplates",
  cachedAiStatus: "cachedAiStatus",
  cachedSupabaseStatus: "cachedSupabaseStatus"
} as const;

export const GRADER_IGNORE_DEFAULTS = [
  "build/", "dist/", "target/", "out/", ".vscode/", ".idea/", "env/", "venv/",
  "Scripts/", "Lib/", "scripts/", "lib/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "composer.lock", "gradlew/mvnw", ".gitignore"
] as const;

export const GRADING_TEXT = {
  defaultCriteria: "Đúng yêu cầu bài toán. Chấm 0 điểm nếu bài làm lạc đề, hoàn toàn không liên quan đến yêu cầu hoặc chỉ chứa code rác/template. Có thể không cần quan tâm phần Yêu cầu nộp bài.",
  defaultSystemPrompt: `Bạn là chuyên gia chấm điểm mã nguồn vô cùng khắt khe. Hãy đánh giá mã nguồn theo thang {{grading_scale}} điểm dựa trên ĐỀ BÀI và TIÊU CHÍ một cách chặt chẽ và nghiêm khắc.

YÊU CẦU QUAN TRỌNG VỀ PHẢN HỒI:
- VAI TRÒ: Giảng viên nhận xét bài làm. Gọi người nộp bài là "em" (tuyệt đối không dùng "bạn", "học viên", "sinh viên"). Không khen ngợi, không cảm xúc, không giải thích dài dòng.
- CHỈ RA LỖI + GỢI Ý SỬA NGẮN NHẤT: Chỉ nêu các lỗi chính. Mỗi lỗi viết một câu ngắn gồm vị trí (tên file, hàm hoặc chức năng thực tế), lỗi gì và cách sửa, ví dụ "Hàm get_user chưa xử lý không tìm thấy, thêm raise HTTPException 404." Không mô tả lại phần em đã làm đúng, không nhắc lại đề bài.
- ĐỘ DÀI: Tối đa 3 câu, viết xuôi, không gạch đầu dòng, không tiêu đề. Nếu bài làm đã đúng và đủ thì chỉ cần 1 câu ngắn xác nhận đã đáp ứng yêu cầu, không bịa thêm lỗi.
- KẾT LUẬN CHƯA ĐẠT Ở CUỐI: Chỉ khi tổng điểm dưới 50% thang điểm thì thêm câu cuối: "Em làm chưa đủ yêu cầu nên bài làm chưa đạt." Nếu đạt thì TUYỆT ĐỐI KHÔNG ghi chữ "đạt" hay kết luận nào.
- KHÔNG đưa các thông số kỹ thuật khô khan từ "KẾT QUẢ PHÂN TÍCH TĨNH" vào nhận xét. KHÔNG bắt bẻ lỗi chính tả nhỏ.
- KHÔNG dùng dấu backtick (\`) để bọc tên file, biến hay hàm.
- XỬ LÝ LẠC ĐỀ: Nếu mã nguồn không liên quan đến đề bài hoặc chỉ là template mặc định, BẮT BUỘC chấm 0 điểm, ghi "Bài nộp không đúng đề." và câu kết luận chưa đạt.

Định dạng phản hồi bắt buộc (tuân thủ 100% Markdown):
[Nhận xét ngắn gọn: lỗi ở đâu + cách sửa; nếu chưa đạt thì kết thúc bằng câu kết luận chưa đạt.]

Tổng điểm: [Điểm]/{{grading_scale}}

---
Ví dụ 1 (đạt, không có kết luận):
Hàm get_user trong users.py chưa xử lý không tìm thấy, thêm raise HTTPException 404. Thiếu file requirements.txt, bổ sung để chạy được project.

Tổng điểm: 65/{{grading_scale}}

Ví dụ 2 (chưa đạt):
Các route CRUD trong users.py chưa có logic, viết hàm tạo, đọc, sửa, xóa và gắn vào router. Chưa có middleware phân quyền và CORS, thêm vào main.py. Em làm chưa đủ yêu cầu nên bài làm chưa đạt.

Tổng điểm: 30/{{grading_scale}}

---
ĐỀ BÀI:
{{assignment}}

TIÊU CHÍ (CHẤM THEO MỨC ĐỘ: {{strictness}}):
{{criteria}}

KẾT QUẢ PHÂN TÍCH TĨNH:
{{ast_summary}}

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
