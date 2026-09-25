# 🎨 Rikkei Education - Premier Design System (Bản Chuyên Sâu)
*Tài liệu quy chuẩn thiết kế, UI/UX, và thư viện Component dành cho Frontend Developer.*

---

## 1. Khởi Tạo Hệ Thống CSS Biến (CSS Tokens)

Mọi dự án Rikkei Education khi khởi tạo phải copy đoạn `:root` này vào file CSS chung nhất (ví dụ: `style.css` hoặc `globals.css`) để đảm bảo hệ thống màu sắc nhất quán. Tuyệt đối không dùng mã HEX trực tiếp trong các thẻ CSS con.

```css
:root {
  /* Màu Thương Hiệu */
  --primary-red: #c41230;     
  --primary-red-hover: #a00f27;

  /* Màu Chức Năng (Accent Colors) */
  --accent-blue: #2563eb;     /* Tương tác, thông báo, Rank 1-2 */
  --accent-green: #16a34a;    /* Thành công, điểm cộng, Rank 3-4 */
  --accent-gold: #d97706;     /* Thưởng, vinh danh, Rank 5-6 */
  --accent-purple: #7e22ce;   /* Cấp quản lý, Brand, Rank 7-8 */

  /* Màu Nền (Backgrounds) */
  --bg-body: #f8fafc;         /* Nền tổng thể của toàn màn hình */
  --bg-card: #ffffff;         /* Nền của Card nội dung */
  --bg-subtle: #f1f5f9;       /* Nền cho Sidebar, Table Header, Hover States */

  /* Viền (Borders & Dividers) */
  --border-color: #e2e8f0;    /* Viền đường kẻ mỏng */
  --border-card: #cbd5e1;     /* Viền bọc ngoài Card */

  /* Nghệ Thuật Chữ (Typography) */
  --text-heading: #0f172a;    /* H1, H2, Tiêu đề Card (Đen tuyền) */
  --text-main: #334155;       /* Text nội dung (Xám đậm) */
  --text-muted: #64748b;      /* Ghi chú, phụ đề */
  --text-dim: #94a3b8;        /* Placeholder, Icon mờ */

  /* Font Chữ */
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --font-heading: 'Inter', sans-serif;
  --font-mono: 'Menlo', 'Consolas', monospace; /* Dành cho Số tiền, ID */

  /* Đổ Bóng & Chiều Sâu (Shadows) */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

body {
  font-family: var(--font-body);
  background-color: var(--bg-body);
  color: var(--text-main);
  line-height: 1.5;
}
```

---

## 2. Thư Viện Linh Kiện Giao Diện (Core Components)

### 2.1. Thẻ Bồng Bềnh (Hoverable Cards)
Được sử dụng ở: *Dashboard, Danh sách Khóa học, Nội quy Sinh Viên, Cổng thông tin.*

**Cấu trúc HTML/JSX Mẫu:**
```jsx
<div className="premium-card">
  <div className="card-icon-box">
    <i className="fa-solid fa-graduation-cap"></i>
  </div>
  <div className="card-content">
    <h4>Giảng Viên Cứng</h4>
    <p>Chi tiết tiêu chuẩn và đãi ngộ</p>
  </div>
</div>
```

**Mã CSS Quy Chuẩn:**
```css
.premium-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  /* Quan trọng: Cubic-bezier tạo cảm giác vật lý khi di chuột */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
}

.premium-card:hover {
  transform: translateY(-4px); /* Thẻ nổi lên */
  box-shadow: var(--shadow-lg); /* Đổ bóng mạnh hơn */
  border-color: var(--accent-blue); /* Viền bắt sáng */
}

/* Hiệu ứng Icon nảy (Micro-interaction) */
.card-icon-box {
  width: 48px; height: 48px; border-radius: 12px;
  background: var(--bg-subtle); color: var(--accent-blue);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; transition: transform 0.3s ease;
}

.premium-card:hover .card-icon-box {
  transform: scale(1.1) rotate(-5deg); /* Nảy icon */
  background: var(--accent-blue);
  color: white;
}
```

### 2.2. Nhãn Trạng Thái & Cấp Bậc (Badges / Tags)
Badges dùng để thể hiện các Rank, trạng thái Đạt/Trượt.
Quy tắc: Nền màu cực nhạt (10-15%) và chữ màu đậm tương ứng.

```css
.tag {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-blue { background: #dbeafe; color: #1d4ed8; }
.tag-green { background: #dcfce7; color: #15803d; }
.tag-gold { background: #fef3c7; color: #b45309; }
.tag-purple { background: #f3e8ff; color: #7e22ce; }
.tag-gray { background: #f1f5f9; color: #64748b; }
```

### 2.3. Bảng Ma Trận & Thông Số Lương (Data Matrix Table)
Bảng thông số dài (nhiều hơn 4 cột) phải dùng chuẩn `rank-matrix-table`.

