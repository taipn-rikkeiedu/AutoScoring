import JSZip from 'jszip';

export interface ExerciseData {
  assignment: string;
  criteria: string;
}

export type ExerciseLibrary = Record<string, Record<string, Record<string, ExerciseData>>>;

/**
 * Làm sạch tên tệp để phù hợp với hệ điều hành Windows, macOS và Linux
 */
export function sanitizeFileName(name: string, fallback = 'exercise'): string {
  if (!name) return fallback;
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '');
  return cleaned || fallback;
}

/**
 * Định dạng một đề bài thành nội dung chuẩn Markdown (.md)
 */
export function formatExerciseToMarkdown(options: {
  chapter: string;
  session: string;
  assignmentName: string;
  assignmentText: string;
  criteriaText?: string;
  includeMetadata?: boolean;
}): string {
  const { chapter, session, assignmentName, assignmentText, criteriaText, includeMetadata = true } = options;
  const exportDate = new Date().toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const lines: string[] = [];

  // Tiêu đề chính
  lines.push(`# ${assignmentName || 'Bài tập'}`);
  lines.push('');

  // Metadata thông tin bài tập
  if (includeMetadata) {
    lines.push(`> 📚 **Chương trình / Khóa học**: ${chapter || 'N/A'}  `);
    lines.push(`> 📖 **Session**: ${session || 'N/A'}  `);
    lines.push(`> 🕒 **Thời gian xuất**: ${exportDate}  `);
    lines.push(`> ⚡ **Nguồn**: REduX LMS AutoScoring Library`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Phần Đề bài (Mô tả)
  lines.push('## 📝 Đề bài (Mô tả)');
  lines.push('');
  if (assignmentText && assignmentText.trim()) {
    lines.push(assignmentText.trim());
  } else {
    lines.push('_Chưa có nội dung mô tả đề bài._');
  }
  lines.push('');

  // Phần Tiêu chí chấm điểm (Rubric)
  lines.push('---');
  lines.push('');
  lines.push('## 🎯 Tiêu chí chấm điểm (Rubric)');
  lines.push('');
  if (criteriaText && criteriaText.trim()) {
    lines.push(criteriaText.trim());
  } else {
    lines.push('_Áp dụng tiêu chí chấm mặc định theo chuẩn của môn học._');
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Tải xuống Blob dữ liệu dưới dạng tệp tin về máy tính
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Tải xuống chuỗi nội dung văn bản dưới dạng tệp Markdown (.md)
 */
export function downloadMarkdownFile(content: string, fileName: string): void {
  const finalName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, finalName);
}

/**
 * Xuất 1 bài tập đơn lẻ sang tệp .md
 */
export function exportSingleExerciseToMd(
  chapter: string,
  session: string,
  assignmentName: string,
  assignmentText: string,
  criteriaText?: string
): void {
  const mdContent = formatExerciseToMarkdown({
    chapter,
    session,
    assignmentName,
    assignmentText,
    criteriaText
  });

  const safeChapter = sanitizeFileName(chapter, 'Course');
  const safeSession = sanitizeFileName(session, 'Session');
  const safeName = sanitizeFileName(assignmentName, 'Exercise');
  const fileName = `${safeChapter}_${safeSession}_${safeName}.md`;

  downloadMarkdownFile(mdContent, fileName);
}

/**
 * Xuất toàn bộ bài tập trong 1 Session ra tệp nén .zip chứa từng tệp .md
 */
export async function exportSessionToZip(
  chapter: string,
  session: string,
  exercises: Record<string, ExerciseData>
): Promise<void> {
  const zip = new JSZip();
  const safeChapter = sanitizeFileName(chapter, 'Course');
  const safeSession = sanitizeFileName(session, 'Session');

  const exerciseNames = Object.keys(exercises).sort();
  if (exerciseNames.length === 0) {
    throw new Error('Session này hiện chưa có bài tập nào.');
  }

  // Tạo file README tóm tắt Session
  const summaryLines: string[] = [
    `# 📁 ${session}`,
    '',
    `> **Khóa học**: ${chapter}  `,
    `> **Tổng số bài tập**: ${exerciseNames.length} bài  `,
    `> **Thời gian tạo**: ${new Date().toLocaleString('vi-VN')}  `,
    '',
    '## 📑 Danh sách bài tập trong Session:',
    ''
  ];

  exerciseNames.forEach((name, idx) => {
    const ex = exercises[name];
    const safeName = sanitizeFileName(name, `BaiTap_${idx + 1}`);
    const mdFileName = `${String(idx + 1).padStart(2, '0')}_${safeName}.md`;
    
    // Tạo nội dung Markdown cho từng bài
    const content = formatExerciseToMarkdown({
      chapter,
      session,
      assignmentName: name,
      assignmentText: ex.assignment || '',
      criteriaText: ex.criteria || ''
    });

    zip.file(mdFileName, content);
    summaryLines.push(`${idx + 1}. [${name}](./${encodeURIComponent(mdFileName)})`);
  });

  summaryLines.push('');
  zip.file('README.md', summaryLines.join('\n'));

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const zipFileName = `${safeChapter}_${safeSession}_Exercises.zip`;
  downloadBlob(zipBlob, zipFileName);
}

/**
 * Xuất toàn bộ Kho đề bài ra tệp nén .zip có đầy đủ cấu trúc thư mục phân cấp
 */
export async function exportLibraryToZip(
  library: ExerciseLibrary
): Promise<{ totalChapters: number; totalSessions: number; totalExercises: number }> {
  const zip = new JSZip();
  const chapters = Object.keys(library).sort();

  if (chapters.length === 0) {
    throw new Error('Kho đề bài hiện đang trống.');
  }

  let totalSessions = 0;
  let totalExercises = 0;

  const rootReadmeLines: string[] = [
    '# 📚 Kho Đề Bài Rikkei Education (REduX Library)',
    '',
    `> **Ngày xuất**: ${new Date().toLocaleString('vi-VN')}  `,
    '> **Được xuất bởi**: REduX AutoScoring Extension  ',
    '',
    '## 🗂️ Mục lục các chương trình / Khóa học:',
    ''
  ];

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chap = chapters[cIdx];
    const safeChap = `${String(cIdx + 1).padStart(2, '0')}_${sanitizeFileName(chap, `Course_${cIdx + 1}`)}`;
    const sessions = library[chap] || {};
    const sessionKeys = Object.keys(sessions).sort();
    totalSessions += sessionKeys.length;

    rootReadmeLines.push(`### 📘 [${chap}](./${encodeURIComponent(safeChap)})`);
    rootReadmeLines.push('');

    const chapReadmeLines: string[] = [
      `# 📘 Khóa học: ${chap}`,
      '',
      `> **Số Sessions**: ${sessionKeys.length}  `,
      '',
      '## 📑 Danh sách Sessions:',
      ''
    ];

    for (let sIdx = 0; sIdx < sessionKeys.length; sIdx++) {
      const sess = sessionKeys[sIdx];
      const safeSess = `${String(sIdx + 1).padStart(2, '0')}_${sanitizeFileName(sess, `Session_${sIdx + 1}`)}`;
      const assignments = sessions[sess] || {};
      const assignmentKeys = Object.keys(assignments).sort();
      totalExercises += assignmentKeys.length;

      rootReadmeLines.push(`- **${sess}** (${assignmentKeys.length} bài tập)`);
      chapReadmeLines.push(`### 📁 [${sess}](./${encodeURIComponent(safeSess)}) (${assignmentKeys.length} bài)`);
      chapReadmeLines.push('');

      for (let aIdx = 0; aIdx < assignmentKeys.length; aIdx++) {
        const assignName = assignmentKeys[aIdx];
        const ex = assignments[assignName];
        const safeAssign = `${String(aIdx + 1).padStart(2, '0')}_${sanitizeFileName(assignName, `BaiTap_${aIdx + 1}`)}.md`;
        
        const filePath = `${safeChap}/${safeSess}/${safeAssign}`;
        const content = formatExerciseToMarkdown({
          chapter: chap,
          session: sess,
          assignmentName: assignName,
          assignmentText: ex.assignment || '',
          criteriaText: ex.criteria || ''
        });

        zip.file(filePath, content);
        chapReadmeLines.push(`  ${aIdx + 1}. [${assignName}](./${encodeURIComponent(safeSess)}/${encodeURIComponent(safeAssign)})`);
      }
      chapReadmeLines.push('');
    }

    zip.file(`${safeChap}/README.md`, chapReadmeLines.join('\n'));
    rootReadmeLines.push('');
  }

  rootReadmeLines.push('---');
  rootReadmeLines.push(`**Tổng kết:** ${chapters.length} Khóa học | ${totalSessions} Sessions | ${totalExercises} Bài tập.`);
  rootReadmeLines.push('');
  zip.file('README.md', rootReadmeLines.join('\n'));

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const timeStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadBlob(zipBlob, `REduX_KhoDeBai_${timeStamp}.zip`);

  return {
    totalChapters: chapters.length,
    totalSessions,
    totalExercises
  };
}

/**
 * Sao chép chuỗi Markdown vào Clipboard
 */
export async function copyMarkdownToClipboard(content: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Lỗi sao chép clipboard:', err);
    return false;
  }
}
