import { convertMetafileToDataUrl } from 'emf-converter';

/**
 * Convert EMF/WMF (Windows metafile) sang base64 PNG bằng thư viện bên thứ ba
 * (chạy thuần Canvas trong browser, không backend). Thư viện ít được kiểm chứng
 * (ít sao GitHub) nên MỌI lỗi/không đọc được đều trả về null thay vì throw,
 * để 1 file EMF hỏng không làm gãy cả luồng chấm điểm.
 */
export async function convertEmfToPng(bytes: Uint8Array): Promise<string | null> {
  try {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const dataUrl = await convertMetafileToDataUrl(buffer);
    if (!dataUrl) return null;

    const base64 = dataUrl.split(',')[1];
    return base64 || null;
  } catch {
    return null;
  }
}
