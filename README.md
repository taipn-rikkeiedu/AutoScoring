# REduX 🚀 — Trợ Lý Giảng Dạy & Quản Lý Lớp Học Toàn Diện Tích Hợp AI (v4.6.0)

**REduX** (phiên bản v4.6.0) là một Chrome/Edge Extension thế hệ mới chuyên nghiệp được phát triển trên nền tảng **WXT Framework**, **React 19**, **TypeScript** và **Tailwind CSS v4**.

Vượt trội hơn một công cụ chấm điểm thông thường, **REduX** hoạt động như một trợ lý ảo toàn diện đồng hành cùng giảng viên và trợ giảng. Hệ thống hợp nhất từ chấm bài tự động bằng AI (quét LMS, tải mã nguồn GitHub, lọc rác tối ưu token), quản lý lớp học cục bộ bảo mật (Local-First Class Management), theo dõi sát sao tiến độ và ghi chú chăm sóc học viên (Student Care), cho đến tự động điền điểm hai chiều (Bidirectional Sync) và đồng bộ đám mây trên Supabase.

---

## 🎨 Các Tính Năng Nổi Bật Của REduX

### 1. ⚡ Chấm Hàng Loạt Theo Học Viên & Gom Nhóm Thông Minh (Student-based Parallel Bulk Grading)
* **Tự động quét trang:** Chỉ với 1-click, REduX sẽ quét toàn bộ danh sách nộp bài của học sinh chứa liên kết GitHub trên trang LMS.
* **Gom nhóm & Tải mã nguồn tối ưu:** Tự động gom nhóm các bài nộp theo tài khoản học viên (`githubUrl`). Hệ thống chỉ tải mã nguồn học viên **1 lần duy nhất** cho toàn bộ các bài tập trong nhóm.
* **Bộ nhớ đệm mã nguồn (GitHub Code Cache):** Lưu trữ mã nguồn đã nén vào bộ nhớ cục bộ (`chrome.storage.local`) tối đa 100 bài cache hoạt động (LRU eviction), tự động hết hạn sau 24 giờ. Extension sẽ tự động đối chiếu commit SHA mới nhất qua GitHub API trước khi chấm để đảm bảo mã nguồn luôn được cập nhật. Giáo viên cũng có thể xóa cache thủ công trong tab Cài đặt.
* **Tải song song đa luồng (Parallel File Fetching):** Nâng cấp hàm tải Git Trees API thủ công chạy đa luồng giới hạn song song tối đa 5 tệp cùng lúc (`concurrencyLimit = 5`), cải thiện tốc độ tải mã nguồn lên gấp 3-5 lần khi tải ZIP gặp sự cố.
* **Fuzzy Matching thông minh:** So sánh tương đối tên bài nộp của học sinh với cơ sở dữ liệu để tự động liên kết (map) đúng đề bài & tiêu chí chấm điểm tương ứng.
* **Nén mã nguồn thông minh theo Ngôn ngữ:** Tự động nén mã nguồn để tối ưu token AI gửi đi. Giữ nguyên thụt dòng đối với Python (`.py`) và YAML (`.yml`, `.yaml`) để tránh lỗi cú pháp, các ngôn ngữ khác sẽ lược bỏ thụt dòng hoàn toàn để tiết kiệm tokens tối đa.
* **Duy trì điểm số:** Tiến trình chấm hàng loạt tự động cập nhật điểm số trực quan cho từng bài tập ngay sau khi chấm xong mà không bị ghi đè hay mất trạng thái.

