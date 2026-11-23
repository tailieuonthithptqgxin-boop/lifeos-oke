const fs = require('fs');
const content = fs.readFileSync('src/backend/serverMain.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== serverMain.ts lines 320-390 ===');
console.log(lines.slice(320, 390).join('\n'));
