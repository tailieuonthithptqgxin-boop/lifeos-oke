const fs = require('fs');

const storageKeys = new Map();

function searchDir(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = dir + '/' + item.name;
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      searchDir(full);
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(full, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        const match = l.match(/localStorage\.(?:setItem|getItem)\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (match) {
          const key = match[1];
          if (!storageKeys.has(key)) {
            storageKeys.set(key, []);
          }
          storageKeys.get(key).push({ file: full, line: i + 1, code: l.trim().slice(0, 100) });
        }
      });
    }
  }
}

searchDir('src');

console.log('Total unique localStorage keys found:', storageKeys.size);
for (const [key, occurrences] of storageKeys.entries()) {
  console.log(`Key: [${key}] (${occurrences.length} times) -> File: ${occurrences[0].file}:${occurrences[0].line}`);
}

const keyList = [];
for (const [key, occurrences] of storageKeys.entries()) {
  keyList.push({ key, count: occurrences.length, examples: occurrences });
}
fs.writeFileSync('scripts/local_storage_inventory.json', JSON.stringify(keyList, null, 2));
