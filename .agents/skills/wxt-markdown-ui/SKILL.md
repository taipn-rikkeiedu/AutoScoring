---
name: wxt-markdown-ui
description: >
  Hướng dẫn thiết kế giao diện tối giản (Minimal UI) cho trình duyệt extension (Chrome Extension)
  phát triển bằng WXT framework, chuyên dùng để trích xuất và xuất nội dung web sang định dạng Markdown.
---

# Minimal UI Design Skill for WXT Markdown Exporter Extension

Skill này định nghĩa các nguyên tắc và quy tắc thiết kế giao diện (UI/UX) tối giản, hiệu quả dành riêng cho các trình duyệt extension được xây dựng bằng **WXT framework** với mục đích **trích xuất và xuất nội dung web sang định dạng Markdown (MD)**.

---

## 1. Bản chất của UI/UX trên Web Extension

Giao diện Extension khác với ứng dụng web thông thường ở chỗ:
- **Không gian hiển thị hạn chế**: Popup thường có kích thước rất nhỏ (khuyên dùng rộng `360px` - `450px`, cao tối đa `600px`).
- **Thời gian tương tác cực ngắn (Micro-interactions)**: Người dùng mở extension để thực hiện nhanh 1-2 tác vụ (ví dụ: click sao chép Markdown rồi đóng lại ngay).
- **Tính tức thì (Zero Latency UX)**: Mọi thao tác click phải phản hồi ngay lập tức, không để người dùng chờ đợi mà không có phản hồi thị giác.
- **Tính tự động đóng**: Popup sẽ biến mất khi người dùng click ra ngoài, vì thế trạng thái cấu hình cần được tự động lưu.

---

## 2. Thiết kế giao diện theo phân vùng chức năng (Touchpoints)

### A. Popup UI (Giao diện khi click vào Extension Icon)
Popup là nơi tương tác nhanh. Thiết kế popup cần cực kỳ tinh gọn:
- **Kích thước lý tưởng**: `380px` chiều rộng. Chiều cao co giãn tự động theo nội dung nhưng không quá `550px`.
- **Luồng thao tác (User Flow) 1-Click**:
  - Khi mở popup, tự động phân tích (parse) nội dung trang hiện tại sang Markdown ở chế độ chạy ngầm (background).
  - Hiển thị tiêu đề bài viết và các nút hành động chính (CTA) ngay lập tức.
- **Hệ thống nút bấm chính**:
  - **Primary Action (Sao chép)**: Nút "Copy Markdown" to, nổi bật nhất (Accent color, ví dụ: Emerald/Mint hoặc Indigo).
  - **Secondary Action (Tải về)**: Nút "Download .md" nằm kế bên hoặc dưới nút Copy với độ tương phản thấp hơn.
- **Quick Options (Cấu hình nhanh)**:
  - Tối đa 3-4 checkbox thiết lập nhanh (ví dụ: `[x] Tải kèm ảnh`, `[x] Giữ lại liên kết`, `[x] Trích xuất Frontmatter`).
  - Sử dụng layout dạng lưới (Grid) hoặc flex để tiết kiệm không gian.
- **Markdown Preview (Bản xem trước rút gọn)**:
  - Hiển thị một khung nhỏ xem trước (Scrollable code block/rendered markdown), có nút bật/tắt (Collapsible) để không chiếm dụng không gian nếu người dùng chỉ muốn copy nhanh.

### B. Sidepanel UI (Thanh điều hướng bên cạnh - Chrome Side Panel API)
Sidepanel phù hợp cho các tác vụ cần phân tích sâu, so sánh, hoặc chỉnh sửa trực tiếp Markdown:
- Tận dụng chiều dọc của trình duyệt. Giao diện nên có cấu trúc rõ ràng:
  - **Thanh tiêu đề (Header)**: Chứa tên Extension và các tuỳ chọn chế độ (Rendered Preview vs Raw Source).
  - **Khu vực nội dung (Main View)**: Trình soạn thảo hoặc xem trước Markdown có thanh cuộn (Scrollbar) mượt mà.
  - **Thanh hành động cố định (Sticky Footer)**: Chứa các nút "Copy", "Save to Obsidian", "Download" luôn hiển thị ở cuối bảng điều khiển để người dùng thao tác bất cứ lúc nào.

### C. Options Page (Trang cài đặt nâng cao)
Được mở ở một tab mới, dùng để quản lý các thiết lập ít thay đổi:
- **Bố cục (Layout)**: Dùng dạng 2 cột (Sidebar menu bên trái + Form config bên phải) hoặc 1 cột tập trung nếu ít tuỳ chọn.
- **Nội dung cấu hình**:
  - Quản lý Template Markdown (định nghĩa cấu trúc xuất: `# {title}`, `Date: {date}`).
  - Thiết lập CSS Selector cần bỏ qua (ví dụ: bỏ quảng cáo, header, footer bằng các selector như `.nav, footer, .ads`).
  - Cấu hình tích hợp (Token API cho Notion, GitHub, Obsidian).
