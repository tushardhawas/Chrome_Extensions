import React from "react";
import { useState, useEffect } from "react";

function App() {
  const [currentId, setCurrentId] = useState("");
  const [hActive, sethActive] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0].id;
      setCurrentId(id);
    });
  });

  const handleActivate = () => {
    sethActive(true);
        console.log(hActive)
    chrome.scripting.executeScript({
      target: { tabId: currentId },
      function: () => {
        window.postMessage({ type: "activateHighlighting" }, "*");
        
      },
    });
  };

  const handleDeActivate = () => {
    sethActive(false);
        console.log(hActive);
    chrome.scripting.executeScript({
      target: { tabId: currentId },
      function: () => {
        window.postMessage({ type: "deActivateHighlighting" }, "*");

        
      },    

    });
  };

  return (
    <div>
      <button onClick={hActive ? handleDeActivate : handleActivate}>
        {hActive?"DeActivate Highlighting":"Activate Highlighting"}
      </button>
    </div>
  );
}

export default App;
