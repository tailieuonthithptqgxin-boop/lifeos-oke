const fs = require('fs');
const content = fs.readFileSync('src/lib/globalUserSync.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== globalUserSync.ts lines 115-180 ===');
console.log(lines.slice(115, 180).join('\n'));