### 2. 👥 Quản Lý Danh Sách Lớp & Bảo Mật Tuyệt Đối (Local-First Class Management)
* **Tự động trích xuất thông tin học viên:** Đọc thông tin học viên, mã sinh viên, trạng thái nộp bài trực tiếp từ bảng quản lý lớp học của LMS.
* **Lưu trữ cục bộ bảo mật (Local Storage):** Danh sách lớp học và học viên được chuyển sang lưu trữ cục bộ hoàn toàn tại trình duyệt của giáo viên (`chrome.storage.local`), đảm bảo an toàn bảo mật và không lưu footprint dữ liệu cá nhân học viên trên đám mây Supabase Cloud.
* **Đồng bộ kết quả chấm lên đám mây (Supabase Sync):** Tự động đồng bộ hóa điểm số chấm bài và các ghi chú hỗ trợ học viên lên các bảng `submissions` và `care_notes` trên Supabase Cloud.
* **Xuất báo cáo định dạng Excel (.xlsx):** Tích hợp xuất trực tiếp bảng điểm tiếng Việt có dấu hoàn hảo, tự động định cấu hình độ rộng cột tối ưu.

### 3. ⚡ Tự động chạy DDL Migrations (One-Click Setup)
* **Khởi tạo database tự động:** Khi cấu hình Supabase cho một dự án mới hoàn toàn trống trơn, bạn chỉ cần điền **Personal Access Token (PAT)** của Supabase và nhấn nút **"⚡ Khởi tạo cấu trúc bảng (Run Migrations)"**. Extension sẽ tự động gửi lệnh DDL để khởi tạo 3 bảng (`submissions`, `care_notes`, `exercises`) cùng các chính sách bảo mật RLS và chỉ mục mà không cần bạn phải thao tác thủ công trên SQL Editor của Supabase.

### 4. 📞 Quản Lý Chăm Sóc Học Viên (Student Care)
* **Tự động cào dữ liệu chăm sóc:** Đọc thông tin Mã SV, Tên học viên từ giao diện chăm sóc sinh viên của LMS (`/class/*/take-care`).
* **Ghi chú cô lập theo ngày (Student Care Isolation):** Lưu trữ ghi chú chăm sóc sinh viên đồng bộ hóa đám mây thông qua bảng `care_notes` trên Supabase Cloud. Cơ chế ghi chú được cô lập theo môn học và ngày học hiện hành, tránh tình trạng ghi đè hoặc lẫn lộn dữ liệu giữa các ngày khác nhau.

### 5. 🎨 Giao diện & Trải nghiệm (UI/UX & Integration)
* **Tự Động Điền Điểm 2 Chiều (Bidirectional Sync):** Tự động điền điểm số và nhận xét ngắn gọn do AI chấm vào form nhập liệu trên trang web LMS ngay khi AI hoàn thành chấm bài. Tự động phát hiện chuyển đổi học viên trên trang web LMS (bằng URL thay đổi hoặc DOM cập nhật động) và chuyển đổi giao diện chấm điểm tương ứng trên popup extension trong thời gian thực.
* **Phím tắt mở nhanh toàn hệ thống:** Mở nhanh giao diện popup bằng phím tắt gợi ý mặc định là `Ctrl + Shift + Y` (trên macOS là `Cmd + Shift + Y`) để tránh xung đột với tính năng Read aloud mặc định của Microsoft Edge.
* **Loại bỏ tab "Chấm Đơn":** Giao diện popup được tinh giản, loại bỏ hoàn toàn tab Chấm Đơn để tập trung tối đa vào hiệu năng và quy trình Chấm Hàng Loạt tiện lợi.
* **Nút lối tắt toàn cầu (REduX Floating Widget):** Một nút bấm nổi nhỏ gọn mang chữ `REduX` hiển thị ở góc dưới bên phải tất cả các trang web giúp mở nhanh extension mà không cần sử dụng phím tắt, tối ưu hiệu năng để không tốn tài nguyên CPU khi lướt web thông thường.
* **Nhật ký hoạt động hệ thống (System Logger):** Console console-style tối màu hiển thị lịch sử logs theo màu sắc mức độ (Info, Success, Warning, Error), hỗ trợ tải logs về dưới dạng tệp nén `.zip` nhị phân siêu nhẹ (nén mức độ 9 bằng JSZip).

---

## 🛠️ Hướng Dẫn Cài Đặt (Nạp Tiện Ích Đã Build)

