// features/auto-grader/autoGraderGrading.js - grading flow execution logic for Bulk Grader
import { GitHubService } from '../../services/githubService.js';
import { AIService } from '../../services/aiService.js';
import { SupabaseService } from '../../services/supabaseService.js';
import { parseScore, extractComment, DEFAULT_CRITERIA, matchStudent } from '../../core/utils.js';

export class AutoGraderGrading {
  constructor(tab) {
    this.tab = tab;
  }

  async gradeSingleRow(index) {
    const sub = this.tab.context.submissions[index];
    if (!sub.githubUrl) {
      window.showToast("Vui lòng điền GitHub URL.", "warning");
      return;
    }
    if (!sub.matchedTemplate) {
      window.showToast("Vui lòng liên kết bài tập với đề bài trong hệ thống.", "warning");
      return;
    }
    
    sub.status = 'downloading';
    sub.score = null;
    sub.report = null;
    sub.error = null;
    
    const badgeEl = document.getElementById(`status-badge-${index}`);
    const btnGrade = document.getElementById(`btn-grade-${index}`);
    
    if (badgeEl) this.tab.renderer.updateStatusBadge(badgeEl, sub);
    if (btnGrade) btnGrade.disabled = true;
    this.tab.updateContentScriptCache();
    
    this.tab.renderer.hideDetailPreview(index);
    
    try {
      const { chapter, session, assignmentName } = sub.matchedTemplate;
      const template = this.tab.context.exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
      if (!template || !template.assignment) {
        throw new Error("Không lấy được nội dung đề bài để thực hiện chấm.");
      }

      const activeCriteria = template.criteria && template.criteria.trim().length > 0
        ? template.criteria
        : DEFAULT_CRITERIA;

      const github = new GitHubService(this.tab.context.config.githubToken, this.tab.context.config.graderIgnoreItems);
      const repoData = await github.getRepoContents(sub.githubUrl, (msg) => {
        sub.status = 'downloading';
        if (badgeEl) badgeEl.textContent = 'Tải code...';
      });

      sub.fileList = repoData.fileList;
      this.tab.renderer.renderFileList(index, repoData.fileList);

      sub.status = 'grading';
      if (badgeEl) this.tab.renderer.updateStatusBadge(badgeEl, sub);
      this.tab.updateContentScriptCache();
      
      const ai = new AIService(this.tab.context.config);
      const report = await ai.generateGradingReport(
        template.assignment, 
        activeCriteria, 
        repoData.content,
        (msg) => {
          if (badgeEl) {
            badgeEl.className = 'badge-status warning';
            badgeEl.textContent = msg;
          }
        }
      );

      const score = parseScore(report);
      sub.status = 'success';
      sub.score = score;
      sub.report = report;

      if (sub.studentName) {
        let pageId = null;
        let pageName = sub.studentName;
        const parenMatch = sub.studentName.match(/(.*?)\s*\((.*?)\)/);
        if (parenMatch) {
          pageName = parenMatch[1].trim();
          pageId = parenMatch[2].trim();
        }

        const res = await new Promise(resolve => chrome.storage.local.get("classStudentList", resolve));
        const studentList = res.classStudentList || [];
        const matched = matchStudent(studentList, null, pageId, pageName, null);

        if (matched) {
          if (!matched.submissions) matched.submissions = {};
          const key = `${chapter}_${session}_${assignmentName}`;
          matched.submissions[key] = {
            score: score,
            report: report,
            githubUrl: sub.githubUrl || "",
            gradedAt: new Date().toISOString()
          };
          
          await new Promise(resolve => chrome.storage.local.set({ classStudentList: studentList }, resolve));
          
          const classIdMatch = (matched.submissionUrl || "").match(/\/homework-checking\/(\d+)/);
          const classId = classIdMatch ? classIdMatch[1] : "unknown";
          if (SupabaseService.isEnabled(this.tab.context.config) && classId !== "unknown") {
            try {
              await SupabaseService.upsertSubmission(
                this.tab.context.config,
                classId,
                matched.studentId,
                matched.studentName,
                chapter,
                session,
                assignmentName,
                sub.githubUrl,
                score,
                report
              );
            } catch (syncErr) {
              console.warn("Lỗi đồng bộ Supabase:", syncErr);
              window.showToast("Đồng bộ kết quả học sinh lên Cloud thất bại: " + syncErr.message, "warning");
            }
          }
          if (this.tab.context.classListTab) {
            this.tab.context.classListTab.renderClassList();
          }
        }
      }
      
      if (badgeEl) this.tab.renderer.updateStatusBadge(badgeEl, sub);
      if (btnGrade) btnGrade.textContent = 'Chấm lại';
      this.tab.updateContentScriptCache();
      this.tab.renderer.showDetailComment(index, extractComment(report));
    } catch (e) {
      console.error(e);
      sub.status = 'error';
      sub.error = e.message;
      if (badgeEl) this.tab.renderer.updateStatusBadge(badgeEl, sub);
      this.tab.updateContentScriptCache();
    } finally {
      if (btnGrade) btnGrade.disabled = false;
    }
  }

