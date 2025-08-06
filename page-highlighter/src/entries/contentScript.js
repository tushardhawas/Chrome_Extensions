// src/entries/contentScript.js
import { generateRobustSelectors, getCssSelector, getXPath } from './selector';

if (typeof chrome === 'undefined') {
  // In case of unit tests or dev server, avoid throwing
  console.warn('chrome API not found — running outside extension context?');
}

(function () {
  if (window.__UG_CONTENT_INJECTED) return;
  window.__UG_CONTENT_INJECTED = true;

  // DOM nodes
  let overlay = null;
  let tooltip = null;
  let floatingPanel = null;
  let picking = false;
  let currentEl = null;
  let lastMouseEvent = null;
  let selectedElement = null;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = '__ug_overlay';
    // large z-index and pointer-events none so it doesn't block clicks
    Object.assign(overlay.style, {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: '2147483647',
      border: '2px solid rgb(255,152,0)',
      background: 'rgba(255,152,0,0.06)',
      borderRadius: '6px',
      transition: 'all 0.07s ease-out',
      boxSizing: 'border-box'
    });
    document.documentElement.appendChild(overlay);
  }

  function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.id = '__ug_tooltip';
    Object.assign(tooltip.style, {
      position: 'absolute',
      zIndex: '2147483648',
      pointerEvents: 'auto',
      background: 'rgba(0,0,0,0.85)',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      maxWidth: '320px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
    });
    tooltip.style.display = 'none';
    document.documentElement.appendChild(tooltip);
  }

  function createFloatingPanel() {
    if (floatingPanel) return;
    
    floatingPanel = document.createElement('div');
    floatingPanel.id = '__ug_floating_panel';
    
    // Create the panel HTML
    floatingPanel.innerHTML = `
      <div class="ug-panel-header">
        <div class="ug-panel-title">🎯 Element Selector</div>
        <div class="ug-panel-controls">
          <button class="ug-minimize-btn" title="Minimize">−</button>
          <button class="ug-close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="ug-panel-content">
        <div class="ug-status">
          <div class="ug-status-text">Click "Start Picking" to begin</div>
          <button class="ug-toggle-btn" data-active="false">🎯 Start Picking</button>
        </div>
        <div class="ug-element-info" style="display: none;">
          <div class="ug-element-details"></div>
        </div>
        <div class="ug-selectors" style="display: none;">
          <div class="ug-selectors-content"></div>
        </div>
      </div>
    `;
    
    // Apply styles
    Object.assign(floatingPanel.style, {
      position: 'fixed',
      top: '20px',
      left: '20px',
      width: '400px',
      maxHeight: '80vh',
      backgroundColor: '#ffffff',
      border: '1px solid #e1e5e9',
      borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
      zIndex: '2147483647',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      overflow: 'hidden',
      resize: 'both',
      minWidth: '350px',
      minHeight: '200px'
    });
    
    document.documentElement.appendChild(floatingPanel);
    
    // Add CSS styles
    addFloatingPanelStyles();
    
    // Add event listeners
    setupFloatingPanelEvents();
    
    // Make it draggable
    makeDraggable(floatingPanel.querySelector('.ug-panel-header'), floatingPanel);
  }

  function addFloatingPanelStyles() {
    if (document.getElementById('__ug_panel_styles')) return;
    
    const style = document.createElement('style');
    style.id = '__ug_panel_styles';
    style.textContent = `
      #__ug_floating_panel * {
        box-sizing: border-box;
      }
      
      .ug-panel-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
      }
      
      .ug-panel-title {
        font-weight: 600;
        font-size: 16px;
      }
      
      .ug-panel-controls {
        display: flex;
        gap: 8px;
      }
      
      .ug-minimize-btn, .ug-close-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        line-height: 1;
      }
      
      .ug-minimize-btn:hover, .ug-close-btn:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .ug-panel-content {
        padding: 16px;
        max-height: calc(80vh - 60px);
        overflow-y: auto;
      }
      
      .ug-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      
      .ug-toggle-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 13px;
      }
      
      .ug-toggle-btn[data-active="false"] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .ug-toggle-btn[data-active="true"] {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        color: white;
      }
      
      .ug-element-info {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        border-left: 4px solid #667eea;
      }
      
      .ug-element-details div {
        margin: 4px 0;
        font-size: 13px;
      }
      
      .ug-element-details strong {
        color: #2c3e50;
        min-width: 60px;
        display: inline-block;
      }
      
      .ug-selectors {
        max-height: 400px;
        overflow-y: auto;
      }
      
      .ug-selector-row {
        display: flex;
        align-items: center;
        margin: 8px 0;
        padding: 8px;
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        transition: all 0.2s ease;
      }
      
      .ug-selector-row:hover {
        border-color: #667eea;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
      }
      
      .ug-selector-row.priority {
        border-color: #00b894;
        background: linear-gradient(135deg, #f8fff8 0%, #e8f8f5 100%);
      }
      
      .ug-selector-label {
        font-weight: 600;
        min-width: 120px;
        font-size: 12px;
        color: #2c3e50;
      }
      
      .ug-selector-value {
        flex: 1;
        margin: 0 8px;
      }
      
      .ug-selector-value code {
        background: #f1f3f4;
        padding: 4px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 11px;
        color: #2d3436;
        word-break: break-all;
        display: block;
        max-height: 60px;
        overflow-y: auto;
      }
      
      .ug-selector-actions {
        display: flex;
        gap: 4px;
      }
      
      .ug-copy-btn, .ug-test-btn {
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
        min-width: 32px;
        height: 28px;
      }
      
      .ug-copy-btn {
        background: #74b9ff;
        color: white;
      }
      
      .ug-copy-btn:hover {
        background: #0984e3;
        transform: translateY(-1px);
      }
      
      .ug-copy-btn.copied {
        background: #00b894;
      }
      
      .ug-test-btn {
        background: #fdcb6e;
        color: #2d3436;
      }
      
      .ug-test-btn:hover {
        background: #e17055;
        color: white;
        transform: translateY(-1px);
      }
      
      .ug-uniqueness-indicator {
        margin-left: 8px;
        font-size: 12px;
        padding: 2px 4px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.1);
      }
      
      .ug-panel-content::-webkit-scrollbar {
        width: 6px;
      }
      
      .ug-panel-content::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      .ug-panel-content::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      
      .ug-panel-content::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
      
      .ug-minimized .ug-panel-content {
        display: none;
      }
      
      .ug-minimized {
        height: auto !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  function setupFloatingPanelEvents() {
    const toggleBtn = floatingPanel.querySelector('.ug-toggle-btn');
    const minimizeBtn = floatingPanel.querySelector('.ug-minimize-btn');
    const closeBtn = floatingPanel.querySelector('.ug-close-btn');
    
    toggleBtn.addEventListener('click', () => {
      const isActive = toggleBtn.getAttribute('data-active') === 'true';
      if (isActive) {
        stopPicking();
      } else {
        startPicking();
      }
    });
    
    minimizeBtn.addEventListener('click', () => {
      floatingPanel.classList.toggle('ug-minimized');
    });
    
    closeBtn.addEventListener('click', () => {
      removeFloatingPanel();
    });
  }

  function makeDraggable(handle, element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left) || 20;
      startTop = parseInt(element.style.top) || 20;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    });
    
    function onMouseMove(e) {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      element.style.left = Math.max(0, startLeft + deltaX) + 'px';
      element.style.top = Math.max(0, startTop + deltaY) + 'px';
    }
    
    function onMouseUp() {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }

  function removeFloatingPanel() {
    if (floatingPanel) {
      floatingPanel.remove();
      floatingPanel = null;
    }
    const styles = document.getElementById('__ug_panel_styles');
    if (styles) styles.remove();
    
    stopPicking();
  }

  function updateFloatingPanelResults(element, allSelectors) {
    if (!floatingPanel || !element || !allSelectors) return;
    
    const elementInfo = floatingPanel.querySelector('.ug-element-info');
    const elementDetails = floatingPanel.querySelector('.ug-element-details');
    const selectorsDiv = floatingPanel.querySelector('.ug-selectors');
    const selectorsContent = floatingPanel.querySelector('.ug-selectors-content');
    
    // Show element info
    elementInfo.style.display = 'block';
    elementDetails.innerHTML = `
      <div><strong>Tag:</strong> ${element.tagName.toLowerCase()}</div>
      <div><strong>ID:</strong> ${element.id || 'none'}</div>
      <div><strong>Classes:</strong> ${element.className || 'none'}</div>
      <div><strong>Text:</strong> ${(element.textContent || '').substring(0, 50) || 'none'}</div>
      ${allSelectors.analysis?.componentLibrary ? `<div><strong>Framework:</strong> ${allSelectors.analysis.componentLibrary}</div>` : ''}
    `;
    
    // Show selectors
    selectorsDiv.style.display = 'block';
    selectorsContent.innerHTML = '';
    
    // Add best selectors first
    if (allSelectors.best && allSelectors.best.length > 0) {
      const bestSection = document.createElement('div');
      bestSection.innerHTML = '<h4 style="margin: 16px 0 8px 0; color: #2c3e50; font-size: 14px;">🏆 Best Selectors (AI Ranked)</h4>';
      selectorsContent.appendChild(bestSection);
      
      allSelectors.best.forEach((selector, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        const row = createSelectorRow(
          `${emoji} ${selector.type} (Score: ${selector.score})`,
          selector.selector,
          true,
          selector.uniqueness
        );
        selectorsContent.appendChild(row);
      });
    }
    
    // Add other selector categories
    const categories = [
      { key: 'css', title: '🎨 CSS Selectors', selectors: allSelectors.css || [] },
      { key: 'xpath', title: '🗂️ XPath Selectors', selectors: allSelectors.xpath || [] },
      { key: 'attributes', title: '🏷️ Attribute Selectors', selectors: allSelectors.attributes || [] }
    ];
    
    categories.forEach(category => {
      if (category.selectors.length > 0) {
        const section = document.createElement('div');
        section.innerHTML = '<h4 style="margin: 16px 0 8px 0; color: #2c3e50; font-size: 14px;">' + category.title + '</h4>';
        selectorsContent.appendChild(section);
        
        category.selectors.forEach(selector => {
          const row = createSelectorRow(
            selector.type || category.key,
            selector.selector || selector,
            false,
            selector.uniqueness
          );
          selectorsContent.appendChild(row);
        });
      }
    });
  }

  function createSelectorRow(label, selector, isPriority = false, uniqueness = null) {
    const row = document.createElement('div');
    row.className = `ug-selector-row ${isPriority ? 'priority' : ''}`;
    
    row.innerHTML = `
      <div class="ug-selector-label">${label}</div>
      <div class="ug-selector-value">
        <code>${selector}</code>
        ${uniqueness ? `<span class="ug-uniqueness-indicator">${uniqueness} matches</span>` : ''}
      </div>
      <div class="ug-selector-actions">
        <button class="ug-copy-btn" title="Copy to clipboard">📋</button>
        <button class="ug-test-btn" title="Test selector">🔍</button>
      </div>
    `;
    
    // Add event listeners
    const copyBtn = row.querySelector('.ug-copy-btn');
    const testBtn = row.querySelector('.ug-test-btn');
    
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(selector).then(() => {
        copyBtn.textContent = '✅';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = '📋';
          copyBtn.classList.remove('copied');
        }, 1000);
      });
    });
    
    testBtn.addEventListener('click', () => {
      try {
        let elements;
        if (selector.startsWith('/') || selector.startsWith('(')) {
          // XPath selector
          const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          elements = [];
          for (let i = 0; i < result.snapshotLength; i++) {
            elements.push(result.snapshotItem(i));
          }
        } else {
          // CSS selector
          elements = Array.from(document.querySelectorAll(selector));
        }
        
        // Highlight found elements temporarily
        elements.forEach(el => {
          const originalStyle = el.style.cssText;
          el.style.cssText += '; outline: 3px solid red !important; outline-offset: 2px !important;';
          setTimeout(() => {
            el.style.cssText = originalStyle;
          }, 2000);
        });
        
        testBtn.textContent = `${elements.length}`;
        setTimeout(() => {
          testBtn.textContent = '🔍';
        }, 2000);
      } catch (error) {
        testBtn.textContent = '❌';
        setTimeout(() => {
          testBtn.textContent = '🔍';
        }, 2000);
      }
    });
    
    return row;
  }

  function updateOverlay(el) {
    if (!overlay || !el) return;
    
    const rect = el.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    Object.assign(overlay.style, {
      left: (rect.left + scrollX) + 'px',
      top: (rect.top + scrollY) + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      display: 'block'
    });
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
  }

  function updateTooltip(el, x, y) {
    if (!tooltip || !el) return;
    
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
    const text = el.textContent ? el.textContent.substring(0, 30) + '...' : '';
    
    tooltip.innerHTML = `
      <div><strong>${tag}${id}${classes}</strong></div>
      ${text ? `<div style="opacity: 0.8; font-size: 11px;">${text}</div>` : ''}
    `;
    
    // Position tooltip
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x + 10;
    let top = y - tooltipRect.height - 10;
    
    // Adjust if tooltip goes off screen
    if (left + tooltipRect.width > viewportWidth) {
      left = x - tooltipRect.width - 10;
    }
    if (top < 0) {
      top = y + 10;
    }
    
    Object.assign(tooltip.style, {
      left: left + 'px',
      top: top + 'px',
      display: 'block'
    });
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  function startPicking() {
    if (picking) return;
    
    picking = true;
    document.body.style.cursor = 'crosshair';
    
    // Update UI
    const toggleBtn = floatingPanel?.querySelector('.ug-toggle-btn');
    const statusText = floatingPanel?.querySelector('.ug-status-text');
    
    if (toggleBtn) {
      toggleBtn.setAttribute('data-active', 'true');
      toggleBtn.textContent = '🛑 Stop Picking';
    }
    if (statusText) {
      statusText.textContent = 'Hover over elements to inspect them';
    }
    
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  function stopPicking() {
    if (!picking) return;
    
    picking = false;
    document.body.style.cursor = '';
    currentEl = null;
    
    hideOverlay();
    hideTooltip();
    
    // Update UI
    const toggleBtn = floatingPanel?.querySelector('.ug-toggle-btn');
    const statusText = floatingPanel?.querySelector('.ug-status-text');
    
    if (toggleBtn) {
      toggleBtn.setAttribute('data-active', 'false');
      toggleBtn.textContent = '🎯 Start Picking';
    }
    if (statusText) {
      statusText.textContent = selectedElement ? 'Element selected - view selectors below' : 'Click "Start Picking" to begin';
    }
    
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }

  function onMouseMove(e) {
    if (!picking) return;
    
    lastMouseEvent = e;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    
    if (el && el !== currentEl && !isOurElement(el)) {
      currentEl = el;
      updateOverlay(el);
      updateTooltip(el, e.clientX, e.clientY);
    }
  }

  function onClick(e) {
    if (!picking) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && !isOurElement(el)) {
      selectedElement = el;
      
      // Generate selectors
      try {
        const selectors = generateRobustSelectors(el);
        updateFloatingPanelResults(el, selectors);
      } catch (error) {
        console.error('Error generating selectors:', error);
      }
      
      stopPicking();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      stopPicking();
    }
  }

  function isOurElement(el) {
    return el.id === '__ug_overlay' || 
           el.id === '__ug_tooltip' || 
           el.id === '__ug_floating_panel' ||
           el.closest('#__ug_floating_panel');
  }

  function handleShowTooltip(msg) {
    const { selector, x, y } = msg;
    try {
      const el = document.querySelector(selector);
      if (el) {
        updateTooltip(el, x, y);
        return { ok: true };
      }
      return { ok: false, error: 'Element not found' };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  // Message listener for communication with popup/background
  chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'UG_START_PICK') {
      if (!floatingPanel) createFloatingPanel();
      startPicking();
      sendResp({ ok: true });
    } else if (msg.type === 'UG_STOP_PICK') {
      stopPicking();
      sendResp({ ok: true });
    } else if (msg.type === 'UG_SHOW_TOOLTIP') {
      const resp = handleShowTooltip(msg);
      sendResp(resp);
    } else if (msg.type === 'UG_SHOW_PANEL') {
      if (!floatingPanel) createFloatingPanel();
      sendResp({ ok: true });
    } else if (msg.type === 'UG_HIDE_PANEL') {
      removeFloatingPanel();
      sendResp({ ok: true });
    }
    // returning true indicates async response — not needed here
    return true;
  });

  // Minimal handshake with background/popup optionally
  try {
    chrome.runtime.sendMessage({ type: 'UG_CS_READY' }, () => {});
  } catch (_) {}

  // create nodes upfront
  createOverlay();
  createTooltip();

  function findElementByContains(selector) {
    // Parse selector like "div:contains('text')" or "button:contains("text")"
    const match = selector.match(/^([^:]+):contains\(['"]([^'"]+)['"]\)$/);
    if (!match) return null;
    
    const [, tagName, searchText] = match;
    const elements = document.querySelectorAll(tagName);
    
    for (const el of elements) {
      if (el.textContent && el.textContent.includes(searchText)) {
        return el;
      }
    }
    return null;
  }

  function showTooltipAt(el, text, timeout = 3500) {
    if (!tooltip) createTooltip();
    if (!el) return;
    tooltip.innerText = text;
    const r = el.getBoundingClientRect();
    tooltip.style.display = 'block';
    // Prefer top placement, fallback to bottom if too high
    const topCandidate = r.top + window.scrollY - tooltip.offsetHeight - 8;
    const bottomCandidate = r.bottom + window.scrollY + 8;
    tooltip.style.top = `${(topCandidate > 8 ? topCandidate : bottomCandidate)}px`;
    tooltip.style.left = `${Math.max(8, r.left + window.scrollX)}px`;
    if (timeout > 0) {
      clearTimeout(tooltip._timeout);
      tooltip._timeout = setTimeout(() => {
        if (tooltip) tooltip.style.display = 'none';
      }, timeout);
    }
  }

  // Enhanced element detection that handles dropdown overlays and portals
  function getElementFromPoint(x, y) {
    // Get the element at the point using standard method first
    let element = document.elementFromPoint(x, y);
    
    if (!element) return null;
    
    // Only apply enhanced detection if we have a problematic element
    const isProblematic = element.tagName.toLowerCase() === 'html' || 
                         element.tagName.toLowerCase() === 'body' ||
                         isDropdownBackdrop(element);
    
    if (!isProblematic) {
      // Element is fine, return it as-is
      return element;
    }
    
    // We have a problematic element, try to find a better one
    
    // Check if we hit a backdrop/overlay
    if (isDropdownBackdrop(element)) {
      const elementBehind = findInteractiveElementBehindBackdrop(x, y, element);
      if (elementBehind && elementBehind !== element && 
          elementBehind.tagName.toLowerCase() !== 'html' && 
          elementBehind.tagName.toLowerCase() !== 'body') {
        return elementBehind;
      }
    }
    
    // If we hit html/body, try to find a more specific element
    if (element.tagName.toLowerCase() === 'html' || element.tagName.toLowerCase() === 'body') {
      const betterElement = findBetterElementAtPoint(x, y);
      if (betterElement && betterElement !== element) {
        return betterElement;
      }
    }
    
    // Return the original element if we couldn't find a better one
    return element;
  }

  // Check if element is likely a dropdown backdrop/overlay
  function isDropdownBackdrop(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const classList = Array.from(element.classList || []);
    const style = window.getComputedStyle(element);
    
    // Don't treat interactive elements as backdrops
    if (['button', 'input', 'select', 'textarea', 'a'].includes(tagName)) {
      return false;
    }
    
    // Don't treat elements with meaningful content as backdrops
    if (element.textContent && element.textContent.trim().length > 0) {
      return false;
    }
    
    // Common backdrop patterns (be more specific)
    const backdropPatterns = [
      'backdrop', 'overlay', 'modal-backdrop', 'dialog-backdrop',
      'popover-backdrop', 'dropdown-backdrop', 'radix-backdrop'
    ];
    
    // Check class names
    const hasBackdropClass = classList.some(cls => 
      backdropPatterns.some(pattern => cls.toLowerCase().includes(pattern))
    );
    
    // Check if it's a full-screen overlay (must have high z-index too)
    const isFullScreen = style.position === 'fixed' && 
                         style.top === '0px' && 
                         style.left === '0px' && 
                         (style.width === '100%' || style.width === '100vw') &&
                         (style.height === '100%' || style.height === '100vh');
    
    // Check for high z-index (must be very high for backdrop)
    const hasHighZIndex = parseInt(style.zIndex) > 9999;
    
    // Check for Radix UI specific backdrop attributes (not content attributes)
    const isRadixBackdrop = element.hasAttribute('data-radix-dialog-overlay') ||
                           element.hasAttribute('data-radix-popover-backdrop');
    
    // Check for ShadCN/Radix UI specific backdrop patterns (be more specific)
    const isShadcnBackdrop = classList.some(cls => 
      cls.includes('fixed') && cls.includes('inset-0') && cls.includes('z-')
    );
    
    // Only consider it a backdrop if it has clear backdrop indicators
    return hasBackdropClass || isRadixBackdrop || 
           (isFullScreen && hasHighZIndex) || 
           isShadcnBackdrop;
  }

  // Find interactive element behind backdrop
  function findInteractiveElementBehindBackdrop(x, y, backdrop) {
    // Temporarily hide the backdrop
    const originalDisplay = backdrop.style.display;
    const originalPointerEvents = backdrop.style.pointerEvents;
    
    backdrop.style.pointerEvents = 'none';
    
    try {
      // Get element behind the backdrop
      const elementBehind = document.elementFromPoint(x, y);
      
      // Restore backdrop
      backdrop.style.display = originalDisplay;
      backdrop.style.pointerEvents = originalPointerEvents;
      
      // If we found a better element, return it
      if (elementBehind && 
          elementBehind !== backdrop && 
          elementBehind.tagName.toLowerCase() !== 'html' &&
          elementBehind.tagName.toLowerCase() !== 'body') {
        return elementBehind;
      }
    } catch (error) {
      // Restore backdrop in case of error
      backdrop.style.display = originalDisplay;
      backdrop.style.pointerEvents = originalPointerEvents;
    }
    
    return backdrop;
  }

  // Find a better element when we hit html/body
  function findBetterElementAtPoint(x, y) {
    // Get all elements at the point using elementsFromPoint (if available)
    if (document.elementsFromPoint) {
      const elements = document.elementsFromPoint(x, y);
      
      // Filter out html, body, and our own elements
      const candidates = elements.filter(el => {
        const tagName = el.tagName.toLowerCase();
        return tagName !== 'html' && 
               tagName !== 'body' && 
               !isOurElement(el) &&
               !isDropdownBackdrop(el);
      });
      
      // Return the first meaningful candidate
      if (candidates.length > 0) {
        // Prefer dropdown/component library elements
        const dropdownElement = candidates.find(el => {
          return el.hasAttribute('data-radix-dropdown-menu-trigger') ||
                 el.hasAttribute('data-radix-popover-trigger') ||
                 el.hasAttribute('data-state') ||
                 el.getAttribute('role') === 'button' ||
                 el.hasAttribute('aria-haspopup') ||
                 el.hasAttribute('data-radix-collection-item');
        });
        
        if (dropdownElement) {
          return dropdownElement;
        }
        
        // Prefer interactive elements
        const interactive = candidates.find(el => {
          const tagName = el.tagName.toLowerCase();
          return ['button', 'input', 'select', 'textarea', 'a'].includes(tagName) ||
                 el.hasAttribute('onclick') ||
                 el.hasAttribute('role') ||
                 el.hasAttribute('tabindex');
        });
        
        if (interactive) {
          return interactive;
        }
        
        return candidates[0];
      }
    }
    
    // Fallback: try to find elements in a small radius around the point
    const radius = 5;
    for (let dx = -radius; dx <= radius; dx += 2) {
      for (let dy = -radius; dy <= radius; dy += 2) {
        const testX = x + dx;
        const testY = y + dy;
        
        if (testX >= 0 && testY >= 0 && testX < window.innerWidth && testY < window.innerHeight) {
          const testElement = document.elementFromPoint(testX, testY);
          if (testElement && 
              testElement.tagName.toLowerCase() !== 'html' &&
              testElement.tagName.toLowerCase() !== 'body' &&
              !isOurElement(testElement)) {
            return testElement;
          }
        }
      }
    }
    
    return null;
  }

  function onMouseMove(e) {
    if (!picking) return;
    
    lastMouseEvent = e;
    
    // TEMPORARY: Use standard detection for hover to test
    // Change this back to getElementFromPoint(e.clientX, e.clientY) once working
    const el = document.elementFromPoint(e.clientX, e.clientY);
    
    if (el && el !== currentEl && !isOurElement(el)) {
      currentEl = el;
      updateOverlay(el);
      updateTooltip(el, e.clientX, e.clientY);
    }
  }

  function onClick(e) {
    if (!picking) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // First try standard detection
    let el = document.elementFromPoint(e.clientX, e.clientY);
    
    console.log('Click detected element:', { tag: el?.tagName, class: el?.className, id: el?.id });
    
    // Only use enhanced detection if we got html/body (the problematic case)
    if (el && (el.tagName.toLowerCase() === 'html' || el.tagName.toLowerCase() === 'body')) {
      console.log('Got html/body, trying enhanced detection...');
      
      // Try enhanced detection
      const enhancedEl = getElementFromPoint(e.clientX, e.clientY);
      if (enhancedEl && enhancedEl !== el) {
        console.log('Enhanced detection found:', { tag: enhancedEl?.tagName, class: enhancedEl?.className, id: enhancedEl?.id });
        el = enhancedEl;
      }
      
      // If still html/body, use hover element as fallback
      if (el && (el.tagName.toLowerCase() === 'html' || el.tagName.toLowerCase() === 'body') && currentEl) {
        console.log('Using hover element as fallback:', { tag: currentEl?.tagName, class: currentEl?.className, id: currentEl?.id });
        el = currentEl;
      }
    }
    
    if (el && !isOurElement(el)) {
      processSelectedElement(el);
    }
  }
  
  function processSelectedElement(el) {
    selectedElement = el;
    
    // Generate selectors
    try {
      const selectors = generateRobustSelectors(el);
      updateFloatingPanelResults(el, selectors);
      
      // Show enhanced tooltip with multiple selectors
      const bestSelector = selectors?.best?.[0]?.selector || selectors?.hybrid || getCssSelector(el);
      const short = bestSelector && bestSelector.length > 100 ? bestSelector.slice(0, 100) + '…' : bestSelector;
      showTooltipAt(el, `Element Selected!\nBest selector: ${short}`, 4000);
    } catch (error) {
      console.error('Error generating selectors:', error);
    }
    
    stopPicking();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      stopPicking();
    }
  }

  function isOurElement(el) {
    return el.id === '__ug_overlay' || 
           el.id === '__ug_tooltip' || 
           el.id === '__ug_floating_panel' ||
           el.closest('#__ug_floating_panel');
  }

  function handleShowTooltip(msg) {
    const { selector, x, y } = msg;
    try {
      const el = document.querySelector(selector);
      if (el) {
        updateTooltip(el, x, y);
        return { ok: true };
      }
      return { ok: false, error: 'Element not found' };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  // Clean-up across SPA navigations (optional)
  window.addEventListener('beforeunload', () => {
    if (overlay) overlay.remove();
    if (tooltip) tooltip.remove();
  });
})();
