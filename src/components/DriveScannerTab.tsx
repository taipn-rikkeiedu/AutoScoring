import React, { useState, useRef } from 'react';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { useToast } from '~/src/core/ToastContext';
import { logger } from '~/src/core/logger';
import { exportToExcel } from '~/src/core/excelExporter';

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  iconLink?: string;
  mimeType?: string;
  parentPath?: string;
}

type FileCategory = 'all' | 'document' | 'spreadsheet' | 'image' | 'archive' | 'code' | 'media' | 'other';

const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }
  return '';
};

const getFileCategoryInfo = (filename: string, mimeType?: string): { category: FileCategory; badgeColor: string; label: string } => {
  const ext = getFileExtension(filename);
  
  if (mimeType === 'application/vnd.google-apps.form' || filename.toLowerCase().includes('quiz') || filename.toLowerCase().includes('form')) {
    return { category: 'document', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200', label: 'FORM/QUIZ' };
  }

  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'gdoc'].includes(ext) || mimeType?.includes('document') || mimeType?.includes('pdf')) {
    return { category: 'document', badgeColor: 'bg-red-50 text-red-700 border-red-200', label: ext.toUpperCase() || 'DOC' };
  }
  if (['xls', 'xlsx', 'csv', 'gsheet'].includes(ext) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
    return { category: 'spreadsheet', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: ext.toUpperCase() || 'SHEET' };
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext) || mimeType?.includes('image')) {
    return { category: 'image', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200', label: ext.toUpperCase() || 'IMG' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) || mimeType?.includes('zip') || mimeType?.includes('compressed')) {
    return { category: 'archive', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200', label: ext.toUpperCase() || 'ZIP' };
  }
  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'json', 'sql', 'php', 'sh'].includes(ext)) {
    return { category: 'code', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', label: ext.toUpperCase() || 'CODE' };
  }
  if (['mp4', 'mp3', 'mkv', 'avi', 'mov', 'wav', 'flac'].includes(ext) || mimeType?.includes('video') || mimeType?.includes('audio')) {
    return { category: 'media', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200', label: ext.toUpperCase() || 'MEDIA' };
  }
  
  return { category: 'other', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200', label: ext.toUpperCase() || 'FILE' };
};

export const DriveScannerTab: React.FC = () => {
  const { googleApiKey, setGoogleApiKey, isTesting } = useSettings();
  const { showToast } = useToast();
  
  const [folderLink, setFolderLink] = useState('');
  const [keyword, setKeyword] = useState('');
  const [keywordMatchMode, setKeywordMatchMode] = useState<'or' | 'and'>('or');
  const [extFilter, setExtFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [isRecursive, setIsRecursive] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ foldersScanned: 0, filesFound: 0, currentFolder: '' });
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  
  const stopRequestedRef = useRef(false);

  const extractFolderId = (url: string) => {
    const trimmed = url.trim();
    // Pattern 1: https://drive.google.com/drive/folders/ID...
    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (folderMatch) return folderMatch[1];
    
    // Pattern 2: https://drive.google.com/open?id=ID...
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (idMatch) return idMatch[1];

    // Pattern 3: Raw ID or URL without parameters
    return trimmed.split('?')[0].split('#')[0];
  };

  const handleScan = async () => {
    if (!googleApiKey.trim()) {
      showToast("Vui lòng cấu hình Google API Key trước khi quét.", "warning");
      return;
    }
    
    if (!folderLink.trim()) {
      showToast("Vui lòng nhập Link hoặc ID của thư mục Google Drive.", "warning");
      return;
    }

    const initialFolderId = extractFolderId(folderLink.trim());
    setIsScanning(true);
    stopRequestedRef.current = false;
    setFiles([]);
    setHasScanned(false);
    setScanProgress({ foldersScanned: 0, filesFound: 0, currentFolder: 'Đang khởi tạo...' });

    const collectedFiles: DriveFile[] = [];
    const queue: Array<{ id: string; name: string; path: string }> = [
      { id: initialFolderId, name: 'Gốc', path: '' }
    ];

    let foldersScanned = 0;

    try {
      logger.info("DRIVE_SCANNER", `Bắt đầu quét thư mục ID: ${initialFolderId} (Chế độ quét sâu: ${isRecursive})`);

      while (queue.length > 0 && !stopRequestedRef.current) {
        const currentFolder = queue.shift()!;
        foldersScanned++;

        setScanProgress({
          foldersScanned,
          filesFound: collectedFiles.length,
          currentFolder: currentFolder.path ? `/${currentFolder.path}` : '/'
        });

        let pageToken: string | undefined = undefined;

        do {
          if (stopRequestedRef.current) break;

          const query = `'${currentFolder.id}' in parents and trashed=false`;
          const params = new URLSearchParams({
            q: query,
            key: googleApiKey.trim(),
            fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink)',
            pageSize: '1000'
          });

          if (pageToken) {
            params.set('pageToken', pageToken);
          }

          const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
          const response = await fetch(url);

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `Lỗi khi gọi Google Drive API (${response.status})`);
          }

          const data = await response.json();
          const items: any[] = data.files || [];

          for (const item of items) {
            if (item.mimeType === 'application/vnd.google-apps.folder') {
              if (isRecursive) {
                queue.push({
                  id: item.id,
                  name: item.name,
                  path: currentFolder.path ? `${currentFolder.path}/${item.name}` : item.name
                });
              }
            } else {
              collectedFiles.push({
                id: item.id,
                name: item.name,
                webViewLink: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
                iconLink: item.iconLink,
                mimeType: item.mimeType,
                parentPath: currentFolder.path ? `/${currentFolder.path}` : '/'
              });
            }
          }

          pageToken = data.nextPageToken;

          setScanProgress({
            foldersScanned,
            filesFound: collectedFiles.length,
            currentFolder: currentFolder.path ? `/${currentFolder.path}` : '/'
          });

        } while (pageToken && !stopRequestedRef.current);
      }

      setFiles(collectedFiles);
      setHasScanned(true);

      if (stopRequestedRef.current) {
        showToast(`Đã dừng quét! Thu thập được ${collectedFiles.length} tệp từ ${foldersScanned} thư mục.`, "info");
        logger.info("DRIVE_SCANNER", `Đã dừng quét bởi người dùng. Tệp thu thập được: ${collectedFiles.length}`);
      } else {
        showToast(`Quét hoàn tất! Tìm thấy tổng cộng ${collectedFiles.length} tệp.`, "success");
        logger.success("DRIVE_SCANNER", `Quét xong. Tổng tệp: ${collectedFiles.length}, tổng thư mục: ${foldersScanned}`);
      }
    } catch (error: any) {
      showToast(`Lỗi quét Drive: ${error.message}`, "error");
      logger.error("DRIVE_SCANNER", "Lỗi quét Drive", error.message);
      if (collectedFiles.length > 0) {
        setFiles(collectedFiles);
        setHasScanned(true);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
  };

  // Multi-condition filtering logic with accent-insensitivity and OR/AND mode
  const filteredFiles = files.filter(f => {
    // 1. Category Filter
    if (selectedCategory !== 'all') {
      const catInfo = getFileCategoryInfo(f.name, f.mimeType);
      if (catInfo.category !== selectedCategory) return false;
    }

    // 2. Custom Extension Filter (e.g., pdf, docx or .pdf)
    if (extFilter.trim()) {
      const cleanExtInput = extFilter.trim().toLowerCase().replace(/^\./, '');
      const fileExt = getFileExtension(f.name);
      const mimeLower = (f.mimeType || '').toLowerCase();
      
      const matchesExt = fileExt === cleanExtInput || mimeLower.includes(cleanExtInput);
      if (!matchesExt) return false;
    }

    // 3. Multi-keyword filter (supports accent-insensitive search & OR/AND mode)
    if (keyword.trim()) {
      const terms = keyword.trim().split(',').map(t => removeAccents(t.trim())).filter(Boolean);
      const fileNameNormalized = removeAccents(f.name);
      const pathNormalized = removeAccents(f.parentPath || '');

      if (keywordMatchMode === 'or') {
        // OR Logic: file must match AT LEAST ONE keyword
        const matchesAnyTerm = terms.some(term => fileNameNormalized.includes(term) || pathNormalized.includes(term));
        if (!matchesAnyTerm) return false;
      } else {
        // AND Logic: file must match ALL keywords
        const matchesAllTerms = terms.every(term => fileNameNormalized.includes(term) || pathNormalized.includes(term));
        if (!matchesAllTerms) return false;
      }
    }

    return true;
  });

  // Export 1: Export to Excel
  const handleExportExcel = async () => {
    if (filteredFiles.length === 0) {
      showToast("Không có tệp nào để xuất báo cáo.", "warning");
      return;
    }

    try {
      const excelRows = filteredFiles.map((f, index) => {
        const catInfo = getFileCategoryInfo(f.name, f.mimeType);
        return {
          "STT": index + 1,
          "Tên Tệp": f.name,
          "Định Dạng": catInfo.label,
          "Đường Dẫn Thư Mục": f.parentPath || '/',
          "Link Xem Trực Tiếp": f.webViewLink
        };
      });

      const colWidths = [
        { wch: 6 },
        { wch: 45 },
        { wch: 15 },
        { wch: 35 },
        { wch: 65 }
      ];

      const folderIdStr = extractFolderId(folderLink) || 'drive';
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Bao_Cao_Drive_${folderIdStr}_${dateStr}.xlsx`;

      await exportToExcel(excelRows, "Danh Sach Tep Drive", fileName, colWidths);
      showToast(`Đã xuất báo cáo Excel thành công (${filteredFiles.length} tệp)!`, "success");
      logger.success("DRIVE_SCANNER", `Xuất báo cáo Excel thành công: ${fileName}`);
    } catch (err: any) {
      showToast(`Lỗi xuất Excel: ${err.message}`, "error");
      logger.error("DRIVE_SCANNER", "Lỗi xuất Excel", err.message);
    }
  };

  // Export 2: Copy Markdown Report Grouped by Folder
  const handleCopyMarkdownReport = () => {
    if (filteredFiles.length === 0) {
      showToast("Không có tệp nào để copy báo cáo.", "warning");
      return;
    }

    // Group files by parentPath
    const grouped: Record<string, DriveFile[]> = {};
    filteredFiles.forEach(f => {
      const path = f.parentPath || '/';
      if (!grouped[path]) grouped[path] = [];
      grouped[path].push(f);
    });

    const nowStr = new Date().toLocaleString('vi-VN');
    let md = `# 📊 BÁO CÁO DANH SÁCH TỆP GOOGLE DRIVE\n`;
    md += `- **Thư mục nguồn:** ${folderLink.trim() || 'Thư mục Drive'}\n`;
    md += `- **Tổng số tệp tìm thấy:** ${filteredFiles.length} tệp\n`;
    md += `- **Thời gian khởi tạo:** ${nowStr}\n\n`;
    md += `---\n\n`;

    Object.entries(grouped).forEach(([path, fileList]) => {
      md += `### 📁 Thư mục: \`${path}\` (${fileList.length} tệp)\n`;
      fileList.forEach((f, idx) => {
        const catInfo = getFileCategoryInfo(f.name, f.mimeType);
        md += `${idx + 1}. [${catInfo.label}] **${f.name}**\n   - 🔗 Link: ${f.webViewLink}\n`;
      });
      md += `\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
      showToast("Đã sao chép báo cáo Markdown nhóm theo thư mục vào Clipboard!", "success");
    }).catch(() => {
      showToast("Không thể sao chép báo cáo, vui lòng thử lại.", "error");
    });
  };

  // Export 3: Copy Simple Links
  const handleCopySimpleLinks = () => {
    if (filteredFiles.length === 0) return;
    const textToCopy = filteredFiles.map(f => `[${f.parentPath !== '/' ? f.parentPath + '/' : ''}${f.name}]\n${f.webViewLink}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast(`Đã sao chép ${filteredFiles.length} link tệp vào Clipboard!`, "success");
    }).catch(() => {
      showToast("Không thể sao chép, vui lòng thử lại.", "error");
    });
  };

  const categoryChips: Array<{ id: FileCategory; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    { id: 'document', label: 'Tài liệu' },
    { id: 'spreadsheet', label: 'Bảng tính' },
    { id: 'image', label: 'Hình ảnh' },
    { id: 'archive', label: 'Tệp nén' },
    { id: 'code', label: 'Mã nguồn' },
    { id: 'media', label: 'Media' },
  ];

  return (
    <div className="flex flex-col flex-1 p-3.5 gap-3 overflow-y-auto">
      {/* Settings Section */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs transition-all duration-200">
        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-800">
            Cấu hình Google API Key
          </span>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <input
              type="password"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
              placeholder="Nhập Google API Key của bạn"
            />
            <span className="text-[9.5px] text-slate-400 leading-relaxed">
              Tạo API Key tại Google Cloud Console &gt; Credentials và kích hoạt Drive API.
            </span>
          </div>
          {isTesting && (
            <div className="text-[10px] font-medium text-blue-600">
              Đang tự động lưu...
            </div>
          )}
        </div>
      </div>

      {/* Scanner Section */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs flex-1 flex flex-col transition-all duration-200">
        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-800">
            Quét & xuất báo cáo Google Drive
          </span>
        </div>

        <div className="p-3 flex flex-col gap-2.5 flex-1 overflow-hidden">
          {/* Input Drive Folder Link */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-600">Link hoặc ID thư mục Drive:</label>
            <input
              type="text"
              value={folderLink}
              onChange={(e) => setFolderLink(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="VD: https://drive.google.com/drive/folders/1aBcD..."
            />
          </div>

          <div className="flex items-center justify-between py-0.5">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecursive}
                onChange={(e) => setIsRecursive(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>Quét sâu vào tất cả thư mục con (Recursive Search)</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isScanning ? (
              <button
                onClick={handleScan}
                disabled={!googleApiKey}
                className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 active:scale-95"
              >
                Bắt đầu quét
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Dừng quét
              </button>
            )}
          </div>

          {/* Progress Banner */}
          {isScanning && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-md flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
                <span>Đang quét thư mục...</span>
                <span>Thư mục: {scanProgress.foldersScanned} | Tệp: {scanProgress.filesFound}</span>
              </div>
              <div className="text-[10px] text-blue-600 font-mono truncate">
                Vị trí: {scanProgress.currentFolder}
              </div>
            </div>
          )}

          {/* Multi-Condition Filters & Category Chips */}
          <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-slate-700">
                Bộ lọc tìm kiếm
              </span>
              {(keyword || extFilter || selectedCategory !== 'all') && (
                <button
                  onClick={() => { setKeyword(''); setExtFilter(''); setSelectedCategory('all'); }}
                  className="text-[10px] font-medium text-rose-600 hover:underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {/* Category Chips */}
            <div className="flex flex-wrap gap-1">
              {categoryChips.map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    selectedCategory === chip.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Keyword and Extension Filters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-medium text-slate-500">Từ khóa (phân cách bằng dấu phẩy):</label>
                  <div className="flex items-center gap-0.5 bg-slate-200 p-0.5 rounded text-[9px] font-semibold">
                    <button
                      onClick={() => setKeywordMatchMode('or')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${keywordMatchMode === 'or' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      title="Khớp ít nhất 1 từ khóa"
                    >
                      HOẶC (OR)
                    </button>
                    <button
                      onClick={() => setKeywordMatchMode('and')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${keywordMatchMode === 'and' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                      title="Bắt buộc chứa tất cả các từ"
                    >
                      VÀ (AND)
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="VD: BTVN, Quiz, Báo cáo"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-slate-500">Đuôi file:</label>
                <input
                  type="text"
                  value={extFilter}
                  onChange={(e) => setExtFilter(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="VD: pdf, xlsx..."
                />
              </div>
            </div>
          </div>

          {/* Export Report Bar & Summary */}
          {files.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-200">
              <div className="text-[11px] font-medium text-slate-700">
                Hiển thị: <span className="text-blue-700 font-semibold">{filteredFiles.length}</span> / {files.length} tệp
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleExportExcel}
                  className="text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Xuất file Báo cáo Excel định dạng chuẩn"
                >
                  Xuất Excel (.xlsx)
                </button>

                <button
                  onClick={handleCopyMarkdownReport}
                  className="text-[10px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Copy Báo cáo dạng Markdown"
                >
                  Báo cáo Markdown
                </button>

                <button
                  onClick={handleCopySimpleLinks}
                  className="text-[10px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                >
                  Sao chép liên kết
                </button>
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded bg-slate-50 p-2 text-xs">
            {filteredFiles.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {filteredFiles.map(f => {
                  const catInfo = getFileCategoryInfo(f.name, f.mimeType);
                  return (
                    <li key={f.id} className="p-2 bg-white rounded border border-slate-200 flex flex-col gap-1 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                          <span className="font-semibold text-slate-800 truncate text-xs" title={f.name}>{f.name}</span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border font-mono ${catInfo.badgeColor}`}>
                            {catInfo.label}
                          </span>
                          {f.parentPath && f.parentPath !== '/' && (
                            <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono truncate max-w-[140px]" title={f.parentPath}>
                              {f.parentPath}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <a 
                          href={f.webViewLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 hover:underline truncate font-mono max-w-[80%]"
                        >
                          {f.webViewLink}
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(f.webViewLink);
                            showToast("Đã copy link tệp!", "success");
                          }}
                          className="text-[9.5px] font-medium text-slate-500 hover:text-blue-600 hover:underline cursor-pointer"
                        >
                          Sao chép
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              hasScanned && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 font-medium text-center text-xs gap-1 py-8">
                  <span>Không tìm thấy tệp nào phù hợp với bộ lọc.</span>
                  <span className="text-[10px] text-slate-400">Hãy thử thay đổi danh mục, đuôi file hoặc từ khóa tìm kiếm.</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
