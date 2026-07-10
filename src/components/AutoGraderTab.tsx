import React, { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { findMatchingTemplate, parseScore, extractComment, matchStudent } from '~/src/core/utils';
import { GitHubService } from '~/src/services/githubService';
import { AIService } from '~/src/services/aiService';
import { SupabaseService } from '~/src/services/supabaseService';
import { Submission } from '~/src/types';

export const AutoGraderTab: React.FC = () => {
  const { config, exerciseTemplates, classStudents, activeClassId, aiStatus } = useApp();
  const { showToast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("🔍 Đang tìm kiếm các bài tập trên trang...");
  const [scanStatusType, setScanStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  // Expanded rows drawer state
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Bulk progress states
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkProgressText, setBulkProgressText] = useState("");
  const [currentGradingStudent, setCurrentGradingStudent] = useState<string | null>(null);

  // Synchronize detected submissions in chrome storage
  const syncDetectedSubmissions = (subs: Submission[]) => {
    chrome.storage.local.set({ detectedSubmissions: subs });
  };

  // 1. Initial Page Scan / Restore Cache on tab load
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        setScanStatus("❌ Lỗi: Không thể truy cập tab hiện tại.");
        setScanStatusType('error');
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url || "";
      const isWebPage = url.startsWith("http://") || url.startsWith("https://");

      if (!isWebPage) {
        setScanStatus("💡 Hãy mở trang web có bài tập của học viên để quét.");
        setScanStatusType('warning');
        setSubmissions([]);
        syncDetectedSubmissions([]);
        return;
      }

      // Check cache first
      chrome.tabs.sendMessage(activeTab.id!, { action: 'getGradingCache' }, (response) => {
        const err = chrome.runtime.lastError;
        if (err || !response || !Array.isArray(response.submissions)) {
          // If no cache, perform scraping
          runScraper(activeTab, false);
        } else {
          setSubmissions(response.submissions);
          syncDetectedSubmissions(response.submissions);
          setScanStatus(`✅ Đã khôi phục trạng thái chấm (${response.submissions.length} bài) từ bộ nhớ tab hiện tại.`);
          setScanStatusType('success');
        }
      });
    });
  }, [exerciseTemplates]);

  const runScraper = (activeTab: chrome.tabs.Tab, shouldMerge: boolean) => {
    setIsScanning(true);
    setScanStatus("🔍 Đang tìm kiếm các bài tập trên trang...");
    setScanStatusType('info');

    chrome.scripting.executeScript({
      target: { tabId: activeTab.id! },
      files: ['/submissionsScraper.js']
    }, (results) => {
      setIsScanning(false);
      if (chrome.runtime.lastError) {
        setScanStatus("❌ Không thể quét trang: " + chrome.runtime.lastError.message);
        setScanStatusType('error');
        setSubmissions([]);
        syncDetectedSubmissions([]);
        return;
      }

      if (results && results[0] && results[0].result) {
        const scrapedItems = (results[0].result as any[]) || [];
        
        const mapAndResolve = (cachedList: Submission[] | null = null) => {
          const mapped: Submission[] = scrapedItems.map(item => {
            const cachedItem = cachedList ? cachedList.find(c => c.githubUrl === item.githubUrl) : null;
            const match = findMatchingTemplate(item.exerciseName, exerciseTemplates);
            
            if (cachedItem) {
              return {
                exerciseName: item.exerciseName,
                studentName: item.studentName || cachedItem.studentName || '',
                githubUrl: item.githubUrl,
                checked: cachedItem.checked !== undefined ? (cachedItem as any).checked : true,
                matchedTemplate: (cachedItem as any).matchedTemplate || match,
                status: cachedItem.status || 'pending',
                score: cachedItem.score !== undefined ? cachedItem.score : null,
                report: cachedItem.report || undefined,
                error: (cachedItem as any).error || undefined,
                fileList: cachedItem.fileList || undefined
              };
            } else {
              return {
                exerciseName: item.exerciseName,
                studentName: item.studentName || '',
                githubUrl: item.githubUrl,
                checked: true,
                matchedTemplate: match,
                status: 'pending',
                score: null
              };
            }
          });

          setSubmissions(mapped);
          syncDetectedSubmissions(mapped);
          updateContentScriptCache(mapped);

          if (mapped.length > 0) {
            setScanStatus(`✅ Đã tìm thấy ${mapped.length} bài tập chứa liên kết GitHub trên trang.`);
            setScanStatusType('success');
          } else {
            setScanStatus("❓ Không tìm thấy bài tập nộp trên trang này.");
            setScanStatusType('warning');
          }
        };

        if (shouldMerge) {
          chrome.tabs.sendMessage(activeTab.id!, { action: 'getGradingCache' }, (response) => {
            const err = chrome.runtime.lastError;
            const cachedList = (!err && response) ? response.submissions : null;
            mapAndResolve(cachedList);
          });
        } else {
          mapAndResolve(null);
        }
      } else {
        setScanStatus("❓ Không tìm thấy bài tập nào.");
        setScanStatusType('info');
        setSubmissions([]);
        syncDetectedSubmissions([]);
        updateContentScriptCache([]);
      }
    });
  };

  const handleRescan = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        runScraper(tabs[0], true);
      }
    });
  };

  const updateContentScriptCache = (updatedList: Submission[]) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action: 'updateGradingCache', submissions: updatedList },
          () => {
            if (chrome.runtime.lastError) {
              // Ignore cache error if tab unavailable
            }
          }
        );
      }
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const updated = submissions.map(s => ({ ...s, checked }));
    setSubmissions(updated);
    syncDetectedSubmissions(updated);
    updateContentScriptCache(updated);
  };

  const handleRowCheckboxChange = (index: number, checked: boolean) => {
    const updated = submissions.map((s, idx) => idx === index ? { ...s, checked } : s);
    setSubmissions(updated);
    syncDetectedSubmissions(updated);
    updateContentScriptCache(updated);
  };

  const handleTemplateSelectionChange = (index: number, val: string) => {
    const updated = [...submissions];
    if (val) {
      const parts = val.split('||');
      updated[index].matchedTemplate = {
        chapter: parts[0],
        session: parts[1],
        assignmentName: parts[2]
      };
    } else {
      updated[index].matchedTemplate = undefined;
    }
    setSubmissions(updated);
    syncDetectedSubmissions(updated);
    updateContentScriptCache(updated);
  };

  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Grade a single row inline
  const handleGradeSingleRow = async (index: number) => {
    const sub = submissions[index];
    if (!sub.githubUrl) {
      showToast("Vui lòng điền GitHub URL.", "warning");
      return;
    }
    if (!(sub as any).matchedTemplate) {
      showToast("Vui lòng liên kết bài tập với đề bài trong hệ thống.", "warning");
      return;
    }

    // Set status to downloading
    const updated = [...submissions];
    updated[index] = {
      ...sub,
      status: 'downloading',
      score: null,
      report: undefined,
      error: undefined
    };
    setSubmissions(updated);
    updateContentScriptCache(updated);

    try {
      const { chapter, session, assignmentName } = (sub as any).matchedTemplate;
      const template = exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
      if (!template || !template.assignment) {
        throw new Error("Không lấy được nội dung đề bài để thực hiện chấm.");
      }

      const activeCriteria = template.criteria && template.criteria.trim().length > 0
        ? template.criteria
        : "Đúng yêu cầu bài toán. Có thể không cần quan tâm phần Yêu cầu nộp bài.";

      const github = new GitHubService(config.githubToken, config.graderIgnoreItems);
      const repoData = await github.getRepoContents(sub.githubUrl, () => {});

      updated[index].fileList = repoData.fileList;
      updated[index].status = 'grading';
      setSubmissions([...updated]);
      updateContentScriptCache(updated);

      const ai = new AIService(config);
      const report = await ai.generateGradingReport(
        template.assignment,
        activeCriteria,
        repoData.content,
        null
      );

      const score = parseScore(report);
      if (!score) {
        throw new Error("AI không trả về điểm số hợp lệ hoặc sai định dạng mẫu phản hồi.");
      }

      updated[index].status = 'success';
      updated[index].score = score;
      updated[index].report = report;
      setSubmissions([...updated]);
      syncDetectedSubmissions(updated);
      updateContentScriptCache(updated);

      // Save result to class students list if student is resolved
      if (sub.studentName) {
        let pageId = null;
        let pageName = sub.studentName;
        const parenMatch = sub.studentName.match(/(.*?)\s*\((.*?)\)/);
        if (parenMatch) {
          pageName = parenMatch[1].trim();
          pageId = parenMatch[2].trim();
        }

        const res = await new Promise<any>(resolve => chrome.storage.local.get("classStudentList", resolve));
        const studentList: any[] = res.classStudentList || [];
        const matched = matchStudent(studentList, "", pageId, pageName, null);

        if (matched) {
          if (!matched.submissions) matched.submissions = {};
          const key = `${chapter}_${session}_${assignmentName}`;
          matched.submissions[key] = {
            score,
            report,
            githubUrl: sub.githubUrl || "",
            gradedAt: new Date().toISOString()
          };
          
          await new Promise<void>(resolve => chrome.storage.local.set({ classStudentList: studentList }, resolve));
          
          const classIdMatch = (matched.submissionUrl || "").match(/\/homework-checking\/(\d+)/);
          const classId = classIdMatch ? classIdMatch[1] : "unknown";
          if (SupabaseService.isEnabled(config) && classId !== "unknown") {
            try {
              await SupabaseService.upsertSubmission(
                config,
                classId,
                matched.studentId,
                matched.studentName,
                chapter,
                session,
                assignmentName,
                sub.githubUrl,
                score,
                report
              );
            } catch (syncErr: any) {
              console.warn("Lỗi đồng bộ Supabase:", syncErr);
              showToast("Đồng bộ kết quả học sinh lên Cloud thất bại: " + syncErr.message, "warning");
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      updated[index].status = 'error';
      updated[index].error = e.message;
      setSubmissions([...updated]);
      updateContentScriptCache(updated);
    }
  };

  // Run bulk grading loop
  const handleBulkGrading = async () => {
    const checkedRows = submissions.filter(s => (s as any).checked && (s as any).matchedTemplate);
    if (checkedRows.length === 0) return;

    setIsBulkGrading(true);
    setBulkProgress(0);
    setBulkProgressText(`Bắt đầu chấm ${checkedRows.length} bài đã chọn...`);

    const stored = await new Promise<any>(resolve => chrome.storage.local.get("classStudentList", resolve));
    const studentList: any[] = stored.classStudentList || [];

    let gradedCount = 0;
    const totalToGrade = checkedRows.length;

    for (let i = 0; i < submissions.length; i++) {
      const sub = submissions[i];
      if (!(sub as any).checked || !(sub as any).matchedTemplate) continue;

      let resolvedDisplayName = sub.studentName || 'Chưa rõ học viên';
      if (sub.studentName) {
        const parenMatch = sub.studentName.match(/(.*?)\s*\((.*?)\)/);
        const name = parenMatch ? parenMatch[1].trim() : sub.studentName;
        const id = parenMatch ? parenMatch[2].trim() : null;
        const matched = matchStudent(studentList, "", id, name, null);
        if (matched) resolvedDisplayName = `${matched.studentName} (${matched.studentId})`;
      }

      setCurrentGradingStudent(resolvedDisplayName);
      setBulkProgressText(`Đang chấm bài: ${sub.exerciseName} (${gradedCount + 1}/${totalToGrade})...`);
      setBulkProgress(Math.round((gradedCount / totalToGrade) * 100));

      // Throttling 3s delay to prevent API Rate limits
      if (gradedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      await handleGradeSingleRow(i);
      gradedCount++;
    }

    setBulkProgress(100);
    setBulkProgressText(`Hoàn thành chấm điểm ${totalToGrade} bài!`);
    setCurrentGradingStudent(null);

    setTimeout(() => {
      setIsBulkGrading(false);
      setBulkProgress(0);
      setBulkProgressText("");
    }, 4000);
  };

  // Options builder for associated template selectors
  const buildTemplateOptions = () => {
    const options: React.ReactNode[] = [];
    options.push(<option key="empty" value="">-- Chưa liên kết --</option>);
    for (const chapter in exerciseTemplates) {
      const groupOptions: React.ReactNode[] = [];
      for (const session in exerciseTemplates[chapter]) {
        for (const assignmentName in exerciseTemplates[chapter][session]) {
          const valueStr = `${chapter}||${session}||${assignmentName}`;
          groupOptions.push(
            <option key={valueStr} value={valueStr}>
              {session} - {assignmentName}
            </option>
          );
        }
      }
      options.push(
        <optgroup key={chapter} label={chapter}>
          {groupOptions}
        </optgroup>
      );
    }
    return options;
  };

  const getStatusBadge = (sub: Submission, index: number) => {
    let badgeClass = "bg-slate-100 text-slate-600 border border-slate-300 cursor-default";
    let text = "Chờ chấm";
    let clickHandler: (() => void) | undefined = undefined;

    if (sub.status === 'downloading') {
      badgeClass = "bg-blue-100 text-blue-700 border-blue-200 animate-pulse cursor-default";
      text = "Tải code...";
    } else if (sub.status === 'grading') {
      badgeClass = "bg-amber-100 text-amber-700 border-amber-200 animate-pulse cursor-default";
      text = "AI chấm...";
    } else if (sub.status === 'success') {
      badgeClass = "bg-green-100 text-green-800 border-green-200 cursor-pointer font-bold hover:bg-green-200";
      text = `${sub.score || '--'} / 100`;
      clickHandler = () => {
        (window as any).showReportModal({
          title: `Báo cáo: ${sub.studentName || 'Học viên'} - ${sub.exerciseName}`,
          score: sub.score || null,
          report: sub.report || ""
        });
      };
    } else if (sub.status === 'error') {
      badgeClass = "bg-red-100 text-red-700 border-red-200 cursor-pointer font-bold hover:bg-red-200";
      text = "Lỗi";
      clickHandler = () => {
        showToast((sub as any).error || 'Lỗi không xác định khi chấm bài.', 'error');
      };
    }

    return (
      <span 
        onClick={clickHandler}
        className={`inline-block text-xs py-0.5 px-2 rounded shadow-sm text-center select-none font-bold ${badgeClass}`}
      >
        {text}
      </span>
    );
  };

  const allChecked = submissions.length > 0 && submissions.every(s => (s as any).checked);
  const checkedCount = submissions.filter(s => (s as any).checked).length;
  const gradeableCount = submissions.filter(s => (s as any).checked && (s as any).matchedTemplate).length;

  return (
    <div className="flex flex-col flex-1 p-4 gap-3.5 overflow-hidden">
      {/* Banner status */}
      <div 
        className={`text-xs p-2 rounded-md border-l-4 font-medium select-none ${
          scanStatusType === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
          scanStatusType === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
          scanStatusType === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
          'bg-slate-100 border-blue-500 text-slate-700'
        }`}
      >
        {scanStatus}
      </div>

      {/* Submissions list table */}
      <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-md bg-white">
        {submissions.length > 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
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
                const matchedVal = sub.matchedTemplate 
                  ? `${sub.matchedTemplate.chapter}||${sub.matchedTemplate.session}||${sub.matchedTemplate.assignmentName}` 
                  : '';
                
                const template = sub.matchedTemplate 
                  ? exerciseTemplates?.[sub.matchedTemplate.chapter]?.[sub.matchedTemplate.session]?.[sub.matchedTemplate.assignmentName]
                  : null;

                return (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-slate-50/50">
                      {/* Checkbox */}
                      <td className="py-2 px-2 text-center select-none">
                        <input
                          type="checkbox"
                          checked={!!(sub as any).checked}
                          onChange={(e) => handleRowCheckboxChange(index, e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Detail Label info */}
                      <td className="py-2 px-3">
                        <div 
                          onClick={() => toggleRowExpansion(index)}
                          className="flex flex-col gap-0.5 cursor-pointer hover:opacity-80"
                        >
                          <span className="font-bold text-slate-800 line-clamp-1">{sub.exerciseName}</span>
                          {sub.studentName && (
                            <span className="text-[10px] text-slate-500 font-semibold">👤 {sub.studentName}</span>
                          )}
                          <span className="text-[9px] font-mono text-slate-400">
                            {sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                          </span>
                        </div>
                      </td>

                      {/* Associated exercise selector */}
                      <td className="py-2 px-3">
                        <select
                          value={matchedVal}
                          onChange={(e) => handleTemplateSelectionChange(index, e.target.value)}
                          className={`w-full text-xs font-semibold rounded py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm truncate max-w-[150px] border ${
                            !matchedVal
                              ? 'border-red-400 bg-red-50 text-red-700'
                              : 'border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          {buildTemplateOptions()}
                        </select>
                      </td>

                      {/* Status badge / score */}
                      <td className="py-2 px-3 text-center">
                        {getStatusBadge(sub, index)}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center select-none">
                        <button
                          onClick={() => handleGradeSingleRow(index)}
                          disabled={sub.status === 'grading' || sub.status === 'downloading'}
                          className={`py-1 px-2.5 text-xs font-bold rounded border transition-all active:scale-95 duration-100 ${
                            sub.status === 'success' 
                              ? 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                              : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm disabled:opacity-50'
                          }`}
                        >
                          {sub.status === 'success' ? '🔄 Chấm Lại' : sub.status === 'grading' || sub.status === 'downloading' ? '⏳ Chấm...' : '🚀 Chấm Bài'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50 animate-fade-in select-text border-t border-slate-200">
                        <td colSpan={5} className="p-3">
                          <div className="flex flex-col gap-3">
                            {/* Template previews */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">📄 Nội Dung Đề Bài:</span>
                                <pre className="text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded p-2.5 h-24 overflow-y-auto whitespace-pre-wrap font-sans leading-normal">
                                  {template ? (template.assignment || 'Chưa cấu hình nội dung đề bài.') : 'Chưa liên kết đề bài. Vui lòng chọn đề bài tương ứng.'}
                                </pre>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">📋 Tiêu Chí Chấm Điểm:</span>
                                <pre className="text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded p-2.5 h-24 overflow-y-auto whitespace-pre-wrap font-sans leading-normal">
                                  {template ? (template.criteria || 'Đúng yêu cầu bài toán.') : 'Chưa liên kết đề bài.'}
                                </pre>
                              </div>
                            </div>

                            {/* File list & comment (if graded) */}
                            {sub.status === 'success' && (
                              <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
                                {sub.fileList && sub.fileList.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">📁 Danh sách tệp tin ({sub.fileList.length} file):</span>
                                    <ul className="text-xs font-medium text-slate-600 font-mono list-none max-h-20 overflow-y-auto bg-white border border-slate-300 rounded p-2 pl-3">
                                      {sub.fileList.map((file, fIdx) => (
                                        <li key={fIdx}>📄 {file}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sub.report && (
                                  <div className="flex flex-col gap-1 mt-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">💬 Nhận xét AI:</span>
                                    <div className="text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded p-2.5 max-h-24 overflow-y-auto leading-relaxed whitespace-pre-line">
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
          <div className="flex flex-col justify-center items-center py-20 text-slate-400 select-none">
            <span className="text-3xl mb-2">🔍</span>
            <span className="text-sm font-bold text-slate-500">Không tìm thấy bài tập nào</span>
            <span className="text-[11px] text-slate-400 text-center max-w-[280px] mt-1 leading-normal">
              Vui lòng chuyển tới trang danh sách nộp bài tập của học viên hoặc bấm nút quét lại trang bên dưới.
            </span>
          </div>
        )}
      </div>

      {/* Progress loop indicators */}
      {isBulkGrading && (
        <div className="flex flex-col gap-2 p-3 border border-slate-200 rounded-md bg-slate-50 select-none animate-fade-in">
          {currentGradingStudent && (
            <div className="text-[11px] font-semibold text-green-800">
              👤 Đang chấm cho học viên: <span className="font-extrabold">{currentGradingStudent}</span>
            </div>
          )}
          
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div 
              style={{ width: `${bulkProgress}%` }}
              className="bg-green-600 h-full rounded-full transition-all duration-300"
            ></div>
          </div>
          <div className="text-[10px] font-bold text-slate-500 animate-pulse">{bulkProgressText}</div>
        </div>
      )}

      {/* Footer control bar */}
      <div className="flex justify-between items-center select-none pt-1">
        <button
          onClick={handleRescan}
          disabled={isScanning || isBulkGrading}
          className="py-1.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-xs font-bold transition-all active:scale-[0.98]"
        >
          🔄 Quét Lại Trang
        </button>
        <button
          onClick={handleBulkGrading}
          disabled={isBulkGrading || gradeableCount === 0 || aiStatus !== "success"}
          className="py-1.5 px-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md text-xs font-bold shadow-md transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          <span>
            {isBulkGrading ? "⏳ Đang Chấm..." : (
              checkedCount !== gradeableCount 
                ? `🚀 Chấm ${gradeableCount} Bài (Bỏ qua bài chưa liên kết)`
                : `🚀 Chấm ${gradeableCount} Bài Đã Chọn`
            )}
          </span>
        </button>
      </div>
    </div>
  );
};
