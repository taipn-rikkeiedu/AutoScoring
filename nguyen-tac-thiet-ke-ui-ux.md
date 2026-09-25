# Nguyên tắc thiết kế UI/UX — Tài liệu giải thích

> Tài liệu học tập, soạn ngày 20/09/2026.
> Mỗi khái niệm đi theo thứ tự: **ý chính → liên tưởng đời thực → ví dụ trong app/web**.

---

## 0. Cách đọc tài liệu này

Mỗi phần có một trong hai nhãn về độ tin cậy:

- **[Đã đối chiếu nguồn]**: nội dung đã được kiểm tra với trang gốc (link nằm ở mục 9).
- **[Kiến thức nền]**: nội dung đúng theo hiểu biết chung của người soạn, nhưng **chưa đối chiếu lại** với tài liệu gốc trong lần soạn này. Hãy tra nguồn trước khi trích dẫn trong bài nộp hoặc bài giảng.

Thuật ngữ tiếng Anh luôn kèm nghĩa tiếng Việt và giải thích ngắn ở lần xuất hiện đầu tiên.

---

## 1. UI và UX là gì? — [Kiến thức nền]

| | UI | UX |
|---|---|---|
| Viết tắt của | User Interface (giao diện người dùng) | User Experience (trải nghiệm người dùng) |
| Là gì | Thứ người dùng **nhìn và chạm**: màu sắc, chữ, nút bấm, biểu tượng | **Cảm giác** khi dùng: dễ hay khó, nhanh hay chậm, dễ chịu hay bực bội |
| Liên tưởng nhà hàng | Bàn ghế, thực đơn, ly đĩa | Cả buổi ăn: đặt bàn có dễ không, chờ có lâu không, món có đúng ý không |

**Đẹp chưa chắc dễ dùng.** Một cánh cửa kính rất đẹp nhưng không có tay nắm thì UI đẹp, UX tệ. Người dùng đứng đó đẩy thử cả hai bên.

---

## 2. Ba tầng tài liệu tham chiếu

UI/UX không có một "sách giáo khoa chuẩn" duy nhất. Liên tưởng: tầng 1 như luật giao thông, tầng 2 như sách dạy lái xe được cả nghề công nhận, tầng 3 như quy định riêng của từng hãng xe.

| Tầng | Tài liệu | Nói về |
|---|---|---|
| 1. Tiêu chuẩn chính thức | WCAG 2.2 (W3C), ISO 9241-210 | Khả năng tiếp cận; quy trình thiết kế lấy con người làm trung tâm |
| 2. Được cả nghề công nhận | 10 nguyên tắc Nielsen (NN/g) | Đánh giá độ dễ dùng của giao diện |
| 3. Hướng dẫn theo nền tảng | Apple Human Interface Guidelines, Material Design 3 | Cách thiết kế cho từng hệ điều hành |

Các từ viết tắt: **W3C** (World Wide Web Consortium, tổ chức đặt chuẩn cho web), **ISO** (International Organization for Standardization, Tổ chức Tiêu chuẩn hóa Quốc tế), **NN/g** (Nielsen Norman Group, công ty nghiên cứu và đào tạo về UX).

---

## 3. 10 nguyên tắc của Nielsen — [Đã đối chiếu nguồn ở phần lịch sử; phần ví dụ là của người soạn]

**"Heuristic" nghĩa là gì?** Là quy tắc kinh nghiệm, dùng để chấm một giao diện dễ hay khó dùng. NN/g nhấn mạnh đây là các quy tắc rộng, không phải hướng dẫn chi tiết từng trường hợp. Liên tưởng: "trước khi qua đường thì nhìn hai bên" là quy tắc kinh nghiệm, không phải luật chỉ rõ đứng cách mép đường bao nhiêu mét.

