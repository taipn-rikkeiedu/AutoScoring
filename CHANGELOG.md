# Changelog - REduX AutoScoring Extension

Tất cả các thay đổi của tiện ích mở rộng **REduX AutoScoring Extension** được ghi nhận tại đây.

---

## [5.6.0] - 2026-10-15

### 🚀 Tính năng mới
- **Biểu đồ thống kê trong Giám sát học tập**: nút chuyển **Danh sách | Biểu đồ** cạnh ô chọn lớp / môn.
  - **Mức rủi ro**: thanh tỉ lệ Báo động / Cảnh báo / Sắp vượt ngưỡng / Bình thường.
  - **Phân bố** nghỉ học, thiếu bài tập, chậm E-learning, điểm Hackathon và điểm thi cuối môn theo khoảng; các mốc lấy đúng ngưỡng đang cài đặt.
  - Chỉ khoảng có vấn đề mới tô màu (vàng sắp vượt → cam cảnh báo → đỏ báo động, đã kiểm tra phân biệt được cả với người mù màu); mỗi cột có số SV và tên khoảng.
  - **Bấm vào một cột / một đoạn** để mở danh sách đúng các sinh viên đó.

### ✨ Cải thiện
- Danh sách gọn hơn: tổng quan lớp và nút AI tổng quan chuyển sang chế độ Biểu đồ; nhãn Báo động đỏ đậm nổi nhất, Cảnh báo cam, Sắp vượt vàng — cùng bộ màu với biểu đồ.
- Thư viện biểu đồ chỉ tải khi mở chế độ Biểu đồ, không làm chậm lúc mở extension.

---

## [5.5.0] - 2026-10-15

### 🚀 Tính năng mới
- **Gộp "Giám sát học tập" và "Phân tích BTVN & điểm thi" thành một tab Giám sát học tập**, chọn được nhiều lớp cùng lúc.
  - **Mức Báo động / Cảnh báo / Sắp vượt ngưỡng** theo ngưỡng từng chỉ số (chỉnh được): cảnh báo khi nghỉ học hoặc thiếu bài tập từ 10%, chậm E-learning 1 bài, có bài thi dưới 50; báo động khi nghỉ học hoặc thiếu bài tập trên 20%, chậm E-learning từ 2 bài, vắng thi hoặc có từ 2 lỗi cảnh báo; sắp vượt ngưỡng khi nghỉ học / thiếu bài tập 7–10% hoặc bài thi 50–55 điểm.
  - Sinh viên báo động hiển thị đầu danh sách. Mỗi dòng chỉ có tên, mức và các lỗi chính; bấm vào để xem đầy đủ chỉ số, MSSV, email, gợi ý hành động và dấu hiệu nghi vấn.
  - **Bộ lọc thông minh**: Báo động, Cảnh báo, Sắp vượt ngưỡng và "Lọc thêm" theo từng vấn đề (nghỉ học, thiếu bài tập, chậm E-learning, điểm thi thấp, vắng thi, nghi vấn BTVN, trùng link, danh sách rà soát); chọn nhiều bộ lọc thì hiện sinh viên khớp bất kỳ bộ lọc nào.
  - **Tổng quan lớp** tự tính (vấn đề phổ biến nhất, nghỉ học / thiếu bài tập trung bình) và **gợi ý hành động** cho từng sinh viên.
  - **AI tổng quan lớp** và **AI nhận xét từng sinh viên** (bấm nút khi cần, dùng AI đã cấu hình trong Cài đặt).
  - Nghi vấn BTVN ↔ điểm thi và trùng link bài nộp là nhãn riêng, không tính vào mức báo động.

### ✨ Cải thiện
- Giao diện theo chuẩn Ant Design: chữ 14px, bảng vừa khung không cần cuộn ngang, nút chính đặt cạnh ô chọn lớp / môn.

### 🐛 Sửa lỗi
- Tên sinh viên hiện nhãn "ĐÌNH CHỈ" sai: đang đọc trạng thái hồ sơ chung thay vì trạng thái trong lớp. Đã bỏ nhãn này.

