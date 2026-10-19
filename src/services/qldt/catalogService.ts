import type { QldtClient } from './client';
import { QldtAuthError } from './errors';
import type { QldtClass, QldtOption, QldtSession } from './types';

/**
 * Danh mục mà tài khoản đang đăng nhập được xem: hệ đào tạo → lớp → môn → buổi.
 * Nên cấp client có cache (CachedQldtClient); `force` = bỏ qua cache (nút Thử lại).
 */
export class CatalogService {
  /** Lớp của lần tải gần nhất — lấy sẵn môn đang gán cho lớp mà không gọi thêm API. */
  private classes: QldtClass[] = [];

  constructor(private readonly client: QldtClient) {}

  /**
   * QLĐT (từ 16/10/2026) lấy lớp theo từng hệ đào tạo: /systems/me → /classes/system/:id; /classes/system/0
   * (tất cả hệ, cách cũ) vẫn gọi kèm để không mất lớp nếu còn dùng được. Gộp, bỏ trùng theo id.
   * Lỗi từng request (trừ lỗi đăng nhập) không làm hỏng cả danh sách.
   */
  async listClasses(force = false): Promise<QldtOption[]> {
    const systems = (await this.tolerant(this.client.get<{ id: number | string }[]>('/systems/me', { force }), [])) || [];
    const ids = ['0', ...systems.map(s => String(s.id))];
    const lists = await Promise.all(ids.map(id => this.tolerant(this.client.get<QldtClass[]>(`/classes/system/${id}`, { force }), [] as QldtClass[])));
    const byId = new Map<string, QldtClass>();
    lists.flat().forEach(c => { if (c && !byId.has(String(c.id))) byId.set(String(c.id), c); });
    this.classes = [...byId.values()];
    return this.classes.map(c => ({
      value: String(c.id),
      label: `${c.name}${c.studentCount != null ? ` (${c.studentCount} SV)` : ''}`
    }));
  }

  /** Môn học của lớp: gộp môn đang gán cho lớp và môn trong chương trình (theo học kỳ). */
  async listCourses(classId: string, force = false): Promise<QldtOption[]> {
    const out = new Map<string, QldtOption>();
    const known = this.classes.find(c => String(c.id) === String(classId));
    (known?.courses || []).forEach(c => out.set(String(c.id), { value: String(c.id), label: c.name }));
    try {
      const detail = await this.client.get<any>(`/classes/${classId}`, { force });
      for (const sem of detail?.specializes?.semesters || []) {
        for (const c of sem.courses || []) {
          if (!out.has(String(c.id))) out.set(String(c.id), { value: String(c.id), label: `${c.name} — ${sem.name}` });
        }
      }
    } catch (e) {
      if (!out.size) throw e;
    }
    return [...out.values()];
  }

  /** Buổi của môn, theo thứ tự buổi học. */
  async listSessions(courseId: string, force = false): Promise<QldtSession[]> {
    const list = (await this.client.get<any[]>(`/sessions/course/${courseId}`, { force })) || [];
    return list
      .map(s => ({ id: String(s.id), name: String(s.name || `Buổi ${s.position ?? ''}`).trim(), position: Number(s.position) || 0 }))
      .sort((a, b) => a.position - b.position);
  }

  private tolerant<T>(p: Promise<T>, empty: T): Promise<T> {
    return p.catch((e) => { if (e instanceof QldtAuthError) throw e; return empty; });
  }
}
