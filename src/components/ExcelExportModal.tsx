import React, { useState, useCallback } from 'react';
import { Student } from '~/src/types';
import { exportToExcel } from '~/src/core/excelExporter';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'completed' | 'notCompleted' | 'pending';

interface FieldConfig {
  key: string;
  label: string;
  default: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELDS: FieldConfig[] = [
  { key: 'studentId',      label: 'Mã sinh viên',       default: true  },
  { key: 'studentName',    label: 'Họ và Tên',           default: true  },
  { key: 'lmsStatus',      label: 'Trạng thái LMS',      default: true  },
  { key: 'submittedCount', label: 'Số bài đã nộp',       default: true  },
  { key: 'completedCount', label: 'Số bài hoàn thành',   default: true  },
  { key: 'aiScore',        label: 'Điểm AI',             default: false },
  { key: 'githubUrl',      label: 'GitHub URL',          default: false },
  { key: 'submissionUrl',  label: 'URL bài nộp LMS',     default: false },
];

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: string; activeCls: string }[] = [
  { value: 'all',          label: 'Tất cả học viên',   icon: '👥', activeCls: 'bg-slate-100 border-slate-400 text-slate-800' },
  { value: 'completed',    label: 'Hoàn thành',        icon: '✅', activeCls: 'bg-green-50 border-green-500 text-green-800'  },
  { value: 'notCompleted', label: 'Chưa hoàn thành',   icon: '❌', activeCls: 'bg-red-50 border-red-500 text-red-800'        },
  { value: 'pending',      label: 'Chờ kiểm tra',      icon: '⏳', activeCls: 'bg-amber-50 border-amber-500 text-amber-800'  },
];

const COLUMN_LABELS: Record<string, string> = {
  studentId:      'Mã sinh viên',
  studentName:    'Họ và Tên',
  lmsStatus:      'Trạng thái LMS',
  submittedCount: 'Số bài đã nộp',
  completedCount: 'Số bài hoàn thành',
  aiScore:        'Điểm AI',
  githubUrl:      'GitHub URL',
  submissionUrl:  'URL bài nộp LMS',
};

