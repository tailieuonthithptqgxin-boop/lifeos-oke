const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = app.split('\n');

console.log(lines.slice(610, 680).join('\n'));
