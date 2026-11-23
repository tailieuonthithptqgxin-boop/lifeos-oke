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
        if (/tiếp lửa|kudos|chuỗi|streak|tích lũy/i.test(l) && (full.includes('study') || full.includes('Room') || full.includes('Focus'))) {
          console.log(`${full}:${i+1}: ${l.trim().slice(0, 120)}`);
        }
      });
    }
  }
}

search('src');
