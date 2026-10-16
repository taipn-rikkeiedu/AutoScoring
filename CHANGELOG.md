# Changelog - REduX AutoScoring Extension

Tất cả các thay đổi của tiện ích mở rộng **REduX AutoScoring Extension** được ghi nhận tại đây.

---

## [5.20.4] - 2026-10-16

### ✨ Cải thiện
- **AI chỉ nhận xét, không đưa danh sách việc cần làm**: nhận xét sinh viên và các AI tổng quan lớp (toàn lớp, bài tập, vắng nghỉ, R-Point, E-learning, điểm thi) bỏ phần gợi ý hành động / "việc giảng viên nên làm".

---

## [5.20.3] - 2026-10-16

### ✨ Cải thiện
- **AI nhận xét sinh viên gọn hơn** (theo nguyên tắc thiết kế: cho thấy trạng thái hệ thống, tối giản): bỏ khung nhận xét chiếm chỗ trong tab Cần xử lý; trạng thái nằm ngay trên nút — "Đang viết…" → **"✓ Xem nhận xét AI"** (xanh lá) → bấm mở khung nổi có **Sao chép** và **Tạo lại**; tạo xong lần đầu thì khung tự mở. Lỗi thì nút đỏ "AI lỗi · thử lại", di chuột xem lý do.

---

## [5.20.2] - 2026-10-16

### ✨ Cải thiện
- Chi tiết sinh viên, tab Điểm danh: bỏ lịch tất cả các buổi học, chỉ liệt kê đúng các buổi vắng (ngày, ca, có phép / không phép, đơn xin nghỉ, chuỗi nghỉ liên tiếp) dưới các số liệu tổng.

---

## [5.20.1] - 2026-10-16

### ✨ Cải thiện
- Chi tiết sinh viên, tab Cần xử lý: bỏ dòng gợi ý hành động ("→ Nhắc nhở chuyên cần, hỏi lý do nghỉ", "→ Hỗ trợ ôn tập phần thi điểm thấp"…) — mỗi vấn đề chỉ còn chỉ số, giá trị, ngưỡng và mức.

---

## [5.20.0] - 2026-10-16

### ✨ Cải thiện
- **Gộp Lịch nghỉ học vào Giám sát học tập**, bỏ chế độ 📅 riêng:
  - Danh sách có thêm cột **Tình hình** (vấn đề chính của sinh viên, tô màu theo mức) — hết khoảng trống giữa tên và mức; mã SV gọn 1 dòng (chỉ ghi lớp khi chọn nhiều lớp).
  - Ô lọc **Nghỉ ngày …** (chọn ngày học, kèm số SV nghỉ): danh sách chỉ còn sinh viên nghỉ ngày đó, cột giữa hiện ca nghỉ, có phép / không phép và đơn xin nghỉ (trạng thái, lý do, ảnh).
  - Lọc thêm **Nghỉ từ 2 buổi liên tiếp**.
- **Thiết kế lại chi tiết sinh viên** cho dễ nhìn:
  - Dải **chỉ số nhanh** trên cùng: Nghỉ học (kèm số buổi, liên tiếp), Thiếu bài tập, Chậm E-learning, R-Point, Điểm thi — tô màu theo mức nếu chạm ngưỡng.
  - Chia **tab** thay cho 1 trang dài: Cần xử lý · **Điểm danh** · Điểm thi · Bài tập · Liên hệ; giữ tab đang xem khi chuyển sinh viên (‹ › hoặc phím ← →).
  - Tab **Điểm danh**: số buổi học / có phép / không phép / đi muộn / liên tiếp tối đa, lịch các buổi (mỗi ô 1 ngày, chia theo ca, khung đỏ = chuỗi nghỉ liên tiếp), danh sách buổi nghỉ kèm đơn xin nghỉ.

---

## [5.19.1] - 2026-10-16

### 🐛 Sửa lỗi
- **Mã điểm danh 3 = Đi muộn** (trước hiện "Mã 3 (chưa rõ)"): Lịch nghỉ học và bảng điểm danh hiện "Đi muộn" (ô chữ **M** màu xanh); đi muộn là có mặt nên không tính là nghỉ và không nối chuỗi nghỉ liên tiếp.

---

## [5.19.0] - 2026-10-16