  async runBulkGrading() {
    const checkedRows = this.tab.context.submissions.filter(s => s.checked && s.matchedTemplate);
    if (checkedRows.length === 0) return;
    
    this.tab.bulkGradeBtn.disabled = true;
    this.tab.rescanPageBtn.disabled = true;
    
    this.tab.bulkProgressContainer.style.display = 'block';
    this.tab.bulkProgressText.style.display = 'block';
    this.tab.bulkProgressFill.style.width = '0%';
    
    if (this.tab.bulkStudentResolvedBanner) {
      this.tab.bulkStudentResolvedBanner.style.display = 'block';
      this.tab.bulkStudentResolvedInfo.textContent = '-';
    }
    
    let gradedCount = 0;
    const totalToGrade = checkedRows.length;
    
    const stored = await new Promise(resolve => chrome.storage.local.get("classStudentList", resolve));
    const studentList = stored.classStudentList || [];
    
    for (let i = 0; i < this.tab.context.submissions.length; i++) {
      const sub = this.tab.context.submissions[i];
      if (!sub.checked || !sub.matchedTemplate) continue;
      
      let resolvedDisplayName = sub.studentName || 'Chưa rõ học viên';
      if (sub.studentName) {
        const parenMatch = sub.studentName.match(/(.*?)\s*\((.*?)\)/);
        const name = parenMatch ? parenMatch[1].trim() : sub.studentName;
        const id = parenMatch ? parenMatch[2].trim() : null;
        const matched = matchStudent(studentList, null, id, name, null);
        if (matched) resolvedDisplayName = `${matched.studentName} (${matched.studentId})`;
      }
      
      if (this.tab.bulkStudentResolvedInfo) {
        this.tab.bulkStudentResolvedInfo.textContent = resolvedDisplayName;
      }
      
      this.tab.bulkProgressText.innerText = `Đang chấm bài: ${sub.exerciseName} (${gradedCount + 1}/${totalToGrade})...`;
      this.tab.bulkProgressFill.style.width = `${(gradedCount / totalToGrade) * 100}%`;
      
      if (gradedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      await this.gradeSingleRow(i);
      gradedCount++;
    }
    
    this.tab.bulkProgressFill.style.width = '100%';
    this.tab.bulkProgressText.innerText = `Hoàn thành chấm điểm ${totalToGrade} bài!`;
    
    if (this.tab.bulkStudentResolvedBanner) {
      this.tab.bulkStudentResolvedBanner.style.display = 'none';
    }
    
    this.tab.bulkGradeBtn.disabled = false;
    this.tab.rescanPageBtn.disabled = false;
    this.tab.renderer.updateBulkButtonText();
    
    setTimeout(() => {
      this.tab.bulkProgressContainer.style.display = 'none';
      this.tab.bulkProgressText.style.display = 'none';
    }, 4000);
  }
}
