// features/class-list/classListTab.js - Controller for Class List tab
import { TabController } from '../../core/tabController.js';
import { SupabaseService } from '../../services/supabaseService.js';
import { ClassListRenderer } from './classListRenderer.js';
import { ClassListGrading } from './classListGrading.js';

export class ClassListTab extends TabController {
  constructor(context) {
    super(context);
    this.currentClassId = null;
    this.students = [];
    this.renderer = new ClassListRenderer(this);
    this.grading = new ClassListGrading(this);
    this.initialize();
  }

  initElements() {
    this.statusBanner = document.getElementById("class-status-banner");
    this.tableEl = document.getElementById("class-table-el");
    this.listBody = document.getElementById("class-list-body");
    this.emptyState = document.getElementById("class-empty-state");
    
    this.clearBtn = document.getElementById("clear-class-btn");
    this.scanBtn = document.getElementById("scan-class-btn");
    this.exportBtn = document.getElementById("export-class-csv-btn");
  }

  bindEvents() {
    this.scanBtn.addEventListener("click", () => this.triggerClassScan());
    this.clearBtn.addEventListener("click", () => this.clearClassList());
    this.exportBtn.addEventListener("click", () => this.exportClassListExcel());
  }

  triggerClassScan() {
    this.statusBanner.innerHTML = "🔍 Đang tìm kiếm danh sách học viên trên trang...";
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
      const match = url.match(/\/homework-checking\/(\d+)/);

      if (!match) {
        this.statusBanner.innerHTML = "💡 Hãy mở trang danh sách bài nộp của lớp trên LMS (đường dẫn dạng /homework-checking/*) để quét.";
        this.statusBanner.style.backgroundColor = "#fffbeb";
        this.statusBanner.style.color = "#b45309";
        this.statusBanner.style.borderLeftColor = "#f59e0b";
        return;
      }

      this.currentClassId = match[1];

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['core/classListScraper.js']
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
            this.loadAndMergeClassStudents(scraped);
          } else {
            this.statusBanner.innerHTML = "❓ Không tìm thấy danh sách học viên nào trên trang.";
            this.statusBanner.style.backgroundColor = "#fffbeb";
            this.statusBanner.style.color = "#b45309";
            this.statusBanner.style.borderLeftColor = "#f59e0b";
          }
        }
      });
    });
  }

  loadAndMergeClassStudents(scraped) {
    chrome.storage.local.get("classStudentList", (res) => {
      const existingList = res.classStudentList || [];
      
      this.students = scraped.map(newSt => {
        const existing = existingList.find(st => st.submissionUrl === newSt.submissionUrl || (st.studentId && st.studentId !== 'N/A' && st.studentId === newSt.studentId));
        return {
          studentId: newSt.studentId,
          studentName: newSt.studentName,
          submissionUrl: newSt.submissionUrl,
          dbId: newSt.dbId || (existing ? (existing.dbId || '') : ''),
          lmsStatus: newSt.lmsStatus || (existing ? (existing.lmsStatus || '') : ''),
          submittedCount: newSt.submittedCount !== undefined ? newSt.submittedCount : (existing ? (existing.submittedCount || 0) : 0),
          completedCount: newSt.completedCount !== undefined ? newSt.completedCount : (existing ? (existing.completedCount || 0) : 0),
          githubUrl: existing ? (existing.githubUrl || '') : '',
          score: existing ? existing.score : null,
          comments: existing ? existing.comments : null,
          assignmentName: existing ? (existing.assignmentName || '') : '',
          submissions: existing ? (existing.submissions || {}) : {}
        };
      });

      chrome.storage.local.set({ classStudentList: this.students }, () => {
        this.statusBanner.innerHTML = `✅ Đã quét thành công ${this.students.length} học viên từ trang lớp học.`;
        this.statusBanner.style.backgroundColor = "#f0fdf4";
        this.statusBanner.style.color = "#166534";
        this.statusBanner.style.borderLeftColor = "#22c55e";
        this.renderClassList();
      });
    });
  }

  renderClassList() {
    this.renderer.renderClassList();
  }

  clearClassList() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách học viên lớp học hiện tại? Dữ liệu điểm và báo cáo đã lưu sẽ không bị mất trong Chrome Storage.")) {
      chrome.storage.local.remove("classStudentList", () => {
        this.students = [];
        this.renderClassList();
        window.showToast("Đã xóa danh sách học viên lớp học.", "success");
      });
    }
  }

  loadClassListData(classId) {
    this.currentClassId = classId;
    chrome.storage.local.get("classStudentList", async (res) => {
      let localStudents = res.classStudentList || [];
      
      if (SupabaseService.isEnabled(this.context.config)) {
        this.statusBanner.innerHTML = `☁️ Đang đồng bộ kết quả chấm từ Supabase...`;
        this.statusBanner.style.backgroundColor = "#eff6ff";
        this.statusBanner.style.color = "#1e40af";
        this.statusBanner.style.borderLeftColor = "#3b82f6";
        
        try {
          const cloudSubs = await SupabaseService.pullSubmissions(this.context.config, classId);
          if (cloudSubs && cloudSubs.length > 0) {
            cloudSubs.forEach(sub => {
              let localSt = localStudents.find(st => st.studentId === sub.student_id);
              if (!localSt) {
                localSt = {
                  studentId: sub.student_id,
                  studentName: sub.student_name,
                  submissionUrl: sub.github_url || "",
                  submissions: {}
                };
                localStudents.push(localSt);
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
            await new Promise(resolve => chrome.storage.local.set({ classStudentList: localStudents }, resolve));
          }
        } catch (err) {
          console.warn("Supabase pullSubmissions failed:", err);
          window.showToast("Đồng bộ kết quả từ Cloud thất bại: " + err.message, "warning");
        }
      }
      
      this.students = localStudents;
      this.renderClassList();
      
      if (this.students.length > 0) {
        this.statusBanner.innerHTML = `📋 Đã tải danh sách lớp ${classId}.`;
        this.statusBanner.style.backgroundColor = "#f0fdf4";
        this.statusBanner.style.color = "#166534";
        this.statusBanner.style.borderLeftColor = "#22c55e";
      } else {
        this.statusBanner.innerHTML = "🔍 Sẵn sàng quét danh sách học viên từ trang...";
        this.statusBanner.style.backgroundColor = "#f1f5f9";
        this.statusBanner.style.color = "#334155";
        this.statusBanner.style.borderLeftColor = "#3b82f6";
      }
    });
  }

  exportClassListExcel() {
    this.renderer.exportClassListExcel();
  }
}
