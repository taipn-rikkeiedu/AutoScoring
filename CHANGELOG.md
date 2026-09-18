# Changelog - REduX AutoScoring Extension

Tất cả các thay đổi của tiện ích mở rộng **REduX AutoScoring Extension** được ghi nhận tại đây.

---

## [4.19.0] - 2026-09-18

### ✨ Giám sát chỉ số học tập
- **Tab mới "Giám sát học tập"**: Quét snapshot bảng thống kê học tập từ trang `learning-statistics` của LMS (tỷ lệ nghỉ học, tỷ lệ thiếu bài tập, tiến độ E-learning, số bài chậm, Hackathon TN/TL, R-Points, trạng thái chốt điểm, điều kiện tham gia project), lưu cục bộ theo từng lớp + môn học, hiển thị bảng có thể sắp xếp/lọc theo mọi cột và xuất ra Excel.
- Cảnh báo ngay trên giao diện khi LMS đổi cấu trúc cột khiến một vài chỉ số không quét được, thay vì âm thầm hiển thị thiếu dữ liệu.

### 🎨 Cải thiện giao diện
- **Thanh menu dọc thu gọn mặc định**: Sidebar điều hướng giờ mặc định chỉ hiện icon (48px thay vì 185px trước đây), giải phóng phần lớn không gian cho nội dung chính trên popup vốn đã nhỏ. Có nút mở rộng tạm thời khi cần đọc nhãn đầy đủ, trạng thái được ghi nhớ cho lần mở sau.

### 🐛 Sửa lỗi
- **Chấm hàng loạt mất bài khi nhiều bài chung 1 link GitHub**: Bước khử trùng lặp sau khi quét danh sách bài nộp trước đây chỉ dựa theo link GitHub, khiến trường hợp một học viên nộp chung 1 link cho nhiều bài tập (ví dụ 5 bài) chỉ giữ lại đúng 1 bài đầu tiên. Đã đổi sang khử trùng theo cặp (tên bài tập, link GitHub).
- **Chế độ "Mở cửa sổ rời" không cào được dữ liệu trang LMS đang mở**: Khi bật cửa sổ nổi, mọi thao tác quét/chấm điểm/điều hướng vô tình lấy nhầm tab của chính cửa sổ nổi thay vì tab LMS ở cửa sổ trình duyệt chính, khiến tính năng hoạt động như một trang độc lập tách rời khỏi LMS. Đã sửa cách xác định tab đang làm việc để luôn quét đúng cửa sổ trình duyệt chính, hoạt động đúng ở cả chế độ popup thả xuống lẫn cửa sổ nổi.

### 🔧 Cải tiến nội bộ
- Dọn dẹp dead code và các import/biến không còn sử dụng còn sót lại sau đợt loại bỏ backend FastAPI.
- Gộp logic chọn AI Provider base URL và cơ chế thử lại khi bị giới hạn tần suất (rate limit) — trước đây bị lặp lại y hệt ở 3 nơi khác nhau, giờ dùng chung 1 nguồn duy nhất.

---

## [4.18.5] - 2026-09-15

### ✨ Khôi phục tính năng Supabase Zero Setup
- **Tự động khởi tạo Cơ sở dữ liệu**: Khôi phục lại logic lưu trữ và giao diện hỗ trợ khởi tạo bảng Supabase tự động từ phiên bản 4.8.0. Người dùng giờ đây có thể nhập **Personal Access Token (PAT)** vào phần Cài đặt Supabase, sau đó ấn "Khởi tạo DB (Zero Setup)" để tự động tạo toàn bộ bảng (`submissions`, `care_notes`, `exercises`) và thiết lập Row Level Security (RLS) mà không cần cấu hình thủ công qua giao diện Supabase.
- Giữ lại các UI mới hiện đại (Tri-color Theme) của bản hiện tại nhưng được bổ sung thêm nút tạo cơ sở dữ liệu.

---

## [4.18.4] - 2026-09-15

### 🐛 Sửa Lỗi Ngân Hàng Bài Tập (Exercise Bank API)
- **Khôi phục tính năng tải đề bài từ API Server**: Trong các phiên bản trước, tính năng chọn nguồn dữ liệu bài tập (Local vs API Server) vô tình bị loại bỏ khỏi giao diện cấu hình và hook trạng thái, khiến tiện ích chỉ tải đề bài cục bộ từ `exercises.json` và không thể kết nối tới server ngân hàng đề. Phiên bản này đã phục hồi:
  - Giao diện chọn Nguồn Dữ Liệu Bài Tập (Local / API Server) trong thẻ Barem & Quy tắc.
  - Các ô nhập `Exercise API URL` và `API Token`.
  - Logic tải đề bài (`loadExercises`) ưu tiên tải từ API khi người dùng cấu hình.

---

## [4.18.3] - 2026-08-28

