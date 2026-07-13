# 📋 Quy tắc dự án (Workspace Rules)

Quy tắc này áp dụng cho tất cả các AI Agents khi tham gia sửa đổi hoặc phát triển dự án này.

## Quy trình cập nhật phiên bản (Version Bumping)

Mỗi khi bạn **thêm tính năng mới (Feature)** hoặc **sửa lỗi (Bug fix)**, bạn **BẮT BUỘC** phải thực hiện các bước sau:

1. **Cập nhật phiên bản ở 2 nơi chính**:
   - [package.json](file:///s:/WorkSpace/RikkeiEducation/AutoScoring/package.json): Cập nhật trường `"version"`.
   - [constants.ts](file:///s:/WorkSpace/RikkeiEducation/AutoScoring/src/core/constants.ts): Cập nhật `APP_INFO.version` (nguồn chính nạp version cho manifest của WXT Chrome Extension).

2. **Ghi nhận thay đổi vào Changelog & Nhật ký sửa lỗi**:
   - Thêm thông tin mô tả chi tiết các tính năng hoặc sửa lỗi vừa thực hiện vào [CHANGELOG.md](file:///s:/WorkSpace/RikkeiEducation/AutoScoring/CHANGELOG.md) dưới mục phiên bản mới theo định dạng hiện tại.
   - Nếu là sửa lỗi (Bug fix), ghi chép lại các bug đã khắc phục (triệu chứng, nguyên nhân, cách xử lý) vào tệp Nhật ký sửa lỗi `bugfix_log.md` trong thư mục Artifacts của phiên làm việc.

3. **Biên dịch và đóng gói thử nghiệm**:
   - Chạy lệnh `npm run build` để kiểm tra TypeScript và đảm bảo file manifest được sinh ra với thông tin phiên bản mới nhất chính xác.