**Lịch sử:** Jakob Nielsen xây bộ nguyên tắc ban đầu cùng Rolf Molich năm 1990. Năm 1994 ông tinh chỉnh lại dựa trên phân tích 249 lỗi về khả năng sử dụng. Về sau NN/g đã cập nhật tên và mô tả, nên **tên gọi trong bảng dưới đây có thể khác đôi chút so với bản hiện hành**. Hãy đối chiếu tại trang gốc (mục 9).

### 3.1. Cho thấy trạng thái hệ thống (Visibility of system status)

- **Ý chính:** Luôn báo cho người dùng biết hệ thống đang làm gì, và báo kịp thời.
- **Liên tưởng:** Thang máy hiện số tầng đang đi qua. Nếu màn hình tối đen, bạn sẽ bấm nút liên tục vì không biết nó có chạy không.
- **Ví dụ xấu:** Bấm "Đặt hàng" mà màn hình đứng yên 5 giây, người dùng bấm thêm lần nữa và đặt hai đơn.
- **Ví dụ tốt:** Nút chuyển thành "Đang xử lý…", có thanh tiến trình, xong thì hiện "Đặt hàng thành công".

### 3.2. Khớp với thế giới thực (Match between system and the real world)

- **Ý chính:** Dùng chữ, biểu tượng, thứ tự mà người dùng đã quen, không dùng thuật ngữ nội bộ của người làm phần mềm.
- **Liên tưởng:** Biểu tượng thùng rác nghĩa là xóa vì ai cũng biết thùng rác để làm gì.
- **Ví dụ xấu:** Nút ghi "Submit payload" (gửi gói dữ liệu).
- **Ví dụ tốt:** Nút ghi "Gửi đơn hàng".

### 3.3. Người dùng được kiểm soát và tự do (User control and freedom)

- **Ý chính:** Ai cũng bấm nhầm. Hãy cho họ đường thoát rõ ràng: hủy, quay lại, hoàn tác (undo, đảo ngược hành động vừa làm).
- **Liên tưởng:** Cửa thoát hiểm luôn mở được từ bên trong.
- **Ví dụ xấu:** Cửa sổ bật lên (pop-up) không có nút đóng.
- **Ví dụ tốt:** Xóa xong hiện dòng "Đã xóa. Hoàn tác" trong vài giây.

### 3.4. Nhất quán và theo chuẩn (Consistency and standards)

- **Ý chính:** Cùng một việc thì cùng một cách làm. Có hai lớp: nhất quán **trong sản phẩm của mình**, và nhất quán **với thói quen từ các sản phẩm khác**.
- **Liên tưởng:** Công tắc đèn nhà nào cũng gạt lên là sáng. Bạn không phải học lại khi sang nhà khác.
- **Ví dụ xấu:** Trang này nút "Lưu" màu xanh bên phải, trang kia màu xám bên trái.
- **Ví dụ tốt:** Biểu tượng kính lúp luôn là tìm kiếm, nút "Lưu" luôn cùng màu và cùng vị trí.

### 3.5. Ngăn ngừa lỗi (Error prevention)

- **Ý chính:** Thiết kế sao cho khó mắc lỗi từ đầu, tốt hơn là báo lỗi sau khi đã sai.
- **Liên tưởng:** Bếp gas tự ngắt khi lửa tắt.
- **Ví dụ xấu:** Ô "Ngày sinh" cho gõ tự do, người dùng gõ "31/02".
- **Ví dụ tốt:** Dùng bộ chọn ngày (date picker); hỏi xác nhận trước khi xóa vĩnh viễn.
- *Gợi ý của người soạn (không phải phát biểu của Nielsen):* chỉ hỏi xác nhận với hành động khó đảo ngược. Hỏi quá nhiều thì người dùng bấm "Đồng ý" theo phản xạ, không đọc nữa.

### 3.6. Nhận ra thay vì phải nhớ (Recognition rather than recall)

