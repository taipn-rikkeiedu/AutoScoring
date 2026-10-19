import type { QldtClient } from './client';

/** Dữ liệu giám sát học tập của lớp: điểm thi / tiến độ, điểm danh, đơn xin nghỉ. */
export class MonitorService {
  constructor(private readonly client: QldtClient) {}

  /** Điểm thi (resultTest), tỉ lệ nộp BTVN, chuyên cần… của cả lớp theo môn. */
  classDashboard(classId: string, courseId: string): Promise<any> {
    return this.client.get(`/classes/dashboard/${classId}/${courseId}`);
  }

  /** Lịch sử điểm danh của lớp theo môn: { 'yyyy-mm-dd': [ca học { period, attendanceDetail[] }] }. */
  async classAttendance(classId: string, courseId: string): Promise<Record<string, any[]>> {
    return (await this.client.get<Record<string, any[]>>(`/attendance?class_id=${classId}&course_id=${courseId}`)) || {};
  }

  /** Đơn xin nghỉ của lớp (mọi môn, mọi thời gian) — nối với điểm danh qua attendanceDetailId. */
  async classLeaves(classId: string): Promise<any[]> {
    const list = await this.client.get<any>(`/request-leave?classId=${classId}`);
    return Array.isArray(list) ? list : [];
  }
}
