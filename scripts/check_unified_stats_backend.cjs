const fs = require('fs');

function search(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = dir + '/' + item.name;
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      search(full);
    } else if (item.isFile() && item.name.endsWith('.ts')) {
      const c = fs.readFileSync(full, 'utf-8');
      if (c.includes('unified-stats')) {
        console.log(`FOUND in ${full}`);
      }
    }
  }
}

search('src/backend');
