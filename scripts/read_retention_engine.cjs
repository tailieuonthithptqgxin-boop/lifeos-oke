const fs = require('fs');
const content = fs.readFileSync('src/lib/retentionEngine.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== retentionEngine.ts lines 1-60 ===');
console.log(lines.slice(0, 60).join('\n'));
