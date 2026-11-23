const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = app.split('\n');

// Find all lazy imports or direct imports of views
const lazyImports = [];
lines.forEach((l, i) => {
  if (l.includes('React.lazy') || l.includes('lazy(')) {
    lazyImports.push({ line: i + 1, code: l.trim() });
  }
});

// Map activeTab cases to the returned JSX
const tabMapping = [];
let currentCase = null;
let currentBlock = [];

lines.forEach((l, i) => {
  const caseMatch = l.match(/case\s+['"`]([^'"`]+)['"`]\s*:/);
  if (caseMatch) {
    if (currentCase) {
      tabMapping.push({ cases: currentCase, jsxSnippet: currentBlock.join(' ').trim() });
    }
    currentCase = [caseMatch[1]];
    currentBlock = [];
  } else if (l.includes('case ') && currentCase) {
    const extraMatch = l.match(/case\s+['"`]([^'"`]+)['"`]\s*:/);
    if (extraMatch) {
      currentCase.push(extraMatch[1]);
    }
  } else if (l.includes('return ') || l.includes('<') || l.includes('break;')) {
    if (currentCase) {
      currentBlock.push(l.trim());
      if (l.includes('return ') || l.includes('break;')) {
        tabMapping.push({ cases: currentCase, jsxSnippet: currentBlock.join(' ').trim() });
        currentCase = null;
        currentBlock = [];
      }
    }
  }
});

fs.writeFileSync('scripts/app_tab_mapping.json', JSON.stringify({
  lazyImports,
  tabMapping
}, null, 2));

console.log('Lazy imports count:', lazyImports.length);
console.log('Tab mappings count:', tabMapping.length);
