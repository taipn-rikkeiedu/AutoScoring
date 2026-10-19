/** Lỗi phiên đăng nhập / quyền QLĐT — giao diện hiển thị kèm hướng dẫn đăng nhập lại. */
export class QldtAuthError extends Error {}

export const QLDT_MESSAGES = {
  noSession: 'Chưa có phiên đăng nhập QLĐT. Hãy mở qldt.rikkei.edu.vn và đăng nhập một lần, sau đó dùng được ở mọi trang.',
  allExpired: 'Phiên đăng nhập QLĐT đã hết hạn. Hãy mở qldt.rikkei.edu.vn, đăng nhập lại (hoặc tải lại trang) rồi bấm Thử lại.',
  expired: 'Phiên đăng nhập QLĐT đã hết hạn. Hãy mở qldt.rikkei.edu.vn, đăng nhập lại rồi thử lại.',
  forbiddenRead: 'Tài khoản QLĐT đang đăng nhập không có quyền xem dữ liệu này.',
  forbiddenWrite: 'Tài khoản QLĐT đang đăng nhập không có quyền sửa dữ liệu này.'
} as const;
