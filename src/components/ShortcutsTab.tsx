import React, { useState, useEffect } from 'react';
import { useToast } from '~/src/core/ToastContext';

interface Shortcut {
  id: string;
  name: string;
  url: string;
  isPinned?: boolean;
}

export const ShortcutsTab: React.FC = () => {
  const toast = useToast();
  
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTabInfo, setActiveTabInfo] = useState<{ title: string; url: string } | null>(null);

  // Load shortcuts from storage
  const loadShortcuts = () => {
    chrome.storage.local.get('customShortcuts', (res) => {
      if (res.customShortcuts) {
        setShortcuts(res.customShortcuts as Shortcut[]);
      } else {
        // Seed default shortcuts if empty to help user get started
        const defaults: Shortcut[] = [
          { id: '1', name: 'Lớp học mẫu (Trang chủ QLDT)', url: 'https://qldt.rikkei.edu.vn/', isPinned: true }
        ];
        chrome.storage.local.set({ customShortcuts: defaults });
        setShortcuts(defaults);
      }
    });
  };

  // Get active browser tab info for quick capture
  const fetchActiveTabInfo = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const tabUrl = tabs[0].url || '';
        const tabTitle = tabs[0].title || '';
        if (tabUrl.includes('rikkei.edu.vn') || tabUrl.startsWith('http')) {
          setActiveTabInfo({ title: tabTitle, url: tabUrl });
        }
      }
    });
  };

  useEffect(() => {
    loadShortcuts();
    fetchActiveTabInfo();
  }, []);

  const saveShortcutsToStorage = (updatedList: Shortcut[]) => {
    chrome.storage.local.set({ customShortcuts: updatedList }, () => {
      setShortcuts(updatedList);
    });
  };

  const handleQuickAddActiveTab = () => {
    if (!activeTabInfo) {
      toast.showToast('Không lấy được thông tin tab hiện tại.', 'warning');
      return;
    }

    // Clean up title
    let cleanTitle = activeTabInfo.title;
    if (cleanTitle.includes('-')) {
      cleanTitle = cleanTitle.split('-')[0].trim();
    }
    if (cleanTitle.length > 30) {
      cleanTitle = cleanTitle.substring(0, 27) + '...';
    }

    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      name: cleanTitle || 'Trang hiện tại',
      url: activeTabInfo.url,
      isPinned: false
    };

    const updated = [...shortcuts, newShortcut];
    saveShortcutsToStorage(updated);
    toast.showToast('Đã thêm nhanh trang hiện tại làm lối tắt!', 'success');
  };

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.showToast('Vui lòng nhập tên lối tắt.', 'warning');
      return;
    }
    if (!url.trim() || !url.startsWith('http')) {
      toast.showToast('Vui lòng nhập URL hợp lệ (bắt đầu bằng http/https).', 'warning');
      return;
    }

    if (editingId) {
      const updated = shortcuts.map(s => 
        s.id === editingId ? { ...s, name: name.trim(), url: url.trim() } : s
      );
      saveShortcutsToStorage(updated);
      setEditingId(null);
      toast.showToast('Đã cập nhật lối tắt thành công!', 'success');
    } else {
      const newShortcut: Shortcut = {
        id: Date.now().toString(),
        name: name.trim(),
        url: url.trim(),
        isPinned: false
      };
      const updated = [...shortcuts, newShortcut];
      saveShortcutsToStorage(updated);
      toast.showToast('Đã thêm lối tắt mới!', 'success');
    }

    setName('');
    setUrl('');
  };

  const handleEdit = (item: Shortcut) => {
    setEditingId(item.id);
    setName(item.name);
    setUrl(item.url);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lối tắt này không?')) {
      const updated = shortcuts.filter(s => s.id !== id);
      saveShortcutsToStorage(updated);
      toast.showToast('Đã xóa lối tắt.', 'info');
      if (editingId === id) {
        setEditingId(null);
        setName('');
        setUrl('');
      }
    }
  };

  const handleTogglePin = (id: string) => {
    const updated = shortcuts.map(s => 
      s.id === id ? { ...s, isPinned: !s.isPinned } : s
    );
    saveShortcutsToStorage(updated);
  };

  const handleNavigate = (targetUrl: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.update(tabs[0].id, { url: targetUrl });
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
  };

  // Sort: pinned first, then by name
  const sortedShortcuts = [...shortcuts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-3.5 text-white shadow-sm">
        <h2 className="text-xs font-bold flex items-center gap-1.5">📌 Lối Tắt Truy Cập Nhanh</h2>
        <p className="text-[10px] text-blue-100 mt-1 leading-relaxed">
          Ghim các lớp học hay chấm bài của bạn để chuyển trang chỉ với 1 click. Lối tắt này cũng sẽ tự động xuất hiện trên menu nổi ở góc trang web QLDT.
        </p>
      </div>

      {/* Quick Add Banner if available */}
      {activeTabInfo && (
        <div className="flex items-center justify-between border border-blue-150 rounded-lg bg-blue-50 p-2.5 shadow-sm">
          <div className="flex flex-col gap-0.5 max-w-[70%]">
            <span className="text-[10px] font-bold text-blue-600">Trang bạn đang xem:</span>
            <span className="text-xs font-medium text-slate-700 truncate">{activeTabInfo.title}</span>
          </div>
          <button
            onClick={handleQuickAddActiveTab}
            className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-sm transition-all duration-150 active:scale-[0.98]"
          >
            ⭐ Ghim nhanh trang này
          </button>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleAddOrUpdate} className="border border-slate-200 rounded-lg bg-white p-3.5 shadow-sm flex flex-col gap-3">
        <span className="text-xs font-bold text-slate-700">
          {editingId ? '✏️ Chỉnh sửa lối tắt' : '➕ Thêm lối tắt thủ công'}
        </span>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500">Tên gợi nhớ:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Lớp Java Web 08 - Chấm bài"
            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500">Địa chỉ URL:</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://qldt.rikkei.edu.vn/homework-checking/..."
            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <div className="flex gap-2 justify-end mt-1">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName('');
                setUrl('');
              }}
              className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-[11px] font-bold"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-bold shadow-sm transition-all"
          >
            {editingId ? 'Cập nhật' : 'Thêm lối tắt'}
          </button>
        </div>
      </form>

      {/* List Container */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách lối tắt ({sortedShortcuts.length})</span>
        {sortedShortcuts.length === 0 ? (
          <div className="text-center p-6 text-xs text-slate-400 border border-slate-100 border-dashed rounded-lg bg-white">
            Chưa có lối tắt nào được lưu.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedShortcuts.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col gap-0.5 max-w-[65%]">
                  <span className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                    {item.isPinned && <span className="text-[10px]" title="Đã ghim">📌</span>}
                    {item.name}
                  </span>
                  <span 
                    className="text-[9px] text-slate-400 truncate cursor-pointer hover:text-blue-500" 
                    title={item.url}
                    onClick={() => handleNavigate(item.url)}
                  >
                    {item.url}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTogglePin(item.id)}
                    className={`p-1 rounded text-[10px] transition-colors ${item.isPinned ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500'}`}
                    title={item.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                  >
                    📌
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 rounded text-[10px] text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    title="Chỉnh sửa"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 rounded text-[10px] text-slate-400 hover:bg-slate-50 hover:text-red-600 transition-colors"
                    title="Xóa"
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => handleNavigate(item.url)}
                    className="py-1 px-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded text-[10px] font-bold shadow-sm transition-all"
                  >
                    Mở ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
