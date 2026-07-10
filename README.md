# REduX 🚀 — Giải Pháp Chấm Điểm Lớp Học Tự Động Bằng Trí Tuệ Nhân Tạo (v4.0.0)

**REduX** (phiên bản v4.0.0) là một Chrome/Edge Extension thế hệ mới được phát triển trên nền tảng **WXT Framework**, **React 19**, **TypeScript** và **Tailwind CSS v4**.

Công cụ này hỗ trợ giảng viên quét danh sách nộp bài tập từ hệ thống LMS, tự động tải mã nguồn từ kho lưu trữ GitHub của học viên, lọc bỏ tệp tin rác và chấm điểm tự động thông qua các mô hình AI tiên tiến nhất hiện nay (Google Gemini, DeepSeek, OpenRouter, hoặc Ollama chạy Local Offline).

---

## 🎨 Các Tính Năng Nổi Bật Của REduX v4.0.0

### 1. ⚡ Chấm Hàng Loạt & Khớp Đề Bài Thông Minh (Bulk Grader)
* **Tự động quét trang:** Chỉ với 1-click, REduX sẽ quét toàn bộ danh sách nộp bài của học sinh chứa liên kết GitHub trên trang LMS.
* **Fuzzy Matching thông minh:** So sánh tương đối tên bài nộp của học sinh với cơ sở dữ liệu để tự động liên kết (map) đúng đề bài & tiêu chí chấm điểm tương ứng.
* **Tải & Lọc mã nguồn tối ưu:** Tải trực tiếp mã nguồn của học viên qua API GitHub. Sử dụng **Bộ lọc loại trừ (.graderignore) dạng Checkbox trực quan** để lọc bỏ các thư mục rác, build, hoặc các dependencies/môi trường ảo nặng (như `node_modules/`, `build/`, `dist/`, `.venv/`...) giúp tiết kiệm token gửi lên AI.
* **Hiển thị tiến trình trực quan:** Banner hiển thị chi tiết thông tin sinh viên đang được chấm trực tiếp dạng `👤 Đang chấm cho học viên: [Tên học viên] ([MSSV])` giúp giảng viên dễ dàng theo dõi.

### 2. 👥 Quản Lý Danh Sách Lớp & Xuất Báo Cáo Excel
* **Tự động trích xuất thông tin học viên:** Đọc thông tin học viên, mã sinh viên, trạng thái nộp bài trực tiếp từ bảng quản lý lớp học của LMS.
* **Quản lý trạng thái chấm bài:** Hiển thị chi tiết số bài đã nộp, tỷ lệ bài đã hoàn thành trên mỗi học viên và tổng quan trạng thái chấm điểm của lớp học.
* **Xuất báo cáo định dạng Excel (.xlsx):** Tích hợp xuất trực tiếp bảng điểm tiếng Việt có dấu hoàn hảo, tự động định cấu hình độ rộng cột tối ưu.

### 3. 📞 Quản Lý Chăm Sóc Học Viên (Student Care)
* **Tự động cào dữ liệu chăm sóc:** Đọc thông tin Mã SV, Tên học viên từ giao diện chăm sóc sinh viên của LMS (`/class/*/take-care`).
* **Ghi chú trực tiếp:** Cung cấp ô nhập thông tin liên hệ trước từng sinh viên, hỗ trợ lưu trữ cục bộ (`chrome.storage.local`) tách biệt theo từng Môn học và Ngày học.
* **Xuất báo cáo Excel Chăm Sóc:** Hỗ trợ xuất dữ liệu chăm sóc học viên ra file Excel `.xlsx` chuyên nghiệp, hỗ trợ tiếng Việt hoàn chỉnh.

### 4. 🚀 Chấm Điểm Đơn (Single Grader)
* **Chấm nhanh Repository đang xem:** Tự động phát hiện liên kết GitHub của tab hiện tại, hỗ trợ chọn nhanh mẫu đề bài và chấm ngay lập tức.
* **Xem Markdown trực quan:** Nhận xét trả về từ AI được render đẹp mắt dưới dạng HTML trực quan, hỗ trợ sao chép nhanh nhận xét gửi cho học sinh chỉ qua 1-click.

### 5. 📚 Quản Lý Ngân Hàng Đề Bài (Exercises Library)
* **Cào đề bài tự động:** Quét tên môn học, chương học, nội dung mô tả đề bài trực tiếp trên trang chi tiết bài tập LMS của giáo viên.
* **Tách Rubric chấm điểm tự động:** Tự động phát hiện cấu trúc tiêu chí chấm bài (AI Rubric) trong đề bài để bóc tách riêng phần tiêu chí phục vụ Prompt chấm điểm.

---

## 📁 Cấu Trúc Mã Nguồn Dự Án (WXT Architecture)

