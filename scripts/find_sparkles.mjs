import fs from 'fs';
import path from 'path';

function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(item.name)) walk(full);
    } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('Sparkles')) {
        // Let's check imports
        const lucideMatches = [...content.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/gs)];
        let imported = false;
        for (const m of lucideMatches) {
          const names = m[1].split(',').map(s => s.trim());
          if (names.includes('Sparkles')) {
            imported = true;
            break;
          }
        }
        
        // Also check any other import
        const anyImport = [...content.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/gs)];
        for (const m of anyImport) {
          const names = m[1].split(',').map(s => s.trim());
          if (names.includes('Sparkles')) {
            imported = true;
            break;
          }
        }

        // Also check if defined as const/let/var/function/class
        const isDefined = /(?:const|let|var|function|class|type|interface)\s+Sparkles\b/.test(content);

        // Check if used in JSX or as value
        const usesJSX = /<Sparkles[\s/>]/.test(content);
        const usesVal = /:\s*Sparkles\b/.test(content) || /\bicon:\s*Sparkles\b/.test(content) || /\bSparkles\(/.test(content);

        if ((usesJSX || usesVal) && !imported && !isDefined) {
          console.log('CRITICAL: Sparkles is used but NOT imported/defined:', full);
        }
      }
    }
  }
}

walk('src');
console.log('Done scanning.');
