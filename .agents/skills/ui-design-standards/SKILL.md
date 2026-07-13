---
name: ui-design-standards
description: Tiêu chuẩn thiết kế giao diện (UI) và trải nghiệm người dùng (UX) cho extension REduX sử dụng Tailwind CSS v4
---

# 🎨 Tiêu chuẩn thiết kế giao diện & Trải nghiệm người dùng (UI/UX)

Tệp này quy định các tiêu chuẩn thiết kế nhằm mang lại giao diện tinh tế, hiện đại (Premium Aesthetics) và đảm bảo trải nghiệm cuộn mượt mà trên môi trường Chrome Extension nhỏ gọn.

## 1. Kích thước cửa sổ popup (Viewport Constraints)

- Do giới hạn hiển thị của Chrome Extension popup:
  - Thẻ `html` / `body` và container ngoài cùng phải có chiều rộng cố định: `w-[780px]`.
  - Chiều cao tối đa của cửa sổ popup: `h-[600px]`.
  - Luôn sử dụng `overflow-hidden` ở container cha và cấu hình cuộn `overflow-y-auto` ở các danh sách/bảng để tránh phá vỡ giao diện extension (sinh ra thanh cuộn lồng nhau).

## 2. Hệ màu sắc & Typography đồng bộ

- **Typography**: Sử dụng font chữ không chân tiếng Việt cao cấp `'Be Vietnam Pro'`, kế hợp font mặc định hệ thống.
- **Màu chủ đạo (Primary)**:
  - Green / Emerald Gradient (`from-green-600 to-emerald-600`) cho các tác vụ xuất dữ liệu, hoàn thành hoặc thành công.
  - Blue Gradient (`from-blue-600 to-blue-700`) cho các nút quét dữ liệu, chấm bài chính.
- **Trạng thái LMS**:
  - **Hoàn thành**: Badge nền xanh lá nhẹ (`bg-green-100 text-green-800 border-green-200`).
  - **Chờ kiểm tra**: Badge nền vàng hổ phách (`bg-amber-100 text-amber-800 border-amber-200`).
  - **Chưa hoàn thành / Chưa nộp**: Badge nền đỏ nhẹ (`bg-red-100 text-red-800 border-red-200`).

## 3. Quy chuẩn thiết kế Dialog / Modal

- Cấu trúc Modal overlay (như `ExcelExportModal`):
  - Luôn sử dụng vị trí cố định đè lên toàn màn hình (`fixed inset-0 z-50`).
  - Lớp nền mờ (Backdrop): `background: rgba(15,23,42,0.55)` kết hợp `backdrop-filter: blur(2px)`.
  - Cần hỗ trợ tắt modal nhanh bằng phím `Escape` hoặc nhấp chuột vào vùng trống ngoài modal.
  - Đảm bảo các nút tương tác chính (Export, Copy) có hiệu ứng chuyển trạng thái mượt mà (transitions) và trạng thái bị vô hiệu hóa (`disabled:opacity-50`) khi không hợp lệ hoặc đang xử lý.
- Luôn đặt modal bên trong thẻ root div của component tương ứng (thay vì dùng Portal hay Fragment ngang hàng) để tránh làm vỡ thuộc tính `flex-1` của component cha tại `App.tsx`.
