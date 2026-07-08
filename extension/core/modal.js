// core/modal.js - Manages the report preview modal and copy clipboard interactions

export class ReportModal {
  constructor(context) {
    this.context = context;
    this.reportModal = document.getElementById("report-modal");
    this.closeModalBtn = document.getElementById("close-modal-btn");
    this.modalReportTitle = document.getElementById("modal-report-title");
    this.modalScoreVal = document.getElementById("modal-score-val");
    this.modalReportHtml = document.getElementById("modal-report-html");
    this.copyReportBtn = document.getElementById("copy-report-btn");
    this.copySingleReportBtn = document.getElementById("copy-single-report-btn");
    this.initEvents();
  }

  initEvents() {
    this.closeModalBtn.addEventListener("click", () => {
      this.reportModal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
      if (e.target === this.reportModal) {
        this.reportModal.style.display = "none";
      }
    });

    this.copyReportBtn.addEventListener("click", () => {
      if (!this.context.activeReportMarkdown) return;
      navigator.clipboard.writeText(this.context.activeReportMarkdown).then(() => {
        const origHTML = this.copyReportBtn.innerHTML;
        this.copyReportBtn.innerHTML = "✅ Đã sao chép!";
        this.copyReportBtn.disabled = true;
        setTimeout(() => {
          this.copyReportBtn.innerHTML = origHTML;
          this.copyReportBtn.disabled = false;
        }, 1500);
      }).catch(err => {
        console.error(err);
        window.showToast("Không thể sao chép báo cáo.", "error");
      });
    });

    this.copySingleReportBtn.addEventListener("click", () => {
      if (!this.context.activeSingleReportMarkdown) return;
      navigator.clipboard.writeText(this.context.activeSingleReportMarkdown).then(() => {
        const origHTML = this.copySingleReportBtn.innerHTML;
        this.copySingleReportBtn.innerHTML = "✅ Đã sao chép!";
        this.copySingleReportBtn.disabled = true;
        setTimeout(() => {
          this.copySingleReportBtn.innerHTML = origHTML;
          this.copySingleReportBtn.disabled = false;
        }, 1500);
      }).catch(err => {
        console.error(err);
        window.showToast("Không thể sao chép báo cáo.", "error");
      });
    });
  }

  showReportModal(sub) {
    if (!sub || !sub.report) return;
    this.context.activeReportMarkdown = sub.report;
    this.modalReportTitle.innerText = sub.exerciseName;
    this.modalScoreVal.innerText = `${sub.score || '--'} / 100`;

    const sVal = parseFloat(sub.score);
    if (sVal >= 80) this.modalScoreVal.style.background = "linear-gradient(135deg, #16a34a, #15803d)";
    else if (sVal >= 50) this.modalScoreVal.style.background = "linear-gradient(135deg, #d97706, #b45309)";
    else this.modalScoreVal.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";

    if (typeof marked !== 'undefined') {
      this.modalReportHtml.innerHTML = marked.parse(sub.report);
    } else {
      this.modalReportHtml.innerText = sub.report;
    }
    this.reportModal.style.display = "block";
  }
}
