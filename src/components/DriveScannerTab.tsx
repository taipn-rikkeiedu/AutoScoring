import React, { useState } from 'react';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { useToast } from '~/src/core/ToastContext';
import { logger } from '~/src/core/logger';

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  iconLink?: string;
}

export const DriveScannerTab: React.FC = () => {
  const { googleApiKey, setGoogleApiKey, isTesting } = useSettings();
  const { showToast } = useToast();
  
  const [folderLink, setFolderLink] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const extractFolderId = (url: string) => {
    const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url; // If no match, maybe user entered ID directly
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

    const folderId = extractFolderId(folderLink.trim());
    setIsScanning(true);
    setFiles([]);
    setHasScanned(false);

    try {
      logger.info("DRIVE_SCANNER", `Bắt đầu quét thư mục ID: ${folderId}`);
      
      let query = `'${folderId}' in parents and trashed=false`;
      if (keyword.trim()) {
        // Drive API v3 name contains
        query += ` and name contains '${keyword.trim()}'`;
      }

      const params = new URLSearchParams({
        q: query,
        key: googleApiKey.trim(),
        fields: 'files(id, name, webViewLink, iconLink)',
        pageSize: '1000'
      });

      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Lỗi khi gọi Google Drive API");
      }

      const data = await response.json();
      setFiles(data.files || []);
      setHasScanned(true);
      showToast(`Đã quét xong, tìm thấy ${data.files?.length || 0} tệp.`, "success");
      logger.success("DRIVE_SCANNER", `Quét xong. Tệp tìm thấy: ${data.files?.length || 0}`);
    } catch (error: any) {
      showToast(`Lỗi quét Drive: ${error.message}`, "error");
      logger.error("DRIVE_SCANNER", "Lỗi quét Drive", error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyAll = () => {
    if (files.length === 0) return;
    const textToCopy = files.map(f => `${f.name}\n${f.webViewLink}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast("Đã sao chép tất cả link vào Clipboard!", "success");
    }).catch(() => {
      showToast("Không thể sao chép, vui lòng thử lại.", "error");
    });
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      {/* Settings Section */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">🔑 Cấu hình Google API</span>
        </div>
        <div className="p-3.5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Google API Key:</label>
            <input
              type="password"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              placeholder="Nhập Google API Key của bạn (bắt buộc)"
            />
            <span className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
              Để tạo API Key, hãy truy cập Google Cloud Console &gt; Credentials &gt; Create Credentials &gt; API Key và đảm bảo bật Google Drive API.
            </span>
          </div>
          {isTesting && (
            <div className="text-[10px] font-bold text-blue-600 animate-pulse">
              Đang tự động lưu...
            </div>
          )}
        </div>
      </div>

      {/* Scanner Section */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex-1 flex flex-col transition-all duration-200">
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">🔍 Quét Thư mục Drive (Public)</span>
        </div>
        <div className="p-3.5 flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Link hoặc ID Thư mục:</label>
            <input
              type="text"
              value={folderLink}
              onChange={(e) => setFolderLink(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              placeholder="VD: https://drive.google.com/drive/folders/1aBcD..."
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Từ khoá tìm kiếm (Tùy chọn):</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              placeholder="VD: Báo cáo (để trống để lấy tất cả)"
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning || !googleApiKey}
            className="w-full py-2 mt-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border border-blue-700 rounded-md text-[11px] font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isScanning ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                Đang quét...
              </>
            ) : "🚀 Bắt đầu quét"}
          </button>

          {/* Results Area */}
          <div className="mt-2 flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-slate-600">
                Kết quả ({files.length}):
              </span>
              {files.length > 0 && (
                <button
                  onClick={handleCopyAll}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                >
                  📋 Copy tất cả Link
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-md bg-slate-50 p-2 text-xs">
              {files.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {files.map(f => (
                    <li key={f.id} className="p-2 bg-white rounded border border-slate-100 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {f.iconLink && <img src={f.iconLink} alt="icon" className="w-4 h-4" />}
                        <span className="font-bold text-slate-700 truncate">{f.name}</span>
                      </div>
                      <a 
                        href={f.webViewLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] text-blue-500 hover:underline truncate pl-6"
                      >
                        {f.webViewLink}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                hasScanned && (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium text-center text-xs">
                    Không tìm thấy tệp nào phù hợp.
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
