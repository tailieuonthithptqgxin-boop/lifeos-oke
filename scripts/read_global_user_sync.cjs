const fs = require('fs');
const content = fs.readFileSync('src/lib/globalUserSync.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== globalUserSync.ts lines 1-120 ===');
console.log(lines.slice(0, 120).join('\n'));
