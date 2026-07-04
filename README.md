# REduX 🚀 — Giải Pháp Chấm Điểm Lớp Học Tự Động Bằng Trí Tuệ Nhân Tạo

**REduX** (phiên bản v3.5.6) là một Chrome/Edge Extension chuyên nghiệp, hỗ trợ giảng viên quét danh sách nộp bài tập từ hệ thống LMS, tự động tải mã nguồn từ GitHub của học viên, lọc cấu hình thông minh và chấm điểm tự động thông qua các mô hình AI tiên tiến nhất hiện nay (Google Gemini, DeepSeek, OpenRouter, hoặc Ollama chạy Local Offline).

Dự án được thiết kế theo kiến trúc **Serverless 100% (Client-Side Only)** hoạt động độc lập và trực tiếp trên trình duyệt của giảng viên, bảo mật dữ liệu tuyệt đối và tối ưu hóa chi phí vận hành.

---

## 🎨 Các Tính Năng Nổi Bật Của REduX

### 1. ⚡ Chấm Hàng Loạt & Khớp Đề Bài Thông Minh (Bulk Grader)
* **Tự động quét trang:** Chỉ với 1-click, REduX sẽ quét toàn bộ danh sách nộp bài của học sinh chứa liên kết GitHub trên trang LMS.
* **Fuzzy Matching thông minh:** So sánh tương đối tên bài nộp của học sinh với cơ sở dữ liệu để tự động liên kết (map) đúng đề bài & tiêu chí chấm điểm tương ứng.
* **Tải & Lọc mã nguồn tối ưu:** Tải trực tiếp mã nguồn của học viên qua API GitHub. Sử dụng **Bộ lọc loại trừ (.graderignore) dạng Checkbox trực quan** để lọc bỏ các thư mục rác, build, hoặc dependencies nặng (như `node_modules/`, `build/`, `dist/`...) giúp tiết kiệm token gửi lên AI và tăng tốc độ xử lý mà vẫn giữ lại tài liệu quan trọng như `README.md`.
* **Chấm điểm song song song song:** Hỗ trợ chấm đồng thời nhiều học viên qua API AI để tối ưu hóa thời gian chờ.

### 2. 👥 Quản Lý Danh Sách Lớp & Xuất Báo Cáo Excel
* **Tự động trích xuất thông tin học viên:** Đọc thông tin học viên, mã sinh viên, trạng thái nộp bài trực tiếp từ bảng quản lý lớp học của LMS.
* **Quản lý trạng thái chấm bài:** Hiển thị chi tiết số bài đã nộp, tỷ lệ bài đã hoàn thành trên mỗi học viên và tổng quan trạng thái chấm điểm của lớp học.
* **Xuất báo cáo định dạng Excel (.xlsx):** Tích hợp thư viện **SheetJS (xlsx.full.min.js)** giúp xuất trực tiếp bảng điểm tiếng Việt có dấu hoàn hảo, tự động định cấu hình độ rộng cột tối ưu mà không cần thông qua file CSV trung gian lỗi font.

### 3. 🚀 Chấm Điểm Đơn (Single Grader)
* **Chấm nhanh Repository đang xem:** Tự động phát hiện liên kết GitHub của tab hiện tại, hỗ trợ chọn nhanh mẫu đề bài và chấm ngay lập tức.
* **Xem Markdown trực quan:** Nhận xét trả về từ AI được render đẹp mắt dưới dạng HTML trực quan, hỗ trợ copy nhanh nhận xét gửi cho học sinh chỉ qua 1-click.

### 4. 📚 Quản Lý Ngân Hàng Đề Bài (Exercises Library)
* **Cào đề bài tự động:** Quét tên môn học, chương học, nội dung mô tả đề bài trực tiếp trên trang chi tiết bài tập LMS của giáo viên.
* **Tách Rubric chấm điểm tự động:** Tự động phát hiện cấu trúc tiêu chí chấm bài (AI Rubric) trong đề bài để bóc tách riêng phần tiêu chí phục vụ Prompt chấm điểm.

