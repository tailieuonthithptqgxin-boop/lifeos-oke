const fs = require('fs');

function search(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = dir + '/' + item.name;
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      search(full);
    } else if (item.isFile()) {
      if (item.name.endsWith('.db') || item.name.endsWith('.sqlite') || item.name.includes('dev.db')) {
        console.log(`Found database file: ${full} (${fs.statSync(full).size} bytes)`);
      }
    }
  }
}

search('.');
