const fs = require('fs');
const path = require('path');

const dir = path.join('src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const issues = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check href="#"
    if (line.includes('href="#"') || line.includes("href='#'") || line.includes('href=""')) {
      issues.push({ type: 'DUMMY_HREF', file, line: i + 1, snippet: line.trim() });
    }
    
    // Check alert() in onClick
    if (line.includes('alert(') && line.includes('onClick')) {
      issues.push({ type: 'ALERT_IN_ONCLICK', file, line: i + 1, snippet: line.trim() });
    }
    
    // Check console.log only in onClick
    if (line.includes('console.log(') && line.includes('onClick') && !line.includes('apiCall')) {
      issues.push({ type: 'CONSOLE_IN_ONCLICK', file, line: i + 1, snippet: line.trim() });
    }

    // Check placeholder actions or dummy comments
    if (line.includes('// TODO') || line.includes('// FIXME') || line.includes('Tính năng đang phát triển')) {
      issues.push({ type: 'TODO_OR_PLACEHOLDER', file, line: i + 1, snippet: line.trim() });
    }
  }
}

console.log('Total issues found:', issues.length);
console.log(JSON.stringify(issues, null, 2));
