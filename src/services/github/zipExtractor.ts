import JSZip from 'jszip';

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

  static async parseDocxFromBlob(docxBlob: Blob): Promise<string> {
    const docxZip = new JSZip();
    try {
      const subZip = await docxZip.loadAsync(docxBlob);
      const wordXml = subZip.file("word/document.xml");
      if (wordXml) return await this.parseDocx(wordXml);
    } catch (e: any) {
      return `[Lỗi đọc Word docx: ${e.message}]`;
    }
    return "";
  }
}
