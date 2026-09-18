# Hướng dẫn quy trình Hyper-Agile Scrum (Sprint 10 Phút)

Chào mừng bạn đến với dự án **REduX AutoScoring**! Dự án này hiện đang vận hành dưới một biến thể cực độ của Agile Scrum gọi là **Hyper-Agile**.

Thay vì các Sprint kéo dài hàng tuần, chúng ta rút ngắn vòng lặp xuống **chỉ còn 10 phút**. Mục tiêu là tối đa hóa sự tập trung, liên tục đẩy các cải tiến siêu nhỏ (Nano-tasks) và giảm thiểu các rủi ro kẹt logic lâu.

---

## 1. Vai trò (Roles)
- **Product Owner (PO) / Scrum Master:** Người duy trì file `BACKLOG.md`, đảm bảo mọi task trong đó đều đã được chẻ nhỏ xuống dạng **Nano-task** (chỉ tốn dưới 10 phút để làm).
- **Developers (Kể cả Lập trình viên & AI Agents):** Nhặt task từ Backlog, code tốc độ cao và báo cáo kết quả sau mỗi 10 phút.

---

## 2. Vòng đời của một Hyper-Sprint (10 Phút)

Một Sprint 10 phút được tuân thủ nghiêm ngặt theo đồng hồ bấm giờ (Pomodoro/Timer):

| Thời gian | Nghi thức (Ceremony) | Hành động thực thi |
|-----------|----------------------|-------------------|
| **00:00 - 01:00** | **Sprint Planning** | Chuyển 1 Nano-task duy nhất từ `BACKLOG.md` (Product Backlog) sang phần **Current Sprint**. Đổi trạng thái thành `[/] IN PROGRESS`. |
| **01:00 - 09:00** | **Execution (Deep Work)** | Tập trung code. Cấm giao tiếp không liên quan. Không lướt mạng. Làm mọi thứ để Task chạy được. |
| **09:00 - 10:00** | **Review, Retro & Commit** | Kiểm tra code (Pass Linter? Chạy được không?). Nếu OK: Đánh dấu `[x] DONE` trong `BACKLOG.md` và `git commit`. Nếu chưa OK: Rollback (Tùy chọn) hoặc chuyển task qua Sprint tiếp theo. |

---

## 3. Quy định bẻ nhỏ Task (Nano-tasking)
Nguyên tắc tối thượng: **"Không có task nào không thể chẻ nhỏ hơn."**
- ❌ **Sai:** Làm trang Đăng nhập (Mất 2 tiếng)
- ✅ **Đúng (Nano-tasks):**
  - Sprint 1: Dựng layout HTML khung form đăng nhập.
  - Sprint 2: Thêm CSS cho nút bấm.
  - Sprint 3: Bắt sự kiện OnChange cho input email.

Nếu đang làm mà thấy 10 phút không kịp, BẮT BUỘC dừng lại và tách task đó làm hai trong `BACKLOG.md`.

---

## 4. Definition of Done (DoD) - Chuẩn hoàn thành
Một Nano-task được coi là `DONE` (Hoàn thành) trong 10 phút khi thỏa mãn:
1. Mã nguồn không báo lỗi cú pháp (No Linter / Syntax Errors).
2. Mã nguồn không làm hỏng tính năng đã có (Build thành công).
3. Đã được Commit với message chuẩn (Xem mục 5).

---

## 5. Quy chuẩn Git (Git Workflow)
Với tần suất 6 commits/giờ, lịch sử Git cần gọn gàng.
- Commit message phải gắn tiền tố:
  - `feat: ` cho tính năng mới.
  - `fix: ` cho sửa lỗi.
  - `chore: ` cho công việc lặt vặt (refactor, comment, đổi tên file).
  - `docs: ` cho tài liệu.
- *Ví dụ:* `feat: Thêm trường supabasePat vào giao diện SettingsTab`
