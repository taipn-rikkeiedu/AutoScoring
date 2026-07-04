export class GitHubService {
  constructor(token = "") {
    this.headers = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "AutoScoring/2.8"
    };
    if (token) {
      this.headers["Authorization"] = `token ${token}`;
    }
    this.allowedExtensions = [
      ".py", ".java", ".js", ".ts", ".cpp", ".c", ".cs", ".html", ".css", ".go", 
      ".kt", ".php", ".gradle", ".xml", ".properties", ".yml", ".yaml", ".json", ".md", ".docx"
    ];
    this.excludedDirs = [
      "node_modules/", ".venv", "env/", ".git/", "build/", "dist/", "target/", "__pycache__/", ".idea/", ".vscode/"
    ];
    this.excludedFiles = [
      "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "composer.lock", "pom.xml.tag", 
      ".gitignore", "LICENSE", "gradlew.bat", "gradlew", "mvnw.cmd", "mvnw"
    ];
    this.maxFiles = 100;
    this.maxChars = 500000;
  }

  parseUrl(repoUrl) {
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

  async getDefaultBranch(owner, repo) {
    const apiUr = `https://api.github.com/repos/${owner}/${repo}`;
    try {
      const response = await fetch(apiUr, { headers: this.headers });
      if (response.ok) {
        const data = await response.json();
        return data.default_branch || "main";
      }
    } catch (e) {
      console.error("Lỗi lấy default branch: ", e);
    }
    return "main";
  }

  async parseDocx(zipFileEntry) {
    try {
      const xmlText = await zipFileEntry.async("string");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");
      const textNodes = xmlDoc.getElementsByTagName("w:t");
      let result = [];
      for (let i = 0; i < textNodes.length; i++) {
        result.push(textNodes[i].textContent);
      }
      return result.join(" ");
    } catch (err) {
      return `\n[Lỗi đọc file docx: ${err.message}]\n`;
    }
  }

  buildDirectoryTree(filePaths) {
    const tree = {};
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

    function renderTree(node, prefix = "") {
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

  async getRepoContents(repoUrl, onProgress = null) {
    const { owner, repo } = this.parseUrl(repoUrl);
    if (onProgress) onProgress("Đang dò tìm nhánh mặc định...");
    const branch = await this.getDefaultBranch(owner, repo);

    if (onProgress) onProgress("Đang tải toàn bộ mã nguồn (.ZIP)...");
    const archiveUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
    
    let zipBlob = null;
    try {
      const res = await fetch(archiveUrl, { headers: this.headers });
      if (res.ok) {
        zipBlob = await res.blob();
      }
    } catch (zipErr) {
      console.warn("Tải zip lỗi, thử dùng API fallback", zipErr);
    }

    let payload = "";
    let processedFiles = 0;
    const fileList = [];

    if (zipBlob) {
      if (onProgress) onProgress("Giải nén và phân tích mã nguồn...");
      const jszip = new JSZip();
      const zip = await jszip.loadAsync(zipBlob);
      const fileNames = Object.keys(zip.files).sort();

      const prefix = fileNames[0] && fileNames[0].endsWith("/") ? fileNames[0] : "";

      for (const name of fileNames) {
        const fileEntry = zip.files[name];
        if (fileEntry.dir) continue;

        const isAllowed = this.allowedExtensions.some(ext => name.endsWith(ext));
        const isExcluded = this.excludedDirs.some(dir => name.includes(dir)) || 
                           this.excludedFiles.includes(name.split("/").pop());

        if (isAllowed && !isExcluded) {
          let content = "";
          if (name.endsWith(".docx")) {
            const docxZip = new JSZip();
            try {
              const subZip = await docxZip.loadAsync(await fileEntry.async("blob"));
              const wordXml = subZip.file("word/document.xml");
              if (wordXml) content = await this.parseDocx(wordXml);
            } catch (e) {
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
    const treeRes = await fetch(treeUrl, { headers: this.headers });
    if (!treeRes.ok) throw new Error(`Không thể kết nối đến GitHub API (HTTP ${treeRes.status})`);
    
    const treeData = await treeRes.json();
    const files = treeData.tree || [];

    for (const file of files) {
      if (file.type !== "blob") continue;
      const name = file.path;

      const isAllowed = this.allowedExtensions.some(ext => name.endsWith(ext));
      const isExcluded = this.excludedDirs.some(dir => name.includes(dir)) || 
                         this.excludedFiles.includes(name.split("/").pop());

      if (isAllowed && !isExcluded) {
        if (onProgress) onProgress(`Đang tải file: ${name.split("/").pop()} (${processedFiles + 1})...`);
        
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${name}`;
        const fileRes = await fetch(rawUrl, { headers: this.headers });
        if (!fileRes.ok) continue;

        let content = "";
        if (name.endsWith(".docx")) {
          const docxBlob = await fileRes.blob();
          const docxZip = new JSZip();
          try {
            const subZip = await docxZip.loadAsync(docxBlob);
            const wordXml = subZip.file("word/document.xml");
            if (wordXml) content = await this.parseDocx(wordXml);
          } catch (e) {
            content = `[Lỗi đọc Word docx: ${e.message}]`;
          }
        } else {
          content = await fileRes.text();
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
