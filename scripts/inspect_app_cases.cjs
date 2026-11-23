const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = app.split('\n');

const renderedViews = [];
lines.forEach((l, i) => {
  if (l.includes('case \'') || l.includes('case "')) {
    const nextFew = lines.slice(i, i + 10).join('\n');
    renderedViews.push({ line: i + 1, code: l.trim(), snippet: nextFew });
  }
});

fs.writeFileSync('scripts/app_rendered_views.json', JSON.stringify(renderedViews, null, 2));
console.log('Total case statements in App.tsx:', renderedViews.length);