Để cài đặt extension REduX vào trình duyệt chính (Chrome / Edge / Opera / Brave...):
1. **Tải mã nguồn về máy** và giải nén (hoặc clone từ kho lưu trữ Git).
2. **Nạp folder build:**
   - Nếu bạn là **người sử dụng**: Hãy chọn folder `.output/chrome-mv3` có sẵn trong thư mục dự án.
   - Nếu bạn là **nhà phát triển**: Chạy các lệnh dưới đây để tự build:
     ```bash
     npm install
     npm run build
     ```
     Sau đó sản phẩm sẽ được tạo trong thư mục `.output/chrome-mv3`.
3. **Kích hoạt trên trình duyệt:**
   - Mở trình duyệt Chrome hoặc Microsoft Edge.
   - Truy cập trang quản lý tiện ích:
     * Chrome: `chrome://extensions/`
     * Edge: `edge://extensions/`
   - Bật nút **Developer mode (Chế độ dành cho nhà phát triển)** ở góc màn hình.
   - Bấm nút **Load unpacked (Tải tiện ích đã giải nén)**.
   - Chọn thư mục **`.output/chrome-mv3`** trong thư mục dự án.

---

## ⚙️ Hướng Dẫn Cấu Hinh Chi Tiết (Từng bước lấy Token & Key)

Nhấp vào biểu tượng **REduX** trên thanh công cụ trình duyệt hoặc nhấp vào nút nổi **REduX** ở góc dưới bên phải màn hình để mở giao diện extension, chuyển sang tab **⚙️ Cài Đặt** và thiết lập:

