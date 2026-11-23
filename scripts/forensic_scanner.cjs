const fs = require('fs');
const path = require('path');

const results = [];

function scanDir(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'dist' && item.name !== 'build') {
        scanDir(fullPath);
      }
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.js') || item.name.endsWith('.jsx'))) {
      scanFile(fullPath);
    }
  }
}

const SUSPICIOUS_PATTERNS = [
  { pattern: /\b(mock|dummy|fake|sampleData|testData|hardcoded)\b/i, label: 'MOCK_KEYWORD' },
  { pattern: /\b(TODO|FIXME|Coming soon|Tính năng đang phát triển)\b/i, label: 'TODO_OR_COMING_SOON' },
  { pattern: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/, label: 'EMPTY_ONCLICK' },
  { pattern: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*alert\s*\(/, label: 'ALERT_ONCLICK' },
  { pattern: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*console\.log\s*\(/, label: 'CONSOLE_LOG_ONCLICK' },
  { pattern: /setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*(?:setIsLoading|setLoading)\(false\)/, label: 'FAKE_LOADING_TIMEOUT' },
  { pattern: /Math\.random\(\)/, label: 'MATH_RANDOM_USAGE' },
  { pattern: /localStorage\.(getItem|setItem)/, label: 'LOCAL_STORAGE_USAGE' }
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // skip comments if they are just doc comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') && !trimmed.includes('TODO') && !trimmed.includes('FIXME')) return;

    for (const p of SUSPICIOUS_PATTERNS) {
      if (p.pattern.test(line)) {
        // filter out legitimate cases if any, but record for audit
        results.push({
          file: filePath.replace(/\\/g, '/'),
          line: idx + 1,
          type: p.label,
          code: trimmed.slice(0, 160)
        });
      }
    }
  });
}

console.log('Starting forensic scan of src/ ...');
scanDir('src');
console.log(`Scan finished. Found ${results.length} suspicious findings.`);

// Group findings by file and type
const summaryByFile = {};
const summaryByType = {};

results.forEach(r => {
  summaryByFile[r.file] = (summaryByFile[r.file] || 0) + 1;
  summaryByType[r.type] = (summaryByType[r.type] || 0) + 1;
});

console.log('Summary by Type:', summaryByType);

fs.writeFileSync('scripts/forensic_raw_findings.json', JSON.stringify({
  total: results.length,
  byType: summaryByType,
  byFile: summaryByFile,
  findings: results
}, null, 2));

console.log('Saved raw findings to scripts/forensic_raw_findings.json');
