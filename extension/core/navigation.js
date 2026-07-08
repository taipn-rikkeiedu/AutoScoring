// core/navigation.js - Handles tab activation and routing inside popup

export class Navigation {
  constructor(context, elements) {
    this.context = context;
    this.elements = elements;
    this.initEvents();
  }

  initEvents() {
    this.elements.tabSelect.addEventListener("change", (e) => {
      this.activateTabById(e.target.value);
    });
  }

  detectAndLoadClassListSync() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const url = tabs[0].url || "";
        const match = url.match(/\/homework-checking\/(\d+)/);
        if (match && this.context.classListTab) {
          this.context.classListTab.loadClassListData(match[1]);
        } else if (this.context.classListTab) {
          this.context.classListTab.renderClassList();
        }
      } else if (this.context.classListTab) {
        this.context.classListTab.renderClassList();
      }
    });
  }

  activateTabById(targetId) {
    const tabContents = [
      this.elements.tabAuto,
      this.elements.tabGrader,
      this.elements.tabClassList,
      this.elements.tabCare,
      this.elements.tabExercises,
      this.elements.tabSettings
    ];
    
    tabContents.forEach(content => {
      if (content && content.id === targetId) {
        content.classList.add("active");
      } else if (content) {
        content.classList.remove("active");
      }
    });

    if (targetId === "tab-auto" && this.context.autoGraderTab) {
      this.context.autoGraderTab.triggerPageScan(false);
    } else if (targetId === "tab-class-list") {
      this.detectAndLoadClassListSync();
    } else if (targetId === "tab-care" && this.context.careTab) {
      this.context.careTab.detectActiveTabAndLoad();
    }
  }

  detectActiveTabAndNavigate() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        this.elements.tabSelect.value = "tab-auto";
        this.activateTabById("tab-auto");
        return;
      }

      const url = tabs[0].url || "";
      let targetTab = "tab-auto";

      if (url.includes("/class/") && url.includes("/take-care")) {
        targetTab = "tab-care";
      } else if (url.includes("/homework-checking/")) {
        targetTab = "tab-class-list";
      } else if (url.includes("/type/elMajor/") && url.includes("/view/")) {
        targetTab = "tab-exercises";
      } else if (url.includes("/detailLinkGithub")) {
        targetTab = "tab-auto";
      } else {
        this.elements.tabSelect.value = "tab-auto";
        this.activateTabById("tab-auto");
        return;
      }

      this.elements.tabSelect.value = targetTab;
      this.activateTabById(targetTab);
    });
  }
}
