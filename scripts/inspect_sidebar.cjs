const fs = require('fs');
const content = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');
const lines = content.split('\n');
console.log('Sidebar.tsx line count:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('md:') || l.includes('lg:') || l.includes('sm:') || l.includes('bottom') || l.includes('fixed') || l.includes('isOpen') || l.includes('mobile')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
