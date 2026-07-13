---
name: security-compliance
description: Quy định bảo mật thông tin, nghiêm cấm hardcode các khóa API Keys và GitHub Tokens
---

# 🔒 Kỹ năng tuân thủ bảo mật thông tin (Security Compliance)

Kỹ năng này bắt buộc tất cả các AI Agent phải tuân thủ nghiêm ngặt để bảo vệ an toàn cho thông tin cá nhân và tài khoản của người dùng.

## 1. Nghiêm cấm Hardcode API Keys & Tokens

- **TUYỆT ĐỐI KHÔNG** được nhúng trực tiếp API Key của Gemini, OpenAI, DeepSeek, Supabase URL/Anon Key hoặc GitHub Personal Access Token vào bất kỳ tệp mã nguồn nào trong thư mục dự án.
- Mọi API key/credentials phải được lấy động từ bộ nhớ cấu hình ứng dụng:
  `chrome.storage.local.get` hoặc thông qua Context của ứng dụng (`useApp()`).

## 2. Bảo mật khi ghi nhật ký (Logging Security)

- Trong quá trình phát triển, kiểm thử hay khi ứng dụng ném ra ngoại lệ (exception):
  - **KHÔNG** in các khóa bí mật (API keys, tokens) ra cửa sổ Console log (`console.log`, `console.warn`, `console.error`).
  - Phải thực hiện che (mask) các thông tin nhạy cảm trước khi in log (ví dụ: chỉ hiện 4 ký tự cuối: `****abcd`).

## 3. Quản lý Git & Đẩy code lên máy chủ Git an toàn

- Trước khi thực hiện lệnh commit và push, luôn chạy lệnh kiểm tra các file không được theo dõi:
  `git status`
- Đảm bảo các tệp tin lưu trữ tạm thời, file build `.output/`, hoặc các file chứa thông tin cấu hình nhạy cảm khác đã được khai báo chính xác trong file `.gitignore` để tránh bị đẩy lên GitHub công khai.
- Nếu phát hiện khóa API vô tình bị đẩy lên repository, lập tức cảnh báo người dùng thực hiện Thu hồi khóa (Revoke) ngay trên trang quản trị nhà cung cấp dịch vụ (Google Cloud Console, OpenAI API Dashboard, v.v.).
