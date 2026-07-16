# Báo cáo rà soát lỗi tiềm ẩn - AutoScoring / REduX

Ngày rà soát: 2026-07-12

## Trạng thái xử lý sau rà soát

Đã xử lý trong đợt này:

- Giữ chức năng xuất Excel bằng `xlsx`, nhưng chuyển `xlsx` sang dynamic import để không nằm trong initial popup bundle.
- Sanitize dữ liệu trước khi ghi Excel để giảm rủi ro formula injection và ký tự điều khiển.
- Siết background `FETCH` proxy: chỉ cho phép GitHub host hợp lệ, chỉ `GET/HEAD`, lọc header, kiểm tra sender.
- Bỏ permission `declarativeNetRequest` khỏi manifest vì GitHub download đã đi qua background proxy.
- Chuyển danh sách học viên từ key global `classStudentList` sang schema theo lớp `classStudentLists[classId]`, có migration mềm từ dữ liệu cũ.
- Sửa bulk grading để thống kê số bài thành công và số bài lỗi, không còn báo hoàn thành chung chung khi có lỗi.
- Validate/normalize Supabase URL và encode filter query.
- Cập nhật metadata extension/package và default Gemini model.
- Tạo `src/core/constants.ts` để gom app metadata, AI defaults, API endpoints, storage keys, prompt mặc định, tiêu chí mặc định và các message nghiệp vụ dùng lại.
- Chuyển các hardcode quan trọng ở core/services/background/storage sang dùng constants thay vì chuỗi rải rác.

Chưa xử lý triệt để trong đợt này:

- `host_permissions` vẫn giữ `<all_urls>` để không phá tính năng custom AI/API URL. Phần nguy hiểm nhất là background proxy đã được allowlist.
- Chưa thêm fixture/unit test cho scraper DOM LMS.
- `xlsx` vẫn còn cảnh báo audit upstream, nhưng đã được giữ theo yêu cầu và giảm rủi ro ở lớp sử dụng.
- Một số UI label/copy nằm trực tiếp trong JSX vẫn còn hardcode. Các chuỗi nghiệp vụ/prompt/storage/config chính đã được gom; nếu muốn i18n toàn diện, nên tách tiếp toàn bộ UI text theo từng tab.

## Tóm tắt điều hành

Dự án hiện build và kiểm tra TypeScript thành công:

- `npm run compile`: pass
- `npm run build`: pass
- `npm ls --depth=0`: dependency tree hợp lệ
- `npm audit --omit=dev`: có 1 cảnh báo bảo mật mức `high` ở dependency runtime `xlsx`

Các rủi ro chính không nằm ở lỗi biên dịch TypeScript, mà nằm ở bảo mật extension, đồng bộ dữ liệu, nguy cơ mất/nghi sai dữ liệu giữa các lớp, dependency xuất Excel, hiệu năng popup, và độ mong manh của scraper phụ thuộc DOM LMS.

## Phát hiện chi tiết

### 1. High - Dependency `xlsx@0.18.5` có lỗ hổng mức high và npm báo không có bản fix trực tiếp

Vị trí:

- `package.json:23`
- `src/core/excelExporter.ts:1`
- `src/core/excelExporter.ts:4`
- `src/core/excelExporter.ts:12`

Kết quả `npm audit --omit=dev`:

- `xlsx *`
- `Severity: high`
- `Prototype Pollution in sheetJS`
- `SheetJS Regular Expression Denial of Service (ReDoS)`
- `No fix available`

Tác động:

- `xlsx` là dependency runtime, được dùng trong chức năng xuất Excel, không chỉ là dev dependency.
- Nếu dữ liệu đưa vào Excel đến từ nội dung LMS, ghi chú hoặc thông tin học viên có chuỗi bất thường, cần xem đây là bề mặt tấn công từ dữ liệu đầu vào.

Khuyến nghị:

- Đánh giá thay thế `xlsx` bằng thư viện khác như ExcelJS, hoặc dùng giải pháp export CSV nếu yêu cầu định dạng đơn giản.
- Nếu chưa đổi ngay, cần giới hạn/sanitize dữ liệu trước khi đưa vào exporter, và tránh import/parse file Excel từ nguồn không tin cậy.

### 2. High - Background `FETCH` proxy chấp nhận message và URL tùy ý, trong khi extension có `<all_urls>`

Vị trí:

- `entrypoints/background.ts:2`
- `entrypoints/background.ts:6`
- `wxt.config.ts:16`

Hiện trạng:

- Background listener nhận `message.type === "FETCH"` rồi gọi `fetch(url, options)` trực tiếp.
- Manifest cấp `host_permissions: ["<all_urls>"]`.
- Chưa validate URL, method, header, sender, hoặc allowlist domain.

Tác động:

- Đây là một privileged fetch proxy. Nếu một extension context hoặc content script bị lỗi, bị XSS, hoặc bị điều khiển gián tiếp, nó có thể dùng quyền extension để fetch đến bất kỳ URL nào mà manifest cho phép.
- Rủi ro tăng vì request có thể kèm header tùy ý trong `options`.

Khuyến nghị:

- Giới hạn allowlist domain cần thiết: `api.github.com`, `codeload.github.com`, `raw.githubusercontent.com`, và các provider AI/Supabase nếu thật sự cần proxy.
- Validate bằng `new URL(url)`, chỉ cho `https:`, trừ các local endpoint được cấu hình rõ ràng.
- Kiểm tra `sender.id === chrome.runtime.id`; nếu message đến từ content script, kiểm tra `sender.url`/`sender.origin` nằm trong domain LMS được phép.
- Không truyền nguyên `options` từ caller; chỉ cho phép method/header cần thiết.

### 3. Medium - Permission và DNR rộng hơn nhu cầu

Vị trí:

- `wxt.config.ts:11-17`
- `public/rules.json:9`
- `public/rules.json:37`

Hiện trạng:

- Extension xin `declarativeNetRequest` và `<all_urls>`.
- `rules.json` sửa CORS response header cho GitHub raw/codeload.

Tác động:

- Quyền rộng làm tăng rủi ro khi có bug trong popup/content script.
- Sửa response header CORS là giải pháp nhạy cảm, nên được giới hạn tối thiểu.

Khuyến nghị:

- Thu hẹp `host_permissions` về các domain thật sự cần.
- Nếu background proxy đã xử lý download GitHub, cần xem còn cần DNR CORS bypass không.
- Tách permission cho AI provider/custom URL nếu có thể, hoặc yêu cầu người dùng grant theo domain.

### 4. Medium - Dữ liệu danh sách lớp lưu bằng key global `classStudentList`, dễ ghi đè/mất context giữa các lớp

Vị trí:

- `src/components/ClassListTab.tsx:40`
- `src/components/ClassListTab.tsx:68`
- `src/components/ClassListTab.tsx:181`
- `src/components/ClassListTab.tsx:201`
- `src/components/ClassListTab.tsx:261`
- `src/components/AutoGraderTab.tsx:286`
- `src/components/SingleGraderTab.tsx:250`

Hiện trạng:

- Danh sách học viên lớp học được lưu chung vào `chrome.storage.local` key `classStudentList`.
- `CareTab` đã lưu theo `careStudents[classId]`, nhưng `ClassListTab` chưa namespace theo `classId`.

Tác động:

- Khi giáo viên chuyển lớp, quét lớp mới có thể ghi đè danh sách lớp cũ.
- Kết quả chấm có thể merge sai học viên nếu trùng `studentId` hoặc submission URL.
- Nút xóa danh sách lớp hiện tại thực tế remove toàn bộ `classStudentList`, không chỉ lớp hiện tại.

Khuyến nghị:

- Đổi schema thành `classStudentLists: Record<classId, Student[]>`.
- Khi đọc/ghi/xóa phải dùng `activeClassId`.
- Migration: nếu tồn tại `classStudentList` cũ, đưa vào class hiện tại hoặc hiển thị thông báo import.

### 5. Medium - Bulk grading báo hoàn thành ngay cả khi từng bài bị lỗi

Vị trí:

- `src/components/AutoGraderTab.tsx:214`
- `src/components/AutoGraderTab.tsx:335`
- `src/components/AutoGraderTab.tsx:371`

Hiện trạng:

- `handleGradeSingleRow` bắt lỗi nội bộ và set row status `error`, nhưng không trả về kết quả thành công/thất bại.
- `handleBulkGrading` vẫn `gradedCount++` sau mỗi lần `await handleGradeSingleRow(i)` và cuối cùng hiển thị thông báo hoàn thành.

Tác động:

- Người dùng có thể hiểu nhầm là tất cả bài đã chấm thành công.
- Báo cáo lớp có thể thiếu điểm trong khi UI lại báo đã hoàn tất.

Khuyến nghị:

- Cho `handleGradeSingleRow` return `{ ok: boolean; error?: string }`.
- Bulk grading cần đếm `successCount`, `failedCount`, và hiển thị tổng kết riêng.
- Nếu cần, retry từng bài lỗi do rate limit/network.

### 6. Medium - Default Gemini model có nguy cơ sai/không tồn tại với tài khoản người dùng

Vị trí:

- `src/core/AppContext.tsx:40`
- `src/components/SettingsTab.tsx:73`
- `src/components/SettingsTab.tsx:263`

Hiện trạng:

- Default model đang là `gemini-3.5-flash`.
- Nếu provider không có model này, test connection và chấm bài sẽ fail ngay trong lần cấu hình đầu.

