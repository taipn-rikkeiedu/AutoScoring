import type { ImageAttachment } from '~/src/services/api/aiClient';
import { services } from '~/src/services/container';

/**
 * Tải ảnh trong đề bài (ảnh giao diện mẫu, sơ đồ…) để gửi kèm cho AI khi chấm.
 * Trang extension có quyền <all_urls> nên fetch thẳng được ảnh ở host khác (không vướng CORS).
 * Cache theo địa chỉ ảnh: cả lớp cùng 1 đề chỉ tải 1 lần.
 */
const MAX_ASSIGNMENT_IMAGES = 6;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const SUPPORTED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export interface AssignmentImages {
  images: ImageAttachment[];
  /** Số thứ tự [Ảnh n] trong đề của từng ảnh đã tải được (cùng thứ tự với images). */
  numbers: number[];
  /** Số thứ tự [Ảnh n] không tải được. */
  failed: number[];
}

const cache = new Map<string, Promise<ImageAttachment | null>>();

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Ảnh quá lớn / định dạng AI không đọc được (bmp…) → vẽ lại thành JPEG cạnh tối đa 1600px. */
async function reencode(blob: Blob): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  } catch {
    return null;
  }
}

async function fetchImage(src: string): Promise<Blob> {
  if (src.startsWith('data:')) return await (await fetch(src)).blob();
  let res = await fetch(src);
  // Ảnh lưu trên máy chủ QLĐT có thể cần đăng nhập
  if ((res.status === 401 || res.status === 403) && /(^|\.)rikkei\.edu\.vn$/i.test(new URL(src).hostname)) {
    res = await fetch(src, { headers: { Authorization: await services.qldt.auth.getAuth() } });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.blob();
}

async function loadImage(src: string): Promise<ImageAttachment | null> {
  try {
    let blob = await fetchImage(src);
    if (!blob.type.startsWith('image/') && !/\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(src)) return null;
    // Giải mã thử: ảnh hỏng thì bỏ (gửi cho AI sẽ bị lỗi cả lượt chấm)
    try { (await createImageBitmap(blob)).close(); } catch { return null; }
    if (!SUPPORTED.has(blob.type) || blob.size > MAX_IMAGE_BYTES) {
      const converted = await reencode(blob);
      if (!converted || converted.size > MAX_IMAGE_BYTES) return null;
      blob = converted;
    }
    return { mimeType: blob.type || 'image/png', base64: toBase64(await blob.arrayBuffer()) };
  } catch {
    return null;
  }
}

export async function loadAssignmentImages(srcs: string[] = []): Promise<AssignmentImages> {
  const out: AssignmentImages = { images: [], numbers: [], failed: [] };
  const list = srcs.slice(0, MAX_ASSIGNMENT_IMAGES);
  const loaded = await Promise.all(list.map(src => {
    if (!cache.has(src)) cache.set(src, loadImage(src));
    return cache.get(src)!;
  }));
  loaded.forEach((img, i) => {
    if (img) { out.images.push(img); out.numbers.push(i + 1); } else out.failed.push(i + 1);
  });
  // Ảnh vượt giới hạn số lượng: báo AI là không gửi kèm
  for (let n = list.length + 1; n <= srcs.length; n++) out.failed.push(n);
  // Ảnh lỗi thì lần chấm sau thử tải lại
  list.forEach((src, i) => { if (!loaded[i]) cache.delete(src); });
  return out;
}