```text
AutoScoring/
├── .output/               # Thư mục đầu ra chứa Extension đã build (nạp vào trình duyệt từ đây)
├── .wxt/                  # Các tệp cấu hình và types tự động sinh bởi WXT
├── assets/                # Các tài nguyên giao diện chung
├── entrypoints/           # Các điểm phân phối của Extension
│   ├── background.ts      # Service Worker chạy ẩn xử lý tải file và đồng bộ hóa ngầm
│   ├── content.ts         # Script tiêm trực tiếp vào trang LMS để điều khiển DOM và highlighting
│   ├── popup/             # Ứng dụng giao diện React chính của Popup
│   │   ├── index.html     # Điểm nạp giao diện popup
│   │   ├── main.tsx       # Khởi tạo React root
│   │   ├── App.tsx        # Điều phối chính tabs điều hướng
│   │   ├── App.css        # Khai báo tailwind layer
│   │   └── style.css      # Cấu hình giao diện và typography toàn cục (Be Vietnam Pro, 780x600px)
│   └── *Scraper.ts        # Các tệp scraper cào dữ liệu được tiêm linh hoạt
├── public/                # Thư mục chứa các tệp tĩnh (icon, logo, rules.json cho CORS bypass)
├── src/                   # Thư mục chứa các component và logic lõi của React
│   ├── components/        # Các React Tabs (AutoGraderTab, ClassListTab, SettingsTab...)
│   ├── core/              # Các utilities dùng chung (AppContext, excelExporter, ToastContext...)
│   ├── services/          # Lớp dịch vụ API (aiService, supabaseService, githubService...)
│   └── types.ts           # Kiểu dữ liệu tĩnh TypeScript định nghĩa Student, Submission, Template...
├── package.json           # Khai báo script và dependencies (React 19, TypeScript, WXT)
├── tailwind.config.js     # Cấu hình lưới Tailwind CSS
├── tsconfig.json          # Cấu hình trình biên dịch TypeScript
└── wxt.config.ts          # Tệp cấu hình phân phối chính của WXT Framework (phiên bản v4.0.0)
```

---

## 🛠️ Hướng Dẫn Cài Đặt Cho Nhà Phát Triển (Development Mode)

### 1. Chuẩn bị môi trường máy cục bộ
Bạn cần cài đặt **Node.js (phiên bản 18 trở lên)** trên máy tính. Sau đó mở terminal tại thư mục dự án và chạy lệnh sau để cài đặt các thư viện cần thiết:
```bash
npm install
```

### 2. Các lệnh thực thi chính
* **Phát triển thời gian thực (Hot-reload dev server):**
  ```bash
  npm run dev
  ```
  Lệnh này sẽ khởi động một trình duyệt Chrome thử nghiệm đã được nạp sẵn Extension và tự động cập nhật mỗi khi bạn thay đổi code.
  
* **Đóng gói sản phẩm (Build Production):**
  ```bash
  npm run build
  ```
  Lệnh này sẽ biên dịch, nén code tối ưu và tạo ra sản phẩm hoàn thiện trong thư mục **`.output/chrome-mv3`**.

* **Kiểm tra lỗi kiểu dữ liệu (TypeScript Compile Check):**
  ```bash
  npm run compile
  ```

---

## 🔌 Cách Nạp Tiện Ích Đã Build Vào Trình Duyệt (Chrome / Edge)

Để sử dụng tiện ích của bạn trên trình duyệt chính hằng ngày:
1. Mở trình duyệt Chrome hoặc Microsoft Edge.
2. Truy cập trang quản lý tiện ích:
   * Chrome: `chrome://extensions/`
   * Edge: `edge://extensions/`
3. Bật nút **Developer mode (Chế độ dành cho nhà phát triển)** ở góc màn hình.
4. Bấm nút **Load unpacked (Tải tiện ích đã giải nén)**.
5. Chọn thư mục **`.output/chrome-mv3`** nằm trong thư mục dự án của bạn (đường dẫn dạng: `.../AutoScoring/.output/chrome-mv3`).

---

## ⚙️ Thiết Lập Thông Tin Cấu Hình Ban Đầu

1. Nhấp vào biểu tượng của **REduX** (chữ **X** mạch điện tử & bộ não) trên thanh công cụ trình duyệt.
2. Di chuyển sang Tab **⚙️ Cài Đặt**.
3. Cấu hình các thông tin kết nối chính:
   * **Nhà cung cấp AI:** Chọn mô hình AI bạn muốn sử dụng (ví dụ: `Google Gemini`).
   * **API Key:** Dán khóa API của bạn vào.
   * **Tên Model:** Nhập model muốn dùng (ví dụ: `gemini-2.5-flash` để tối ưu chi phí và tốc độ).
   * **GitHub Token:** Cung cấp Personal Access Token (PAT) của bạn để tránh bị giới hạn 60 lượt tải/giờ từ GitHub API.
4. Nhấp nút **Lưu Cấu Hình** 💾.
5. Quan sát góc trên cùng bên phải: Nếu nút hiển thị phiên bản **`v4.0.0`** chuyển sang **màu xanh lá cây**, hệ thống của bạn đã sẵn sàng hoạt động! Nếu là **màu đỏ**, hãy kiểm tra lại khóa API.
