const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf-8');

const lines = app.split('\n');
lines.forEach((l, i) => {
  if (l.includes('custom_module_')) {
    console.log(lines.slice(i, i + 15).join('\n'));
  }
});
