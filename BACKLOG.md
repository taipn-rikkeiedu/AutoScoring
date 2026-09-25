# Product Backlog & Hyper-Sprint Board

*Dự án đang chạy theo chu kỳ Sprint 10 Phút. Mỗi Task phải là một Nano-task (< 10 phút).*

## Current Sprint (10 Phút hiện tại)

> 🕒 **Thời gian bắt đầu:** 14:29 PM
> 🎯 **Mục tiêu:** Cập nhật UI nút Khởi tạo DB để hiển thị loading spinner.

- [x] (Nano-task) Thêm loading spinner khi nhấn nút Khởi tạo DB từ Supabase.

---

## Kanban Board (Next Sprints)

### 📋 To Do (Chưa làm)
- [ ] Bắt lỗi timeout API cho Supabase (Đã chẻ nhỏ).
- [ ] Cập nhật UI button thành màu đỏ khi có lỗi (Đã chẻ nhỏ).

### 🚧 In Progress (Đang làm - Bị Rollback từ Sprint trước)
*(Trống)*

### ✅ Done (Đã xong trong ngày hôm nay)
- [x] Áp dụng mô hình Hyper-Agile (Tạo AGILE_SCRUM.md và BACKLOG.md).
- [x] Khôi phục tính năng Supabase Zero Setup (PAT, migrate DB).
- [x] Viết core `networkInterceptor.ts` để tóm (intercept) API request/response của LMS và console.log ra JSON (Giai đoạn 1 của Auto-flow).

---

## 🧊 Icebox (Ý tưởng lớn - Cần chẻ nhỏ)
*Đây là các Epic/Idea tốn nhiều thời gian. Không được đưa trực tiếp vào Sprint mà phải chẻ thành Nano-task trước.*
- Hoàn thiện Auto-flow: Phân tích JSON từ Network Interceptor và tự động gọi luồng `aiService` chấm điểm, sau đó Auto-update DOM/API.
- Thêm hoạt họa (Micro-animations) mượt mà cho các button và khi chuyển đổi các tab trên popup.
- Hỗ trợ hoàn chỉnh chế độ giao diện sáng/tối (Dark Mode / Light Mode) dựa trên thiết lập hệ thống.
- Thiết kế lại các thông báo (Toast Notifications) để trông tinh tế và hiện đại hơn.
- Tối ưu CSS/Tailwind classes để popup load nhanh hơn và không bị giật lag trên máy cấu hình yếu.

---

## 📝 Mẫu viết Nano-task (Template)
Khi tạo thẻ mới, vui lòng viết theo định dạng:
`[ ] (Nano-task) [Động từ hành động] [Đối tượng]. VD: Đổi màu nút 'Migrate' thành xanh lá cây.`
