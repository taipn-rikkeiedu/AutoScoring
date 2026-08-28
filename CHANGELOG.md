# Changelog - REduX AutoScoring Extension

Tất cả các thay đổi của tiện ích mở rộng **REduX AutoScoring Extension** được ghi nhận tại đây.

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
