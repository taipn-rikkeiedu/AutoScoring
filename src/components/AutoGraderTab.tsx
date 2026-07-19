import React from 'react';
import { useAutoGrader } from '~/src/hooks/auto-grader/useAutoGrader';
import { Submission } from '~/src/types';
import { DEFAULT_CRITERIA, extractComment } from '~/src/core/utils';

export const AutoGraderTab: React.FC = () => {
  const {
    submissions,
    isScanning,
    scanStatus,
    scanStatusType,
    expandedRows,
    isBulkGrading,
    bulkProgress,
    bulkProgressText,
    exerciseTemplates,
    aiStatus,
    handleRescan,
    handleToggleSelectAll,
    handleRowCheckboxChange,
    handleTemplateSelectionChange,
    toggleRowExpansion,
    handleGradeSingleRow,
    handleBulkGrading
  } = useAutoGrader();

  const allChecked = submissions.length > 0 && submissions.every(s => s.checked);
  const checkedCount = submissions.filter(s => s.checked).length;
  const gradeableCount = submissions.filter(s => s.checked && s.matchedTemplate).length;

  const buildTemplateOptions = () => {
    const options: React.ReactNode[] = [<option key="empty" value="">-- Chưa liên kết --</option>];
    for (const chapter in exerciseTemplates) {
      const groupOptions: React.ReactNode[] = [];
      for (const session in exerciseTemplates[chapter]) {
        for (const name in exerciseTemplates[chapter][session]) {
          groupOptions.push(<option key={`${chapter}||${session}||${name}`} value={`${chapter}||${session}||${name}`}>{session} - {name}</option>);
        }
      }
      options.push(<optgroup key={chapter} label={chapter}>{groupOptions}</optgroup>);
    }
    return options;
  };

  const getStatusBadge = (sub: Submission) => {
    const base = "inline-block text-xs py-0.5 px-2 rounded shadow-sm text-center font-bold select-none ";
    if (sub.status === 'downloading') return <span className={base + "bg-blue-100 text-blue-700 animate-pulse"}>Tải code...</span>;
    if (sub.status === 'grading') return <span className={base + "bg-amber-100 text-amber-700 animate-pulse"}>AI chấm...</span>;
    if (sub.status === 'success') {
      return (
        <span 
          onClick={() => (window as any).showReportModal?.({ title: `Báo cáo: ${sub.studentName} - ${sub.exerciseName}`, score: sub.score, report: sub.report || "" })}
          className={base + "bg-green-100 text-green-800 border-green-200 cursor-pointer hover:bg-green-200"}
        >
          {sub.score || '--'} / 100
        </span>
      );
    }
    if (sub.status === 'error') {
      return <span onClick={() => (window as any).showToast?.((sub as any).error || 'Lỗi chấm bài.', 'error')} className={base + "bg-red-100 text-red-700 cursor-pointer hover:bg-red-200"}>Lỗi</span>;
    }
    return <span className={base + "bg-slate-100 text-slate-600 border"}>Chờ chấm</span>;
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-3.5 overflow-hidden">
      <div className={`text-xs p-2 rounded-md border-l-4 font-medium select-none ${scanStatusType === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-100 border-blue-500 text-slate-700'}`}>
        {scanStatus}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-md bg-white">
        {isScanning && submissions.length === 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse select-none">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-2 text-center w-8">
                  <input type="checkbox" disabled className="rounded border-slate-300" />
                </th>
                <th className="py-2.5 px-3">Bài tập trên trang</th>
                <th className="py-2.5 px-3 w-40">Đề bài liên kết</th>
                <th className="py-2.5 px-3 text-center w-24">Điểm số</th>
                <th className="py-2.5 px-3 text-center w-24">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 animate-pulse">
              {[1, 2, 3, 4].map((idx) => (
                <tr key={idx} className="bg-white">
                  <td className="py-3 px-2 text-center">
                    <div className="h-3 w-3 bg-slate-200 rounded mx-auto"></div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="h-3.5 w-44 bg-slate-200 rounded"></div>
                      <div className="h-2.5 w-24 bg-slate-100 rounded"></div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-6 w-full bg-slate-100 rounded"></div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="h-5 w-16 bg-slate-100 rounded mx-auto"></div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="h-6 w-16 bg-slate-200 rounded mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : submissions.length > 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-2 text-center w-8">
                  <input type="checkbox" checked={allChecked} onChange={(e) => handleToggleSelectAll(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="py-2.5 px-3">Bài tập trên trang</th>
                <th className="py-2.5 px-3 w-40">Đề bài liên kết</th>
                <th className="py-2.5 px-3 text-center w-24">Điểm số</th>
                <th className="py-2.5 px-3 text-center w-24">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {submissions.map((sub, index) => {
                const isExpanded = !!expandedRows[index];
                const matchedVal = sub.matchedTemplate ? `${sub.matchedTemplate.chapter}||${sub.matchedTemplate.session}||${sub.matchedTemplate.assignmentName}` : '';
                const template = sub.matchedTemplate ? exerciseTemplates?.[sub.matchedTemplate.chapter]?.[sub.matchedTemplate.session]?.[sub.matchedTemplate.assignmentName] : null;

                return (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-center">
                        <input type="checkbox" checked={!!sub.checked} onChange={(e) => handleRowCheckboxChange(index, e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                      <td className="py-2 px-3">
                        <div onClick={() => toggleRowExpansion(index)} className="flex flex-col gap-0.5 cursor-pointer hover:opacity-80">
                          <span className="font-bold text-slate-800 line-clamp-1">{sub.exerciseName}</span>
                          {sub.studentName && <span className="text-[10px] text-slate-500 font-semibold">👤 {sub.studentName}</span>}
                          <span className="text-[9px] font-mono text-slate-400 truncate max-w-[150px]">{sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <select value={matchedVal} onChange={(e) => handleTemplateSelectionChange(index, e.target.value)} className={`w-full text-xs font-semibold rounded py-1 px-1.5 focus:outline-none border ${!matchedVal ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300 bg-white text-slate-700'}`}>
                          {buildTemplateOptions()}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">{getStatusBadge(sub)}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleGradeSingleRow(index)}
                          disabled={sub.status === 'grading' || sub.status === 'downloading'}
                          className={`py-1 px-2.5 text-xs font-bold rounded border transition-all active:scale-95 duration-100 cursor-pointer ${sub.status === 'success' ? 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'}`}
                        >
                          {sub.status === 'success' ? '🔄 Chấm Lại' : sub.status === 'grading' || sub.status === 'downloading' ? '⏳ Chấm...' : '🚀 Chấm Bài'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50 border-t border-slate-200">
                        <td colSpan={5} className="p-3">
                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold text-slate-500 uppercase">📄 Đề Bài:</span>
                                <pre className="text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded p-2.5 h-20 overflow-y-auto whitespace-pre-wrap font-sans">{template ? template.assignment : 'Chưa liên kết đề bài.'}</pre>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold text-slate-500 uppercase">📋 Rubric:</span>
                                <pre className="text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded p-2.5 h-20 overflow-y-auto whitespace-pre-wrap font-sans">{template ? (template.criteria || DEFAULT_CRITERIA) : 'Chưa liên kết đề bài.'}</pre>
                              </div>
                            </div>
                            {sub.status === 'success' && (
                              <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
                                {sub.fileList && sub.fileList.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase">📁 Tệp đã chấm ({sub.fileList.length}):</span>
                                    <ul className="text-xs font-mono max-h-16 overflow-y-auto bg-white border rounded p-1.5 pl-3 list-disc">{sub.fileList.map((file, fIdx) => <li key={fIdx}>{file}</li>)}</ul>
                                  </div>
                                )}
                                {sub.report && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase">💬 Nhận xét:</span>
                                    <div className="text-xs text-slate-600 bg-white border rounded p-2 max-h-20 overflow-y-auto whitespace-pre-line">{extractComment(sub.report)}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400 select-none">
            <span className="text-3xl mb-2">🔍</span>
            <span className="text-sm font-bold text-slate-500">Không tìm thấy bài tập nào</span>
            <span className="text-[11px] text-slate-400 text-center max-w-[280px]">Vui lòng chuyển tới trang nộp bài tập hoặc bấm quét lại trang.</span>
          </div>
        )}
      </div>

      {isBulkGrading && (
        <div className="flex flex-col gap-2 p-3 border border-slate-200 rounded-md bg-slate-50 select-none animate-pulse">
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div style={{ width: `${bulkProgress}%` }} className="bg-green-600 h-full rounded-full transition-all duration-300"></div>
          </div>
          <div className="text-[10px] font-bold text-slate-500">{bulkProgressText}</div>
        </div>
      )}

      <div className="flex justify-between items-center select-none pt-1">
        <button onClick={handleRescan} disabled={isScanning || isBulkGrading} className="py-1.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-xs font-bold transition-all active:scale-[0.98]">🔄 Quét Lại Trang</button>
        <button
          onClick={handleBulkGrading}
          disabled={isBulkGrading || gradeableCount === 0 || aiStatus !== "success"}
          className="py-1.5 px-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md text-xs font-bold shadow-md transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          <span>{isBulkGrading ? "⏳ Đang Chấm..." : `🚀 Chấm ${gradeableCount} Bài`}</span>
        </button>
      </div>
    </div>
  );
};