### 5. ⚙️ Cấu Hình Đa Nhà Cung Cấp & Chỉ Báo Nhạy Bén
* **Hỗ trợ đa dạng AI API:** Google Gemini (Gemini 2.5 Flash/Pro), DeepSeek API (Coder/Chat), OpenRouter (Qwen, Llama...), Custom OpenAI-compatible API, và Ollama Local (DeepSeek-R1 chạy offline).
* **System Prompt Customizer:** Biên tập và thay đổi Prompt chấm bài của AI ngay trong cấu hình hệ thống bằng các biến động: `{{assignment}}`, `{{criteria}}`, và `{{code}}`.
* **Trạng thái AI tích hợp (Smart Version Tag):** Nhãn phiên bản ở góc phải Header (`v3.5.6`) hoạt động như một đèn chỉ báo thông minh: sáng **màu xanh lá cây** khi cấu hình khóa API hoạt động sẵn sàng, và tự động chuyển sang **màu đỏ** khi chưa cấu hình hoặc cấu hình sai.

---

## 📁 Cấu Trúc Mã Nguồn Dự Án

```text
REduX/
├── extension/             # Mã nguồn Chrome/Edge Extension (JavaScript/CSS/HTML)
│   ├── manifest.json      # Tệp khai báo thông tin, quyền lợi & icon của Extension (v3.5.6)
│   ├── popup.html         # Giao diện điều khiển chính của REduX (5 Tab điều hướng)
│   ├── popup.css          # Định dạng CSS premium, hỗ trợ giao diện sáng/tối tối giản
│   ├── popup.js           # Bộ điều phối chính kết nối các Tab và khởi chạy dịch vụ
│   ├── aiService.js       # Dịch vụ giao tiếp với các API AI (Gemini, DeepSeek, Ollama...)
│   ├── githubService.js   # Dịch vụ tải, giải nén và lọc file thông minh từ GitHub ZIP
│   ├── lmsScraper.js      # Script chạy ngầm trên LMS để cào đề bài/danh sách lớp
│   ├── xlsx.full.min.js   # Thư viện xuất file Excel (SheetJS)
│   ├── logo.png           # Logo ngang REduX hiển thị tại Header
│   ├── icon.png           # Icon vuông REduX (biểu tượng X mạch điện & bộ não)
│   └── controllers/       # Các bộ điều khiển logic tương ứng từng Tab
│       ├── autoGraderTab.js   # Logic quét, lọc và chấm bài hàng loạt
│       ├── singleGraderTab.js # Logic chấm đơn
│       ├── classListTab.js    # Logic quản lý danh sách lớp & xuất Excel
│       ├── exercisesTab.js    # Logic quản lý ngân hàng đề bài
│       └── settingsTab.js     # Logic quản lý cấu hình API & lưới Checkbox loại trừ
├── security_and_sync_plan.md  # Kế hoạch chi tiết về nâng cấp Bảo mật & Cloud cho tương lai
├── CHANGELOG.md           # Nhật ký ghi chép tất cả lịch sử thay đổi phiên bản
└── README.md              # Tài liệu hướng dẫn sử dụng dự án (Tài liệu này)
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Sử Dụng

### 1. Cài đặt tiện ích dưới dạng đã giải nén (Development Mode)
Vì REduX là ứng dụng Serverless chạy client-side, bạn không cần cài đặt môi trường backend phức tạp:
1. Tải hoặc clone mã nguồn thư mục dự án về máy tính của bạn.
2. Mở trình duyệt Chrome/Edge và truy cập trang quản lý tiện ích:
   * Chrome: `chrome://extensions/`
   * Edge: `edge://extensions/`
3. Kích hoạt **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải màn hình.
4. Bấm nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trái.
5. Tìm và chọn thư mục **`extension`** nằm trong thư mục dự án của bạn (đường dẫn có dạng: `/REduX/extension`).

