// src/entries/selector.js
// Advanced Robust Selector Generation System
// Based on Robula+ algorithm with modern UI library support

// Priority attributes for stable selectors (ordered by reliability)
const PRIORITY_ATTRIBUTES = [
  // Testing attributes (highest priority)
  'data-testid', 'data-test', 'data-qa', 'data-cy', 'data-automation',
  'data-test-id', 'data-qa-id', 'data-selenium', 'data-e2e', 'data-automation-id',
  
  // Accessibility attributes (high priority)
  'aria-label', 'aria-labelledby', 'aria-describedby', 'role', 'aria-controls',
  
  // Semantic attributes (medium-high priority)
  'name', 'id', 'title', 'alt', 'placeholder', 'type',
  
  // Content attributes (medium priority)
  'href', 'src', 'value', 'for',
  
  // Radix UI specific attributes
  'data-radix-collection-item', 'data-state', 'data-orientation', 'data-side',
  'data-align', 'data-radix-aspect-ratio-wrapper', 'data-radix-scroll-area-viewport',
  'data-radix-dropdown-menu-trigger', 'data-radix-dropdown-menu-content',
  'data-radix-popover-trigger', 'data-radix-popover-content',
  'data-radix-dialog-trigger', 'data-radix-dialog-content',
  
  // Other component library attributes
  'data-slot', 'data-component', 'data-part', 'data-theme'
];

// Attributes to avoid in selectors (often dynamic)
const UNSTABLE_ATTRIBUTES = [
  'style', 'class', 'data-reactid', 'data-react-checksum', 'data-react-root',
  'data-v-', 'ng-', 'data-ng-', '_ngcontent', '_nghost', 'data-server-rendered',
  'data-ssr', 'data-hydrated', 'data-emotion', 'data-styled'
];

// Classes to avoid (often dynamic or framework-generated)
const UNSTABLE_CLASS_PATTERNS = [
  // CSS-in-JS libraries
  /^css-\w+/, /^sc-\w+/, /^jsx-\d+/, /^emotion-\w+/, /^styled-\w+/,
  
  // Framework generated
  /^_\w+/, /^\w{5,}$/, /\d{4,}/, /^[a-f0-9]{6,}$/i,
  
  // Tailwind and utility classes (too generic)
  /^(p|m|w|h|text|bg|border|flex|grid|absolute|relative|fixed)-/, 
  
  // Component library internals
  /^radix-/, /^react-/, /^vue-/, /^ng-/, /^chakra-/, /^mantine-/,
  
  // Build tool generated
  /^vite-/, /^webpack-/, /^parcel-/
];

// Semantic HTML elements that provide context
const SEMANTIC_ELEMENTS = [
  'header', 'nav', 'main', 'section', 'article', 'aside', 'footer',
  'button', 'input', 'select', 'textarea', 'form', 'label',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img'
];

// Component library specific selectors
const COMPONENT_PATTERNS = {
  radix: {
    button: '[data-radix-collection-item]',
    dialog: '[data-state="open"]',
    dropdown: '[role="menu"]',
    select: '[role="combobox"]'
  },
  shadcn: {
    button: '.inline-flex.items-center.justify-center',
    input: '.flex.h-10.w-full.rounded-md.border'
  }
};

function escapeXPathValue(value) {
  if (value.includes('"') && value.includes("'")) {
    // If value contains both quotes, use concat
    const parts = value.split('"').map(part => `"${part}"`);
    return `concat(${parts.join(", '\"', ")})`;
  } else if (value.includes('"')) {
    return `'${value}'`;
  } else {
    return `"${value}"`;
  }
}

