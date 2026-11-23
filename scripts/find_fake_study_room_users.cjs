const fs = require('fs');
const path = require('path');

function searchCode(dir, pattern) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      searchCode(full, pattern);
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(full, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        if (pattern.test(l)) {
          console.log(`${full.replace(/\\/g, '/')}:${i+1}: ${l.trim().slice(0, 140)}`);
        }
      });
    }
  }
}

console.log('Searching for fake participants / 120 users / mock study room...');
searchCode('src', /120|demo|dummy|sample|generate.*participant|fake.*user/i);
