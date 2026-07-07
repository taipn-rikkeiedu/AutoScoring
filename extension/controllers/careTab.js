import { SupabaseService } from '../supabaseService.js';

export class CareTab {
  constructor(context) {
    this.context = context;
    this.currentClassId = null;
    this.students = [];
    
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.statusBanner = document.getElementById("care-status-banner");
    this.tableEl = document.getElementById("care-table-el");
    this.listBody = document.getElementById("care-list-body");
    this.emptyState = document.getElementById("care-empty-state");
    
    this.clearBtn = document.getElementById("clear-care-btn");
    this.scanBtn = document.getElementById("scan-care-btn");
    this.exportBtn = document.getElementById("export-care-csv-btn");
  }

  bindEvents() {
    this.scanBtn.addEventListener("click", () => this.triggerPageScan());
    this.clearBtn.addEventListener("click", () => this.clearList());
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
        func: scrapeCareStudentsPage
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

      // Trộn để bảo toàn ghi chú cũ
      this.students = scraped.map(newSt => {
        const existing = classStudents.find(st => st.studentId === newSt.studentId);
        return {
          studentId: newSt.studentId,
          studentName: newSt.studentName,
          note: existing ? (existing.note || "") : ""
        };
      });

      // Lưu trữ cấu trúc
      allCareStudents[this.currentClassId] = this.students;
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
    if (!this.listBody) return;
    this.listBody.innerHTML = "";

    if (this.students.length === 0) {
      this.tableEl.style.display = "none";
      this.emptyState.style.display = "block";
      this.exportBtn.disabled = true;
      return;
    }

    this.tableEl.style.display = "table";
    this.emptyState.style.display = "none";
    this.exportBtn.disabled = false;

    const fragment = document.createDocumentFragment();

    this.students.forEach((st, index) => {
      const tr = document.createElement("tr");

      // Cột 1: STT
      const tdIndex = document.createElement("td");
      tdIndex.style.textAlign = "center";
      tdIndex.textContent = index + 1;
      tr.appendChild(tdIndex);

      // Cột 2: Ô nhập ghi chú
      const tdNote = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "care-note-input";
      input.value = st.note || "";
      input.placeholder = "Nhập thông tin sau khi liên hệ...";
      
      // Auto-save khi rời khỏi hoặc nhấn Enter
      input.addEventListener("change", (e) => {
        this.saveStudentNote(st.studentId, e.target.value.trim());
      });

      input.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          e.target.blur();
        }
      });

      tdNote.appendChild(input);
      tr.appendChild(tdNote);

      // Cột 3: Mã SV
      const tdId = document.createElement("td");
      tdId.style.fontWeight = "600";
      tdId.style.color = "#475569";
      tdId.textContent = st.studentId;
      tr.appendChild(tdId);

      // Cột 4: Họ và Tên
      const tdName = document.createElement("td");
      tdName.style.fontWeight = "600";
      tdName.style.color = "#1e293b";
      tdName.textContent = st.studentName;
      tr.appendChild(tdName);

      fragment.appendChild(tr);
    });

    this.listBody.appendChild(fragment);
  }

  saveStudentNote(studentId, noteValue) {
    chrome.storage.local.get("careStudents", (res) => {
      const allCareStudents = res.careStudents || {};
      const classStudents = allCareStudents[this.currentClassId] || [];

      const student = classStudents.find(st => st.studentId === studentId);
      let studentName = "";
      if (student) {
        student.note = noteValue;
        studentName = student.studentName;
      } else {
        const currentSt = this.students.find(st => st.studentId === studentId);
        if (currentSt) {
          classStudents.push({
            studentId: studentId,
            studentName: currentSt.studentName,
            note: noteValue
          });
          studentName = currentSt.studentName;
        }
      }

      // Cập nhật mảng cục bộ
      const localSt = this.students.find(st => st.studentId === studentId);
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
              this.context.config,
              this.currentClassId,
              studentId,
              studentName,
              noteValue
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
              const local = localStudents.find(st => st.studentId === cloud.student_id);
              if (local) {
                local.note = cloud.note || "";
              } else {
                localStudents.push({
                  studentId: cloud.student_id,
                  studentName: cloud.student_name,
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
        "Ghi chú chăm sóc": st.note || ""
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cham_soc_sinh_vien");

    const max_widths = [
      { wch: 8 },
      { wch: 15 },
      { wch: 25 },
      { wch: 40 }
    ];
    worksheet["!cols"] = max_widths;

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Danh_sach_cham_soc_lop_${this.currentClassId || "unknown"}_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Hàm chạy trong tab active để quét học viên
function scrapeCareStudentsPage() {
  const students = [];
  const rows = Array.from(document.querySelectorAll('tr'));
  
  let studentColIndex = -1;
  const headers = Array.from(document.querySelectorAll('th, thead td'));
  headers.forEach((header, index) => {
    const text = header.textContent.trim().toLowerCase();
    if (text.includes('sinh viên') || text.includes('học viên') || text.includes('name') || text.includes('student')) {
      studentColIndex = index;
    }
  });

  if (studentColIndex === -1) {
    studentColIndex = 1;
  }

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length > studentColIndex && cells.length >= 2) {
      const cell = cells[studentColIndex];
      const divs = Array.from(cell.querySelectorAll('div, span, p'));
      let studentName = '';
      let studentId = '';
      
      if (divs.length >= 2) {
        studentName = divs[0].textContent.trim();
        for (let k = 1; k < divs.length; k++) {
          const text = divs[k].textContent.trim();
          if (text && text.length > 0 && !text.includes(studentName)) {
            studentId = text;
            break;
          }
        }
      }
      
      if (!studentName || !studentId) {
        const lines = cell.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        studentName = lines[0] || '';
        studentId = lines[1] || '';
      }
      
      if (studentName && studentId && studentName !== 'Sinh viên' && studentName !== 'Student') {
        students.push({
          studentId: studentId.split('\n')[0].trim(),
          studentName: studentName.split('\n')[0].trim()
        });
      }
    }
  });

  const uniqueList = [];
  const ids = new Set();
  students.forEach(st => {
    if (!ids.has(st.studentId)) {
      ids.add(st.studentId);
      uniqueList.push(st);
    }
  });

  return uniqueList;
}