const COL_WIDTHS: Record<string, number> = {
  studentId:      14,
  studentName:    26,
  lmsStatus:      20,
  submittedCount: 16,
  completedCount: 18,
  aiScore:        10,
  githubUrl:      40,
  submissionUrl:  40,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStudentStatus(st: Student) {
  const s = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : '';
  const isCompleted    = s.includes('HOÀN THÀNH') && !s.includes('CHƯA');
  const isPending      = s.includes('CHỜ KIỂM TRA') || s.includes('ĐANG CHỜ') || s.includes('KIỂM TRA');
  const isNotCompleted = !isCompleted && !isPending;
  return { isCompleted, isPending, isNotCompleted };
}

function getLatestScore(st: Student): string {
  const directScore = (st as any).score;
  if (directScore !== null && directScore !== undefined) return String(directScore);
  if (st.submissions) {
    let latest: any = null;
    for (const key in st.submissions) {
      const sub = st.submissions[key];
      if (sub?.score !== undefined && sub?.score !== null) {
        if (!latest || new Date(sub.gradedAt || 0) > new Date(latest.gradedAt || 0)) {
          latest = sub;
        }
      }
    }
    if (latest) return String(latest.score);
  }
  return '';
}

function filterStudents(students: Student[], filter: StatusFilter): Student[] {
  if (filter === 'all') return students;
  return students.filter(st => {
    const { isCompleted, isPending, isNotCompleted } = getStudentStatus(st);
    if (filter === 'completed')    return isCompleted;
    if (filter === 'pending')      return isPending;
    if (filter === 'notCompleted') return isNotCompleted;
    return true;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  students: Student[];
  onClose: () => void;
  onExport: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const ExcelExportModal: React.FC<Props> = ({ students, onClose, onExport }) => {
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    () => Object.fromEntries(FIELDS.map(f => [f.key, f.default]))
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isExporting, setIsExporting] = useState(false);

  const toggleField = useCallback((key: string) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectAll  = () => setSelectedFields(Object.fromEntries(FIELDS.map(f => [f.key, true])));
  const selectNone = () => setSelectedFields(Object.fromEntries(FIELDS.map(f => [f.key, false])));

  const filteredStudents = filterStudents(students, statusFilter);
  const activeFieldCount  = FIELDS.filter(f => selectedFields[f.key]).length;

  const countFor = (filter: StatusFilter) =>
    filter === 'all' ? students.length : filterStudents(students, filter).length;

  const handleExport = async () => {
    if (activeFieldCount === 0) {
      onExport('Vui lòng chọn ít nhất một trường để xuất.', 'warning');
      return;
    }
    if (filteredStudents.length === 0) {
      onExport('Không có học viên nào phù hợp với bộ lọc đã chọn.', 'warning');
      return;
    }

    setIsExporting(true);

    const activeFields = FIELDS.filter(f => selectedFields[f.key]);
    const data = filteredStudents.map(st => {
      const row: Record<string, any> = {};
      activeFields.forEach(f => {
        const col = COLUMN_LABELS[f.key];
        switch (f.key) {
          case 'studentId':      row[col] = st.studentId || '';           break;
          case 'studentName':    row[col] = st.studentName || '';         break;
          case 'lmsStatus':      row[col] = st.lmsStatus || '';           break;
          case 'submittedCount': row[col] = st.submittedCount ?? 0;       break;
          case 'completedCount': row[col] = st.completedCount ?? 0;       break;
          case 'aiScore':        row[col] = getLatestScore(st);            break;
          case 'githubUrl':      row[col] = (st as any).githubUrl || '';  break;
          case 'submissionUrl':  row[col] = st.submissionUrl || '';        break;
        }
      });
      return row;
    });

    const columnWidths = activeFields.map(f => ({ wch: COL_WIDTHS[f.key] || 20 }));

    const filterSuffix =
      statusFilter === 'completed'    ? '_HoanThanh'     :
      statusFilter === 'notCompleted' ? '_ChuaHoanThanh' :
      statusFilter === 'pending'      ? '_ChoKiemTra'    : '';

    const fileName = `BaoCao_LopHoc${filterSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    try {
      await exportToExcel(data, 'Danh sách lớp', fileName, columnWidths);
      onExport(`✅ Đã xuất ${filteredStudents.length} học viên với ${activeFieldCount} trường.`, 'success');
      onClose();
    } catch (err: any) {
      onExport('Xuất Excel thất bại: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl w-[420px] max-w-[95vw] flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-green-600 to-emerald-600">
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">📊 Xuất Báo Cáo Excel</h2>
            <p className="text-green-100 text-[10px] mt-0.5">Chọn trường và lọc học viên trước khi xuất</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-base leading-none p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Section 1: Field selection */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">📋 Chọn trường xuất</span>
              <div className="flex gap-1.5">
                <button
                  onClick={selectAll}
                  className="text-[10px] px-2 py-0.5 rounded border border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 font-semibold transition-colors"
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={selectNone}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 bg-slate-50 hover:bg-slate-100 font-semibold transition-colors"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(f => (
                <label
                  key={f.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none ${
                    selectedFields[f.key]
                      ? 'bg-green-50 border-green-400 text-green-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedFields[f.key]}
                    onChange={() => toggleField(f.key)}
                    className="accent-green-600 w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-[11px] font-semibold leading-tight">{f.label}</span>
                </label>
              ))}
            </div>

            {activeFieldCount === 0 && (
              <p className="text-[10px] text-red-500 mt-1.5 font-medium">⚠️ Vui lòng chọn ít nhất một trường.</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-200" />

          {/* Section 2: Status filter */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2.5">🔍 Lọc theo trạng thái</span>
            <div className="flex flex-col gap-2">
              {STATUS_FILTERS.map(sf => {
                const count = countFor(sf.value);
                const isActive = statusFilter === sf.value;
                return (
                  <label
                    key={sf.value}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                      isActive
                        ? sf.activeCls + ' ring-2 ring-offset-1 ring-current/30'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statusFilter"
                      value={sf.value}
                      checked={isActive}
                      onChange={() => setStatusFilter(sf.value)}
                      className="accent-green-600 w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                    />
                    <span className="text-sm leading-none">{sf.icon}</span>
                    <span className="text-[11px] font-semibold flex-1">{sf.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center ${
                      isActive ? 'bg-white/60' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-[10px] text-slate-500 font-medium leading-relaxed">
            <span className="font-bold text-slate-700">{filteredStudents.length}</span> học viên
            {' · '}
            <span className="font-bold text-slate-700">{activeFieldCount}</span> trường
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || activeFieldCount === 0 || filteredStudents.length === 0}
              className="px-3.5 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 active:scale-95 duration-100 flex items-center gap-1.5"
            >
              {isExporting ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xuất...
                </>
              ) : (
                <>📥 Xuất Excel</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
