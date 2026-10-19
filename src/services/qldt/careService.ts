import { CareCase, CareHistory, CareMeta, CarePatch, parseCareCase, parseCareHistory } from '~/src/core/care';
import type { QldtClient } from './client';

export interface CareQuery {
  classId?: string;
  startDate?: string; // yyyy-mm-dd
  endDate?: string;
  studentName?: string;
}

/**
 * Chăm sóc học viên trên QLĐT: mỗi ca = 1 buổi nghỉ không phép cần liên hệ.
 * Đọc: GET /take-care-students (lọc lớp, ngày…), GET /take-care-students/student/:id (lịch sử).
 * Ghi: PATCH /take-care-students/:id { reason, result, status, category, careMethod }.
 */
export class CareService {
  private static readonly PAGE_SIZE = 200;
  private static readonly MAX_PAGES = 20;

  constructor(private readonly client: QldtClient) {}

  /** Tất cả ca theo bộ lọc (tự lấy hết các trang). Response có `meta` nên đọc thô, không qua `get`. */
  async fetchCases(q: CareQuery): Promise<{ items: CareCase[]; meta: CareMeta }> {
    const items: CareCase[] = [];
    let meta: CareMeta = { total: 0, totalPages: 0, totalNoPermitAbsent: 0, totalResolved: 0 };
    for (let page = 1; page <= CareService.MAX_PAGES; page++) {
      const params = new URLSearchParams({ page: String(page), limit: String(CareService.PAGE_SIZE) });
      if (q.classId) params.set('classId', q.classId);
      if (q.startDate) params.set('startDate', q.startDate);
      if (q.endDate) params.set('endDate', q.endDate);
      if (q.studentName) params.set('studentName', q.studentName);
      const res = await this.client.getRaw(`/take-care-students?${params}`);
      let json: any = null;
      try { json = JSON.parse(res.text); } catch { /* không phải JSON */ }
      if (res.status >= 400 || !json || (typeof json.statusCode === 'number' && json.statusCode >= 400)) {
        throw new Error(`Không tải được danh sách chăm sóc (HTTP ${res.status})${json?.message ? `: ${json.message}` : ''}`);
      }
      (json.data || []).forEach((x: any) => items.push(parseCareCase(x)));
      const m = json.meta || {};
      meta = {
        total: Number(m.total) || items.length,
        totalPages: Number(m.totalPages) || 1,
        totalNoPermitAbsent: Number(m.totalNoPermitAbsent) || 0,
        totalResolved: Number(m.totalResolved) || 0
      };
      if (page >= meta.totalPages || !(json.data || []).length) break;
    }
    return { items, meta };
  }

  async history(studentId: string): Promise<CareHistory> {
    return parseCareHistory(await this.client.get<any>(`/take-care-students/student/${studentId}`));
  }

  /** Cập nhật 1 ca lên QLĐT; trả các trường QLĐT đã lưu. */
  async update(id: number, patch: CarePatch): Promise<Partial<CareCase>> {
    const d = await this.client.patch<any>(`/take-care-students/${id}`, patch);
    const s = (v: unknown) => (v == null ? '' : String(v));
    return d && typeof d === 'object'
      ? { reason: s(d.reason), result: s(d.result), status: s(d.status), category: s(d.category), careMethod: s(d.careMethod), statusChangedAt: s(d.statusChangedAt), updatedAt: s(d.updatedAt) }
      : { ...patch };
  }
}
