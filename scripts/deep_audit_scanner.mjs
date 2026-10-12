import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.mjs']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        results = results.concat(getAllFiles(filePath, exts));
      }
    } else {
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = getAllFiles(SRC_DIR);

const auditReport = {
  scannedFiles: files.length,
  mathRandom: [],
  commission30: [],
  mockOccurrences: [],
  apiRoutes: []
};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Math.random
    if (line.includes('Math.random(')) {
      auditReport.mathRandom.push({
        file: f.replace(/\\/g, '/'),
        line: idx + 1,
        content: line.trim()
      });
    }

    // 30% commission
    if (line.match(/\b30%\b|\b0\.30?\b/i) && (line.toLowerCase().includes('commission') || line.toLowerCase().includes('referral') || line.toLowerCase().includes('hoahong') || line.toLowerCase().includes('hoa hồng'))) {
      auditReport.commission30.push({
        file: f.replace(/\\/g, '/'),
        line: idx + 1,
        content: line.trim()
      });
    }

    // mock keywords
    const lower = line.toLowerCase();
    if (['mockdata', 'fakedata', 'demodata', 'sampledata', 'dummydata'].some(kw => lower.includes(kw))) {
      auditReport.mockOccurrences.push({
        file: f.replace(/\\/g, '/'),
        line: idx + 1,
        content: line.trim()
      });
    }

    // API route
    const match = line.match(/(router|app)\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/i);
    if (match) {
      auditReport.apiRoutes.push({
        file: f.replace(/\\/g, '/'),
        method: match[2].toUpperCase(),
        endpoint: match[3],
        line: idx + 1
      });
    }
  });
});

fs.writeFileSync('./scripts/audit_scan_results.json', JSON.stringify(auditReport, null, 2), 'utf8');
console.log(`Scan finished. Math.random: ${auditReport.mathRandom.length}, Commission 30%: ${auditReport.commission30.length}, Mock/Fake: ${auditReport.mockOccurrences.length}, API Endpoints: ${auditReport.apiRoutes.length}`);
