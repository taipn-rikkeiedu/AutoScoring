import JSZip from 'jszip';
import { GITHUB_ENDPOINTS } from '~/src/services/api/endpoints';
import { UI_MESSAGES } from '~/src/core/constants';
import { ZipExtractor, ExtractedImage } from './zipExtractor';
import { proxyFetchJson, proxyFetchBinary } from './backgroundFetch';

const MAX_TOTAL_IMAGES = 6;
const MAX_TOTAL_IMAGE_BYTES = 6 * 1024 * 1024;

function estimateBase64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

const DEFAULT_IGNORE_ITEMS = [
  "build/", "dist/", "target/", "out/", ".vscode/", ".idea/", "env/", "venv/",
  "Scripts/", "Lib/", "scripts/", "lib/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "composer.lock", "gradlew", "mvnw", ".gitignore", "node_modules/", ".git/", "__pycache__/"
];

const ALLOWED_EXTENSIONS = [
  '.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.sql', '.sh', '.json', '.xml', '.yaml', '.yml',
  '.md', '.txt', '.vue', '.svelte', '.dart', '.r', '.scala', '.m', '.mm', '.pl', '.pm', '.dockerfile',
  '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp'
];

const KNOWN_EXTENSIONLESS_FILES = new Set(["readme", "makefile", "dockerfile", "license"]);

const MAX_FILES = 100;
const MAX_CHARS = 500000;

/**
 * GitHubService (Client-side)
 * Tự tải + giải nén repo GitHub bằng JSZip, không còn qua backend.
 * Port từ redux-ai-backend/app/features/github/service.py.
 */
export class GitHubService {
  private token: string;
  private ignoreItems: string[];

  constructor(token = "", customIgnoreItems: string[] | null = null) {
    this.token = token ? token.trim() : "";
    this.ignoreItems = customIgnoreItems && customIgnoreItems.length > 0 ? customIgnoreItems : DEFAULT_IGNORE_ITEMS;
  }

