import JSZip from 'jszip';

export class GitHubService {
  private headers: Record<string, string>;
  private allowedExtensions: string[];
  private excludedDirs: string[];
  private excludedFiles: string[];
  private maxFiles: number;
  private maxChars: number;

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

    const version = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest 
      ? chrome.runtime.getManifest().version 
      : "3.6.4";

    this.headers = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": `REduX/${version}`
    };
    if (cleanToken) {
      this.headers["Authorization"] = `token ${cleanToken}`;
    }

    this.allowedExtensions = [
      ".py", ".java", ".js", ".ts", ".cpp", ".c", ".cs", ".html", ".css", ".go", 
      ".kt", ".php", ".gradle", ".xml", ".properties", ".yml", ".yaml", ".json", ".md", ".docx"
    ];
    
    this.excludedDirs = [
      "node_modules", ".venv", "venv", ".git", "__pycache__"
    ];
    this.excludedFiles = [
      "LICENSE"
    ];

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
        if (cleanDir && !this.excludedDirs.includes(cleanDir)) {
          this.excludedDirs.push(cleanDir);
        }
      } else {
        if (!this.excludedFiles.includes(item)) {
          this.excludedFiles.push(item);
        }
      }
    });

    this.maxFiles = 100;
    this.maxChars = 500000;
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
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!response || !response.success) {
          return reject(new Error(response ? response.error : "Không nhận được phản hồi từ Background Service Worker"));
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
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              return new Blob([bytes], { type: "application/zip" });
            }
            throw new Error("Không có dữ liệu nhị phân để tạo Blob");
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
    } catch (e) {
      console.error("Lỗi lấy default branch: ", e);
    }
    return "main";
  }

  private async parseDocx(zipFileEntry: any): Promise<string> {
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

  private buildDirectoryTree(filePaths: string[]): string {
    const tree: any = {};
    for (const path of filePaths) {
      const parts = path.split('/');
      let current = tree;
      for (const part of parts) {
        if (!current[part]) {
          current[part] = {};
        }
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

  async getRepoContents(
    repoUrl: string, 
    onProgress: ((msg: string) => void) | null = null
  ): Promise<{ content: string; totalFiles: number; fileList: string[] }> {
    const { owner, repo } = this.parseUrl(repoUrl);
    if (onProgress) onProgress("Đang dò tìm nhánh mặc định...");
    const branch = await this.getDefaultBranch(owner, repo);

    if (onProgress) onProgress("Đang tải toàn bộ mã nguồn (.ZIP)...");
    
    let archiveUrl: string;
    let fetchHeaders: Record<string, string> = {};

    if (this.headers["Authorization"]) {
      archiveUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
      fetchHeaders = { ...this.headers };
    } else {
      archiveUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
      fetchHeaders = {
        "Accept": "*/*"
      };
    }
    
    let zipBlob: Blob | null = null;
    try {
      const res = await this.safeFetch(archiveUrl, { headers: fetchHeaders });
      if (res.ok) {
        zipBlob = await res.blob();
      } else {
        console.warn(`Tải zip phản hồi mã lỗi HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (zipErr) {
      console.warn("Tải zip lỗi, thử dùng API fallback", zipErr);
    }

    let payload = "";
    let processedFiles = 0;
    const fileList: string[] = [];

    if (zipBlob) {
      if (onProgress) onProgress("Giải nén và phân tích mã nguồn...");
      const jszip = new JSZip();
      const zip = await jszip.loadAsync(zipBlob);
      const fileNames = Object.keys(zip.files).sort();

      const prefix = fileNames[0] && fileNames[0].endsWith("/") ? fileNames[0] : "";

      for (const name of fileNames) {
        const fileEntry = zip.files[name];
        if (fileEntry.dir) continue;

        const normalizedPath = name.replace(/\\/g, '/');
        const segments = normalizedPath.split("/");
        const filename = segments.pop() || "";

        const isAllowed = this.allowedExtensions.some(ext => normalizedPath.endsWith(ext));
        const isExcludedDir = segments.some(seg => 
          this.excludedDirs.some(dir => seg.toLowerCase() === dir.toLowerCase())
        );
        const isExcludedFile = this.excludedFiles.some(file => 
          filename.toLowerCase() === file.toLowerCase()
        );
        const isExcluded = isExcludedDir || isExcludedFile;

        if (isAllowed && !isExcluded) {
          let content = "";
          if (name.endsWith(".docx")) {
            const docxZip = new JSZip();
            try {
              const subBlob = await fileEntry.async("blob");
              const subZip = await docxZip.loadAsync(subBlob);
              const wordXml = subZip.file("word/document.xml");
              if (wordXml) content = await this.parseDocx(wordXml);
            } catch (e: any) {
              content = `[Lỗi đọc Word docx: ${e.message}]`;
            }
          } else {
            content = await fileEntry.async("string");
          }

          const cleanPath = prefix ? name.replace(prefix, "") : name;
          fileList.push(cleanPath);
          
          payload += `\n\n=============================================\n`;
          payload += `FILE PATH: ${cleanPath}\n`;
          payload += `=============================================\n`;
          payload += content;

          processedFiles++;
          if (processedFiles > this.maxFiles) {
            throw new Error(`Dự án vượt quá số lượng ${this.maxFiles} tệp tin.`);
          }
          if (payload.length > this.maxChars) {
            throw new Error(`Dự án vượt quá giới hạn ${this.maxChars} ký tự.`);
          }
        }
      }
      
      const treeStr = this.buildDirectoryTree(fileList);
      payload = `[CẤU TRÚC THƯ MỤC DỰ ÁN]\n${treeStr}\n\n` + payload;
      
      return { content: payload, totalFiles: processedFiles, fileList: fileList };
    }

    if (onProgress) onProgress("Tải ZIP thất bại. Đang thử dùng Git Trees API...");
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    
    let treeRes;
    try {
      treeRes = await this.safeFetch(treeUrl, { headers: this.headers });
    } catch (netErr: any) {
      throw new Error(`Không thể kết nối đến GitHub API do lỗi mạng hoặc cấu hình Token không hợp lệ. Chi tiết: ${netErr.message}`);
    }

    if (!treeRes.ok) {
      let errMsg = `Không thể kết nối đến GitHub API (HTTP ${treeRes.status})`;
      if (treeRes.status === 401) {
        errMsg = "GitHub Token không hợp lệ hoặc đã hết hạn (HTTP 401). Vui lòng kiểm tra lại cấu hình.";
      } else if (treeRes.status === 403) {
        errMsg = "Giới hạn truy cập GitHub API đã hết hoặc bị cấm (HTTP 403). Vui lòng cấu hình Token để tiếp tục.";
      } else if (treeRes.status === 404) {
        errMsg = `Không tìm thấy repository hoặc nhánh mặc định '${branch}' (HTTP 404).`;
      }
      throw new Error(errMsg);
    }
    
    const treeData = await treeRes.json();
    const files = treeData.tree || [];

    for (const file of files) {
      if (file.type !== "blob") continue;
      const name = file.path;

      const normalizedPath = name.replace(/\\/g, '/');
      const segments = normalizedPath.split("/");
      const filename = segments.pop() || "";

      const isAllowed = this.allowedExtensions.some(ext => normalizedPath.endsWith(ext));
      const isExcludedDir = segments.some((seg: string) => 
        this.excludedDirs.some(dir => seg.toLowerCase() === dir.toLowerCase())
      );
      const isExcludedFile = this.excludedFiles.some(file => 
        filename.toLowerCase() === file.toLowerCase()
      );
      const isExcluded = isExcludedDir || isExcludedFile;

      if (isAllowed && !isExcluded) {
        if (onProgress) onProgress(`Đang tải file: ${name.split("/").pop()} (${processedFiles + 1})...`);
        
        const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${name}?ref=${branch}`;
        const fileRes = await this.safeFetch(contentUrl, { headers: this.headers });
        if (!fileRes.ok) continue;

        const fileData = await fileRes.json();
        let content = "";
        
        if (fileData.encoding === "base64" && fileData.content) {
          const cleanBase64 = fileData.content.replace(/\r?\n|\r|\s/g, "");
          
          if (name.endsWith(".docx")) {
            const binary = atob(cleanBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const docxBlob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
            const docxZip = new JSZip();
            try {
              const subZip = await docxZip.loadAsync(docxBlob);
              const wordXml = subZip.file("word/document.xml");
              if (wordXml) content = await this.parseDocx(wordXml);
            } catch (e: any) {
              content = `[Lỗi đọc Word docx: ${e.message}]`;
            }
          } else {
            try {
              const binary = atob(cleanBase64);
              content = decodeURIComponent(
                binary
                  .split("")
                  .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                  .join("")
              );
            } catch (decodeErr) {
              content = atob(cleanBase64);
            }
          }
        } else {
          content = fileData.content || "";
        }

        fileList.push(name);
        
        payload += `\n\n=============================================\n`;
        payload += `FILE PATH: ${name}\n`;
        payload += `=============================================\n`;
        payload += content;

        processedFiles++;
        if (processedFiles > this.maxFiles) {
          throw new Error(`Dự án vượt quá số lượng ${this.maxFiles} tệp tin.`);
        }
        if (payload.length > this.maxChars) {
          throw new Error(`Dự án vượt quá giới hạn ${this.maxChars} ký tự.`);
        }
      }
    }

    if (processedFiles === 0) throw new Error("Không tìm thấy mã nguồn hợp lệ trong Repo.");
    
    const treeStr = this.buildDirectoryTree(fileList);
    payload = `[CẤU TRÚC THƯ MỤC DỰ ÁN]\n${treeStr}\n\n` + payload;
    
    return { content: payload, totalFiles: processedFiles, fileList: fileList };
  }
}
