import JSZip from 'jszip';
import { convertEmfToPng } from './emfConverter';

export interface ExtractedImage {
  filename: string;
  mimeType: string;
  base64: string;
}

const MAX_IMAGES_PER_DOCX = 6;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

const RASTER_MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif'
};

function estimateBase64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

export class ZipExtractor {
  static buildDirectoryTree(filePaths: string[]): string {
    const tree: any = {};
    for (const path of filePaths) {
      const parts = path.split('/');
      let current = tree;
      for (const part of parts) {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }

    function renderTree(node: any, prefix = ""): string {
      let result = "";
      const keys = Object.keys(node).sort();
      keys.forEach((key, index) => {
        const isLast = index === keys.length - 1;
        const connector = isLast ? "└── " : "├── ";
        result += `${prefix}${connector}${key}\n`;
        const nextPrefix = prefix + (isLast ? "    " : "│   ");
        result += renderTree(node[key], nextPrefix);
      });
      return result;
    }

    return renderTree(tree);
  }

  static async parseDocx(zipFileEntry: any): Promise<string> {
    try {
      const xmlText = await zipFileEntry.async("string");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const textNodes = xmlDoc.getElementsByTagName("w:t");
      const result: string[] = [];
      for (let i = 0; i < textNodes.length; i++) {
        if (textNodes[i].textContent) {
          result.push(textNodes[i].textContent!);
        }
      }
      return result.join(" ");
    } catch (err: any) {
      return `\n[Lỗi đọc file docx: ${err.message}]\n`;
    }
  }

  /**
   * Trích ảnh trong word/media/* của 1 file .docx (đã giải nén qua JSZip).
   * Ảnh raster (png/jpg/jpeg/gif) đọc thẳng base64; EMF/WMF thử convert bằng
   * emf-converter (chạy Canvas thuần browser, xem emfConverter.ts). Ảnh vượt
   * cap số lượng/dung lượng bị bỏ qua, tính vào skippedCount, không throw.
   */
  static async extractDocxImages(docxZip: JSZip): Promise<{ images: ExtractedImage[]; skippedCount: number }> {
    const images: ExtractedImage[] = [];
    let skippedCount = 0;

    const mediaEntries = Object.values(docxZip.files).filter(
      (entry: any) => !entry.dir && entry.name.startsWith('word/media/')
    ) as any[];

    for (const entry of mediaEntries) {
      if (images.length >= MAX_IMAGES_PER_DOCX) {
        skippedCount++;
        continue;
      }

      const filename = entry.name.split('/').pop() || entry.name;
      const ext = filename.split('.').pop()?.toLowerCase() || '';

      try {
        if (RASTER_MIME_BY_EXT[ext]) {
          const base64 = await entry.async('base64');
          if (estimateBase64Bytes(base64) > MAX_IMAGE_BYTES) {
            skippedCount++;
            continue;
          }
          images.push({ filename, mimeType: RASTER_MIME_BY_EXT[ext], base64 });
        } else if (ext === 'emf' || ext === 'wmf') {
          const bytes: Uint8Array = await entry.async('uint8array');
          const converted = await convertEmfToPng(bytes);
          if (!converted || estimateBase64Bytes(converted) > MAX_IMAGE_BYTES) {
            skippedCount++;
            continue;
          }
          images.push({ filename, mimeType: 'image/png', base64: converted });
        }
        // Các định dạng khác trong word/media (svg, tiff hiếm gặp...) bị bỏ qua lặng lẽ.
      } catch {
        skippedCount++;
      }
    }

    return { images, skippedCount };
  }

  /**
   * Đọc đầy đủ 1 file .docx: text từ word/document.xml + ảnh từ word/media/*,
   * dùng chung 1 JSZip instance.
   */
  static async parseDocxFull(docxBlob: Blob): Promise<{ text: string; images: ExtractedImage[]; skippedCount: number }> {
    const docxZip = new JSZip();
    try {
      const subZip = await docxZip.loadAsync(docxBlob);
      const wordXml = subZip.file("word/document.xml");
      const text = wordXml ? await this.parseDocx(wordXml) : "";
      const { images, skippedCount } = await this.extractDocxImages(subZip);
      return { text, images, skippedCount };
    } catch (e: any) {
      return { text: `[Lỗi đọc Word docx: ${e.message}]`, images: [], skippedCount: 0 };
    }
  }

  static async parseDocxFromBlob(docxBlob: Blob): Promise<string> {
    const { text } = await this.parseDocxFull(docxBlob);
    return text;
  }
}