### 🔧 Mặc Định Backend Chuyển Về Local
- **Backend Modal đã ngưng hoạt động**: Đổi URL mặc định của `fastapi_server` từ Modal sang `http://localhost:8000`, để extension hoạt động ngay khi người dùng tự chạy backend cục bộ (`start_backend.bat`/`start_backend.ps1`).
- **Sửa lỗi ô nhập URL/Secret Key trong Cài đặt không có tác dụng**: Trước đây ô "Backend Server URL"/"Secret Key" trong tab AI & Kết nối ghi nhầm vào field `aiApiUrl`/`aiApiKey`, trong khi luồng kết nối thực tế lại ưu tiên đọc field `fastApiServerUrl`/`fastApiSecretKey` — khiến giá trị người dùng nhập vào không được áp dụng. Giờ cả hai field đã đồng bộ.
- **Xóa logic tự động ép URL về Modal**: Trước đây nếu `fastApiServerUrl` chứa `localhost:8000`, hệ thống tự động ghi đè về URL Modal — logic này không còn phù hợp và đã được gỡ bỏ.

---

## [4.18.2] - 2026-08-28

### 🐛 Thông Báo Lỗi Xác Thực Backend
- **Hiển thị Toast khi lỗi 401**: Trước đây lỗi xác thực (`x-api-key`/Bearer sai hoặc thiếu) khi tải danh sách đề bài, kiểm tra kết nối AI, hoặc tải danh sách model chỉ được log ra console — người dùng không biết vì sao dữ liệu không tải được. Giờ hiển thị Toast lỗi rõ ràng ngay trên popup, kèm gợi ý kiểm tra lại Backend Secret Key trong Cài đặt.
- **Sửa lỗi nuốt exception ở tầng Service**: `SupabaseService.pullExercises` trước đây nuốt lỗi và trả về danh sách rỗng, khiến trạng thái đồng bộ hiển thị "Sẵn sàng" dù thực chất backend đã từ chối request; giờ lỗi được truyền đúng lên tầng gọi để hiển thị chính xác.

---

## [4.18.1] - 2026-08-28

### ⚡ Hiệu Năng Kết Nối Backend
- **Warm-up định kỳ cho Backend Modal**: `background.ts` ping `/health` mỗi 4 phút (kèm lúc cài đặt/khởi động trình duyệt) để giữ container Modal serverless luôn "ấm", giảm thời gian chờ cold start khi người dùng mở popup.
- **Timeout cho các request khởi tạo**: `checkHealth` và `pullExercises` giới hạn thời gian chờ 10s bằng `AbortController`, tránh treo UI vô thời hạn khi backend không phản hồi.

---

## [4.18.0] - 2026-08-22

### 🎨 Giao Diện Mới (Tri-Color Modern Theme)
- **Tối ưu hóa thiết kế với 3 tông màu chủ đạo**:
  - **Vàng (Amber/Gold)**: Nút hành động chính (Primary CTA), Logo thương hiệu `REduX`, Huy hiệu AI và điểm số.
  - **Xanh dương nhạt (Light/Sky Blue)**: Menu điều hướng, thanh trạng thái, nút xuất file và các thành phần bổ trợ.
  - **Trắng (Crisp White)**: Không gian bảng dữ liệu, nền popup và modal hiển thị rõ ràng, dễ đọc.

### 🛡️ Bảo Mật & Cloud Migration
- **Xóa sạch toàn bộ API Key trên Frontend**: Chuyển đổi sang mô hình gọi backend qua API Key định danh duy nhất (`x-api-key`). Toàn bộ khóa bí mật (Gemini, Supabase, OpenAI) được lưu trữ an toàn trên Modal Secret (`redux-key`).
- **Tăng ngưỡng Timeout & Xử lý lỗi ReadTimeout**: Cấu hình kết nối AI lên 120s và tải GitHub lên 60s, ngăn ngừa hiện tượng rớt kết nối khi phân tích repository lớn.

---

## [4.17.0] - 2026-08-20

### 🚀 Kiến Trúc Mới (Client-Server Pure UI)
- **Frontend trở thành giao diện UI gọi API thuần túy**:
  - Gỡ bỏ toàn bộ code xử lý giải nén file ZIP GitHub client-side và AST static analysis, chuyển 100% về Backend FastAPI.
  - Loại bỏ hoàn toàn thư viện `@supabase/supabase-js` và mã truy vấn CSDL trực tiếp trên trình duyệt.
  - Tách riêng toàn bộ API Endpoints và API Clients vào thư mục `src/services/api/` (`endpoints.ts`, `fastApiClient.ts`, `aiClient.ts`).
  - Mặc định AI Provider sang `fastapi_server`.
- **Tối ưu hóa hiệu năng**:
  - Giảm kích thước file build từ `2.09 MB` xuống `1.88 MB`.
  - Tăng tốc độ khởi động popup và giảm tiêu thụ RAM trình duyệt.
- **Sửa lỗi xác thực**:
  - Khắc phục lỗi HTTP 401 Unauthorized khi khởi động nạp danh sách đề bài.

---

## [4.16.0] - 2026-08-20
- Thêm hỗ trợ kết nối FastAPI Core Server trong bảng cấu hình Settings.
- Bổ sung cấu hình nhanh danh sách model AI thịnh hành.

---

## [4.15.0] - 2026-08-15
- Bổ sung tab Chăm sóc học viên (Take Care).
- Hỗ trợ xuất báo cáo tổng hợp điểm số ra file Excel (.xlsx).
