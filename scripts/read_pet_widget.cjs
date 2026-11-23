const fs = require('fs');
const content = fs.readFileSync('src/components/companion/DopaminePetWidget.tsx', 'utf-8');
const lines = content.split('\n');

console.log('=== DopaminePetWidget.tsx lines 90-150 ===');
console.log(lines.slice(90, 150).join('\n'));
