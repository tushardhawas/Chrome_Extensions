# 🎯 Robust Element Selector Chrome Extension

A powerful Chrome extension that enables you to select any element on a webpage and generate multiple robust selector strategies (XPath, CSS selectors, etc.) that work reliably across different websites.

## ✨ Features

### 🎯 **Smart Element Selection**
- Visual highlighting of elements on mouseover
- Click to select and generate selectors
- Escape key to cancel selection mode
- Real-time element information display

### 🏆 **Multiple Selector Strategies**
- **CSS Selectors:**
  - ID-based selectors (when stable)
  - Attribute-based selectors (data-testid, data-test, etc.)
  - Class-based selectors (filtering out dynamic classes)
  - Structural selectors (parent-child relationships)
  - Text-content selectors

- **XPath Selectors:**
  - Absolute XPath (full path from root)
  - Relative XPath (context-based paths)
  - Attribute-based XPath
  - Text-content XPath
  - Position-based XPath

- **Hybrid Selector:**
  - Intelligently combines multiple strategies
  - Prioritizes stability over brevity
  - Fallback mechanisms for maximum compatibility

### 🛡️ **Robust Algorithm**
- **Smart Attribute Detection:** Prioritizes stable attributes like `data-testid`, `data-test`, `data-qa`, `aria-label`
- **Dynamic Class Filtering:** Avoids framework-generated classes (React, Vue, Angular)
- **Fallback Mechanisms:** Multiple selector strategies ensure reliability
- **Cross-framework Compatibility:** Works with React, Vue, Angular, and vanilla JS

### 🎨 **User-Friendly Interface**
- Beautiful, modern popup interface
- One-click copy to clipboard
- Test selectors directly on the page
- Visual feedback and tooltips
- Organized selector categories with priority indicators

## 🚀 Installation

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd page-highlighter

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` folder
4. The extension icon should appear in your toolbar

## 📖 Usage

### Basic Usage
1. **Activate the Extension:** Click the extension icon and press "🎯 Start Picking"
2. **Select Elements:** Hover over elements on the page to see them highlighted
3. **Generate Selectors:** Click on any element to generate robust selectors
4. **Copy & Test:** Use the popup interface to copy selectors or test them

### Understanding Selector Types

#### 🥇 **Recommended Selectors** (Use These First)
- **Best Hybrid:** Intelligently combines multiple strategies
- **CSS by ID:** Uses element ID (when stable and not auto-generated)
- **CSS by Attribute:** Uses data-testid, data-test, aria-label, etc.

#### 📍 **XPath Selectors**
- **XPath by Attribute:** Attribute-based XPath (most reliable)
- **XPath by Text:** Text content-based selection
- **XPath Relative:** Context-aware positioning

#### 🔧 **Alternative CSS Selectors**
- **CSS by Class:** Stable class-based selectors
- **CSS by Structure:** Parent-child relationship selectors

#### ⚠️ **Fallback Selectors** (Use Only When Necessary)
- **XPath Absolute:** Full path from document root
- **XPath by Position:** Position-based selection

## 🧪 Testing

A comprehensive test page is included (`test-page.html`) with various element types:
- Buttons with different attribute patterns
- Form elements with various identifiers
- Dynamic content with framework classes
- Tables with data attributes
- Text-based elements
- Media elements

Open `test-page.html` in your browser and test the extension on different element types.

## 🔧 Technical Details

### Selector Generation Algorithm

The extension uses a sophisticated multi-strategy approach:

1. **Priority Attribute Detection:**
   ```javascript
   const PRIORITY_ATTRIBUTES = [
     'data-testid', 'data-test', 'data-qa', 'data-cy',
     'aria-label', 'role', 'name', 'title', 'alt'
   ];
   ```

2. **Dynamic Class Filtering:**
   ```javascript
   const UNSTABLE_CLASS_PATTERNS = [
     /^css-\w+/,     // emotion/styled-components
     /^sc-\w+/,      // styled-components
     /^jsx-\d+/,     // styled-jsx
     /^\w{5,}$/,     // likely hash-based
   ];
   ```

3. **Intelligent Fallbacks:**
   - ID → Attributes → Classes → Structure → Position
   - Multiple XPath strategies for different use cases
   - Text-content matching for unique elements

### Architecture

```
src/
├── entries/
│   ├── contentScript.js    # Main content script
│   ├── selector.js         # Robust selector generation
│   └── background.js       # Background service worker
├── popup/
│   ├── App.jsx            # React popup interface
│   ├── index.css          # Styling
│   └── main.jsx           # Entry point
└── assets/                # Static assets
```

## 🎨 Customization

### Adding New Selector Strategies
Extend the `generateRobustSelectors` function in `selector.js`:

```javascript
export function generateRobustSelectors(el) {
  const selectors = {
    // Add your custom selector type
    customSelector: generateCustomSelector(el),
    // ... existing selectors
  };
  return selectors;
}
```

### Modifying Priority Attributes
Update the `PRIORITY_ATTRIBUTES` array in `selector.js`:

```javascript
const PRIORITY_ATTRIBUTES = [
  'data-testid',
  'your-custom-attribute',
  // ... other attributes
];
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

**Extension not working on some sites:**
- Some sites may have Content Security Policy restrictions
- Try refreshing the page after installing the extension

**Selectors not working:**
- Test selectors using the built-in test functionality
- Use the browser's developer console to verify selectors
- Try alternative selector strategies provided

**Build issues:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 🧠 **Advanced AI-Powered Selector System**

### **Robula+ Inspired Algorithm**
Our selector generation is based on the Robula+ research algorithm, enhanced for modern web applications:

- **Uniqueness Scoring**: Each selector gets a reliability score (0-200)
- **Multi-Strategy Generation**: 15+ different selector strategies
- **Component Library Detection**: Automatic detection of Radix UI, shadcn/ui, etc.
- **Stability Analysis**: Filters out dynamic/generated classes and IDs
- **Semantic Context**: Uses HTML5 semantic elements for better targeting

### **Modern UI Library Support**
- **Radix UI**: Detects `data-radix-*` attributes and component patterns
- **shadcn/ui**: Recognizes Tailwind-based component patterns
- **React/Vue/Angular**: Filters out framework-generated attributes
- **CSS-in-JS**: Avoids emotion, styled-components generated classes

### **Intelligent Scoring System**
```javascript
Score Factors:
- Uniqueness (100 points): Perfect if selector matches only 1 element
- Stability (50 points): data-testid > data-test > aria-label > id
- Fragility Penalty (-20 points): nth-child, complex pseudo-selectors
- Semantic Bonus (+5 points): Uses semantic HTML elements
```

## 🚀 Future Enhancements

- [x] **AI-powered selector scoring and ranking**
- [x] **Modern UI library detection and support**
- [x] **Robula+ algorithm implementation**
- [x] **Real-time uniqueness validation**
- [ ] Export/import selector collections
- [ ] Integration with popular testing frameworks
- [ ] Selector optimization suggestions
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Selector performance benchmarking
- [ ] Machine learning-based selector optimization

---

**Made with ❤️ for web developers, QA engineers, and automation enthusiasts!**
