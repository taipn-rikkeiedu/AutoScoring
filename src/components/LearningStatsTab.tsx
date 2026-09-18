import React from 'react';
import { useLearningStatsManager, SortColumn } from '~/src/hooks/learning-stats/useLearningStatsManager';
import { exportToExcel } from '~/src/core/excelExporter';
import { RefreshIcon, DownloadIcon, TrashIcon } from '~/src/components/Icons';
import { LearningStatRow } from '~/src/types';

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'no', label: 'STT' },
  { key: 'studentName', label: 'Học viên' },
  { key: 'absentRatio', label: 'Tỷ lệ nghỉ học' },
  { key: 'missingHomeworkRatio', label: 'Tỷ lệ thiếu bài tập' },
  { key: 'elearningStatus', label: 'E-learning' },
  { key: 'lateAssignmentsText', label: 'Số bài chậm' },
  { key: 'hackathonTN', label: 'Hackathon - TN' },
  { key: 'hackathonTL', label: 'Hackathon - TL' },
  { key: 'rPoints', label: 'R-Points' },
  { key: 'autoRPoints', label: 'Auto R-Points' },
  { key: 'scoreLockStatus', label: 'Trạng thái chốt điểm' },
  { key: 'projectEligibility', label: 'Điều kiện project' }
];

function formatCell(row: LearningStatRow, key: SortColumn): string {
  const value = row[key];
  if (value === null || value === undefined) return '—';
  if (key === 'absentRatio' || key === 'missingHomeworkRatio') return `${value}%`;
  return String(value);
}

function isRiskyRow(row: LearningStatRow): boolean {
  const status = `${row.elearningStatus} ${row.lateAssignmentsText}`.toLowerCase();
  return row.projectEligibility.includes('Không đủ điều kiện') ||
    status.includes('cảnh báo') ||
    status.includes('báo động');
}

export const LearningStatsTab: React.FC = () => {
  const {
    snapshots,
    activeKey,
    activeSnapshot,
    displayedRows,
    isScanning,
    statusText,
    sortColumn,
    sortDirection,
    filterText,
    setFilterText,
    handleScan,
    handleDeleteSnapshot,
    handleSwitchSnapshot,
    handleSort
  } = useLearningStatsManager();

  const snapshotKeys = Object.keys(snapshots);

  const handleExportExcel = () => {
    if (!activeSnapshot) return;
    const data = displayedRows.map(row => {
      const record: Record<string, any> = {};
      COLUMNS.forEach(col => { record[col.label] = formatCell(row, col.key); });
      record['Email'] = row.studentEmail;
      return record;
    });
    exportToExcel(data, 'ChiSoHocTap', `ChiSoHocTap_${activeSnapshot.className}_${activeSnapshot.subjectName}.xlsx`);
  };

  return (
    <div className="flex flex-col flex-1 p-3.5 gap-3 overflow-hidden">
      {/* Snapshot switcher */}
      {snapshotKeys.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap select-none">
          {snapshotKeys.map(key => {
            const snap = snapshots[key];
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                onClick={() => handleSwitchSnapshot(key)}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border ${
                  isActive
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{snap.className} · {snap.subjectName}</span>
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteSnapshot(key); }}
                  className="inline-flex"
                >
                  <TrashIcon className={`w-3 h-3 ${isActive ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-rose-500"}`} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary cards */}
      {activeSnapshot ? (
        <div className="grid grid-cols-3 gap-2 select-none">
          <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-2 flex flex-col">
            <span className="text-[10px] font-semibold text-rose-700 uppercase">Nghỉ học &gt;10%</span>
            <span className="text-sm font-bold text-rose-700">{activeSnapshot.summary.absentOverTenPercentText || '—'}</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2 flex flex-col">
            <span className="text-[10px] font-semibold text-amber-700 uppercase">Vi phạm bài tập &gt;10%</span>
            <span className="text-sm font-bold text-amber-700">{activeSnapshot.summary.homeworkViolationText || '—'}</span>
          </div>
          <div className="bg-orange-50/60 border border-orange-200 rounded-lg p-2 flex flex-col">
            <span className="text-[10px] font-semibold text-orange-700 uppercase">Vi phạm không chuẩn bị bài</span>
            <span className="text-sm font-bold text-orange-700">{activeSnapshot.summary.unpreparedViolationText || '—'}</span>
          </div>
        </div>
      ) : (
        <div className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 select-none">
          {statusText}
        </div>
      )}

      {activeSnapshot && activeSnapshot.missingColumns.length > 0 && (
        <div className="text-[11px] px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 font-medium text-amber-800 select-none">
          ⚠️ LMS đã đổi cấu trúc cột: {activeSnapshot.missingColumns.join(', ')} — dữ liệu các cột này có thể thiếu.
        </div>
      )}

      {/* Filter input */}
      {activeSnapshot && (
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Lọc theo tên hoặc email..."
          className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      )}

      {/* Main table */}
      <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-lg bg-white">
        {displayedRows.length > 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 select-none">
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-100"
                    title="Bấm để sắp xếp"
                  >
                    {col.label}
                    {sortColumn === col.key && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRows.map((row, idx) => (
                <tr key={`${row.studentEmail}-${idx}`} className={`hover:bg-slate-50 transition-colors ${isRiskyRow(row) ? 'bg-rose-50/40' : ''}`}>
                  {COLUMNS.map(col => (
                    <td key={col.key} className="py-2 px-3 whitespace-nowrap">
                      {col.key === 'studentName' ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{row.studentName}</span>
                          <span className="text-[9.5px] text-slate-400">{row.studentEmail}</span>
                        </div>
                      ) : (
                        formatCell(row, col.key)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col justify-center items-center py-16 text-slate-400 select-none">
            <span className="text-sm font-semibold text-slate-600">Chưa có dữ liệu chỉ số học tập</span>
            <span className="text-[11px] text-slate-400 text-center max-w-[280px] mt-1">
              Mở trang Thống kê học tập trên LMS, chọn lớp + môn học, rồi bấm "Quét chỉ số".
            </span>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="flex justify-end items-center select-none pt-0.5 gap-2">
        <button
          onClick={handleExportExcel}
          disabled={!activeSnapshot || displayedRows.length === 0}
          className="py-1.5 px-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          <span>Xuất Excel</span>
        </button>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="py-1.5 px-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          <span>Quét chỉ số</span>
        </button>
      </div>
    </div>
  );
};
