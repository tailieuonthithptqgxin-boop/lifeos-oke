const fs = require('fs');
const content = fs.readFileSync('src/backend/db.ts', 'utf-8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('seedUserSampleData')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});

// Check where it's imported or used across src/
function search(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = dir + '/' + item.name;
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      search(full);
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      const c = fs.readFileSync(full, 'utf-8');
      if (c.includes('seedUserSampleData')) {
        console.log(`Used in ${full}`);
      }
    }
  }
}
search('src');
