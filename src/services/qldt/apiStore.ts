/**
 * Kho lưu response API QLĐT (apiportal.rikkei.edu.vn) đã thu thập — ghi lại khi duyệt web QLĐT hoặc quét chủ động.
 * Lưu bằng IndexedDB của extension (dữ liệu lớn, dùng chung giữa background và trang extension).
 * - GET: mỗi URL giữ 1 bản ghi mới nhất (đếm số lần gặp).
 * - Ghi (POST / PUT / PATCH / DELETE) mà trang QLĐT gửi đi: giữ từng lần gửi (method, URL, body, response)
 *   để biết API lưu dữ liệu — extension chỉ quan sát, không tự gửi.
 */

const DB_NAME = 'reduxQldtApi';
const STORE = 'records';
const WRITE_STORE = 'writes';
const DB_VERSION = 2;

export type ApiSource = 'recorded' | 'crawled' | 'write';

/** 1 lần trang QLĐT gửi request ghi dữ liệu. */
export interface ApiWriteRecord {
  id?: number;
  api: string;                    // vd "PATCH /take-care-students/:id"
  method: string;
  url: string;
  path: string;
  params: Record<string, string>;
  requestBody: unknown;           // body đã gửi (JSON hoặc chuỗi)
  status: number;
  at: string;
  response: unknown;
}

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

/**
 * Một kết nối dùng chung cho mọi thao tác: mở nhiều kết nối cùng lúc trong lúc nâng cấp phiên bản kho (v1 → v2)
 * có thể bị treo. Trang khác nâng cấp kho → đóng kết nối này, lần sau mở lại.
 */
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'url' }).createIndex('api', 'api');
      if (!db.objectStoreNames.contains(WRITE_STORE)) db.createObjectStore(WRITE_STORE, { keyPath: 'id', autoIncrement: true }).createIndex('api', 'api');
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => { resolve(req ? (req as IDBRequest<T>).result : undefined); };
    t.onerror = () => { reject(t.error); };
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
    t.oncomplete = () => { resolve(); };
    t.onerror = () => { reject(t.error); };
  });
}

export async function getAllApiRecords(): Promise<ApiRecord[]> {
  return ((await tx<ApiRecord[]>('readonly', s => s.getAll())) || []);
}

export async function saveApiWrite(rec: Omit<ApiWriteRecord, 'id'>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(WRITE_STORE, 'readwrite');
    t.objectStore(WRITE_STORE).add(rec);
    t.oncomplete = () => { resolve(); };
    t.onerror = () => { reject(t.error); };
  });
}

export async function getAllApiWrites(): Promise<ApiWriteRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(WRITE_STORE, 'readonly');
    const req = t.objectStore(WRITE_STORE).getAll();
    t.oncomplete = () => { resolve((req.result as ApiWriteRecord[]) || []); };
    t.onerror = () => { reject(t.error); };
  });
}

export async function clearApiRecords(): Promise<void> {
  await tx('readwrite', s => s.clear());
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(WRITE_STORE, 'readwrite');
    t.objectStore(WRITE_STORE).clear();
    t.oncomplete = () => { resolve(); };
    t.onerror = () => { reject(t.error); };
  });
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

export function summarizeRecords(records: ApiRecord[], writes: ApiWriteRecord[] = []): ApiSummary[] {
  const map = new Map<string, ApiSummary>();
  writes.forEach(w => {
    const s = map.get(w.api) || { api: w.api, urls: 0, hits: 0, sources: ['write' as ApiSource], lastAt: '', queryKeys: [], sampleUrl: w.url };
    s.urls++;
    s.hits++;
    if (w.at > s.lastAt) s.lastAt = w.at;
    Object.keys(w.params).forEach(k => { if (!s.queryKeys.includes(k)) s.queryKeys.push(k); });
    map.set(w.api, s);
  });
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
export function buildExport(records: ApiRecord[], writes: ApiWriteRecord[] = []) {
  const apis: Record<string, Omit<ApiRecord, 'api'>[]> = {};
  [...records].sort((a, b) => a.url.localeCompare(b.url)).forEach(({ api, ...rest }) => {
    (apis[api] ||= []).push(rest);
  });
  // Request ghi dữ liệu theo thứ tự thời gian (gồm body đã gửi + response)
  const writeApis: Record<string, Omit<ApiWriteRecord, 'api' | 'id'>[]> = {};
  [...writes].sort((a, b) => a.at.localeCompare(b.at)).forEach(({ api, id, ...rest }) => {
    (writeApis[api] ||= []).push(rest);
  });
  return {
    exportedAt: new Date().toISOString(),
    host: 'apiportal.rikkei.edu.vn',
    note: 'Dữ liệu gốc từ QLĐT, có thông tin cá nhân sinh viên. Bảo quản cẩn thận, không chia sẻ, không đưa lên git.',
    catalog: summarizeRecords(records, writes).map(s => ({
      ...s,
      fields: fieldsOf(records.find(r => r.api === s.api)?.response),
      requestFields: fieldsOf(writes.find(w => w.api === s.api)?.requestBody)
    })),
    apis,
    writes: writeApis
  };
}
