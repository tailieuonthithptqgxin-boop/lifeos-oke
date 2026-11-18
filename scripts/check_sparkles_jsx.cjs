const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('<Sparkles') || content.includes('icon: Sparkles') || content.includes('icon={Sparkles}')) {
    // Check Lucide import
    const lucideImport = content.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/);
    if (!lucideImport) {
      console.log('NO LUCIDE IMPORT AT ALL:', file);
    } else {
      const importedNames = lucideImport[1].split(',').map(s => s.trim().replace(/^type\s+/, ''));
      if (!importedNames.includes('Sparkles')) {
        console.log('SPARKLES NOT IN LUCIDE IMPORT:', file);
      }
    }
  }
}
console.log('Done scanning for <Sparkles');
