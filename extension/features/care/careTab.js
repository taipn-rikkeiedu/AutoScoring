// features/care/careTab.js - Controller for Student Care tab
import { TabController } from '../../core/tabController.js';
import { SupabaseService } from '../../services/supabaseService.js';
import { exportToExcel } from '../../core/excelExporter.js';
import { CareRenderer } from './careRenderer.js';

export class CareTab extends TabController {
  constructor(context) {
    super(context);
    this.currentClassId = null;
    this.students = [];
    this.renderer = new CareRenderer(this);
    this.initialize();
  }

  initElements() {
    this.statusBanner = document.getElementById("care-status-banner");
    this.tableEl = document.getElementById("care-table-el");
    this.listBody = document.getElementById("care-list-body");
    this.emptyState = document.getElementById("care-empty-state");
    
    this.clearBtn = document.getElementById("clear-care-btn");
    this.scanBtn = document.getElementById("scan-care-btn");
    this.copyBtn = document.getElementById("copy-care-text-btn");
    this.exportBtn = document.getElementById("export-care-csv-btn");
  }

  bindEvents() {
    this.scanBtn.addEventListener("click", () => this.triggerPageScan());
    this.clearBtn.addEventListener("click", () => this.clearList());
    this.copyBtn.addEventListener("click", () => this.copyQuickReport());
    this.exportBtn.addEventListener("click", () => this.exportExcel());
  }

  async triggerPageScan() {
    this.statusBanner.innerHTML = "🔍 Đang tìm kiếm thông tin sinh viên trên trang...";
    this.statusBanner.style.backgroundColor = "#f1f5f9";
    this.statusBanner.style.color = "#334155";
    this.statusBanner.style.borderLeftColor = "#3b82f6";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        this.statusBanner.innerHTML = "❌ Lỗi: Không thể truy cập tab hiện tại.";
        this.statusBanner.style.backgroundColor = "#fef2f2";
        this.statusBanner.style.color = "#991b1b";
        this.statusBanner.style.borderLeftColor = "#ef4444";
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url || "";
      const match = url.match(/\/class\/(\d+)\/take-care/);

      if (!match) {
        this.statusBanner.innerHTML = "💡 Hãy mở trang Chăm sóc học viên trên LMS (đường dẫn dạng /class/*/take-care) để quét.";
        this.statusBanner.style.backgroundColor = "#fffbeb";
        this.statusBanner.style.color = "#b45309";
        this.statusBanner.style.borderLeftColor = "#f59e0b";
        return;
      }

      this.currentClassId = match[1];

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['core/careScraper.js']
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          this.statusBanner.innerHTML = "❌ Không thể quét trang: " + chrome.runtime.lastError.message;
          this.statusBanner.style.backgroundColor = "#fef2f2";
          this.statusBanner.style.color = "#991b1b";
          this.statusBanner.style.borderLeftColor = "#ef4444";
          return;
        }

