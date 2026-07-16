import React from 'react';
import { useShortcuts, Shortcut } from '~/src/hooks/shortcuts/useShortcuts';

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
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-3.5 text-white shadow-sm">
        <h2 className="text-xs font-bold flex items-center gap-1.5">📌 Lối Tắt Truy Cập Nhanh</h2>
        <p className="text-[10px] text-blue-100 mt-1 leading-relaxed">
          Ghim các lớp học hay chấm bài của bạn để chuyển trang chỉ với 1 click.
        </p>
      </div>

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
