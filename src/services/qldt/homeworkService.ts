import type { QldtClient } from './client';

/** Bài tập về nhà: đề của buổi, tiến độ làm bài của lớp, bài nộp của sinh viên. */
export class HomeworkService {
  constructor(private readonly client: QldtClient) {}

  /** Các đề bài tập của 1 buổi (mô tả, tiêu chí chấm, hướng dẫn). */
  async sessionHomework(sessionId: string): Promise<any[]> {
    return (await this.client.get<any[]>(`/homework/session/${sessionId}`)) || [];
  }

  /** SV của lớp kèm trạng thái làm bài từng buổi (sessionStudent: status, completedExercises). */
  async sessionStudents(classId: string, sessionId: string): Promise<any[]> {
    return (await this.client.get<any[]>(`/students/homeworkProcess/class/${classId}/session/${sessionId}`)) || [];
  }

  /** Bài đã nộp của 1 SV trong 1 buổi — mỗi bài có homework.id nên khớp đúng đề theo ID. */
  async sessionExercises(sessionId: string, studentId: string | number): Promise<any[]> {
    return (await this.client.get<any[]>(
      `/exercise?classId=&courseId=&sessionId=${sessionId}&studentName=&page=1&limit=100&studentId=${studentId}`
    )) || [];
  }

  /** Toàn bộ bài tập của 1 SV trong môn (kèm aiReviews). */
  async studentExercises(studentId: string | number, courseId: string): Promise<any[]> {
    const list = (await this.client.get<any[]>(
      `/exercise?classId=&courseId=${courseId}&sessionId=&studentName=&page=1&limit=500&studentId=${studentId}`
    )) || [];
    return list.filter(e => !e.course || String(e.course.id) === String(courseId));
  }
}
