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
const tagRegex = /<([a-zA-Z0-9]+)\b([^>]*)>/gs;

let deadElements = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const tagName = match[1];
    const attrs = match[2];
    if (tagName === 'button' || tagName === 'input' || tagName === 'label' || tagName === 'select' || tagName === 'textarea') {
      continue;
    }
    const hasCursorPointer = /cursor-pointer/.test(attrs);
    const hasOnClick = /onClick\s*=/.test(attrs);
    const hasHref = /href\s*=/.test(attrs);
    const isModalBackdrop = /fixed inset-0/.test(attrs);

    if (hasCursorPointer && !hasOnClick && !hasHref) {
      const linesBefore = content.substring(0, match.index).split('\n').length;
      deadElements.push({
        file,
        line: linesBefore,
        tag: `<${tagName} ${attrs.slice(0, 100).replace(/\s+/g, ' ')}>`
      });
    }
  }
}

console.log('Non-button elements with cursor-pointer but without onClick/href:', deadElements.length);
deadElements.forEach((el, i) => {
  console.log(`[${i + 1}] ${el.file}:${el.line}\n    ${el.tag}\n`);
});
