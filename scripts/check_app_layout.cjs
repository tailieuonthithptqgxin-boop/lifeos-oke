const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = app.split('\n');

lines.forEach((l, i) => {
  if (l.includes('<Sidebar') || l.includes('md:hidden') || l.includes('lg:hidden') || l.includes('header') || l.includes('navbar') || l.includes('bottom-0')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
