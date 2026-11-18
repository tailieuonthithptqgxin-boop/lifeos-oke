import fs from 'fs';
import path from 'path';

function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(item.name)) walk(full);
    } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('Sparkles')) {
          // only if it mentions admin or is in admin folder or AdminView
          if (full.toLowerCase().includes('admin')) {
            console.log(`${full}:${idx + 1} -> ${line.trim()}`);
          }
        }
      });
    }
  }
}

walk('src');
