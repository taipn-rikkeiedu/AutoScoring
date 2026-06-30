document.addEventListener("DOMContentLoaded", () => {
  // --- UI Elements ---
  const tabGraderBtn = document.getElementById("tab-grader-btn");
  const tabSettingsBtn = document.getElementById("tab-settings-btn");
  const tabGrader = document.getElementById("tab-grader");
  const tabSettings = document.getElementById("tab-settings");

  const connBanner = document.getElementById("conn-banner");
  const connText = document.getElementById("conn-text");
  const appVersionTag = document.getElementById("app-version");

  const repoUrlInput = document.getElementById("repo-url");
  const chapterSelect = document.getElementById("chapter-select");
  const sessionSelect = document.getElementById("session-select");
  const assignmentSelect = document.getElementById("assignment-select");
  const gradeBtn = document.getElementById("grade-btn");

  const statusBox = document.getElementById("status-box");
  const statusMessage = document.getElementById("status-message");
  const resultsBox = document.getElementById("results-box");
  const scoreVal = document.getElementById("score-val");
  const reportHtml = document.getElementById("report-html");

  const apiUrlInput = document.getElementById("api-url");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const providerInfo = document.getElementById("provider-info");

  // --- State Variables ---
  let backendApiUrl = "http://localhost:8000";
  let exerciseTemplates = {};

  // --- Tab Navigation ---
  tabGraderBtn.addEventListener("click", () => {
    tabGraderBtn.classList.add("active");
    tabSettingsBtn.classList.remove("active");
    tabGrader.classList.add("active");
    tabSettings.classList.remove("active");
  });

  tabSettingsBtn.addEventListener("click", () => {
    tabSettingsBtn.classList.add("active");
    tabGraderBtn.classList.remove("active");
    tabSettings.classList.add("active");
    tabGrader.classList.remove("active");
  });

  // --- Initialization ---
  // Load saved API URL and query current tab
  chrome.storage.local.get(["backendApiUrl"], (result) => {
    if (result.backendApiUrl) {
      backendApiUrl = result.backendApiUrl;
    }
    apiUrlInput.value = backendApiUrl;
    
    // Connect to Server
    testConnectionAndLoadExercises();
  });

  // Get current active tab URL and auto-fill repository URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      const url = tabs[0].url;
      const githubMatch = url.match(/^https?:\/\/(www\.)?github\.com\/([^/]+)\/([^/]+)/);
      if (githubMatch) {
        // Construct clean repo URL: https://github.com/owner/repo
        const cleanRepoUrl = `https://github.com/${githubMatch[2]}/${githubMatch[3].split('?')[0].split('#')[0]}`;
        repoUrlInput.value = cleanRepoUrl;
      }
    }
  });

  // --- Settings Events ---
  saveSettingsBtn.addEventListener("click", () => {
    let inputUrl = apiUrlInput.value.trim();
    if (!inputUrl) {
      alert("Vui lòng nhập URL của API Server Backend.");
      return;
    }
    // Remove trailing slash
    inputUrl = inputUrl.replace(/\/+$/, "");
    backendApiUrl = inputUrl;

    chrome.storage.local.set({ backendApiUrl: backendApiUrl }, () => {
      alert("Đã lưu cấu hình địa chỉ API Server.");
      testConnectionAndLoadExercises();
    });
  });

  // --- Backend Connection & exercise loader ---
  async function testConnectionAndLoadExercises() {
    connBanner.className = "connection-banner error";
    connText.innerText = "Đang kiểm tra kết nối...";
    providerInfo.innerHTML = `• Trạng thái AI Provider: <i>Đang kết nối...</i><br>• Nguồn bài tập: <i>Đang kết nối...</i>`;
    gradeBtn.disabled = true;

    try {
      // 1. Fetch Config
      const configRes = await fetch(`${backendApiUrl}/api/config`);
      if (!configRes.ok) throw new Error("Config request failed");
      const config = await configRes.json();
      
      // Update UI Banner
      connBanner.className = "connection-banner success";
      connText.innerText = "Đã kết nối với API Server";
      appVersionTag.innerText = `v${config.app_version || "1.0.0"}`;

      // Update provider settings in UI
      providerInfo.innerHTML = `
        • Trạng thái AI Provider: <b>${config.provider_display}</b><br>
        • Nguồn bài tập hiện tại: <b>${config.exercise_source === 'api' ? 'REST API (' + config.exercise_api_url + ')' : 'Local File JSON'}</b>
      `;

      // 2. Fetch Exercises
      const exercisesRes = await fetch(`${backendApiUrl}/api/exercises`);
      if (!exercisesRes.ok) throw new Error("Exercises request failed");
      exerciseTemplates = await exercisesRes.json();

      // Populate Chapters selector
      populateChapters();
      gradeBtn.disabled = false;
    } catch (error) {
      console.error(error);
      connBanner.className = "connection-banner error";
      connText.innerText = "Lỗi kết nối API Server";
      providerInfo.innerHTML = `
        <span style="color:#ef4444;">• Không thể kết nối tới Server: ${backendApiUrl}</span><br>
        • Vui lòng kiểm tra lại server backend đã chạy hay chưa.
      `;
      gradeBtn.disabled = true;
      disableSelectors();
    }
  }

  function disableSelectors() {
    chapterSelect.innerHTML = '<option value="">-- Lỗi kết nối API --</option>';
    sessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    sessionSelect.disabled = true;
    assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    assignmentSelect.disabled = true;
  }

  // --- Dropdown Management ---
  function populateChapters() {
    chapterSelect.innerHTML = '<option value="">-- Chọn Chương --</option>';
    const chapters = Object.keys(exerciseTemplates);
    
    if (chapters.length === 0) {
      chapterSelect.innerHTML = '<option value="">-- Thư viện trống --</option>';
      return;
    }

    chapters.forEach(ch => {
      const option = document.createElement("option");
      option.value = ch;
      option.textContent = ch;
      chapterSelect.appendChild(option);
    });

    sessionSelect.innerHTML = '<option value="">-- Chọn --</option>';
    sessionSelect.disabled = true;
    assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    assignmentSelect.disabled = true;
  }

  chapterSelect.addEventListener("change", () => {
    const selectedChapter = chapterSelect.value;
    sessionSelect.innerHTML = '<option value="">-- Chọn Session --</option>';
    
    if (!selectedChapter || !exerciseTemplates[selectedChapter]) {
      sessionSelect.disabled = true;
      assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
      assignmentSelect.disabled = true;
      return;
    }

    const sessions = Object.keys(exerciseTemplates[selectedChapter]);
    sessions.forEach(sess => {
      const option = document.createElement("option");
      option.value = sess;
      option.textContent = sess;
      sessionSelect.appendChild(option);
    });

    sessionSelect.disabled = false;
    assignmentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    assignmentSelect.disabled = true;
  });

  sessionSelect.addEventListener("change", () => {
    const selectedChapter = chapterSelect.value;
    const selectedSession = sessionSelect.value;
    assignmentSelect.innerHTML = '<option value="">-- Chọn Bài tập --</option>';

    if (!selectedSession || !exerciseTemplates[selectedChapter] || !exerciseTemplates[selectedChapter][selectedSession]) {
      assignmentSelect.disabled = true;
      return;
    }

    const assignments = Object.keys(exerciseTemplates[selectedChapter][selectedSession]);
    assignments.forEach(ass => {
      const option = document.createElement("option");
      option.value = ass;
      option.textContent = ass;
      assignmentSelect.appendChild(option);
    });

    assignmentSelect.disabled = false;
  });

  // --- Grading Logic ---
  gradeBtn.addEventListener("click", async () => {
    const repoUrl = repoUrlInput.value.trim();
    const chapter = chapterSelect.value;
    const session = sessionSelect.value;
    const assignmentName = assignmentSelect.value;

    if (!repoUrl) {
      alert("Vui lòng nhập GitHub Repository URL.");
      return;
    }

    if (!chapter || !session || !assignmentName) {
      alert("Vui lòng chọn đầy đủ Chương, Session và Bài tập.");
      return;
    }

    // Toggle loading UI
    gradeBtn.disabled = true;
    resultsBox.style.display = "none";
    statusBox.style.display = "flex";
    statusMessage.innerText = "Đang tải mã nguồn từ GitHub...";

    try {
      const payload = {
        repo_url: repoUrl,
        chapter: chapter,
        session: session,
        assignment_name: assignmentName
      };

      const response = await fetch(`${backendApiUrl}/api/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Yêu cầu chấm điểm thất bại.");
      }

      statusMessage.innerText = "AI đang chấm điểm và lập báo cáo...";
      const result = await response.json();

      if (result.success) {
        statusBox.style.display = "none";
        
        // Show metric
        scoreVal.innerText = result.score ? `${result.score} / 100` : "N/A";
        if (result.score) {
          const score = parseInt(result.score, 10);
          if (score >= 80) {
            scoreVal.style.background = "linear-gradient(135deg, #16a34a, #15803d)"; // Green
          } else if (score >= 50) {
            scoreVal.style.background = "linear-gradient(135deg, #d97706, #b45309)"; // Orange
          } else {
            scoreVal.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)"; // Red
          }
        }

        // Render Markdown
        if (typeof marked !== 'undefined') {
          reportHtml.innerHTML = marked.parse(result.report);
        } else {
          // Fallback text
          reportHtml.innerText = result.report;
        }

        resultsBox.style.display = "flex";
      } else {
        throw new Error("Lỗi không xác định khi xử lý báo cáo.");
      }
    } catch (error) {
      console.error(error);
      alert(`Lỗi: ${error.message}`);
      statusBox.style.display = "none";
    } finally {
      gradeBtn.disabled = false;
    }
  });
});
