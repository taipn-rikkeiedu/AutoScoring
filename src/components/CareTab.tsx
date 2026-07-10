import React, { useState, useEffect } from 'react';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { SupabaseService } from '~/src/services/supabaseService';
import { exportToExcel } from '~/src/core/excelExporter';
import { CareStudent } from '~/src/types';

export const CareTab: React.FC = () => {
  const { config, activeClassId, setActiveClassId, careStudents, setCareStudents, updateConfig } = useApp();
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState("Sẵn sàng quét danh sách chăm sóc sinh viên từ trang...");
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  // Detect active tab and load class care details on mount
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

          // Pull care students from local storage
          chrome.storage.local.get("careStudents", async (res) => {
            const allCareStudents = (res.careStudents || {}) as Record<string, CareStudent[]>;
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
                  chrome.storage.local.set({ careStudents: allCareStudents });
                }
              } catch (err: any) {
                console.warn("Supabase pullCareNotes failed:", err);
                showToast("Đồng bộ ghi chú từ Cloud thất bại: " + err.message, "warning");
              }
            }

            setCareStudents(localStudents);
            if (localStudents.length > 0) {
              setStatusText(`📋 Đã tải danh sách chăm sóc của lớp ${classId}.`);
              setStatusType('success');
            } else {
              setStatusText("🔍 Sẵn sàng quét danh sách chăm sóc sinh viên từ trang...");
              setStatusType('info');
            }
          });
        } else {
          setStatusText("🔍 Sẵn sàng quét danh sách chăm sóc sinh viên từ trang...");
          setStatusType('info');
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
      const url = activeTab.url || "";
      const match = url.match(/\/class\/(\d+)\/take-care/);

      if (!match) {
        setStatusText("💡 Hãy mở trang Chăm sóc học viên trên LMS (đường dẫn dạng /class/*/take-care) để quét.");
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
          console.error(chrome.runtime.lastError);
          setStatusText("❌ Không thể quét trang: " + chrome.runtime.lastError.message);
          setStatusType('error');
          return;
        }

        if (results && results[0] && results[0].result) {
          const scraped = (results[0].result as CareStudent[]) || [];
          if (scraped.length > 0) {
            chrome.storage.local.get("careStudents", (res) => {
              const allCareStudents = (res.careStudents || {}) as Record<string, CareStudent[]>;
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

              // Merge
              merged.forEach(newSt => {
                const idx = classStudents.findIndex(st => 
                  st.studentId === newSt.studentId &&
                  (st.subjectName || "") === (newSt.subjectName || "") &&
                  (st.studyDate || "") === (newSt.studyDate || "")
                );
                if (idx !== -1) {
                  classStudents[idx].studentName = newSt.studentName;
                } else {
                  classStudents.push(newSt);
                }
              });

              allCareStudents[classId] = classStudents;
              chrome.storage.local.set({ careStudents: allCareStudents }, () => {
                setStatusText(`✅ Đã quét thành công ${merged.length} học viên từ trang.`);
                setStatusType('success');
                setCareStudents(classStudents.filter(st => scraped.some(s => s.studentId === st.studentId)));
              });
            });
          } else {
            setStatusText("❓ Không tìm thấy danh sách học viên chăm sóc trên trang.");
            setStatusType('warning');
          }
        }
      });
    });
  };

  const handleSaveNote = (studentId: string, subjectName: string, studyDate: string, noteValue: string) => {
    if (!activeClassId) return;

    chrome.storage.local.get("careStudents", (res) => {
      const allCareStudents = (res.careStudents || {}) as Record<string, CareStudent[]>;
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
          classStudents.push({
            studentId,
            studentName: currentSt.studentName,
            subjectName,
            studyDate,
            note: noteValue
          });
          studentName = currentSt.studentName;
        }
      }

      // Update in memory too
      setCareStudents(prev => 
        prev.map(st => 
          (st.studentId === studentId && st.subjectName === subjectName && st.studyDate === studyDate)
            ? { ...st, note: noteValue }
            : st
        )
      );

      allCareStudents[activeClassId] = classStudents;
      chrome.storage.local.set({ careStudents: allCareStudents }, async () => {
        showToast("Đã lưu ghi chú thành công!", "success");
        if (SupabaseService.isEnabled(config) && studentName) {
          try {
            await SupabaseService.upsertCareNote(
              config, activeClassId, studentId, studentName, subjectName || "", studyDate || "", noteValue
            );
          } catch (syncErr: any) {
            console.warn("Lỗi đồng bộ Supabase:", syncErr);
            showToast("Đồng bộ ghi chú lên Cloud thất bại: " + syncErr.message, "warning");
          }
        }
      });
    });
  };

  const handleClearList = () => {
    if (!activeClassId) {
      showToast("Không xác định được lớp học hiện tại.", "warning");
      return;
    }

    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách chăm sóc của lớp hiện tại? Ghi chú đã lưu sẽ bị xóa.")) {
      chrome.storage.local.get("careStudents", (res) => {
        const allCareStudents = (res.careStudents || {}) as Record<string, CareStudent[]>;
        delete allCareStudents[activeClassId];
        chrome.storage.local.set({ careStudents: allCareStudents }, () => {
          setCareStudents([]);
          showToast("Đã xóa danh sách lớp.", "success");
        });
      });
    }
  };

  const handleExportExcel = () => {
    if (careStudents.length === 0) {
      showToast("Không có dữ liệu để xuất.", "warning");
      return;
    }

    const data = careStudents.map((st, index) => ({
      "STT": index + 1,
      "Mã SV": st.studentId || "",
      "Họ và Tên": st.studentName || "",
      "Môn học": st.subjectName || "",
      "Ngày học": st.studyDate || "",
      "Ghi chú chăm sóc": st.note || ""
    }));

    const columnWidths = [
      { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 40 }
    ];

    const fileName = `Danh_sach_cham_soc_lop_${activeClassId || "unknown"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportToExcel(data, "Cham_soc_sinh_vien", fileName, columnWidths);
  };

  const handleCopyReport = () => {
    const activeNotes = careStudents.filter(st => st.note && st.note.trim().length > 0);
    if (activeNotes.length === 0) {
      showToast("Không có ghi chú chăm sóc nào được tìm thấy.", "warning");
      return;
    }

    const reportText = activeNotes.map(st => `${st.studentName}: ${st.note}`).join("\n");

    navigator.clipboard.writeText(reportText).then(() => {
      showToast("Đã copy báo cáo dạng text vào clipboard!", "success");
    }).catch(err => {
      console.error("Không thể copy báo cáo:", err);
      showToast("Lỗi sao chép vào clipboard: " + err.message, "error");
    });
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-3.5 overflow-hidden">
      {/* Header banner and Copy button */}
      <div className="flex justify-between items-center gap-2 select-none">
        <div 
          className={`flex-1 text-xs p-2 rounded-md border-l-4 font-medium transition-all ${
            statusType === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
            statusType === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
            statusType === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
            'bg-slate-100 border-blue-500 text-slate-700'
          }`}
        >
          {statusText}
        </div>
        <button
          onClick={handleCopyReport}
          disabled={careStudents.length === 0}
          title="Copy báo cáo nhanh"
          className="w-9 h-9 min-w-[36px] bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center rounded-md font-medium shadow-md disabled:opacity-50 active:scale-95 duration-100"
        >
          📋
        </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 overflow-y-auto border border-slate-300 rounded-md bg-white">
        {careStudents.length > 0 ? (
          <table className="w-full text-xs text-slate-600 text-left border-collapse">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-2 text-center w-10">STT</th>
                <th className="py-2.5 px-3 min-w-[160px]">Ghi chú chăm sóc</th>
                <th className="py-2.5 px-2 w-20">Mã SV</th>
                <th className="py-2.5 px-3 w-32">Họ và Tên</th>
                <th className="py-2.5 px-3 w-36">Môn học</th>
                <th className="py-2.5 px-2 w-24">Ngày học</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {careStudents.map((st, index) => (
                <tr key={`${st.studentId}_${st.subjectName}_${st.studyDate}`} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2 text-center text-slate-400 font-semibold">{index + 1}</td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      defaultValue={st.note || ""}
                      onBlur={(e) => handleSaveNote(st.studentId, st.subjectName, st.studyDate, e.target.value.trim())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="Nhập thông tin sau khi liên hệ..."
                      className="w-full py-1 px-2 border border-slate-300 hover:border-slate-400 focus:border-blue-500 rounded bg-white font-medium text-slate-700 placeholder:text-slate-350 focus:outline-none transition-colors"
                    />
                  </td>
                  <td className="py-2 px-2 font-bold text-slate-700">{st.studentId}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{st.studentName}</td>
                  <td className="py-2 px-3 text-slate-500 truncate max-w-[120px]" title={st.subjectName}>{st.subjectName || "-"}</td>
                  <td className="py-2 px-2 text-slate-500">{st.studyDate || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400 select-none">
            <span className="text-3xl mb-2">📞</span>
            <span className="text-sm font-bold text-slate-500">Chưa có dữ liệu chăm sóc</span>
            <span className="text-[11px] text-slate-400 text-center max-w-[280px] mt-1 leading-normal">
              Hãy mở trang Chăm sóc sinh viên trên LMS (đường dẫn /class/*/take-care) và bấm "Quét Dữ Liệu Chăm Sóc".
            </span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex justify-between items-center select-none pt-1">
        <button
          onClick={handleClearList}
          className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md text-xs font-bold transition-colors active:scale-95 duration-100"
        >
          ❌ Xóa Danh Sách
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleScanCare}
            disabled={isScanning}
            className="py-1.5 px-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-md text-xs font-bold shadow-md transition-all active:scale-95 duration-100"
          >
            <span>📥 Quét Dữ Liệu Chăm Sóc</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={careStudents.length === 0}
            className="py-1.5 px-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-md text-xs font-bold shadow-md transition-all disabled:opacity-50 active:scale-95 duration-100"
          >
            <span>📊 Xuất Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
