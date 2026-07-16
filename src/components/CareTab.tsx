import React from 'react';
import { useTakeCare } from '~/src/hooks/take-care/useTakeCare';

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
    <div className="flex flex-col flex-1 p-4 gap-3.5 overflow-hidden">
      {/* Status Alert and Copy Button */}
      <div className="flex justify-between items-center gap-2 select-none">
        <div 
          className={`flex-1 text-xs p-2 rounded-md border-l-4 font-medium transition-all ${
            statusType === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
            statusType === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
            statusType === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
            'bg-slate-100 border-blue-500 text-slate-700'
          }`}
        >
          {statusText}
        </div>
        <button
          onClick={handleCopyReport}
          disabled={careStudents.length === 0}
          title="Copy báo cáo nhanh"
          className="w-9 h-9 min-w-[36px] bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center rounded-md font-medium shadow-md disabled:opacity-50 active:scale-95 duration-100"
        >
          📋
        </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 overflow-y-auto border border-slate-300 rounded-md bg-white">
        {careStudents.length > 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-2 text-center w-10">STT</th>
                <th className="py-2.5 px-3 min-w-[160px]">Ghi chú chăm sóc</th>
                <th className="py-2.5 px-2 w-20">Mã SV</th>
                <th className="py-2.5 px-3 w-32">Họ và Tên</th>
                <th className="py-2.5 px-3 w-36">Môn học</th>
                <th className="py-2.5 px-2 w-24">Ngày học</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {careStudents.map((st, index) => (
                <tr key={`${st.studentId}_${st.subjectName}_${st.studyDate}`} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2 text-center text-slate-400 font-semibold">{index + 1}</td>
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
                      placeholder="Nhập thông tin sau khi liên hệ..."
                      className="w-full py-1 px-2 border border-slate-300 hover:border-slate-400 focus:border-blue-500 rounded bg-white font-medium text-slate-700 placeholder:text-slate-350 focus:outline-none transition-colors"
                    />
                  </td>
                  <td className="py-2 px-2 font-bold text-slate-700">{st.studentId}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{st.studentName}</td>
                  <td className="py-2 px-3 text-slate-500 truncate max-w-[120px]" title={st.subjectName}>{st.subjectName || "-"}</td>
                  <td className="py-2 px-2 text-slate-500">{st.studyDate || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400 select-none">
            <span className="text-3xl mb-2">📞</span>
            <span className="text-sm font-bold text-slate-500">Chưa có dữ liệu chăm sóc</span>
            <span className="text-[11px] text-slate-400 text-center max-w-[280px] mt-1 leading-normal">
              Mở trang Chăm sóc học viên trên LMS (đường dẫn /class/*/take-care) và bấm "Quét Dữ Liệu Chăm Sóc".
            </span>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex justify-between items-center select-none pt-1">
        <button
          onClick={handleClearList}
          className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md text-xs font-bold transition-colors active:scale-95 duration-100"
        >
          ❌ Xóa Danh Sách
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleScanCare}
            disabled={isScanning}
            className="py-1.5 px-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md text-xs font-bold shadow-md transition-all active:scale-95 duration-100"
          >
            <span>📥 Quét Dữ Liệu Chăm Sóc</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={careStudents.length === 0}
            className="py-1.5 px-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-md text-xs font-bold shadow-md transition-all disabled:opacity-50 active:scale-95 duration-100"
          >
            <span>📊 Xuất Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