        if (results && results[0] && results[0].result) {
          const scraped = results[0].result;
          if (scraped.length > 0) {
            this.loadAndMergeStudents(scraped);
          } else {
            this.statusBanner.innerHTML = "❓ Không tìm thấy danh sách học viên chăm sóc trên trang.";
            this.statusBanner.style.backgroundColor = "#fffbeb";
            this.statusBanner.style.color = "#b45309";
            this.statusBanner.style.borderLeftColor = "#f59e0b";
          }
        }
      });
    });
  }

  loadAndMergeStudents(scraped) {
    chrome.storage.local.get("careStudents", (res) => {
      const allCareStudents = res.careStudents || {};
      const classStudents = allCareStudents[this.currentClassId] || [];

      this.students = scraped.map(newSt => {
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

      // Merge new/scraped entries into classStudents instead of completely overwriting it,
      // so we don't lose care logs for other dates/subjects.
      this.students.forEach(newSt => {
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

      allCareStudents[this.currentClassId] = classStudents;
      chrome.storage.local.set({ careStudents: allCareStudents }, () => {
        this.statusBanner.innerHTML = `✅ Đã quét thành công ${this.students.length} học viên từ trang.`;
        this.statusBanner.style.backgroundColor = "#f0fdf4";
        this.statusBanner.style.color = "#166534";
        this.statusBanner.style.borderLeftColor = "#22c55e";
        this.renderList();
      });
    });
  }

  renderList() {
    this.renderer.renderList();
  }

  saveStudentNote(studentId, subjectName, studyDate, noteValue) {
    chrome.storage.local.get("careStudents", (res) => {
      const allCareStudents = res.careStudents || {};
      const classStudents = allCareStudents[this.currentClassId] || [];

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
        const currentSt = this.students.find(st => 
          st.studentId === studentId &&
          (st.subjectName || "") === (subjectName || "") &&
          (st.studyDate || "") === (studyDate || "")
        );
        if (currentSt) {
          classStudents.push({
            studentId: studentId,
            studentName: currentSt.studentName,
            subjectName: subjectName || "",
            studyDate: studyDate || "",
            note: noteValue
          });
          studentName = currentSt.studentName;
        }
      }

      const localSt = this.students.find(st => 
        st.studentId === studentId &&
        (st.subjectName || "") === (subjectName || "") &&
        (st.studyDate || "") === (studyDate || "")
      );
      if (localSt) {
        localSt.note = noteValue;
        if (!studentName) studentName = localSt.studentName;
      }

      allCareStudents[this.currentClassId] = classStudents;
      chrome.storage.local.set({ careStudents: allCareStudents }, async () => {
        window.showToast("Đã lưu ghi chú thành công!", "success");
        if (SupabaseService.isEnabled(this.context.config) && studentName) {
          try {
            await SupabaseService.upsertCareNote(
              this.context.config, this.currentClassId, studentId, studentName, subjectName || "", studyDate || "", noteValue
            );
          } catch (syncErr) {
            console.warn("Lỗi đồng bộ Supabase:", syncErr);
            window.showToast("Đồng bộ ghi chú lên Cloud thất bại: " + syncErr.message, "warning");
          }
        }
      });
    });
  }

  clearList() {
    if (!this.currentClassId) {
      window.showToast("Không xác định được lớp học hiện tại.", "warning");
      return;
    }

    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách chăm sóc của lớp hiện tại? Ghi chú đã lưu sẽ bị xóa.")) {
      chrome.storage.local.get("careStudents", (res) => {
        const allCareStudents = res.careStudents || {};
        delete allCareStudents[this.currentClassId];
        chrome.storage.local.set({ careStudents: allCareStudents }, () => {
          this.students = [];
          this.renderList();
          window.showToast("Đã xóa danh sách lớp.", "success");
        });
      });
    }
  }

  loadClassData(classId) {
    this.currentClassId = classId;
    chrome.storage.local.get("careStudents", async (res) => {
      const allCareStudents = res.careStudents || {};
      let localStudents = allCareStudents[classId] || [];
      
      if (SupabaseService.isEnabled(this.context.config)) {
        this.statusBanner.innerHTML = `☁️ Đang đồng bộ dữ liệu chăm sóc từ Supabase...`;
        this.statusBanner.style.backgroundColor = "#eff6ff";
        this.statusBanner.style.color = "#1e40af";
        this.statusBanner.style.borderLeftColor = "#3b82f6";
        
        try {
          const cloudNotes = await SupabaseService.pullCareNotes(this.context.config, classId);
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
            await new Promise(resolve => chrome.storage.local.set({ careStudents: allCareStudents }, resolve));
          }
        } catch (err) {
          console.warn("Supabase pullCareNotes failed:", err);
          window.showToast("Đồng bộ ghi chú từ Cloud thất bại: " + err.message, "warning");
        }
      }
      
      this.students = localStudents;
      this.renderList();
      
      if (this.students.length > 0) {
        this.statusBanner.innerHTML = `📋 Đã tải danh sách chăm sóc của lớp ${classId}.`;
        this.statusBanner.style.backgroundColor = "#f0fdf4";
        this.statusBanner.style.color = "#166534";
        this.statusBanner.style.borderLeftColor = "#22c55e";
      } else {
        this.statusBanner.innerHTML = "🔍 Sẵn sàng quét danh sách chăm sóc sinh viên từ trang...";
        this.statusBanner.style.backgroundColor = "#f1f5f9";
        this.statusBanner.style.color = "#334155";
        this.statusBanner.style.borderLeftColor = "#3b82f6";
      }
    });
  }

  detectActiveTabAndLoad() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const url = tabs[0].url || "";
        const match = url.match(/\/class\/(\d+)\/take-care/);
        if (match) {
          this.loadClassData(match[1]);
        } else {
          this.renderList();
        }
      }
    });
  }

  exportExcel() {
    if (this.students.length === 0) {
      window.showToast("Không có dữ liệu để xuất.", "warning");
      return;
    }

    const data = this.students.map((st, index) => {
      return {
        "STT": index + 1,
        "Mã SV": st.studentId || "",
        "Họ và Tên": st.studentName || "",
        "Môn học": st.subjectName || "",
        "Ngày học": st.studyDate || "",
        "Ghi chú chăm sóc": st.note || ""
      };
    });

    const max_widths = [
      { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 40 }
    ];

    const fileName = `Danh_sach_cham_soc_lop_${this.currentClassId || "unknown"}_${new Date().toISOString().slice(0,10)}.xlsx`;
    exportToExcel(data, "Cham_soc_sinh_vien", fileName, max_widths);
  }

  copyQuickReport() {
    // Lọc ra các sinh viên có ghi chú chăm sóc
    const activeNotes = this.students.filter(st => st.note && st.note.trim().length > 0);
    if (activeNotes.length === 0) {
      window.showToast("Không có ghi chú chăm sóc nào được tìm thấy.", "warning");
      return;
    }

    const reportLines = activeNotes.map(st => `${st.studentName}: ${st.note}`);

    const reportText = reportLines.join("\n");

    navigator.clipboard.writeText(reportText).then(() => {
      window.showToast("Đã copy báo cáo dạng text vào clipboard!", "success");
    }).catch(err => {
      console.error("Không thể copy báo cáo:", err);
      window.showToast("Lỗi sao chép vào clipboard: " + err.message, "error");
    });
  }
}
