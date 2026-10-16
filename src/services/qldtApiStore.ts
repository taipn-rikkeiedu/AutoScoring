/**
 * Kho lưu response API QLĐT (apiportal.rikkei.edu.vn) đã thu thập — ghi lại khi duyệt web QLĐT hoặc quét chủ động.
 * Lưu bằng IndexedDB của extension (dữ liệu lớn, dùng chung giữa background và trang extension).
 * Mỗi URL giữ 1 bản ghi mới nhất (đếm số lần gặp).
 */

const DB_NAME = 'reduxQldtApi';
const STORE = 'records';
const DB_VERSION = 1;

export type ApiSource = 'recorded' | 'crawled';

export interface ApiRecord {
  url: string;                    // URL đầy đủ (khoá)
  api: string;                    // mẫu API, vd "GET /classes/dashboard/:id/:id"
  path: string;                   // đường dẫn thực
  params: Record<string, string>; // query string
  status: number;
  source: ApiSource;
  at: string;                     // lần gặp gần nhất (ISO)
  hits: number;
  response: unknown;              // body JSON (hoặc chuỗi nếu không phải JSON)
}

/** Đường dẫn → mẫu API: đoạn số / id dài thay bằng ":id". */
export function describeApiUrl(rawUrl: string, method = 'GET') {
  const u = new URL(rawUrl);
  const template = u.pathname
    .split('/')
    .map(seg => (/^\d+$/.test(seg) || /^[0-9a-f]{24}$/i.test(seg) || /^[0-9a-f-]{32,36}$/i.test(seg) ? ':id' : seg))
    .join('/');
  const params: Record<string, string> = {};
  u.searchParams.forEach((v, k) => { params[k] = v; });
  return { api: `${method.toUpperCase()} ${template}`, path: u.pathname, params };
}

export function parseBody(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'url' }).createIndex('api', 'api');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req ? (req as IDBRequest<T>).result : undefined); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

/** Lưu nhiều bản ghi; URL đã có thì cập nhật response mới nhất và cộng số lần gặp. */
export async function saveApiRecords(records: Omit<ApiRecord, 'hits'>[]): Promise<void> {
  if (!records.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    const store = t.objectStore(STORE);
    records.forEach(rec => {
      const get = store.get(rec.url);
      get.onsuccess = () => {
        const prev = get.result as ApiRecord | undefined;
        store.put({ ...rec, hits: (prev?.hits || 0) + 1 });
      };
    });
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export async function getAllApiRecords(): Promise<ApiRecord[]> {
  return ((await tx<ApiRecord[]>('readonly', s => s.getAll())) || []);
}

export async function clearApiRecords(): Promise<void> {
  await tx('readwrite', s => s.clear());
}

/** Tóm tắt theo mẫu API (không đọc response, dùng cho bảng hiển thị). */
export interface ApiSummary {
  api: string;
  urls: number;
  hits: number;
  sources: ApiSource[];
  lastAt: string;
  queryKeys: string[];
  sampleUrl: string;
}

export function summarizeRecords(records: ApiRecord[]): ApiSummary[] {
  const map = new Map<string, ApiSummary>();
  records.forEach(r => {
    const s = map.get(r.api) || { api: r.api, urls: 0, hits: 0, sources: [], lastAt: '', queryKeys: [], sampleUrl: r.url };
    s.urls++;
    s.hits += r.hits;
    if (!s.sources.includes(r.source)) s.sources.push(r.source);
    if (r.at > s.lastAt) s.lastAt = r.at;
    Object.keys(r.params).forEach(k => { if (!s.queryKeys.includes(k)) s.queryKeys.push(k); });
    map.set(r.api, s);
  });
  return [...map.values()].sort((a, b) => a.api.localeCompare(b.api));
}

/** Các trường (key) của dữ liệu trả về, để biết cấu trúc API mà không cần mở response. */
function fieldsOf(response: unknown): string[] {
  const body: any = response && typeof response === 'object' && 'data' in (response as any) ? (response as any).data : response;
  const sample = Array.isArray(body) ? body[0] : body;
  return sample && typeof sample === 'object' ? Object.keys(sample) : [];
}

/** File JSON xuất ra: danh mục API + toàn bộ response, nhóm theo mẫu API. */
export function buildExport(records: ApiRecord[]) {
  const apis: Record<string, Omit<ApiRecord, 'api'>[]> = {};
  [...records].sort((a, b) => a.url.localeCompare(b.url)).forEach(({ api, ...rest }) => {
    (apis[api] ||= []).push(rest);
  });
  return {
    exportedAt: new Date().toISOString(),
    host: 'apiportal.rikkei.edu.vn',
    note: 'Dữ liệu gốc từ QLĐT, có thông tin cá nhân sinh viên. Bảo quản cẩn thận, không chia sẻ, không đưa lên git.',
    catalog: summarizeRecords(records).map(s => ({
      ...s,
      fields: fieldsOf(records.find(r => r.api === s.api)?.response)
    })),
    apis
  };
}
