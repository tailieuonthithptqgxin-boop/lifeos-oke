const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');

// Let's find where tabs are rendered in App.tsx
const lines = app.split('\n');
const renderedViews = [];

let inSwitch = false;
let currentTabName = '';
let currentJsx = '';

lines.forEach((line, idx) => {
  if (line.includes('switch (activeTab)') || line.includes('switch (currentView)')) {
    inSwitch = true;
  }
  if (inSwitch) {
    if (line.match(/case\s+['"`]([^'"`]+)['"`]\s*:/)) {
      const match = line.match(/case\s+['"`]([^'"`]+)['"`]\s*:/);
      currentTabName = match[1];
    }
    if (line.includes('<') && currentTabName) {
      currentJsx += line.trim() + ' ';
    }
    if (line.includes('return ') && currentTabName) {
      renderedViews.push({ tab: currentTabName, line: idx + 1, jsx: currentJsx || line.trim() });
      currentTabName = '';
      currentJsx = '';
    }
  }
});

console.log('Total rendered views found:', renderedViews.length);
renderedViews.slice(0, 15).forEach(v => console.log(v.tab, '->', v.jsx.substring(0, 80)));

fs.writeFileSync('scripts/rendered_views_detail.json', JSON.stringify(renderedViews, null, 2));
