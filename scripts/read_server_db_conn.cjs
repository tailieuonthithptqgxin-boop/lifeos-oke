const fs = require('fs');
const content = fs.readFileSync('src/backend/serverMain.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== serverMain.ts lines 250-320 ===');
console.log(lines.slice(250, 320).join('\n'));
