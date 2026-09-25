# Kế hoạch triển khai: Lọc dữ liệu học viên từ API response

## 1. Bối cảnh

Extension gọi 1 API trả về báo cáo lớp học (class report), response có cấu trúc lồng nhau nhiều cấp (`data.studentsInClass[].student`, `.finalResult`, `.resultTest[]...`). Extension chỉ cần 8 field, không cần giữ nguyên cấu trúc gốc.

**Input:** JSON response từ API (xem mẫu cấu trúc ở mục 3).
**Output:** Mảng object phẳng, mỗi phần tử = 1 học viên, đúng 8 field.

## 2. Mục tiêu / Acceptance Criteria

- [ ] Hàm `filterStudents(raw)` nhận response gốc, trả về mảng `FilteredStudent[]`.
- [ ] Không crash nếu 1 vài bản ghi thiếu field (dùng optional chaining, không dùng non-null assertion `!`).
- [ ] Có type/interface rõ ràng cho cả input và output (TypeScript).
- [ ] Có unit test cho: dữ liệu đầy đủ, dữ liệu thiếu field con, mảng `studentsInClass` rỗng.
- [ ] Không phá vỡ dữ liệu gốc (pure function, không mutate `raw`).

## 3. Schema

### Input (rút gọn — chỉ phần liên quan)

```typescript
interface ApiResponse {
  data: {
    studentsInClass: StudentInClass[];
  };
}

interface StudentInClass {
  submissionRate: number;
  attendanceRate: number;
  elearningProgress: number;
  student: {
    studentCode: string;
    fullName: string;
    phone: string;
    email: string;
    dateOfBirth: string; // ISO date string, ví dụ "2007-05-04"
  };
  // các field khác (finalResult, resultTest...) — KHÔNG cần dùng, bỏ qua
}
```

### Output

```typescript
interface FilteredStudent {
  studentCode: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  submissionRate: number;
  attendanceRate: number;
  elearningProgress: number;
}
```

## 4. Vị trí file trong project (đề xuất, điều chỉnh theo cấu trúc thực tế của repo)

```
src/
  lib/
    student-filter.ts       # hàm filterStudents() + types
  lib/
    student-filter.test.ts  # unit test
```

## 5. Implementation

```typescript
// src/lib/student-filter.ts

export interface ApiResponse {
  data: {
    studentsInClass: StudentInClass[];
  };
}

export interface StudentInClass {
  submissionRate: number;
  attendanceRate: number;
  elearningProgress: number;
  student: {
    studentCode: string;
    fullName: string;
    phone: string;
    email: string;
    dateOfBirth: string;
  };
}

export interface FilteredStudent {
  studentCode: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  submissionRate: number;
  attendanceRate: number;
  elearningProgress: number;
}

/**
 * Lọc response API gốc, chỉ giữ 8 field cần thiết cho mỗi học viên.
 * Bỏ qua (không throw) các bản ghi thiếu object `student`.
 */
export function filterStudents(raw: ApiResponse): FilteredStudent[] {
  const list = raw?.data?.studentsInClass ?? [];

  return list
    .filter((s) => !!s?.student)
    .map((s) => ({
      studentCode: s.student.studentCode ?? "",
      fullName: s.student.fullName ?? "",
      phone: s.student.phone ?? "",
      email: s.student.email ?? "",
      dateOfBirth: s.student.dateOfBirth ?? "",
      submissionRate: s.submissionRate ?? 0,
      attendanceRate: s.attendanceRate ?? 0,
      elearningProgress: s.elearningProgress ?? 0,
    }));
}
```

## 6. Cách gọi trong extension (WXT)

Gọi ngay sau khi nhận response, tại nơi bạn đang thực hiện `fetch`:

```typescript
import { filterStudents, type ApiResponse } from "@/lib/student-filter";

const res = await fetch(apiUrl);
const raw: ApiResponse = await res.json();
const filtered = filterStudents(raw);
```

**Lưu ý về vị trí gọi (agent cần xác nhận với dev trước khi code):**
- Nếu gọi trong **background script**: kết quả `filtered` cần gửi sang UI qua `browser.runtime.sendMessage` hoặc lưu vào `browser.storage.local` — cả hai đều yêu cầu dữ liệu serializable (mảng object phẳng như trên đã đạt).
- Nếu gọi trong **content script**: kiểm tra CORS của API — nếu bị chặn, phải chuyển fetch sang background script rồi message lại.
- Nếu gọi trong **popup**: dữ liệu mất khi đóng popup, cân nhắc lưu tạm vào `storage.session` nếu cần giữ qua nhiều lần mở.

## 7. Test cases bắt buộc

| Case | Input | Kỳ vọng |
|---|---|---|
| Dữ liệu đầy đủ | 1 học viên, đủ field | Trả về đúng 1 object, đúng 8 field, giá trị khớp |
| Thiếu `student` | 1 phần tử `studentsInClass` không có key `student` | Bị loại khỏi kết quả, không throw |
| Thiếu field con (vd. thiếu `email`) | `student.email` là `undefined` | Trả về `email: ""`, không throw |
| `studentsInClass` rỗng | `data.studentsInClass = []` | Trả về `[]` |
| `data` thiếu hẳn | `raw = {}` | Trả về `[]`, không throw |

## 8. Ngoài phạm vi (Out of scope)

- Không xử lý `finalResult`, `resultTest`, `classInfo`, `course` — các field này không được yêu cầu lọc ra.
- Không xử lý retry/caching cho request API — thuộc phần networking, không thuộc hàm filter này.
- Không format lại `dateOfBirth` (giữ nguyên chuỗi ISO gốc từ API).

## 9. Tham chiếu

Logic lọc dựa trên phân tích cấu trúc thực tế của response mẫu (`template-datat.json`, 42 học viên, 660KB) đã thực hiện trong phiên làm việc trước — không phải giả định, đã kiểm chứng trực tiếp trên dữ liệu thật.
