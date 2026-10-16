/**
 * Đổi HTML đề bài trên QLĐT sang dạng Markdown gọn cho AI, KHÔNG làm mất:
 * - Link: giữ cả chữ và địa chỉ → [chữ](url)
 * - Code mẫu (<pre>, <code>): giữ nguyên thụt dòng trong khối ``` ```
 * - Ảnh: đánh số [Ảnh n] tại đúng vị trí trong đề và trả về danh sách địa chỉ ảnh để gửi kèm cho AI
 */

/** Gốc để đổi đường dẫn ảnh / link tương đối của QLĐT thành tuyệt đối. */
const QLDT_ASSET_BASE = 'https://apiportal.rikkei.edu.vn/';

export interface HtmlContent {
  text: string;
  /** Địa chỉ ảnh theo thứ tự xuất hiện (http(s) hoặc data:), khớp với nhãn [Ảnh n] trong text. */
  images: string[];
}

const absoluteUrl = (src: string) => {
  const s = (src || '').trim();
  if (!s || /^(data:|https?:)/i.test(s)) return s;
  try { return new URL(s, QLDT_ASSET_BASE).href; } catch { return s; }
};

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'blockquote', 'figure', 'figcaption', 'ul', 'ol', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr']);

/**
 * @param images danh sách ảnh dùng chung giữa các phần (mô tả, hướng dẫn, tiêu chí) để đánh số liên tục.
 */
export function htmlToMarkdown(html: string, images: string[] = []): string {
  const source = String(html || '');
  if (!source.trim()) return '';
  if (typeof DOMParser === 'undefined') return legacyHtmlToText(source);
  const doc = new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');

  const inline = (text: string) => text.replace(/[ \t\r\n ]+/g, ' ');

  const walk = (node: Node, ctx: { list?: { ordered: boolean; index: number } }): string => {
    if (node.nodeType === Node.TEXT_NODE) return inline(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = (c = ctx) => Array.from(el.childNodes).map(n => walk(n, c)).join('');

    switch (tag) {
      case 'script': case 'style': case 'head': return '';
      case 'br': return '\n';
      case 'img': {
        const src = absoluteUrl(el.getAttribute('src') || '');
        if (!src) return '';
        let n = images.indexOf(src) + 1;
        if (!n) { images.push(src); n = images.length; }
        const alt = (el.getAttribute('alt') || el.getAttribute('title') || '').trim();
        return ` [Ảnh ${n}${alt ? `: ${alt}` : ''}] `;
      }
      case 'a': {
        const href = absoluteUrl(el.getAttribute('href') || '');
        const label = children().trim();
        if (!href || /^(javascript:|#)/i.test(href)) return label;
        if (!label || label === href) return href;
        return `[${label}](${href})`;
      }
      case 'pre': {
        // Giữ nguyên thụt dòng; ngôn ngữ lấy từ class kiểu "language-java" nếu có
        const code = el.querySelector('code');
        const lang = ((code || el).className.match(/(?:language|lang)-([\w+#-]+)/) || [])[1] || '';
        const body = (el.textContent || '').replace(/ /g, ' ').replace(/^\n+|\s+$/g, '');
        return `\n\n\`\`\`${lang}\n${body}\n\`\`\`\n\n`;
      }
      case 'code': {
        const body = el.textContent || '';
        return body.includes('\n') ? `\n\n\`\`\`\n${body.replace(/\s+$/, '')}\n\`\`\`\n\n` : `\`${body}\``;
      }
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return `\n\n${'#'.repeat(Math.min(Number(tag[1]) + 1, 6))} ${children().trim()}\n\n`;
      case 'ul': case 'ol':
        return `\n${children({ list: { ordered: tag === 'ol', index: 0 } })}\n`;
      case 'li': {
        const list = ctx.list;
        const bullet = list?.ordered ? `${++list.index}. ` : '- ';
        return `\n${bullet}${children({}).trim()}`;
      }
      case 'tr': {
        const cells = Array.from(el.children).filter(c => /^t[dh]$/i.test(c.tagName)).map(c => walk(c, {}).trim().replace(/\n+/g, ' '));
        return `\n| ${cells.join(' | ')} |`;
      }
      case 'hr': return '\n\n---\n\n';
      default: {
        const body = children();
        return BLOCK_TAGS.has(tag) ? `\n\n${body}\n\n` : body;
      }
    }
  };

  // Dọn khoảng trắng thừa ngoài khối code (phần lẻ là nội dung trong ``` … ```, giữ nguyên)
  return walk(doc.body, {})
    .split(/(\n```[^\n]*\n[\s\S]*?\n```\n)/)
    .map((part, i) => (i % 2 ? part : part.replace(/^[ \t]+|[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n')))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function htmlToContent(html: string): HtmlContent {
  const images: string[] = [];
  return { text: htmlToMarkdown(html, images), images };
}

/** Bản cũ (không có DOM): bỏ thẻ, giữ xuống dòng. Chỉ dùng khi không có DOMParser. */
function legacyHtmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}
