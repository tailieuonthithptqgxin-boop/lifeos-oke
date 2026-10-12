import fs from 'fs';

const apiContent = fs.readFileSync('src/backend/routes/api.ts', 'utf8');
const lines = apiContent.split('\n');

const adminEndpoints = [];

lines.forEach((line, idx) => {
  const match = line.match(/apiRouter\.(get|post|put|delete|patch)\(\s*['"`](\/admin[^'"`]*)['"`]/i);
  if (match) {
    const method = match[1].toUpperCase();
    const endpoint = match[2];
    const context = lines.slice(idx, idx + 4).join(' ');
    const hasAdmin = context.includes('requireAdmin');
    adminEndpoints.push({ method, endpoint, hasAdmin, line: idx + 1 });
  }
});

console.log(`Found ${adminEndpoints.length} admin endpoints:`);
adminEndpoints.forEach(a => {
  console.log(`  [${a.method}] ${a.endpoint} -> ${a.hasAdmin ? '✅ requireAdmin' : '❌ NO requireAdmin!'} (line ${a.line})`);
});