### 🚀 Tính năng mới
- **Lịch nghỉ học** trong Giám sát học tập (nút 📅 cạnh Danh sách / Biểu đồ), dùng điểm danh `/attendance` và đơn xin nghỉ `/request-leave` của QLĐT (tải cùng lúc với dữ liệu lớp):
  - **Theo ngày**: chọn ngày học (‹ ›), xem sinh viên nào nghỉ, ca nào (nghỉ ít nhất 1 ca là nghỉ ngày đó), có phép hay không, đơn xin nghỉ (Phê duyệt / Từ chối / Đang chờ, lý do, ảnh minh chứng), và đang ở buổi thứ mấy của chuỗi nghỉ liên tiếp.
  - **Nghỉ liên tiếp**: sinh viên nghỉ từ N buổi học liên tiếp (mặc định 2, tính cả có phép; bỏ qua ngày không có lịch học), khoảng ngày, số buổi có phép / không phép, đánh dấu "đang nghỉ".
  - **Bảng điểm danh** sinh viên × ngày (mỗi ô 1 ca: P = có phép, K = không phép), lọc chỉ sinh viên có nghỉ.
  - Bấm tên sinh viên để mở chi tiết; chi tiết hiện số buổi nghỉ và nghỉ liên tiếp tối đa.
- **Chỉ số "Nghỉ liên tiếp (buổi)"** trong bảng mức của mẫu giám sát; mẫu Chuẩn / Chặt: Cảnh báo từ 2 buổi, Báo động từ 3 buổi. Excel thêm cột số buổi nghỉ, nghỉ không phép, nghỉ liên tiếp tối đa.
- Mã điểm danh: 4 = có mặt, 1 = nghỉ có phép, 0 = nghỉ không phép (suy ra từ dữ liệu); mã 3 chưa rõ nghĩa nên chưa tính là nghỉ.

---

## [5.18.1] - 2026-10-16

### 🌿 Tinh giản tối đa Bảng danh sách Giám sát học tập (Minimalist & Anti-Clutter UI)
- **Triệt tiêu nhiễu thị giác**: Tinh gọn bảng danh sách chỉ còn **2 cột cốt lõi**:
  - **Sinh viên**: Ngôi sao rà soát + Tên học viên nổi bật font 13px + Mã sinh viên & Lớp (hỗ trợ sắp xếp A-Z).
  - **Mức**: Tag mức độ rủi ro rõ ràng, căn phải với biểu tượng mũi tên gợi ý nhấp chuột (hỗ trợ sắp xếp theo độ nặng rủi ro).
- **Tập trung toàn bộ chi tiết vào Drawer**: Các số liệu chi tiết (% Nghỉ học, % Thiếu bài tập, R-Points, BTVN, Điểm thi và Liên hệ khẩn cấp) được hiển thị đầy đủ, khoa học trong Drawer khi người dùng nhấp vào từng sinh viên, giúp giao diện bảng luôn thoáng đãng, tinh tế và không bị ngợp thông tin.
- **Tooltip tóm tắt vi phạm nhẹ nhàng**: Di chuột vào Tag mức trên bảng sẽ hiển thị tóm tắt vi phạm mà không làm rối bảng mặc định.

---

## [5.18.0] - 2026-10-16