### 2. Thiết lập thông tin Cấu hình ban đầu
1. Nhấp vào biểu tượng của **REduX** (biểu tượng chữ **X** mạch điện tử & bộ não) trên thanh công cụ trình duyệt.
2. Di chuyển sang Tab **⚙️ Cài Đặt**.
3. Cấu hình các thông tin kết nối chính:
   * **Nhà cung cấp AI:** Chọn mô hình AI bạn muốn sử dụng (ví dụ: `Google Gemini`).
   * **API Key:** Dán khóa API của bạn vào.
   * **Tên Model:** Nhập model muốn dùng (ví dụ: `gemini-2.5-flash` để tối ưu chi phí và tốc độ, hoặc `gemini-1.5-pro` để có kết quả sâu sắc hơn).
   * **GitHub Token:** Cung cấp Personal Access Token (PAT) của bạn. *Lưu ý: Bạn nên sử dụng Token này vì nếu không có, GitHub API sẽ giới hạn tối đa 60 lượt tải/giờ, có thể gây lỗi nghẽn khi chấm bài hàng loạt cho lớp học đông.*
   * **Bộ lọc loại trừ file (.graderignore):** Tích chọn các checkbox của thư mục/tập tin rác bạn muốn loại bỏ khi tải code học viên (ví dụ: `build/`, `dist/`, `.idea/`...). Các thư mục cốt lõi nặng (`node_modules/`, `.venv/`, `.git/`) sẽ luôn được tự động loại bỏ ngầm để đảm bảo hiệu năng.
4. Nhấp nút **Lưu Cấu Hình** 💾.
5. Quan sát góc trên cùng bên phải: Nếu nút tag phiên bản **`v3.5.6`** chuyển sang **màu xanh lá cây**, hệ thống của bạn đã sẵn sàng hoạt động! Nếu là **màu đỏ**, hãy kiểm tra lại khóa API và cấu hình tương thích của bạn.

---

## 🏃 Quy Trình Vận Hành Chấm Điểm Lớp Học Thực Tế

### Bước 1: Thu thập Đề bài và Tiêu chí chấm từ LMS
1. Đăng nhập vào hệ thống LMS của trung tâm, điều hướng đến trang chi tiết của Bài tập/Homework cần chuẩn bị chấm.
2. Mở Extension REduX lên, chọn Tab **📚 Đề Bài**.
3. Click vào nút **📥 Cào đề bài từ LMS**. Tiện ích sẽ tự động bóc tách:
   * Tên Khóa học & Mã Lớp học.
   * Tên Session (Chương học).
   * Nội dung chi tiết đề bài tập về nhà và tự động trích lọc các tiêu chí chấm điểm (Rubric).
4. Kiểm tra lại thông tin trên form và nhấn **✅ Xác Nhận Thêm Vào Ngân Hàng** để lưu lại.

### Bước 2: Quét danh sách bài nộp và Chấm bài
1. Di chuyển sang trang chứa bảng nộp bài tập của học sinh trên LMS (trang hiển thị danh sách học viên kèm link nộp bài).
2. Mở REduX, chọn Tab **⚡ Chấm Hàng Loạt**.
3. Click **Quét danh sách bài nộp trên trang**.
4. REduX sẽ lập tức quét và hiển thị toàn bộ học sinh kèm đường dẫn repo GitHub tương ứng. Dựa vào thuật toán *Fuzzy Matching*, REduX tự động chọn bài tập tương ứng khớp với tên bài học cho từng học viên.
5. Tích chọn các học viên cần chấm điểm và click **🚀 Bắt Đầu Chấm X Bài Đã Chọn**.
6. Tiến trình tải code và gọi AI chấm bài sẽ diễn ra song song. Kết quả điểm số cùng nhận xét nhanh sẽ cập nhật trực tiếp trên bảng. 
7. Giảng viên có thể bấm vào nút **Chi tiết** trên từng dòng để đọc báo cáo Markdown đầy đủ và sao chép nhận xét gửi cho học viên.

