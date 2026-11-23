const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = app.split('\n');

lines.forEach((l, i) => {
  if (l.includes('AdminView') || l.includes('custom_module') || l.includes('CustomModule') || l.includes('Island') || l.includes('Spatial') || l.includes('PublicLanding')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
