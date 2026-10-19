import { STORAGE_KEYS } from '~/src/core/constants';
import { getQldtAuth, jwtExp, qldtGetRaw } from './qldtApiClient';
import { withTimeout } from '~/src/core/async';
import { localStore } from '~/src/infra/storage';

/**
 * Chẩn đoán kết nối QLĐT từng bước (tab → token → API) để tìm chỗ hỏng.
 * Không bao giờ in token đầy đủ: chỉ tên khoá, độ dài, vài ký tự đầu và hạn.
 */

const fmtExp = (auth: string) => {
  const exp = jwtExp(auth);
  if (exp == null) return 'không phải JWT';
  const left = Math.round((exp * 1000 - Date.now()) / 60000);
  return `hết hạn ${new Date(exp * 1000).toLocaleString('vi-VN')} (${left > 0 ? `còn ${left} phút` : 'ĐÃ HẾT HẠN'})`;
};
const mask = (auth: string) => `${auth.slice(0, 14)}… (${auth.length} ký tự)`;

/** Tóm tắt response: HTTP, số phần tử trong data, message. */
function describe(status: number, text: string): string {
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* không phải JSON */ }
  if (!json) return `HTTP ${status}, body không phải JSON: ${text.slice(0, 120)}`;
  const d = json.data;
  const size = Array.isArray(d) ? `${d.length} phần tử` : d && typeof d === 'object' ? `object {${Object.keys(d).slice(0, 8).join(', ')}}` : JSON.stringify(d)?.slice(0, 60);
  return `HTTP ${status}${json.statusCode != null ? ` (statusCode ${json.statusCode})` : ''}, data: ${size}${json.message ? `, message: ${JSON.stringify(json.message).slice(0, 120)}` : ''}`;
}

export async function diagnoseQldt(): Promise<string> {
  const lines: string[] = [`Chẩn đoán QLĐT — ${new Date().toLocaleString('vi-VN')} — REduX ${chrome.runtime.getManifest().version}`];

  // 1. Tab
  const all = await chrome.tabs.query({});
  const rikkei = all.filter(t => /rikkei/i.test(t.url || ''));
  lines.push(`\n1. Tab có "rikkei" đang mở: ${rikkei.length}`);
  rikkei.forEach(t => lines.push(`   - ${(t.url || '').split('?')[0].slice(0, 80)} | ${t.discarded ? 'ĐANG NGỦ' : t.status}`));
  for (const t of rikkei.filter(x => /^https:\/\/qldt\.rikkei\.edu\.vn\//.test(x.url || ''))) {
    if (!t.id) continue;
    try {
      const [res] = await withTimeout(chrome.scripting.executeScript({
        target: { tabId: t.id },
        func: () => {
          const out: { store: string; key: string; jwt: string; len: number }[] = [];
          for (const [store, s] of [['local', localStorage], ['session', sessionStorage]] as const) {
            for (let i = 0; i < s.length; i++) {
              const k = s.key(i) || '';
              const v = s.getItem(k) || '';
              out.push({ store, key: k, jwt: (v.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/) || [''])[0], len: v.length });
            }
          }
          return { out, cookieNames: document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean) };
        }
      }), 2500, 'không phản hồi sau 2,5s — tab có thể đang ngủ (Sleeping tabs), bấm vào tab hoặc F5');
      const r = res?.result as any;
      lines.push(`   Tab ${t.id}: ${r.out.length} khoá storage; cookie đọc được: ${r.cookieNames.join(', ') || '(không có)'}`);
      r.out.forEach((x: any) => lines.push(`     · ${x.store}.${x.key}: ${x.jwt ? `JWT, ${fmtExp(x.jwt)}` : `${x.len} ký tự`}`));
    } catch (e: any) {
      lines.push(`   Tab ${t.id}: KHÔNG chạy được script (${e.message})`);
    }
  }

  // 2. Token
  const cached = await localStore.get<string>(STORAGE_KEYS.qldtAuthToken);
  lines.push(`\n2. Token đã lưu trong extension: ${cached ? `${mask(cached)}, ${fmtExp(cached)}` : 'KHÔNG CÓ'}`);
  let auth = '';
  try {
    auth = await getQldtAuth();
    lines.push(`   Token được chọn: ${mask(auth)}, ${fmtExp(auth)}`);
  } catch (e: any) {
    lines.push(`   getQldtAuth LỖI: ${e.message}`);
  }

  // 3. API
  lines.push('\n3. Gọi API');
  const call = async (path: string) => {
    try {
      const r = await qldtGetRaw(path, auth || 'Bearer none');
      lines.push(`   GET ${path} → ${describe(r.status, r.text)}`);
      try { return JSON.parse(r.text)?.data; } catch { return null; }
    } catch (e: any) {
      lines.push(`   GET ${path} → LỖI: ${e.message}`);
      return null;
    }
  };
  const systems = await call('/systems/me');
  if (Array.isArray(systems)) lines.push(`   Hệ đào tạo: ${systems.map((s: any) => `${s.id} ${s.systemCode || s.name || ''}`).join('; ') || '(trống)'}`);
  await call('/classes/system/0');
  for (const s of (Array.isArray(systems) ? systems : []).slice(0, 6)) await call(`/classes/system/${s.id}`);

  return lines.join('\n');
}
