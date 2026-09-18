/**
 * Phân tích tĩnh mã nguồn (đếm dòng, phát hiện ngôn ngữ, Cyclomatic Complexity)
 * thuần JS phía client — port từ redux-ai-backend/app/features/code_analysis/service.py
 * để không còn phụ thuộc backend Python.
 *
 * Với Python, backend cũ dùng module `ast` để phân tích cây cú pháp thật; JS không có
 * tương đương nhẹ cho việc này nên dùng chung chiến lược regex/heuristic như nhánh
 * Java/JS/generic — đủ để làm gợi ý ngữ cảnh cho prompt AI, không phải nguồn tính điểm chính.
 */

export interface ASTMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  totalFunctions: number;
  totalClasses: number;
  cyclomaticComplexity: number;
  complexityRank: string;
  detectedPatterns: string[];
  potentialIssues: string[];
}

function emptyMetrics(): ASTMetrics {
  return {
    totalLines: 0,
    codeLines: 0,
    commentLines: 0,
    blankLines: 0,
    totalFunctions: 0,
    totalClasses: 0,
    cyclomaticComplexity: 1,
    complexityRank: "",
    detectedPatterns: [],
    potentialIssues: []
  };
}

export function detectLanguage(code: string, filename?: string): string {
  if (filename) {
    const fn = filename.toLowerCase();
    if (fn.endsWith('.py')) return 'python';
    if (fn.endsWith('.java')) return 'java';
    if (fn.endsWith('.js') || fn.endsWith('.jsx')) return 'javascript';
    if (fn.endsWith('.ts') || fn.endsWith('.tsx')) return 'typescript';
    if (fn.endsWith('.cpp') || fn.endsWith('.c') || fn.endsWith('.h') || fn.endsWith('.hpp')) return 'cpp';
    if (fn.endsWith('.html')) return 'html';
    if (fn.endsWith('.css')) return 'css';
  }

  if (code.includes('def ') || (code.includes('import ') && code.includes(':'))) return 'python';
  if (code.includes('public class ') || code.includes('public static void main')) return 'java';
  if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('console.log')) return 'javascript';
  if (code.includes('#include <') || code.includes('std::')) return 'cpp';
  return 'general';
}

function countLines(code: string, metrics: ASTMetrics): void {
  const lines = code.split('\n');
  metrics.totalLines = lines.length;
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      metrics.blankLines++;
    } else if (/^(#|\/\/|\/\*|\*|<!--)/.test(stripped)) {
      metrics.commentLines++;
    } else {
      metrics.codeLines++;
    }
  }
}

function analyzePython(code: string, metrics: ASTMetrics): void {
  // Không có "ast" module trong JS: dùng regex tương tự nhánh generic,
  // với thêm phát hiện def/class đơn giản.
  metrics.totalFunctions = (code.match(/^\s*(async\s+)?def\s+\w+/gm) || []).length;
  metrics.totalClasses = (code.match(/^\s*class\s+\w+/gm) || []).length;

  const branches = (code.match(/\b(if|elif|for|while|except|with|assert)\b/g) || []).length;
  const boolOps = (code.match(/\b(and|or)\b/g) || []).length;
  metrics.cyclomaticComplexity = Math.max(1, 1 + branches + boolOps);

  if (metrics.totalClasses > 0) metrics.detectedPatterns.push("Lập trình hướng đối tượng (OOP)");
  if (/\blambda\b/.test(code)) metrics.detectedPatterns.push("Biểu thức Lambda");
  if (/\[[^\]]*\bfor\b[^\]]*\]/.test(code)) metrics.detectedPatterns.push("List/Dict Comprehension");
}

