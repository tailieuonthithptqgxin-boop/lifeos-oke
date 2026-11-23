const fs = require('fs');

function searchAll(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = dir + '/' + item.name;
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      searchAll(full);
    } else if (item.isFile()) {
      const c = fs.readFileSync(full, 'utf-8');
      if (c.includes('84h') || c.includes('84 h') || c.includes('342') || c.includes('Level 8') || c.includes('Cấp 8') || c.includes('level: 8') || c.includes('streak: 14') || c.includes('streakDays: 14') || c.includes('14 ngày')) {
        console.log(`MATCH in ${full}`);
        const lines = c.split('\n');
        lines.forEach((l, i) => {
          if (l.includes('84') || l.includes('342') || l.includes('14') || l.includes('Level 8')) {
            console.log(`   L${i+1}: ${l.trim().slice(0, 140)}`);
          }
        });
      }
    }
  }
}

searchAll('src');
