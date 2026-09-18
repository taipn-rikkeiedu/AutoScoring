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
import { AIService, compressCode } from '~/src/services/aiService';
import { analyzeCode } from '~/src/services/codeAnalysis';

const BULK_GRADING_CONCURRENCY = 3;

async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      try {
        const value = await worker(items[currentIndex]);
        results[currentIndex] = { status: 'fulfilled', value };
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason };
      }
    }
  });

  await Promise.all(runners);
  return results;
}

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
        next[index] = { ...next[index], status: 'success', score: result.score, report: result.report, language: result.language, astMetrics: result.astMetrics };
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
        // Download repo once client-side (JSZip), share across all items in this group
        const github = new GitHubService(config.githubToken, config.graderIgnoreItems);
        const repoData = await github.getRepoContents(
          url,
          (msg) => {
            setBulkProgressText(msg);
          }
        );

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

        setBulkProgressText(`Đang chấm ${items.length} bài tập (tối đa ${BULK_GRADING_CONCURRENCY} song song)...`);
        const ai = new AIService(config);
        // Cùng repo cho cả nhóm nên chỉ cần phân tích AST một lần, dùng chung cho mọi bài trong nhóm.
        const { language: repoLanguage, metrics: repoAstMetrics } = analyzeCode(compressCode(repoData.content));

        // Grade checked exercises for this repo with bounded concurrency to avoid
        // overwhelming the backend with many full-payload requests at once.
        let gradedSoFar = 0;
        const settledResults = await runWithConcurrencyLimit(items, BULK_GRADING_CONCURRENCY, async (item) => {
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

          gradedSoFar++;
          setBulkProgressText(`Đang chấm ${gradedSoFar}/${items.length} bài tập (tối đa ${BULK_GRADING_CONCURRENCY} song song)...`);

          return {
            originalIndex: item.originalIndex,
            score,
            report,
            sub: item.sub
          };
        });

        const gradedResults = settledResults
          .filter((r): r is PromiseFulfilledResult<{ originalIndex: number; score: string; report: string; sub: Submission }> => r.status === 'fulfilled')
          .map(r => r.value);
        const itemFailures = settledResults
          .map((r, idx) => ({ r, item: items[idx] }))
          .filter(({ r }) => r.status === 'rejected') as { r: PromiseRejectedResult; item: { sub: Submission; originalIndex: number } }[];

        // Save state for successfully graded items
        if (gradedResults.length > 0) {
          setSubmissions(prev => {
            const next = [...prev];
            gradedResults.forEach(res => {
              next[res.originalIndex] = {
                ...next[res.originalIndex],
                status: 'success',
                score: res.score,
                report: res.report,
                language: repoLanguage,
                astMetrics: repoAstMetrics
              };
            });
            syncDetectedSubmissions(next);
            updateContentScriptCache(next);
            return next;
          });
        }

        // Mark individually failed items without discarding successes in the same group
        if (itemFailures.length > 0) {
          setSubmissions(prev => {
            const next = [...prev];
            itemFailures.forEach(({ r, item }) => {
              const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
              next[item.originalIndex] = {
                ...next[item.originalIndex],
                status: 'error',
                error: reason
              };
            });
            updateContentScriptCache(next);
            return next;
          });
        }

        // Sync to local student list and Supabase (only when at least one item succeeded)
        if (gradedResults.length > 0) {
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
        }

        success += gradedResults.length;
        failed += itemFailures.length;
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

  const handleCopySingleSubmission = (sub: Submission) => {
    if (!sub || !sub.githubUrl) return;
    const studentPart = sub.studentName ? `[${sub.studentName}] ` : '';
    const scorePart = sub.score !== null && sub.score !== undefined ? ` (Điểm: ${sub.score}/100)` : '';
    const text = `${studentPart}${sub.exerciseName}: ${sub.githubUrl}${scorePart}`;
    
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã sao chép link & đề: ${sub.studentName || sub.exerciseName}`, "success");
    }).catch(err => {
      showToast("Lỗi sao chép: " + err.message, "error");
    });
  };

  const handleCopyReport = (format: 'detailed' | 'simple' | 'tsv' | 'markdown' = 'detailed') => {
    if (submissions.length === 0) {
      showToast("Không có bài nộp nào để sao chép báo cáo.", "warning");
      return;
    }

    const hasChecked = submissions.some(s => s.checked);
    const targetSubs = hasChecked ? submissions.filter(s => s.checked) : submissions;

    if (targetSubs.length === 0) {
      showToast("Vui lòng chọn ít nhất một bài nộp.", "warning");
      return;
    }

    let text = '';
    const nowStr = new Date().toLocaleString('vi-VN');

    if (format === 'detailed') {
      const header = `📊 BÁO CÁO BÀI TẬP GITHUB (${targetSubs.length} bài)\n⏰ Thời gian: ${nowStr}\n--------------------------------------------------\n`;
      const body = targetSubs.map((s, idx) => {
        const studentPart = s.studentName ? `[${s.studentName}] ` : '';
        const templatePart = s.matchedTemplate ? `\n   - Đề liên kết: ${s.matchedTemplate.session} - ${s.matchedTemplate.assignmentName}` : '';
        const scorePart = s.score !== null && s.score !== undefined ? `\n   - Điểm số: ${s.score}/100` : '';
        const statusPart = s.status === 'success' ? ' (Đã chấm)' : s.status === 'error' ? ' (Lỗi)' : '';
        return `${idx + 1}. ${studentPart}${s.exerciseName}${statusPart}\n   - Link: ${s.githubUrl}${templatePart}${scorePart}`;
      }).join('\n\n');
      text = header + body;
    } else if (format === 'simple') {
      text = targetSubs.map(s => {
        const studentPart = s.studentName ? `[${s.studentName}] ` : '';
        return `- ${studentPart}${s.exerciseName}: ${s.githubUrl}`;
      }).join('\n');
    } else if (format === 'tsv') {
      const header = "STT\tHọ và tên\tTên bài tập trên trang\tĐề bài liên kết\tLink GitHub\tĐiểm số\tTrạng thái";
      const rows = targetSubs.map((s, idx) => {
        const matched = s.matchedTemplate ? `${s.matchedTemplate.session} - ${s.matchedTemplate.assignmentName}` : '';
        const score = s.score || '';
        const status = s.status === 'success' ? 'Đã chấm' : s.status === 'error' ? 'Lỗi' : s.status === 'grading' ? 'Đang chấm' : 'Chờ chấm';
        return `${idx + 1}\t${s.studentName || ''}\t${s.exerciseName}\t${matched}\t${s.githubUrl}\t${score}\t${status}`;
      });
      text = [header, ...rows].join('\n');
    } else if (format === 'markdown') {
      const header = "| STT | Học viên | Bài tập trên trang | Đề liên kết | Link GitHub | Điểm |\n|---|---|---|---|---|---|";
      const rows = targetSubs.map((s, idx) => {
        const student = s.studentName ? s.studentName.replace(/\|/g, '-') : '-';
        const exercise = s.exerciseName.replace(/\|/g, '-');
        const matched = s.matchedTemplate ? `${s.matchedTemplate.session} - ${s.matchedTemplate.assignmentName}`.replace(/\|/g, '-') : '-';
        const score = s.score !== null && s.score !== undefined ? `${s.score}` : '--';
        return `| ${idx + 1} | ${student} | ${exercise} | ${matched} | [GitHub](${s.githubUrl}) | ${score} |`;
      });
      text = [header, ...rows].join('\n');
    }

    navigator.clipboard.writeText(text).then(() => {
      const formatNames: Record<string, string> = {
        detailed: 'Báo cáo chi tiết',
        simple: 'Link & Tên đề ngắn gọn',
        tsv: 'Bảng tính Excel/Sheets (TSV)',
        markdown: 'Bảng Markdown'
      };
      showToast(`Đã sao chép ${targetSubs.length} bài (${formatNames[format]}) vào Clipboard!`, "success");
    }).catch(err => {
      showToast("Lỗi sao chép vào bộ nhớ tạm: " + err.message, "error");
    });
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
    handleBulkGrading,
    handleCopySingleSubmission,
    handleCopyReport
  };
}