---

## [5.4.1] - 2026-10-15

### ✨ Cải thiện
- **Giám sát học tập** tô nền đỏ các ô vi phạm: nghỉ học từ 10%, thiếu bài tập từ 10%, chậm E-learning từ 1 bài.
- **Giám sát học tập** và **Phân tích BTVN & điểm thi** dùng được ở mọi trang, không cần đang mở QLĐT: extension tự tìm tab QLĐT ở bất kỳ cửa sổ nào và lưu lại phiên đăng nhập; khi phiên hết hạn sẽ báo đăng nhập lại.

---

## [5.4.0] - 2026-10-15

### ✨ Cải thiện
- **Giám sát học tập lấy dữ liệu qua API QLĐT** thay cho quét trang: chọn lớp + môn ngay trong extension (không cần mở đúng trang Thống kê học tập). Hiển thị tỷ lệ nghỉ học, tỷ lệ thiếu bài tập, số lần không chuẩn bị bài, điểm Hackathon / cuối môn tách riêng trắc nghiệm và tự luận, R-Points; bảng sắp xếp được theo từng cột.
- Bỏ các cột không có trong API (Auto R-Points, trạng thái chốt điểm, trạng thái E-learning / số bài chậm, điều kiện project) và bỏ lưu lịch sử các lượt quét.

### 🐛 Sửa lỗi
- **Phân tích BTVN & điểm thi**: SV không nộp bài thi bị tính 0 điểm và bị gắn "Nghi vấn cao". Nay ghi là **Vắng thi**, không tính vào điểm; vắng thi cuối môn thì xét theo điểm Hackathon.
- **Phân tích BTVN & điểm thi**: Chỉ số "Chuyên cần" thực ra là tỷ lệ nghỉ học — đã đổi tên thành "Nghỉ học".

---

## [5.3.0] - 2026-10-15

### 🚀 Tính năng mới
- **Phân tích BTVN & điểm thi** (mục mới trong nhóm "Quản lý LMS"): Gọi API Quản lý đào tạo bằng phiên đăng nhập của tab QLĐT đang mở để so sánh tỉ lệ nộp BTVN với điểm Hackathon / cuối môn, tìm sinh viên cần rà soát.
  - Chọn nhiều lớp cùng lúc và một môn học; điểm thi tính theo công thức của môn, ưu tiên điểm tự luận.
  - Gắn cờ **Nghi vấn cao** / **Cần rà soát** theo ngưỡng chỉnh được; thêm cờ khi trắc nghiệm cao hơn hẳn tự luận hoặc điểm AI bài tập cao mà điểm thi thấp.
  - Phát hiện **trùng link bài nộp** giữa các sinh viên (bài thi và bài tập), chuẩn hoá theo repo GitHub hoặc ID Google Docs.
  - **+ Điểm AI bài tập**: tải điểm AI hệ thống trung bình của từng sinh viên (1 request / sinh viên).
  - **Danh sách cần rà soát**: dán danh sách tên để đánh dấu, so khớp cả tên không dấu và báo tên không tìm thấy.
  - Lọc, tìm kiếm, sắp xếp; bấm vào một dòng để xem chi tiết điểm từng bài thi, nhận xét của giảng viên chấm, link bài làm, danh sách bài tập và gợi ý vấn đáp.
  - Xuất Excel theo bộ lọc hiện tại. Quy tắc gắn cờ, danh sách rà soát và lớp/môn đã chọn được lưu lại.

---

## [5.2.14] - 2026-10-06

### ✨ Cải thiện
- **Chấm hàng loạt lần lượt từng bài**: Giảm số bài chấm song song từ 3 xuống 1 (Chấm hàng loạt và Mini Project) để tránh vượt giới hạn token/phút của các nhà cung cấp AI có quota thấp như Groq.

---

## [5.2.13] - 2026-10-06

