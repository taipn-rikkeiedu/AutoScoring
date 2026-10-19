import { describeApiUrl, parseBody, saveApiRecords, saveApiWrite } from '~/src/services/qldtApiStore';

export const QLDT_API_RECORD_MESSAGE = 'QLDT_API_RECORD';

/** Response API QLĐT do chính trang web gọi (khi bật "Ghi API") → lưu vào kho API. Không phản hồi bên gửi. */
export function handleQldtApiRecord(message: { method?: string; url: string; status: number; body: string; requestBody?: string }): void {
  const { url, status, body, requestBody } = message;
  const method = String(message.method || 'GET').toUpperCase();
  const at = new Date().toISOString();
  const save = method === 'GET'
    ? saveApiRecords([{ url, ...describeApiUrl(url), status, source: 'recorded', at, response: parseBody(body) }])
    // Request ghi dữ liệu (POST / PUT / PATCH / DELETE): giữ từng lần gửi kèm body
    : saveApiWrite({ ...describeApiUrl(url, method), method, url, status, at, requestBody: parseBody(requestBody || ''), response: parseBody(body) });
  save.catch((err) => console.error('REduX: không lưu được API QLĐT', err));
}
