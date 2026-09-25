import { ApiResponse } from './studentFilter';

export interface LearningStatsParams {
  classId: string;
  courseId: string;
  token: string;
}

/**
 * Lấy dữ liệu chỉ số học tập theo lớp + môn học.
 * Hiện tại dùng dữ liệu mẫu (template-data.json) do chưa có endpoint thật —
 * token đã được truyền sẵn vào params để cắm API thật (Authorization: Bearer token)
 * ngay khi có endpoint chính thức theo classId + courseId.
 */
export async function fetchLearningStats(params: LearningStatsParams): Promise<ApiResponse> {
  const url = chrome.runtime.getURL('template-data.json');
  const res = await fetch(url);
  const raw: ApiResponse = await res.json();
  return raw;
}
