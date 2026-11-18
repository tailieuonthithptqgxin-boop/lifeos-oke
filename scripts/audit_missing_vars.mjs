import fs from 'fs';
import path from 'path';

function scanDir(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== 'dist' && item.name !== '.git') {
        scanDir(full, files);
      }
    } else if (item.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = scanDir('src');
console.log(`Auditing Lucide icon imports across ${allFiles.length} TSX files...`);

// Common lucide icons used in the app
const LUCIDE_ICONS = [
  'Sparkles', 'Shield', 'ShieldCheck', 'Award', 'Trophy', 'Flame', 'Check',
  'CheckCircle2', 'AlertCircle', 'AlertTriangle', 'Clock', 'Calendar', 'DollarSign',
  'Users', 'User', 'UserPlus', 'UserCheck', 'Settings', 'Settings2', 'Search', 'Filter',
  'Plus', 'Minus', 'Trash2', 'Edit', 'Edit2', 'Edit3', 'X', 'XCircle', 'ExternalLink',
  'Copy', 'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight', 'ArrowRight',
  'ArrowLeft', 'ArrowUpRight', 'ArrowDownRight', 'RotateCcw', 'Zap', 'Volume2',
  'VolumeX', 'Volume1', 'Moon', 'Sun', 'BookOpen', 'GraduationCap', 'Star', 'Heart',
  'Eye', 'EyeOff', 'Play', 'Pause', 'Lock', 'Unlock', 'Folder', 'FileText'
];

const issues = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');

  for (const icon of LUCIDE_ICONS) {
    // Matches JSX usage: <IconName ... or <IconName> or <IconName/
    const jsxRegex = new RegExp(`<${icon}[\\s/>]`);
    if (jsxRegex.test(content)) {
      // Check if imported from lucide-react or declared
      const importRegex = new RegExp(`import\\s+[^;]*\\b${icon}\\b[^;]*from\\s+['"]lucide-react['"]`);
      const anyImportRegex = new RegExp(`import\\s+[^;]*\\b${icon}\\b[^;]*from`);
      const defRegex = new RegExp(`(?:const|function|class|let|var)\\s+${icon}\\b`);
      
      if (!importRegex.test(content) && !anyImportRegex.test(content) && !defRegex.test(content)) {
        issues.push({ file, icon });
      }
    }
  }
}

console.log(`Scan completed. Found ${issues.length} potential missing icon imports:`);
for (const iss of issues) {
  console.log(`  File: ${iss.file} -> Missing: <${iss.icon} />`);
}
