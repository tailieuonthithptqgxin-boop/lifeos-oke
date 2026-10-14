import fs from 'fs';
import path from 'path';

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (!full.includes('node_modules') && !full.includes('.git') && !full.includes('dist')) {
        walk(full, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(full);
    }
  }
  return fileList;
}

const files = walk('src');
console.log('Total UI files scanned:', files.length);

const emptyHandlers = [];
const dummyAlerts = [];
const consoleLogs = [];
const buttonsWithoutAction = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // 1. Empty handlers
    if (/onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/.test(line) && !line.includes('//')) {
      emptyHandlers.push({ file: f, line: idx + 1, code: line.trim() });
    }
    // 2. Dummy alerts
    if (/alert\(.*(coming soon|chưa hỗ trợ|phát triển|soon|tính năng).*?\)/i.test(line)) {
      dummyAlerts.push({ file: f, line: idx + 1, code: line.trim() });
    }
    // 3. Console.log handlers
    if (/onClick\s*=\s*\{\s*(\(\)\s*=>\s*)?console\.log/i.test(line)) {
      consoleLogs.push({ file: f, line: idx + 1, code: line.trim() });
    }
  });

  // Regex to match buttons without onClick or type="submit"
  const buttonRegex = /<button\b([^>]*?)>/gs;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const attrs = match[1];
    // Ignore buttons inside comments or disabled with explicit explanation
    const hasOnClick = /onClick\s*=/.test(attrs);
    const isSubmit = /type\s*=\s*["']submit["']/.test(attrs);
    const hasForm = /form\s*=/.test(attrs);
    if (!hasOnClick && !isSubmit && !hasForm) {
      // Find line number
      const lineNo = content.substring(0, match.index).split('\n').length;
      buttonsWithoutAction.push({ file: f, line: lineNo, snippet: match[0].replace(/\s+/g, ' ').substring(0, 100) });
    }
  }
});

console.log('--- 1. EMPTY HANDLERS () => {} --- Count:', emptyHandlers.length);
emptyHandlers.forEach(e => console.log(e.file + ':' + e.line + ' -> ' + e.code));

console.log('\n--- 2. DUMMY ALERTS (Coming soon) --- Count:', dummyAlerts.length);
dummyAlerts.forEach(e => console.log(e.file + ':' + e.line + ' -> ' + e.code));

console.log('\n--- 3. CONSOLE.LOG HANDLERS --- Count:', consoleLogs.length);
consoleLogs.forEach(e => console.log(e.file + ':' + e.line + ' -> ' + e.code));

console.log('\n--- 4. BUTTONS WITHOUT ONCLICK OR SUBMIT --- Count:', buttonsWithoutAction.length);
buttonsWithoutAction.slice(0, 30).forEach(e => console.log(e.file + ':' + e.line + ' -> ' + e.snippet));
if (buttonsWithoutAction.length > 30) {
  console.log('... and ' + (buttonsWithoutAction.length - 30) + ' more buttons.');
}