### 1. Cấu hình AI Provider & Khóa API (AI Key)
* **Nhà cung cấp AI:** Chọn mô hình AI bạn muốn sử dụng (Khuyên dùng: **Google Gemini** để có chi phí rẻ và hỗ trợ context dài).
* **API Key:** 
  - *Cách lấy khóa Gemini:* Truy cập [Google AI Studio](https://aistudio.google.com/), đăng nhập tài khoản Google và nhấp vào nút **Get API key** để tạo khóa miễn phí hoặc trả phí.
  - *Cách lấy khóa OpenAI:* Truy cập [OpenAI Platform API Keys](https://platform.openai.com/api-keys).
* **Tên Model:** Extension tích hợp dropdown select gợi ý nhanh các model phổ biến nhất hiện nay (như `gemini-2.5-flash`, `gemini-2.5-pro`, `gpt-4o-mini`, `deepseek-chat`, v.v.) và tự động ẩn/hiện ô nhập thủ công khi bạn chọn `"Khác (Nhập thủ công)..."`.
* **Tham số nhiệt độ:** Hệ thống tự động thiết lập `temperature: 0.0` để đảm bảo điểm số và báo cáo chấm ra có độ chính xác, tính nhất quán cao nhất.

### 2. Cấu hình GitHub Personal Access Token (PAT)
* **Lý do cần thiết:** Trình duyệt mặc định giới hạn chỉ cho phép tải tối đa 60 file/giờ từ GitHub API không xác thực. Để tránh bị lỗi `HTTP 403/429 Forbidden` khi chấm bài hàng loạt, bạn bắt buộc phải cấu hình GitHub PAT.
* **Cách lấy khóa GitHub PAT:**
  1. Đăng nhập tài khoản GitHub, truy cập: [Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens).
  2. Bấm **Generate new token (classic)**.
  3. Đặt tên mô tả (ví dụ: `REduX AutoScoring Token`), thiết lập ngày hết hạn (Expiration).
  4. Đánh dấu tích chọn quyền **`repo`** (để có thể đọc mã nguồn từ các kho lưu trữ private của học viên nếu có).
  5. Nhấp **Generate token** ở cuối trang, sao chép chuỗi ký tự nhận được (ví dụ `ghp_...`) và dán vào ô **GitHub Token** trong Cài đặt của Extension.

### 3. Cấu hình Supabase Cloud Sync & Auto Migrations (Khởi tạo CSDL tự động)
* **Lý do cần thiết:** Lưu trữ thông tin điểm số, nhận xét chấm bài, thông tin chăm sóc học viên để chia sẻ giữa các thiết bị hoặc chia sẻ cho giảng viên/trợ giảng khác cùng xem trực tuyến.
* **Cách lấy thông tin kết nối và chạy Migration:**
  1. Đăng nhập hoặc đăng ký tài khoản miễn phí tại [Supabase](https://supabase.com/).
  2. Nhấp **New project**, điền tên dự án và mật khẩu cơ sở dữ liệu.
  3. Sau khi dự án được khởi tạo xong, truy cập **Project Settings > API**:
     - Sao chép **Project URL** dán vào ô `Supabase Project URL` trong Extension.
     - Sao chép **anon public key** dán vào ô `Supabase Anon Key` trong Extension.
  4. Truy cập trang cá nhân của bạn trên Supabase để tạo khóa quản trị **Personal Access Token (PAT)**:
     - Truy cập [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens).
     - Bấm **Generate new token**, đặt tên và tạo token. Sao chép token này dán vào ô **Supabase Personal Access Token (PAT)** trong Extension.
  5. Nhìn xuống khu vực **Trạng thái CSDL trên Server**, bạn sẽ thấy thông báo đỏ `🔴 Chưa được khởi tạo`. 
  6. Nhấn nút **⚡ Khởi tạo cấu trúc bảng (Run Migrations)**. Extension sẽ tự động gửi lệnh và tạo đầy đủ 3 bảng dữ liệu (`submissions`, `care_notes`, `exercises`) và phân quyền RLS trên dự án Supabase của bạn. Khi biểu tượng chuyển sang màu xanh `🟢 Đã khởi tạo đầy đủ`, database của bạn đã sẵn sàng!
  7. *(Khuyên dùng bảo mật)*: Sau khi khởi tạo thành công CSDL, bạn có thể xóa chuỗi PAT khỏi ô cấu hình trong Extension để bảo mật. Extension vẫn đọc/ghi điểm bình thường bằng Anon Key.

---

## 📈 Hướng Dẫn Sử Dụng

### Bước 1: Quét Đề Bài & Rubric Chấm
1. Mở trang bài tập chi tiết trên LMS (trang hiển thị đề bài dành cho giáo viên).
2. Mở Extension REduX, chuyển sang tab **📚 Đề Bài**.
3. Extension sẽ tự động cào tiêu đề bài tập, nội dung và bóc tách tiêu chí Rubric. Nhấp các nút lưu lại vào cơ sở dữ liệu.

### Bước 2: Quét Danh Sách Lớp Học
1. Truy cập trang chấm bài của LMS (có dạng `.../homework-checking/...`).
2. Mở Extension REduX, chuyển sang tab **👥 Quản Lý Lớp Học**.
3. Nhấp nút **📥 Quét Danh Sách Lớp**. Dữ liệu học viên cùng trạng thái nộp bài tập sẽ được cào tự động và lưu trữ an toàn trong Local Storage.

### Bước 3: Chấm Hàng Loạt
1. Trong trang chấm bài LMS chứa danh sách các bài nộp link GitHub của sinh viên.
2. Mở Extension REduX, chuyển sang tab **⚡ Chấm Hàng Loạt**.
3. Nhấp **📥 Quét danh sách bài nộp**. Extension hiển thị danh sách các bài tập đã nộp.
4. Đánh dấu chọn các bài muốn chấm, khớp đề bài tương ứng và nhấn nút **⚡ Chấm Hàng Loạt**.
5. Theo dõi tiến trình chấm bài và quan sát điểm số hiển thị trực tiếp. Khi hoàn tất, hệ thống tự động điền điểm và nhận xét vào LMS. Bạn có thể nhấp vào điểm số của học viên trong tab **Quản Lý Lớp Học** để xem chi tiết nhận xét báo cáo và xuất file Excel kết quả.
