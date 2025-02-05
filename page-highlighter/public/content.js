let highlightingActive = false; // Keep track of highlighting state

// Listen for messages from the popup to activate highlighting
window.addEventListener(
  "message",
  (event) => {
    if (event.source !== window) {
      return;
    }
    if (event.data.type && event.data.type === "deActivateHighlighting") {
      highlightingActive = false;
      console.log("Highlighting deactivated!");
    }

    if (event.data.type && event.data.type === "activateHighlighting") {
      highlightingActive = true;
      console.log("Highlighting activated!");
      // Add event listener to highlight text when mouse is released
      document.addEventListener("mouseup", highlightText);
    }
  },
  false
);



function highlightText() {
  if (!highlightingActive) return; // Only highlight if active

  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  if (range.toString().length > 0) {
      const highlightedText = document.createElement('span');
      highlightedText.style.backgroundColor = 'yellow'; // Or any color you prefer
      highlightedText.style.padding = '2px';
      highlightedText.style.borderRadius = '3px';
      range.surroundContents(highlightedText);
      selection.removeAllRanges();
  }
}
