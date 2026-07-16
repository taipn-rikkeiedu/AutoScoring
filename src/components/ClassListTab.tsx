import React from 'react';
import { useClassManager } from '~/src/hooks/class-management/useClassManager';
import { Student } from '~/src/types';
import { ExcelExportModal } from '~/src/components/ExcelExportModal';

interface ClassListTabProps {
  setActiveTab: (tab: string) => void;
}

export const ClassListTab: React.FC<ClassListTabProps> = ({ setActiveTab }) => {
  const {
    isScanning,
    showExportModal,
    setShowExportModal,
    statusText,
    statusType,
    stats,
    classStudents,
    handleScanClass,
    handleStudentScroll,
    handleGradeStudent,
    handleDeleteStudent,
    handleClearClass,
    handleOpenExportModal
  } = useClassManager(setActiveTab);

  const sortedStudents = [...classStudents].sort((a, b) => {
    const statusA = a.lmsStatus?.toUpperCase() || '';
    const statusB = b.lmsStatus?.toUpperCase() || '';
    const isPendingA = statusA.includes('CHỜ KIỂM TRA') || statusA.includes('ĐANG CHỜ');
    const isPendingB = statusB.includes('CHỜ KIỂM TRA') || statusB.includes('ĐANG CHỜ');
    return (isPendingA ? 1 : 2) - (isPendingB ? 1 : 2);
  });

  const getStudentScoreInfo = (st: Student) => {
    let score = (st as any).score;
    let report = (st as any).comments;
    if (st.submissions) {
      let latestGraded: any = null;
      for (const key in st.submissions) {
        const sub = st.submissions[key];
        if (sub && sub.score !== undefined && sub.score !== null) {
          if (!latestGraded || new Date(sub.gradedAt || 0) > new Date(latestGraded.gradedAt || 0)) latestGraded = sub;
        }
      }
      if (latestGraded) {
        score = latestGraded.score;
        report = latestGraded.report;
      }
    }
    return { score, report };
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-3.5 overflow-hidden">
      <div className={`text-xs p-3 rounded-md border-l-4 font-medium transition-all ${statusType === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-100 border-blue-500 text-slate-700'}`}>
        {statusType === 'success' && stats.total > 0 ? (
          <div>
            <div className="font-bold text-slate-800 mb-1">📊 Thống kê lớp học: Sĩ số {stats.total} | Đã chấm {stats.graded}</div>
            <div className="flex gap-3 text-[11px] font-semibold">
              <span>Hoàn thành: <span className="text-green-600 font-bold">{stats.completed}</span></span>
              <span>Chưa hoàn thành: <span className="text-red-500 font-bold">{stats.notCompleted}</span></span>
              <span>Chờ kiểm tra: <span className="text-amber-500 font-bold">{stats.pending}</span></span>
            </div>
          </div>
        ) : (
          <div>{statusText}</div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border border-slate-300 rounded-md bg-white">
        {sortedStudents.length > 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-3 w-20">Mã SV</th>
                <th className="py-2.5 px-3">Họ và Tên</th>
                <th className="py-2.5 px-3 text-center w-28">Trạng thái LMS</th>
                <th className="py-2.5 px-3 text-center w-36">Bài hoàn thành / Đã nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedStudents.map(st => {
                const statusText = st.lmsStatus || 'CHƯA NỘP';
                const isCompleted = statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA');
                const isPending = statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ');
                const { score, report } = getStudentScoreInfo(st);

                return (
                  <tr key={st.studentId} className={`hover:bg-slate-50/50 ${isPending ? 'bg-amber-50/20' : ''}`}>
                    <td onClick={() => handleStudentScroll(st)} className="py-2 px-3 font-bold text-slate-700 cursor-pointer hover:underline">{st.studentId}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-0.5">
                        <a href={st.submissionUrl} target="_blank" rel="noreferrer" onClick={(e) => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); handleStudentScroll(st); } }} className="font-semibold text-slate-800 hover:text-blue-600 hover:underline">{st.studentName}</a>
                        {(st as any).githubUrl && (
                          <a href={(st as any).githubUrl} target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 font-medium truncate max-w-[150px] hover:underline">
                            {(st as any).githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block text-xs font-bold py-0.5 px-2 rounded border ${isCompleted ? 'bg-green-100 text-green-800 border-green-200' : isPending ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="inline-block text-[10px] font-bold py-0.5 px-2 rounded bg-slate-100 text-slate-600">{st.completedCount || 0} / {st.submittedCount || 0}</span>
                        {score !== null && score !== undefined && (
                          <div 
                            className="text-[9px] text-green-700 font-bold mt-1 underline decoration-dashed cursor-pointer"
                            onClick={() => (window as any).showReportModal?.({ title: `Báo cáo: ${st.studentName}`, score, report })}
                          >
                            AI: {score}/100
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400 select-none">
            <span className="text-3xl mb-2">👥</span>
            <span className="text-sm font-bold text-slate-500">Chưa có dữ liệu lớp học</span>
            <span className="text-[11px] text-slate-400 text-center mt-1">Hãy mở trang danh sách học viên trên LMS và bấm "Quét Danh Sách Lớp".</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center select-none pt-1">
        <button onClick={handleClearClass} className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md text-xs font-bold transition-colors active:scale-95 duration-100 cursor-pointer">❌ Xóa Danh Sách</button>
        <div className="flex gap-2">
          <button onClick={handleScanClass} disabled={isScanning} className="py-1.5 px-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md text-xs font-bold shadow-md transition-all active:scale-95 duration-100 cursor-pointer"><span>📥 Quét Danh Sách Lớp</span></button>
          <button onClick={handleOpenExportModal} disabled={classStudents.length === 0} className="py-1.5 px-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-md text-xs font-bold shadow-md transition-all disabled:opacity-50 active:scale-95 duration-100 cursor-pointer"><span>📊 Xuất Excel</span></button>
        </div>
      </div>

      {showExportModal && <ExcelExportModal students={classStudents} onClose={() => setShowExportModal(false)} onExport={(msg, type) => (window as any).showToast?.(msg, type)} />}
    </div>
  );
};
