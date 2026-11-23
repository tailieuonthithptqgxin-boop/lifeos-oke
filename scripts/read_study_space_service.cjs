const fs = require('fs');
const content = fs.readFileSync('src/backend/services/studySpace.service.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== studySpace.service.ts lines 1-120 ===');
console.log(lines.slice(0, 120).join('\n'));
