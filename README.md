# 🤖 AI GitHub Grader — Hệ thống Chấm Điểm Tự Động thông qua AI

**AI GitHub Grader** là bộ công cụ hỗ trợ giảng viên tự động chấm điểm và đánh giá chi tiết mã nguồn của học viên từ các kho lưu trữ GitHub (public repository). Hệ thống tích hợp trực tiếp với các mô hình Trí Tuệ Nhân Tạo (AI) hàng đầu hiện nay như **Google Gemini**, **DeepSeek**, **OpenRouter (Qwen, Llama...)** và **Ollama (DeepSeek-R1 chạy local offline)**.

Dự án bao gồm hai thành phần chính:
1. **Chrome Extension (Khuyên dùng - Serverless 100%)**: Tiện ích chạy trực tiếp trên trình duyệt, hỗ trợ quét danh sách bài nộp và chấm điểm hàng loạt ngay trên trang LMS của trung tâm.
2. **Streamlit Web App (Python Backend)**: Ứng dụng Web giao diện độc lập viết bằng Python.

---

## 🎨 Giao diện & Tính năng Nổi bật (Chrome Extension v3.2.2)

Tiện ích mở rộng Chrome Extension đã được tái cấu trúc hoàn chỉnh giúp tối ưu hóa hiệu năng và mang lại trải nghiệm tiện dụng nhất cho giảng viên:

### 1. ⚡ Quét & Chấm Hàng Loạt (Auto Scan & Bulk Grader)
* **Tự động quét trang:** Quét toàn bộ trang LMS đang mở để tự động nhận diện tất cả các bài nộp chứa liên kết GitHub của học viên.
* **Fuzzy Matching thông minh:** So sánh tương đối tên bài nộp của học sinh với cơ sở dữ liệu để tự động liên kết (map) đúng Đề bài & Tiêu chí chấm điểm.
* **Chấm điểm song song:** Hỗ trợ chọn nhiều hoặc tất cả học viên và tiến hành gửi chấm song song qua API AI, giúp tiết kiệm tối đa thời gian.
* **Báo cáo chi tiết:** Hiển thị nhận xét ngắn gọn về vị trí dòng lỗi, lý do sai và tổng điểm của từng học sinh ngay trên bảng quản lý.

### 2. 🚀 Chấm Đơn (Single Grader)
* **Chấm nhanh một Repository:** Tự động điền link GitHub của tab đang xem, cho phép chọn nhanh bài tập và chấm ngay lập tức.
* **Xem Markdown trực quan:** Kết quả trả về từ AI được render đẹp mắt dưới dạng HTML từ mã nguồn Markdown, hỗ trợ sao chép nhanh nhận xét chấm điểm chỉ với 1 click.

### 3. 📚 Quản lý Đề Bài & Cào thông tin LMS (Exercises Library)
* **Cào đề bài thông minh:** Tự động bóc tách tên Khóa học (Chương), tên Session và nội dung Đề bài từ trang chi tiết LMS mà giảng viên đang xem.
* **Tự động trích xuất tiêu chí (AI Rubric):** Tự động phát hiện các cụm từ chỉ định tiêu chí chấm như `Tiêu chí chấm bài (AI)::`, bóc tách riêng phần tiêu chí đưa vào ô Rubric và làm sạch mô tả đề bài chính.
* **Quản lý cơ sở dữ liệu cục bộ:** Lưu trữ ngân hàng đề bài trực tiếp trên trình duyệt (`chrome.storage.local`), cho phép sửa đổi hoặc xóa bài tập nhanh chóng.

### 4. ⚙️ Cấu hình AI & Hệ thống tùy biến System Prompt
* **Đa dạng nhà cung cấp:** Hỗ trợ Google Gemini, DeepSeek API, OpenRouter, Ollama (Local) hoặc bất kỳ API tương thích chuẩn OpenAI nào khác.
* **Tùy biến System Prompt:** Cho phép giảng viên chỉnh sửa trực tiếp Prompt gốc của AI ngay trong tab Cài đặt. Hỗ trợ các biến đại diện động:
  * `{{assignment}}`: Nội dung đề bài
  * `{{criteria}}`: Tiêu chí chấm điểm (AI Rubric)
  * `{{code}}`: Mã nguồn của học viên (được nén khoảng trắng tối ưu dung lượng)
