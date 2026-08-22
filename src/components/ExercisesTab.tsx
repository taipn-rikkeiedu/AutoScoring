import React from 'react';
import { useExerciseManager } from '~/src/hooks/exercise-manager/useExerciseManager';
import { TrashIcon, DownloadIcon, CopyIcon, DocumentTextIcon } from '~/src/components/Icons';
import { MarkdownExportModal } from '~/src/components/MarkdownExportModal';

export const ExercisesTab: React.FC = () => {
  const {
    selectedChapter,
    selectedSession,
    selectedAssignment,
    promptText,
    setPromptText,
    criteriaText,
    setCriteriaText,
    showDetail,
    isExportModalOpen,
    setIsExportModalOpen,
    isScrapeModalOpen,
    setIsScrapeModalOpen,
    scrapeChapter,
    setScrapeChapter,
    scrapeSession,
    setScrapeSession,
    scrapeAssignmentName,
    setScrapeAssignmentName,
    scrapeAssignmentText,
    setScrapeAssignmentText,
    scrapeCriteriaText,
    setScrapeCriteriaText,
    isScraping,
    chapters,
    sessions,
    assignments,
    exerciseTemplates,
    handleChapterChange,
    handleSessionChange,
    handleAssignmentChange,
    handleScrapeFromLms,
    handleDeleteExercise,
    handleSaveDetail,
    handleConfirmScrapeSave,
    isLocalDeletable,
    handleExportCurrentMd,
    handleCopyCurrentMd,
    showToast
  } = useExerciseManager();

  return (
    <div className="flex flex-col flex-1 p-3.5 gap-3 overflow-y-auto">
      {/* Action Row */}
      <div className="flex gap-2">
        <button
          onClick={handleScrapeFromLms}
          disabled={isScraping}
          className="flex-1 py-1.5 px-3 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
        >
          {isScraping ? "Đang lấy dữ liệu..." : "Lấy đề bài từ LMS"}
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
          title="Mở bảng điều khiển xuất Markdown / Zip"
        >
          <DocumentTextIcon className="w-3.5 h-3.5 text-sky-700" />
          <span>Xuất MD</span>
        </button>

        <button
          onClick={handleDeleteExercise}
          disabled={!isLocalDeletable()}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-rose-600 border border-slate-200 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1 shadow-xs"
        >
          <TrashIcon className="w-3.5 h-3.5 text-rose-500" />
          <span>Xóa đề</span>
        </button>
      </div>

      {/* Selectors Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Chương trình / Khóa học:</label>
          <select
            value={selectedChapter}
            onChange={handleChapterChange}
            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">-- Chọn chương trình --</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Session:</label>
            <select
              value={selectedSession}
              onChange={handleSessionChange}
              disabled={!selectedChapter}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            >
              <option value="">-- Chọn session --</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Bài tập:</label>
            <select
              value={selectedAssignment}
              onChange={handleAssignmentChange}
              disabled={!selectedSession}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            >
              <option value="">-- Chọn bài tập --</option>
              {assignments.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Editor Content Area */}
      {showDetail ? (
        <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">Đề bài (Mô tả):</label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[90px] resize-y font-sans leading-relaxed"
              placeholder="Nội dung yêu cầu đề bài..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">Tiêu chí chấm điểm (Rubric):</label>
            <textarea
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[90px] resize-y font-sans leading-relaxed"
              placeholder="Tiêu chí đánh giá phân bổ điểm số..."
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleSaveDetail}
              className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-md text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Lưu thay đổi
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportCurrentMd}
                className="py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                title="Tải ngay tệp .md của bài tập này về máy tính"
              >
                <DownloadIcon className="w-3.5 h-3.5 text-sky-700" />
                <span>Xuất file .md</span>
              </button>

              <button
                onClick={handleCopyCurrentMd}
                className="py-1.5 px-2 bg-white hover:bg-sky-50 text-slate-700 border border-sky-200 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                title="Sao chép Markdown vào bộ nhớ tạm để dán vào Notion / Obsidian"
              >
                <CopyIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Sao chép MD</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center py-12 border border-slate-200 border-dashed rounded-lg bg-white text-slate-400 select-none">
          <span className="text-xs font-semibold text-slate-600">Chọn đề bài để xem chi tiết hoặc chỉnh sửa</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Sử dụng bộ chọn phía trên hoặc bấm lấy đề bài từ LMS</span>
        </div>
      )}

      {/* Export Markdown Modal */}
      {isExportModalOpen && (
        <MarkdownExportModal
          selectedChapter={selectedChapter}
          selectedSession={selectedSession}
          selectedAssignment={selectedAssignment}
          promptText={promptText}
          criteriaText={criteriaText}
          exerciseTemplates={exerciseTemplates}
          onClose={() => setIsExportModalOpen(false)}
          onToast={showToast}
        />
      )}

      {/* Scraped Confirm Modal */}
      {isScrapeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-slate-200 flex flex-col overflow-hidden p-4 gap-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800">
                Thêm đề bài từ LMS
              </span>
              <button 
                onClick={() => setIsScrapeModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Chương (Khóa học):</label>
                <input
                  type="text"
                  value={scrapeChapter}
                  onChange={(e) => setScrapeChapter(e.target.value)}
                  className="w-full text-xs text-slate-700 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Session:</label>
                <input
                  type="text"
                  value={scrapeSession}
                  onChange={(e) => setScrapeSession(e.target.value)}
                  className="w-full text-xs text-slate-700 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Tên bài tập:</label>
                <input
                  type="text"
                  value={scrapeAssignmentName}
                  onChange={(e) => setScrapeAssignmentName(e.target.value)}
                  className="w-full text-xs text-slate-700 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Đề bài:</label>
                <textarea
                  value={scrapeAssignmentText}
                  onChange={(e) => setScrapeAssignmentText(e.target.value)}
                  className="w-full text-xs text-slate-700 border border-slate-200 rounded-md p-2 focus:outline-none min-h-[60px]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Rubric chấm:</label>
                <textarea
                  value={scrapeCriteriaText}
                  onChange={(e) => setScrapeCriteriaText(e.target.value)}
                  className="w-full text-xs text-slate-700 border border-slate-200 rounded-md p-2 focus:outline-none min-h-[60px]"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmScrapeSave}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              Xác nhận lưu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
