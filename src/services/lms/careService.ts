import { qldtGetRaw, qldtGet, qldtWrite } from './qldtApiClient';
import { CareCase, CareHistory, CareMeta, CarePatch, parseCareCase, parseCareHistory } from '~/src/core/care';

const PAGE_SIZE = 200;
const MAX_PAGES = 20;

export interface CareQuery {
  classId?: string;
  startDate?: string; // yyyy-mm-dd
  endDate?: string;
  studentName?: string;
}

/** Tất cả ca chăm sóc theo bộ lọc (tự lấy hết các trang). */
export async function fetchCareCases(auth: string, q: CareQuery): Promise<{ items: CareCase[]; meta: CareMeta }> {
  const items: CareCase[] = [];
  let meta: CareMeta = { total: 0, totalPages: 0, totalNoPermitAbsent: 0, totalResolved: 0 };
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (q.classId) params.set('classId', q.classId);
    if (q.startDate) params.set('startDate', q.startDate);
    if (q.endDate) params.set('endDate', q.endDate);
    if (q.studentName) params.set('studentName', q.studentName);
    const res = await qldtGetRaw(`/take-care-students?${params}`, auth);
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

export async function fetchCareHistory(auth: string, studentId: string): Promise<CareHistory> {
  return parseCareHistory(await qldtGet<any>(`/take-care-students/student/${studentId}`, auth));
}

/** Cập nhật 1 ca lên QLĐT; trả các trường QLĐT đã lưu. */
export async function updateCareCase(auth: string, id: number, patch: CarePatch): Promise<Partial<CareCase>> {
  const d = await qldtWrite<any>('PATCH', `/take-care-students/${id}`, auth, patch);
  const s = (v: unknown) => (v == null ? '' : String(v));
  return d && typeof d === 'object'
    ? { reason: s(d.reason), result: s(d.result), status: s(d.status), category: s(d.category), careMethod: s(d.careMethod), statusChangedAt: s(d.statusChangedAt), updatedAt: s(d.updatedAt) }
    : { ...patch };
}