- **Ý chính:** Đưa lựa chọn ra trước mắt, đừng bắt người dùng nhớ thông tin từ màn hình trước.
- **Liên tưởng:** Thực đơn có hình dễ gọi món hơn là phải nhớ tên món.
- **Ví dụ xấu:** Bắt nhớ mã sản phẩm ở trang 1 rồi gõ lại ở trang 3.
- **Ví dụ tốt:** Ô tìm kiếm gợi ý sẵn các từ gần giống; hiện danh sách tệp mở gần đây.

### 3.7. Linh hoạt và hiệu quả (Flexibility and efficiency of use)

- **Ý chính:** Người mới cần đường đi rõ ràng, người thạo cần đường tắt.
- **Liên tưởng:** Quốc lộ cho người đi xa, ngõ tắt cho người thuộc đường.
- **Ví dụ:** Người mới bấm qua menu; người thạo dùng phím tắt (shortcut) như Ctrl+C để sao chép.

### 3.8. Thẩm mỹ và tối giản (Aesthetic and minimalist design)

- **Ý chính:** Mỗi thông tin thừa giành sự chú ý của thông tin quan trọng. Tối giản không có nghĩa là ít, mà là **bỏ thứ không cần**.
- **Liên tưởng:** Biển báo giao thông chỉ ghi đúng điều tài xế cần biết trong vài giây.
- **Ví dụ xấu:** Trang thanh toán chèn ba banner quảng cáo cạnh nút "Thanh toán".
- **Ví dụ tốt:** Trang thanh toán chỉ có: giỏ hàng, địa chỉ, cách trả tiền, nút "Thanh toán".

### 3.9. Giúp người dùng nhận biết, chẩn đoán và sửa lỗi (Help users recognize, diagnose, and recover from errors)

- **Ý chính:** Thông báo lỗi phải nói rõ **sai gì** và **sửa thế nào**, bằng ngôn ngữ đời thường.
- **Liên tưởng:** Bác sĩ nói "bạn thiếu sắt, hãy ăn thêm rau", không chỉ nói "bạn có bệnh".
- **Ví dụ xấu:** "Đã xảy ra lỗi."
- **Ví dụ tốt:** "Mật khẩu cần ít nhất 8 ký tự. Bạn đang nhập 6 ký tự."

### 3.10. Trợ giúp và tài liệu (Help and documentation)

- **Ý chính:** Tốt nhất là không cần hướng dẫn. Nếu cần, hãy làm cho dễ tìm, ngắn, theo từng bước, và gắn với việc người dùng đang muốn làm.
- **Liên tưởng:** Sách hướng dẫn kèm máy giặt, mở đúng trang "máy báo lỗi E3" là biết phải làm gì.

---

## 4. Các nguyên tắc bổ sung — [Kiến thức nền]

Các mục này là kết quả nghiên cứu tâm lý học và công thái học (ergonomics, ngành nghiên cứu sự phù hợp giữa con người và đồ vật). **Không có một văn bản chuẩn duy nhất**, và mình chưa đối chiếu lại với bài báo gốc.

### 4.1. Định luật Fitts (Fitts's Law)

- **Ý chính:** Vật cần chạm tới càng **to** và càng **gần** thì càng nhanh và dễ chạm trúng.
- **Liên tưởng:** Bấm vào cái nút chuông cửa to ngay tầm tay dễ hơn bấm cái nút nhỏ xíu trên trần nhà.
- **Ứng dụng:** Nút "Thanh toán" to, đặt nơi ngón cái với tới; đừng để hai nút quan trọng nằm sát nhau (xem thêm mục 5.4 về kích thước vùng bấm).

### 4.2. Định luật Hick (Hick's Law)

- **Ý chính:** Càng nhiều lựa chọn thì mất càng nhiều thời gian để quyết định. Mức tăng không theo đường thẳng mà chậm dần.
- **Liên tưởng:** Quán có thực đơn 10 trang thì khách gọi món lâu hơn quán có thực đơn 1 trang.
- **Lưu ý:** Đừng hiểu máy móc thành "càng ít lựa chọn càng tốt". Hãy **nhóm và sắp xếp** lựa chọn để người dùng thấy ít hơn cùng một lúc.

