const fs = require('fs');
const content = fs.readFileSync('src/components/TopBar.tsx', 'utf-8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('return (') || l.includes('header') || l.includes('md:hidden') || l.includes('sm:hidden') || l.includes('lg:hidden')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
