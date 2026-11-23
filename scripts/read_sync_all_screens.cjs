const fs = require('fs');
const content = fs.readFileSync('src/lib/globalUserSync.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== globalUserSync.ts lines 180-240 ===');
console.log(lines.slice(180, 240).join('\n'));