- **Auto-save**: Lưu cài đặt ngay khi người dùng thay đổi (onchange) vào `browser.storage.sync` kèm thông báo toast nhỏ "Đã lưu", loại bỏ hoàn toàn nút "Lưu thay đổi" thủ công.

---

## 3. Quy tắc UI/UX đặc thù cho WXT & Markdown Exporter

### 1. Phản hồi trạng thái (Feedback States)
- **Trạng thái Loading (Đang phân tích)**: Khi mở popup hoặc load trang mới, hiển thị hiệu ứng skeleton nhẹ hoặc spinner mờ tại vị trí hiển thị preview. Tránh khóa (freeze) toàn bộ UI.
- **Trạng thái Success (Thao tác thành công)**:
  - Khi click "Copy": Thay đổi text nút thành "Đã sao chép!" hoặc hiện icon tích xanh `✓`, duy trì trong `1.5 giây` rồi chuyển về trạng thái ban đầu.
- **Trạng thái Error (Không thể xuất)**:
  - Hiển thị thông báo thân thiện nếu extension không thể chạy trên các trang đặc biệt (như `chrome://`, `edge://`, trang trắng mới tab).
  - Ví dụ: *"Extension không hỗ trợ chạy trên trang cài đặt của trình duyệt."* kèm nút đóng hoặc hướng dẫn.

### 2. Micro-interactions & Animations
- Hiệu ứng hover mềm mại (transition: all 0.2s ease).
- Menu thả xuống (dropdown) hoặc panel xem trước trượt mở mượt mà (accordion transition).
- Tránh tất cả các hiệu ứng lòe loẹt, làm chậm tốc độ render của popup (popup cần render dưới 100ms).

### 3. Tailwind CSS & UI Components trong WXT
- Do WXT tối ưu bundle tốt, hãy dùng các component CSS tiện ích gọn nhẹ. Nếu sử dụng Tailwind CSS:
  - Giữ bảng màu tối giản: Nền tối (`bg-zinc-900` / `bg-slate-950`) hoặc nền sáng sạch sẽ (`bg-white` / `bg-zinc-50`).
  - Màu Accent (thao tác xuất): Ưu tiên màu xanh lá (`emerald`), xanh ngọc (`teal`) hoặc xanh dương dịu (`indigo`).
  - Bo góc vừa phải (Rounded-lg: `8px`) tạo cảm giác hiện đại, chuẩn UI của hệ điều hành.

---

## 4. Checklist thiết kế UI cho WXT Markdown Extension

Trước khi kết thúc thiết kế hoặc lập trình giao diện extension, hãy tự kiểm tra:

- [ ] **Tải trang dưới 150ms?** (Không load thư viện ngoài qua CDN, tất cả asset được đóng gói nội bộ qua WXT).
- [ ] **Đã có trạng thái "Đã sao chép" (Copied!) trực quan chưa?** (Nút chuyển trạng thái thành công).
- [ ] **Kích thước popup có bị vỡ khi thay đổi nội dung không?** (Sử dụng overflow-y-auto và định kích thước cố định hoặc max-height hợp lý).
- [ ] **Hỗ trợ chế độ nền tối (Dark Mode) tự động theo hệ thống chưa?** (Rất quan trọng cho Extension vì người dùng thường xuyên thay đổi theme).
- [ ] **Đã lưu cấu hình tự động (Auto-save) chưa?** (Khi toggle checkbox, trạng thái phải được ghi xuống `storage` ngay lập tức).
- [ ] **Giao diện có rõ ràng trên các trang không hỗ trợ (Chrome Web Store, chrome://) không?** (Có thông báo lỗi thân thiện thay vì giao diện hỏng).
- [ ] **Có cung cấp phím tắt (Keyboard Shortcut) không?** (Hiển thị gợi ý phím tắt nhỏ, ví dụ: `Alt+Shift+M để xuất nhanh`).

---

## 5. Mẫu giao diện Popup tối giản (HTML/Vite/Svelte/React trong WXT)

Dưới đây là sơ đồ layout đề xuất (ASCII Art) cho Popup:

```text
+------------------------------------------+
|  [M] Markdown Exporter       (⚙ Cài đặt)  |
+------------------------------------------+
|  Tiêu đề trang: Cách học React hiệu quả...|
|                                          |
|  [✓] Tải ảnh kèm theo   [✓] Thêm link gốc|
|                                          |
|  +------------------------------------+  |
|  | # Cách học React hiệu quả...       |  |
|  | React là một thư viện UI...        |  |
|  +------------------------------------+  |
|                                          |
|  [    SAO CHÉP MD    ]  [  TẢI FILE .md  ] |
+------------------------------------------+
```

---
*Tài liệu này kế thừa tinh thần của Minimal UI và được tùy chỉnh chuyên biệt cho dự án Web Extension bằng WXT.*
