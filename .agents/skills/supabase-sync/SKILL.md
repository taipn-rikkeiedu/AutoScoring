---
name: supabase-sync
description: Hướng dẫn đồng bộ dữ liệu điểm số, thông tin học viên lên Cloud Supabase và xử lý xung đột dữ liệu
---

# ☁️ Kỹ năng đồng bộ Supabase & Xử lý ngoại tuyến

Kỹ năng này hướng dẫn AI cách đọc, ghi và đồng bộ dữ liệu học viên giữa bộ nhớ cục bộ (`chrome.storage.local`) và cơ sở dữ liệu đám mây (Supabase).

## 1. Lược đồ cơ sở dữ liệu (Database Schema)

Supabase sử dụng các bảng chính sau:

### Bảng `submissions` (Bài nộp của sinh viên)
* `id` (uuid, khóa chính)
* `class_id` (text): Mã lớp học (trích xuất từ LMS)
* `student_id` (text): Mã sinh viên
* `student_name` (text): Họ và tên sinh viên
* `chapter` (text): Chương học (ví dụ: `Chapter_01`)
* `session` (text): Buổi học (ví dụ: `Session_02`)
* `assignment_name` (text): Tên bài tập
* `github_url` (text): Đường dẫn repo của sinh viên
* `score` (numeric): Điểm số (0 - 100)
* `report` (text): Nhận xét chi tiết từ AI
* `graded_at` (timestamptz): Thời gian chấm điểm

### Bảng `take_care` (Chăm sóc sinh viên)
* `id` (uuid, khóa chính)
* `student_id` (text)
* `student_name` (text)
* `subject_name` (text): Tên môn học chăm sóc
* `study_date` (text): Ngày học tương ứng
* `note` (text): Ghi chú chăm sóc cụ thể

## 2. Quy trình đồng bộ dữ liệu (Sync Pipeline)

1. **Kiểm tra trạng thái cấu hình**: Trước khi gọi API Supabase, luôn sử dụng phương thức kiểm tra trạng thái hoạt động:
   `SupabaseService.isEnabled(config)`
2. **Kéo dữ liệu (Pull)**:
   - Khi mở danh sách lớp học hoặc tab chăm sóc, kéo dữ liệu từ Supabase về trước để đồng bộ.
   - Gộp dữ liệu kéo về với dữ liệu cục bộ dưới máy trạm.
3. **Đẩy dữ liệu (Push/Upsert)**:
   - Khi cập nhật điểm bài tập hoặc ghi chú chăm sóc, thực hiện lưu đồng thời vào `chrome.storage.local` và đẩy lên Supabase qua phương thức `upsert`.

## 3. Quy tắc xử lý xung đột (Conflict Resolution)

- **Nguyên tắc thời gian gần nhất (Last-Write-Wins)**: Ưu tiên dữ liệu có thời gian cập nhật gần nhất (`gradedAt` hoặc `timestamp`).
- **Phục hồi khi mất mạng**: Nếu API Supabase bị lỗi (do mất kết nối hoặc sai key), luôn giữ lại dữ liệu cục bộ trong `chrome.storage.local` và cảnh báo người dùng qua Toast thay vì làm crash ứng dụng.
