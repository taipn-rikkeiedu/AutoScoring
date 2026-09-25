import React, { useState } from 'react';
import { useAutoGrader } from '~/src/hooks/auto-grader/useAutoGrader';
import { Submission } from '~/src/types';
import { DEFAULT_CRITERIA, extractComment } from '~/src/core/utils';
import { SearchableSelect } from '~/src/components/SearchableSelect';
import { RefreshIcon, CopyIcon, ChevronDownIcon, DocumentTextIcon, TableCellsIcon, EyeIcon, SparklesIcon } from '~/src/components/Icons';

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
    handleBulkGrading,
    handleCancelBulkGrading,
    handleCopySingleSubmission,
    handleCopyReport
  } = useAutoGrader();

  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [copiedScoreIndex, setCopiedScoreIndex] = useState<number | null>(null);

  const allChecked = submissions.length > 0 && submissions.every(s => s.checked);
  const checkedCount = submissions.filter(s => s.checked).length;
  const gradeableCount = submissions.filter(s => s.checked && s.matchedTemplate).length;

  const handleCopyScoreComment = (sub: Submission, index: number) => {
    let textToCopy = (sub.report || '').replace(/<score>[\s\S]*?<\/score>/gi, '').trim();
    if (sub.score && !textToCopy.toLowerCase().includes('tổng điểm')) {
      const comment = extractComment(sub.report || '') || textToCopy;
      textToCopy = `${comment}\n\nTổng điểm: ${sub.score}/100`;
    }

    if (!textToCopy) {
      (window as any).showToast?.("Không có nội dung nhận xét để sao chép.", "warning");
      return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedScoreIndex(index);
      setTimeout(() => setCopiedScoreIndex(null), 1500);
      (window as any).showToast?.(`Đã sao chép nhận xét & điểm (${sub.score || '--'}/100)!`, "success");
    }).catch(err => {
      (window as any).showToast?.("Không thể sao chép. Vui lòng kiểm tra quyền truy cập Clipboard của trình duyệt.", "error");
    });
  };

  const buildTemplateOptions = () => {
    const options: { value: string; label: string; group?: string }[] = [];
    for (const chapter in exerciseTemplates) {
      for (const session in exerciseTemplates[chapter]) {
        for (const name in exerciseTemplates[chapter][session]) {
          options.push({
            value: `${chapter}||${session}||${name}`,
            label: `${session} - ${name}`,
            group: chapter
          });
        }
      }
    }
    return options;
  };

  const getStatusBadge = (sub: Submission, index: number) => {
    const base = "tag inline-flex items-center justify-center cursor-default ";
    if (sub.status === 'downloading') {
      return <span className={base + "tag-blue"}>Đang tải code...</span>;
    }
    if (sub.status === 'grading') {
      return <span className={base + "tag-gold"}>Đang chấm điểm...</span>;
    }
    if (sub.status === 'success') {
      const isCopied = copiedScoreIndex === index;
      const scoreNum = parseFloat(sub.score || '0');
      const isHigh = scoreNum >= 80;
      return (
        <div className="inline-flex items-center gap-1 justify-center">
          <button 
            onClick={() => handleCopyScoreComment(sub, index)}
            className={`tag transition-all duration-150 active:scale-95 cursor-pointer ${
              isCopied
                ? "bg-[var(--accent-green)] text-white shadow-sm"
                : isHigh 
                  ? "tag-green hover:brightness-95" 
                  : "tag-gold hover:brightness-95"
            }`}
            title="Nhấp 1-click: Sao chép ngay nhận xét vào bộ nhớ tạm"
          >
            {isCopied ? "✓ Đã chép" : `${sub.score || '--'} / 100`}
          </button>
          <button
            onClick={() => (window as any).showReportModal?.({
              title: `Báo cáo: ${sub.studentName} - ${sub.exerciseName}`,
              score: sub.score,
              report: sub.report || "",
              language: sub.language,
              astMetrics: sub.astMetrics,
              imagesAttached: sub.imagesAttached,
              imagesSkipped: sub.imagesSkipped
            })}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
            title="Xem chi tiết toàn bộ báo cáo"
          >
            <EyeIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    if (sub.status === 'error') {
      return (
        <button 
          onClick={() => (window as any).showToast?.((sub as any).error || 'Lỗi chấm bài.', 'error')} 
          className={"tag tag-purple cursor-pointer hover:brightness-95"}
        >
          Lỗi
        </button>
      );
    }
    return <span className={"tag tag-gray"}>Chờ chấm</span>;
  };

  return (
    <div className="flex flex-col flex-1 p-3.5 gap-3 overflow-hidden">
      {/* Scan Status Banner */}
      <div className="premium-card !p-4 !items-center !justify-between">
        <div className="flex items-center gap-3">
          <div className="card-icon-box !w-10 !h-10 !text-[17.5px]">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[var(--text-heading)]">Trạng thái</span>
            <span className="text-xs text-[var(--text-muted)]">{scanStatus}</span>
          </div>
        </div>
        {submissions.length > 0 && (
          <span className="tag tag-blue">
            {checkedCount}/{submissions.length} ĐÃ CHỌN
          </span>
        )}
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 rank-matrix-wrapper">
        {isScanning && submissions.length === 0 ? (
          <table className="rank-matrix-table select-none table-fixed">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-center w-8">
                  <input type="checkbox" disabled className="rounded border-slate-300" />
                </th>
                <th>Bài tập trên trang</th>
                <th className="w-44">Đề bài liên kết</th>
                <th className="text-center w-24">Điểm số</th>
                <th className="text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="animate-pulse">
              {[1, 2, 3, 4].map((idx) => (
                <tr key={idx} className="bg-[var(--bg-card)]">
                  <td className="py-3 px-2 text-center">
                    <div className="h-3.5 w-3.5 bg-slate-200 rounded mx-auto"></div>
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
          <table className="rank-matrix-table table-fixed">
            <thead className="sticky top-0 z-10 select-none">
              <tr>
                <th className="text-center w-9">
                  <input 
                    type="checkbox" 
                    checked={allChecked} 
                    onChange={(e) => handleToggleSelectAll(e.target.checked)} 
                    className="rounded border-[var(--border-color)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)] cursor-pointer" 
                  />
                </th>
                <th>Bài tập trên trang</th>
                <th className="w-44">Đề bài liên kết</th>
                <th className="text-center w-24">Điểm số</th>
                <th className="text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="stagger-grid">
              {submissions.map((sub, index) => {
                const isExpanded = !!expandedRows[index];
                const matchedVal = sub.matchedTemplate 
                  ? `${sub.matchedTemplate.chapter}||${sub.matchedTemplate.session}||${sub.matchedTemplate.assignmentName}` 
                  : '';
                const template = sub.matchedTemplate 
                  ? exerciseTemplates?.[sub.matchedTemplate.chapter]?.[sub.matchedTemplate.session]?.[sub.matchedTemplate.assignmentName] 
                  : null;

                return (
                  <React.Fragment key={index}>
                    <tr className="animate-entrance">
                      <td className="py-2.5 px-2.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={!!sub.checked} 
                          onChange={(e) => handleRowCheckboxChange(index, e.target.checked)} 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-start justify-between gap-1 group/row">
                          <div onClick={() => toggleRowExpansion(index)} className="flex flex-col gap-0.5 cursor-pointer flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 group-hover/row:text-blue-600 transition-colors line-clamp-1">
                              {sub.exerciseName}
                            </span>
                            {sub.studentName && (
                              <span className="text-[11.5px] text-slate-500 font-medium">
                                {sub.studentName}
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]" title={sub.githubUrl}>
                              {sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopySingleSubmission(sub);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100 cursor-pointer shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Sao chép tên đề & link GitHub"
                          >
                            <CopyIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <SearchableSelect
                          options={buildTemplateOptions()}
                          value={matchedVal}
                          onChange={(val) => handleTemplateSelectionChange(index, val)}
                          hasWarning={!matchedVal}
                          className="w-full text-xs"
                          placeholder="-- Chọn đề bài --"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">{getStatusBadge(sub, index)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleGradeSingleRow(index)}
                          disabled={sub.status === 'grading' || sub.status === 'downloading'}
                          className={`py-1.5 px-2.5 text-xs font-semibold rounded border transition-colors active:scale-95 duration-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            sub.status === 'success' 
                              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                          }`}
                        >
                          {sub.status === 'success' ? 'Chấm lại' : sub.status === 'grading' || sub.status === 'downloading' ? 'Đang chấm...' : 'Chấm bài'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan={5} className="p-3.5">
                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">Đề bài:</span>
                                <pre className="text-[12.5px] text-slate-700 bg-white border border-slate-200 rounded p-2.5 h-24 overflow-y-auto whitespace-pre-wrap break-words font-sans w-full">
                                  {template ? template.assignment : 'Chưa liên kết đề bài.'}
                                </pre>
                              </div>
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">Tiêu chí chấm (Rubric):</span>
                                <pre className="text-[12.5px] text-slate-700 bg-white border border-slate-200 rounded p-2.5 h-24 overflow-y-auto whitespace-pre-wrap break-words font-sans w-full">
                                  {template ? (template.criteria || DEFAULT_CRITERIA) : 'Chưa liên kết đề bài.'}
                                </pre>
                              </div>
                            </div>
                            {sub.status === 'success' && (
                              <div className="flex flex-col gap-2 border-t border-slate-200 pt-2.5">
                                {sub.fileList && sub.fileList.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">Tệp mã nguồn ({sub.fileList.length}):</span>
                                    <ul className="text-[11.5px] font-mono max-h-16 overflow-y-auto bg-white border border-slate-200 rounded p-2 pl-4 list-disc text-slate-600">
                                      {sub.fileList.map((file, fIdx) => <li key={fIdx}>{file}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {sub.report && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">Nhận xét chi tiết:</span>
                                    <div className="text-[12.5px] text-slate-700 bg-white border border-slate-200 rounded p-2.5 max-h-24 overflow-y-auto whitespace-pre-line leading-relaxed">
                                      {extractComment(sub.report)}
                                    </div>
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
          <div className="flex flex-col justify-center items-center py-16 text-slate-400 select-none">
            <span className="text-sm font-semibold text-slate-600">Không tìm thấy bài tập nào</span>
            <span className="text-[12.5px] text-slate-400 text-center max-w-[280px] mt-1">
              Chuyển tới trang nộp bài tập học viên trên LMS hoặc bấm "Quét lại trang".
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar when Bulk Grading */}
      {isBulkGrading && (
        <div className="flex flex-col gap-1.5 p-2.5 border border-sky-200 rounded-lg bg-sky-50 select-none relative">
          <div className="flex justify-between items-center text-[11.5px] font-semibold text-sky-800 pr-12">
            <span>{bulkProgressText}</span>
            <span>{bulkProgress}%</span>
          </div>
          <div className="w-full bg-sky-200 rounded-full h-1.5 overflow-hidden">
            <div 
              style={{ width: `${bulkProgress}%` }} 
              className={`h-full rounded-full transition-all duration-300 ${bulkProgressText.includes("Lỗi") ? 'bg-rose-500' : bulkProgress === 100 ? 'bg-emerald-500' : 'bg-sky-500 animate-pulse'}`}
            />
          </div>
          <button
            onClick={handleCancelBulkGrading}
            className="absolute top-2 right-2.5 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11.5px] font-semibold transition-colors cursor-pointer"
            title="Dừng tiến trình đang chạy"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-between items-center select-none pt-0.5">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRescan} 
            disabled={isScanning || isBulkGrading} 
            className="py-1.5 px-3.5 bg-white hover:bg-sky-50 text-slate-700 border border-sky-200 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
          >
            <RefreshIcon className="w-3.5 h-3.5 text-sky-600" />
            <span>Quét lại trang</span>
          </button>

          {/* Copy Report Button & Dropdown Menu */}
          {submissions.length > 0 && (
            <div className="relative inline-flex shadow-2xs">
              <button
                onClick={() => handleCopyReport('detailed')}
                disabled={isScanning || isBulkGrading}
                className="py-1.5 px-3 bg-white hover:bg-sky-50 text-slate-700 border border-sky-200 rounded-l-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 border-r-0 focus:outline-none focus:ring-2 focus:ring-sky-500"
                title={checkedCount > 0 ? `Sao chép báo cáo ${checkedCount} bài đã chọn` : "Sao chép báo cáo toàn bộ bài nộp"}
              >
                <CopyIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>{checkedCount > 0 ? `Sao chép (${checkedCount})` : 'Sao chép báo cáo'}</span>
              </button>
              <button
                onClick={() => setIsCopyMenuOpen(!isCopyMenuOpen)}
                disabled={isScanning || isBulkGrading}
                className="py-1.5 px-1.5 bg-white hover:bg-sky-50 text-slate-600 border border-sky-200 rounded-r-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                title="Tùy chọn định dạng sao chép"
              >
                <ChevronDownIcon className="w-3 h-3 text-sky-600" />
              </button>

              {/* Dropdown Menu */}
              {isCopyMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsCopyMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-1.5 w-64 bg-white border border-sky-200 rounded-lg shadow-xl py-1 z-50 animate-fade-in text-xs">
                    <div className="px-3 py-1.5 border-b border-sky-100 text-[11.5px] font-bold uppercase tracking-wider text-sky-700">
                      Định dạng báo cáo ({checkedCount > 0 ? `${checkedCount} bài đã chọn` : `Tất cả ${submissions.length} bài`})
                    </div>
                    <button
                      onClick={() => {
                        handleCopyReport('detailed');
                        setIsCopyMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-sky-50 text-slate-700 hover:text-sky-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <DocumentTextIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <div>
                        <div className="font-semibold">📋 Danh sách Báo cáo chi tiết</div>
                        <div className="text-[11.5px] text-slate-400">Kèm link GitHub, tên đề & điểm số</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleCopyReport('simple');
                        setIsCopyMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-sky-50 text-slate-700 hover:text-sky-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <CopyIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <div>
                        <div className="font-semibold">🔗 Link & Tên đề ngắn gọn</div>
                        <div className="text-[11.5px] text-slate-400">Dạng gạch đầu dòng tiện gửi chat</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleCopyReport('tsv');
                        setIsCopyMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-sky-50 text-slate-700 hover:text-sky-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <TableCellsIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div>
                        <div className="font-semibold">📊 Bảng Excel / Google Sheets</div>
                        <div className="text-[11.5px] text-slate-400">Dán trực tiếp dạng cột (TSV)</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleCopyReport('markdown');
                        setIsCopyMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-sky-50 text-slate-700 hover:text-sky-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <DocumentTextIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <div>
                        <div className="font-semibold">📝 Bảng Markdown Table (.md)</div>
                        <div className="text-[11.5px] text-slate-400">Dán vào Notion, Obsidian, GitHub</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleBulkGrading}
          disabled={isBulkGrading || gradeableCount === 0 || aiStatus !== "success"}
          className="py-1.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer active:scale-95"
        >
          {isBulkGrading ? "Đang chấm..." : `Chấm ${gradeableCount} bài đã chọn`}
        </button>
      </div>
    </div>
  );
};

