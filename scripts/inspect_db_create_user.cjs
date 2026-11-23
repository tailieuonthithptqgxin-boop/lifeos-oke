const fs = require('fs');
const dbContent = fs.readFileSync('src/backend/db.ts', 'utf-8');
const lines = dbContent.split('\n');

lines.forEach((l, i) => {
  if (l.includes('createUser(')) {
    console.log(lines.slice(i, i + 50).join('\n'));
  }
});
