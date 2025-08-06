// Enhanced Element Detection for ShadCN/Radix UI Dropdowns
// This module solves the problem of selecting dropdown elements that use portals and overlays

/**
 * PROBLEM ANALYSIS:
 * 
 * When ShadCN/Radix UI dropdowns are open, several issues occur:
 * 
 * 1. PORTAL RENDERING: Dropdown content is rendered outside the main DOM tree using React portals,
 *    typically at the end of the body or in a special container
 * 
 * 2. BACKDROP OVERLAYS: Many dropdowns create invisible backdrop elements that cover the entire
 *    viewport to handle click-outside behavior
 * 
 * 3. Z-INDEX STACKING: High z-index values can interfere with element detection
 * 
 * 4. DOM CHANGES: The dropdown state changes between hover and click events, causing different
 *    elements to be detected
 * 
 * 5. THEME CLASSES: HTML element gets theme classes like 'dark' which can confuse selectors
 */

/**
 * Enhanced element detection that handles dropdown overlays and portals
 * @param {number} x - Mouse X coordinate
 * @param {number} y - Mouse Y coordinate
 * @returns {Element|null} - The best element found at the coordinates
 */
export function getElementFromPoint(x, y) {
  // Get the element at the point using standard browser API
  let element = document.elementFromPoint(x, y);
  const originalElement = element;
  
  if (!element) return null;
  
  // STEP 1: Check if we hit a dropdown backdrop/overlay
  if (isDropdownBackdrop(element)) {
    // Try to find the actual interactive element behind the backdrop
    element = findInteractiveElementBehindBackdrop(x, y, element);
  }
  
  // STEP 2: Handle html/body elements (common with portals)
  if (element.tagName.toLowerCase() === 'html' || element.tagName.toLowerCase() === 'body') {
    // Try to find a more specific element
    const betterElement = findBetterElementAtPoint(x, y);
    if (betterElement && betterElement !== element) {
      element = betterElement;
    }
  }
  
  // STEP 3: Special case for HTML with theme classes
  if (element.tagName.toLowerCase() === 'html' && element.classList.length > 0) {
    const hasThemeClasses = Array.from(element.classList).some(cls => 
      ['dark', 'light', 'theme-', 'mode-'].some(theme => cls.includes(theme))
    );
    
    if (hasThemeClasses) {
      const betterElement = findBetterElementAtPoint(x, y);
      if (betterElement && betterElement !== element) {
        element = betterElement;
      }
    }
  }
  
  return element;
}

/**
 * Detects if an element is likely a dropdown backdrop/overlay
 * @param {Element} element - Element to check
 * @returns {boolean} - True if element appears to be a backdrop
 */
export function isDropdownBackdrop(element) {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  const classList = Array.from(element.classList || []);
  const style = window.getComputedStyle(element);
  
  // DETECTION METHOD 1: Common backdrop class patterns
  const backdropPatterns = [
    'backdrop', 'overlay', 'modal-backdrop', 'dialog-backdrop',
    'popover-backdrop', 'dropdown-backdrop', 'radix-backdrop'
  ];
  
  const hasBackdropClass = classList.some(cls => 
    backdropPatterns.some(pattern => cls.toLowerCase().includes(pattern))
  );
  
  // DETECTION METHOD 2: Full-screen overlay characteristics
  const isFullScreen = style.position === 'fixed' && 
                       style.top === '0px' && 
                       style.left === '0px' && 
                       (style.width === '100%' || style.width === '100vw') &&
                       (style.height === '100%' || style.height === '100vh');
  
  // DETECTION METHOD 3: High z-index (common for overlays)
  const hasHighZIndex = parseInt(style.zIndex) > 1000;
  
  // DETECTION METHOD 4: Radix UI specific attributes
  const isRadixBackdrop = element.hasAttribute('data-radix-dialog-overlay') ||
                         element.hasAttribute('data-radix-popover-content') ||
                         element.hasAttribute('data-state');
  
  // DETECTION METHOD 5: ShadCN/Tailwind specific patterns
  const isShadcnBackdrop = classList.some(cls => 
    cls.includes('fixed') && cls.includes('inset-0')
  ) || (style.position === 'fixed' && style.inset === '0px');
  
  return hasBackdropClass || (isFullScreen && hasHighZIndex) || isRadixBackdrop || isShadcnBackdrop;
}

/**
 * Finds the interactive element behind a backdrop by temporarily disabling pointer events
 * @param {number} x - Mouse X coordinate
 * @param {number} y - Mouse Y coordinate
 * @param {Element} backdrop - The backdrop element to look behind
 * @returns {Element} - The element behind the backdrop or the backdrop itself
 */
export function findInteractiveElementBehindBackdrop(x, y, backdrop) {
  // Store original styles
  const originalDisplay = backdrop.style.display;
  const originalPointerEvents = backdrop.style.pointerEvents;
  
  // Temporarily disable pointer events on the backdrop
  backdrop.style.pointerEvents = 'none';
  
  try {
    // Get element behind the backdrop
    const elementBehind = document.elementFromPoint(x, y);
    
    // Restore backdrop styles
    backdrop.style.display = originalDisplay;
    backdrop.style.pointerEvents = originalPointerEvents;
    
    // Return the better element if found
    if (elementBehind && 
        elementBehind !== backdrop && 
        elementBehind.tagName.toLowerCase() !== 'html' &&
        elementBehind.tagName.toLowerCase() !== 'body') {
      return elementBehind;
    }
  } catch (error) {
    // Restore backdrop styles in case of error
    backdrop.style.display = originalDisplay;
    backdrop.style.pointerEvents = originalPointerEvents;
  }
  
  return backdrop;
}

