// features/care/careRenderer.js - Renders student care rows in CareTab

export class CareRenderer {
  constructor(tab) {
    this.tab = tab;
  }

  renderList() {
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

    this.tab.students.forEach((st, index) => {
      const tr = document.createElement("tr");

      // Cột 1: STT
      const tdIndex = document.createElement("td");
      tdIndex.style.textAlign = "center";
      tdIndex.textContent = index + 1;
      tr.appendChild(tdIndex);

      // Cột 2: Ghi chú
      const tdNote = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "care-note-input";
      input.value = st.note || "";
      input.placeholder = "Nhập thông tin sau khi liên hệ...";
      
      input.addEventListener("change", (e) => {
        this.tab.saveStudentNote(st.studentId, st.subjectName || "", st.studyDate || "", e.target.value.trim());
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

      // Cột 5: Môn học
      const tdSubject = document.createElement("td");
      tdSubject.style.color = "#475569";
      tdSubject.style.fontSize = "0.85rem";
      tdSubject.textContent = st.subjectName || "-";
      tr.appendChild(tdSubject);

      // Cột 6: Ngày học
      const tdDate = document.createElement("td");
      tdDate.style.color = "#475569";
      tdDate.style.fontSize = "0.85rem";
      tdDate.textContent = st.studyDate || "-";
      tr.appendChild(tdDate);

      fragment.appendChild(tr);
    });

    this.tab.listBody.appendChild(fragment);
  }
}
