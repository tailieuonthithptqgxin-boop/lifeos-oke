const fs = require('fs');
const path = require('path');

function search(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      search(full);
    } else if (item.isFile()) {
      if (/header/i.test(item.name) || /legal/i.test(item.name) || /privacy/i.test(item.name) || /custommodule/i.test(item.name)) {
        console.log(full.replace(/\\/g, '/'));
      }
    }
  }
}

search('src');
