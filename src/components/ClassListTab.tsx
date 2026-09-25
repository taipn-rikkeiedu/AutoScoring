import React from 'react';
import { useClassManager } from '~/src/hooks/class-management/useClassManager';
import { Student } from '~/src/types';
import { ExcelExportModal } from '~/src/components/ExcelExportModal';
import { DownloadIcon, RefreshIcon, TrashIcon } from '~/src/components/Icons';

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
    <div className="flex flex-col flex-1 p-3.5 gap-3 overflow-hidden">
      {/* Stats Summary Cards */}
      {statusType === 'success' && stats.total > 0 ? (
        <div className="grid grid-cols-4 gap-2 select-none">
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-lg p-2 flex flex-col hover:-translate-y-0.5 transition-transform shadow-sm">
            <span className="text-[11.5px] font-semibold text-[var(--text-muted)] uppercase">Sĩ số</span>
            <span className="text-sm font-bold text-[var(--text-heading)]">{stats.total}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-lg p-2 flex flex-col hover:-translate-y-0.5 transition-transform shadow-sm">
            <span className="text-[11.5px] font-semibold text-[var(--accent-green)] uppercase">Hoàn thành</span>
            <span className="text-sm font-bold text-[var(--accent-green)]">{stats.completed}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--accent-gold)] rounded-lg p-2 flex flex-col hover:-translate-y-0.5 transition-transform shadow-sm">
            <span className="text-[11.5px] font-semibold text-[var(--accent-gold)] uppercase">Chờ kiểm tra</span>
            <span className="text-sm font-bold text-[var(--accent-gold)]">{stats.pending}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--primary-red)] rounded-lg p-2 flex flex-col hover:-translate-y-0.5 transition-transform shadow-sm">
            <span className="text-[11.5px] font-semibold text-[var(--primary-red)] uppercase">Chưa nộp / Lỗi</span>
            <span className="text-sm font-bold text-[var(--primary-red)]">{stats.notCompleted}</span>
          </div>
        </div>
      ) : (
        <div className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 select-none">
          {statusText}
        </div>
      )}

      {/* Main Student List Table */}
      <div className="flex-1 min-h-0 rank-matrix-wrapper">
        {sortedStudents.length > 0 ? (
          <table className="rank-matrix-table table-fixed">
            <thead className="sticky top-0 z-10 select-none">
              <tr>
                <th className="w-20">Mã SV</th>
                <th>Học viên</th>
                <th className="text-center w-28">Trạng thái LMS</th>
                <th className="text-center w-36">Tiến độ bài nộp</th>
              </tr>
            </thead>
            <tbody className="stagger-grid">
              {sortedStudents.map((st) => {
                let statusText = st.lmsStatus || 'CHƯA NỘP';
                let isCompleted = statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA');
                let isPending = statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ');
                
                const submitted = st.submittedCount || 0;
                if (submitted === 0) {
                  isCompleted = false;
                  isPending = false;
                  statusText = 'CHƯA NỘP';
                }
                const { score, report } = getStudentScoreInfo(st);

                return (
                  <tr key={st.studentId} className="animate-entrance">
                    <td 
                      onClick={() => handleStudentScroll(st)} 
                      className="py-2.5 px-3 font-mono font-semibold text-[var(--text-heading)] cursor-pointer hover:text-[var(--accent-blue)] hover:underline"
                    >
                      {st.studentId}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11.5px] text-slate-600 flex-shrink-0">
                          {st.studentName ? st.studentName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <a 
                            href={st.submissionUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => { 
                              if (!e.ctrlKey && !e.metaKey) { 
                                e.preventDefault(); 
                                handleStudentScroll(st); 
                              } 
                            }} 
                            className="font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate"
                          >
                            {st.studentName}
                          </a>
                          {(st as any).githubUrl && (
                            <a 
                              href={(st as any).githubUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[11px] text-blue-600 font-mono font-normal truncate max-w-[160px] hover:underline"
                            >
                              {(st as any).githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`tag ${
                        isCompleted 
                          ? 'tag-green' 
                          : isPending 
                          ? 'tag-gold' 
                          : 'tag-purple'
                      }`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="inline-block text-[12px] font-medium py-0.5 px-2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {st.completedCount || 0} / {st.submittedCount || 0}
                        </span>
                        {score !== null && score !== undefined && (
                          <div 
                            className="text-[11px] text-emerald-700 font-semibold mt-1 underline decoration-dashed cursor-pointer hover:text-emerald-800"
                            onClick={() => (window as any).showReportModal?.({ title: `Báo cáo: ${st.studentName}`, score, report })}
                          >
                            Điểm: {score}/100
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
          <div className="flex flex-col justify-center items-center py-16 text-slate-400 select-none">
            <span className="text-sm font-semibold text-slate-600">Chưa có dữ liệu lớp học</span>
            <span className="text-[12.5px] text-slate-400 text-center max-w-[280px] mt-1">
              Mở trang danh sách học viên trên LMS và bấm "Quét danh sách lớp".
            </span>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex justify-between items-center select-none pt-0.5">
        <button 
          onClick={handleClearClass} 
          className="py-1.5 px-3 bg-white hover:bg-slate-50 text-rose-600 border border-slate-200 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <TrashIcon className="w-3.5 h-3.5 text-rose-600" />
          <span>Xóa danh sách</span>
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handleScanClass} 
            disabled={isScanning} 
            className="py-1.5 px-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Quét danh sách</span>
          </button>
          <button 
            onClick={handleOpenExportModal} 
            disabled={classStudents.length === 0} 
            className="py-1.5 px-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {showExportModal && (
        <ExcelExportModal 
          students={classStudents} 
          onClose={() => setShowExportModal(false)} 
          onExport={(msg, type) => (window as any).showToast?.(msg, type)} 
        />
      )}
    </div>
  );
};
