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
let found = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (/\bSparkles\b/.test(content)) {
    const imports = /import\s+[\s\S]*?\bSparkles\b[\s\S]*?from/.test(content);
    const declares = /(const|let|var|function|type|interface|class)\s+Sparkles\b/.test(content);
    if (!imports && !declares) {
      console.log('MISSING SPARKLES IMPORT IN:', file);
      found++;
    }
  }
}
console.log('Done scanning, missing found:', found);
