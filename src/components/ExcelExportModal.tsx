import React from 'react';
import { Student } from '~/src/types';
import { useExcelExporter, FIELDS, COLUMN_LABELS, StatusFilter } from '~/src/hooks/class-management/useExcelExporter';

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: string; activeCls: string }[] = [
  { value: 'all',          label: 'Tất cả học viên',   icon: '👥', activeCls: 'bg-slate-100 border-slate-400 text-slate-800' },
  { value: 'completed',    label: 'Hoàn thành',        icon: '✅', activeCls: 'bg-green-50 border-green-500 text-green-800'  },
  { value: 'notCompleted', label: 'Chưa hoàn thành',   icon: '❌', activeCls: 'bg-red-50 border-red-500 text-red-800'        },
  { value: 'pending',      label: 'Chờ kiểm tra',      icon: '⏳', activeCls: 'bg-amber-50 border-amber-500 text-amber-800'  },
  { value: 'notSubmitted', label: 'Không nộp bài (0)', icon: '⚠️', activeCls: 'bg-rose-50 border-rose-500 text-rose-800'    },
];

interface Props {
  students: Student[];
  onClose: () => void;
  onExport: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const ExcelExportModal: React.FC<Props> = ({ students, onClose, onExport }) => {
  const {
    selectedFields,
    statusFilter,
    setStatusFilter,
    isExporting,
    toggleField,
    selectAll,
    selectNone,
    filteredStudents,
    activeFieldCount,
    countFor,
    handleCopyToClipboard,
    handleExportExcel
  } = useExcelExporter(students, onExport, onClose);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-[400px] max-w-[95vw] flex flex-col overflow-hidden max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-green-600 to-emerald-600">
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">📊 Xuất Báo Cáo Excel</h2>
            <p className="text-green-100 text-[10px] mt-0.5">Chọn trường và lọc học viên trước khi xuất</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-base leading-none p-1.5">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase">📋 Chọn trường xuất</span>
              <div className="flex gap-1.5">
                <button onClick={selectAll} className="text-[10px] px-2 py-0.5 rounded border border-blue-300 text-blue-600 bg-blue-50">Chọn tất cả</button>
                <button onClick={selectNone} className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 bg-slate-50">Bỏ chọn</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(f => (
                <label
                  key={f.key}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none ${selectedFields[f.key] ? 'bg-green-50 border-green-400 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedFields[f.key]}
                    onChange={() => toggleField(f.key)}
                    className="accent-green-600 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-semibold">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200" />

          <div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">🔍 Lọc theo trạng thái</span>
            <div className="flex flex-col gap-1.5">
              {STATUS_FILTERS.map(sf => {
                const count = countFor(sf.value);
                const isActive = statusFilter === sf.value;
                return (
                  <label
                    key={sf.value}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer select-none ${isActive ? sf.activeCls : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    <input
                      type="radio"
                      name="statusFilter"
                      value={sf.value}
                      checked={isActive}
                      onChange={() => setStatusFilter(sf.value)}
                      className="accent-green-600 w-3.5 h-3.5"
                    />
                    <span className="text-sm">{sf.icon}</span>
                    <span className="text-[11px] font-semibold flex-1">{sf.label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-[10px] text-slate-500 font-medium">
            <span className="font-bold text-slate-700">{filteredStudents.length}</span> học viên
          </div>
          <div className="flex gap-1.5">
            <button onClick={onClose} className="px-2.5 py-1.5 border border-slate-300 bg-white text-slate-600 rounded-lg text-xs font-bold">Hủy</button>
            <button
              onClick={handleCopyToClipboard}
              disabled={activeFieldCount === 0 || filteredStudents.length === 0}
              className="px-2.5 py-1.5 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold disabled:opacity-50"
            >
              📋 Sao chép
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExporting || activeFieldCount === 0 || filteredStudents.length === 0}
              className="px-2.5 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              {isExporting ? "Đang xuất..." : "📥 Xuất Excel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
