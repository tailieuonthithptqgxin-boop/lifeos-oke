const fs = require('fs');
const path = require('path');

function walk(dir) {
  let list = [];
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(f)) list = list.concat(walk(p));
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      list.push(p);
    }
  });
  return list;
}

const files = walk('src');
console.log('Auditing files:', files.length);

let issues = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // 1. Look for hardcoded mock data indicators like "mock", "dummy", "fake", "sampleData"
  const mockMatches = content.match(/\b(mock[A-Z][a-zA-Z0-9]*|dummy[A-Z][a-zA-Z0-9]*|fake[A-Z][a-zA-Z0-9]*)\b/g);
  if (mockMatches && !file.includes('test') && !file.includes('data-') && !file.includes('dictionary')) {
    issues.push({ file, type: 'MOCK_DATA', names: [...new Set(mockMatches)] });
  }

  // 2. Look for buttons that have no onClick and no type="submit"
  const buttonRegex = /<button\b([^>]*?)>/g;
  let btnMatch;
  let countNoAction = 0;
  while ((btnMatch = buttonRegex.exec(content)) !== null) {
    const attrs = btnMatch[1];
    if (!attrs.includes('onClick') && !attrs.includes('type="submit"') && !attrs.includes("type='submit'") && !attrs.includes('disabled') && !attrs.includes('form=')) {
      countNoAction++;
    }
  }
  if (countNoAction > 0 && !file.includes('test')) {
    issues.push({ file, type: 'BUTTON_NO_ACTION', count: countNoAction });
  }
});

console.log('Issues found:', JSON.stringify(issues, null, 2));
