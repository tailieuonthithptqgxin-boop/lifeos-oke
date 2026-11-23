const fs = require('fs');
const content = fs.readFileSync('src/lib/lifeHarmonyEngine.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== lifeHarmonyEngine.ts lines 1-60 ===');
console.log(lines.slice(0, 60).join('\n'));
