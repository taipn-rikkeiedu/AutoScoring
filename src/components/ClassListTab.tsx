import React, { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { SupabaseService } from '~/src/services/supabaseService';
import { clearClassStudents, getClassStudents, saveClassStudents } from '~/src/core/classStudentStorage';
import { STORAGE_KEYS, UI_MESSAGES } from '~/src/core/constants';
import { Student } from '~/src/types';
import { ExcelExportModal } from '~/src/components/ExcelExportModal';

interface ClassListTabProps {
  setActiveTab: (tab: string) => void;
}

export const ClassListTab: React.FC<ClassListTabProps> = ({ setActiveTab }) => {
  const { config, activeClassId, setActiveClassId, classStudents, setClassStudents } = useApp();
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [statusText, setStatusText] = useState("🔍 Sẵn sàng quét danh sách học viên từ trang...");
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    notCompleted: 0,
    graded: 0
  });

  // Detect active tab and load class list details on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs && tabs[0]) {
        const url = tabs[0].url || "";
        const match = url.match(/\/homework-checking\/(\d+)/);
        if (match) {
          const classId = match[1];
          setActiveClassId(classId);
          setStatusText(`☁️ Đang đồng bộ kết quả chấm từ Supabase cho lớp ${classId}...`);
          setStatusType('info');

          (async () => {
            let localStudents: Student[] = await getClassStudents(classId);

            if (SupabaseService.isEnabled(config)) {
              try {
                const cloudSubs = await SupabaseService.pullSubmissions(config, classId);
                if (cloudSubs && cloudSubs.length > 0) {
                  cloudSubs.forEach(sub => {
                    let localSt = localStudents.find(st => st.studentId === sub.student_id);
                    if (!localSt) {
                      const newSt: Student = {
                        studentId: sub.student_id,
                        studentName: sub.student_name,
                        submissionUrl: sub.github_url || "",
                        submissions: {}
                      };
                      localStudents.push(newSt);
                      localSt = newSt;
                    }
                    const key = `${sub.chapter}_${sub.session}_${sub.assignment_name}`;
                    if (!localSt.submissions) localSt.submissions = {};
                    localSt.submissions[key] = {
                      score: sub.score,
                      report: sub.report || "",
                      githubUrl: sub.github_url || "",
                      gradedAt: sub.graded_at || new Date().toISOString()
                    };
                  });
                  await saveClassStudents(classId, localStudents);
                }
              } catch (err: any) {
                console.warn("Supabase pullSubmissions failed:", err);
                showToast("Đồng bộ kết quả từ Cloud thất bại: " + err.message, "warning");
              }
            }

            setClassStudents(localStudents);
            if (localStudents.length > 0) {
              setStatusText(`📋 Đã tải danh sách lớp ${classId}.`);
              setStatusType('success');
            } else {
              setStatusText("🔍 Sẵn sàng quét danh sách học viên từ trang...");
              setStatusType('info');
            }
          })();
        } else {
          setStatusText("🔍 Sẵn sàng quét danh sách học viên từ trang...");
          setStatusType('info');
        }
      }
    });
  }, [activeClassId]);

  // Calculate statistics when students list changes
  useEffect(() => {
    const total = classStudents.length;
    let completed = 0;
    let pending = 0;
    let notCompleted = 0;
    let graded = 0;

    classStudents.forEach(st => {
      const statusText = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : '';
      const isCompleted = statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA');
      const isPending = statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ') || statusText.includes('KIỂM TRA');

      if (isCompleted) {
        completed++;
      } else if (isPending) {
        pending++;
      } else {
        notCompleted++;
      }

      // Check for grades
      let score = (st as any).score;
      if ((st as any).submissions) {
        let latestGraded: any = null;
        for (const key in (st as any).submissions) {
          const sub = (st as any).submissions[key];
          if (sub && sub.score !== undefined && sub.score !== null) {
            if (!latestGraded || new Date(sub.gradedAt || 0) > new Date(latestGraded.gradedAt || 0)) {
              latestGraded = sub;
            }
          }
        }
        if (latestGraded) {
          score = latestGraded.score;
        }
      }

      if (isCompleted || isPending || (score !== null && score !== undefined)) {
        graded++;
      }
    });

    setStats({ total, completed, pending, notCompleted, graded });
  }, [classStudents]);

  const handleScanClass = () => {
    setStatusText("🔍 Đang tìm kiếm danh sách học viên trên trang...");
    setStatusType('info');
    setIsScanning(true);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        setStatusText("❌ Lỗi: Không thể truy cập tab hiện tại.");
        setStatusType('error');
        setIsScanning(false);
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url || "";
      const match = url.match(/\/homework-checking\/(\d+)/);

      if (!match) {
        setStatusText("💡 Hãy mở trang danh sách bài nộp của lớp trên LMS (đường dẫn dạng /homework-checking/*) để quét.");
        setStatusType('warning');
        setIsScanning(false);
        return;
      }

      const classId = match[1];
      setActiveClassId(classId);

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id! },
        files: ['/classListScraper.js']
      }, (results) => {
        setIsScanning(false);
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          setStatusText("❌ Không thể quét trang: " + chrome.runtime.lastError.message);
          setStatusType('error');
          return;
        }

        if (results && results[0] && results[0].result) {
          const scraped = (results[0].result as any[]) || [];
          if (scraped.length > 0) {
            getClassStudents(classId).then((existingList) => {
              const merged: Student[] = scraped.map((newSt: any) => {
                const existing = existingList.find(st => st.submissionUrl === newSt.submissionUrl || (st.studentId && st.studentId !== 'N/A' && st.studentId === newSt.studentId));
                return {
                  studentId: newSt.studentId,
                  studentName: newSt.studentName,
                  submissionUrl: newSt.submissionUrl,
                  dbId: newSt.dbId || (existing ? (existing.dbId || '') : ''),
                  lmsStatus: newSt.lmsStatus || (existing ? (existing.lmsStatus || '') : ''),
                  submittedCount: newSt.submittedCount !== undefined ? newSt.submittedCount : (existing ? (existing.submittedCount || 0) : 0),
                  completedCount: newSt.completedCount !== undefined ? newSt.completedCount : (existing ? (existing.completedCount || 0) : 0),
                  githubUrl: existing ? ((existing as any).githubUrl || '') : '',
                  score: existing ? (existing as any).score : null,
                  comments: existing ? (existing as any).comments : null,
                  assignmentName: existing ? ((existing as any).assignmentName || '') : '',
                  submissions: existing ? ((existing as any).submissions || {}) : {}
                };
              });

              saveClassStudents(classId, merged).then(() => {
                setStatusText(`✅ Đã quét thành công ${merged.length} học viên từ trang lớp học.`);
                setStatusType('success');
                setClassStudents(merged);
              });
            });
          } else {
            setStatusText("❓ Không tìm thấy danh sách học viên nào trên trang.");
            setStatusType('warning');
          }
        }
      });
    });
  };

  const handleStudentScroll = (st: Student) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const tabId = tabs[0].id!;
        chrome.tabs.sendMessage(tabId, {
          action: 'scrollToStudent',
          studentId: st.studentId,
          studentName: st.studentName
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("REduX: content script connection lost, attempting to inject content.js:", chrome.runtime.lastError.message);
            // Re-inject content script dynamically
            chrome.scripting.executeScript({
              target: { tabId },
              files: ['/content-scripts/content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                console.error("REduX: Failed to inject content.js:", chrome.runtime.lastError.message);
                return;
              }
              // Wait 150ms for script to initialize and try sending the message again
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                  action: 'scrollToStudent',
                  studentId: st.studentId,
                  studentName: st.studentName
                }, (res) => {
                  if (chrome.runtime.lastError) {
                    console.error("REduX: Failed to send scrollToStudent even after injection:", chrome.runtime.lastError.message);
                  }
                });
              }, 150);
            });
          }
        });
      }
    });
  };

  const handleGradeStudent = (st: Student) => {
    chrome.storage.local.set({
      [STORAGE_KEYS.activeStudentTransition]: {
        studentId: st.studentId,
        studentName: st.studentName,
        timestamp: Date.now()
      }
    }, () => {
      setActiveTab("tab-grader");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && st.submissionUrl) {
          chrome.tabs.update(tabs[0].id!, { url: st.submissionUrl });
        }
      });
    });
  };

  const handleDeleteStudent = (st: Student) => {
    if (window.confirm(`Xóa học viên ${st.studentName} khỏi danh sách?`)) {
      const updated = classStudents.filter(item => item.studentId !== st.studentId);
      saveClassStudents(activeClassId, updated).then(() => {
        setClassStudents(updated);
        showToast("Đã xóa học viên khỏi danh sách.", "success");
      });
    }
  };

  const handleClearClass = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách học viên lớp học hiện tại? Dữ liệu điểm và báo cáo đã lưu sẽ không bị mất trong Chrome Storage.")) {
      clearClassStudents(activeClassId).then(() => {
        setClassStudents([]);
        showToast("Đã xóa danh sách học viên lớp học.", "success");
      });
    }
  };

  const handleOpenExportModal = () => {
    if (classStudents.length === 0) {
      showToast("Không có dữ liệu học viên để xuất Excel.", "warning");
      return;
    }
    setShowExportModal(true);
  };

  // Sort students: Pending first -> Not Completed -> Completed
  const getSortedStudents = () => {
    return [...classStudents].sort((a, b) => {
      const statusA = a.lmsStatus ? a.lmsStatus.trim().toUpperCase() : '';
      const isCompletedA = statusA.includes('HOÀN THÀNH') && !statusA.includes('CHƯA');
      const isPendingA = statusA.includes('CHỜ KIỂM TRA') || statusA.includes('ĐANG CHỜ') || statusA.includes('KIỂM TRA');
      const isNotCompletedA = statusA.includes('CHƯA HOÀN THÀNH') || (!isCompletedA && !isPendingA && statusA.length > 0);

      const statusB = b.lmsStatus ? b.lmsStatus.trim().toUpperCase() : '';
      const isCompletedB = statusB.includes('HOÀN THÀNH') && !statusB.includes('CHƯA');
      const isPendingB = statusB.includes('CHỜ KIỂM TRA') || statusB.includes('ĐANG CHỜ') || statusB.includes('KIỂM TRA');
      const isNotCompletedB = statusB.includes('CHƯA HOÀN THÀNH') || (!isCompletedB && !isPendingB && statusB.length > 0);

      let pA = 3;
      if (isPendingA) pA = 1;
      else if (isNotCompletedA) pA = 2;

      let pB = 3;
      if (isPendingB) pB = 1;
      else if (isNotCompletedB) pB = 2;

      return pA - pB;
    });
  };

  const getStudentScoreInfo = (st: Student) => {
    let score = (st as any).score;
    let report = (st as any).comments;
    if (st.submissions) {
      let latestGraded: any = null;
      for (const key in st.submissions) {
        const sub = st.submissions[key];
        if (sub && sub.score !== undefined && sub.score !== null) {
          if (!latestGraded || new Date(sub.gradedAt || 0) > new Date(latestGraded.gradedAt || 0)) {
            latestGraded = sub;
          }
        }
      }
      if (latestGraded) {
        score = latestGraded.score;
        report = latestGraded.report;
      }
    }
    return { score, report };
  };

  const sortedStudents = getSortedStudents();

  return (
    <div className="flex flex-col flex-1 p-4 gap-3.5 overflow-hidden">
      {/* Status banner with stats */}
      <div 
        className={`text-xs p-3 rounded-md border-l-4 font-medium transition-all ${
          statusType === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
          statusType === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
          statusType === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
          'bg-slate-100 border-blue-500 text-slate-700'
        }`}
      >
        {statusType === 'success' && stats.total > 0 ? (
          <div className="select-none">
            <div className="font-bold text-slate-800 mb-1">📊 Thống kê lớp học: Sĩ số {stats.total} | Đã chấm {stats.graded}</div>
            <div className="flex gap-3 text-[11px] font-semibold">
              <span>Hoàn thành: <span className="text-green-600 font-bold">{stats.completed}</span></span>
              <span>Chưa hoàn thành: <span className="text-red-500 font-bold">{stats.notCompleted}</span></span>
              <span>Chờ kiểm tra: <span className="text-amber-500 font-bold">{stats.pending}</span></span>
            </div>
          </div>
        ) : (
          <div>{statusText}</div>
        )}
      </div>

      {/* Table grid */}
      <div className="flex-1 min-h-0 overflow-y-auto border border-slate-300 rounded-md bg-white">
        {sortedStudents.length > 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-3 w-20">Mã SV</th>
                <th className="py-2.5 px-3">Họ và Tên</th>
                <th className="py-2.5 px-3 text-center w-28">Trạng thái LMS</th>
                <th className="py-2.5 px-3 text-center w-36">Bài hoàn thành / Đã nộp</th>
                <th className="py-2.5 px-3 text-center w-28">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedStudents.map(st => {
                const statusText = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : 'CHƯA NỘP';
                const isCompleted = statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA');
                const isPending = statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ') || statusText.includes('KIỂM TRA');
                
                const subCount = st.submittedCount || 0;
                const compCount = st.completedCount || 0;
                
                const { score, report } = getStudentScoreInfo(st);

                return (
                  <tr 
                    key={st.studentId} 
                    className={`hover:bg-slate-50/50 ${
                      isPending ? 'bg-amber-50/20' : 
                      (statusText.includes('CHƯA HOÀN THÀNH') || (!isCompleted && !isPending && st.lmsStatus)) ? 'bg-red-50/25' : ''
                    }`}
                  >
                    {/* ID */}
                    <td 
                      onClick={() => handleStudentScroll(st)}
                      className="py-2 px-3 font-bold text-slate-700 cursor-pointer hover:underline"
                    >
                      {st.studentId}
                    </td>

                    {/* Name & Sub repository link */}
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-0.5">
                        <a 
                          href={st.submissionUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => {
                            if (!e.ctrlKey && !e.metaKey) {
                              e.preventDefault();
                              handleStudentScroll(st);
                            }
                          }}
                          className="font-semibold text-slate-800 hover:text-blue-600 hover:underline"
                        >
                          {st.studentName}
                        </a>
                        {(st as any).githubUrl && (
                          <a 
                            href={(st as any).githubUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[9px] text-blue-500 font-medium truncate max-w-[150px] hover:underline"
                          >
                            {(st as any).githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                          </a>
                        )}
                      </div>
                    </td>

                    {/* LMS Status Badge */}
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block text-xs font-bold py-0.5 px-2 rounded border ${
                        isCompleted ? 'bg-green-100 text-green-800 border-green-200' :
                        isPending ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {statusText}
                      </span>
                    </td>

                    {/* Completed / Submitted Count & AI Score Indicator */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className={`inline-block text-[10px] font-bold py-0.5 px-2 rounded ${
                          compCount === subCount && subCount > 0 ? 'bg-green-100 text-green-800' :
                          compCount < subCount ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {compCount} / {subCount}
                        </span>
                        {score !== null && score !== undefined && (
                          <div 
                            className="text-[9px] text-green-700 font-bold mt-1 underline decoration-dashed cursor-pointer"
                            title="Click để xem báo cáo nhận xét chi tiết"
                            onClick={() => {
                              (window as any).showReportModal({
                                title: `Báo cáo chấm điểm: ${st.studentName} (${st.studentId})`,
                                score,
                                report
                              });
                            }}
                          >
                            AI: {score}/100
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex gap-1.5 justify-center select-none">
                        <button
                          onClick={() => handleGradeStudent(st)}
                          className="py-1 px-2 border border-blue-300 hover:border-blue-400 bg-blue-50 text-blue-700 rounded text-xs font-bold transition-all active:scale-95 duration-100"
                        >
                          Chấm bài
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st)}
                          className="py-1 px-2 border border-red-300 hover:border-red-400 bg-red-50 text-red-700 rounded text-xs font-bold transition-all active:scale-95 duration-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400 select-none">
            <span className="text-3xl mb-2">👥</span>
            <span className="text-sm font-bold text-slate-500">Chưa có dữ liệu lớp học</span>
            <span className="text-[11px] text-slate-400 text-center max-w-[280px] mt-1 leading-normal">
              Hãy mở trang danh sách học viên trên LMS và bấm "Quét Danh Sách Lớp".
            </span>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="flex justify-between items-center select-none pt-1">
        <button
          onClick={handleClearClass}
          className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md text-xs font-bold transition-colors active:scale-95 duration-100"
        >
          ❌ Xóa Danh Sách
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleScanClass}
            disabled={isScanning}
            className="py-1.5 px-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md text-xs font-bold shadow-md transition-all active:scale-95 duration-100"
          >
            <span>📥 Quét Danh Sách Lớp</span>
          </button>
          <button
            onClick={handleOpenExportModal}
            disabled={classStudents.length === 0}
            className="py-1.5 px-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-md text-xs font-bold shadow-md transition-all disabled:opacity-50 active:scale-95 duration-100"
          >
            <span>📊 Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Excel Export Modal */}
      {showExportModal && (
        <ExcelExportModal
          students={classStudents}
          onClose={() => setShowExportModal(false)}
          onExport={(msg, type) => showToast(msg, type)}
        />
      )}
    </div>
  );
};
