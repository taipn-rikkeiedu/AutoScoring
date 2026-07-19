import JSZip from 'jszip';
import { ZipExtractor } from './zipExtractor';

export class GitHubService {
  private headers: Record<string, string>;
  private allowedExtensions: string[];
  private excludedDirs: string[];
  private excludedFiles: string[];
  private maxFiles = 100;
  private maxChars = 500000;

  constructor(token = "", customIgnoreItems: string[] | null = null) {
    let cleanToken = typeof token === "string" ? token.trim() : "";
    if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) || (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
      cleanToken = cleanToken.slice(1, -1).trim();
    }
    if (cleanToken.toLowerCase().startsWith("bearer ")) {
      cleanToken = cleanToken.substring(7).trim();
    } else if (cleanToken.toLowerCase().startsWith("token ")) {
      cleanToken = cleanToken.substring(6).trim();
    }

    const version = typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : "4.0.0";
    this.headers = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": `REduX/${version}`
    };
    if (cleanToken) this.headers["Authorization"] = `token ${cleanToken}`;

    this.allowedExtensions = [
      ".py", ".java", ".js", ".ts", ".cpp", ".c", ".cs", ".html", ".css", ".go", 
      ".kt", ".php", ".gradle", ".xml", ".properties", ".yml", ".yaml", ".json", ".md", ".docx"
    ];
    this.excludedDirs = ["node_modules", ".venv", "venv", ".git", "__pycache__"];
    this.excludedFiles = ["LICENSE"];

    const itemsToExclude = customIgnoreItems !== null ? customIgnoreItems : [
      "build/", "dist/", "target/", "out/", ".vscode/", ".idea/", "env/", "venv/", "__pycache__/",
      "Scripts/", "Lib/", "scripts/", "lib/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", 
      "composer.lock", "gradlew/mvnw", ".gitignore"
    ];

    itemsToExclude.forEach(item => {
      if (item === "gradlew/mvnw") {
        this.excludedFiles.push("gradlew", "gradlew.bat", "mvnw", "mvnw.cmd");
      } else if (item.endsWith('/')) {
        const cleanDir = item.slice(0, -1);
        if (cleanDir && !this.excludedDirs.includes(cleanDir)) this.excludedDirs.push(cleanDir);
      } else {
        if (!this.excludedFiles.includes(item)) this.excludedFiles.push(item);
      }
    });
  }

  private parseUrl(repoUrl: string): { owner: string; repo: string } {
    let clean = repoUrl.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "https://github.com/");
    }
    const match = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new Error("GitHub URL không hợp lệ. Hãy điền theo mẫu: https://github.com/user/repo-name");
    }
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  }

  private async safeFetch(url: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "FETCH", url, options }, (response) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!response || !response.success) {
          return reject(new Error(response ? response.error : "Không phản hồi từ background"));
        }
        resolve({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          json: async () => JSON.parse(response.text),
          text: async () => response.text,
          blob: async () => {
            if (response.base64) {
              const binary = atob(response.base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              return new Blob([bytes], { type: "application/zip" });
            }
            throw new Error("Không có dữ liệu nhị phân");
          }
        });
      });
    });
  }

  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const apiUr = `https://api.github.com/repos/${owner}/${repo}`;
    try {
      const response = await this.safeFetch(apiUr, { headers: this.headers });
      if (response.ok) {
        const data = await response.json();
        return data.default_branch || "main";
      }
    } catch {}
    return "main";
  }

  private isFileExcluded(normalizedPath: string, filename: string, segments: string[]): boolean {
    const isAllowed = this.allowedExtensions.some(ext => normalizedPath.endsWith(ext));
    if (!isAllowed) return true;
    const isExcludedDir = segments.some(seg => this.excludedDirs.some(dir => seg.toLowerCase() === dir.toLowerCase()));
    const isExcludedFile = this.excludedFiles.some(file => filename.toLowerCase() === file.toLowerCase());
    return isExcludedDir || isExcludedFile;
  }

  private compressCodeByLanguage(content: string, filePath: string): string {
    const isPython = filePath.endsWith('.py');
    const isYaml = filePath.endsWith('.yml') || filePath.endsWith('.yaml');
    const lines = content.split('\n');
    const compressed: string[] = [];
    let prevBlank = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        if (!prevBlank) compressed.push("");
        prevBlank = true;
      } else {
        prevBlank = false;
        if (isPython || isYaml) {
          compressed.push(line.trimEnd());
        } else {
          compressed.push(trimmedLine);
        }
      }
    }
    return compressed.join('\n');
  }

  private async saveToCache(cacheKey: string, newEntry: any): Promise<void> {
    try {
      const allData = await new Promise<any>(resolve => chrome.storage.local.get(null, resolve));
      const cacheEntries: Array<{ key: string; cachedAt: number }> = [];
      
      for (const key in allData) {
        if (key.startsWith('code_cache:')) {
          cacheEntries.push({ key, cachedAt: allData[key].cachedAt || 0 });
        }
      }

      if (cacheEntries.length >= 100) {
        cacheEntries.sort((a, b) => a.cachedAt - b.cachedAt);
        const toRemoveCount = (cacheEntries.length - 100) + 1;
        const keysToRemove = cacheEntries.slice(0, toRemoveCount).map(item => item.key);
        await new Promise<void>(resolve => chrome.storage.local.remove(keysToRemove, () => resolve()));
      }

      await new Promise<void>(resolve => chrome.storage.local.set({ [cacheKey]: newEntry }, resolve));
    } catch (err) {
      console.warn("Lỗi ghi cache:", err);
    }
  }

  async getRepoContents(
    repoUrl: string, 
    onProgress: ((msg: string) => void) | null = null
  ): Promise<{ content: string; totalFiles: number; fileList: string[] }> {
    const { owner, repo } = this.parseUrl(repoUrl);
    if (onProgress) onProgress("Đang dò tìm nhánh mặc định...");
    const branch = await this.getDefaultBranch(owner, repo);

    const cacheKey = `code_cache:${owner.toLowerCase()}/${repo.toLowerCase()}`;
    let cachedData: any = null;
    try {
      const res = await new Promise<any>(resolve => chrome.storage.local.get(cacheKey, resolve));
      cachedData = res[cacheKey];
    } catch (err) {
      console.warn("Lỗi đọc cache:", err);
    }

    let latestSha = "";
    let useCache = false;

    if (cachedData && cachedData.sha) {
      if (onProgress) onProgress("Đang kiểm tra cập nhật mã nguồn trên GitHub...");
      try {
        const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`;
        const commitRes = await this.safeFetch(commitUrl, { headers: this.headers });
        if (commitRes.ok) {
          const commits = await commitRes.json();
          if (commits && commits[0] && commits[0].sha) {
            latestSha = commits[0].sha;
            if (latestSha === cachedData.sha) {
              useCache = true;
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra commit SHA mới nhất, bỏ qua cache:", err);
      }
    }

    if (useCache && cachedData) {
      if (onProgress) onProgress("Sử dụng mã nguồn từ bộ nhớ đệm (Cache)...");
      return {
        content: cachedData.content,
        totalFiles: cachedData.totalFiles,
        fileList: cachedData.fileList
      };
    }

    let repoData: any = null;
    try {
      if (onProgress) onProgress("Đang tải toàn bộ mã nguồn (.ZIP)...");
      const archiveUrl = this.headers["Authorization"]
        ? `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`
        : `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
      
      const res = await this.safeFetch(archiveUrl, { headers: this.headers["Authorization"] ? this.headers : { "Accept": "*/*" } });
      if (res.ok) {
        const zipBlob = await res.blob();
        repoData = await this.processZipBlob(zipBlob, onProgress);
      }
    } catch (err) {
      console.warn("Tải ZIP lỗi, thử fallback Git Trees API", err);
    }

    if (!repoData) {
      if (onProgress) onProgress("Tải ZIP thất bại. Đang thử dùng Git Trees API...");
      repoData = await this.fetchGitTreeFallback(owner, repo, branch, onProgress);
    }

    if (repoData) {
      if (!latestSha) {
        try {
          const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`;
          const commitRes = await this.safeFetch(commitUrl, { headers: this.headers });
          if (commitRes.ok) {
            const commits = await commitRes.json();
            if (commits && commits[0] && commits[0].sha) {
              latestSha = commits[0].sha;
            }
          }
        } catch {}
      }

      if (latestSha) {
        const newCacheEntry = {
          sha: latestSha,
          cachedAt: Date.now(),
          content: repoData.content,
          totalFiles: repoData.totalFiles,
          fileList: repoData.fileList
        };
        await this.saveToCache(cacheKey, newCacheEntry);
      }
    }

    return repoData;
  }

  private async processZipBlob(zipBlob: Blob, onProgress: any): Promise<any> {
    if (onProgress) onProgress("Giải nén và phân tích mã nguồn...");
    const zip = await new JSZip().loadAsync(zipBlob);
    const fileNames = Object.keys(zip.files).sort();
    const prefix = fileNames[0]?.endsWith("/") ? fileNames[0] : "";
    
    let payload = "";
    let processedFiles = 0;
    const fileList: string[] = [];

    for (const name of fileNames) {
      const fileEntry = zip.files[name];
      if (fileEntry.dir) continue;

      const normalizedPath = name.replace(/\\/g, '/');
      const segments = normalizedPath.split("/");
      const filename = segments.pop() || "";

      if (!this.isFileExcluded(normalizedPath, filename, segments)) {
        let content = "";
        if (name.endsWith(".docx")) {
          content = await ZipExtractor.parseDocxFromBlob(await fileEntry.async("blob"));
        } else {
          content = await fileEntry.async("string");
        }

        const cleanPath = prefix ? name.replace(prefix, "") : name;
        const compressedContent = this.compressCodeByLanguage(content, cleanPath);
        fileList.push(cleanPath);
        payload += `\n\n=============================================\nFILE PATH: ${cleanPath}\n=============================================\n${compressedContent}`;
        
        processedFiles++;
        if (processedFiles > this.maxFiles) throw new Error(`Vượt giới hạn số lượng ${this.maxFiles} tệp tin.`);
        if (payload.length > this.maxChars) throw new Error(`Vượt giới hạn kích thước ${this.maxChars} ký tự.`);
      }
    }
    const treeStr = ZipExtractor.buildDirectoryTree(fileList);
    return { content: `[CẤU TRÚC THƯ MỤC DỰ ÁN]\n${treeStr}\n\n` + payload, totalFiles: processedFiles, fileList };
  }

  private async fetchGitTreeFallback(owner: string, repo: string, branch: string, onProgress: any): Promise<any> {
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const treeRes = await this.safeFetch(treeUrl, { headers: this.headers });
    
    if (!treeRes.ok) {
      if (treeRes.status === 401) throw new Error("GitHub Token không hợp lệ (HTTP 401).");
      if (treeRes.status === 403) throw new Error("Giới hạn truy cập API hết hạn (HTTP 403).");
      if (treeRes.status === 404) throw new Error(`Không tìm thấy repo hoặc nhánh '${branch}' (HTTP 404).`);
      throw new Error(`Lỗi kết nối GitHub API (HTTP ${treeRes.status})`);
    }

    const treeData = await treeRes.json();
    const files = treeData.tree || [];
    const filesToDownload = files.filter((file: any) => {
      if (file.type !== "blob") return false;
      const name = file.path;
      const normalizedPath = name.replace(/\\/g, '/');
      const segments = normalizedPath.split("/");
      const filename = segments.pop() || "";
      return !this.isFileExcluded(normalizedPath, filename, segments);
    }).slice(0, this.maxFiles);

    if (filesToDownload.length === 0) throw new Error("Không tìm thấy mã nguồn hợp lệ trong Repo.");

    const concurrencyLimit = 5;
    const downloadResults: Array<{ name: string; content: string } | null> = Array(filesToDownload.length).fill(null);
    let index = 0;

    const downloadWorker = async () => {
      while (true) {
        const currentIndex = index++;
        if (currentIndex >= filesToDownload.length) break;

        const file = filesToDownload[currentIndex];
        const name = file.path;
        const normalizedPath = name.replace(/\\/g, '/');
        const segments = normalizedPath.split("/");
        const filename = segments.pop() || "";

        if (onProgress) {
          onProgress(`Đang tải file: ${filename} (${currentIndex + 1}/${filesToDownload.length})...`);
        }

        try {
          const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(name)}?ref=${branch}`;
          const fileRes = await this.safeFetch(contentUrl, { headers: this.headers });
          if (!fileRes.ok) continue;

          const fileData = await fileRes.json();
          let content = "";
          if (fileData.encoding === "base64" && fileData.content) {
            const cleanBase64 = fileData.content.replace(/\s/g, "");
            if (name.endsWith(".docx")) {
              const binary = atob(cleanBase64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              content = await ZipExtractor.parseDocxFromBlob(new Blob([bytes], { type: "application/vnd.docx" }));
            } else {
              try {
                content = decodeURIComponent(atob(cleanBase64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
              } catch {
                content = atob(cleanBase64);
              }
            }
          } else {
            content = fileData.content || "";
          }

          const compressedContent = this.compressCodeByLanguage(content, name);
          downloadResults[currentIndex] = { name, content: compressedContent };
        } catch (err) {
          console.warn(`Lỗi tải tệp ${name}:`, err);
        }
      }
    };

    const workers = Array(Math.min(concurrencyLimit, filesToDownload.length))
      .fill(null)
      .map(() => downloadWorker());

    await Promise.all(workers);

    let payload = "";
    let processedFiles = 0;
    const fileList: string[] = [];

    for (const res of downloadResults) {
      if (res) {
        fileList.push(res.name);
        payload += `\n\n=============================================\nFILE PATH: ${res.name}\n=============================================\n${res.content}`;
        processedFiles++;
      }
    }

    if (processedFiles === 0) throw new Error("Không tải được tệp tin hợp lệ nào từ Repo.");
    const treeStr = ZipExtractor.buildDirectoryTree(fileList);
    return { content: `[CẤU TRÚC THƯ MỤC DỰ ÁN]\n${treeStr}\n\n` + payload, totalFiles: processedFiles, fileList };
  }
}
