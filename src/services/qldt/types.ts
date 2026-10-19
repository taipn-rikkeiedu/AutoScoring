/** Lựa chọn trong ô chọn (lớp, môn, buổi). */
export interface QldtOption {
  value: string;
  label: string;
}

export interface QldtClass {
  id: number | string;
  name: string;
  studentCount?: number;
  courses?: { id: number | string; name: string }[];
}

export interface QldtSession {
  id: string;
  name: string;
  position: number;
}

/** Response thô (thu thập API, chẩn đoán). */
export interface QldtRawResponse {
  url: string;
  status: number;
  text: string;
}
