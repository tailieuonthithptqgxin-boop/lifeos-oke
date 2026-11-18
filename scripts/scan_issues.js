const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk('./src');

// 1. Check for unhandled setTimeouts / setIntervals without cleanup in useEffect
const timerIssues = [];
// 2. Check for addEventListener without removeEventListener in useEffect
const listenerIssues = [];
// 3. Check for infinite re-render suspects (e.g. setState in useEffect without proper deps or object literal in deps)
const infiniteRenderSuspects = [];
// 4. Check for async functions without try/catch or missing finally with setLoading(false)
const asyncIssues = [];
// 5. Check for buttons without type attribute
const buttonsWithoutType = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  // Check buttons
  const btnMatches = content.match(/<button\b(?![^>]*\btype=)[^>]*>/g);
  if (btnMatches) {
    buttonsWithoutType.push({ file, count: btnMatches.length });
  }

  // Check dead hash links
  const hashMatches = content.match(/<a\b[^>]*href=["']#["'][^>]*>/g);
  if (hashMatches) {
    console.log('Dead hash links in:', file, hashMatches.length);
  }

  // Check setInterval without clearInterval
  if (content.includes('setInterval') && !content.includes('clearInterval')) {
    timerIssues.push({ file, type: 'setInterval missing clearInterval' });
  }

  // Check addEventListener without removeEventListener
  if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
    listenerIssues.push({ file, type: 'addEventListener missing removeEventListener' });
  }

  // Check setLoading(true) without finally
  if (content.includes('setLoading(true)') && !content.includes('finally')) {
    asyncIssues.push({ file, issue: 'setLoading(true) without finally block' });
  }
}

console.log('=== BUTTONS WITHOUT TYPE ===');
console.log('Total files:', buttonsWithoutType.length, 'Total buttons:', buttonsWithoutType.reduce((s, b) => s + b.count, 0));
console.log(buttonsWithoutType.slice(0, 15));

console.log('=== TIMER ISSUES ===');
console.log(timerIssues);

console.log('=== LISTENER ISSUES ===');
console.log(listenerIssues);

console.log('=== ASYNC LOADING ISSUES ===');
console.log(asyncIssues);
