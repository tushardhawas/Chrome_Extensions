import React from "react";
import { useState, useEffect } from "react";

function App() {
  const [currentId, setCurrentId] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [copiedSelector, setCopiedSelector] = useState("");

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0].id;
      setCurrentId(id);
    });

    // Listen for messages from content script
    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'UG_ELEMENT_SELECTED') {
        setSelectedElement(message);
        console.log('Element selected:', message);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const handleActivate = () => {
    setIsActive(true);
    chrome.tabs.sendMessage(currentId, { type: 'UG_START_PICK' }, (response) => {
      console.log('Picker activated:', response);
    });
  };

  const handleDeActivate = () => {
    setIsActive(false);
    chrome.tabs.sendMessage(currentId, { type: 'UG_STOP_PICK' }, (response) => {
      console.log('Picker deactivated:', response);
    });
  };

  const copyToClipboard = async (text, selectorType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSelector(selectorType);
      setTimeout(() => setCopiedSelector(""), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const testSelector = (selector, type) => {
    chrome.tabs.sendMessage(currentId, {
      type: 'UG_SHOW_TOOLTIP',
      selector: selector,
      text: `Testing ${type} selector`,
      timeout: 3000
    }, (response) => {
      console.log('Test result:', response);
    });
  };

  const SelectorRow = ({ label, selector, type, priority = false, uniqueness = null }) => {
    if (!selector) return null;
    
    const getUniquenessIndicator = () => {
      if (!uniqueness) return '';
      if (uniqueness.isUnique) return '✅';
      if (uniqueness.matchCount > 1) return `⚠️ ${uniqueness.matchCount}`;
      return '❌';
    };
    
    return (
      <div className={`selector-row ${priority ? 'priority' : ''} ${uniqueness?.isUnique ? 'unique' : ''}`}>
        <div className="selector-label">
          {label}:
          {uniqueness && (
            <span className="uniqueness-indicator" title={`Matches: ${uniqueness.matchCount}`}>
              {getUniquenessIndicator()}
            </span>
          )}
        </div>
        <div className="selector-value">
          <code>{selector}</code>
        </div>
        <div className="selector-actions">
          <button 
            onClick={() => copyToClipboard(selector, type)}
            className={`copy-btn ${copiedSelector === type ? 'copied' : ''}`}
          >
            {copiedSelector === type ? '✓' : '📋'}
          </button>
          <button 
            onClick={() => testSelector(selector, type)}
            className="test-btn"
          >
            🎯
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <div className="header">
        <h2>🎯 Robust Element Selector</h2>
        <button 
          onClick={() => {
            // Show floating panel on the page instead of using popup
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'UG_SHOW_PANEL' });
              window.close(); // Close the popup
            });
          }}
          className="toggle-btn"
        >
          🚀 Open Floating Panel
        </button>
      </div>
      
      <div className="welcome">
        <p>Click the button above to open the floating selector panel on the current page.</p>
        <p>The floating panel will stay open and won't block your view while you work with elements.</p>
        
        <div className="instructions">
          <p><strong>💡 Features:</strong></p>
          <ul>
            <li><strong>Floating Panel:</strong> Stays on page, doesn't block your view</li>
            <li><strong>AI-Powered:</strong> Intelligent selector ranking with scores</li>
            <li><strong>Modern UI Support:</strong> Handles Radix UI, shadcn/ui, etc.</li>
            <li><strong>Drag & Drop:</strong> Move the panel anywhere on screen</li>
            <li><strong>Real-time Testing:</strong> Test selectors instantly</li>
            <li><strong>One-click Copy:</strong> Copy any selector to clipboard</li>
          </ul>
        </div>
      </div>

      {false && selectedElement && (
        <div className="results">
          <div className="element-info">
            <h3>Selected Element</h3>
            <div className="element-details">
              <div><strong>Tag:</strong> {selectedElement.elementInfo?.tagName}</div>
              {selectedElement.elementInfo?.id && (
                <div><strong>ID:</strong> {selectedElement.elementInfo.id}</div>
              )}
              {selectedElement.elementInfo?.className && (
                <div><strong>Classes:</strong> {selectedElement.elementInfo.className}</div>
              )}
              {selectedElement.elementInfo?.textContent && (
                <div><strong>Text:</strong> {selectedElement.elementInfo.textContent}</div>
              )}
            </div>
          </div>

          <div className="selectors">
            <h3>🏆 Best Selectors (AI Ranked)</h3>
            
            {selectedElement.allSelectors?.best?.map((selector, index) => (
              <SelectorRow 
                key={index}
                label={`${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} ${selector.type} (Score: ${selector.score})`}
                selector={selector.selector} 
                type={`best-${index}`} 
                priority={true}
                uniqueness={selector.uniqueness}
              />
            ))}

            <div className="analysis-info">
              <h4>📊 Element Analysis</h4>
              <div className="analysis-details">
                {selectedElement.allSelectors?.analysis?.componentLibrary && (
                  <div><strong>Framework:</strong> {selectedElement.allSelectors.analysis.componentLibrary}</div>
                )}
                <div><strong>Stable Attributes:</strong> {selectedElement.allSelectors?.analysis?.stableAttributes?.length || 0}</div>
                <div><strong>Stable Classes:</strong> {selectedElement.allSelectors?.analysis?.stableClasses?.length || 0}</div>
                <div><strong>Has Stable ID:</strong> {selectedElement.allSelectors?.analysis?.hasStableId ? '✅' : '❌'}</div>
                <div><strong>Interactive:</strong> {selectedElement.allSelectors?.analysis?.accessibility?.isInteractive ? '✅' : '❌'}</div>
              </div>
            </div>

            <h4>📍 XPath Selectors</h4>
            <SelectorRow 
              label="🎯 XPath by Attribute" 
              selector={selectedElement.allSelectors?.xpathByAttribute} 
              type="xpathByAttribute"
            />
            
            <SelectorRow 
              label="📝 XPath by Text" 
              selector={selectedElement.allSelectors?.xpathByText} 
              type="xpathByText"
            />
            
            <SelectorRow 
              label="🔗 XPath Relative" 
              selector={selectedElement.allSelectors?.xpathRelative} 
              type="xpathRelative"
            />

            <h4>🔧 CSS Selectors</h4>
            <SelectorRow 
              label="🆔 CSS by ID" 
              selector={selectedElement.allSelectors?.cssById} 
              type="cssById"
            />
            
            <SelectorRow 
              label="🏷️ CSS by Attribute" 
              selector={selectedElement.allSelectors?.cssByAttribute} 
              type="cssByAttribute"
            />
            
            <SelectorRow 
              label="🎨 CSS by Class" 
              selector={selectedElement.allSelectors?.cssByClass} 
              type="cssByClass"
            />
            
            <SelectorRow 
              label="🏗️ CSS by Structure" 
              selector={selectedElement.allSelectors?.cssByStructure} 
              type="cssByStructure"
            />

            <SelectorRow 
              label="🧩 Component Library" 
              selector={selectedElement.allSelectors?.cssByComponent} 
              type="cssByComponent"
            />

            <h4>⚠️ Fallback Selectors</h4>
            <SelectorRow 
              label="📍 XPath Absolute" 
              selector={selectedElement.allSelectors?.xpathAbsolute} 
              type="xpathAbsolute"
            />
          </div>

          <div className="instructions">
            <p><strong>💡 Tips:</strong></p>
            <ul>
              <li>🥇 Use <strong>Hybrid</strong> or <strong>ID/Attribute</strong> selectors for best reliability</li>
              <li>📋 Click copy button to copy selector to clipboard</li>
              <li>🎯 Click test button to highlight element on page</li>
              <li>⚠️ Avoid absolute XPath for dynamic content</li>
            </ul>
          </div>
        </div>
      )}

      {!selectedElement && !isActive && (
        <div className="welcome">
          <p>Click "Start Picking" to select elements on the page and generate robust selectors.</p>
          <p>This tool generates multiple selector strategies for maximum compatibility across different websites.</p>
        </div>
      )}

      {isActive && !selectedElement && (
        <div className="picking-mode">
          <p>🎯 <strong>Picking Mode Active</strong></p>
          <p>Hover over elements on the page and click to select them.</p>
          <p>Press <kbd>Escape</kbd> to cancel.</p>
        </div>
      )}
    </div>
  );
}

export default App;
