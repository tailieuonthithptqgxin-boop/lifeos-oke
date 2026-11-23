const fs = require('fs');

function search(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = dir + '/' + item.name;
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      search(full);
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      const c = fs.readFileSync(full, 'utf-8');
      const lines = c.split('\n');
      lines.forEach((l, i) => {
        if (/342|84h|chuỗi 14|level 8|cấp 8|84 giờ/i.test(l)) {
          console.log(`${full}:${i+1}: ${l.trim()}`);
        }
      });
    }
  }
}

console.log('Searching for hardcoded 342, 84h, chuỗi 14, level 8...');
search('src');