### 4.3. Thuyết Gestalt (Gestalt principles, "nguyên lý tổng thể")

Mắt người tự gom các thứ thành nhóm. Ba ví dụ thường gặp:

| Nguyên lý | Ý chính | Ví dụ |
|---|---|---|
| Gần nhau (proximity) | Thứ đặt gần nhau được xem là cùng nhóm | Nhãn "Email" đặt sát ô nhập email, cách xa ô kế bên |
| Giống nhau (similarity) | Thứ giống màu, giống hình được xem là cùng loại | Mọi liên kết đều xanh và gạch chân |
| Khép kín (closure) | Não tự "vẽ nốt" hình còn thiếu | Biểu tượng vẽ bằng nét đứt vẫn nhận ra là hình tròn |

**Liên tưởng:** Nhìn bàn ăn, bạn tự hiểu bộ bát đũa đặt cạnh nhau là phần của một người.

### 4.4. Thứ bậc thị giác (Visual hierarchy)

- **Ý chính:** Mắt luôn nhìn cái **to, đậm, tương phản** trước. Hãy dùng điều đó để dẫn người dùng đọc theo thứ tự quan trọng.
- **Liên tưởng:** Trang nhất báo giấy: tít lớn ở giữa, tin nhỏ ở bên dưới.
- **Ví dụ:** Trang đăng ký: tiêu đề lớn nhất, ô nhập vừa, nút "Đăng ký" nổi bật nhất, chữ điều khoản nhỏ nhất.

---

## 5. Khả năng tiếp cận (Accessibility)

### 5.1. Là gì? — [Kiến thức nền]

Khả năng tiếp cận là làm cho **người có hạn chế về thị giác, thính giác, vận động hay nhận thức** vẫn dùng được sản phẩm. Nó cũng giúp người bình thường trong lúc bất tiện: dùng điện thoại ngoài nắng gắt, hoặc chỉ có một tay rảnh vì đang bế con.

**Liên tưởng:** Dốc dành cho xe lăn cũng giúp người đẩy xe nôi và kéo vali.

### 5.2. WCAG 2.2 — [Đã đối chiếu nguồn]

- **WCAG** (Web Content Accessibility Guidelines, Hướng dẫn tiếp cận nội dung web) do W3C soạn.
- WCAG 2.2 được công bố dưới dạng "W3C Recommendation" (Khuyến nghị, trạng thái chuẩn ổn định) ngày 5/10/2023. W3C khuyên dùng bản 2.2, dù 2.0 và 2.1 vẫn còn hiệu lực.
- So với 2.1, bản 2.2 thêm **9 "success criteria"** (tiêu chí thành công, mỗi tiêu chí là một điều kiện kiểm tra được là đạt hay không đạt).
- Có 3 **mức tuân thủ** (conformance level): A, AA, AAA. Mức AA thường là mức luật pháp và chính sách tham chiếu. *(Thông tin về mức AA lấy từ trang tổng hợp thứ cấp, chưa đối chiếu trực tiếp với văn bản W3C.)*

### 5.3. Bốn nhóm nguyên tắc POUR — [Kiến thức nền]

POUR là chữ viết tắt bốn nhóm nguyên tắc của WCAG:

| Chữ | Tên (nghĩa tiếng Việt) | Câu hỏi tự kiểm tra |
|---|---|---|
| P | Perceivable (Nhận biết được) | Người không nhìn thấy màn hình có biết nội dung là gì không? |
| O | Operable (Vận hành được) | Người không dùng chuột có thao tác được không? |
| U | Understandable (Hiểu được) | Chữ và hành vi có dễ hiểu, dễ đoán không? |
| R | Robust (Bền vững, tương thích) | Có chạy tốt với các công cụ hỗ trợ như trình đọc màn hình (screen reader, phần mềm đọc to nội dung) không? |

### 5.4. Ba ví dụ cụ thể