* **Lưu đệm tối ưu hiệu năng (Performance Optimization):** Áp dụng kỹ thuật `Select Caching` (giảm tải 95% xử lý lặp) và `DocumentFragment Batching` (vẽ bảng HTML hàng loạt chỉ qua 1 lần reflow), giúp Extension chạy cực kỳ mượt mà, triệt tiêu hoàn toàn hiện tượng giật lag khi quét trang có 30-50 học sinh.

---

## 📁 Cấu trúc thư mục dự án

```text
AutoScoring/
├── extension/             # Mã nguồn Chrome/Edge Extension (JavaScript/CSS/HTML)
│   ├── manifest.json      # Tệp khai báo thông tin & quyền của Extension (v3.2.2)
│   ├── popup.html         # Giao diện popup chính của Extension
│   ├── popup.css          # Tệp định dạng CSS premium, chống tràn màn hình
│   ├── popup.js           # Bộ điều phối và liên kết sự kiện 4 Tab chính
│   ├── utils.js           # Các hàm tiện ích dùng chung (Fuzzy match, trích xuất điểm/tiêu chí)
│   ├── aiService.js       # Dịch vụ gọi API gửi prompt chấm điểm (Gemini, DeepSeek, Ollama...)
│   ├── githubService.js   # Dịch vụ tải và giải nén repository ZIP từ GitHub
│   ├── lmsScraper.js      # Scrip cào thông tin đề bài được tiêm trực tiếp vào LMS
│   └── controllers/       # Các bộ điều khiển logic cho từng tab chuyên biệt
│       ├── autoGraderTab.js   # Tab 1: Quét và chấm hàng loạt (Tối ưu Reflow & Cache)
│       ├── singleGraderTab.js # Tab 2: Chấm điểm đơn
│       ├── exercisesTab.js    # Tab 3: Quản lý ngân hàng đề bài
│       └── settingsTab.js     # Tab 4: Cài đặt hệ thống & Soạn thảo System Prompt
├── streamlit_app/         # Mã nguồn ứng dụng Web Python (Streamlit)
│   └── app.py             # Giao diện web Python chính
├── CHANGELOG.md           # Nhật ký ghi chép tất cả lịch sử thay đổi phiên bản
└── README.md              # Hướng dẫn chi tiết dự án (Tài liệu này)
```

---

## 🛠️ Hướng dẫn Cài đặt & Sử dụng Chrome Extension

Vì Extension được thiết kế **100% Serverless**, bạn có thể sử dụng trực tiếp trên trình duyệt Chrome hoặc Edge mà không cần cài đặt thêm Python hay chạy API Server.

### Bước 1: Cài đặt Extension vào trình duyệt
1. Tải thư mục dự án về máy tính của bạn.
2. Mở trình duyệt và truy cập vào trang quản lý tiện ích mở rộng:
   * **Chrome**: Nhập `chrome://extensions/`
   * **Edge**: Nhập `edge://extensions/`
3. Kích hoạt **Chế độ nhà phát triển (Developer mode)** ở góc trên bên phải màn hình.
4. Bấm vào nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trái.
5. Chọn thư mục `extension` nằm bên trong thư mục dự án (đường dẫn dạng: `.../AutoScoring/extension`).

### Bước 2: Thiết lập thông tin API (Tab Cài Đặt)
1. Click vào biểu tượng Extension **AI GitHub Grader** trên thanh công cụ của trình duyệt.
2. Di chuyển sang tab **⚙️ Cài Đặt**.
3. Cấu hình các thông tin sau:
   * **Nhà Cung Cấp AI:** Chọn một trong các nhà cung cấp (Ví dụ: `Google Gemini`).
   * **API Key:** Dán khóa API của bạn vào (Ví dụ: Gemini API Key).
   * **Tên Model:** Điền model muốn dùng (Ví dụ: `gemini-1.5-pro` hoặc `gemini-2.5-flash`).
   * **GitHub Token:** Dán Personal Access Token của bạn (rất khuyên dùng để không bị giới hạn 60 lượt tải/giờ từ GitHub API khi chấm hàng loạt).
   * **System Prompt:** Có thể giữ nguyên mặc định hoặc tùy chỉnh theo ý muốn.
