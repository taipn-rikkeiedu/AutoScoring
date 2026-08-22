import React from 'react';
import { useTakeCare } from '~/src/hooks/take-care/useTakeCare';
import { CopyIcon, DownloadIcon, RefreshIcon, TrashIcon } from '~/src/components/Icons';

export const CareTab: React.FC = () => {
  const {
    isScanning,
    statusText,
    statusType,
    careStudents,
    handleScanCare,
    handleSaveNote,
    handleClearList,
    handleExportExcel,
    handleCopyReport
  } = useTakeCare();

  return (
    <div className="flex flex-col flex-1 p-3.5 gap-3 overflow-hidden">
      {/* Status Alert and Quick Action */}
      <div className="flex justify-between items-center gap-2 select-none">
        <div 
          className={`flex-1 text-xs px-3 py-2 rounded-lg border font-medium transition-all ${
            statusType === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : statusType === 'warning' 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : statusType === 'error' 
              ? 'bg-rose-50 text-rose-800 border-rose-200' 
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {statusText}
        </div>
        <button
          onClick={handleCopyReport}
          disabled={careStudents.length === 0}
          title="Sao chép báo cáo chăm sóc"
          className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
        >
          <CopyIcon className="w-3.5 h-3.5 text-slate-500" />
          <span>Sao chép</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-lg bg-white">
        {careStudents.length > 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-2.5 text-center w-10">STT</th>
                <th className="py-2.5 px-3 min-w-[170px]">Ghi chú chăm sóc</th>
                <th className="py-2.5 px-2.5 w-20">Mã SV</th>
                <th className="py-2.5 px-3 w-32">Họ và Tên</th>
                <th className="py-2.5 px-3 w-36">Môn học</th>
                <th className="py-2.5 px-2.5 w-24">Ngày học</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {careStudents.map((st, index) => (
                <tr key={`${st.studentId}_${st.subjectName}_${st.studyDate}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-2.5 text-center text-slate-400 font-medium">{index + 1}</td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      defaultValue={st.note || ""}
                      onBlur={(e) => handleSaveNote(st.studentId, st.subjectName, st.studyDate, e.target.value.trim())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="Nhập ghi chú liên hệ..."
                      className="w-full py-1 px-2 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none transition-colors text-xs"
                    />
                  </td>
                  <td className="py-2.5 px-2.5 font-mono font-semibold text-slate-700">{st.studentId}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{st.studentName}</td>
                  <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]" title={st.subjectName}>
                    {st.subjectName || "-"}
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-500">{st.studyDate || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col justify-center items-center py-16 text-slate-400 select-none">
            <span className="text-sm font-semibold text-slate-600">Chưa có dữ liệu chăm sóc</span>
            <span className="text-[11px] text-slate-400 text-center max-w-[280px] mt-1">
              Mở trang Chăm sóc học viên trên LMS (/class/*/take-care) và bấm "Quét dữ liệu".
            </span>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex justify-between items-center select-none pt-0.5">
        <button
          onClick={handleClearList}
          className="py-1.5 px-3 bg-white hover:bg-slate-50 text-rose-600 border border-slate-200 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <TrashIcon className="w-3.5 h-3.5 text-rose-500" />
          <span>Xóa danh sách</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleScanCare}
            disabled={isScanning}
            className="py-1.5 px-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Quét dữ liệu</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={careStudents.length === 0}
            className="py-1.5 px-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