// Advanced uniqueness scoring system
function calculateSelectorScore(selector, element, allElements = null) {
  if (!selector || !element) return 0;
  
  let score = 0;
  const doc = element.ownerDocument || document;
  
  try {
    // Test if selector actually works
    const matches = doc.querySelectorAll(selector);
    if (matches.length === 0) return 0; // Selector doesn't work
    
    // Uniqueness score (most important)
    if (matches.length === 1) {
      score += 100; // Perfect uniqueness
    } else {
      score += Math.max(0, 100 - (matches.length - 1) * 10); // Penalty for multiple matches
    }
    
    // Stability score based on selector type
    if (selector.includes('[data-testid')) score += 50;
    else if (selector.includes('[data-test')) score += 45;
    else if (selector.includes('[data-qa')) score += 40;
    else if (selector.includes('[aria-label')) score += 35;
    else if (selector.includes('#') && !selector.includes('nth-child')) score += 30;
    else if (selector.includes('[role')) score += 25;
    
    // Penalty for fragile patterns
    if (selector.includes('nth-child')) score -= 20;
    if (selector.includes('nth-of-type')) score -= 15;
    if (selector.match(/>\s*\w+:\w+/)) score -= 10; // Complex pseudo-selectors
    
    // Length penalty (shorter is usually better, but not always)
    const length = selector.length;
    if (length < 20) score += 10;
    else if (length > 100) score -= 10;
    
    // Semantic bonus
    if (SEMANTIC_ELEMENTS.some(tag => selector.includes(tag))) score += 5;
    
  } catch (error) {
    return 0; // Invalid selector
  }
  
  return Math.max(0, Math.min(200, score)); // Cap between 0-200
}

