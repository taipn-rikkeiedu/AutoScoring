import { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { findMatchingTemplate, matchStudent, parseScore } from '~/src/core/utils';
import { STORAGE_KEYS } from '~/src/core/constants';
import { SupabaseService } from '~/src/services/supabaseService';
import { getClassStudents, saveClassStudents } from '~/src/core/classStudentStorage';
import { Submission } from '~/src/types';
import { gradeSubmission } from '~/src/services/graderService';
import { GitHubService } from '~/src/services/githubService';
import { AIService } from '~/src/services/aiService';

export function useAutoGrader() {
  const { config, exerciseTemplates, activeClassId, aiStatus } = useApp();
  const { showToast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("🔍 Đang tìm kiếm các bài tập...");
  const [scanStatusType, setScanStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkProgressText, setBulkProgressText] = useState("");

  const syncDetectedSubmissions = (subs: Submission[]) => {
    chrome.storage.local.set({ [STORAGE_KEYS.detectedSubmissions]: subs });
  };

  const updateContentScriptCache = (updatedList: Submission[]) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateGradingCache', submissions: updatedList }, () => {
          if (chrome.runtime.lastError) { /* ignore */ }
        });
      }
    });
  };

  const runScraper = (activeTab: chrome.tabs.Tab, shouldMerge: boolean) => {
    setIsScanning(true);
    setScanStatus("🔍 Đang tìm kiếm bài nộp...");
    setScanStatusType('info');

    chrome.scripting.executeScript({
      target: { tabId: activeTab.id! },
      files: ['/submissionsScraper.js']
    }, (results) => {
      setIsScanning(false);
      if (chrome.runtime.lastError) {
        setScanStatus("❌ Không thể quét trang: " + chrome.runtime.lastError.message);
        setScanStatusType('error');
        setSubmissions([]); syncDetectedSubmissions([]); return;
      }

      if (results && results[0]?.result) {
        const scrapedItems = (results[0].result as any[]) || [];
        const mapAndResolve = (cachedList: Submission[] | null = null) => {
          const mapped: Submission[] = scrapedItems.map(item => {
            const cachedItem = cachedList?.find(c => c.githubUrl === item.githubUrl);
            const match = findMatchingTemplate(item.exerciseName, exerciseTemplates);
            return {
              exerciseName: item.exerciseName,
              studentName: item.studentName || cachedItem?.studentName || '',
              githubUrl: item.githubUrl,
              checked: cachedItem?.checked !== undefined ? cachedItem.checked : true,
              matchedTemplate: cachedItem?.matchedTemplate || match,
              status: cachedItem?.status || 'pending',
              score: cachedItem?.score !== undefined ? cachedItem.score : null,
              report: cachedItem?.report || undefined,
              error: cachedItem?.error || undefined,
              fileList: cachedItem?.fileList || undefined
            };
          });

          setSubmissions(mapped);
          syncDetectedSubmissions(mapped);
          updateContentScriptCache(mapped);

          setScanStatus(mapped.length > 0 ? `✅ Tìm thấy ${mapped.length} bài GitHub.` : "❓ Không tìm thấy bài nộp.");
          setScanStatusType(mapped.length > 0 ? 'success' : 'warning');
        };

        if (shouldMerge) {
          chrome.tabs.sendMessage(activeTab.id!, { action: 'getGradingCache' }, (response) => {
            mapAndResolve(chrome.runtime.lastError ? null : response?.submissions);
          });
        } else {
          mapAndResolve(null);
        }
      }
    });
  };

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const activeTab = tabs[0];
      if (!activeTab.url?.startsWith("http")) {
        setScanStatus("💡 Hãy mở trang web bài tập để quét.");
        setScanStatusType('warning');
        return;
      }
      chrome.tabs.sendMessage(activeTab.id!, { action: 'getGradingCache' }, (response) => {
        if (chrome.runtime.lastError || !Array.isArray(response?.submissions)) {
          runScraper(activeTab, false);
        } else {
          setSubmissions(response.submissions);
          syncDetectedSubmissions(response.submissions);
          setScanStatus(`✅ Khôi phục thành công ${response.submissions.length} bài.`);
          setScanStatusType('success');
        }
      });
    });
  }, [exerciseTemplates]);

  const handleRescan = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) runScraper(tabs[0], true);
    });
  };

  const handleGradeSingleRow = async (index: number): Promise<boolean> => {
    // Get the initial submission details from the current state slice
    let sub = submissions[index];
    if (!sub || !sub.githubUrl || !sub.matchedTemplate) return false;

    // Set state to 'downloading' using functional update to protect other rows
    setSubmissions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'downloading', score: null, report: undefined, error: undefined };
      updateContentScriptCache(next);
      return next;
    });

    try {
      const { chapter, session, assignmentName } = sub.matchedTemplate;
      const template = exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
      if (!template?.assignment) throw new Error("Thiếu đề bài.");

      const result = await gradeSubmission(
        config,
        sub.githubUrl,
        template.assignment,
        template.criteria || null,
        null,
        (fileList) => {
          setSubmissions(prev => {
            const next = [...prev];
            next[index] = { ...next[index], fileList, status: 'grading' };
            updateContentScriptCache(next);
            return next;
          });
        }
      );

      // Set state to 'success' with score and report
      setSubmissions(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: 'success', score: result.score, report: result.report };
        syncDetectedSubmissions(next);
        updateContentScriptCache(next);
        return next;
      });

      if (sub.studentName) {
        let pageId = null, pageName = sub.studentName;
        const parenMatch = sub.studentName.match(/(.*?)\s*\((.*?)\)/);
        if (parenMatch) { pageName = parenMatch[1].trim(); pageId = parenMatch[2].trim(); }

        const studentList = await getClassStudents(activeClassId);
        const matched = matchStudent(studentList, "", pageId, pageName, null);
        if (matched) {
          if (!matched.submissions) matched.submissions = {};
          matched.submissions[`${chapter}_${session}_${assignmentName}`] = { score: result.score, report: result.report, githubUrl: sub.githubUrl, gradedAt: new Date().toISOString() };
          const classIdMatch = (matched.submissionUrl || "").match(/\/homework-checking\/(\d+)/);
          const classId = activeClassId || (classIdMatch ? classIdMatch[1] : null);
          await saveClassStudents(classId, studentList);

          if (SupabaseService.isEnabled(config) && classId) {
            try {
              await SupabaseService.upsertSubmission(config, classId, matched.studentId, matched.studentName, chapter, session, assignmentName, sub.githubUrl, result.score, result.report);
            } catch (err: any) {
              showToast("Cloud sync failed: " + err.message, "warning");
            }
          }
        }
      }
      return true;
    } catch (e: any) {
      setSubmissions(prev => {
        const next = [...prev];
        next[index] = { ...next[index], status: 'error', error: e.message };
        updateContentScriptCache(next);
        return next;
      });
      return false;
    }
  };

  const handleBulkGrading = async () => {
    const checkedRows = submissions.filter(s => s.checked && s.matchedTemplate);
    if (checkedRows.length === 0) return;

    setIsBulkGrading(true);
    setBulkProgress(0);
    setBulkProgressText("Đang chuẩn bị...");
    
    // Group checked submissions by githubUrl to download once and grade in parallel
    const groups: Record<string, Array<{ sub: Submission; originalIndex: number }>> = {};
    submissions.forEach((sub, idx) => {
      if (!sub.checked || !sub.matchedTemplate) return;
      const url = sub.githubUrl || 'no_url';
      if (!groups[url]) groups[url] = [];
      groups[url].push({ sub, originalIndex: idx });
    });

    const urls = Object.keys(groups);
    let processedCount = 0;
    let success = 0;
    let failed = 0;

    for (let u = 0; u < urls.length; u++) {
      const url = urls[u];
      const items = groups[url];
      
      setBulkProgressText(`Đang tải mã nguồn (${processedCount + 1}/${checkedRows.length})...`);
      
      // Set status to 'downloading' for all items in this group
      setSubmissions(prev => {
        const next = [...prev];
        items.forEach(item => {
          next[item.originalIndex] = {
            ...next[item.originalIndex],
            status: 'downloading',
            score: null,
            report: undefined,
            error: undefined
          };
        });
        updateContentScriptCache(next);
        return next;
      });

      try {
        // Download repo once
        const github = new GitHubService(config.githubToken, config.graderIgnoreItems);
        const repoData = await github.getRepoContents(url, (msg) => {
          setBulkProgressText(msg);
        });

        // Set status to 'grading' for all items
        setSubmissions(prev => {
          const next = [...prev];
          items.forEach(item => {
            next[item.originalIndex] = {
              ...next[item.originalIndex],
              status: 'grading',
              fileList: repoData.fileList
            };
          });
          updateContentScriptCache(next);
          return next;
        });

        setBulkProgressText(`Đang chấm song song ${items.length} bài tập...`);
        const ai = new AIService(config);

        // Grade all checked exercises for this repo in parallel
        const gradingPromises = items.map(async (item) => {
          const { chapter, session, assignmentName } = item.sub.matchedTemplate!;
          const template = exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
          if (!template?.assignment) throw new Error("Thiếu đề bài.");

          const report = await ai.generateGradingReport(
            template.assignment,
            template.criteria || "",
            repoData.content,
            null
          );

          const score = parseScore(report);
          if (!score) throw new Error("Không bóc tách được điểm.");

          return {
            originalIndex: item.originalIndex,
            score,
            report,
            sub: item.sub
          };
        });

        const gradedResults = await Promise.all(gradingPromises);

        // Save state
        setSubmissions(prev => {
          const next = [...prev];
          gradedResults.forEach(res => {
            next[res.originalIndex] = {
              ...next[res.originalIndex],
              status: 'success',
              score: res.score,
              report: res.report
            };
          });
          syncDetectedSubmissions(next);
          updateContentScriptCache(next);
          return next;
        });

        // Sync to local student list and Supabase
        const classId = activeClassId;
        const studentList = await getClassStudents(classId);

        const sampleSub = items[0].sub;
        if (sampleSub.studentName) {
          let pageId = null, pageName = sampleSub.studentName;
          const parenMatch = sampleSub.studentName.match(/(.*?)\s*\((.*?)\)/);
          if (parenMatch) {
            pageName = parenMatch[1].trim();
            pageId = parenMatch[2].trim();
          }

          const matched = matchStudent(studentList, "", pageId, pageName, null);
          if (matched) {
            if (!matched.submissions) matched.submissions = {};
            const submissionsMap = matched.submissions;
            
            gradedResults.forEach(res => {
              const { chapter, session, assignmentName } = res.sub.matchedTemplate!;
              submissionsMap[`${chapter}_${session}_${assignmentName}`] = {
                score: res.score,
                report: res.report,
                githubUrl: url,
                gradedAt: new Date().toISOString()
              };
            });
            await saveClassStudents(classId, studentList);

            if (SupabaseService.isEnabled(config) && classId) {
              await Promise.all(gradedResults.map(res => {
                const { chapter, session, assignmentName } = res.sub.matchedTemplate!;
                return SupabaseService.upsertSubmission(
                  config, classId, matched.studentId, matched.studentName,
                  chapter, session, assignmentName, url, res.score, res.report
                ).catch(err => console.warn("Supabase sync failed:", err));
              }));
            }
          }
        }

        success += items.length;
      } catch (err: any) {
        console.error("Lỗi chấm hàng loạt:", err);
        failed += items.length;
        setSubmissions(prev => {
          const next = [...prev];
          items.forEach(item => {
            next[item.originalIndex] = {
              ...next[item.originalIndex],
              status: 'error',
              error: err.message
            };
          });
          updateContentScriptCache(next);
          return next;
        });
      }

      processedCount += items.length;
      setBulkProgress(Math.round((processedCount / checkedRows.length) * 100));
    }

    setIsBulkGrading(false);
    showToast(`Chấm hoàn tất! Thành công: ${success}, Thất bại: ${failed}`, "success");
  };

  return {
    submissions,
    setSubmissions,
    isScanning,
    scanStatus,
    scanStatusType,
    expandedRows,
    setExpandedRows,
    isBulkGrading,
    bulkProgress,
    bulkProgressText,
    exerciseTemplates,
    aiStatus,
    handleRescan,
    handleToggleSelectAll: (checked: boolean) => {
      const updated = submissions.map(s => ({ ...s, checked }));
      setSubmissions(updated); syncDetectedSubmissions(updated); updateContentScriptCache(updated);
    },
    handleRowCheckboxChange: (index: number, checked: boolean) => {
      const updated = submissions.map((s, idx) => idx === index ? { ...s, checked } : s);
      setSubmissions(updated); syncDetectedSubmissions(updated); updateContentScriptCache(updated);
    },
    handleTemplateSelectionChange: (index: number, val: string) => {
      const updated = [...submissions];
      if (val) {
        const parts = val.split('||');
        updated[index].matchedTemplate = { chapter: parts[0], session: parts[1], assignmentName: parts[2] };
      } else {
        updated[index].matchedTemplate = undefined;
      }
      setSubmissions(updated); syncDetectedSubmissions(updated); updateContentScriptCache(updated);
    },
    toggleRowExpansion: (index: number) => setExpandedRows(prev => ({ ...prev, [index]: !prev[index] })),
    handleGradeSingleRow,
    handleBulkGrading
  };
}
