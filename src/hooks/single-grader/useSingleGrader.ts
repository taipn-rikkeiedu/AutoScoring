import { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { DEFAULT_CRITERIA, matchStudent, parseScore } from '~/src/core/utils';
import { STORAGE_KEYS, UI_MESSAGES } from '~/src/core/constants';
import { GitHubService } from '~/src/services/githubService';
import { AIService } from '~/src/services/aiService';
import { SupabaseService } from '~/src/services/supabaseService';
import { getClassStudents, saveClassStudents } from '~/src/core/classStudentStorage';
import { logger } from '~/src/core/logger';

export function useSingleGrader() {
  const { config, exerciseTemplates, classStudents, activeClassId, activeStudentTransition, aiStatus } = useApp();
  const { showToast } = useToast();

  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [detectedSubIndex, setDetectedSubIndex] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState<{ score: string; report: string; fileList?: string[] } | null>(null);
  const [isFileTreeExpanded, setIsFileTreeExpanded] = useState(false);
  const [detectedSubmissions, setDetectedSubmissions] = useState<any[]>([]);

  const chapters = Object.keys(exerciseTemplates).sort();
  const sessions = selectedChapter && exerciseTemplates[selectedChapter] ? Object.keys(exerciseTemplates[selectedChapter]).sort() : [];
  const assignments = selectedChapter && selectedSession && exerciseTemplates[selectedChapter][selectedSession] ? Object.keys(exerciseTemplates[selectedChapter][selectedSession]).sort() : [];

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.detectedSubmissions, (res) => {
      setDetectedSubmissions((res[STORAGE_KEYS.detectedSubmissions] as any[]) || []);
    });
  }, []);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const activeTab = tabs[0];
      const url = activeTab.url || "";
      const isWebPage = url.startsWith("http");
      const normalizedTabUrl = url.split('?')[0].split('#')[0];

      const doMatching = (scrapedInfo: any = null) => {
        const matched = matchStudent(classStudents, normalizedTabUrl, scrapedInfo?.studentId, scrapedInfo?.studentName, activeStudentTransition);
        setActiveStudent(matched || null);

        chrome.tabs.sendMessage(activeTab.id!, { action: 'getGradingCache' }, (response) => {
          if (chrome.runtime.lastError || !response?.singleGrader) return;
          const cache = response.singleGrader;
          if (cache.repoUrl) setRepoUrl(cache.repoUrl);
          if (cache.chapter) {
            setSelectedChapter(cache.chapter);
            if (cache.session) {
              setSelectedSession(cache.session);
              if (cache.assignmentName) setSelectedAssignment(cache.assignmentName);
            }
          }
          if (cache.score && cache.report) {
            setResults({ score: cache.score, report: cache.report, fileList: cache.fileList });
          }
        });
      };

      if (isWebPage) {
        chrome.scripting.executeScript({ target: { tabId: activeTab.id! }, files: ['/studentScraper.js'] }, (results) => {
          doMatching(chrome.runtime.lastError || !results || !results[0] ? null : results[0].result);
        });
      } else {
        doMatching(null);
      }
    });
  }, [classStudents, activeStudentTransition]);

  useEffect(() => {
    const cacheData = { repoUrl, chapter: selectedChapter, session: selectedSession, assignmentName: selectedAssignment, score: results?.score || null, report: results?.report || null, fileList: results?.fileList || null };
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateGradingCache', singleGrader: cacheData }, () => {
          if (chrome.runtime.lastError) { /* ignore */ }
        });
      }
    });
  }, [repoUrl, selectedChapter, selectedSession, selectedAssignment, results]);

  const handleDetectedSubmissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDetectedSubIndex(val);
    if (!val) {
      setRepoUrl(""); setSelectedChapter(""); setSelectedSession(""); setSelectedAssignment("");
      return;
    }
    const sub = detectedSubmissions[parseInt(val, 10)];
    if (sub) {
      setRepoUrl(sub.githubUrl);
      if (sub.matchedTemplate) {
        setSelectedChapter(sub.matchedTemplate.chapter);
        setSelectedSession(sub.matchedTemplate.session);
        setSelectedAssignment(sub.matchedTemplate.assignmentName);
      }
    }
  };

  const saveResolvedStudentResult = async (score: string, report: string) => {
    if (!activeStudent) return;
    const classIdMatch = (activeStudent.submissionUrl || "").match(/\/homework-checking\/(\d+)/);
    const classId = activeClassId || (classIdMatch ? classIdMatch[1] : null);
    const studentList: any[] = await getClassStudents(classId);
    const student = studentList.find(st => st.studentId === activeStudent.studentId);
    if (!student) return;

    if (!student.submissions) student.submissions = {};
    student.submissions[`${selectedChapter}_${selectedSession}_${selectedAssignment}`] = { score, report, githubUrl: repoUrl, gradedAt: new Date().toISOString() };
    await saveClassStudents(classId, studentList);
    showToast(`Đã lưu kết quả của ${student.studentName}!`, "success");
    logger.info("SINGLE_GRADER", `Đã lưu kết quả bài tập của học viên ${student.studentName} (${student.studentId}) cục bộ.`);

    if (SupabaseService.isEnabled(config) && classId) {
      try {
        logger.info("SINGLE_GRADER", `Đang đồng bộ điểm học viên ${student.studentName} lên Supabase Cloud...`);
        await SupabaseService.upsertSubmission(config, classId, student.studentId, student.studentName, selectedChapter, selectedSession, selectedAssignment, repoUrl, score, report);
        logger.success("SINGLE_GRADER", `Đồng bộ điểm học viên ${student.studentName} lên Supabase Cloud thành công.`);
      } catch (syncErr: any) {
        showToast("Đồng bộ lên Cloud thất bại: " + syncErr.message, "warning");
        logger.error("SINGLE_GRADER", `Đồng bộ điểm học viên ${student.studentName} lên Supabase thất bại.`, syncErr.message);
      }
    }
  };

  const handleGradeSingle = async () => {
    if (!repoUrl.trim()) return showToast("Vui lòng nhập GitHub Repository URL.", "warning");
    if (!selectedChapter || !selectedSession || !selectedAssignment) return showToast("Vui lòng chọn đầy đủ thông tin.", "warning");

    setIsGrading(true);
    setResults(null);
    setStatusMessage("Đang chuẩn bị kiểm tra...");
    logger.info("SINGLE_GRADER", `Bắt đầu chấm bài đơn cho Repo: ${repoUrl}. Bài tập: ${selectedChapter} - ${selectedSession} - ${selectedAssignment}`);

    try {
      const template = exerciseTemplates?.[selectedChapter]?.[selectedSession]?.[selectedAssignment];
      if (!template?.assignment) throw new Error("Mẫu bài tập thiếu nội dung.");

      const github = new GitHubService(config.githubToken, config.graderIgnoreItems);
      const repoData = await github.getRepoContents(repoUrl, setStatusMessage);
      logger.success("SINGLE_GRADER", `Tải mã nguồn thành công. Số lượng tệp: ${repoData.fileList.length}`);

      setStatusMessage("AI đang thực hiện chấm điểm...");
      const ai = new AIService(config);
      const report = await ai.generateGradingReport(template.assignment, template.criteria || DEFAULT_CRITERIA, repoData.content, setStatusMessage);

      const score = parseScore(report);
      if (!score) throw new Error(UI_MESSAGES.common.invalidScoreResponse);

      setResults({ score, report, fileList: repoData.fileList });
      logger.success("SINGLE_GRADER", `Chấm điểm thành công bằng AI. Điểm số: ${score}/100.`);
      if (activeStudent) await saveResolvedStudentResult(score, report);
    } catch (err: any) {
      showToast(`Lỗi: ${err.message}`, "error");
      logger.error("SINGLE_GRADER", `Quá trình chấm bài đơn thất bại: ${err.message}`, err);
    } finally {
      setIsGrading(false);
    }
  };

  const handleCopyReport = () => {
    if (!results?.report) return;
    navigator.clipboard.writeText(results.report).then(() => {
      showToast("Đã sao chép báo cáo Markdown vào clipboard!", "success");
    }).catch(() => {
      showToast("Lỗi sao chép vào clipboard.", "error");
    });
  };

  return {
    activeStudent,
    repoUrl,
    setRepoUrl,
    selectedChapter,
    setSelectedChapter,
    selectedSession,
    setSelectedSession,
    selectedAssignment,
    setSelectedAssignment,
    detectedSubIndex,
    isGrading,
    statusMessage,
    results,
    isFileTreeExpanded,
    setIsFileTreeExpanded,
    detectedSubmissions,
    chapters,
    sessions,
    assignments,
    aiStatus,
    handleDetectedSubmissionChange,
    handleGradeSingle,
    handleCopyReport
  };
}