function analyzeJava(code: string, metrics: ASTMetrics): void {
  metrics.totalClasses = (code.match(/\b(class|interface|enum)\s+[A-Z][a-zA-Z0-9_]*/g) || []).length;
  metrics.totalFunctions = (code.match(/(public|protected|private|static|\s)+\s+[\w<>[\]]+\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*(\{|throws)/g) || []).length;

  const branches = (code.match(/\b(if|else\s+if|for|while|case|catch)\b/g) || []).length;
  const logicalOps = (code.match(/(&&|\|\|)/g) || []).length;
  metrics.cyclomaticComplexity = Math.max(1, 1 + branches + logicalOps);

  if (code.includes("implements ") || code.includes("extends ")) {
    metrics.detectedPatterns.push("Kế thừa / Đa hình (Inheritance/Polymorphism)");
  }
  if (code.includes("@Override")) metrics.detectedPatterns.push("Ghi đè phương thức (@Override)");
  if (code.includes("try {") && code.includes("catch")) metrics.detectedPatterns.push("Xử lý ngoại lệ (Try-Catch Exception)");
  if (code.includes("Stream<") || code.includes(".stream()") || code.includes("->")) {
    metrics.detectedPatterns.push("Java Stream API & Lambda");
  }
}

function analyzeJsTs(code: string, metrics: ASTMetrics): void {
  metrics.totalFunctions = (code.match(/(function\s+[a-zA-Z0-9_]+|const\s+[a-zA-Z0-9_]+\s*=\s*(\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/g) || []).length;
  metrics.totalClasses = (code.match(/\bclass\s+[A-Z][a-zA-Z0-9_]*/g) || []).length;

  const branches = (code.match(/\b(if|else\s+if|for|while|case|catch)\b/g) || []).length;
  const logicalOps = (code.match(/(&&|\|\||\?\?)/g) || []).length;
  metrics.cyclomaticComplexity = Math.max(1, 1 + branches + logicalOps);

  if (code.includes("async ") && code.includes("await ")) metrics.detectedPatterns.push("Bất đồng bộ (Async/Await)");
  if (code.includes("useState(") || code.includes("useEffect(")) metrics.detectedPatterns.push("React Hooks");
  if (code.includes("export ") || code.includes("import ")) metrics.detectedPatterns.push("ES6 Modules");
}

function analyzeGeneric(code: string, metrics: ASTMetrics): void {
  const branches = (code.match(/\b(if|for|while|switch|case|catch)\b/g) || []).length;
  metrics.cyclomaticComplexity = Math.max(1, 1 + branches);
}

function rankComplexity(cc: number): string {
  if (cc <= 5) return "A (Rất đơn giản / Tốt)";
  if (cc <= 10) return "B (Độ phức tạp vừa phải)";
  if (cc <= 20) return "C (Khá phức tạp)";
  if (cc <= 30) return "D (Phức tạp / Cần refactor)";
  return "F (Cực kỳ phức tạp / Rủi ro cao)";
}

export function analyzeCode(code: string, language: string = "auto", filename?: string): { language: string; metrics: ASTMetrics } {
  const resolvedLanguage = language === "auto" || !language ? detectLanguage(code, filename) : language;
  const metrics = emptyMetrics();
  countLines(code, metrics);

  if (resolvedLanguage === 'python') {
    analyzePython(code, metrics);
  } else if (resolvedLanguage === 'java') {
    analyzeJava(code, metrics);
  } else if (resolvedLanguage === 'javascript' || resolvedLanguage === 'typescript') {
    analyzeJsTs(code, metrics);
  } else {
    analyzeGeneric(code, metrics);
  }

  metrics.complexityRank = rankComplexity(metrics.cyclomaticComplexity);
  return { language: resolvedLanguage, metrics };
}

export function buildAstSummary(language: string, metrics: ASTMetrics): string {
  return (
    `- Ngôn ngữ: ${language.toUpperCase()}\n` +
    `- Tổng số dòng: ${metrics.totalLines} (Thực tế code: ${metrics.codeLines} dòng, Chú thích: ${metrics.commentLines} dòng)\n` +
    `- Số hàm / phương thức: ${metrics.totalFunctions} | Số lớp (Classes): ${metrics.totalClasses}\n` +
    `- Độ phức tạp thuật toán Cyclomatic Complexity: ${metrics.cyclomaticComplexity} (${metrics.complexityRank})\n` +
    `- Các mẫu code phát hiện được: ${metrics.detectedPatterns.length > 0 ? metrics.detectedPatterns.join(', ') : 'Không có'}`
  );
}
