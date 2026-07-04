# 💡 ĐỀ XUẤT CÁC ĐIỂM CẢI TIẾN CHO DỰ ÁN AI GITHUB GRADER

Để nâng cấp dự án **AI GitHub Grader** thành một công cụ chuyên nghiệp, tối ưu hóa quy trình làm việc của giảng viên/trợ giảng và giảm thiểu tối đa chi phí vận hành, tôi đề xuất các hạng mục cải tiến chia theo 3 nhóm cốt lõi như sau:

---

## 1. Tích Hợp LMS Nâng Cao (Tính Năng Đắt Giá Nhất)

### 🔴 Tự động điền điểm vào LMS (Auto-fill Grades)
* **Ý tưởng:** Khi chấm điểm hàng loạt hoàn tất, thay vì giảng viên phải nhìn điểm trên Extension và gõ thủ công từng ô điểm trên trang web LMS, chúng ta sẽ thêm nút **"Tự động điền điểm vào LMS"**.
* **Cách hoạt động:** Extension sẽ sử dụng Script tiêm (`scripting.executeScript`) tìm kiếm các ô nhập điểm (`input[type="number"]`) nằm cạnh tên học sinh tương ứng trên giao diện trang web LMS và tự động điền điểm số AI đã tính vào đó.

### 🔴 Cấu hình Selector động (Dynamic Page Selectors)
* **Ý tưởng:** Hiện tại cấu trúc tìm bảng học viên trong `autoGraderTab.js` được định nghĩa cứng các bộ chọn class CSS. Nếu trang LMS cập nhật giao diện, Extension có thể bị lỗi không quét được dòng.
* **Cách hoạt động:** Cho phép người dùng tùy biến mã Selector dòng, Selector tên học sinh, Selector link GitHub ngay trong tab **Cài Đặt** để đảm bảo Extension hoạt động lâu dài trên mọi phiên bản cập nhật của LMS.

---

## 2. Nâng Cấp Bộ Máy Chấm AI & Quản Lý Dữ Liệu

### 🔴 Thư viện mẫu Prompt hệ thống (Prompt Library)
* **Ý tưởng:** Giảng viên thường có nhiều nhu cầu chấm điểm khác nhau (Ví dụ: Chấm nhanh lấy điểm số, Chấm chi tiết chỉ lỗi dòng code, Nhận xét bằng tiếng Anh, Chấm lý thuyết...).
* **Cách hoạt động:** Thay vì chỉ lưu trữ duy nhất 1 System Prompt hệ thống, chúng ta cho phép lưu trữ một danh sách các Prompt (Prompt Preset) dưới dạng thư viện. Giảng viên có thể chọn nhanh mẫu prompt hoạt động thông qua một dropdown trước khi bấm chấm.

### 🔴 Bộ lọc file thông minh (Smart File Filter)
* **Ý tưởng:** Khi tải dự án học viên từ GitHub, có nhiều file dung lượng lớn không cần thiết cho việc chấm điểm (như ảnh `.png`, `.jpg`, các thư viện `.env`, tệp đóng gói hoặc thư mục `node_modules`). Việc gửi các tệp này lên AI gây tốn token và tăng chi phí API.
* **Cách hoạt động:** Cho phép cấu hình các đuôi tệp tin được phép gửi lên AI (Ví dụ: chỉ gửi `.js`, `.py`, `.java`, `.html`, `.css`) để tiết kiệm tới 60% chi phí API Key và tăng tốc độ xử lý của mô hình AI.

### 🔴 Xuất dữ liệu báo cáo (Export Report Utilities)
* **Ý tưởng:** Giảng viên cần lưu trữ hoặc nộp báo cáo điểm số cho phòng đào tạo dưới dạng bảng biểu Excel.
* **Cách hoạt động:** Thêm nút **Xuất báo cáo (Export Excel/CSV)** trong tab Chấm Hàng Loạt để tải xuống danh sách điểm số, link GitHub và phần nhận xét của toàn bộ lớp học chỉ với 1 click.

---

## 3. Trải Nghiệm Người Dùng (UI/UX) & Tiện Ích

### 🔴 Chế độ Tối (Dark Mode Support)
* **Ý tưởng:** Giảng viên thường chấm bài vào ban đêm, giao diện nền sáng có thể gây mỏi mắt.
* **Cách hoạt động:** Xây dựng hệ thống Theme Switcher trong tab Cài đặt cho phép chuyển đổi qua lại giữa giao diện sáng (Light Mode) và giao diện tối cao cấp (Premium Dark Mode).

### 🔴 Bộ soạn thảo nhận xét trực tiếp (Inline Comment Editor)
* **Ý tưởng:** Đôi khi nhận xét của AI rất chuẩn nhưng giảng viên muốn bổ sung thêm 1-2 câu lưu ý cá nhân trước khi gửi cho học sinh.
* **Cách hoạt động:** Cho phép giảng viên nhấp đúp vào ô nhận xét hiển thị của học sinh trên Extension để chỉnh sửa trực tiếp nội dung phản hồi trước khi bấm Sao chép.

---

## 📊 Bảng Đánh Giá Ưu Tiên Triển Khai

| Hạng mục cải tiến | Độ khó | Lợi ích mang lại | Mức độ ưu tiên |
| :--- | :---: | :---: | :---: |
| **Tự động điền điểm vào LMS** | Trung bình | Rất cao (Tiết kiệm thời gian gõ điểm) | **Urgent (Cực kỳ ưu tiên)** |
| **Bộ lọc file thông minh** | Thấp | Rất cao (Tiết kiệm chi phí API Key) | **High** |
| **Xuất dữ liệu báo cáo Excel/CSV** | Thấp | Cao (Hỗ trợ lưu trữ điểm) | **High** |
| **Thư viện mẫu Prompt hệ thống** | Trung bình | Cao (Linh hoạt khi chấm bài) | **Medium** |
| **Dark Mode & Giao diện tối** | Thấp | Trung bình (Tốt cho mắt) | **Low** |
