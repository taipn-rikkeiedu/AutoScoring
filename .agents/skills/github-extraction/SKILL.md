---
name: github-extraction
description: Quy trình tải, giải nén và trích xuất tệp nguồn từ GitHub repository để gửi cho AI chấm điểm
---

# 🐙 Kỹ năng trích xuất mã nguồn GitHub

Kỹ năng này hướng dẫn các AI cách tiếp cận và đọc mã nguồn của sinh viên từ GitHub một cách tối ưu, giảm thiểu sử dụng token và tránh giới hạn truy cập API (Rate Limit).

## 1. Chiến lược tải mã nguồn (Dual-Path Loading)

Khi tải mã nguồn từ một GitHub URL (ví dụ: `https://github.com/username/repo`):

1. **Cách 1: Tải tệp nén ZIP (Ưu tiên)**
   - Sử dụng endpoint Codeload của GitHub: `https://codeload.github.com/owner/repo/zip/refs/heads/branch`.
   - Lợi ích: Tải toàn bộ dự án trong 1 kết nối duy nhất, cực kỳ nhanh.
   - Xử lý: Đọc file ZIP trong bộ nhớ bằng thư viện `JSZip`.

2. **Cách 2: Quét cây thư mục Git Trees API (Dự phòng)**
   - Nếu link ZIP lỗi hoặc nhánh mặc định thay đổi, sử dụng REST API của GitHub để lấy cây thư mục: `https://api.github.com/repos/owner/repo/git/trees/branch?recursive=1`.
   - Lấy từng nội dung file cần thiết.

## 2. Quy tắc loại trừ tệp tin (Grader Ignore Rules)

Khi gửi mã nguồn cho AI chấm điểm, tuyệt đối không được đọc các tệp không cần thiết làm tràn Context Window và tốn kém chi phí token.

Các loại thư mục/tệp luôn phải loại trừ (định nghĩa trong `GRADER_IGNORE_DEFAULTS`):
- Thư mục build/dependency: `node_modules/`, `build/`, `dist/`, `target/`, `out/`, `bin/`.
- Môi trường ảo Python: `venv/`, `env/`, `Scripts/`, `Lib/`.
- Tệp khóa/tệp cấu hình hệ thống: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `composer.lock`, `.gitignore`.
- Thư mục cấu hình IDE: `.vscode/`, `.idea/`, `.git/`.
- Tệp tin nhị phân: Ảnh (`.png`, `.jpg`, `.gif`), tệp âm thanh/video, tệp thực thi (`.exe`, `.dll`).

## 3. Quản lý GitHub OAuth Token

- Sử dụng header `Authorization: token YOUR_TOKEN` khi gửi yêu cầu lên `api.github.com` để tránh bị giới hạn 60 requests/giờ của GitHub dành cho IP không danh tính.
- Token được người dùng cấu hình trong tab Cài đặt và lấy ra từ `chrome.storage.local`.
