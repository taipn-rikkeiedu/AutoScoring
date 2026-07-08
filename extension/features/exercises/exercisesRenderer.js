// features/exercises/exercisesRenderer.js - UI rendering logic for Exercises tab

export class ExercisesRenderer {
  constructor(tab) {
    this.tab = tab;
  }

  disableSelectors() {
    this.tab.exChapterSelect.innerHTML = '<option value="">-- Lỗi cấu hình bài tập --</option>';
    this.tab.exSessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.tab.exSessionSelect.disabled = true;
    this.tab.exAssignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.tab.exAssignmentSelect.disabled = true;
  }

  populateChapters() {
    this.tab.exChapterSelect.innerHTML = '<option value="">-- Chọn Chương --</option>';
    const templates = this.tab.context.exerciseTemplates || {};
    const chapters = Object.keys(templates);

    if (chapters.length === 0) {
      this.tab.exChapterSelect.innerHTML = '<option value="">-- Thư viện trống --</option>';
      return;
    }

    chapters.forEach(ch => {
      const option = document.createElement("option");
      option.value = ch;
      option.textContent = ch;
      this.tab.exChapterSelect.appendChild(option);
    });

    this.tab.exSessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.tab.exSessionSelect.disabled = true;
    this.tab.exAssignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.tab.exAssignmentSelect.disabled = true;
    this.updateDetailContainer();
  }

  onChapterChanged() {
    const templates = this.tab.context.exerciseTemplates || {};
    const selectedChapter = this.tab.exChapterSelect.value;
    this.tab.exSessionSelect.innerHTML = '<option value="">-- Chọn Session --</option>';

    if (!selectedChapter || !templates[selectedChapter]) {
      this.tab.exSessionSelect.disabled = true;
      this.tab.exAssignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
      this.tab.exAssignmentSelect.disabled = true;
      this.updateDetailContainer();
      return;
    }

    const sessions = Object.keys(templates[selectedChapter]);
    sessions.forEach(sess => {
      const option = document.createElement("option");
      option.value = sess;
      option.textContent = sess;
      this.tab.exSessionSelect.appendChild(option);
    });

    this.tab.exSessionSelect.disabled = false;
    this.tab.exAssignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    this.tab.exAssignmentSelect.disabled = true;
    this.updateDetailContainer();
  }

  onSessionChanged() {
    const templates = this.tab.context.exerciseTemplates || {};
    const selectedChapter = this.tab.exChapterSelect.value;
    const selectedSession = this.tab.exSessionSelect.value;
    this.tab.exAssignmentSelect.innerHTML = '<option value="">-- Chọn Bài tập --</option>';

    if (!selectedSession || !templates[selectedChapter] || !templates[selectedChapter][selectedSession]) {
      this.tab.exAssignmentSelect.disabled = true;
      this.updateDetailContainer();
      return;
    }

    const assignments = Object.keys(templates[selectedChapter][selectedSession]);
    assignments.forEach(ass => {
      const option = document.createElement("option");
      option.value = ass;
      option.textContent = ass;
      this.tab.exAssignmentSelect.appendChild(option);
    });

    this.tab.exAssignmentSelect.disabled = false;
    this.updateDetailContainer();
  }

  updateDetailContainer() {
    const chapter = this.tab.exChapterSelect.value;
    const session = this.tab.exSessionSelect.value;
    const assignmentName = this.tab.exAssignmentSelect.value;

    if (chapter && session && assignmentName) {
      const template = this.tab.context.exerciseTemplates?.[chapter]?.[session]?.[assignmentName];
      if (template) {
        this.tab.exPromptText.value = template.assignment || "";
        this.tab.exCriteriaText.value = template.criteria || "";
        this.tab.exDetailContainer.style.display = "flex";
        this.tab.exercisesDeleteBtn.disabled = false;
        return;
      }
    }

    this.tab.exDetailContainer.style.display = "none";
    this.tab.exercisesDeleteBtn.disabled = true;
  }
}