// Enhanced element analysis
function analyzeElement(element) {
  const analysis = {
    tagName: element.tagName.toLowerCase(),
    hasId: !!element.id,
    hasStableId: element.id && !/^(__|\d|react-|ng-|vue-|css-|sc-|jsx-)/.test(element.id),
    stableAttributes: [],
    stableClasses: [],
    textContent: '',
    isUnique: false,
    componentLibrary: null,
    semanticContext: [],
    accessibility: {}
  };
  
  // Analyze attributes
  for (const attr of PRIORITY_ATTRIBUTES) {
    if (element.hasAttribute(attr)) {
      const value = element.getAttribute(attr).trim();
      if (value && !UNSTABLE_ATTRIBUTES.some(unstable => attr.startsWith(unstable))) {
        analysis.stableAttributes.push({ name: attr, value, priority: PRIORITY_ATTRIBUTES.indexOf(attr) });
      }
    }
  }
  
  // Sort by priority
  analysis.stableAttributes.sort((a, b) => a.priority - b.priority);
  
  // Analyze classes
  if (element.classList.length > 0) {
    analysis.stableClasses = Array.from(element.classList)
      .filter(cls => !UNSTABLE_CLASS_PATTERNS.some(pattern => pattern.test(cls)))
      .slice(0, 3); // Limit to 3 most stable classes
  }
  
  // Get meaningful text content
  const directText = Array.from(element.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .filter(text => text.length > 0)
    .join(' ');
  
  analysis.textContent = directText.substring(0, 50);
  
  // Detect component library
  if (element.hasAttribute('data-radix-collection-item') || 
      element.closest('[data-radix-collection-item]') ||
      element.hasAttribute('data-state') ||
      element.hasAttribute('data-radix-dropdown-menu-trigger') ||
      element.hasAttribute('data-radix-popover-trigger') ||
      element.hasAttribute('data-radix-dialog-trigger') ||
      element.closest('[data-radix-dropdown-menu-content]') ||
      element.closest('[data-radix-popover-content]') ||
      element.closest('[data-radix-dialog-content]')) {
    analysis.componentLibrary = 'radix';
  } else if ((element.className.includes('inline-flex') && 
             element.className.includes('items-center')) ||
             element.className.includes('rounded-md') ||
             element.className.includes('border') ||
             element.className.includes('shadow-sm')) {
    analysis.componentLibrary = 'shadcn';
  }
  
  // Analyze semantic context
  let current = element.parentElement;
  let depth = 0;
  while (current && depth < 5) {
    if (SEMANTIC_ELEMENTS.includes(current.tagName.toLowerCase())) {
      analysis.semanticContext.push({
        tag: current.tagName.toLowerCase(),
        depth: depth + 1
      });
    }
    current = current.parentElement;
    depth++;
  }
  
  // Accessibility analysis
  analysis.accessibility = {
    hasAriaLabel: element.hasAttribute('aria-label'),
    hasRole: element.hasAttribute('role'),
    isInteractive: ['button', 'input', 'select', 'textarea', 'a'].includes(analysis.tagName) ||
                   element.hasAttribute('onclick') || element.hasAttribute('role')
  };
  
  return analysis;
}

function isStableClass(className) {
  if (!className || className.length < 2) return false;
  return !UNSTABLE_CLASS_PATTERNS.some(pattern => pattern.test(className));
}

function getStableAttributes(el) {
  const stableAttrs = [];
  for (const attr of PRIORITY_ATTRIBUTES) {
    if (el.hasAttribute(attr)) {
      const value = el.getAttribute(attr).trim();
      if (value && !UNSTABLE_ATTRIBUTES.some(unstable => attr.startsWith(unstable))) {
        stableAttrs.push({ name: attr, value });
      }
    }
  }
  return stableAttrs;
}

function getElementText(el) {
  // Get direct text content (not from children)
  const textNodes = Array.from(el.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .filter(text => text.length > 0);
  
  return textNodes.join(' ').substring(0, 50); // Limit length
}

// Advanced Robula+ inspired selector generation
export function generateRobustSelectors(el) {
  if (!(el instanceof Element)) return null;

  const analysis = analyzeElement(el);
  const candidates = [];

  // Generate all possible selector candidates
  candidates.push(...generateAttributeSelectors(el, analysis));
  candidates.push(...generateStructuralSelectors(el, analysis));
  candidates.push(...generateTextBasedSelectors(el, analysis));
  candidates.push(...generateComponentLibrarySelectors(el, analysis));
  candidates.push(...generateXPathSelectors(el, analysis));

  // Score and rank all candidates
  const scoredSelectors = candidates
    .map(candidate => ({
      ...candidate,
      score: calculateSelectorScore(candidate.selector, el),
      uniqueness: testSelectorUniqueness(candidate.selector, el)
    }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  // Organize by category and select best ones
  const result = {
    // Best selectors (top scored)
    best: scoredSelectors.slice(0, 3).map(s => ({ 
      selector: s.selector, 
      type: s.type, 
      score: s.score,
      uniqueness: s.uniqueness 
    })),
    
    // Categorized selectors
    cssById: null,
    cssByAttribute: null,
    cssByClass: null,
    cssByStructure: null,
    cssByText: null,
    cssByComponent: null,
    
    xpathAbsolute: null,
    xpathRelative: null,
    xpathByAttribute: null,
    xpathByText: null,
    xpathByPosition: null,
    
    // Legacy compatibility
    hybrid: null,
    
    // Metadata
    analysis: analysis,
    allCandidates: scoredSelectors
  };

  // Fill categorized selectors
  for (const candidate of scoredSelectors) {
    if (!result[candidate.category] && candidate.score > 50) {
      result[candidate.category] = candidate.selector;
    }
  }

  // Set hybrid as the best overall selector
  result.hybrid = result.best[0]?.selector || generateFallbackSelector(el);

  return result;
}

function generateAttributeSelectors(el, analysis) {
  const selectors = [];
  const tagName = analysis.tagName;

  // ID-based selectors
  if (analysis.hasStableId) {
    selectors.push({
      selector: `#${CSS.escape(el.id)}`,
      type: 'ID',
      category: 'cssById',
      priority: 100
    });
  }

  // Attribute-based selectors
  for (const attr of analysis.stableAttributes.slice(0, 5)) {
    // CSS attribute selector
    selectors.push({
      selector: `${tagName}[${attr.name}="${CSS.escape(attr.value)}"]`,
      type: 'Attribute',
      category: 'cssByAttribute',
      priority: 90 - attr.priority
    });

    // More specific attribute selector
    if (analysis.stableClasses.length > 0) {
      selectors.push({
        selector: `${tagName}.${CSS.escape(analysis.stableClasses[0])}[${attr.name}="${CSS.escape(attr.value)}"]`,
        type: 'Attribute + Class',
        category: 'cssByAttribute',
        priority: 85 - attr.priority
      });
    }
  }

  return selectors;
}

function generateStructuralSelectors(el, analysis) {
  const selectors = [];
  const tagName = analysis.tagName;

  // Class-based selectors
  if (analysis.stableClasses.length > 0) {
    // Single class
    const primaryClass = analysis.stableClasses[0];
    selectors.push({
      selector: `${tagName}.${CSS.escape(primaryClass)}`,
      type: 'Class',
      category: 'cssByClass',
      priority: 70
    });

    // Multiple classes for specificity
    if (analysis.stableClasses.length > 1) {
      const classSelector = analysis.stableClasses.slice(0, 2)
        .map(cls => `.${CSS.escape(cls)}`).join('');
      selectors.push({
        selector: `${tagName}${classSelector}`,
        type: 'Multiple Classes',
        category: 'cssByClass',
        priority: 75
      });
    }
  }

  // Structural selectors with semantic context
  const structuralSelector = generateAdvancedStructuralSelector(el, analysis);
  if (structuralSelector) {
    selectors.push({
      selector: structuralSelector,
      type: 'Structural',
      category: 'cssByStructure',
      priority: 60
    });
  }

  return selectors;
}

function generateTextBasedSelectors(el, analysis) {
  const selectors = [];
  const tagName = analysis.tagName;

  if (analysis.textContent && analysis.textContent.length > 2) {
    // CSS contains (for supported browsers/libraries)
    selectors.push({
      selector: `${tagName}:contains("${analysis.textContent}")`,
      type: 'Text Content',
      category: 'cssByText',
      priority: 50
    });

    // More specific text-based selector
    if (analysis.stableClasses.length > 0) {
      selectors.push({
        selector: `${tagName}.${CSS.escape(analysis.stableClasses[0])}:contains("${analysis.textContent}")`,
        type: 'Class + Text',
        category: 'cssByText',
        priority: 55
      });
    }
  }

  return selectors;
}

function generateComponentLibrarySelectors(el, analysis) {
  const selectors = [];
  const tagName = analysis.tagName;

  if (analysis.componentLibrary === 'radix') {
    // Radix-specific selectors
    if (el.hasAttribute('data-state')) {
      const state = el.getAttribute('data-state');
      selectors.push({
        selector: `${tagName}[data-state="${state}"]`,
        type: 'Radix State',
        category: 'cssByComponent',
        priority: 80
      });
    }

    if (el.hasAttribute('data-radix-collection-item')) {
      selectors.push({
        selector: `${tagName}[data-radix-collection-item]`,
        type: 'Radix Collection',
        category: 'cssByComponent',
        priority: 75
      });
    }
  }

  if (analysis.componentLibrary === 'shadcn') {
    // shadcn/ui specific patterns
    const commonClasses = analysis.stableClasses.filter(cls => 
      ['inline-flex', 'items-center', 'justify-center', 'rounded-md'].includes(cls)
    );
    
    if (commonClasses.length >= 2) {
      selectors.push({
        selector: `${tagName}.${commonClasses.slice(0, 3).map(cls => CSS.escape(cls)).join('.')}`,
        type: 'shadcn Pattern',
        category: 'cssByComponent',
        priority: 70
      });
    }
  }

  return selectors;
}

function generateXPathSelectors(el, analysis) {
  const selectors = [];
  const tagName = analysis.tagName;

  // XPath by attributes
  for (const attr of analysis.stableAttributes.slice(0, 3)) {
    selectors.push({
      selector: `//${tagName}[@${attr.name}=${escapeXPathValue(attr.value)}]`,
      type: 'XPath Attribute',
      category: 'xpathByAttribute',
      priority: 85 - attr.priority
    });
  }

  // XPath by text
  if (analysis.textContent && analysis.textContent.length > 2) {
    selectors.push({
      selector: `//${tagName}[contains(text(), ${escapeXPathValue(analysis.textContent)})]`,
      type: 'XPath Text',
      category: 'xpathByText',
      priority: 60
    });

    // More specific text XPath
    selectors.push({
      selector: `//${tagName}[normalize-space(text())=${escapeXPathValue(analysis.textContent.trim())}]`,
      type: 'XPath Exact Text',
      category: 'xpathByText',
      priority: 65
    });
  }

  // XPath relative with semantic context
  const relativeXPath = generateSmartRelativeXPath(el, analysis);
  if (relativeXPath) {
    selectors.push({
      selector: relativeXPath,
      type: 'XPath Relative',
      category: 'xpathRelative',
      priority: 70
    });
  }

  // XPath absolute (fallback)
  selectors.push({
    selector: generateAbsoluteXPath(el),
    type: 'XPath Absolute',
    category: 'xpathAbsolute',
    priority: 20
  });

  return selectors;
}

function generateAdvancedStructuralSelector(el, analysis) {
  const parts = [];
  let current = el;
  let depth = 0;

  while (current && depth < 4) {
    let part = current.tagName.toLowerCase();
    
    // Use stable ID if available
    if (current.id && !/^(__|\d|react-|ng-|vue-)/.test(current.id)) {
      part = `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break;
    }

    // Use stable attributes
    const currentAnalysis = analyzeElement(current);
    if (currentAnalysis.stableAttributes.length > 0) {
      const attr = currentAnalysis.stableAttributes[0];
      part += `[${attr.name}="${CSS.escape(attr.value)}"]`;
    } else if (currentAnalysis.stableClasses.length > 0) {
      part += `.${CSS.escape(currentAnalysis.stableClasses[0])}`;
    } else {
      // Use semantic positioning
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
          child.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `:nth-of-type(${index})`;
        }
      }
    }

    parts.unshift(part);
    current = current.parentElement;
    depth++;
  }

  return parts.length > 0 ? parts.join(' > ') : null;
}

function generateSmartRelativeXPath(el, analysis) {
  // Find a stable ancestor
  let current = el.parentElement;
  let depth = 0;
  
  while (current && depth < 5) {
    const parentAnalysis = analyzeElement(current);
    
    if (parentAnalysis.hasStableId || parentAnalysis.stableAttributes.length > 0) {
      let ancestorSelector;
      
      if (parentAnalysis.hasStableId) {
        ancestorSelector = `//*[@id="${current.id}"]`;
      } else {
        const attr = parentAnalysis.stableAttributes[0];
        ancestorSelector = `//${current.tagName.toLowerCase()}[@${attr.name}=${escapeXPathValue(attr.value)}]`;
      }
      
      // Build relative path from ancestor to target
      const pathParts = [];
      let pathCurrent = el;
      
      while (pathCurrent !== current) {
        const siblings = Array.from(pathCurrent.parentElement.children)
          .filter(child => child.tagName === pathCurrent.tagName);
        const index = siblings.indexOf(pathCurrent) + 1;
        pathParts.unshift(`${pathCurrent.tagName.toLowerCase()}[${index}]`);
        pathCurrent = pathCurrent.parentElement;
      }
      
      return pathParts.length > 0 ? `${ancestorSelector}//${pathParts.join('/')}` : ancestorSelector;
    }
    
    current = current.parentElement;
    depth++;
  }
  
  return null;
}

function testSelectorUniqueness(selector, element) {
  try {
    const matches = document.querySelectorAll(selector);
    return {
      isUnique: matches.length === 1,
      matchCount: matches.length,
      matchesTarget: Array.from(matches).includes(element)
    };
  } catch (error) {
    return { isUnique: false, matchCount: 0, matchesTarget: false };
  }
}

function generateFallbackSelector(el) {
  // Last resort: generate a working selector even if not optimal
  const tagName = el.tagName.toLowerCase();
  
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }
  
  if (el.className) {
    const classes = Array.from(el.classList).slice(0, 2);
    return `${tagName}.${classes.map(cls => CSS.escape(cls)).join('.')}`;
  }
  
  // Use position as absolute fallback
  return generateAbsoluteXPath(el);
}

function generateStructuralCssSelector(el) {
  const parts = [];
  let current = el;
  let depth = 0;

  while (current && current.nodeType === Node.ELEMENT_NODE && depth < 5) {
    let part = current.tagName.toLowerCase();
    
    // Add ID if stable
    if (current.id && !/^(__|\d|react-|ng-|vue-)/.test(current.id)) {
      part = `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break; // ID is unique, no need to go further
    }

    // Add stable attributes
    const stableAttrs = getStableAttributes(current);
    if (stableAttrs.length > 0) {
      const attr = stableAttrs[0];
      part += `[${attr.name}="${CSS.escape(attr.value)}"]`;
    } else {
      // Add stable class
      const stableClasses = Array.from(current.classList || []).filter(isStableClass);
      if (stableClasses.length > 0) {
        part += `.${CSS.escape(stableClasses[0])}`;
      } else {
        // Use nth-child as fallback
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(child => 
            child.tagName === current.tagName
          );
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            part += `:nth-child(${index})`;
          }
        }
      }
    }

    parts.unshift(part);
    current = current.parentElement;
    depth++;
  }

  return parts.join(' > ');
}

function generateAbsoluteXPath(el) {
  const parts = [];
  let current = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;
    
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.tagName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

function generateRelativeXPath(el) {
  const tagName = el.tagName.toLowerCase();
  const stableAttrs = getStableAttributes(el);
  
  if (stableAttrs.length > 0) {
    const attr = stableAttrs[0];
    return `//${tagName}[@${attr.name}=${escapeXPathValue(attr.value)}]`;
  }

  // Try to find a stable parent and create relative path
  let current = el.parentElement;
  let depth = 0;
  
  while (current && depth < 3) {
    const parentAttrs = getStableAttributes(current);
    if (parentAttrs.length > 0 || (current.id && !/^(__|\d)/.test(current.id))) {
      let parentSelector;
      if (current.id && !/^(__|\d)/.test(current.id)) {
        parentSelector = `//*[@id="${current.id}"]`;
      } else {
        const attr = parentAttrs[0];
        parentSelector = `//${current.tagName.toLowerCase()}[@${attr.name}=${escapeXPathValue(attr.value)}]`;
      }
      
      // Build path from stable parent to target
      const pathParts = [];
      let pathCurrent = el;
      while (pathCurrent !== current) {
        const siblings = Array.from(pathCurrent.parentElement.children)
          .filter(child => child.tagName === pathCurrent.tagName);
        const index = siblings.indexOf(pathCurrent) + 1;
        pathParts.unshift(`${pathCurrent.tagName.toLowerCase()}[${index}]`);
        pathCurrent = pathCurrent.parentElement;
      }
      
      return `${parentSelector}//${pathParts.join('/')}`;
    }
    current = current.parentElement;
    depth++;
  }

  return `//${tagName}`;
}

function generatePositionalXPath(el) {
  const tagName = el.tagName.toLowerCase();
  const parent = el.parentElement;
  
  if (!parent) return `//${tagName}`;

  const siblings = Array.from(parent.children).filter(child => 
    child.tagName === el.tagName
  );
  
  if (siblings.length === 1) {
    return `//${tagName}`;
  }

  const index = siblings.indexOf(el) + 1;
  return `//${tagName}[${index}]`;
}

function generateHybridSelector(el, stableAttrs, elementText) {
  const tagName = el.tagName.toLowerCase();
  
  // Priority: stable attributes > ID > classes > text > position
  if (stableAttrs.length > 0) {
    const attr = stableAttrs[0];
    return `${tagName}[${attr.name}="${CSS.escape(attr.value)}"]`;
  }
  
  if (el.id && !/^(__|\d|react-|ng-|vue-)/.test(el.id)) {
    return `#${CSS.escape(el.id)}`;
  }
  
  const stableClasses = Array.from(el.classList || []).filter(isStableClass);
  if (stableClasses.length > 0) {
    return `${tagName}.${CSS.escape(stableClasses[0])}`;
  }
  
  if (elementText && elementText.length > 2) {
    return `${tagName}:contains("${elementText}")`;
  }
  
  return generateStructuralCssSelector(el);
}

// Legacy functions for backward compatibility
export function getCssSelector(el) {
  const selectors = generateRobustSelectors(el);
  return selectors?.hybrid || selectors?.cssByStructure || null;
}

export function getXPath(el) {
  const selectors = generateRobustSelectors(el);
  return selectors?.xpathByAttribute || selectors?.xpathRelative || selectors?.xpathAbsolute || null;
}
