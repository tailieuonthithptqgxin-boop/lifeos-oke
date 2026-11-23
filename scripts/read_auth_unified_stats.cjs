const fs = require('fs');
const content = fs.readFileSync('src/backend/routes/auth.ts', 'utf-8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('unified-stats')) {
    console.log(lines.slice(i - 2, i + 35).join('\n'));
  }
});
