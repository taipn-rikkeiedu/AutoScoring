# 📋 CHANGELOG — AI GitHub Grader

Tất cả các thay đổi đáng chú ý của dự án sẽ được ghi lại trong file này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/),
và dự án tuân theo [Semantic Versioning](https://semver.org/lang/vi/).

---

## [v3.6.0] — 2026-07-07

### ✨ Tính năng mới & Tối ưu hóa
- **Tích hợp Tab Chăm Sóc SV mới:**
  - Quét dữ liệu sinh viên trực tiếp từ đường dẫn LMS chăm sóc học viên `/class/*/take-care`.
  - Cung cấp ô nhập ghi chú/thông tin liên hệ ngay cạnh từng học viên và tự động lưu trữ xuống bộ nhớ `chrome.storage.local`.
  - Xuất báo cáo danh sách chăm sóc lớp học định dạng Excel (.xlsx).

## [v3.5.9] — 2026-07-07

### ✨ Tính năng mới & Tối ưu hóa
- **Hỗ trợ chấm điểm float/thập phân:**
  - Nâng cấp bộ phân giải regex điểm số để nhận diện chính xác các thang điểm lẻ như `99.5` và `99,5` hoặc in đậm `**99.5**`.
- **Khắc phục lỗi nạp Extension do cache bytecode python:**
  - Di chuyển `api_server.py` ra ngoài thư mục extension để ngăn python sinh thư mục biên dịch bytecode `__pycache__` bắt đầu bằng dấu gạch dưới bị Chrome cấm.
- **Tùy biến bộ lọc loại trừ (.graderignore) và UI:**
  - Bổ sung cấu hình loại trừ cho `venv`, `Scripts`, `Lib` độc lập và đồng bộ. Dọn dẹp checkbox `__pycache__` thừa trong cấu hình.
- **Tránh trùng lặp / sai sót prompt cào dữ liệu:**
  - Tự động nhận diện tiêu đề bài học từ Header/Menu cấp trang làm bài tập đại diện khi bảng không chứa cột bài tập, ngăn chặn việc nhận diện sai tên học viên làm tên bài tập để so khớp đề bài mẫu.
  - Bỏ qua việc tự động so khớp mẫu đối với các từ khóa chung chung như "Bài tập Github".

## [v3.5.8] — 2026-07-06

### ✨ Tính năng mới & Tối ưu hóa
- **Di chuyển sang Chrome Side Panel:**
  - Cấu hình chạy Extension dưới dạng Chrome Side Panel luôn mở và duy trì trạng thái khi chuyển tab mới.
  - Cải tiến giao diện thích ứng (Responsive CSS), cho phép cuộn ngang thanh tab điều hướng và các bảng dữ liệu trên màn hình hẹp của Side Panel.
- **Tô màu trạng thái trong Quản Lý Lớp Học:**
  - Học viên có trạng thái "Đang chờ kiểm tra" được highlight màu vàng nhạt (`row-pending`).
  - Học viên có trạng thái "Chưa hoàn thành" được highlight màu đỏ nhạt (`row-not-completed`).
- **Tự động cuộn trang LMS đến học viên:**
  - Nhấp chọn Mã sinh viên hoặc Tên học viên trên Extension sẽ tự động gửi thông điệp điều khiển cuộn trang LMS đến đúng hàng của học viên đó và nhấp nháy sáng nền màu vàng trong 1.5 giây.
- **Tối giản xuất Excel báo cáo lớp học:**
  - Loại bỏ cột Nhận xét AI ra khỏi file Excel để dữ liệu điểm số và các link liên kết (GitHub, LMS) hiển thị gọn gàng hơn.

## [v3.5.7] — 2026-07-06

### ✨ Tính năng mới & Tối ưu hóa
- **Hệ thống Toast Notification chuyên nghiệp:**
  - Thay thế toàn bộ các thông báo dạng `alert()` mặc định của trình duyệt bằng hệ thống thông báo Toast hiển thị trực quan ở góc trên bên phải của popup.
  - Hỗ trợ các trạng thái: Thành công (xanh lục), Lỗi (đỏ), Cảnh báo (vàng/cam) và Thông tin (xanh lam), tự động ẩn sau 3 giây hoặc tắt bằng dấu `×`.
- **Tối ưu hóa bộ cào đề bài LMS Rikkei Education:**
  - Hỗ trợ cào đa frame (`allFrames: true`) để chọc vào các iframe khác nguồn (cross-origin) và chọn lọc nội dung đề bài đầy đủ nhất.
  - Sửa lỗi không nhận diện lớp học chứa khoảng trắng trong tên mã lớp (ví dụ: `[RA JV240311]`).
  - Mở rộng regex nhận diện phiên học (Session) với các từ khóa tiếng Việt như `Bài`, `Lab`, `Tuần`, `Ngày`, `Chuyên đề`.
  - Cải tiến loại bỏ các tag chỉnh sửa/xóa/icon trong cây sơ đồ trước khi trích xuất tên bài tập.
  - Thêm phương pháp cào theo ngữ nghĩa (semantic search) dựa trên từ khóa tiếng Việt (`Mục tiêu`, `Yêu cầu`, `Bối cảnh`, `Dữ liệu mẫu`) làm cơ chế dự phòng khi cấu trúc lớp CSS thay đổi.

## [v3.5.6] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Tích hợp màu trạng thái kết nối trực tiếp vào tag Phiên bản:**
  - Loại bỏ hoàn toàn Badge chỉ báo kết nối AI riêng lẻ trong Header.
  - Tích hợp trực tiếp màu sắc chỉ thị trạng thái AI vào nút thẻ hiển thị phiên bản (ví dụ: `v3.5.6` màu xanh lục khi sẵn sàng và màu đỏ khi chưa cấu hình).
  - Giúp tinh giản thanh Header tối đa, làm nổi bật logo REduX một cách tinh tế.

## [v3.5.5] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Tích hợp Logo REduX và Giao diện Header mới:**
  - Tích hợp ảnh logo REduX (`logo.png`) vào thanh Header của ứng dụng, thay thế cho logo text cũ.
  - Sử dụng Python cắt và căn lề một phần logo (chứa biểu tượng X mạch điện tử và bộ não) làm icon vuông `icon.png` (kích thước 128x128) đại diện cho Extension trên thanh trình duyệt.
  - Chuyển giao diện Header sang màu trắng tối giản, tinh tế để tôn vinh màu sắc và đường nét của logo REduX.
  - Tối ưu hóa độ tương phản cao cho các badge trạng thái AI trên nền trắng mới.

## [v3.5.4] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Tinh giản Connection Status Badge trong Header:**
  - Di chuyển Connection Status Banner cũ từ bên dưới Header thành một Badge nhỏ gọn (`connection-banner`) đặt ngay cạnh version-tag ở góc phải của Header.
  - Sử dụng phối màu bán trong suốt (semi-transparent green/red) hiện đại và chuyên nghiệp hơn.
  - Rút ngắn các đoạn văn bản hiển thị trạng thái của AI (ví dụ: `AI: Sẵn sàng`, `AI: Chưa cấu hình`, `AI: Đang check...`) để tối ưu hóa không gian hiển thị.

## [v3.5.3] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Đổi tên ứng dụng thành REduX:**
  - Cập nhật thương hiệu và đổi tên tiện ích từ "AI GitHub Grader Helper" thành **REduX** trong manifest.json, popup.html và thanh tiêu đề ứng dụng.

## [v3.5.2] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Cải tiến Bộ lọc loại trừ (.graderignore) dạng danh sách Checkbox cụ thể:**
  - Thay thế ô nhập văn bản tự gõ bằng danh sách 14 checkbox của từng thư mục/tệp cụ thể cần loại bỏ (ví dụ: `build/`, `dist/`, `.vscode/`, `package-lock.json`...).
  - Giúp giảng viên lựa chọn trực quan, tránh lỗi gõ sai chính tả.
  - Bổ sung nút tiện ích **Chọn tất cả** và **Bỏ chọn tất cả** để thao tác nhanh hơn.
  - Tự động hóa hoàn toàn phần loại trừ cứng đối với các thư mục cốt lõi (`node_modules/`, `.venv/`, `.git/`) mà không cần cấu hình.

## [v3.5.1] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Cấu hình Bộ lọc loại trừ file (.graderignore) tùy chỉnh:**
  - Bổ sung trường cấu hình **📁 Bộ lọc loại trừ file (.graderignore)** trong tab **Cài Đặt**.
  - Cho phép giảng viên nhập danh sách các file/thư mục cần bỏ qua khi tải code (tách biệt bằng dấu phẩy hoặc dòng mới).
  - Tự động nhận diện và phân tích cấu hình để đưa vào danh sách lọc thích hợp.
  - Các thư mục nặng/phụ thuộc hệ thống cơ bản như `node_modules`, `.venv`, `.vscode`, `.idea`, `.git`... vẫn luôn được tự động loại trừ mặc định.
  - Tệp `README.md` mặc định được bảo lưu không loại trừ để đảm bảo AI nắm bắt được chỉ dẫn làm bài của học viên.

## [v3.5.0] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Tách Tab Quản Lý Lớp Học độc lập:**
  - Tách rời hoàn toàn phần Quản lý Danh sách lớp thành một tab riêng biệt mang tên **Quản Lý Lớp Học** trên menu điều hướng chính của Extension popup.
  - Loại bỏ hoàn toàn thanh chọn chế độ (mode selector buttons) cũ giúp giao diện Chấm Hàng Loạt thông thoáng hơn.
  - Tích hợp sự kiện tự động kích hoạt quét trang và nạp danh sách lớp khi người dùng click chuyển tab.
- **Tích hợp xuất file Excel (.xlsx) chính chủ:**
  - Loại bỏ định dạng xuất file CSV cũ dễ gây vỡ font Unicode tiếng Việt.
  - Tải về và tích hợp thư viện **SheetJS (xlsx.full.min.js)** giúp tạo và tải xuống file Excel (.xlsx) trực tiếp từ bộ nhớ cục bộ phía client.
  - Tự động định cấu hình độ rộng cho các cột dữ liệu bao gồm: Mã SV, Họ và Tên, Trạng thái LMS, Số bài đã nộp, Số bài hoàn thành, Điểm số AI, Link GitHub, Link LMS và Nhận xét chi tiết của AI.

## [v3.4.3] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Đổi tên cột Điểm số:**
  - Cập nhật tên tiêu đề cột hiển thị từ "Bài tập / Điểm" thành **"Bài hoàn thành / Đã nộp"** trong bảng quản lý danh sách lớp học của Extension để chuẩn xác hơn theo phản hồi của giảng viên.

## [v3.4.2] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Đồng bộ Tỉ lệ hoàn thành bài tập:**
  - Tích hợp quét cột **Số bài đã nộp** và **Số bài hoàn thành** từ trang danh sách lớp học của Rikkei LMS.
  - Hiển thị tỉ lệ này dạng badge màu trong cột **Bài tập / Điểm** (màu xanh lá cây nếu hoàn thành tất cả, màu vàng/cam nếu hoàn thành một phần).
  - Tự động hiển thị điểm AI nhỏ gọn bên dưới badge tỉ lệ nếu học viên đã được chấm bài, giữ nguyên cơ chế click để mở modal nhận xét.
- **Nâng cấp thống kê sĩ số Đã chấm:**
  - Thay đổi cách tính "Đã chấm" trong Banner thống kê để tính cả những sinh viên đã có trạng thái **Hoàn thành** hoặc **Chưa hoàn thành** trên LMS, giúp bao quát tiến độ chấm bài thực tế tốt hơn.

## [v3.4.1] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Đồng bộ cột Trạng thái LMS:**
  - Phân tách và quét cột Trạng thái riêng biệt khỏi cột Hành động trên Rikkei LMS.
  - Tự động nhận diện và hiển thị Trạng thái LMS của học sinh dưới dạng badge trực quan.
  - Tích hợp style badge cảnh báo màu cam/vàng (`warning`) dành riêng cho trạng thái "Đang chờ kiểm tra" / "CHỜ KIỂM TRA".
- **Thống kê tiến độ lớp học:**
  - Bổ sung bảng thông tin tổng hợp ở đầu danh sách lớp hiển thị: Sĩ số lớp, số lượng hoàn thành, chưa hoàn thành, chờ kiểm tra và số bài đã được AI chấm.
- **Tối ưu hóa bố cục bảng:**
  - Thay thế cột URL bài nộp cồng kềnh bằng cột Trạng thái LMS.
  - Chuyển đổi tên học viên thành liên kết mở nhanh đến trang nộp bài chi tiết.

## [v3.4.0] — 2026-07-04

### ✨ Tính năng mới & Tối ưu hóa
- **Tối ưu hóa đọc file GitHub & Directory Tree Map:**
  - Tự động phân tích và tạo Sơ đồ cây thư mục dạng text chèn vào đầu mã nguồn gửi lên AI giúp AI hiểu cấu trúc dự án tốt hơn.
  - Trả về danh sách tệp tin (`fileList`) và số lượng file (`totalFiles`).
  - Hiển thị danh sách file chi tiết dạng collapsible list trong Drawer của từng học viên ở tab Chấm Hàng Loạt và trong Results Box ở tab Chấm Đơn.
- **Tối ưu hóa suy luận AI (Chain-of-Thought & XML Score Tagging):**
  - Cấu trúc lại Prompt mặc định yêu cầu AI suy luận từng bước (Chain-of-Thought) chấm điểm theo tiêu chí cụ thể trước khi tính tổng điểm.
  - Chuẩn hóa điểm số bọc trong thẻ `<score>...</score>` ở cuối nhận xét giúp hàm `parseScore` trích xuất điểm chính xác 100%.
- **Đồng bộ học viên Rikkei LMS thông minh (Click Transition):**
  - Thêm Content Script `content.js` để theo dõi và lưu trữ trạng thái sinh viên khi click nút "Chi tiết" tại trang danh sách lớp `/homework-checking`.
  - Tự động nhận diện sinh viên đang chấm tại trang `/detailLinkGithub` dựa trên sự kiện click chuột chuyển tiếp và hiển thị banner thông tin sinh viên tương ứng một cách chính xác 100% (bảo mật tuyệt đối, không gửi bất kỳ request nào lên server).

## [v3.3.0] — 2026-07-04

### ✨ Tính năng mới
- **Liên kết danh sách sinh viên lớp học đa trang (Cross-Page Student Mapping):**
  - Tích hợp 2 chế độ quét trong tab Chấm Hàng Loạt: *Chấm Hàng Loạt (GitHub)* và *Quản Lý Danh Sách Lớp*.
  - Cho phép quét và lưu thông tin định danh học viên (Mã SV, Họ tên, Link chấm bài) từ Trang danh sách lớp (Trang 1).
  - Tự động nhận diện học viên tương ứng khi giảng viên đang mở trang chi tiết bài nộp của học viên đó (Trang 2) dựa trên đường dẫn URL chấm bài. Hiển thị banner chỉ dẫn: `👤 Đang chấm cho học viên: [Name] - [ID]`.
  - Tự động cập nhật điểm số và nội dung nhận xét chi tiết của học viên tương ứng vào bộ nhớ cục bộ `chrome.storage.local` ngay sau khi AI chấm xong ở chế độ Chấm Đơn.
- **Xuất báo cáo bảng điểm CSV chuẩn Excel (Excel-Compatible CSV Export):**
  - Tích hợp nút bấm **Xuất Báo Cáo CSV** để xuất toàn bộ danh sách lớp học ra file CSV với đầy đủ cột thông tin: `Mã SV`, `Họ Tên`, `Tên Bài Tập`, `Link GitHub`, `Điểm Số`, `Nhận Xét AI`.
  - Hỗ trợ ký tự Unicode UTF-8 BOM (`\ufeff`) giúp mở file trực tiếp bằng Microsoft Excel hiển thị đúng phông chữ Tiếng Việt không bị lỗi font.

## [v3.2.2] — 2026-07-04

### ✨ Tính năng mới & Sửa lỗi
- **Tự động tách Tiêu chí chấm điểm khi cào Đề bài LMS (LMS Criteria Auto-extraction):**
  - Bổ sung bộ phân tích biểu thức chính quy để phát hiện nếu trong phần nội dung đề bài LMS nạp về có phần tiêu chí viết sẵn (dạng `Tiêu chí chấm bài (AI)::`, `Tiêu chí đánh giá (AI):`, v.v.).
  - Tự động tách phần tiêu chí này ra khỏi đề bài chính, làm sạch đề bài và điền tự động vào ô nhập liệu **Tiêu chí chấm điểm (AI Rubric)** trong modal xác nhận. Nếu không tìm thấy, hệ thống sẽ sử dụng tiêu chí mặc định ban đầu.

---

## [v3.2.1] — 2026-07-04

### 🐛 Sửa lỗi
- **Cấu hình Mẫu System Prompt Ngắn gọn & Đơn giản hóa (Concise Default System Prompt):**
  - Chuyển đổi định dạng prompt mặc định thành dạng đánh giá ngắn gọn, tập trung thẳng vào chi tiết lỗi sai: chỉ rõ sai ở file nào, dòng nào, lý do tại sao sai và đề xuất cách sửa chi tiết kèm theo điểm số `/100`.
  - Tối ưu hóa hàm trích xuất nhận xét từ AI (`extractComment`) để hỗ trợ đồng thời cả các tiêu đề báo cáo dạng cũ lẫn dạng mới (`## ĐÁNH GIÁ & NHẬN XÉT CHI TIẾT`).

---

## [v3.2.0] — 2026-07-04

### ✨ Tính năng mới
- **Cấu hình tùy chọn Mẫu System Prompt Chấm Điểm (Custom System Prompt Template):**
  - Tích hợp khung chỉnh sửa System Prompt trực tiếp trong tab **Cài Đặt (Settings)**, hỗ trợ tối đa khả năng tùy biến luật chấm điểm của AI.
  - Hỗ trợ các biến đại diện thông minh: `{{assignment}}` (Đề bài), `{{criteria}}` (Tiêu chí chấm), và `{{code}}` (Mã nguồn học viên đã nén).
  - Thêm nút **Khôi phục mặc định (Reset to Default)** giúp nhanh chóng quay lại prompt mẫu ban đầu bất cứ lúc nào.
  - Đồng bộ lưu trữ và nạp tự động qua `chrome.storage.local`.

---

## [v3.1.7] — 2026-07-04

### 🐛 Sửa lỗi
- **Loại bỏ chữ nút bấm hành động khi cào tên Khóa học (Action Button Text Stripping):**
  - Khắc phục lỗi tên khóa học bị dính chữ nút bấm con (Ví dụ: `[IT-215] Phát triển dịch vụ Web với FastAPIThêm chương học`).
  - Cải tiến hàm cào bằng cách tạo bản sao DOM cục bộ (cloned element) và xóa sạch tất cả các phần tử con dạng nút bấm (`button`), liên kết (`a`), các input nhập liệu, hoặc các thẻ hành động trước khi đọc văn bản tiêu đề của chương học.

---

## [v3.1.6] — 2026-07-04

### 🐛 Sửa lỗi
- **Tối ưu hóa cào tên Khóa học (Chapter Scraper Code Match):**
  - Khắc phục lỗi cào thừa ký tự hoặc nhận diện sai tên Chương/Khóa học do các tiêu đề khác xuất hiện trước trong DOM.
  - Thiết lập bộ lọc Regex ưu tiên tìm kiếm các phần tử chứa mã lớp học trong ngoặc vuông (dạng `[IT-215]`), đồng thời tự động trích xuất chuỗi ký tự bắt đầu từ dấu `[` để loại bỏ các nút điều hướng (mũi tên quay lại `←`) hoặc khoảng trắng thừa thãi.

---

## [v3.1.5] — 2026-07-04

### 🎨 Cải tiến & Tối ưu hóa UI/UX
- **Tối ưu hóa tiêu chí chấm điểm mặc định bám sát đề bài (AI Rubric Simplification):**
  - Cập nhật mẫu `DEFAULT_CRITERIA` sang phân bổ điểm tập trung: **70% cho việc hoàn thành đúng và đủ các chức năng nghiệp vụ** được mô tả trong đề bài và **30% cho chất lượng tổ chức mã nguồn**.
  - Loại bỏ các tiêu chuẩn nộp bài chung hoặc các điều kiện bảo mật/xác thực không liên quan (như JWT, Validate, v.v.), giúp AI chấm điểm bám sát đề bài thực tế mà giảng viên đã tải lên.

---

## [v3.1.4] — 2026-07-04

### ⚡ Tối ưu hóa hiệu suất
- **Tối ưu hóa tốc độ tải và giảm giật lag giao diện (Performance Optimization):**
  - **Khử trùng lặp chuỗi Dropdown (Select Caching):** Tránh việc duyệt lặp lại toàn bộ ngân hàng bài tập để dựng chuỗi HTML Dropdown cho từng dòng học sinh. Danh sách lựa chọn được lưu đệm (cached) một lần duy nhất và tái sử dụng cho tất cả các dòng, gán giá trị chọn trực tiếp bằng JS.
  - **Giảm số lần vẽ lại trang (DocumentFragment Batching):** Gom tất cả các dòng học sinh và khung chi tiết ẩn vào một DocumentFragment để đưa vào DOM trong một lần thao tác duy nhất. Cải tiến này giúp loại bỏ hiện tượng Layout Thrashing (trình duyệt tính toán lại giao diện liên tục), triệt tiêu hoàn toàn dấu hiệu giật lag khi quét trang chứa nhiều bài nộp.

---

## [v3.1.3] — 2026-07-04

### 🐛 Sửa lỗi
- **Cấu hình tùy chọn cho Tiêu chí chấm điểm (Optional Grading Criteria):**
  - Khắc phục lỗi đổ vỡ tiến trình chấm bài (cả chấm đơn và chấm hàng loạt) khi gặp các bài tập không khai báo hoặc để trống phần tiêu chí chấm (rubric).
  - Tách hàm dữ liệu dùng chung `DEFAULT_CRITERIA` sang `utils.js` để làm giá trị fallback mặc định. Nếu phần tiêu chí chấm trống, AI sẽ tự động sử dụng tiêu chí mặc định thay vì báo lỗi dừng chương trình.

---

## [v3.1.2] — 2026-07-04

### 🐛 Sửa lỗi
- **Sửa lỗi nhận diện sai thư mục Session khi cào đề bài LMS (LMS Session Scraper Bug):**
  - Khắc phục triệt để lỗi thuật toán cào DOM luôn tự động nhận diện tất cả bài tập thuộc về "Session 01" (do việc quét DOM đi lên các thẻ cha quá rộng và tìm thấy thẻ Session đầu tiên ở đỉnh danh sách bên trái).
  - Triển khai thuật toán dò ngược document order từ bài tập đang chọn bôi xanh ngược lên trên để định vị chính xác header `Session X` / `Chương X` gần nhất, đảm bảo phân loại bài tập đúng thư mục tương ứng.

---

## [v3.1.1] — 2026-07-04

### 🐛 Sửa lỗi
- **Sửa lỗi tràn ô tiêu chí chấm điểm và đề bài (UI Overflow Bug):**
  - Khắc phục lỗi tràn cửa sổ bằng cách cấu hình thuộc tính cuộn độc lập `overflow-y: auto` cho từng tab và tắt thanh cuộn kép ở `content-container`.
  - Giảm nhẹ chiều cao textarea của đề bài/tiêu chí xuống `95px` để vừa vặn hoàn hảo trong tầm nhìn popup.
  - Sửa lỗi tràn chiều cao của biểu mẫu modal xác nhận cào LMS bằng cách cho phép container modal tự động điều chỉnh độ cao (`height: auto`) và tự cuộn nội dung bên trong khi vượt kích cỡ màn hình.

---

## [v3.1.0] — 2026-07-04

### ✨ Tính năng mới
- **Phân tách Tab "Quản lý Đề Bài" độc lập:** 
  - Tạo bộ điều khiển mới `exercisesTab.js` quản lý giao diện, sự kiện cào LMS, xem và lưu trữ đề bài độc lập với tab Chấm Đơn.
  - Hỗ trợ nút **Xóa đề** để loại bỏ bài tập khỏi ngân hàng bài tập (được lưu vào `chrome.storage.local`).
  - Tự động phát sự kiện `onLibraryChanged` để đồng bộ làm mới danh sách bài tập ở các Tab Chấm Đơn & Chấm Hàng Loạt.
- **Tách tệp thiết kế CSS:**
  - Di chuyển toàn bộ mã CSS hơn 600 dòng từ `popup.html` sang tệp stylesheet độc lập `popup.css`, giúp mã HTML gọn gàng và dễ bảo trì.

### 🎨 Cải tiến & Tối ưu hóa UI/UX
- **Chống tràn dữ liệu (Textarea Overflow Handling):**
  - Giới hạn chiều cao (`max-height: 145px`) cho các khung nhập liệu Đề bài (Prompt) và Tiêu chí (AI Rubric).
  - Áp dụng thuộc tính cuộn dọc độc lập `overflow-y: auto` kèm thanh cuộn tùy chỉnh siêu mỏng (`5px`) màu xám nhạt, đảm bảo nội dung đề bài dài không phá vỡ bố cục giao diện của popup.

---

## [v3.0.0] — 2026-07-04

### ✨ Tính năng mới
- **Kiến trúc Serverless & Chạy Phía Client hoàn toàn:**
  - Chuyển đổi Extension từ việc phụ thuộc vào Python backend thành công cụ độc lập, kết nối trực tiếp với GitHub API và các nhà cung cấp AI (Gemini, DeepSeek, OpenRouter, Ollama) trực tiếp từ trình duyệt.
  - Tích hợp dịch vụ `githubService.js` giải nén file ZIP code bằng thư viện `jszip.min.js` phía client.
  - Tích hợp dịch vụ `aiService.js` gửi API trực tiếp và hiển thị báo cáo Markdown qua `marked.min.js`.
- **Tái cấu trúc Modular hóa (Tab Controllers):**
  - Chia nhỏ mã nguồn UI phình to thành các module quản lý Tab riêng biệt dưới thư mục `controllers/`: `settingsTab.js`, `singleGraderTab.js`, `autoGraderTab.js`.
  - Kết nối chia sẻ trạng thái thông qua đối tượng `context` tập trung ở `popup.js`.
- **Tích hợp Rikkei LMS Scraper & Editor:**
  - Cho phép người dùng chỉnh sửa trực tiếp nội dung đề bài/tiêu chí đánh giá của bài tập đã chọn.
  - Hỗ trợ nút **Cào đề bài từ LMS** kích hoạt tệp `lmsScraper.js` để tự động thu thập thông tin đề bài từ cây cấu trúc và nội dung chi tiết trên Rikkei LMS, đưa vào modal xác nhận lưu trữ.

---

## [v2.8.1] — 2026-06-29

### 🐛 Sửa lỗi
- **Sửa lỗi AttributeError trên Streamlit Cloud:**
  - Sử dụng hàm `getattr` để nạp an toàn các thuộc tính cấu hình OpenRouter mới từ lớp Settings.
  - Ngăn ngừa lỗi đổ vỡ ứng dụng do cơ chế lưu bộ nhớ đệm (module caching) của Streamlit Cloud không tự động cập nhật lại các tệp cấu hình phụ (`config/settings.py`).

---

## [v2.8.0] — 2026-06-29

### ✨ Tính năng mới
- **Tích hợp nhà cung cấp OpenRouter (qwen/qwen3-coder:free):**
  - Thêm OpenRouter thành một Provider chính thức với danh sách model lập trình miễn phí khuyên dùng: `qwen/qwen3-coder:free`, `qwen/qwen-2.5-coder-32b-instruct:free`, `deepseek/deepseek-r1:free`, `openrouter/free`.
  - Quản lý API Key độc lập cho OpenRouter trong `config.json`.
- **Hỗ trợ tối ưu hóa và làm rõ cơ chế Streamlit Cloud:**
  - Viết tài liệu giải thích rõ lý do 🔄 ĐỒNG BỘ CỤC BỘ (Local Sync) bị giới hạn trên Streamlit Cloud do rào cản bảo mật (không thể đọc ổ `C:/` cục bộ từ container đám mây).
  - Đưa ra giải pháp tối ưu sử dụng **Streamlit Secrets** trực tiếp trên dashboard và cơ chế Sao lưu/Khôi phục thủ công để quản lý cấu hình và đề bài.

---

## [v2.7.0] — 2026-06-29

### ✨ Tính năng mới
- **Lưu trữ API Key độc lập từng AI Provider:**
  - Tách cấu trúc lưu trữ của `config.json` để giữ các khóa API, model name, và URL riêng biệt (`gemini_api_key`, `deepseek_api_key`, `custom_api_key`, v.v.).
  - Giúp người dùng chuyển đổi qua lại giữa các nhà cung cấp mà không bị mất cấu hình hay API Key của nhau.
  - Tương thích ngược tự động với các cấu hình phiên bản cũ.

---

## [v2.6.0] — 2026-06-29

### ✨ Tính năng mới
- **Tích hợp DeepSeek API:** Bổ sung nhà cung cấp AI DeepSeek (mô hình `deepseek-chat`) sử dụng cơ chế OpenAI-compatible. Chỉ hiển thị ô nhập API Key trên giao diện để giữ giao diện tối giản và tinh gọn tối đa.

### 🎨 Cải tiến & Tối ưu hóa UI
- **Tối giản hóa giao diện (UI Minification):**
  - Rút ngắn/loại bỏ các tiêu đề phụ, chú thích, hướng dẫn dài dòng trên toàn giao diện.
  - Thu gọn kích thước Banner Header chính và tinh giản Sidebar.
  - Tối ưu hóa nhãn các nút bấm và hộp điều khiển (`Chấm điểm`, `Thư viện mẫu đề bài`, `Xóa cache`, v.v.).

---

## [v2.5.1] — 2026-06-29

### ✨ Tính năng mới
- **Cấu hình GitHub Token trên UI (Streamlit Cloud Optimization):**
  - Cho phép người dùng nhập GitHub Personal Access Token trực tiếp trên tab Cấu hình (Settings).
  - Tránh lỗi giới hạn lượt gọi (Rate Limit 403) từ GitHub API khi deploy trên Streamlit Cloud (nơi chia sẻ IP chung giữa nhiều ứng dụng).

---

## [v2.5.0] — 2026-06-29

### ✨ Tính năng mới
- **Đồng bộ tự động dữ liệu Local (Local Filesystem Auto-Sync):**
  - **Tự động đọc/ghi cấu hình:** Đồng bộ `config.json` và `templates.json` hai chiều giữa ổ đĩa và app session khi khởi chạy.
  - **Môi trường an toàn:** Tự động phát hiện môi trường chạy (Local Windows ↔ Streamlit Cloud) để kích hoạt đồng bộ hoặc fallback an toàn.
  - **Trạng thái đồng bộ:** Thêm card thông tin chi tiết về đường dẫn file và trạng thái đồng bộ tại Sidebar.
  - **Lưu trữ cấu hình:** Ghi ngược cấu hình và thư viện bài tập ngay khi người dùng thay đổi trực tiếp trên UI.

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
