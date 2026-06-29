# 📋 CHANGELOG — AI GitHub Grader

Tất cả các thay đổi đáng chú ý của dự án sẽ được ghi lại trong file này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/),
và dự án tuân theo [Semantic Versioning](https://semver.org/lang/vi/).

---

## [v2.4.0] — 2026-06-29

### ✨ Tính năng mới
- **Tối ưu hóa tài nguyên AI (Token Optimization):**
  - **Nén mã nguồn:** Tự động loại bỏ khoảng trắng thừa ở cuối dòng, gộp các dòng trống liên tiếp để tiết kiệm token đầu vào (30-50% input tokens).
  - **Loại bỏ file hệ thống:** Lọc bỏ các file rác, metadata, lockfiles (`package-lock.json`, `yarn.lock`, `.gitignore`, `LICENSE`, wrappers...) ngay từ khâu download (giữ lại `README.md`).
  - **Giới hạn Output Token:** Cấu hình cứng `maxOutputTokens: 1024` cho Gemini API để tránh phản hồi lan man, tiết kiệm token đầu ra.

---

## [v2.3.0] — 2026-06-29

### ✨ Tính năng mới
- **Quick Switcher inline**: Cho phép chuyển đổi nhanh Bài tập / Session ngay trên giao diện chấm điểm mà không cần mở lại modal Thư viện mẫu.
  - Dropdown `📄 Bài tập:` — đổi bài tập trong cùng session (1 click).
  - Dropdown `🔹 Session:` — đổi session trong cùng chương (1 click, tự chọn bài tập đầu tiên).

---

## [v2.2.0] — 2026-06-29

### ✨ Tính năng mới
- **Auto-retry với exponential backoff** cho Gemini API: tự động retry tối đa 3 lần khi gặp lỗi 429/503/high demand với delay tăng dần (2s → 4s → 8s).

### 🐛 Sửa lỗi
- Sửa lỗi tiếng Việt bị lỗi/vỡ ký tự khi streaming bằng incremental UTF-8 decoder.
- Thêm buffering UI 150ms để giảm giật và render đúng tiếng Việt.

---

## [v2.1.0] — 2026-06-28

### 🐛 Sửa lỗi
- Mở rộng xử lý exception cho `st.secrets` để tương thích Streamlit Cloud.

---

## [v2.0.0] — 2026-06-28

### ✨ Tính năng mới
- **Kiến trúc mới toàn diện** — nâng cấp lớn từ v1.x.
- **GitHub archive-first**: ưu tiên tải ZIP archive thay vì API từng file, tăng tốc đáng kể.
- **Gemini streaming**: hiển thị kết quả chấm real-time thay vì chờ toàn bộ response.
- **Response cache**: lưu kết quả chấm vào bộ nhớ đệm, tránh gọi AI lặp lại với cùng input.
- **Streamlit Cloud support**: hỗ trợ deploy lên Streamlit Cloud.
- **Trích xuất .docx**: đọc và phân tích file Word (.docx) trực tiếp từ GitHub.

### ♻️ Tái cấu trúc
- Tách project thành các module rõ ràng: `services/`, `components/`, `utils/`, `config/`.
- Trích xuất `storage_service`, `helpers`, `modals` thành module riêng.

### 🎨 Giao diện
- Ẩn textarea đề bài/tiêu chí, thay bằng info card gọn gàng.
- Tối ưu dialog Thêm bài tập: hỗ trợ chọn chương/session có sẵn hoặc nhập mới.
- Modal overlay thống nhất cho tất cả thao tác CRUD.
- Hợp nhất Sao lưu & Khôi phục vào một modal duy nhất.

---

## [v1.5.0] — 2026-06-28

### 🎨 Giao diện
- Thu gọn template selector vào `st.expander`, giảm chiều cao textarea.
- Trích xuất thông báo lỗi chi tiết từ Google API JSON response.

### ⚙️ Cấu hình
- Cập nhật danh sách Gemini models: thêm gemini-3.5, gemini-3.0, và các model preview/light mới.

### 🐛 Sửa lỗi
- Sửa lỗi widget state mutation bằng `on_click` callbacks.
- Di chuyển quick template loader về Tab 1, sửa bug sync config uploader.

---

## [v1.4.0] — 2026-06-28

### ✨ Tính năng mới
- Thêm Dev Container cho phát triển trên GitHub Codespaces / VS Code Remote.

### 🎨 Giao diện
- Tách uploaders templates và config vào các tab riêng biệt.
- Nút "Áp dụng" thủ công để tránh xung đột upload.
- Tối ưu CSS với native theme variables cho dark/light mode hoàn hảo.

---

## [v1.3.0] — 2026-06-28

### ✨ Tính năng mới
- **Google OAuth2 login screen**: màn hình đăng nhập native với theo dõi phiên người dùng.
- Developer bypass mode cho môi trường phát triển.

### 🔒 Bảo mật
- Kiểm tra domain GitHub hợp lệ cho URL input.
- Giới hạn số lượng file và kích thước ký tự dự án để ngăn chặn tấn công resource exhaustion.

---

## [v1.2.0] — 2026-06-28

### ♻️ Tái cấu trúc
- Loại bỏ tất cả hard-coded model lists và template structures khỏi `app.py`, chuyển vào `settings.py`.
- Xóa tất cả thao tác ghi file `C:/AutoScoring`, chuyển sang in-memory state với import/export.

### 🎨 Giao diện
- Tối ưu layout thành 3 tab: Chấm điểm, Quản lý mẫu, Cấu hình.
- Hybrid local/cloud config và templates management.

---

## [v1.1.0] — 2026-06-28

### ✨ Tính năng mới
- Quản lý template đề bài phân cấp: Thêm, Sửa, Xóa bài tập theo Chương → Session → Bài tập.
- Lưu templates persistent vào thư mục `C:/AutoScoring/HomeworkAssignment`.

### 🎨 Giao diện
- Redesign giao diện premium với font Be Vietnam Pro.
- Quick assignment templates picker.
- Score extraction metrics hiển thị điểm tự động.

---

## [v1.0.0] — 2026-06-28

### 🎉 Phát hành đầu tiên
- Hệ thống chấm điểm bài tập lập trình tự động qua GitHub URL sử dụng AI.
- Tích hợp Google Gemini API.
- Trích xuất mã nguồn từ GitHub repository.
- Tạo báo cáo chấm điểm chi tiết bằng AI.
- Giao diện Streamlit cơ bản.
- README.md hướng dẫn cài đặt và triển khai.
