// features/class-list/classListGrading.js - Logic for grading student class list items

export class ClassListGrading {
  constructor(tab) {
    this.tab = tab;
  }

  switchToSingleGraderForStudent(st) {
    chrome.storage.local.set({
      activeStudentTransition: {
        studentId: st.studentId,
        studentName: st.studentName,
        timestamp: Date.now()
      }
    }, () => {
      const selectEl = document.getElementById("tab-navigator-select");
      if (selectEl) {
        selectEl.value = "tab-grader";
        selectEl.dispatchEvent(new Event("change"));
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url: st.submissionUrl }, () => {
            setTimeout(() => {
              if (this.tab.context.singleGraderTab) {
                this.tab.context.singleGraderTab.resolveStudentFromTabUrl();
              }
            }, 1000);
          });
        }
      });
    });
  }
}
