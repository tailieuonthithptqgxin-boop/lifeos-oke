const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = app.split('\n');

lines.forEach((l, i) => {
  if (l.includes('TopBar') || l.includes('BottomNav')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
