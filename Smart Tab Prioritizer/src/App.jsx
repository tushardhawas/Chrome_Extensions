import React, { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";

const App = () => {
  const [prioritySites, setPrioritySites] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    chrome.storage.sync.get("prioritySites", (data) => {
      if (Array.isArray(data.prioritySites)) {
        setPrioritySites(data.prioritySites.join(", "));
      } else {
        const defaultSites = [
         
          "empty"
        ];
        chrome.storage.sync.set({ prioritySites: defaultSites }, () => {
          setPrioritySites(defaultSites.join(", "));
        });
      }
      setIsLoading(false);
    });

    // ✅ Listen for sorting completion
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "sort_complete") {
        toast.success("✅ Tabs sorted successfully!", {
          duration: 2000, // Auto-hide after 2 seconds
          position: "bottom-center", // Doesn't cover the UI
        });
      }
    });
  }, []);

  const savePreferences = () => {
    const sitesArray = prioritySites
      .split(",")
      .map((site) => site.trim())
      .filter(Boolean);
    chrome.storage.sync.set({ prioritySites: sitesArray });
    toast.success("✅ Preferences saved!", {
      duration: 2000, // Auto-hide after 2 seconds
      position: "bottom-center",
    });
  };

  if (isLoading) return <div className="p-4 text-white">Loading...</div>;

  return (
    <div className="p-4 w-64 h-80 bg-gray-800 text-white text-center">
      <h1 className="text-lg font-bold">Tab Prioritizer</h1>
      <input
        type="text"
        value={prioritySites}
        onChange={(e) => setPrioritySites(e.target.value)}
        className="mt-2 p-2 w-full bg-gray-700 rounded-lg border border-gray-600 text-white"
        placeholder="Enter priority sites, comma separated"
      />
      <div className="flex gap-1.5">
        {/* <button
          onClick={savePreferences}
          className="mt-2 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-700 transition-all"
        >
          Save Preferences
        </button> */}
        <button
          onClick={() => chrome.runtime.sendMessage({ type: "sort_tabs" })}
          className={`mt-2 px-4 py-2 rounded-lg transition-all ${
               "bg-green-500 hover:bg-green-700"
              
          }`}
        >
          Sort My Tabs
        </button>
       
      </div>

      {/* ✅ Add the Sonner Toaster for notifications */}
      <Toaster />
    </div>
  );
};

export default App;
