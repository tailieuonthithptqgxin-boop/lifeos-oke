const fs = require('fs');

const findings = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') && !trimmed.includes('TODO') && !trimmed.includes('mock') && !trimmed.includes('fake')) return;

    // Check empty onClick
    if (/onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/.test(line)) {
      findings.push({ file: filePath, line: idx + 1, type: '🔴 DEAD_BUTTON_EMPTY_ONCLICK', code: trimmed });
    }
    // Check alert onClick
    if (/onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*alert\s*\(/.test(line)) {
      findings.push({ file: filePath, line: idx + 1, type: '🔴 DEAD_BUTTON_ALERT_ONCLICK', code: trimmed });
    }
    // Check console.log onClick
    if (/onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*console\.log\s*\(/.test(line)) {
      findings.push({ file: filePath, line: idx + 1, type: '🟡 CONSOLE_LOG_ONCLICK', code: trimmed });
    }
    // Check const MOCK_ or const DEMO_ or const SAMPLE_
    if (/(?:const|let|var)\s+(?:MOCK_|DEMO_|FAKE_|SAMPLE_|mock[A-Z]|sample[A-Z]|dummy[A-Z])/.test(line)) {
      findings.push({ file: filePath, line: idx + 1, type: '🔴 MOCK_DATA_DECLARATION', code: trimmed });
    }
    // Check fake loading timeout
    if (/setTimeout\s*\([^,]+,\s*(?:1000|2000|1500|3000)\s*\)/.test(line) && (content.includes('setIsLoading') || content.includes('setLoading'))) {
      if (line.includes('setLoading') || line.includes('setIsLoading')) {
        findings.push({ file: filePath, line: idx + 1, type: '🔴 FAKE_LOADING_TIMEOUT', code: trimmed });
      }
    }
  });
}

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = dir + '/' + item.name;
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'dist' && item.name !== 'build') {
      walk(full);
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      checkFile(full);
    }
  }
}

walk('src');

console.log('Total specific forensic findings:', findings.length);
findings.forEach(f => {
  console.log(`[${f.type}] ${f.file}:${f.line} -> ${f.code.slice(0, 120)}`);
});

fs.writeFileSync('scripts/forensic_dead_buttons_and_mocks.json', JSON.stringify(findings, null, 2));
