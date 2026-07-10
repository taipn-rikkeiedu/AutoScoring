import React, { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { SupabaseService } from '~/src/services/supabaseService';
import { mergeScrapedFrameResults, DEFAULT_CRITERIA } from '~/src/core/utils';

export const ExercisesTab: React.FC = () => {
  const { config, updateConfig, exerciseTemplates, reloadExercises } = useApp();
  const { showToast } = useToast();

  // Selected paths
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");

  // Edit fields
  const [promptText, setPromptText] = useState("");
  const [criteriaText, setCriteriaText] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  // Scraped Modal state
  const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
  const [scrapeChapter, setScrapeChapter] = useState("");
  const [scrapeSession, setScrapeSession] = useState("");
  const [scrapeAssignmentName, setScrapeAssignmentName] = useState("");
  const [scrapeAssignmentText, setScrapeAssignmentText] = useState("");
  const [scrapeCriteriaText, setScrapeCriteriaText] = useState("");

  const [isScraping, setIsScraping] = useState(false);

  // Chapters list
  const chapters = Object.keys(exerciseTemplates).sort();

  // Sessions list based on selected chapter
  const sessions = selectedChapter && exerciseTemplates[selectedChapter]
    ? Object.keys(exerciseTemplates[selectedChapter]).sort()
    : [];

  // Assignments list based on selected session
  const assignments = selectedChapter && selectedSession && exerciseTemplates[selectedChapter][selectedSession]
    ? Object.keys(exerciseTemplates[selectedChapter][selectedSession]).sort()
    : [];

  // Load details when assignment is selected
  useEffect(() => {
    if (selectedChapter && selectedSession && selectedAssignment && exerciseTemplates[selectedChapter]?.[selectedSession]?.[selectedAssignment]) {
      const ex = exerciseTemplates[selectedChapter][selectedSession][selectedAssignment];
      setPromptText(ex.assignment || "");
      setCriteriaText(ex.criteria || "");
      setShowDetail(true);
    } else {
      setPromptText("");
      setCriteriaText("");
      setShowDetail(false);
    }
  }, [selectedChapter, selectedSession, selectedAssignment, exerciseTemplates]);

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChapter(e.target.value);
    setSelectedSession("");
    setSelectedAssignment("");
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSession(e.target.value);
    setSelectedAssignment("");
  };

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAssignment(e.target.value);
  };

  // Scrape exercises from the LMS page
  const handleScrapeFromLms = () => {
    setIsScraping(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        showToast("Không tìm thấy tab trình duyệt đang hoạt động.", "error");
        setIsScraping(false);
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url || "";
      const isWebPage = url.startsWith("http://") || url.startsWith("https://");

      if (!isWebPage) {
        showToast("Vui lòng mở trang web LMS học viên để cào đề bài.", "warning");
        setIsScraping(false);
        return;
      }

      // Execute WXT-compiled lmsScraper.js to fetch details from page
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id!, allFrames: true },
        files: ['/lmsScraper.js']
      }, (results) => {
        setIsScraping(false);
        if (chrome.runtime.lastError) {
          showToast(`Lỗi cào dữ liệu: ${chrome.runtime.lastError.message}`, "error");
          return;
        }

        const merged = mergeScrapedFrameResults(results);
        if (merged && merged.success) {
          setScrapeChapter(merged.chapter || "Khóa học mặc định");
          setScrapeSession(merged.session || "Session 01: Nhập môn");
          setScrapeAssignmentName(merged.assignmentName || "Bài tập mới");
          setScrapeAssignmentText(merged.assignment || "");
          setScrapeCriteriaText(DEFAULT_CRITERIA);
          setIsScrapeModalOpen(true);
          showToast("Cào dữ liệu đề bài thành công!", "success");
        } else {
          showToast("Không thể tìm thấy nội dung đề bài phù hợp trên trang.", "warning");
        }
      });
    });
  };

  // Delete local exercise templates
  const handleDeleteExercise = async () => {
    if (!selectedChapter || !selectedSession || !selectedAssignment) return;
    if (!window.confirm(`Bạn có chắc muốn xóa đề bài '${selectedAssignment}' khỏi cơ sở dữ liệu local?`)) return;

    const localEdits = config.uploadedExercises || {};
    if (localEdits[selectedChapter]?.[selectedSession]?.[selectedAssignment]) {
      delete localEdits[selectedChapter][selectedSession][selectedAssignment];
      
      // Clean up empty objects
      if (Object.keys(localEdits[selectedChapter][selectedSession]).length === 0) {
        delete localEdits[selectedChapter][selectedSession];
      }
      if (Object.keys(localEdits[selectedChapter]).length === 0) {
        delete localEdits[selectedChapter];
      }

      await updateConfig({ uploadedExercises: localEdits });
      showToast("Đã xóa đề bài thành công!", "success");
      
      // Reset selections
      setSelectedAssignment("");
      await reloadExercises();
    } else {
      showToast("Đề bài này thuộc hệ thống mặc định, không thể xóa.", "warning");
    }
  };

  // Save changes to current exercise
  const handleSaveDetail = async () => {
    if (!selectedChapter || !selectedSession || !selectedAssignment) return;

    const localEdits = config.uploadedExercises || {};
    if (!localEdits[selectedChapter]) localEdits[selectedChapter] = {};
    if (!localEdits[selectedChapter][selectedSession]) localEdits[selectedChapter][selectedSession] = {};
    
    localEdits[selectedChapter][selectedSession][selectedAssignment] = {
      assignment: promptText,
      criteria: criteriaText
    };

    await updateConfig({ uploadedExercises: localEdits });

    if (SupabaseService.isEnabled(config)) {
      try {
        await SupabaseService.upsertExercise(
          config,
          selectedChapter,
          selectedSession,
          selectedAssignment,
          promptText,
          criteriaText
        );
      } catch (err: any) {
        console.warn("Lỗi đồng bộ lên Supabase:", err);
        showToast("Đồng bộ lên Cloud thất bại: " + err.message, "warning");
      }
    }

    showToast("Đã lưu thay đổi đề bài thành công!", "success");
    await reloadExercises();
  };

  // Save scraped exercise to bank
  const handleConfirmScrapeSave = async () => {
    if (!scrapeChapter.trim() || !scrapeSession.trim() || !scrapeAssignmentName.trim()) {
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc.", "warning");
      return;
    }

    const localEdits = config.uploadedExercises || {};
    const chap = scrapeChapter.trim();
    const sess = scrapeSession.trim();
    const name = scrapeAssignmentName.trim();

    if (!localEdits[chap]) localEdits[chap] = {};
    if (!localEdits[chap][sess]) localEdits[chap][sess] = {};
    localEdits[chap][sess][name] = {
      assignment: scrapeAssignmentText,
      criteria: scrapeCriteriaText
    };

    await updateConfig({ uploadedExercises: localEdits });

    if (SupabaseService.isEnabled(config)) {
      try {
        await SupabaseService.upsertExercise(
          config,
          chap,
          sess,
          name,
          scrapeAssignmentText,
          scrapeCriteriaText
        );
      } catch (err: any) {
        console.warn("Lỗi đồng bộ Supabase:", err);
        showToast("Đồng bộ lên Cloud thất bại: " + err.message, "warning");
      }
    }

    showToast("Đã thêm đề bài vào Ngân hàng!", "success");
    setIsScrapeModalOpen(false);
    
    // Auto-select the newly added exercise
    setSelectedChapter(chap);
    setSelectedSession(sess);
    setSelectedAssignment(name);
    await reloadExercises();
  };

  const isLocalDeletable = () => {
    if (!selectedChapter || !selectedSession || !selectedAssignment) return false;
    const localEdits = config.uploadedExercises || {};
    return !!localEdits[selectedChapter]?.[selectedSession]?.[selectedAssignment];
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      {/* Top action row */}
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

      {/* Selector dropdowns */}
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
          <span className="text-xs font-medium">Chọn đề bài từ danh sách để xem chi tiết hoặc chỉnh sửa.</span>
        </div>
      )}

      {/* Scraped Confirm Modal */}
      {isScrapeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-xl border border-slate-200 flex flex-col overflow-hidden p-5 gap-3.5 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">📥 Thêm Đề Bài từ LMS</span>
              <button
                onClick={() => setIsScrapeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chương (Tên khóa học):</label>
                <input
                  type="text"
                  value={scrapeChapter}
                  onChange={(e) => setScrapeChapter(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Session (Phiên học):</label>
                <input
                  type="text"
                  value={scrapeSession}
                  onChange={(e) => setScrapeSession(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tên Bài tập:</label>
                <input
                  type="text"
                  value={scrapeAssignmentName}
                  onChange={(e) => setScrapeAssignmentName(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nội dung Đề bài:</label>
                <textarea
                  value={scrapeAssignmentText}
                  onChange={(e) => setScrapeAssignmentText(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm min-h-[70px] resize-y"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiêu chí chấm điểm (AI Rubric):</label>
                <textarea
                  value={scrapeCriteriaText}
                  onChange={(e) => setScrapeCriteriaText(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm min-h-[70px] resize-y"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmScrapeSave}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md text-xs font-bold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-150 active:scale-[0.98]"
            >
              ✅ Xác Nhận Thêm Vào Ngân Hàng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