**Mã CSS Quy Chuẩn:**
```css
.rank-matrix-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 16px;
  overflow-x: auto; /* Sinh thanh cuộn ngang khi màn hình nhỏ */
}

.rank-matrix-table {
  width: 100%; border-collapse: collapse; min-width: 800px;
}

/* Header in hoa, màu xám nhạt, viền đáy dày */
.rank-matrix-table thead {
  background: var(--bg-subtle);
  border-bottom: 2px solid var(--border-color);
}
.rank-matrix-table th {
  padding: 16px 14px; font-weight: 800; color: var(--text-muted);
  text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;
}

/* Các hàng nổi mốc chỉ định (Hover tracking) */
.rank-matrix-table tbody tr {
  border-bottom: 1px solid var(--border-card);
  transition: background 0.2s;
}
.rank-matrix-table tbody tr:hover {
  background: rgba(0, 0, 0, 0.015);
  box-shadow: inset 4px 0 0 var(--accent-blue); /* Thanh điều hướng màu xanh mép trái */
}

/* Tiền tệ & Số học */
.rank-matrix-table td.col-money {
  color: var(--accent-blue); font-weight: 700; font-family: var(--font-mono);
}
```

---

## 3. Hệ Thống Thanh Điều Hướng (Navigation & Topbar)

### 3.1. Smart Sticky Topbar (Kính mờ)
Thanh Topbar điều hướng trên cùng luôn dính vào màn hình (Sticky) nhưng dùng công nghệ `backdrop-filter` để làm mờ nền (hiệu ứng kính mờ chuẩn iOS).

```css
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0; height: 60px;
  background: rgba(255, 255, 255, 0.85); /* Nền bán trong suốt */
  backdrop-filter: blur(12px); /* Hiệu ứng kính */
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  z-index: 1000;
  
  /* Hiệu ứng tự động ẩn khi cuộn xuống */
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.topbar-hidden { transform: translateY(-100%); }
```

### 3.2. Ô Tìm Kiếm Kèm Phím Tắt (⌘K Search Pill)
Thanh tìm kiếm hình viên thuốc, bắt sáng cực độ khi Focus.

```css
.topbar-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-subtle); border: 1px solid var(--border-color);
  border-radius: 20px; padding: 6px 12px; width: 240px; height: 38px;
  transition: all 0.2s ease;
}

.topbar-search:focus-within {
  width: 280px; /* Tự động phình to ra để nhập liệu */
  border-color: var(--accent-blue);
  background: var(--bg-card);
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1); /* Hào quang xanh (Focus Ring) */
}

.topbar-search kbd {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: 4px; padding: 0 6px; font-size: 11px;
  font-weight: 600; color: var(--text-muted); font-family: var(--font-mono);
}
```

---

## 4. Chuyển Động Dây Chuyền (Staggered Animations)

Khi render các trang danh sách (List / Grid), tuyệt đối không để các phần tử tải ra cứng nhắc. Sử dụng hiệu ứng `slideInUp` để tạo cảm giác trang web đang "tuôn chảy".

**Thêm bộ khung xương CSS này vào dự án:**
```css
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-entrance {
  opacity: 0; /* Giấu nó đi trước */
  animation: slideInUp 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
}

/* Áp dụng Staggered Delay bằng nth-child */
.stagger-grid > div:nth-child(1) { animation-delay: 0.1s; }
.stagger-grid > div:nth-child(2) { animation-delay: 0.2s; }
.stagger-grid > div:nth-child(3) { animation-delay: 0.3s; }
.stagger-grid > div:nth-child(4) { animation-delay: 0.4s; }
.stagger-grid > div:nth-child(5) { animation-delay: 0.5s; }
```

---

## 5. Quy Tắc Đáp Ứng Kích Thước (Responsive Breakpoints)

Luôn lập trình theo định hướng **Desktop-first / Fluid Grid**.

- **> 1200px (Desktop):** Lưới Grid chia làm 4 cột (vd: `grid-template-columns: repeat(4, 1fr)`).
- **992px - 1200px (Tablet Ngang):** 
  - Bẻ cột từ 4 xuống 2 (`grid-template-columns: repeat(2, 1fr)`).
  - Khóa (Ẩn) Menu Topbar, thay bằng Hamburger Menu.
- **< 768px (Mobile):**
  - Mọi Grid ép về 1 cột (`grid-template-columns: 1fr`).
  - Font size các Tiêu đề nhỏ lại 10%.
  - Bảng Data (`.rank-matrix-wrapper`) cho phép cuộn ngang (Scrollbar ẩn).
  - Toàn bộ Padding của `page-container` giảm từ 24px xuống còn 16px để tiết kiệm không gian.

```css
@media (max-width: 992px) {
  .topbar-nav { display: none; }
  .mobile-menu-btn { display: flex; }
}

@media (max-width: 768px) {
  .page-container { padding: 16px; }
  .premium-grid { grid-template-columns: 1fr; }
}
```

---

*Tài liệu này được biên soạn tự động để đồng bộ bộ nhận diện UI/UX của toàn bộ hệ sinh thái phần mềm Rikkei Education. Mọi dự án mới kế thừa codebase đều cần bám sát các tokens và classes này.*
