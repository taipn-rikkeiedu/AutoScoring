// This script is injected into the LMS webpage to extract exercise details.
// It must return a serializable object containing course/chapter, session, assignment name, and assignment content.
(() => {
  try {
    // 1. Extract Course / Chapter Name
    let chapter = "";
    
    // Prioritize searching for a node containing a brackets code (e.g., [IT-215]) and the course name
    const elements = Array.from(document.querySelectorAll('div, span, h1, h2, h3, h4, h5, p'));
    const courseNode = elements.find(el => {
      const txt = el.textContent.trim();
      return /\[[a-zA-Z0-9\-_]+\]/.test(txt) && txt.length > 8 && txt.length < 120;
    });

    if (courseNode) {
      const clone = courseNode.cloneNode(true);
      const extraElements = clone.querySelectorAll('button, a, input, [class*="btn"], [class*="button"]');
      extraElements.forEach(el => el.remove());
      
      let txt = clone.textContent.trim();
      // Extract starting from the bracket [ to the end of the text
      const match = txt.match(/(\[[^\]]+\].*)$/);
      if (match) {
        chapter = match[1].trim();
      }
    }

    // Fallback: Check standard headings if no bracket pattern node is found
    if (!chapter) {
      const mainHeader = document.querySelector('.course-name, .course-title, [class*="course"]');
      if (mainHeader) {
        const clone = mainHeader.cloneNode(true);
        const extraElements = clone.querySelectorAll('button, a, input, [class*="btn"], [class*="button"]');
        extraElements.forEach(el => el.remove());
        chapter = clone.textContent.trim();
      }
    }

    if (!chapter) {
      const pageHeading = document.querySelector('h1, h2, h3');
      if (pageHeading) {
        const clone = pageHeading.cloneNode(true);
        const extraElements = clone.querySelectorAll('button, a, input, [class*="btn"], [class*="button"]');
        extraElements.forEach(el => el.remove());
        chapter = clone.textContent.trim();
      }
    }

    // Clean course title from prefix arrows, newlines or buttons
    if (chapter) {
      chapter = chapter.split('\n')[0].trim();
      chapter = chapter.replace(/^[←\s\-\<\>\+]+/, '').trim();
    } else {
      chapter = "Khóa học mặc định";
    }

    // 2. Identify the active selected assignment in the left tree structure
    let assignmentName = "";
    let session = "";
    
    // Find the highlighted node in the tree list
    // (Checks common selected classes in Ant Design, Element UI, or custom active menus)
    const activeSelectors = [
      '.ant-tree-node-selected', 
      '.is-active', 
      '.active', 
      '.selected', 
      '[class*="node-selected"]', 
      '[class*="menu-item-selected"]',
      '[class*="active-menu"]',
      '[style*="background-color"]',
      '[style*="background:"]'
    ];
    
    let activeNode = null;
    for (const selector of activeSelectors) {
      activeNode = document.querySelector(selector);
      if (activeNode && activeNode.textContent.trim().length > 3) {
        break;
      }
    }

    // Fallback: search tree elements containing "[Bài tập" or specific prefixes
    if (!activeNode) {
      const elements = Array.from(document.querySelectorAll('div, span, li, a'));
      activeNode = elements.find(el => {
        const txt = el.textContent.trim();
        const style = window.getComputedStyle(el);
        const hasBg = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
        return hasBg && (txt.includes('Bài tập') || txt.includes('Homework') || txt.includes('Project') || txt.includes('API'));
      });
    }

    if (activeNode) {
      assignmentName = activeNode.textContent.trim();
      
      // Clean up assignment name if it contains edit/delete icons text
      assignmentName = assignmentName.split('\n')[0].trim();
      assignmentName = assignmentName.replace(/^[\[\]0-9a-zA-Z\s\-]+Thực hành\s*\d*\]\s*/i, ''); // Strip [Bài tập thực hành X]
      assignmentName = assignmentName.replace(/^\[[^\]]+\]\s*/, ''); // Strip general brackets prefix e.g., [Bài tập]
      
      // Walk backward in document order to locate the closest parent session name
      const allElements = Array.from(document.querySelectorAll('div, span, li, a, h1, h2, h3, h4, h5, p, [class*="title"], [class*="header"]'));
      const activeIndex = allElements.indexOf(activeNode);
      if (activeIndex !== -1) {
        for (let i = activeIndex - 1; i >= 0; i--) {
          const txt = allElements[i].textContent.trim();
          if (/^(Session|Chương|Phiên|Lesson|Bài học)\s*\d+/i.test(txt)) {
            if (txt.length > 2 && txt.length < 80) {
              session = txt.split('\n')[0].trim();
              break;
            }
          }
        }
      }

      // Fallback to parent traversal search if backward search fails
      if (!session) {
        let parent = activeNode.parentElement;
        for (let i = 0; i < 20; i++) {
          if (!parent) break;
          const headerMatch = Array.from(parent.querySelectorAll('span, div, h1, h2, h3, h4'))
            .map(el => el.textContent.trim())
            .find(txt => /^(Session|Chương|Phiên|Lesson|Bài học)\s*\d+/i.test(txt) && txt.length < 80);
          
          if (headerMatch) {
            session = headerMatch.split('\n')[0].trim();
            break;
          }
          parent = parent.parentElement;
        }
      }
    }

    if (!assignmentName) {
      const pageTitle = document.querySelector('.title, .header, h2');
      assignmentName = pageTitle ? pageTitle.textContent.trim() : "Bài tập mới";
    }
    if (!session) {
      session = "Session 01: Nhập môn";
    } else {
      // Clean up session arrows or weird characters
      session = session.replace(/^[←\s\-\<\>\+]+/, '').trim();
    }

    // 3. Extract the detailed assignment content (right pane)
    let assignment = "";
    
    // Look for content container, previewer, or editor
    const contentSelectors = [
      '.markdown-body',
      '.editor-preview-active',
      '.preview-content',
      '.right-pane',
      '[class*="preview"]',
      '[class*="content"]',
      '.assignment-content',
      'main'
    ];
    
    let contentContainer = null;
    for (const selector of contentSelectors) {
      const container = document.querySelector(selector);
      // Ensure container is in the right half of the screen or is large
      if (container && container.textContent.trim().length > 100) {
        const rect = container.getBoundingClientRect();
        if (rect.left > window.innerWidth / 3 || rect.width > window.innerWidth / 2) {
          contentContainer = container;
          break;
        }
      }
    }

    if (contentContainer) {
      assignment = contentContainer.innerText || contentContainer.textContent;
    }

    // Fallback: Crawl inside same-origin iframes
    if (!assignment || assignment.trim().length < 50) {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          if (doc && doc.body) {
            const txt = doc.body.innerText || doc.body.textContent;
            if (txt && txt.trim().length > assignment.trim().length) {
              assignment = txt;
            }
          }
        } catch (e) {
          // Cross-origin restriction - ignore
        }
      });
    }

    // Deep clean extracted text
    if (assignment) {
      assignment = assignment.trim()
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n'); // collapse spacing
    } else {
      assignment = "Không tìm thấy nội dung đề bài tự động. Vui lòng copy/paste thủ công vào đây.";
    }

    return {
      success: true,
      chapter,
      session,
      assignmentName,
      assignment
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
})();
