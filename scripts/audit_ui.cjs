const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') files = files.concat(walk(full));
    } else if (f.endsWith('.tsx') || f.endsWith('.jsx')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('./src');
const buttonRegex = /<button\b([^>]*)>/gs;

let count = 0;
let deadButtons = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    count++;
    const attrs = match[1];
    const isSubmit = /type\s*=\s*["']submit["']/.test(attrs);
    const hasOnClick = /onClick\s*=/.test(attrs);
    if (!hasOnClick && !isSubmit) {
      const linesBefore = content.substring(0, match.index).split('\n').length;
      // Get button content up to closing </button>
      const closeIndex = content.indexOf('</button>', match.index);
      const buttonBody = closeIndex > -1 ? content.substring(match.index, closeIndex + 9) : match[0];
      deadButtons.push({
        file,
        line: linesBefore,
        tag: match[0].slice(0, 120).replace(/\s+/g, ' '),
        body: buttonBody.slice(0, 150).replace(/\s+/g, ' ')
      });
    }
  }
}

console.log('Total buttons found:', count);
console.log('Buttons without onClick and without type="submit":', deadButtons.length);
console.log('\n--- Full List of potentially dead buttons ---');
deadButtons.forEach((b, i) => {
  console.log(`[${i + 1}] ${b.file}:${b.line}`);
  console.log(`    Tag: ${b.tag}`);
  console.log(`    Body: ${b.body}\n`);
});
