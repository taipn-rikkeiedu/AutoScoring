import React from 'react';
import { useShortcuts, Shortcut } from '~/src/hooks/shortcuts/useShortcuts';
import { PinIcon, TrashIcon } from '~/src/components/Icons';

export const ShortcutsTab: React.FC = () => {
  const {
    shortcuts,
    name,
    setName,
    url,
    setUrl,
    editingId,
    setEditingId,
    activeTabInfo,
    handleQuickAddActiveTab,
    handleAddOrUpdate,
    handleEdit,
    handleDelete,
    handleTogglePin,
    handleNavigate
  } = useShortcuts();

  const sortedShortcuts = [...shortcuts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col flex-1 p-3.5 gap-3 overflow-y-auto">
      {activeTabInfo && (
        <div className="flex items-center justify-between border border-slate-200 rounded-lg bg-white p-2.5">
          <div className="flex flex-col gap-0.5 max-w-[65%]">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Trang hiện tại:</span>
            <span className="text-xs font-semibold text-slate-800 truncate">{activeTabInfo.title}</span>
          </div>
          <button
            onClick={handleQuickAddActiveTab}
            className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <PinIcon className="w-3 h-3 text-white" />
            <span>Ghim trang này</span>
          </button>
        </div>
      )}

      {/* Add / Edit Form */}
      <form onSubmit={handleAddOrUpdate} className="border border-slate-200 rounded-lg bg-white p-3 flex flex-col gap-2.5">
        <span className="text-xs font-bold text-slate-800">
          {editingId ? 'Chỉnh sửa lối tắt' : 'Thêm lối tắt mới'}
        </span>
        <div className="flex flex-col gap-1">
          <label className="text-[10.5px] font-medium text-slate-500">Tên lối tắt:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Lớp Java Web 08 - Chấm bài"
            className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10.5px] font-medium text-slate-500">Địa chỉ URL:</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://qldt.rikkei.edu.vn/homework-checking/..."
            className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
          />
        </div>
        <div className="flex gap-2 justify-end mt-0.5">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName('');
                setUrl('');
              }}
              className="py-1 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md text-xs font-medium cursor-pointer"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            className="py-1.5 px-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            {editingId ? 'Lưu thay đổi' : 'Thêm lối tắt'}
          </button>
        </div>
      </form>

      {/* Shortcuts List */}
      <div className="flex flex-col gap-2">
        <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
          Danh sách ({sortedShortcuts.length})
        </span>
        {sortedShortcuts.length === 0 ? (
          <div className="text-center p-6 text-xs text-slate-400 border border-slate-200 border-dashed rounded-lg bg-white">
            Chưa có lối tắt nào được lưu.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sortedShortcuts.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col gap-0.5 max-w-[62%]">
                  <span className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1.5">
                    {item.isPinned && <PinIcon className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    <span>{item.name}</span>
                  </span>
                  <span 
                    className="text-[9.5px] font-mono text-slate-400 truncate cursor-pointer hover:text-blue-600 hover:underline" 
                    title={item.url}
                    onClick={() => handleNavigate(item.url)}
                  >
                    {item.url}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePin(item.id)}
                    className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                      item.isPinned ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                    title={item.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                  >
                    <PinIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 rounded text-xs text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 rounded text-xs text-slate-400 hover:bg-slate-50 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Xóa"
                  >
                    <TrashIcon className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                  <button
                    onClick={() => handleNavigate(item.url)}
                    className="py-1 px-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer ml-1"
                  >
                    Mở
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