**a) Kích thước vùng bấm — [Đã đối chiếu nguồn]**
Tiêu chí 2.5.8 "Target Size (Minimum)" (Kích thước vùng bấm tối thiểu), mức AA, mới có từ WCAG 2.2. Vùng bấm dành cho con trỏ phải rộng **ít nhất 24 × 24 điểm ảnh CSS**. (CSS là ngôn ngữ định dạng giao diện web; "điểm ảnh CSS" là đơn vị kích thước trên web.) Có các ngoại lệ, ví dụ vùng nhỏ hơn vẫn đạt nếu đủ khoảng cách với vùng bấm bên cạnh, hoặc là liên kết nằm trong câu văn. W3C khuyên nên đạt kích thước tối thiểu ngay cả khi đã có ngoại lệ về khoảng cách.
*Liên tưởng:* Nút bấm quá nhỏ và sát nhau giống như hai công tắc đèn dính liền, ngón tay run sẽ bấm nhầm.

**b) Tiêu điểm bàn phím không bị che — [Đã đối chiếu nguồn]**
Tiêu chí 2.4.11 "Focus Not Obscured (Minimum)", mức AA, mới ở WCAG 2.2. Khi một phần tử nhận **tiêu điểm** (focus, ô đang được chọn khi người dùng bấm phím Tab) thì ít nhất một phần của nó phải nhìn thấy được. Người không dùng chuột cần thấy mình đang ở đâu.
*Liên tưởng:* Đèn pin chỉ chỗ bạn đang đứng trong rạp chiếu phim tối. Nếu đèn bị che, bạn lạc.

**c) Độ tương phản màu — tên tiêu chí [Đã đối chiếu nguồn thứ cấp]; số cụ thể [Kiến thức nền]**
Tiêu chí 1.4.3 "Contrast (Minimum)" (Độ tương phản tối thiểu) yêu cầu chữ và nền đủ chênh lệch. Contrast (độ tương phản) là mức chênh về độ sáng giữa hai màu. Mình nhớ các mức số là **4,5:1 cho chữ thường** và **3:1 cho chữ lớn**, nhưng **chưa tra lại**. Hãy kiểm tra trên trang W3C trước khi dùng số này.
*Liên tưởng:* Chữ xám nhạt trên nền trắng như thì thầm trong quán ồn.

---

## 6. Quy trình: thiết kế lấy con người làm trung tâm — [Đã đối chiếu nguồn thứ cấp]

**ISO 9241-210** mô tả **human-centred design** (thiết kế lấy con người làm trung tâm): làm ra hệ thống dễ dùng và hữu ích bằng cách tập trung vào người dùng, nhu cầu của họ, và kiến thức về công thái học và độ dễ dùng.

Theo bản 2010 (trích lại trong một bài báo khoa học, nên là nguồn thứ cấp), cách làm này tuân theo các nguyên tắc:

1. Thiết kế dựa trên hiểu biết rõ về người dùng, tác vụ và môi trường sử dụng.
2. Người dùng tham gia suốt quá trình thiết kế và phát triển.
3. Thiết kế được dẫn dắt và hoàn thiện bằng đánh giá từ phía người dùng.
4. Quy trình lặp lại nhiều vòng.

*(Nguồn trích chỉ hiện bốn ý đầu. Mình chưa xem toàn bộ văn bản nên không khẳng định đây là danh sách đầy đủ.)*

**Liên tưởng:** Thợ may đo người trước khi cắt vải, và cho khách thử áo nhiều lần trước khi may xong.

---

## 7. Danh sách kiểm tra nhanh cho sinh viên

Trước khi nộp một màn hình thiết kế, tự hỏi:

- [ ] Người dùng có biết hệ thống đang làm gì sau mỗi lần bấm? (3.1)
- [ ] Chữ và biểu tượng có quen thuộc với người dùng chưa? (3.2)
- [ ] Bấm nhầm thì có đường thoát hoặc hoàn tác? (3.3)
- [ ] Cùng một việc có luôn cùng một cách làm? (3.4)
- [ ] Hành động nguy hiểm có được bảo vệ, và không bị hỏi xác nhận quá mức? (3.5)
- [ ] Người dùng có phải nhớ thứ mà màn hình có thể hiện ra giúp? (3.6)
- [ ] Đã bỏ hết thông tin thừa? (3.8)
- [ ] Thông báo lỗi có nói rõ sai gì và sửa thế nào? (3.9)
- [ ] Các nút bấm có đủ lớn và đủ xa nhau? (4.1, 5.4a)
- [ ] Chữ có đủ tương phản với nền? (5.4c)
- [ ] Dùng bàn phím có thấy mình đang ở đâu? (5.4b)

---

## 8. Bài tập gợi ý

1. Chọn một app bạn hay dùng. Tìm **một** chỗ vi phạm và **một** chỗ làm tốt trong 10 nguyên tắc Nielsen. Chụp màn hình và giải thích.
2. Lấy một biểu mẫu đăng ký. Viết lại ba thông báo lỗi theo nguyên tắc 3.9.
3. Đo kích thước các nút trên một trang web bằng công cụ dành cho nhà phát triển của trình duyệt (DevTools). Nút nào dưới 24 × 24 điểm ảnh CSS và có bị ngoại lệ cứu không?

---

## 9. Nguồn và độ tin cậy

### Đã tra trong lần soạn này

| Nội dung | Nguồn |
|---|---|
| 10 nguyên tắc Nielsen, lịch sử 1990 và 1994, việc cập nhật tên | NN/g: https://www.nngroup.com/articles/ten-usability-heuristics/ |
| Trích dẫn học thuật của Nielsen | Nielsen & Molich (1990), hội nghị CHI (Computer-Human Interaction, tương tác người–máy); Nielsen (1994), CHI '94, trang 152–158 |
| WCAG 2.2: trạng thái Recommendation, ngày công bố, khuyến nghị dùng 2.2 | https://www.w3.org/TR/WCAG22/ và https://www.w3.org/WAI/standards-guidelines/wcag/ |
| WCAG 2.2 thêm 9 tiêu chí; tiêu chí 2.4.11 | https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22 |
| Tiêu chí 2.5.8 (24 × 24 điểm ảnh CSS, mức AA, các ngoại lệ) | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html |
| ISO 9241-210 (phiên bản 2019) | https://www.iso.org/standard/77520.html |
| Bốn nguyên tắc thiết kế lấy con người làm trung tâm (bản 2010) | Trích lại trong bài báo https://arxiv.org/pdf/2510.10382 (nguồn thứ cấp) |

### Chưa đối chiếu (kiến thức nền của người soạn)

- Định luật Fitts, định luật Hick, thuyết Gestalt, thứ bậc thị giác.
- Bốn nhóm POUR và các mức tương phản 4,5:1 và 3:1.
- Phần "ví dụ xấu / ví dụ tốt" ở mục 3 là ví dụ minh họa do người soạn tự đặt, **không phải** ví dụ trích từ NN/g.

### Tài liệu nên đọc thêm (chưa mở đọc nội dung trong lần soạn này)

- Apple Human Interface Guidelines: https://developer.apple.com/design/
- Material Design 3: https://m3.material.io/
- Sách nền thường được nhắc: *The Design of Everyday Things* (Don Norman), *Don't Make Me Think* (Steve Krug). Chưa tra lại ấn bản.

### Nguồn có vẻ mâu thuẫn hoặc cần lưu ý

- NN/g đã cập nhật tên các nguyên tắc so với bản 1994. Nếu tài liệu khác ghi tên hơi khác thì hãy lấy bản trên trang NN/g làm chuẩn.
- ISO/IEC 40500:2025 (việc WCAG 2.2 được ISO duyệt) chỉ xuất hiện ở một trang thứ cấp, nên tài liệu này **không** khẳng định.
