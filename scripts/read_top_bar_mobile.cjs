const fs = require('fs');
const content = fs.readFileSync('src/components/TopBar.tsx', 'utf-8');
const lines = content.split('\n');
console.log(lines.slice(135, 260).join('\n'));
