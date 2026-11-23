const fs = require('fs');
const content = fs.readFileSync('src/backend/db.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== db.ts lines 1-60 ===');
console.log(lines.slice(0, 60).join('\n'));