4. Nhấn **Lưu Cấu Hình** 💾. Đèn trạng thái phía trên sẽ đổi sang màu xanh báo **Sẵn sàng**!

---

## 🏃 Quy trình chấm bài & Cào đề bài thực tế trên LMS

Để vận hành chấm điểm một bài học mới trên LMS, bạn thực hiện quy trình sau:

### Bước 1: Nạp đề bài vào ngân hàng
1. Đăng nhập vào trang LMS của trung tâm, di chuyển tới bài tập cần chấm (ví dụ: `Session 02 -> Homework -> Bài tập thực hành`).
2. Mở Extension lên, chọn Tab **📚 Đề Bài**.
3. Nhấp nút **📥 Cào đề bài từ LMS**. 
4. Hệ thống sẽ tự động quét thông tin:
   * Tên khóa học chứa mã lớp (ví dụ: `[IT-215] Phát triển dịch vụ Web với FastAPI`).
   * Tên Session (ví dụ: `Session 02`).
   * Tên bài tập và nội dung đề bài chính.
   * Tự động cắt phần tiêu chí chấm (nếu có ghi trong đề bài) đưa vào ô **Tiêu chí chấm điểm**.
5. Kiểm tra lại thông tin trên form và nhấn **✅ Xác Nhận Thêm Vào Ngân Hàng**.

### Bước 2: Thực hiện chấm bài hàng loạt
1. Di chuyển tới trang danh sách nộp bài tập của lớp học trên LMS (trang hiển thị bảng có chứa các link bài nộp GitHub của học viên).
2. Mở Extension lên, chọn Tab **⚡ Quét & Chấm Hàng Loạt**.
3. Nhấp nút **Quét danh sách**. Hệ thống sẽ hiển thị bảng toàn bộ học sinh kèm link GitHub tương ứng.
4. Nhờ cơ chế *Fuzzy Matching*, Extension sẽ tự động khớp và chọn bài tập phù hợp cho từng học viên. (Bạn có thể đổi thủ công ở dropdown nếu cần).
5. Tích chọn các học viên muốn chấm điểm, rồi click **🚀 Bắt Đầu Chấm X Bài Đã Chọn**.
6. Điểm số và nhận xét ngắn gọn (lỗi ở dòng nào, vì sao sai) sẽ được cập nhật trực tiếp trên bảng. Bạn có thể bấm nút **Chi tiết** ở mỗi dòng để xem báo cáo Markdown đầy đủ và copy nhận xét gửi cho học viên!

---

## 🖥️ Hướng dẫn Khởi chạy Streamlit Web App (Thay thế)

Nếu muốn sử dụng ứng dụng web độc lập viết bằng Python:

### Bước 1: Cấu hình môi trường
Kích hoạt môi trường ảo `.venv` và cài đặt các thư viện Python:
```bash
# Kích hoạt môi trường ảo
# Windows (PowerShell):
.\.venv\Scripts\activate
# Windows (Git Bash / macOS):
source ./.venv/Scripts/activate

# Cài đặt thư viện
pip install -r requirements.txt
```

### Bước 2: Cấu hình tệp `.env`
Tạo tệp `.env` tại thư mục gốc và điền các cấu hình của bạn:
```env
GEMINI_API_KEY=AIzaSy...
GITHUB_TOKEN=ghp_...
AI_PROVIDER=gemini
LOCAL_MODEL_NAME=gemini-1.5-pro
```

### Bước 3: Chạy ứng dụng
```bash
streamlit run streamlit_app/app.py
```

---

## 📜 Quy định Cập nhật Phiên bản & Changelog

Để bảo trì dự án một cách chuyên nghiệp, bất kỳ thay đổi nào về mã nguồn đều phải tuân thủ:
1. Cập nhật mã phiên bản (version code) đồng bộ tại `manifest.json`, `popup.html`, và `popup.js`.
2. Ghi nhận chi tiết các cải tiến, tính năng mới hoặc sửa lỗi vào tệp [CHANGELOG.md](file:///s:/WorkSpace/RikkeiEducation/AutoScoring/AutoScoring/CHANGELOG.md) theo chuẩn **Keep a Changelog**.