  private static parseGithubUrl(url: string): { owner: string; repo: string } {
    const cleanUrl = url.trim().replace(/\/+$/, '').replace(/\.git$/i, '');
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!match) throw new Error(UI_MESSAGES.github.invalidUrl);
    return { owner: match[1], repo: match[2] };
  }

  private static isFileExcluded(path: string, filename: string, ignoreItems: string[]): boolean {
    const lowerPath = path.toLowerCase();
    const lowerFilename = filename.toLowerCase();

    const isKnownFile = KNOWN_EXTENSIONLESS_FILES.has(lowerFilename);
    if (!isKnownFile && !ALLOWED_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) {
      return true;
    }

    for (const item of ignoreItems) {
      const cleanItem = item.trim().toLowerCase();
      if (!cleanItem) continue;

      if (cleanItem.endsWith('/')) {
        const dirPattern = cleanItem.replace(/\/$/, '');
        if (`/${lowerPath}/`.includes(`/${dirPattern}/`) || lowerPath.startsWith(`${dirPattern}/`)) {
          return true;
        }
      } else if (lowerFilename === cleanItem || lowerPath.endsWith(`/${cleanItem}`)) {
        return true;
      }
    }
    return false;
  }

  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    try {
      const data = await proxyFetchJson(GITHUB_ENDPOINTS.repo(owner, repo), this.buildHeaders());
      if (data?.default_branch) return data.default_branch;
    } catch {
      // Bỏ qua lỗi, fallback "main" bên dưới.
    }
    return "main";
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { accept: "application/vnd.github.v3+json" };
    if (this.token) headers.authorization = `token ${this.token}`;
    return headers;
  }

  private async downloadZipArchive(owner: string, repo: string, branch: string): Promise<ArrayBuffer> {
    // Repo private (có token) cần dùng endpoint zipball của GitHub API thay vì codeload,
    // vì codeload.github.com không xác thực bằng token cá nhân.
    const url = this.token
      ? `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`
      : GITHUB_ENDPOINTS.zipArchive(owner, repo, branch);
    return await proxyFetchBinary(url, this.buildHeaders());
  }

  private static decodeFileText(bytes: Uint8Array): string {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return new TextDecoder('windows-1252').decode(bytes);
    }
  }

  private static formatFileSection(relativePath: string, text: string): string {
    const separator = "=".repeat(50);
    return `\n\n${separator}\nTỆP TIN: ${relativePath}\n${separator}\n${text}`;
  }

  /** Đọc riêng file .docx: text -> payload như file thường, ảnh -> gom vào accumulator có cap tổng (nhiều .docx dùng chung 1 cap). */
  private static async readDocxEntry(
    entry: any,
    imageAccumulator: { images: ExtractedImage[]; skippedImageCount: number; totalImageBytes: number }
  ): Promise<string | null> {
    const bytes: Uint8Array = await entry.async("uint8array");
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer]);
    const { text, images: docxImages, skippedCount } = await ZipExtractor.parseDocxFull(blob);

    imageAccumulator.skippedImageCount += skippedCount;
    for (const img of docxImages) {
      const imgBytes = estimateBase64Bytes(img.base64);
      const overCap = imageAccumulator.images.length >= MAX_TOTAL_IMAGES ||
        imageAccumulator.totalImageBytes + imgBytes > MAX_TOTAL_IMAGE_BYTES;
      if (overCap) {
        imageAccumulator.skippedImageCount++;
        continue;
      }
      imageAccumulator.images.push(img);
      imageAccumulator.totalImageBytes += imgBytes;
    }

    return text.trim() ? text : null;
  }

  /** Đọc file ảnh trực tiếp (.png, .jpg, ...) và gom vào accumulator */
  private static async readRawImageEntry(
    entry: any,
    filename: string,
    imageAccumulator: { images: ExtractedImage[]; skippedImageCount: number; totalImageBytes: number }
  ): Promise<void> {
    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (!extMatch) return;
    const ext = extMatch[1].toLowerCase();
    
    let mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';

    const base64 = await entry.async("base64");
    const imgBytes = estimateBase64Bytes(base64);
    const overCap = imageAccumulator.images.length >= MAX_TOTAL_IMAGES ||
      imageAccumulator.totalImageBytes + imgBytes > MAX_TOTAL_IMAGE_BYTES;
    if (overCap) {
      imageAccumulator.skippedImageCount++;
      return;
    }
    imageAccumulator.images.push({ filename, mimeType, base64 });
    imageAccumulator.totalImageBytes += imgBytes;
  }

  private async extractZipContents(
    zipBuffer: ArrayBuffer,
    onProgress: (msg: string) => void
  ): Promise<{ fileList: string[]; payloadParts: string[]; images: ExtractedImage[]; skippedImageCount: number }> {
    onProgress(UI_MESSAGES.github.extractingZip);
    const zip = await JSZip.loadAsync(zipBuffer);

    const fileList: string[] = [];
    const payloadParts: string[] = [];
    const imageAccumulator = { images: [] as ExtractedImage[], skippedImageCount: 0, totalImageBytes: 0 };
    let processedFiles = 0;
    let totalChars = 0;

    const entries = Object.values(zip.files) as any[];
    for (const entry of entries) {
      if (entry.dir) continue;

      // Bỏ tiền tố tên thư mục gốc của zip (vd repo-main/...)
      const segments = entry.name.replace(/\\/g, '/').split('/');
      if (segments.length <= 1) continue;
      const relativePath = segments.slice(1).join('/');
      const filename = segments[segments.length - 1];

      if (GitHubService.isFileExcluded(relativePath, filename, this.ignoreItems)) continue;

      fileList.push(relativePath);
      if (processedFiles >= MAX_FILES || totalChars >= MAX_CHARS) continue;

      try {
        const lowerFilename = filename.toLowerCase();
        let text: string | null = null;

        if (lowerFilename.endsWith('.docx')) {
          text = await GitHubService.readDocxEntry(entry, imageAccumulator);
        } else if (lowerFilename.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
          await GitHubService.readRawImageEntry(entry, filename, imageAccumulator);
        } else {
          text = GitHubService.decodeFileText(await entry.async("uint8array")).trim() || null;
        }

        if (text) {
          payloadParts.push(GitHubService.formatFileSection(relativePath, text));
          processedFiles++;
          totalChars += text.length;
        }
      } catch {
        // Bỏ qua file không đọc được, vẫn giữ trong fileList để hiển thị.
      }
    }

    return { fileList, payloadParts, images: imageAccumulator.images, skippedImageCount: imageAccumulator.skippedImageCount };
  }

  /**
   * Tải và giải nén toàn bộ mã nguồn repo GitHub, trả về nội dung gộp
   * (cây thư mục + nội dung từng file) sẵn sàng đưa vào prompt AI.
   */
  async getRepoContents(
    repoUrl: string,
    onProgress: (msg: string) => void = () => {}
  ): Promise<{ content: string; totalFiles: number; fileList: string[]; images: ExtractedImage[]; skippedImageCount: number }> {
    const { owner, repo } = GitHubService.parseGithubUrl(repoUrl);

    onProgress(UI_MESSAGES.github.findingDefaultBranch);
    const branch = await this.getDefaultBranch(owner, repo);

    onProgress(UI_MESSAGES.github.downloadingZip);
    const zipBuffer = await this.downloadZipArchive(owner, repo, branch);

    const { fileList, payloadParts, images, skippedImageCount } = await this.extractZipContents(zipBuffer, onProgress);
    if (fileList.length === 0) throw new Error(UI_MESSAGES.github.noValidSource);

    const tree = ZipExtractor.buildDirectoryTree(fileList);
    const content =
      `[CẤU TRÚC THƯ MỤC DỰ ÁN]\n${tree}\n\n` +
      `[NỘI DUNG CHI TIẾT CÁC TỆP TIN NGUỒN]` + payloadParts.join('');

    return { content, totalFiles: fileList.length, fileList, images, skippedImageCount };
  }
}
