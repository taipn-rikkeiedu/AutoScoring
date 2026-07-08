// features/class-list/classListRenderer.js - UI rendering logic for Class List tab
import { exportToExcel } from '../../core/excelExporter.js';

export class ClassListRenderer {
  constructor(tab) {
    this.tab = tab;
  }

  renderClassList() {
    if (!this.tab.listBody) return;
    this.tab.listBody.innerHTML = "";

    if (this.tab.students.length === 0) {
      this.tab.tableEl.style.display = "none";
      this.tab.emptyState.style.display = "block";
      this.tab.exportBtn.disabled = true;
      return;
    }

    this.tab.tableEl.style.display = "table";
    this.tab.emptyState.style.display = "none";
    this.tab.exportBtn.disabled = false;

    const fragment = document.createDocumentFragment();

    this.tab.students.forEach((st) => {
      const tr = document.createElement("tr");

      // Mã SV
      const tdId = document.createElement("td");
      tdId.style.fontWeight = "600";
      tdId.style.color = "#475569";
      tdId.textContent = st.studentId;
      tr.appendChild(tdId);

      // Họ và Tên
      const tdName = document.createElement("td");
      tdName.style.fontWeight = "600";
      tdName.style.color = "#1e293b";
      tdName.textContent = st.studentName;
      tr.appendChild(tdName);

      // Trạng thái LMS
      const tdStatus = document.createElement("td");
      tdStatus.style.textAlign = "center";
      const statusBadge = document.createElement("span");
      statusBadge.className = `badge-status lms-status`;
      if (st.lmsStatus) {
        const lower = st.lmsStatus.toLowerCase();
        if (lower.includes("online") || lower.includes("trực tuyến") || lower.includes("hoạt động")) {
          statusBadge.classList.add("success");
        } else if (lower.includes("offline") || lower.includes("chưa kích hoạt")) {
          statusBadge.classList.add("error");
        }
      }
      statusBadge.textContent = st.lmsStatus || "Không rõ";
      tdStatus.appendChild(statusBadge);
      tr.appendChild(tdStatus);

      // Bài hoàn thành / Đã nộp
      const tdStats = document.createElement("td");
      tdStats.style.textAlign = "center";
      
      const finished = st.completedCount || 0;
      const submitted = st.submittedCount || 0;
      
      const statsBadge = document.createElement("span");
      statsBadge.style.fontWeight = "700";
      statsBadge.style.fontSize = "0.85rem";
      statsBadge.style.padding = "4px 8px";
      statsBadge.style.borderRadius = "4px";
      statsBadge.style.backgroundColor = "#f1f5f9";
      statsBadge.style.color = "#475569";
      
      statsBadge.textContent = `${finished} / ${submitted}`;
      tdStats.appendChild(statsBadge);
      tr.appendChild(tdStats);

      // Hành động
      const tdAction = document.createElement("td");
      tdAction.style.textAlign = "center";
      
      const actionBtn = document.createElement("button");
      actionBtn.className = "btn-primary table-action-btn";
      actionBtn.style.padding = "4px 8px";
      actionBtn.style.fontSize = "0.75rem";
      
      if (st.submissionUrl) {
        actionBtn.innerHTML = "🔗 Chấm Bài";
        actionBtn.addEventListener("click", () => {
          this.tab.grading.switchToSingleGraderForStudent(st);
        });
      } else {
        actionBtn.innerHTML = "❌ Không có link";
        actionBtn.disabled = true;
      }
      
      tdAction.appendChild(actionBtn);
      tr.appendChild(tdAction);

      fragment.appendChild(tr);
    });

    this.tab.listBody.appendChild(fragment);
  }

  exportClassListExcel() {
    if (this.tab.students.length === 0) {
      window.showToast("Không có dữ liệu để xuất.", "warning");
      return;
    }

    const templates = this.tab.context.exerciseTemplates || {};
    const exercisesList = [];
    for (const chap in templates) {
      for (const sess in templates[chap]) {
        for (const name in templates[chap][sess]) {
          exercisesList.push({ key: `${chap}_${sess}_${name}`, name: `${sess} - ${name}` });
        }
      }
    }

    const data = this.tab.students.map((st) => {
      const row = {
        "Mã SV": st.studentId || "",
        "Họ và Tên": st.studentName || "",
        "LMS Status": st.lmsStatus || "",
        "Bài hoàn thành": st.completedCount || 0,
        "Bài đã nộp": st.submittedCount || 0
      };

      exercisesList.forEach(ex => {
        const sub = st.submissions?.[ex.key];
        row[ex.name] = sub ? sub.score : "Chưa chấm";
      });

      return row;
    });

    const max_widths = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    exercisesList.forEach(() => {
      max_widths.push({ wch: 20 });
    });

    const fileName = `Bang_diem_lop_${this.tab.currentClassId || "unknown"}_${new Date().toISOString().slice(0,10)}.xlsx`;
    exportToExcel(data, "Bang_diem", fileName, max_widths);
  }
}
