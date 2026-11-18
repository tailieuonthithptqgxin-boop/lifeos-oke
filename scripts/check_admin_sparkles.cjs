const fs = require('fs');
const path = require('path');

const adminDir = path.resolve('src/components/admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.tsx'));
files.push('../AdminView.tsx', '../AdminStorageAuditTab.tsx', '../AdminCustomModulesTab.tsx');

for (const rel of files) {
  const file = path.resolve(adminDir, rel);
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  
  // Check if Sparkles is in content
  if (content.includes('Sparkles')) {
    console.log('File:', rel);
    // Find lines
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('Sparkles')) {
        console.log(`  L${idx + 1}: ${line.trim()}`);
      }
    });
  }
}
