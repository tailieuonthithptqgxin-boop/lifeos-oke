const fs = require('fs');
const content = fs.readFileSync('src/backend/routes/auth.ts', 'utf-8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('function getUnifiedUserStats') || l.includes('const getUnifiedUserStats')) {
    console.log(lines.slice(i, i + 50).join('\n'));
  }
});
