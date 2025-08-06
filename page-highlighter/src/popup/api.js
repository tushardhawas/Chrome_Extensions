// src/popup/api.js (example)
export async function startPicker() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'UG_START_PICK' });
}

export async function stopPicker() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'UG_STOP_PICK' });
}

export async function showTooltipOnPage(selector, text) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'UG_SHOW_TOOLTIP', selector, text });
}