/**
 * Finds a better element when we hit html/body using multiple strategies
 * @param {number} x - Mouse X coordinate
 * @param {number} y - Mouse Y coordinate
 * @returns {Element|null} - A better element or null
 */
export function findBetterElementAtPoint(x, y) {
  // STRATEGY 1: Use elementsFromPoint to get all elements at the coordinates
  if (document.elementsFromPoint) {
    const elements = document.elementsFromPoint(x, y);
    
    // Filter out unwanted elements
    const candidates = elements.filter(el => {
      const tagName = el.tagName.toLowerCase();
      return tagName !== 'html' && 
             tagName !== 'body' && 
             !isOurElement(el) &&
             !isDropdownBackdrop(el);
    });
    
    if (candidates.length > 0) {
      // PRIORITY 1: Dropdown/component library elements
      const dropdownElement = candidates.find(el => {
        return el.hasAttribute('data-radix-dropdown-menu-trigger') ||
               el.hasAttribute('data-radix-popover-trigger') ||
               el.hasAttribute('data-state') ||
               el.getAttribute('role') === 'button' ||
               el.hasAttribute('aria-haspopup') ||
               el.hasAttribute('data-radix-collection-item');
      });
      
      if (dropdownElement) return dropdownElement;
      
      // PRIORITY 2: Interactive elements
      const interactive = candidates.find(el => {
        const tagName = el.tagName.toLowerCase();
        return ['button', 'input', 'select', 'textarea', 'a'].includes(tagName) ||
               el.hasAttribute('onclick') ||
               el.hasAttribute('role') ||
               el.hasAttribute('tabindex');
      });
      
      if (interactive) return interactive;
      
      // PRIORITY 3: Any meaningful element
      return candidates[0];
    }
  }
  
  // STRATEGY 2: Search in a small radius around the point
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

/**
 * Enhanced click handler that uses multiple fallback strategies
 * @param {MouseEvent} e - Click event
 * @param {Element} currentEl - Element from hover state
 * @param {MouseEvent} lastMouseEvent - Last mouse event
 * @param {Function} processSelectedElement - Callback to process the selected element
 * @param {Function} isOurElement - Function to check if element belongs to our extension
 */
export function handleDropdownClick(e, currentEl, lastMouseEvent, processSelectedElement, isOurElement) {
  e.preventDefault();
  e.stopPropagation();
  
  // STRATEGY 1: Get element at click coordinates
  let el = getElementFromPoint(e.clientX, e.clientY);
  
  // STRATEGY 2: Use hover element if click gives us html/body
  if (el && (el.tagName.toLowerCase() === 'html' || el.tagName.toLowerCase() === 'body') && currentEl && currentEl !== el) {
    el = currentEl;
  }
  
  // STRATEGY 3: Use last mouse position if still html/body
  if (el && (el.tagName.toLowerCase() === 'html' || el.tagName.toLowerCase() === 'body') && lastMouseEvent) {
    const fallbackEl = getElementFromPoint(lastMouseEvent.clientX, lastMouseEvent.clientY);
    if (fallbackEl && fallbackEl !== el && fallbackEl.tagName.toLowerCase() !== 'html' && fallbackEl.tagName.toLowerCase() !== 'body') {
      el = fallbackEl;
    }
  }
  
  // STRATEGY 4: Delayed detection for DOM changes
  if (el && (el.tagName.toLowerCase() === 'html' || el.tagName.toLowerCase() === 'body')) {
    setTimeout(() => {
      const delayedEl = getElementFromPoint(e.clientX, e.clientY);
      if (delayedEl && delayedEl.tagName.toLowerCase() !== 'html' && delayedEl.tagName.toLowerCase() !== 'body') {
        processSelectedElement(delayedEl);
      } else {
        processSelectedElement(el);
      }
    }, 50);
    return;
  }
  
  if (el && !isOurElement(el)) {
    processSelectedElement(el);
  }
}

/**
 * Check if element belongs to our extension
 * @param {Element} el - Element to check
 * @returns {boolean} - True if element is ours
 */
function isOurElement(el) {
  return el.id === '__ug_overlay' || 
         el.id === '__ug_tooltip' || 
         el.id === '__ug_floating_panel' ||
         el.closest('#__ug_floating_panel');
}

/**
 * SOLUTION SUMMARY:
 * 
 * Our solution addresses the Radix UI dropdown problem through multiple layers:
 * 
 * 1. BACKDROP DETECTION: We identify overlay elements using class patterns, CSS properties,
 *    and Radix-specific attributes
 * 
 * 2. POINTER EVENTS MANIPULATION: We temporarily disable pointer events on backdrops
 *    to access elements behind them
 * 
 * 3. MULTI-ELEMENT ANALYSIS: We use elementsFromPoint() to get all elements at a coordinate
 *    and intelligently filter and prioritize them
 * 
 * 4. FALLBACK STRATEGIES: We implement multiple fallback mechanisms:
 *    - Use hover state element when click fails
 *    - Use last mouse position
 *    - Delayed detection for DOM changes
 *    - Radius-based search
 * 
 * 5. PRIORITY SYSTEM: We prioritize dropdown-specific elements over generic interactive elements
 * 
 * 6. STATE MANAGEMENT: We handle the timing differences between hover and click events
 * 
 * This comprehensive approach ensures that even complex dropdown implementations
 * with portals, overlays, and dynamic DOM changes can be properly detected and selected.
 */