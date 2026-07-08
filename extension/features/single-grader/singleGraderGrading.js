// features/single-grader/singleGraderGrading.js - Grading logic flow for Single Grader
import { GitHubService } from '../../services/githubService.js';
import { AIService } from '../../services/aiService.js';
import { parseScore, DEFAULT_CRITERIA } from '../../core/utils.js';
import { SupabaseService } from '../../services/supabaseService.js';

export class SingleGraderGrading {
  constructor(tab) {
    this.tab = tab;
    this.defaultCriteria = DEFAULT_CRITERIA;
  }

  async gradeSingleSubmission() {
    const repoUrl = this.tab.repoUrlInput.value.trim();
    const chapter = this.tab.chapterSelect.value;
    const session = this.tab.sessionSelect.value;
    const assignmentName = this.tab.assignmentSelect.value;

    if (!repoUrl) {
      window.showToast("Vui lòng nhập GitHub Repository URL.", "warning");
      return;
    }
    if (!chapter || !session || !assignmentName) {
      window.showToast("Vui lòng chọn đầy đủ Chương, Session và Bài tập.", "warning");
      return;
    }

    this.tab.gradeBtn.disabled = true;
    this.tab.renderer.clearResults();
    this.tab.statusBox.style.display = "flex";

    try {
      const template = this.tab.context.exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
      if (!template || !template.assignment) {
        throw new Error("Mẫu bài tập thiếu nội dung đề bài.");
      }

      const activeCriteria = template.criteria && template.criteria.trim().length > 0
        ? template.criteria
        : this.defaultCriteria;

      const github = new GitHubService(this.tab.context.config.githubToken, this.tab.context.config.graderIgnoreItems);
      const repoData = await github.getRepoContents(repoUrl, (msg) => {
        this.tab.statusMessage.innerText = msg;
      });

      this.tab.statusMessage.innerText = "AI đang thực hiện chấm điểm...";
      const ai = new AIService(this.tab.context.config);
      const report = await ai.generateGradingReport(template.assignment, activeCriteria, repoData.content);

      this.tab.statusBox.style.display = "none";

      const score = parseScore(report);
      if (!score) {
        throw new Error("AI không trả về điểm số hợp lệ hoặc sai định dạng mẫu phản hồi.");
      }

      this.tab.renderer.renderResults(score, report, repoData.fileList);

      if (this.tab.activeStudent) {
        const studentId = this.tab.activeStudent.studentId;
        chrome.storage.local.get("classStudentList", (res) => {
          const studentList = res.classStudentList || [];
          const student = studentList.find(st => st.studentId === studentId);
          if (student) {
            if (!student.submissions) student.submissions = {};
            
            const key = `${chapter}_${session}_${assignmentName}`;
            student.submissions[key] = {
              score,
              report,
              githubUrl: repoUrl,
              gradedAt: new Date().toISOString()
            };

            chrome.storage.local.set({ classStudentList: studentList }, async () => {
              window.showToast(`Đã lưu kết quả chấm của học viên ${student.studentName} vào CSDL!`, "success");
              
              if (SupabaseService.isEnabled(this.tab.context.config)) {
                try {
                  const classId = this.tab.currentClassId || "unknown";
                  await SupabaseService.upsertSubmission(
                    this.tab.context.config,
                    classId,
                    student.studentId,
                    student.studentName,
                    chapter,
                    session,
                    assignmentName,
                    repoUrl,
                    score,
                    report
                  );
                } catch (syncErr) {
                  console.warn("Lỗi đồng bộ Supabase:", syncErr);
                  window.showToast("Đồng bộ kết quả lên Cloud thất bại: " + syncErr.message, "warning");
                }
              }
              if (this.tab.context.classListTab) {
                this.tab.context.classListTab.renderClassList();
              }
            });
          }
        });
      }
      this.tab.updateContentScriptCache(score, report, repoData.fileList);
    } catch (err) {
      console.error(err);
      window.showToast(`Lỗi: ${err.message}`, "error");
      this.tab.statusBox.style.display = "none";
    } finally {
      this.tab.gradeBtn.disabled = false;
    }
  }
}