### 🎨 Tối ưu toàn diện UI/UX Giám sát học tập (Theo chuẩn Nielsen Heuristics & WCAG 2.2)
- **Công thái học & Kích thước vùng bấm (Fitts's Law & WCAG 2.2 Target Size)**:
  - Nâng cấp nút sao rà soát `WatchStar` thành nút tương tác tròn kích thước chuẩn 26×26px với padding an toàn, hiệu ứng hover, `tabIndex={0}`, hỗ trợ kích hoạt bằng phím `Enter` / `Space`, không bị bấm trượt vào tên sinh viên.
  - Mở rộng vùng bấm của `Tag.CheckableTag` bộ lọc (padding 3px 10px, min-height 26px, bo tròn 6px) giúp tương tác ngón tay/chuột dễ dàng.
  - Chuẩn hóa kích thước các nút icon thao tác (Sửa, Nhân bản, Xóa mẫu, Điều hướng sinh viên) đạt diện tích tối thiểu 28×28px.
- **Thứ bậc thị giác (Visual Hierarchy) trong Drawer**:
  - Bổ sung **Thẻ liên hệ khẩn cấp (Quick Contact Card)** hiển thị MSSV, SĐT, Email với nút sao chép 1 chạm ngay phần đầu Drawer, giúp giảng viên và cán bộ quản lý liên lạc nhanh mà không phải cuộn xuống đáy.
  - Bổ sung huy hiệu chỉ dẫn phím tắt `Phím ← → duyệt SV` trực quan trên thanh điều hướng Drawer.
  - Thêm tooltip giải thích ngữ cảnh cho điểm thưởng rèn luyện `R-Points`.
- **Nhận diện thay vì ghi nhớ (Recognition rather than Recall) & Sắp xếp linh hoạt**:
  - Bổ sung trực tiếp 2 cột số liệu cốt lõi vào bảng chính: cột **Nghỉ (%)** và cột **Thiếu BT (%)** (tô màu theo mức ngưỡng vi phạm).
  - Hỗ trợ sắp xếp (`sorter`) toàn diện cho các cột: Sinh viên (A-Z tiếng Việt), Mức (theo độ nặng rủi ro), Nghỉ học, Thiếu bài tập, R-Point.
  - Hỗ trợ điều hướng bàn phím cho Bảng (`tabIndex={0}`, phím `Enter`/`Space` mở Drawer, viền focus rõ ràng theo tiêu chuẩn WCAG 2.2 Focus Not Obscured).
  - Bổ sung phím tắt `/` để tự động focus vào ô tìm kiếm sinh viên.
- **Ngăn ngừa lỗi (Error Prevention) & Phản hồi trạng thái (Visibility of System Status)**:
  - Hộp thoại `Modal.confirm` cảnh báo xác nhận khi chọn "Áp dụng cho tất cả môn" nếu đang có cấu hình riêng của các môn khác để tránh ghi đè dữ liệu ngoài ý muốn.
  - Hiển thị số lượng học viên hợp lệ đã nhận diện khi dán danh sách rà soát (`watchText`).
  - Banner cảnh báo trực quan kèm liên kết mở QLĐT đăng nhập khi chưa kết nối phiên làm việc.
  - Thêm trạng thái `exporting` (spinner loading) trên nút Xuất Excel.

---

## [5.17.0] - 2026-10-16

### 🚀 Tính năng mới
- **Thu thập API QLĐT** (tab mới trong nhóm Hệ thống) — lưu trữ trên máy và xuất 1 file JSON:
  - **Ghi lại khi duyệt QLĐT**: bật công tắc rồi dùng qldt.rikkei.edu.vn bình thường; mọi API GET mà trang gọi tới apiportal.rikkei.edu.vn đều được lưu kèm response (kể cả API extension chưa biết). Bỏ qua request đăng nhập / token / mật khẩu.
  - **Quét chủ động tất cả lớp & môn** tài khoản xem được: tài khoản, danh sách lớp, chi tiết lớp, dashboard lớp × môn, buổi học, đề từng buổi, tiến độ BTVN theo buổi, và (tuỳ chọn) bài nộp từng sinh viên. Tối đa 3 request cùng lúc, có tiến độ và nút Dừng.
  - **Xuất JSON**: 1 file nhóm theo API — danh mục API (mẫu đường dẫn, số URL, tham số, các trường dữ liệu) + toàn bộ response gốc. Xem danh sách API đã thu, xoá dữ liệu khi cần.
  - Chỉ đọc (GET), không gửi request ghi / sửa / xoá nào. Dữ liệu gồm thông tin cá nhân sinh viên — lưu trên máy, không chia sẻ, không đưa lên git.

---

## [5.16.0] - 2026-10-16

### ✨ Cải thiện
- **AI tổng quan lớp chia theo loại**, mỗi loại một tab, bấm tạo riêng, kết quả giữ lại khi chuyển tab (có dấu ✓ ở tab đã tạo):
  - **Toàn lớp**: tình hình chung, số sinh viên theo mức, vấn đề nổi bật, việc cần làm tuần này.
  - **Bài tập**, **Vắng nghỉ**, **R-Point**, **E-learning**: số liệu của chỉ số (TB, thấp nhất, cao nhất), số sinh viên theo từng mức kèm ngưỡng, danh sách sinh viên chạm ngưỡng kèm vấn đề khác để AI chỉ ra mối liên hệ, và việc nên làm.
  - **Điểm thi**: điểm Hackathon / cuối môn, vắng thi, phần thi dưới ngưỡng theo mức, đối chiếu tỉ lệ nộp BTVN và nghi vấn BTVN.
- **Cột R-Point** trong danh sách sinh viên (sắp xếp được, tô màu theo mức nếu chạm ngưỡng). Lưu ý: QLĐT hiện trả R-Point trống cho mọi sinh viên nên cột hiện "—" cho tới khi QLĐT có dữ liệu.

---

## [5.15.0] - 2026-10-16

### 🚀 Tính năng mới
- **Tự cấu hình các mức giám sát** trong từng mẫu giám sát (dùng chung qua Supabase), thay cho 4 mức cố định:
  - **Bảng ngưỡng**: mỗi dòng là một chỉ số (Nghỉ học %, Thiếu bài tập %, Chậm E-learning, **R-Point**, Điểm bài thi, Vắng thi, Số chỉ số vi phạm), mỗi cột là một mức; ô để trống = không xét.
  - **Thêm / xoá / đổi tên / đổi màu / sắp xếp mức** (trái = nặng nhất). Bỏ tick "Vi phạm" để mức chỉ nhắc sớm (như Sắp vượt ngưỡng).
  - Sinh viên vào mức nặng nhất mà một chỉ số chạm ngưỡng; dòng "Số chỉ số vi phạm" cho phép kiểu "từ 2 chỉ số vi phạm → Báo động".
  - Cảnh báo khi một ngưỡng không có tác dụng (bị mức nặng hơn che).
- **Mức Cấm thi** trong mẫu Chuẩn và Chặt: thiếu bài tập ≥ 20%, nghỉ học ≥ 20%, chậm E-learning ≥ 3 bài, hoặc R-Point < 80.
  - Mẫu Chuẩn mới: Báo động ≥ 15% (chậm E-learning 2 bài, vắng thi, hoặc từ 2 chỉ số vi phạm), Cảnh báo ≥ 10% (E-learning 1 bài, bài thi < 50), Sắp vượt ngưỡng ≥ 7% (bài thi < 55).
  - Mẫu đã lưu theo ngưỡng cũ được tự đổi sang bảng mức (thêm mức Cấm thi).

### ✨ Cải thiện
- Danh sách, ô lọc, biểu đồ (thanh mức, phân bố nghỉ học / thiếu BT / E-learning / R-Point / điểm thi), chi tiết sinh viên, xuất Excel và nhận xét AI đều theo các mức đã cấu hình (tên, màu, ngưỡng). Nhãn vấn đề tô màu theo mức mà chỉ số chạm; di chuột để xem mức và ngưỡng.

---

## [5.14.0] - 2026-10-16

### ✨ Cải thiện
- **Thiết kế lại giao diện Chấm hàng loạt** cho dễ nhìn, dễ thao tác:
  - **Mỗi sinh viên một dòng**, mỗi bài của buổi là một cột (Bài 1, Bài 2… — di chuột vào tiêu đề cột để xem tên đề). Ô bài cùng kích thước, màu theo tình trạng: điểm (xanh ≥ 80%, vàng ≥ 50%, đỏ dưới 50%), Chưa chấm, Đang chấm, Lỗi, Chưa nộp (viền nét đứt). Bỏ bảng lồng nhau và checkbox 2 cấp.
  - **Tổng quan buổi** ngay trên đầu: số bài đã chấm / đã nộp, số SV, bài chưa nộp, số lỗi kèm thanh tiến độ; khi đang chấm hiện bài đang chấm và nút **Dừng**.
  - Nút chính **Chấm N bài** đặt cạnh tổng quan; chọn theo sinh viên = chấm các bài chưa chấm / lỗi của sinh viên đó. Cách chấm (mức độ, thang điểm) gom vào nút **Chuẩn · 10**.
  - Bấm vào sinh viên mở **ngăn chi tiết** (‹ › hoặc phím ← → để chuyển sinh viên): từng bài với điểm, nhận xét, nút **Chép nhận xét & điểm**, **Chấm lại**, **Báo cáo đầy đủ**, đề bài và tiêu chí.
  - Ô lọc trạng thái buổi gọn một dòng; nút có chữ rõ ràng thay cho biểu tượng không nhãn; bỏ tiền tố "[Bài tập]" lặp lại; dòng đã chọn không tô nền xanh.

---

## [5.13.0] - 2026-10-16

### ✨ Cải thiện
- **Đề bài gửi cho AI giữ đủ ảnh, link và code mẫu** (trước đây đề HTML trên QLĐT bị lột hết thẻ):
  - **Ảnh trong đề** (giao diện mẫu, sơ đồ…) được tải và **gửi kèm cho AI**, đánh nhãn `[Ảnh n]` đúng vị trí trong đề; AI được dặn đây là mẫu của đề, không phải bài làm. Ảnh lớn / định dạng lạ được thu nhỏ, đổi sang JPEG; ảnh hỏng hoặc không tải được thì báo AI chấm theo phần chữ. Cả lớp cùng một đề chỉ tải ảnh 1 lần.
  - **Link** giữ cả chữ và địa chỉ (`[tài liệu](https://…)`).
  - **Code mẫu** (`<pre>`, `<code>`) giữ nguyên thụt dòng trong khối code; tiêu đề, danh sách, bảng vẫn rõ ràng.
  - Model không đọc được ảnh → tự chấm lại chỉ với phần chữ của đề thay vì báo lỗi.
- Ngăn chi tiết bài: xem ảnh của đề, link bấm được, code mẫu trong khung riêng; nhận xét ghi rõ số ảnh của đề đã gửi kèm.

### 🐛 Sửa lỗi
- Đề hoặc bài nộp có ký tự `$&`, `` $` ``, `$'` (code PHP/JS…) làm hỏng nội dung prompt gửi AI.

---

## [5.12.0] - 2026-10-16

### 🚀 Tính năng mới
- **Chấm hàng loạt lấy bài nộp qua API QLĐT**, không cần mở trang bài nộp:
  - Chọn **lớp → môn → buổi** (nhớ lựa chọn lần trước; đang mở trang kiểm tra bài tập của một lớp trên QLĐT thì chọn sẵn lớp đó) rồi bấm **Tải bài nộp**.
  - Bài nộp **khớp đúng đề theo ID** trên QLĐT (đề + hướng dẫn + tiêu chí chấm của buổi) — hết cảnh khớp sai theo tên.
  - Danh sách **nhóm theo sinh viên**: trạng thái buổi trên QLĐT, số bài đã nộp, điểm trung bình; bấm vào sinh viên để xem từng bài. Hiện cả sinh viên chưa nộp.
  - **Lọc theo trạng thái buổi** (Đang chờ kiểm tra / Hoàn thành / Chưa hoàn thành / Chưa nộp bài) và tìm theo tên, MSSV.
  - Các bài có link được chọn sẵn; bấm **Chấm N bài đã chọn** (dừng được giữa chừng). Luôn chấm lại bằng AI của extension; điểm AI hệ thống và nhận xét đang có trên QLĐT chỉ hiện để tham khảo.
  - Bấm vào điểm để sao chép nhận xét + điểm; ngăn chi tiết xem đề, tiêu chí, nhận xét, tệp đã đọc. Sao chép báo cáo cả buổi (văn bản, Excel, Markdown).
  - Kết quả chấm lưu theo lớp + buổi (10 buổi gần nhất); sinh viên nộp lại link khác thì bài đó về "Chưa chấm".

### 🗑 Gỡ bỏ
- **Tab Kho đề bài** và xuất Markdown kho đề: đề được lấy trực tiếp theo buổi khi chấm. Chấm Mini Project tạm thời vẫn dùng đề đã tải trước đó.
- Quét trang bài nộp và so khớp đề theo tên trong Chấm hàng loạt.

---

## [5.11.0] - 2026-10-16

### 🚀 Tính năng mới
- **Mẫu giám sát (tạo / sửa / nhân bản / xoá)** trong Cài đặt giám sát, thay cho 2 mức cố định:
  - Mỗi mẫu gồm tên + toàn bộ ngưỡng (vi phạm học tập, sắp vượt ngưỡng, nghi vấn BTVN). Chuẩn và Chặt là mẫu khởi đầu, sửa / xoá được (luôn giữ ít nhất 1 mẫu).
  - **Áp dụng cho tất cả môn** hoặc **riêng môn đang chọn**; danh sách các môn đặt mẫu riêng, bỏ được để về mẫu mặc định. Nút Cài đặt hiện tên mẫu đang dùng.
  - **Dùng chung qua Supabase** (bảng `monitor_templates`) khi đã bật đồng bộ; chưa có bảng thì bấm "Tạo bảng" (dùng PAT đã lưu) hoặc chạy lại khởi tạo cơ sở dữ liệu ở tab Cài đặt. Chưa bật Supabase thì mẫu lưu trên máy.

---

## [5.10.0] - 2026-10-16

### ✨ Cải thiện
- **Cài đặt giám sát gọn, ít nhập tay**:
  - Chọn **mức giám sát Chuẩn / Chặt** là đặt sẵn toàn bộ ngưỡng (cảnh báo, báo động, sắp vượt, nghi vấn). Chuẩn: nghỉ học / thiếu bài tập từ 10%, báo động trên 20%. Chặt: từ 5%, báo động trên 15%, nhắc khi bài thi dưới 60, nghi vấn nhạy hơn.
  - Vẫn **điều chỉnh bằng tay** từng ngưỡng (thu gọn), khi đó hiện nhãn "Đã chỉnh tay".
- **Danh sách cần rà soát**: bấm ☆ cạnh tên sinh viên (trong danh sách hoặc chi tiết) để thêm / bỏ, không cần gõ tên; ô dán danh sách tên có sẵn được thu gọn. Tên có số thứ tự ở cuối (vd "Nguyễn Đức Huy 4") nay được nhận đúng.
- **Điểm AI bài tập tự tải khi mở chi tiết sinh viên** (1 request), hiện ở mục "Bài tập về nhà"; bỏ nút tải hàng loạt trong Cài đặt.

---

## [5.9.4] - 2026-10-16

### 🐛 Sửa lỗi
- **Điểm thi trong Giám sát học tập lấy đúng điểm chính thức của QLĐT** (bảng điểm tổng kết) theo công thức từng môn, khớp trang Thống kê học tập:
  - TB Hackathon = 30% trắc nghiệm + 70% tự luận.
  - Môn thi tự luận: cuối môn = 30% trắc nghiệm + 70% tự luận.
  - **Môn thi project** (vd IT215): cuối môn = 70% **điểm sản phẩm** + 30% **điểm kiến thức** (+ vấn đáp theo trọng số của môn); bảng điểm hiện "Kiến thức / Sản phẩm" thay cho "TN / TL".
- **Bị tính "Vắng thi" sai** khi môn có nhiều lịch thi (thi kiến thức + thi lại trắc nghiệm cuối môn, thi bổ sung Hackathon) hoặc thi project: nay chỉ "Vắng thi" khi sinh viên không làm bài nào của đợt đó (tính cả thi bổ sung và điểm project).
- **Thi bổ sung** hiện ghi chú điểm; nếu QLĐT chưa tính vào điểm đợt đó thì ghi rõ và không báo "điểm thi thấp" theo điểm cũ.
- Excel thêm cột TB Hackathon, Tổng điểm thi, Thi bổ sung.

---

## [5.9.3] - 2026-10-16

### ✨ Cải thiện
- Console chỉ in response của API dashboard điểm khi bấm "Tải dữ liệu" ở Giám sát học tập (nhãn `[GIÁM SÁT] /classes/dashboard/{lớp}/{môn} — tên lớp`), dạng object giống bản trước — chuột phải → Copy object để lưu thành file JSON. Bỏ log mọi API của bản 5.9.1–5.9.2.

---

## [5.9.2] - 2026-10-16

### ✨ Cải thiện
- Log `[QLĐT API]` trong Console in phần `data` của response dưới dạng JSON đã định dạng (giống file response mẫu, có nút Copy của Chrome), kèm object để mở xem từng trường.

---

## [5.9.1] - 2026-10-16

### ✨ Cải thiện
- In nguyên response của mọi lần gọi API QLĐT ra Console (nhãn `[QLĐT API]`) để đối chiếu dữ liệu: chuột phải vào extension → Kiểm tra (Inspect) → tab Console.

---

## [5.9.0] - 2026-10-16

### 🗑 Gỡ bỏ
- **Tra cứu sinh viên** và **Danh sách lớp**: thông tin sinh viên đã có đầy đủ trong Giám sát học tập. Sidebar nhóm Quản lý sinh viên chỉ còn **Giám sát học tập** và **Chăm sóc học viên**.
- Cùng với Danh sách lớp: bỏ **xuất Excel bảng điểm lớp**, bỏ **lưu điểm vừa chấm theo từng sinh viên và đồng bộ điểm lên Supabase** (Chấm hàng loạt / Mini Project vẫn chấm và hiển thị kết quả như cũ).
- Bỏ phần Chấm đơn không còn sử dụng và việc tự theo dõi sinh viên đang xem trên trang LMS (trang LMS nhẹ hơn vì không còn quét nội dung liên tục).

---

## [5.8.0] - 2026-10-16

### 🚀 Tính năng mới
- **Kho đề bài lấy trực tiếp từ QLĐT**: chọn lớp → môn → "Tải đề từ QLĐT", extension tải toàn bộ buổi học và đề bài của môn kèm **tiêu chí chấm đúng như trên hệ thống**. Tên đề trùng khớp với trang chấm nên Chấm hàng loạt / Mini Project / Chấm đơn nhận đúng đề.
  - Xem đề và tiêu chí chấm (chỉ đọc), tìm đề theo tên, cập nhật lại (↻) hoặc xoá từng môn; đề chưa có tiêu chí trên QLĐT được đánh dấu và khi chấm dùng tiêu chí mặc định.
  - Vẫn giữ **Xuất Markdown**. Dùng được ở mọi trang, không cần mở trang LMS.

### 🗑 Gỡ bỏ
- Bỏ kho đề cũ: file `exercises.json`, nguồn "API Server" trong Cài đặt, thêm / sửa / xoá đề thủ công, "Lấy đề từ LMS" (quét trang) và đồng bộ đề qua Supabase. Đề đã lưu theo cách cũ không còn được dùng — hãy tải lại đề từ QLĐT.
- Trạng thái kết nối Supabase (Cloud) giờ kiểm tra trực tiếp CSDL thay vì qua việc tải đề.

---

## [5.7.0] - 2026-10-15

### 🚀 Tính năng mới
- **Tra cứu sinh viên**: tìm theo tên (gõ không dấu cũng được), MSSV, email hoặc số điện thoại trong các lớp đã tải ở Giám sát học tập. Mỗi kết quả hiện lớp, MSSV, email, SĐT (có nút sao chép), ngày sinh, mức cảnh báo và các vấn đề; bấm vào để mở chi tiết đầy đủ.
- Chi tiết sinh viên bổ sung SĐT và ngày sinh ở mục Liên hệ.

### ✨ Cải thiện
- **Sắp xếp lại sidebar theo công việc**: nhóm **Chấm điểm** (Chấm hàng loạt, Chấm Mini Project, Kho đề bài) và nhóm **Quản lý sinh viên** (Quản lý sinh viên, Chăm sóc học viên).
- **Quản lý sinh viên** gộp 3 tab con: Giám sát học tập | Tra cứu sinh viên | Danh sách lớp. Dữ liệu các lớp đã tải dùng chung cho Giám sát và Tra cứu. Mở extension ở trang homework-checking hoặc learning-statistics sẽ tự vào đúng tab con.

---

## [5.6.1] - 2026-10-15

### ✨ Cải thiện
- **Chi tiết sinh viên mở trong ngăn kéo bên phải** thay cho mở rộng dưới dòng: danh sách vẫn giữ phía sau (dòng đang xem được tô sáng), chuyển sinh viên trước / sau bằng nút ‹ › hoặc phím ← →.
- Nội dung chi tiết sắp xếp theo mức ưu tiên:
  - **Cần xử lý**: mỗi vấn đề ghi giá trị so với ngưỡng, mức (Báo động / Cảnh báo / Sắp vượt) và hành động đi kèm ngay bên dưới.
  - **Chỉ số học tập**: thanh nghỉ học / thiếu bài tập có vạch ngưỡng cảnh báo và báo động.
  - **Điểm thi**: bảng Hackathon / Cuối môn × Trắc nghiệm / Tự luận / Tổng, điểm dưới ngưỡng tô đỏ; nhận xét của giảng viên chấm thu gọn ngay bên dưới.
  - **Nghi vấn BTVN** thu gọn; **Liên hệ** (MSSV, email) có nút sao chép.
- Nút **AI nhận xét** luôn nằm ở đầu chi tiết.

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
