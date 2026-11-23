const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');

// Find activeTab cases
const caseRegex = /case\s+['"`]([^'"`]+)['"`]\s*:/g;
const cases = [];
let m;
while ((m = caseRegex.exec(app)) !== null) {
  cases.push(m[1]);
}

// Find view imports in App.tsx
const importRegex = /import\s+(?:\{[^}]+\}|\w+)\s+from\s+['"`]([^'"`]+)['"`]/g;
const imports = [];
while ((m = importRegex.exec(app)) !== null) {
  if (m[1].includes('View') || m[1].includes('Modal') || m[1].includes('features')) {
    imports.push(m[1]);
  }
}

// Check navigation items or sidebar links
const navItems = [];
const navRegex = /id:\s*['"`]([^'"`]+)['"`],\s*label:\s*['"`]([^'"`]+)['"`]/g;
while ((m = navRegex.exec(app)) !== null) {
  navItems.push({ id: m[1], label: m[2] });
}

console.log('Unique activeTab cases in App.tsx:', [...new Set(cases)]);
console.log('Nav items count:', navItems.length);
console.log('View/Modal imports in App.tsx:', imports);

fs.writeFileSync('scripts/frontend_views.json', JSON.stringify({
  cases: [...new Set(cases)],
  navItems,
  imports
}, null, 2));
