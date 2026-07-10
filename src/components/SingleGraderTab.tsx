import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { matchStudent, parseScore } from '~/src/core/utils';
import { GitHubService } from '~/src/services/githubService';
import { AIService } from '~/src/services/aiService';
import { SupabaseService } from '~/src/services/supabaseService';

export const SingleGraderTab: React.FC = () => {
  const { config, exerciseTemplates, classStudents, activeClassId, activeStudentTransition, aiStatus } = useApp();
  const { showToast } = useToast();

  // Active student resolved from URL
  const [activeStudent, setActiveStudent] = useState<any>(null);

  // Form states
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [detectedSubIndex, setDetectedSubIndex] = useState("");

  // UI state
  const [isGrading, setIsGrading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState<{ score: string; report: string; fileList?: string[] } | null>(null);
  const [isFileTreeExpanded, setIsFileTreeExpanded] = useState(false);

  // Chapters list
  const chapters = Object.keys(exerciseTemplates).sort();

  // Sessions based on chapter
  const sessions = selectedChapter && exerciseTemplates[selectedChapter]
    ? Object.keys(exerciseTemplates[selectedChapter]).sort()
    : [];

  // Assignments based on session
  const assignments = selectedChapter && selectedSession && exerciseTemplates[selectedChapter][selectedSession]
    ? Object.keys(exerciseTemplates[selectedChapter][selectedSession]).sort()
    : [];

  // Detected submissions from the parent scan (Auto Grader Tab scans and populates)
  const [detectedSubmissions, setDetectedSubmissions] = useState<any[]>([]);

  useEffect(() => {
    chrome.storage.local.get("detectedSubmissions", (res) => {
      setDetectedSubmissions((res.detectedSubmissions as any[]) || []);
    });
  }, []);

  // 1. Resolve student from URL and restore cache on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const activeTab = tabs[0];
      const url = activeTab.url || "";
      const isWebPage = url.startsWith("http://") || url.startsWith("https://");
      
      const normalizedTabUrl = url.split('?')[0].split('#')[0];

      const doMatching = (scrapedInfo: any = null) => {
        const pageId = scrapedInfo?.studentId;
        const pageName = scrapedInfo?.studentName;

        const matched = matchStudent(classStudents, normalizedTabUrl, pageId, pageName, activeStudentTransition);
        if (matched) {
          setActiveStudent(matched);
        } else {
          setActiveStudent(null);
        }

        // Restore content script cache
        chrome.tabs.sendMessage(activeTab.id!, { action: 'getGradingCache' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("REduX: No cache received from content script.");
            return;
          }
          if (response && response.singleGrader) {
            const cache = response.singleGrader;
            if (cache.repoUrl) setRepoUrl(cache.repoUrl);
            if (cache.chapter) {
              setSelectedChapter(cache.chapter);
              if (cache.session) {
                setSelectedSession(cache.session);
                if (cache.assignmentName) {
                  setSelectedAssignment(cache.assignmentName);
                }
              }
            }
            if (cache.score && cache.report) {
              setResults({
                score: cache.score,
                report: cache.report,
                fileList: cache.fileList
              });
            }
          }
        });
      };

      if (isWebPage) {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id! },
          files: ['/studentScraper.js']
        }, (results) => {
          if (chrome.runtime.lastError || !results || !results[0]) {
            doMatching(null);
          } else {
            doMatching(results[0].result);
          }
        });
      } else {
        doMatching(null);
      }
    });
  }, [classStudents, activeStudentTransition]);

  // Update content script cache when inputs change
  useEffect(() => {
    const cacheData = {
      repoUrl,
      chapter: selectedChapter,
      session: selectedSession,
      assignmentName: selectedAssignment,
      score: results?.score || null,
      report: results?.report || null,
      fileList: results?.fileList || null
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action: 'updateGradingCache', singleGrader: cacheData },
          () => {
            if (chrome.runtime.lastError) {
              // Ignore cache error if content script not loaded
            }
          }
        );
      }
    });
  }, [repoUrl, selectedChapter, selectedSession, selectedAssignment, results]);

  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChapter(e.target.value);
    setSelectedSession("");
    setSelectedAssignment("");
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSession(e.target.value);
    setSelectedAssignment("");
  };

  const handleDetectedSubmissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDetectedSubIndex(val);

    if (!val) {
      setRepoUrl("");
      setSelectedChapter("");
      setSelectedSession("");
      setSelectedAssignment("");
      return;
    }

    const idx = parseInt(val, 10);
    const sub = detectedSubmissions[idx];
    if (sub) {
      setRepoUrl(sub.githubUrl);
      if (sub.matchedTemplate) {
        const { chapter, session, assignmentName } = sub.matchedTemplate;
        setSelectedChapter(chapter);
        setSelectedSession(session);
        setSelectedAssignment(assignmentName);
      }
    }
  };

  const handleGradeSingle = async () => {
    if (!repoUrl.trim()) {
      showToast("Vui lòng nhập GitHub Repository URL.", "warning");
      return;
    }
    if (!selectedChapter || !selectedSession || !selectedAssignment) {
      showToast("Vui lòng chọn đầy đủ Chương, Session và Bài tập.", "warning");
      return;
    }

    setIsGrading(true);
    setResults(null);
    setStatusMessage("Đang chuẩn bị kiểm tra...");

    try {
      const template = exerciseTemplates?.[selectedChapter]?.[selectedSession]?.[selectedAssignment];
      if (!template || !template.assignment) {
        throw new Error("Mẫu bài tập thiếu nội dung đề bài.");
      }

      const activeCriteria = template.criteria && template.criteria.trim().length > 0
        ? template.criteria
        : "Đúng yêu cầu bài toán. Có thể không cần quan tâm phần Yêu cầu nộp bài.";

      const github = new GitHubService(config.githubToken, config.graderIgnoreItems);
      const repoData = await github.getRepoContents(repoUrl, (msg) => {
        setStatusMessage(msg);
      });

      setStatusMessage("AI đang thực hiện chấm điểm...");
      const ai = new AIService(config);
      const report = await ai.generateGradingReport(
        template.assignment,
        activeCriteria,
        repoData.content,
        (msg) => {
          setStatusMessage(msg);
        }
      );

      const score = parseScore(report);
      if (!score) {
        throw new Error("AI không trả về điểm số hợp lệ hoặc sai định dạng mẫu phản hồi.");
      }

      setResults({
        score,
        report,
        fileList: repoData.fileList
      });

      // Save to local classStudents list if a student is resolved
      if (activeStudent) {
        const studentId = activeStudent.studentId;
        chrome.storage.local.get("classStudentList", (res) => {
          const studentList: any[] = (res.classStudentList as any[]) || [];
          const student = studentList.find(st => st.studentId === studentId);
          if (student) {
            if (!student.submissions) student.submissions = {};
            const key = `${selectedChapter}_${selectedSession}_${selectedAssignment}`;
            student.submissions[key] = {
              score,
              report,
              githubUrl: repoUrl,
              gradedAt: new Date().toISOString()
            };

            chrome.storage.local.set({ classStudentList: studentList }, async () => {
              showToast(`Đã lưu kết quả chấm của học viên ${student.studentName} vào CSDL!`, "success");
              
              if (SupabaseService.isEnabled(config)) {
                try {
                  const classId = activeClassId || "unknown";
                  await SupabaseService.upsertSubmission(
                    config,
                    classId,
                    student.studentId,
                    student.studentName,
                    selectedChapter,
                    selectedSession,
                    selectedAssignment,
                    repoUrl,
                    score,
                    report
                  );
                } catch (syncErr: any) {
                  console.warn("Lỗi đồng bộ Supabase:", syncErr);
                  showToast("Đồng bộ kết quả lên Cloud thất bại: " + syncErr.message, "warning");
                }
              }
            });
          }
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Lỗi: ${err.message}`, "error");
    } finally {
      setIsGrading(false);
    }
  };

  const handleCopyReport = () => {
    if (!results?.report) return;
    navigator.clipboard.writeText(results.report).then(() => {
      showToast("Đã sao chép báo cáo Markdown vào clipboard!", "success");
    }).catch(err => {
      console.error(err);
      showToast("Lỗi sao chép vào clipboard.", "error");
    });
  };

  // Safe markdown render
  const parsedMarkdown = results?.report ? DOMPurify.sanitize(marked.parse(results.report) as string) : '';
  
  // Score badge coloring
  const numericScore = results ? parseFloat(results.score) : NaN;
  let scoreBadgeClass = "bg-gradient-to-br from-red-600 to-red-800 text-white";
  if (!isNaN(numericScore)) {
    if (numericScore >= 80) {
      scoreBadgeClass = "bg-gradient-to-br from-green-600 to-green-800 text-white";
    } else if (numericScore >= 50) {
      scoreBadgeClass = "bg-gradient-to-br from-amber-600 to-amber-800 text-white";
    }
  }

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      {/* Student resolved banner */}
      {activeStudent && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 border-l-4 border-l-green-500 rounded text-xs text-green-800 font-semibold select-none">
          👤 Đang chấm cho học viên: <span className="font-extrabold text-green-900">{activeStudent.studentName} ({activeStudent.studentId})</span>
        </div>
      )}

      {/* Detected submissions selector */}
      {detectedSubmissions.length > 0 && (
        <div className="flex flex-col gap-1 select-none animate-fade-in">
          <label className="text-[11px] font-bold text-slate-500">Chọn bài nộp phát hiện từ trang:</label>
          <select
            value={detectedSubIndex}
            onChange={handleDetectedSubmissionChange}
            className="w-full text-xs font-semibold text-slate-700 bg-green-50/50 border border-blue-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          >
            <option value="">-- Chọn bài nộp phát hiện từ trang --</option>
            {detectedSubmissions.map((sub, idx) => (
              <option key={idx} value={idx}>
                {sub.exerciseName} ({sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Repo URL Input */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-slate-500">GitHub Repository URL:</label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/repository"
          className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Dropdown Selectors */}
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
              onChange={(e) => setSelectedAssignment(e.target.value)}
              disabled={!selectedSession}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm disabled:opacity-60"
            >
              <option value="">-- Chọn --</option>
              {assignments.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grade Button */}
      <button
        onClick={handleGradeSingle}
        disabled={isGrading || aiStatus !== "success"}
        className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md text-xs font-bold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
      >
        {isGrading ? "⏳ Đang chạy..." : "🚀 Bắt đầu Chấm điểm"}
      </button>

      {/* Status Box */}
      {isGrading && (
        <div className="flex items-center gap-3 border border-slate-200 rounded-md bg-slate-50 p-4">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-xs font-semibold text-slate-600 animate-pulse">{statusMessage}</span>
        </div>
      )}

      {/* Results panel */}
      {results && (
        <div className="flex flex-col gap-3 border border-slate-200 rounded-md p-3.5 bg-white shadow-sm animate-fade-in select-text">
          {/* Header result row */}
          <div className="flex justify-between items-center select-none pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Kết Quả Đánh Giá</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded py-1 px-2.5 transition-colors active:scale-95 duration-100"
              >
                📋 Sao chép báo cáo
              </button>
              <span className={`text-[10px] font-bold py-1 px-2.5 rounded-full shadow-sm ${scoreBadgeClass}`}>
                {results.score} / 100
              </span>
            </div>
          </div>

          {/* Graded file tree */}
          {results.fileList && results.fileList.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded border border-slate-150">
              <div 
                onClick={() => setIsFileTreeExpanded(!isFileTreeExpanded)}
                className="flex items-center gap-1.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
              >
                <span>{isFileTreeExpanded ? '▼' : '▶'}</span>
                <span>📁 Xem danh sách tệp tin đã chấm ({results.fileList.length} file)</span>
              </div>
              
              {isFileTreeExpanded && (
                <ul className="flex flex-col max-h-[140px] overflow-y-auto pl-4 list-none text-slate-500 text-[10.5px] font-medium gap-1 animate-fade-in select-text">
                  {results.fileList.map((file, idx) => (
                    <li key={idx} className="truncate">
                      📄 <span className="font-mono text-slate-600 font-semibold">{file}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Markdown report */}
          <div 
            className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-xs 
              prose-headings:font-bold prose-headings:text-slate-800 prose-headings:my-2
              prose-p:my-1 prose-ul:my-1 prose-li:my-0.5
              prose-strong:text-slate-800"
            dangerouslySetInnerHTML={{ __html: parsedMarkdown }}
          />
        </div>
      )}
    </div>
  );
};