### 🐛 Sửa lỗi
- **Lỗi "The model `llama-3.3-70b-versatile` does not exist" dù đã chọn model Groq khác**: Khi model đã chọn bị giới hạn lưu lượng (rate limit), hệ thống tự động đổi sang danh sách model dự phòng cố định, trong đó có model Groq mà tài khoản không có quyền truy cập (và nhiều model đã ngừng hỗ trợ). Đã bỏ cơ chế tự đổi model ngầm, chỉ chờ và thử lại đúng model người dùng đã chọn.

---

## [5.2.12] - 2026-10-06

### ✨ Cải thiện
- **Rút gọn System Prompt nhận xét**: Nhận xét tối đa 3 câu, mỗi lỗi chỉ một câu ngắn gồm vị trí, lỗi gì và cách sửa; không mô tả lại phần đã làm đúng. Giữ kết luận chưa đạt ở cuối khi dưới 50% thang điểm, bài đạt không ghi kết luận. System Prompt tùy chỉnh cũ được tự động đặt lại về mặc định mới.

---

## [5.2.11] - 2026-10-06

### 🐛 Sửa lỗi
- **Chọn Groq nhưng danh sách model vẫn của Google**: Khi tải danh sách model của nhà cung cấp mới không có kết quả (chưa nhập API Key hoặc lỗi mạng), ứng dụng giữ lại danh sách của nhà cung cấp trước đó. Ngoài ra kết quả tải trễ của provider cũ có thể ghi đè danh sách của provider mới. Đã xóa danh sách ngay khi đổi provider và bỏ qua phản hồi của provider không còn được chọn.

---

## [5.2.10] - 2026-10-06

### ✨ Cải thiện
- **Tinh chỉnh System Prompt nhận xét**: Nhận xét ngắn gọn (3-4 câu) như giảng viên viết nhận xét, chỉ rõ sai ở đâu và sửa thế nào. Bỏ kết luận ĐẠT/CHƯA ĐẠT ở đầu; chỉ khi bài chưa đạt (dưới 50 điểm) mới thêm câu kết luận ở cuối (ví dụ: "Em làm chưa đủ yêu cầu nên bài làm chưa đạt."), bài đạt thì không ghi gì. System Prompt tùy chỉnh cũ được tự động đặt lại về mặc định mới.

---

## [5.2.9] - 2026-10-06

### 🐛 Sửa lỗi
- **Thang điểm & mức độ khắt khe không khớp giữa Cài đặt và Chấm hàng loạt**: Chấm bài đọc giá trị từ cấu hình đã lưu, trong khi các ô chọn dùng state riêng và lưu trễ 1,2 giây; đồng thời `gradingScale`/`strictnessLevel` không được nạp lại từ bộ nhớ khi mở tiện ích nên luôn rơi về mặc định. Đã lưu ngay khi đổi lựa chọn, nạp đúng khi khởi động và dùng chung một nguồn cấu hình cho mọi tab.
- **Hiển thị điểm ghi cứng "/100"**: Nhãn điểm, báo cáo sao chép và popup báo cáo (chấm đơn, hàng loạt, Mini Project) nay hiển thị theo thang điểm đã chọn; màu huy hiệu điểm tính theo tỷ lệ phần trăm thay vì ngưỡng 80/50 cố định.
- **Lỗi cú pháp regex trong tab Chấm đơn**: Sửa chuỗi escape đôi (`\/`) khiến `tsc` báo lỗi.

---

## [5.2.8] - 2026-10-06

### 🐛 Sửa lỗi
- **Lỗi dùng nhầm API Key khi đổi AI Provider**: Khi chuyển từ Google sang Groq (hoặc nhà cung cấp khác), ứng dụng vẫn dùng API Key của Google. Nguyên nhân: toàn bộ nhà cung cấp dùng chung một `aiApiKey`, và danh sách model luôn ưu tiên `googleApiKey`. Đã chuyển sang lưu API Key riêng theo từng nhà cung cấp (`aiApiKeys`), tự nạp đúng key khi đổi provider, tự động chuyển đổi key cũ cho người dùng hiện tại và bỏ việc ưu tiên `googleApiKey` khi tải danh sách model.

