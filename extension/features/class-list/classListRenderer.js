// features/class-list/classListRenderer.js - UI rendering logic for Class List tab
import { exportToExcel } from '../../core/excelExporter.js';

export class ClassListRenderer {
  constructor(tab) {
    this.tab = tab;
  }

  renderClassList() {
    if (!this.tab.listBody) return;
    
    const studentListRaw = this.tab.students || [];

    if (studentListRaw.length === 0) {
      this.tab.tableEl.style.display = 'none';
      this.tab.emptyState.style.display = 'block';
      this.tab.exportBtn.disabled = true;
      return;
    }

    // Sắp xếp: Đang chờ kiểm tra (Priority 1) -> Chưa hoàn thành (Priority 2) -> Hoàn thành (Priority 3)
    const studentList = [...studentListRaw].sort((a, b) => {
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

    this.tab.tableEl.style.display = 'table';
    this.tab.emptyState.style.display = 'none';
    this.tab.exportBtn.disabled = false;
    this.tab.listBody.innerHTML = '';

    const fragment = document.createDocumentFragment();

    const total = studentList.length;
    let completedCount = 0;
    let notCompletedCount = 0;
    let pendingCount = 0;
    let gradedCount = 0;

    studentList.forEach(st => {
      const statusText = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : '';
      const isCompleted = statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA');
      const isPending = statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ') || statusText.includes('KIỂM TRA');
      const isNotCompleted = statusText.includes('CHƯA HOÀN THÀNH') || (!isCompleted && !isPending && statusText.length > 0);

      if (isCompleted) {
        completedCount++;
      } else if (isPending) {
        pendingCount++;
      } else {
        notCompletedCount++;
      }

      // Check if st has any graded submissions
      let score = st.score;
      if (st.submissions) {
        let latestGraded = null;
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
        }
      }

      if (isCompleted || isNotCompleted || (score !== null && score !== undefined)) {
        gradedCount++;
      }
    });

    this.tab.statusBanner.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 5px;">📊 Thống kê lớp học: Sĩ số <b>${total}</b> | Đã chấm <b>${gradedCount}</b></div>
      <div class="stats-grid">
        <span class="stats-grid-item">Hoàn thành: <span class="badge-status success" style="font-weight:bold;">${completedCount}</span></span>
        <span class="stats-grid-item">Chưa hoàn thành: <span class="badge-status pending" style="font-weight:bold;">${notCompletedCount}</span></span>
        <span class="stats-grid-item">Chờ kiểm tra: <span class="badge-status warning" style="font-weight:bold;">${pendingCount}</span></span>
      </div>
    `;
    this.tab.statusBanner.style.backgroundColor = "#f8fafc";
    this.tab.statusBanner.style.color = "#1e293b";
    this.tab.statusBanner.style.borderLeftColor = "#3b82f6";

    studentList.forEach((st) => {
      const tr = document.createElement('tr');

      const statusTextForHighlight = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : '';
      const isCompletedForHighlight = statusTextForHighlight.includes('HOÀN THÀNH') && !statusTextForHighlight.includes('CHƯA');
      const isPendingForHighlight = statusTextForHighlight.includes('CHỜ KIỂM TRA') || statusTextForHighlight.includes('ĐANG CHỜ') || statusTextForHighlight.includes('KIỂM TRA');
      const isNotCompletedForHighlight = statusTextForHighlight.includes('CHƯA HOÀN THÀNH') || (!isCompletedForHighlight && !isPendingForHighlight && statusTextForHighlight.length > 0);

      if (isPendingForHighlight) {
        tr.classList.add('row-pending');
      } else if (isNotCompletedForHighlight) {
        tr.classList.add('row-not-completed');
      }

      const handleStudentClick = (e) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'scrollToStudent',
              studentId: st.studentId,
              studentName: st.studentName
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log("Error sending scrollToStudent message:", chrome.runtime.lastError.message);
              }
            });
          }
        });
      };

      // Mã SV
      const tdId = document.createElement('td');
      tdId.style.fontWeight = '600';
      tdId.style.color = '#475569';
      tdId.style.cursor = 'pointer';
      tdId.textContent = st.studentId;
      tdId.addEventListener('click', handleStudentClick);
      tr.appendChild(tdId);

      // Họ và Tên
      const tdName = document.createElement('td');
      const nameLink = document.createElement('a');
      nameLink.href = st.submissionUrl;
      nameLink.target = '_blank';
      nameLink.style.fontWeight = '600';
      nameLink.style.color = '#1e293b';
      nameLink.style.textDecoration = 'none';
      nameLink.style.cursor = 'pointer';
      nameLink.textContent = st.studentName;
      nameLink.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        handleStudentClick(e);
      });
      tdName.appendChild(nameLink);

      if (st.githubUrl) {
        const githubLink = document.createElement('a');
        githubLink.className = 'sub-repo-link';
        githubLink.href = st.githubUrl;
        githubLink.target = '_blank';
        githubLink.textContent = st.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "");
        tdName.appendChild(githubLink);
      }
      tr.appendChild(tdName);

      // Trạng thái LMS
      const tdLmsStatus = document.createElement('td');
      tdLmsStatus.style.textAlign = 'center';
      const lmsBadge = document.createElement('span');
      lmsBadge.className = 'badge-status';

      const statusText = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : 'CHƯA NỘP';
      lmsBadge.textContent = statusText;

      if (statusText.includes('HOÀN THÀNH') && !statusText.includes('CHƯA')) {
        lmsBadge.className += ' success';
      } else if (statusText.includes('CHỜ KIỂM TRA') || statusText.includes('ĐANG CHỜ') || statusText.includes('KIỂM TRA')) {
        lmsBadge.className += ' warning';
      } else {
        lmsBadge.className += ' pending';
      }
      tdLmsStatus.appendChild(lmsBadge);
      tr.appendChild(tdLmsStatus);

      // Bài hoàn thành / Đã nộp
      const tdScore = document.createElement('td');
      tdScore.style.textAlign = 'center';

      const ratioBadge = document.createElement('span');
      ratioBadge.className = 'badge-status';

      const subCount = st.submittedCount || 0;
      const compCount = st.completedCount || 0;
      ratioBadge.textContent = `${compCount} / ${subCount}`;

      if (compCount === subCount && subCount > 0) {
        ratioBadge.className += ' success';
      } else if (compCount < subCount) {
        ratioBadge.className += ' warning';
      } else {
        ratioBadge.className += ' pending';
      }

      // Check if st has any graded submissions
      let score = st.score;
      let report = st.comments;
      if (st.submissions) {
        let latestGraded = null;
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

      if (score !== null && score !== undefined) {
        ratioBadge.title = `Điểm AI: ${score}/100. Click để xem nhận xét chi tiết.`;
        ratioBadge.style.cursor = 'pointer';
        ratioBadge.style.borderBottom = '2px dashed #15803d';

        ratioBadge.addEventListener('click', () => {
          this.tab.context.showReportModal({
            exerciseName: `Báo cáo chấm điểm: ${st.studentName} - ${st.studentId}`,
            score: score,
            report: report
          });
        });

        const aiScoreText = document.createElement('div');
        aiScoreText.style.fontSize = '0.7rem';
        aiScoreText.style.color = '#15803d';
        aiScoreText.style.fontWeight = '600';
        aiScoreText.style.marginTop = '2px';
        aiScoreText.textContent = `AI: ${score}/100`;

        tdScore.appendChild(ratioBadge);
        tdScore.appendChild(aiScoreText);
      } else {
        tdScore.appendChild(ratioBadge);
      }

      tr.appendChild(tdScore);

      // Hành động
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'center';

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-row-action';
      btnDelete.style.borderColor = '#fca5a5';
      btnDelete.style.color = '#ef4444';
      btnDelete.textContent = 'Xóa';
      btnDelete.addEventListener('click', () => {
        if (confirm(`Xóa học viên ${st.studentName} khỏi danh sách?`)) {
          const updated = studentListRaw.filter(item => item.studentId !== st.studentId);
          chrome.storage.local.set({ classStudentList: updated }, () => {
            this.tab.students = updated;
            this.renderClassList();
            if (this.tab.context.singleGraderTab) {
              this.tab.context.singleGraderTab.resolveStudentFromTabUrl();
            }
          });
        }
      });
      tdActions.appendChild(btnDelete);
      tr.appendChild(tdActions);

      fragment.appendChild(tr);
    });

    this.tab.listBody.appendChild(fragment);
  }

  exportClassListExcel() {
    const studentList = this.tab.students || [];
    if (studentList.length === 0) {
      window.showToast("Không có dữ liệu học viên để xuất Excel.", "warning");
      return;
    }

    // Chuẩn bị dữ liệu cho SheetJS
    const data = studentList.map(st => {
      return {
        "Mã SV": st.studentId || "",
        "Họ và Tên": st.studentName || "",
        "Trạng thái LMS": st.lmsStatus || "",
        "Số bài đã nộp": st.submittedCount || 0,
        "Số bài hoàn thành": st.completedCount || 0
      };
    });

    // Định cấu hình độ rộng cột cho đẹp mắt
    const max_widths = [
      { wch: 15 }, // Mã SV
      { wch: 25 }, // Họ Tên
      { wch: 18 }, // Trạng thái LMS
      { wch: 15 }, // Số bài đã nộp
      { wch: 18 }  // Số bài hoàn thành
    ];

    const fileName = `Bao_cao_diem_lop_hoc_${new Date().toISOString().slice(0,10)}.xlsx`;
    exportToExcel(data, "Danh sách lớp", fileName, max_widths);
  }
}
