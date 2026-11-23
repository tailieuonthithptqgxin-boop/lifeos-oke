const fs = require('fs');
const content = fs.readFileSync('src/lib/retentionEngine.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== retentionEngine.ts lines 60-150 ===');
console.log(lines.slice(60, 150).join('\n'));
