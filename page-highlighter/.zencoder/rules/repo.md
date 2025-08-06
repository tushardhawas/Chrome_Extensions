---
description: Repository Information Overview
alwaysApply: true
---

# Robust Element Selector Chrome Extension

## Summary
A Chrome extension that enables users to select any element on a webpage and obtain multiple robust selector strategies (XPath, CSS selectors, etc.) that work reliably across different websites. The extension provides visual highlighting of elements, generates multiple selector types for maximum compatibility, and offers a user-friendly interface for copying and testing selectors. Built with React and Vite, it's designed to be a powerful tool for web scraping, test automation, and web development.

## Structure
- **src/**: Source code for the extension
  - **entries/**: Entry points for content script and background script
  - **popup/**: React-based popup UI components
  - **assets/**: Static assets like images
- **public/**: Public assets including manifest.json and icons
- **dist/**: Build output directory
- **scripts/**: Build and utility scripts

## Language & Runtime
**Language**: JavaScript/React
**Version**: React 18.2.0
**Build System**: Vite 4.5.0
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- react: 18.2.0
- react-dom: 18.2.0

**Development Dependencies**:
- @vitejs/plugin-react: 4.1.0
- fs-extra: 11.3.1
- vite: 4.5.0

## Build & Installation
```bash
# Install dependencies
npm install

# Development build with hot reload
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

## Chrome Extension Configuration
**Manifest Version**: 3
**Permissions**:
- scripting
- activeTab
- storage
- host_permissions: <all_urls>

**Components**:
- **Popup**: UI interface for controlling the selector tool and displaying results
- **Content Script**: Handles element highlighting and selector generation
- **Background Script**: Manages extension state and communication

## Main Features
**Element Picker**:
- Visual highlighting of elements on mouseover
- Click to select and generate selectors
- Escape key to cancel selection mode

**Robust Selector Generation**:
- Absolute XPath: Full path from root to element
- Relative XPath: Context-based paths using attributes and text
- CSS Selectors: Multiple strategies from ID-based to attribute-based
- Attribute-prioritized selectors: Using data-testid, aria-label, etc.
- Fallback mechanisms for maximum compatibility

**Selector Management**:
- Copy selectors to clipboard
- Test selectors directly on the page
- Save frequently used selectors
- Selector validation and reliability scoring

## Implementation Details
**Selector Generation Algorithms**:
- Smart attribute detection (data-testid, data-test, data-qa, aria-label, etc.)
- ID-based selectors when available and not auto-generated
- Class-based selectors with uniqueness verification
- Position-based selectors as fallback (nth-child)
- Text content-based XPath when appropriate
- Multiple selector strategies per element for redundancy

**UI Components**:
- React-based popup with selector display and management
- Visual overlay for element highlighting
- Tooltip system for displaying selector information
- Toggle controls for picker activation

**Build Process**:
- Vite for efficient bundling and development
- Custom script to copy public assets to dist folder
- Multiple entry points for different extension components