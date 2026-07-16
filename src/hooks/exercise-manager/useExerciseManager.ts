import { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { SupabaseService } from '~/src/services/supabaseService';
import { mergeScrapedFrameResults, DEFAULT_CRITERIA, extractCriteriaFromAssignment } from '~/src/core/utils';

export function useExerciseManager() {
  const { config, updateConfig, exerciseTemplates, reloadExercises } = useApp();
  const { showToast } = useToast();

  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [promptText, setPromptText] = useState("");
  const [criteriaText, setCriteriaText] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
  const [scrapeChapter, setScrapeChapter] = useState("");
  const [scrapeSession, setScrapeSession] = useState("");
  const [scrapeAssignmentName, setScrapeAssignmentName] = useState("");
  const [scrapeAssignmentText, setScrapeAssignmentText] = useState("");
  const [scrapeCriteriaText, setScrapeCriteriaText] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  const chapters = Object.keys(exerciseTemplates).sort();
  const sessions = selectedChapter && exerciseTemplates[selectedChapter] ? Object.keys(exerciseTemplates[selectedChapter]).sort() : [];
  const assignments = selectedChapter && selectedSession && exerciseTemplates[selectedChapter][selectedSession] ? Object.keys(exerciseTemplates[selectedChapter][selectedSession]).sort() : [];

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

  const handleScrapeFromLms = () => {
    setIsScraping(true);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        showToast("Không tìm thấy tab trình duyệt hoạt động.", "error");
        setIsScraping(false);
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab.url?.startsWith("http")) {
        showToast("Vui lòng mở trang web LMS học viên để cào.", "warning");
        setIsScraping(false);
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id!, allFrames: true },
        files: ['/lmsScraper.js']
      }, (results) => {
        setIsScraping(false);
        if (chrome.runtime.lastError) {
          showToast(`Lỗi cào: ${chrome.runtime.lastError.message}`, "error");
          return;
        }

        const merged = mergeScrapedFrameResults(results);
        if (merged?.success) {
          const { assignment, criteria } = extractCriteriaFromAssignment(merged.assignment || "");
          setScrapeChapter(merged.chapter || "Khóa học mặc định");
          setScrapeSession(merged.session || "Session 01: Nhập môn");
          setScrapeAssignmentName(merged.assignmentName || "Bài tập mới");
          setScrapeAssignmentText(assignment);
          setScrapeCriteriaText(criteria || DEFAULT_CRITERIA);
          setIsScrapeModalOpen(true);
          showToast("Cào dữ liệu đề bài thành công!", "success");
        } else {
          showToast("Không thể tìm thấy đề bài trên trang.", "warning");
        }
      });
    });
  };

  const handleDeleteExercise = async () => {
    if (!selectedChapter || !selectedSession || !selectedAssignment) return;
    if (!window.confirm(`Bạn có chắc muốn xóa đề bài '${selectedAssignment}'?`)) return;

    const localEdits = config.uploadedExercises || {};
    if (localEdits[selectedChapter]?.[selectedSession]?.[selectedAssignment]) {
      delete localEdits[selectedChapter][selectedSession][selectedAssignment];
      if (Object.keys(localEdits[selectedChapter][selectedSession]).length === 0) delete localEdits[selectedChapter][selectedSession];
      if (Object.keys(localEdits[selectedChapter]).length === 0) delete localEdits[selectedChapter];

      await updateConfig({ uploadedExercises: localEdits });
      showToast("Đã xóa đề bài thành công!", "success");
      setSelectedAssignment("");
      await reloadExercises();
    } else {
      showToast("Đề bài mặc định, không thể xóa.", "warning");
    }
  };

  const handleSaveDetail = async () => {
    if (!selectedChapter || !selectedSession || !selectedAssignment) return;

    const localEdits = config.uploadedExercises || {};
    if (!localEdits[selectedChapter]) localEdits[selectedChapter] = {};
    if (!localEdits[selectedChapter][selectedSession]) localEdits[selectedChapter][selectedSession] = {};
    
    localEdits[selectedChapter][selectedSession][selectedAssignment] = { assignment: promptText, criteria: criteriaText };
    await updateConfig({ uploadedExercises: localEdits });

    if (SupabaseService.isEnabled(config)) {
      try {
        await SupabaseService.upsertExercise(config, selectedChapter, selectedSession, selectedAssignment, promptText, criteriaText);
      } catch (err: any) {
        showToast("Đồng bộ lên Cloud thất bại: " + err.message, "warning");
      }
    }
    showToast("Đã lưu thay đổi đề bài!", "success");
    await reloadExercises();
  };

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
    localEdits[chap][sess][name] = { assignment: scrapeAssignmentText, criteria: scrapeCriteriaText };

    await updateConfig({ uploadedExercises: localEdits });

    if (SupabaseService.isEnabled(config)) {
      try {
        await SupabaseService.upsertExercise(config, chap, sess, name, scrapeAssignmentText, scrapeCriteriaText);
      } catch (err: any) {
        showToast("Đồng bộ lên Cloud thất bại: " + err.message, "warning");
      }
    }

    showToast("Đã thêm đề bài vào Ngân hàng!", "success");
    setIsScrapeModalOpen(false);
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

  return {
    selectedChapter,
    setSelectedChapter,
    selectedSession,
    setSelectedSession,
    selectedAssignment,
    setSelectedAssignment,
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
  };
}
