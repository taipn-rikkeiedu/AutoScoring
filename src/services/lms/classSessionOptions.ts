/**
 * Danh sách lớp / môn học cho dropdown "Thống kê chỉ số học tập".
 * TODO: thay bằng API thật khi có endpoint liệt kê lớp/môn.
 */

export interface ClassOption {
  classId: string;
  className: string;
}

export interface CourseOption {
  courseId: string;
  courseName: string;
}

export const MOCK_CLASS_OPTIONS: ClassOption[] = [
  { classId: "142", className: "HCM-KS25-CNTT6_HK2" },
];

export const MOCK_COURSE_OPTIONS: CourseOption[] = [
  { courseId: "224", courseName: "[IT105-K25] Phân tích & thiết kế hệ thống" },
];
