import React from 'react';
import { useExerciseManager } from '~/src/hooks/exercise-manager/useExerciseManager';

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
    handleChapterChange,
    handleSessionChange,
    handleAssignmentChange,
    handleScrapeFromLms,
    handleDeleteExercise,
    handleSaveDetail,
    handleConfirmScrapeSave,
    isLocalDeletable
  } = useExerciseManager();

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      {/* Action Row */}
      <div className="flex gap-2.5">
        <button
          onClick={handleScrapeFromLms}
          disabled={isScraping}
          className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-md text-xs font-bold shadow-md hover:from-purple-700 hover:to-purple-800 transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
        >
          {isScraping ? "⏳ Đang cào..." : "📥 Cào đề bài từ LMS"}
        </button>
        <button
          onClick={handleDeleteExercise}
          disabled={!isLocalDeletable()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold shadow-md transition-colors disabled:opacity-50"
        >
          ❌ Xóa đề
        </button>
      </div>

      {/* Selectors */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Chọn Chương:</label>
          <select
            value={selectedChapter}
            onChange={handleChapterChange}
            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          >
            <option value="">-- Chọn Chương --</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Chọn Session:</label>
            <select
              value={selectedSession}
              onChange={handleSessionChange}
              disabled={!selectedChapter}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm disabled:opacity-60"
            >
              <option value="">-- Chọn --</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Chọn Bài tập:</label>
            <select
              value={selectedAssignment}
              onChange={handleAssignmentChange}
              disabled={!selectedSession}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm disabled:opacity-60"
            >
              <option value="">-- Chọn --</option>
              {assignments.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Editor Content Area */}
      {showDetail ? (
        <div className="flex flex-col gap-3 animate-fade-in">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Đề bài (Prompt):</label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm min-h-[100px] resize-y"
              placeholder="Nội dung đề bài..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Tiêu chí chấm điểm (AI Rubric):</label>
            <textarea
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm min-h-[100px] resize-y"
              placeholder="Tiêu chí đánh giá bài tập..."
            />
          </div>

          <button
            onClick={handleSaveDetail}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md text-xs font-bold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-150 active:scale-[0.98]"
          >
            💾 Lưu Thay Đổi
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center py-12 border border-slate-200 border-dashed rounded-lg bg-slate-50 text-slate-400">
          <span className="text-2xl mb-1.5">📚</span>
          <span className="text-xs font-medium">Chọn đề bài để xem chi tiết hoặc chỉnh sửa.</span>
        </div>
      )}

      {/* Scraped Confirm Modal */}
      {isScrapeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-slate-200 flex flex-col overflow-hidden p-5 gap-3.5 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">📥 Thêm Đề Bài từ LMS</span>
              <button onClick={() => setIsScrapeModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Chương (Khóa học):</label>
                <input
                  type="text"
                  value={scrapeChapter}
                  onChange={(e) => setScrapeChapter(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Session:</label>
                <input
                  type="text"
                  value={scrapeSession}
                  onChange={(e) => setScrapeSession(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tên Bài tập:</label>
                <input
                  type="text"
                  value={scrapeAssignmentName}
                  onChange={(e) => setScrapeAssignmentName(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Đề bài:</label>
                <textarea
                  value={scrapeAssignmentText}
                  onChange={(e) => setScrapeAssignmentText(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none min-h-[60px]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">AI Rubric:</label>
                <textarea
                  value={scrapeCriteriaText}
                  onChange={(e) => setScrapeCriteriaText(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none min-h-[60px]"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmScrapeSave}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md text-xs font-bold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-150 active:scale-[0.98]"
            >
              ✅ Xác Nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