Tác động:

- Cài đặt mới dễ rơi vào trạng thái "AI chưa sẵn sàng" dù người dùng có API key hợp lệ.

Khuyến nghị:

- Dùng model default đã xác minh trong tài liệu provider tại thời điểm release.
- Tốt hơn: khi người dùng nhập API key, gọi API list models và cho chọn model khả dụng.

### 7. Medium - Supabase query nối chuỗi trực tiếp, thiếu encode/validate

Vị trí:

- `src/services/supabaseService.ts:28`
- `src/services/supabaseService.ts:56`
- `src/services/supabaseService.ts:88`
- `src/services/supabaseService.ts:151`
- `src/services/supabaseService.ts:182`

Hiện trạng:

- URL REST được ghép trực tiếp từ `config.supabaseUrl`, `classId`, và conflict column string.
- `classId` hiện lấy từ regex số ở nhiều chỗ, nhưng service vẫn chưa tự bảo vệ nếu được gọi từ nơi khác.

Tác động:

- Nếu về sau class id/chapter/session có ký tự đặc biệt và được đưa vào query, request Supabase có thể lỗi hoặc query sai.

Khuyến nghị:

- Normalize `supabaseUrl` bằng `new URL()`, chỉ chấp nhận `https://*.supabase.co` nếu dùng Supabase cloud.
- Encode giá trị query bằng `encodeURIComponent`.
- Tạo helper build REST URL thay vì nối chuỗi lặp lại.

### 8. Medium - Scraper phụ thuộc DOM/label text, dễ vỡ khi LMS đổi giao diện

Vị trí:

- `entrypoints/classListScraper.ts:12-31`
- `entrypoints/classListScraper.ts:72-88`
- `entrypoints/submissionsScraper.ts:44-56`
- `entrypoints/submissionsScraper.ts:83-90`
- `entrypoints/careScraper.ts:36-48`
- `entrypoints/lmsScraper.ts:61-88`

Hiện trạng:

- Các scraper tìm cột bằng text header và selector chung như `active`, `selected`, `[style*="background"]`.
- Chưa có fixture/test DOM cho các trang LMS mẫu.

Tác động:

- LMS thay đổi class/header nhỏ cũng có thể làm quét sai học viên, sai bài tập, hoặc mapping nhầm đề bài.
- Sai mapping trong hệ thống chấm điểm tự động có tác động nghiệp vụ lớn.

Khuyến nghị:

- Thêm test fixture HTML cho mỗi loại trang: class list, submissions, care, exercise detail.
- Tách logic parse DOM thành function thuần để unit test.
- Ưu tiên data attributes/stable selectors nếu LMS có.

### 9. Low/Medium - Popup bundle lớn, có thể mở chậm

Vị trí:

- Kết quả `npm run build`

Hiện trạng:

- Build cảnh báo chunk popup minified `752.26 kB`, vượt ngưỡng 500 kB.
- Runtime deps gồm React, marked, DOMPurify, JSZip, xlsx trong một popup chunk lớn.

Tác động:

- Popup extension có thể mở chậm trên máy yếu.
- Memory footprint cao hơn cần thiết.

Khuyến nghị:

- Dynamic import cho `xlsx`, `jszip`, `marked/DOMPurify` theo tab/chức năng cần dùng.
- Tách exporter và grading-heavy services khỏi initial popup load.

### 10. Low - Metadata extension còn để default/generic

Vị trí:

- `package.json:2`
- `package.json:3`
- `entrypoints/popup/index.html:6`
- `.output/chrome-mv3/manifest.json`

Hiện trạng:

- Package name là `wxt-react-starter`.
- Description là `manifest.json description`.
- Popup title là `Default Popup Title`.

Tác động:

- Không làm hỏng logic, nhưng ảnh hưởng chất lượng phát hành, extension manager, và cảm nhận sản phẩm.

Khuyến nghị:

- Đổi `package.json` name/description.
- Đổi `<title>` popup và/hoặc cấu hình default title/action trong WXT.

## Kiểm tra đã thực hiện

- `npm run compile`: pass
- `npm run build`: pass, có warning chunk size
- `npm ls --depth=0`: pass
- `npm audit --omit=dev`: fail audit vì có 1 high vulnerability ở `xlsx`

## Ưu tiên xử lý đề xuất

1. Xử lý `xlsx` hoặc giảm rủi ro exporter.
2. Thu hẹp background `FETCH` proxy và `<all_urls>`.
3. Đổi `classStudentList` sang storage theo `classId`.
4. Sửa bulk grading để báo đúng success/failure.
5. Thêm fixture tests cho scraper DOM.
6. Code-split popup bundle.
7. Cập nhật metadata sản phẩm.
