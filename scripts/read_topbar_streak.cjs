const fs = require('fs');
const content = fs.readFileSync('src/components/TopBar.tsx', 'utf-8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('realStreak') || l.includes('retentionProfile')) {
    console.log(lines.slice(i - 2, i + 15).join('\n'));
  }
});
