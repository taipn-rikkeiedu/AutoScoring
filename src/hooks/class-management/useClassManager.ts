import { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { SupabaseService } from '~/src/services/supabaseService';
import { clearClassStudents, getClassStudents, saveClassStudents } from '~/src/core/classStudentStorage';
import { STORAGE_KEYS } from '~/src/core/constants';
import { Student } from '~/src/types';
import { safeNavigate } from '~/src/core/utils';
import { logger } from '~/src/core/logger';

export function useClassManager(setActiveTab: (tab: string) => void) {
  const { config, activeClassId, setActiveClassId, classStudents, setClassStudents } = useApp();
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [statusText, setStatusText] = useState("🔍 Sẵn sàng quét danh sách học viên từ trang...");
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, notCompleted: 0, graded: 0 });

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
          logger.info("CLASS_MANAGER", `Phát hiện lớp học ID: ${classId}. Bắt đầu nạp dữ liệu.`);

          let localStudents: Student[] = await getClassStudents(classId);

          if (SupabaseService.isEnabled(config)) {
            try {
              logger.info("CLASS_MANAGER", `Đang đồng bộ điểm số từ Supabase cho lớp ${classId}...`);
              const cloudSubs = await SupabaseService.pullSubmissions(config, classId);

              // Merge submissions
              if (cloudSubs && cloudSubs.length > 0) {
                cloudSubs.forEach(sub => {
                  let localSt = localStudents.find(st => st.studentId === sub.student_id);
                  if (!localSt) {
                    const newSt: Student = { studentId: sub.student_id, studentName: sub.student_name, submissionUrl: sub.github_url || "", submissions: {} };
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
              }

              await saveClassStudents(classId, localStudents);
              logger.success("CLASS_MANAGER", `Đồng bộ thành công lớp ${classId} (${localStudents.length} học viên, ${cloudSubs.length} bài chấm).`);
            } catch (err: any) {
              showToast("Đồng bộ kết quả từ Cloud thất bại: " + err.message, "warning");
              logger.error("CLASS_MANAGER", `Đồng bộ dữ liệu Supabase cho lớp ${classId} thất bại.`, err.message);
            }
          }

          setClassStudents(localStudents);
          setStatusText(localStudents.length > 0 ? `📋 Đã tải danh sách lớp ${classId}.` : "🔍 Sẵn sàng quét danh sách học viên từ trang...");
          setStatusType(localStudents.length > 0 ? 'success' : 'info');
        }
      }
    });
  }, [activeClassId]);

  useEffect(() => {
    const total = classStudents.length;
    let completed = 0, pending = 0, notCompleted = 0, graded = 0;

    classStudents.forEach(st => {
      const statusText = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : '';
      const isCompleted = statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA');
      const isPending = statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ') || statusText.includes('KIỂM TRA');

      if (isCompleted) completed++;
      else if (isPending) pending++;
      else notCompleted++;

      let score = (st as any).score;
      if (st.submissions) {
        let latestGraded: any = null;
        for (const key in st.submissions) {
          const sub = st.submissions[key];
          if (sub && sub.score !== undefined && sub.score !== null) {
            if (!latestGraded || new Date(sub.gradedAt || 0) > new Date(latestGraded.gradedAt || 0)) latestGraded = sub;
          }
        }
        if (latestGraded) score = latestGraded.score;
      }

      if (isCompleted || isPending || (score !== null && score !== undefined)) graded++;
    });

    setStats({ total, completed, pending, notCompleted, graded });
  }, [classStudents]);

  const handleScanClass = () => {
    setStatusText("🔍 Đang tìm kiếm danh sách học viên trên trang...");
    setStatusType('info');
    setIsScanning(true);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        setStatusText("❌ Lỗi: Không thể truy cập tab.");
        setStatusType('error');
        setIsScanning(false);
        logger.error("CLASS_MANAGER", "Quét danh sách học viên thất bại: Không thể truy cập tab trình duyệt.");
        return;
      }

      const activeTab = tabs[0];
      const match = (activeTab.url || "").match(/\/homework-checking\/(\d+)/);
      if (!match) {
        setStatusText("💡 Hãy mở trang danh sách bài nộp của lớp trên LMS để quét.");
        setStatusType('warning');
        setIsScanning(false);
        logger.warn("CLASS_MANAGER", "Quét danh sách học viên thất bại: Sai trang web LMS.");
        return;
      }

      const classId = match[1];
      setActiveClassId(classId);
      logger.info("CLASS_MANAGER", `Bắt đầu quét danh sách học viên trên trang LMS của lớp ${classId}...`);

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id! },
        files: ['/classListScraper.js']
      }, (results) => {
        setIsScanning(false);
        if (chrome.runtime.lastError) {
          setStatusText("❌ Không thể quét: " + chrome.runtime.lastError.message);
          setStatusType('error');
          logger.error("CLASS_MANAGER", "Lỗi scripting khi quét LMS.", chrome.runtime.lastError.message);
          return;
        }

        if (results && results[0]?.result) {
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
                setStatusText(`✅ Đã quét thành công ${merged.length} học viên.`);
                setStatusType('success');
                setClassStudents(merged);
                logger.success("CLASS_MANAGER", `Đã quét danh sách lớp ${classId} thành công. Số lượng: ${merged.length} học viên.`);
              });
            });
          } else {
            logger.warn("CLASS_MANAGER", "Quét hoàn tất nhưng không tìm thấy học viên nào trên trang web.");
          }
        }
      });
    });
  };

  const handleStudentScroll = (st: Student) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const tabId = tabs[0].id!;
        chrome.tabs.sendMessage(tabId, { action: 'scrollToStudent', studentId: st.studentId, studentName: st.studentName }, (response) => {
          if (chrome.runtime.lastError) {
            chrome.scripting.executeScript({ target: { tabId }, files: ['/content-scripts/content.js'] }, () => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action: 'scrollToStudent', studentId: st.studentId, studentName: st.studentName });
              }, 150);
            });
          }
        });
      }
    });
  };

  const handleGradeStudent = (st: Student) => {
    logger.info("CLASS_MANAGER", `Chuyển sang tab Chấm bài để chấm cho học viên: ${st.studentName} (${st.studentId})`);
    chrome.storage.local.set({
      [STORAGE_KEYS.activeStudentTransition]: { studentId: st.studentId, studentName: st.studentName, timestamp: Date.now() }
    }, () => {
      setActiveTab("tab-grader");
      if (st.submissionUrl) {
        safeNavigate(st.submissionUrl);
      }
    });
  };

  const handleDeleteStudent = (st: Student) => {
    if (window.confirm(`Xóa học viên ${st.studentName}?`)) {
      const updated = classStudents.filter(item => item.studentId !== st.studentId);
      saveClassStudents(activeClassId!, updated).then(() => {
        setClassStudents(updated);
        showToast("Đã xóa học viên.", "success");
        logger.info("CLASS_MANAGER", `Đã xóa học viên ${st.studentName} (${st.studentId}) ra khỏi danh sách lớp cục bộ.`);
      });
    }
  };

  const handleClearClass = () => {
    if (window.confirm("Xóa toàn bộ danh sách lớp? Ghi chú và điểm vẫn được lưu.")) {
      clearClassStudents(activeClassId!).then(() => {
        setClassStudents([]);
        showToast("Đã xóa danh sách.", "success");
        logger.info("CLASS_MANAGER", `Đã xóa sạch danh sách học viên lớp ${activeClassId} trong bộ nhớ local.`);
      });
    }
  };

  const handleOpenExportModal = () => {
    if (classStudents.length === 0) {
      showToast("Không có dữ liệu để xuất Excel.", "warning");
      return;
    }
    logger.info("CLASS_MANAGER", `Mở modal xuất báo cáo Excel cho lớp ${activeClassId}. Sĩ số học viên: ${classStudents.length}`);
    setShowExportModal(true);
  };

  return {
    isScanning,
    showExportModal,
    setShowExportModal,
    statusText,
    statusType,
    stats,
    classStudents,
    activeClassId,
    handleScanClass,
    handleStudentScroll,
    handleGradeStudent,
    handleDeleteStudent,
    handleClearClass,
    handleOpenExportModal
  };
}
