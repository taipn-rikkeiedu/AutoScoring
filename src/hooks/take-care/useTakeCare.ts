import { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { SupabaseService } from '~/src/services/supabaseService';
import { exportToExcel } from '~/src/core/excelExporter';
import { STORAGE_KEYS, UI_MESSAGES } from '~/src/core/constants';
import { CareStudent } from '~/src/types';

export function useTakeCare() {
  const { config, activeClassId, setActiveClassId, careStudents, setCareStudents } = useApp();
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState("Sẵn sàng quét danh sách chăm sóc sinh viên từ trang...");
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs && tabs[0]) {
        const url = tabs[0].url || "";
        const match = url.match(/\/class\/(\d+)\/take-care/);
        if (match) {
          const classId = match[1];
          setActiveClassId(classId);
          setStatusText(`☁️ Đang đồng bộ dữ liệu chăm sóc từ Supabase cho lớp ${classId}...`);
          setStatusType('info');

          chrome.storage.local.get(STORAGE_KEYS.careStudents, async (res) => {
            const allCareStudents = (res[STORAGE_KEYS.careStudents] || {}) as Record<string, CareStudent[]>;
            let localStudents: CareStudent[] = allCareStudents[classId] || [];

            if (SupabaseService.isEnabled(config)) {
              try {
                const cloudNotes = await SupabaseService.pullCareNotes(config, classId);
                if (cloudNotes && cloudNotes.length > 0) {
                  cloudNotes.forEach(cloud => {
                    const local = localStudents.find(st => 
                      st.studentId === cloud.student_id &&
                      (st.subjectName || "") === (cloud.subject_name || "") &&
                      (st.studyDate || "") === (cloud.study_date || "")
                    );
                    if (local) {
                      local.note = cloud.note || "";
                    } else {
                      localStudents.push({
                        studentId: cloud.student_id,
                        studentName: cloud.student_name,
                        subjectName: cloud.subject_name || "",
                        studyDate: cloud.study_date || "",
                        note: cloud.note || ""
                      });
                    }
                  });
                  allCareStudents[classId] = localStudents;
                  chrome.storage.local.set({ [STORAGE_KEYS.careStudents]: allCareStudents });
                }
              } catch (err: any) {
                showToast("Đồng bộ ghi chú từ Cloud thất bại: " + err.message, "warning");
              }
            }

            // Run a background scan of the current page to filter records of the currently visible date and subject
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id! },
              files: ['/careScraper.js']
            }, (results) => {
              if (results && results[0]?.result) {
                const scraped = (results[0].result as CareStudent[]) || [];
                if (scraped.length > 0) {
                  const filtered = localStudents.filter(st => 
                    scraped.some(s => 
                      s.studentId === st.studentId &&
                      (s.subjectName || "") === (st.subjectName || "") &&
                      (s.studyDate || "") === (st.studyDate || "")
                    )
                  );

                  // Populate placeholder list for scraped entries that do not have saved notes yet
                  scraped.forEach(s => {
                    const exists = filtered.some(f => 
                      f.studentId === s.studentId && 
                      f.subjectName === s.subjectName && 
                      f.studyDate === s.studyDate
                    );
                    if (!exists) {
                      filtered.push({
                        studentId: s.studentId,
                        studentName: s.studentName,
                        subjectName: s.subjectName,
                        studyDate: s.studyDate,
                        note: ""
                      });
                    }
                  });

                  setCareStudents(filtered);
                  setStatusText(`📋 Đã tải danh sách chăm sóc của ngày ${scraped[0].studyDate || ""}.`);
                  setStatusType('success');
                  return;
                }
              }
              setCareStudents(localStudents);
              setStatusText(localStudents.length > 0 ? `📋 Đã tải danh sách chăm sóc của lớp ${classId}.` : "🔍 Sẵn sàng quét danh sách chăm sóc sinh viên từ trang...");
              setStatusType(localStudents.length > 0 ? 'success' : 'info');
            });
          });
        }
      }
    });
  }, [activeClassId]);

  const handleScanCare = () => {
    setStatusText("🔍 Đang tìm kiếm thông tin sinh viên trên trang...");
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
      const match = (activeTab.url || "").match(/\/class\/(\d+)\/take-care/);
      if (!match) {
        setStatusText("💡 Hãy mở trang Chăm sóc học viên trên LMS để quét.");
        setStatusType('warning');
        setIsScanning(false);
        return;
      }

      const classId = match[1];
      setActiveClassId(classId);

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id! },
        files: ['/careScraper.js']
      }, (results) => {
        setIsScanning(false);
        if (chrome.runtime.lastError) {
          setStatusText("❌ Không thể quét trang: " + chrome.runtime.lastError.message);
          setStatusType('error');
          return;
        }

        if (results && results[0]?.result) {
          const scraped = (results[0].result as CareStudent[]) || [];
          if (scraped.length > 0) {
            chrome.storage.local.get(STORAGE_KEYS.careStudents, (res) => {
              const allCareStudents = (res[STORAGE_KEYS.careStudents] || {}) as Record<string, CareStudent[]>;
              const classStudents: CareStudent[] = allCareStudents[classId] || [];

              const merged = scraped.map(newSt => {
                const existing = classStudents.find(st => 
                  st.studentId === newSt.studentId &&
                  (st.subjectName || "") === (newSt.subjectName || "") &&
                  (st.studyDate || "") === (newSt.studyDate || "")
                );
                return {
                  studentId: newSt.studentId,
                  studentName: newSt.studentName,
                  subjectName: newSt.subjectName || "",
                  studyDate: newSt.studyDate || "",
                  note: existing ? (existing.note || "") : ""
                };
              });

              merged.forEach(newSt => {
                const oldIdx = classStudents.findIndex(st => st.studentId === newSt.studentId && !(st.subjectName) && !(st.studyDate));
                if (oldIdx !== -1) classStudents.splice(oldIdx, 1);

                const idx = classStudents.findIndex(st => 
                  st.studentId === newSt.studentId &&
                  (st.subjectName || "") === (newSt.subjectName || "") &&
                  (st.studyDate || "") === (newSt.studyDate || "")
                );
                if (idx !== -1) {
                  classStudents[idx].studentName = newSt.studentName;
                  classStudents[idx].note = newSt.note;
                } else {
                  classStudents.push(newSt);
                }
              });

              allCareStudents[classId] = classStudents;
              chrome.storage.local.set({ [STORAGE_KEYS.careStudents]: allCareStudents }, () => {
                setStatusText(`✅ Đã quét thành công ${merged.length} học viên từ trang.`);
                setStatusType('success');
                
                const filtered = classStudents.filter(st => 
                  scraped.some(s => 
                    s.studentId === st.studentId &&
                    (s.subjectName || "") === (st.subjectName || "") &&
                    (s.studyDate || "") === (st.studyDate || "")
                  )
                );
                setCareStudents(filtered);
              });
            });
          }
        }
      });
    });
  };

  const handleSaveNote = (studentId: string, subjectName: string, studyDate: string, noteValue: string) => {
    if (!activeClassId) return;

    chrome.storage.local.get(STORAGE_KEYS.careStudents, (res) => {
      const allCareStudents = (res[STORAGE_KEYS.careStudents] || {}) as Record<string, CareStudent[]>;
      const classStudents: CareStudent[] = allCareStudents[activeClassId] || [];

      const student = classStudents.find(st => 
        st.studentId === studentId &&
        (st.subjectName || "") === (subjectName || "") &&
        (st.studyDate || "") === (studyDate || "")
      );
      
      let studentName = "";
      if (student) {
        student.note = noteValue;
        studentName = student.studentName;
      } else {
        const currentSt = careStudents.find(st => 
          st.studentId === studentId &&
          (st.subjectName || "") === (subjectName || "") &&
          (st.studyDate || "") === (studyDate || "")
        );
        if (currentSt) {
          classStudents.push({ studentId, studentName: currentSt.studentName, subjectName, studyDate, note: noteValue });
          studentName = currentSt.studentName;
        }
      }

      setCareStudents(prev => 
        prev.map(st => 
          (st.studentId === studentId && st.subjectName === subjectName && st.studyDate === studyDate)
            ? { ...st, note: noteValue }
            : st
        )
      );

      allCareStudents[activeClassId] = classStudents;
      chrome.storage.local.set({ [STORAGE_KEYS.careStudents]: allCareStudents }, async () => {
        showToast("Đã lưu ghi chú thành công!", "success");
        if (SupabaseService.isEnabled(config) && studentName) {
          try {
            await SupabaseService.upsertCareNote(config, activeClassId, studentId, studentName, subjectName || "", studyDate || "", noteValue);
          } catch (syncErr: any) {
            showToast("Đồng bộ ghi chú lên Cloud thất bại: " + syncErr.message, "warning");
          }
        }
      });
    });
  };

  const handleClearList = () => {
    if (!activeClassId) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách chăm sóc của lớp hiện tại? Ghi chú đã lưu sẽ bị xóa.")) {
      chrome.storage.local.get(STORAGE_KEYS.careStudents, (res) => {
        const allCareStudents = (res[STORAGE_KEYS.careStudents] || {}) as Record<string, CareStudent[]>;
        delete allCareStudents[activeClassId];
        chrome.storage.local.set({ [STORAGE_KEYS.careStudents]: allCareStudents }, () => {
          setCareStudents([]);
          showToast("Đã xóa danh sách lớp.", "success");
        });
      });
    }
  };

  const handleExportExcel = async () => {
    if (careStudents.length === 0) return;
    const data = careStudents.map((st, index) => ({
      "STT": index + 1,
      "Mã SV": st.studentId || "",
      "Họ và Tên": st.studentName || "",
      "Môn học": st.subjectName || "",
      "Ngày học": st.studyDate || "",
      "Ghi chú chăm sóc": st.note || ""
    }));

    const columnWidths = [{ wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 40 }];
    const fileName = `Danh_sach_cham_soc_lop_${activeClassId || "unknown"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    try {
      await exportToExcel(data, "Cham_soc_sinh_vien", fileName, columnWidths);
    } catch (err: any) {
      showToast(UI_MESSAGES.common.excelExportFailed + err.message, "error");
    }
  };

  const handleCopyReport = () => {
    const activeNotes = careStudents.filter(st => st.note && st.note.trim().length > 0);
    if (activeNotes.length === 0) {
      showToast("Không có ghi chú chăm sóc nào.", "warning");
      return;
    }
    const reportText = activeNotes.map(st => `${st.studentName}: ${st.note}`).join("\n");
    navigator.clipboard.writeText(reportText).then(() => {
      showToast("Đã sao chép báo cáo vào Clipboard!", "success");
    }).catch(err => {
      showToast("Lỗi sao chép: " + err.message, "error");
    });
  };

  return {
    isScanning,
    statusText,
    statusType,
    careStudents,
    handleScanCare,
    handleSaveNote,
    handleClearList,
    handleExportExcel,
    handleCopyReport
  };
}
