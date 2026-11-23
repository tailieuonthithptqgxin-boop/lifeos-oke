const fs = require('fs');

const dir = 'src/components/study-space';
const files = fs.readdirSync(dir);

files.forEach(f => {
  if (f.endsWith('.tsx') || f.endsWith('.ts')) {
    const content = fs.readFileSync(dir + '/' + f, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('tích lũy') || l.includes('tiếp lửa') || l.includes('chuỗi') || l.includes('Level') || l.includes('level')) {
        console.log(`${f}:${i+1}: ${l.trim().slice(0, 120)}`);
      }
    });
  }
});
