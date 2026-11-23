const fs = require('fs');
const content = fs.readFileSync('src/backend/services/lifeHarmony.service.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== lifeHarmony.service.ts lines 1-100 ===');
console.log(lines.slice(0, 100).join('\n'));
