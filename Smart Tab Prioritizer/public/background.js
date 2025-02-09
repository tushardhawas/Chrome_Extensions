chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "sort_tabs") {
      chrome.storage.sync.get("prioritySites", (data) => {
        let prioritySites = data.prioritySites;
  
        chrome.tabs.query({}, (tabs) => {
          const importantTabs = [];
          const otherTabs = [];
  
          const getDomain = (url) => {
            try {
              return new URL(url).hostname.replace(/^www\./, "");
            } catch (e) {
              return "";
            }
          };
  
          tabs.forEach((tab) => {
            if (tab.url) {
              const domain = getDomain(tab.url);
              const isImportant = prioritySites.some((site) =>
                domain.includes(site)
              );
  
              if (isImportant) {
                importantTabs.push(tab);
              } else {
                otherTabs.push(tab);
              }
            }
          });
  
          let index = 0;
  
          importantTabs.forEach((tab) => {
            chrome.tabs.move(tab.id, { index: index }, () => {
              if (chrome.runtime.lastError) {
                console.error("Error moving tab:", chrome.runtime.lastError);
              }
            });
            chrome.tabs.update(tab.id, { pinned: true });
            index++;
          });
  
          otherTabs.forEach((tab) => {
            chrome.tabs.move(tab.id, { index: index }, () => {
              if (chrome.runtime.lastError) {
                console.error("Error moving tab:", chrome.runtime.lastError);
              }
            });
            chrome.tabs.update(tab.id, { pinned: false });
            index++;
          });
  
          console.log("Sorting complete.");
          
          // ✅ Send success message to frontend
          chrome.runtime.sendMessage({ type: "sort_complete" });
        });
      });
    }
  });
  