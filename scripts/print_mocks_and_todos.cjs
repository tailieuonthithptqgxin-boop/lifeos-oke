const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/forensic_raw_findings.json', 'utf8'));

console.log('=== MOCK KEYWORDS (24) ===');
data.findings.filter(f => f.type === 'MOCK_KEYWORD').forEach(f => {
  console.log(`${f.file}:${f.line} -> ${f.code}`);
});

console.log('\n=== TODO OR COMING SOON (17) ===');
data.findings.filter(f => f.type === 'TODO_OR_COMING_SOON').forEach(f => {
  console.log(`${f.file}:${f.line} -> ${f.code}`);
});
