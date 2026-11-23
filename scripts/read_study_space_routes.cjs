const fs = require('fs');
const content = fs.readFileSync('src/backend/routes/studySpace.routes.ts', 'utf-8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('rooms') || l.includes('members') || l.includes('activeCount') || l.includes('kudos') || l.includes('mock') || l.includes('sample')) {
    console.log(`${i+1}: ${l.trim().slice(0, 120)}`);
  }
});