---

## [5.2.7] - 2026-10-05

### ✨ Cải thiện
- **Tinh chỉnh Prompt AI**: Yêu cầu AI tuyệt đối không sử dụng dấu backtick (\`) để bọc tên file, biến hoặc hàm khi nhận xét, giúp nội dung trả về mang tính tự nhiên, giống một con người hơn thay vì văn phong chuẩn Markdown.

---

## [5.2.6] - 2026-10-05

### ✨ Cải thiện
- **Tinh chỉnh Prompt AI (Chấm điểm khắt khe)**: Nâng cao mức độ khắt khe trong việc chấm bài. Bắt buộc nhận xét phải mở đầu bằng kết luận bài làm ĐẠT (>= 50 điểm) hoặc CHƯA ĐẠT (< 50 điểm), đồng thời yêu cầu AI phải chỉ rõ cụ thể phần nào đã thực hiện được và phần nào còn thiếu sót/sai logic so với đề bài.

---

## [5.2.5] - 2026-10-05

### ✨ Cải thiện
- **Tinh chỉnh Prompt AI**: Yêu cầu AI xưng hô "tôi" và gọi người nộp bài là "em", tuyệt đối không dùng các từ "bạn", "học viên" hay "sinh viên", giúp nhận xét sát với thực tế giảng đường hơn.

---

## [5.2.4] - 2026-10-05

### ✨ Cải thiện
- **Cải thiện Prompt AI**: Điều chỉnh System Prompt của AI, loại bỏ các từ ngữ khen ngợi, chuyển sang giọng điệu đánh giá khách quan, nghiêm túc chỉ tập trung vào việc liệt kê những phần đạt được và những điểm còn thiếu sót so với tiêu chí, phù hợp hơn với vai trò giảng viên chấm điểm thực tế.

---

## [5.2.3] - 2026-10-05

### ✨ Tính năng mới
- **Cải thiện Prompt AI**: Điều chỉnh System Prompt của AI để đóng vai một giảng viên thực thụ khi đưa ra nhận xét, giúp phản hồi mang tính sư phạm, chuyên nghiệp, tự nhiên và gần gũi với học viên hơn.

---

## [5.2.2] - 2026-10-04

### 🐛 Sửa lỗi
- **Lỗi không thể chọn AI Provider**: Khắc phục lỗi khi chọn nhà cung cấp AI trong Settings không có phản hồi do xung đột kiểu dữ liệu sự kiện (Event) của component Ant Design Select.

---

## [5.2.1] - 2026-10-04

### ✨ Tính năng mới
- **Trải nghiệm người dùng**: Bổ sung liên kết truy cập nhanh "Lấy API Key tại đây" ứng với từng nhà cung cấp AI trực tiếp trên màn hình Cài đặt, giúp thao tác tiện lợi hơn mà không cần tìm kiếm thủ công.

---

## [5.2.0] - 2026-10-04

### ✨ Tính năng mới
- **Thêm AI Provider**: Hỗ trợ Groq (Fast Llama, Mixtral) vào cấu hình AI trực tiếp từ Settings.

---

## [4.20.0] - 2026-09-20

### 🎨 Tối ưu Trải nghiệm người dùng (UI/UX)
- **Tối ưu Thanh Tiến trình (Nielsen 3.1 & 3.3)**: Thanh tiến trình khi chấm điểm tự động giờ đây có màu sắc phân biệt trạng thái (đang chạy: xanh, thành công: xanh ngọc, lỗi: đỏ) kèm theo hiệu ứng nhấp nháy (\`animate-pulse\`). Đặc biệt, đã bổ sung thêm nút "Hủy" cho phép người dùng dừng luồng chấm bài hàng loạt (Bulk Grading) bất kỳ lúc nào.
- **Thay thế hộp thoại xác nhận gốc (Nielsen 3.5)**: Hộp thoại \`window.confirm\` xấu xí, thô cứng của trình duyệt đã được thay thế bằng component \`ConfirmModal\` tùy chỉnh đồng bộ với giao diện hiện đại của hệ thống (áp dụng cho chức năng Xóa Nhật ký và Xóa Cache).
- **Tối ưu ComboBox (Định luật Hick 4.2)**: Ô chọn "Đề bài liên kết" trên màn hình chấm điểm đã được nâng cấp từ thẻ \`<select>\` cơ bản thành \`SearchableSelect\` (ComboBox) cho phép gõ từ khóa để tìm kiếm nhanh, giúp thao tác chọn đề mượt mà hơn khi danh sách quá dài.
- **Tăng diện tích tương tác (Định luật Fitts 4.1)**: Các nút bấm icon (QuickAccessBar, NavigationSidebar) được tăng kích thước vùng click (hitbox) bằng cách thêm padding, giúp thao tác nhấp chuột chính xác và dễ chịu hơn.
- **Đồng bộ màu sắc nút nguy hiểm (Gestalt 4.3)**: Đã thống nhất toàn bộ các nút chức năng mang tính chất phá hủy (như Xóa, Hủy) về một dải màu chuẩn \`rose-600\` để tăng tính đồng bộ.
- **Chuẩn hóa thông báo lỗi (Nielsen 3.9)**: Tái cấu trúc lại thông báo lỗi trả về từ hệ thống; thay thế những lỗi thô ráp mang tính kỹ thuật (\`err.message\`) bằng ngôn từ thân thiện, dễ hiểu, kèm theo chỉ dẫn cách khắc phục.
- **Nâng cấp Accessibility (WCAG 2.2)**: Bổ sung Focus Ring (\`focus:ring-2\`) rõ ràng hơn cho hầu hết các biểu tượng dạng nút, hỗ trợ tốt hơn cho việc thao tác bằng bàn phím.

---

## [4.19.0] - 2026-09-18

### ✨ Giám sát chỉ số học tập
- **Tab mới "Giám sát học tập"**: Quét snapshot bảng thống kê học tập từ trang `learning-statistics` của LMS (tỷ lệ nghỉ học, tỷ lệ thiếu bài tập, tiến độ E-learning, số bài chậm, Hackathon TN/TL, R-Points, trạng thái chốt điểm, điều kiện tham gia project), lưu cục bộ theo từng lớp + môn học, hiển thị bảng có thể sắp xếp/lọc theo mọi cột và xuất ra Excel.
- Cảnh báo ngay trên giao diện khi LMS đổi cấu trúc cột khiến một vài chỉ số không quét được, thay vì âm thầm hiển thị thiếu dữ liệu.

### 🎨 Cải thiện giao diện
- **Thanh menu dọc thu gọn mặc định**: Sidebar điều hướng giờ mặc định chỉ hiện icon (48px thay vì 185px trước đây), giải phóng phần lớn không gian cho nội dung chính trên popup vốn đã nhỏ. Có nút mở rộng tạm thời khi cần đọc nhãn đầy đủ, trạng thái được ghi nhớ cho lần mở sau.

### 🐛 Sửa lỗi
- **Chấm hàng loạt mất bài khi nhiều bài chung 1 link GitHub**: Bước khử trùng lặp sau khi quét danh sách bài nộp trước đây chỉ dựa theo link GitHub, khiến trường hợp một học viên nộp chung 1 link cho nhiều bài tập (ví dụ 5 bài) chỉ giữ lại đúng 1 bài đầu tiên. Đã đổi sang khử trùng theo cặp (tên bài tập, link GitHub).
- **Chế độ "Mở cửa sổ rời" không cào được dữ liệu trang LMS đang mở**: Khi bật cửa sổ nổi, mọi thao tác quét/chấm điểm/điều hướng vô tình lấy nhầm tab của chính cửa sổ nổi thay vì tab LMS ở cửa sổ trình duyệt chính, khiến tính năng hoạt động như một trang độc lập tách rời khỏi LMS. Đã sửa cách xác định tab đang làm việc để luôn quét đúng cửa sổ trình duyệt chính, hoạt động đúng ở cả chế độ popup thả xuống lẫn cửa sổ nổi.

### 🔧 Cải tiến nội bộ
- Dọn dẹp dead code và các import/biến không còn sử dụng còn sót lại sau đợt loại bỏ backend FastAPI.
- Gộp logic chọn AI Provider base URL và cơ chế thử lại khi bị giới hạn tần suất (rate limit) — trước đây bị lặp lại y hệt ở 3 nơi khác nhau, giờ dùng chung 1 nguồn duy nhất.

---

## [4.18.5] - 2026-09-15

### ✨ Khôi phục tính năng Supabase Zero Setup
- **Tự động khởi tạo Cơ sở dữ liệu**: Khôi phục lại logic lưu trữ và giao diện hỗ trợ khởi tạo bảng Supabase tự động từ phiên bản 4.8.0. Người dùng giờ đây có thể nhập **Personal Access Token (PAT)** vào phần Cài đặt Supabase, sau đó ấn "Khởi tạo DB (Zero Setup)" để tự động tạo toàn bộ bảng (`submissions`, `care_notes`, `exercises`) và thiết lập Row Level Security (RLS) mà không cần cấu hình thủ công qua giao diện Supabase.
- Giữ lại các UI mới hiện đại (Tri-color Theme) của bản hiện tại nhưng được bổ sung thêm nút tạo cơ sở dữ liệu.

---

## [4.18.4] - 2026-09-15

### 🐛 Sửa Lỗi Ngân Hàng Bài Tập (Exercise Bank API)
- **Khôi phục tính năng tải đề bài từ API Server**: Trong các phiên bản trước, tính năng chọn nguồn dữ liệu bài tập (Local vs API Server) vô tình bị loại bỏ khỏi giao diện cấu hình và hook trạng thái, khiến tiện ích chỉ tải đề bài cục bộ từ `exercises.json` và không thể kết nối tới server ngân hàng đề. Phiên bản này đã phục hồi:
  - Giao diện chọn Nguồn Dữ Liệu Bài Tập (Local / API Server) trong thẻ Barem & Quy tắc.
  - Các ô nhập `Exercise API URL` và `API Token`.
  - Logic tải đề bài (`loadExercises`) ưu tiên tải từ API khi người dùng cấu hình.

---

## [4.18.3] - 2026-08-28

### 🔧 Mặc Định Backend Chuyển Về Local
- **Backend Modal đã ngưng hoạt động**: Đổi URL mặc định của `fastapi_server` từ Modal sang `http://localhost:8000`, để extension hoạt động ngay khi người dùng tự chạy backend cục bộ (`start_backend.bat`/`start_backend.ps1`).
- **Sửa lỗi ô nhập URL/Secret Key trong Cài đặt không có tác dụng**: Trước đây ô "Backend Server URL"/"Secret Key" trong tab AI & Kết nối ghi nhầm vào field `aiApiUrl`/`aiApiKey`, trong khi luồng kết nối thực tế lại ưu tiên đọc field `fastApiServerUrl`/`fastApiSecretKey` — khiến giá trị người dùng nhập vào không được áp dụng. Giờ cả hai field đã đồng bộ.
- **Xóa logic tự động ép URL về Modal**: Trước đây nếu `fastApiServerUrl` chứa `localhost:8000`, hệ thống tự động ghi đè về URL Modal — logic này không còn phù hợp và đã được gỡ bỏ.

---

## [4.18.2] - 2026-08-28

### 🐛 Thông Báo Lỗi Xác Thực Backend
- **Hiển thị Toast khi lỗi 401**: Trước đây lỗi xác thực (`x-api-key`/Bearer sai hoặc thiếu) khi tải danh sách đề bài, kiểm tra kết nối AI, hoặc tải danh sách model chỉ được log ra console — người dùng không biết vì sao dữ liệu không tải được. Giờ hiển thị Toast lỗi rõ ràng ngay trên popup, kèm gợi ý kiểm tra lại Backend Secret Key trong Cài đặt.
- **Sửa lỗi nuốt exception ở tầng Service**: `SupabaseService.pullExercises` trước đây nuốt lỗi và trả về danh sách rỗng, khiến trạng thái đồng bộ hiển thị "Sẵn sàng" dù thực chất backend đã từ chối request; giờ lỗi được truyền đúng lên tầng gọi để hiển thị chính xác.

---

## [4.18.1] - 2026-08-28

### ⚡ Hiệu Năng Kết Nối Backend
- **Warm-up định kỳ cho Backend Modal**: `background.ts` ping `/health` mỗi 4 phút (kèm lúc cài đặt/khởi động trình duyệt) để giữ container Modal serverless luôn "ấm", giảm thời gian chờ cold start khi người dùng mở popup.
- **Timeout cho các request khởi tạo**: `checkHealth` và `pullExercises` giới hạn thời gian chờ 10s bằng `AbortController`, tránh treo UI vô thời hạn khi backend không phản hồi.

---

## [4.18.0] - 2026-08-22

### 🎨 Giao Diện Mới (Tri-Color Modern Theme)
- **Tối ưu hóa thiết kế với 3 tông màu chủ đạo**:
  - **Vàng (Amber/Gold)**: Nút hành động chính (Primary CTA), Logo thương hiệu `REduX`, Huy hiệu AI và điểm số.
  - **Xanh dương nhạt (Light/Sky Blue)**: Menu điều hướng, thanh trạng thái, nút xuất file và các thành phần bổ trợ.
  - **Trắng (Crisp White)**: Không gian bảng dữ liệu, nền popup và modal hiển thị rõ ràng, dễ đọc.

### 🛡️ Bảo Mật & Cloud Migration
- **Xóa sạch toàn bộ API Key trên Frontend**: Chuyển đổi sang mô hình gọi backend qua API Key định danh duy nhất (`x-api-key`). Toàn bộ khóa bí mật (Gemini, Supabase, OpenAI) được lưu trữ an toàn trên Modal Secret (`redux-key`).
- **Tăng ngưỡng Timeout & Xử lý lỗi ReadTimeout**: Cấu hình kết nối AI lên 120s và tải GitHub lên 60s, ngăn ngừa hiện tượng rớt kết nối khi phân tích repository lớn.

---

## [4.17.0] - 2026-08-20

### 🚀 Kiến Trúc Mới (Client-Server Pure UI)
- **Frontend trở thành giao diện UI gọi API thuần túy**:
  - Gỡ bỏ toàn bộ code xử lý giải nén file ZIP GitHub client-side và AST static analysis, chuyển 100% về Backend FastAPI.
  - Loại bỏ hoàn toàn thư viện `@supabase/supabase-js` và mã truy vấn CSDL trực tiếp trên trình duyệt.
  - Tách riêng toàn bộ API Endpoints và API Clients vào thư mục `src/services/api/` (`endpoints.ts`, `fastApiClient.ts`, `aiClient.ts`).
  - Mặc định AI Provider sang `fastapi_server`.
- **Tối ưu hóa hiệu năng**:
  - Giảm kích thước file build từ `2.09 MB` xuống `1.88 MB`.
  - Tăng tốc độ khởi động popup và giảm tiêu thụ RAM trình duyệt.
- **Sửa lỗi xác thực**:
  - Khắc phục lỗi HTTP 401 Unauthorized khi khởi động nạp danh sách đề bài.

---

## [4.16.0] - 2026-08-20
- Thêm hỗ trợ kết nối FastAPI Core Server trong bảng cấu hình Settings.
- Bổ sung cấu hình nhanh danh sách model AI thịnh hành.

---

## [4.15.0] - 2026-08-15
- Bổ sung tab Chăm sóc học viên (Take Care).
- Hỗ trợ xuất báo cáo tổng hợp điểm số ra file Excel (.xlsx).