### Bước 3: Quản lý danh sách lớp học và Xuất bảng điểm Excel
1. Di chuyển tới trang danh sách lớp học tổng quan trên LMS (trang có bảng danh sách tất cả học viên trong lớp).
2. Mở REduX, chọn Tab **👥 Quản Lý Lớp Học**.
3. Click **Tải Danh Sách Học Viên**. Bảng hiển thị thông tin học viên kèm thống kê tỷ lệ hoàn thành bài tập sẽ xuất hiện.
4. Sau khi chấm bài xong xuôi, click **📥 Xuất báo cáo Excel (.xlsx)**. Hệ thống sẽ kết xuất trực tiếp tệp tin Excel tiếng Việt chuẩn chỉnh, tự căn rộng cột tối ưu để lưu trữ điểm số.

---

## 🖥️ Hướng Dẫn Sử Dụng Streamlit Web App & FastAPI Backend

Ngoài Chrome Extension, REduX còn hỗ trợ giao diện ứng dụng Web độc lập (Streamlit) và máy chủ API cục bộ (FastAPI) viết bằng Python.

### 1. Khởi chạy ứng dụng Web độc lập (Streamlit Web App)
Giao diện Web Python hỗ trợ chấm điểm và quản lý ngoại tuyến rất tiện lợi:
1. **Kích hoạt môi trường ảo Python:**
   * **Windows (PowerShell):**
     ```powershell
     .\.venv\Scripts\activate
     ```
   * **Windows (Git Bash / Command Prompt) hoặc macOS/Linux:**
     ```bash
     source .venv/bin/activate  # hoặc .venv/Scripts/activate trên Windows Command Prompt
     ```
2. **Cài đặt các thư viện cần thiết:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Cấu hình biến môi trường (`.env`):**
   Tạo file `.env` tại thư mục gốc của dự án (`/REduX/.env`) và cấu hình như sau:
   ```env
   GEMINI_API_KEY=AIzaSy...
   GITHUB_TOKEN=ghp_...
   AI_PROVIDER=gemini
   LOCAL_MODEL_NAME=gemini-1.5-pro
   ```
4. **Khởi chạy ứng dụng:**
   ```bash
   streamlit run app.py
   ```
   Ứng dụng sẽ tự động mở trên trình duyệt tại địa chỉ mặc định `http://localhost:8501`.

### 2. Khởi chạy máy chủ API cục bộ (FastAPI Backend)
Nếu bạn muốn cấu hình Chrome Extension REduX chạy ở chế độ chuyển tiếp qua API cục bộ (thay vì Serverless gọi trực tiếp AI từ client):
1. **Khởi chạy máy chủ FastAPI:**
   ```bash
   python api.py
   ```
2. Máy chủ uvicorn sẽ khởi chạy tại cổng mặc định `http://127.0.0.1:8000`.
3. Mở tab **⚙️ Cài Đặt** của Extension REduX, tại mục **Nhà Cung Cấp AI**, chọn `Custom API` hoặc cấu hình tương ứng, trỏ URL về cổng máy chủ cục bộ này để định tuyến và theo dõi lịch sử API tập trung.

---

## 📜 Quy Định Đóng Gói (Release/Version Control)
* Tiện ích REduX tuân thủ quy trình phát triển và kiểm soát phiên bản nghiêm ngặt.
* Mọi cập nhật liên quan đến chức năng, sửa lỗi đều phải được nâng cấp mã phiên bản (version) đồng bộ tại các tệp tin:
  * `manifest.json` (Trường `"version"`)
  * `popup.js` (Hằng số `appVersion`)
  * `popup.html` (Thẻ nhãn hiển thị `#app-version`)
* Mọi thay đổi phải được ghi chép tường tận vào file [CHANGELOG.md](CHANGELOG.md) theo chuẩn định dạng **Keep a Changelog**.
