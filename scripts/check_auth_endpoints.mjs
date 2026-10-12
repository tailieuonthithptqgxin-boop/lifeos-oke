import fs from 'fs';

const apiContent = fs.readFileSync('src/backend/routes/api.ts', 'utf8');
const lines = apiContent.split('\n');

const endpointsWithoutAuth = [];

lines.forEach((line, idx) => {
  const match = line.match(/apiRouter\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/i);
  if (match) {
    const method = match[1].toUpperCase();
    const endpoint = match[2];
    const lineNum = idx + 1;
    // Check if requireAuth or requireAdmin is on this line or next line
    const context = lines.slice(idx, idx + 4).join(' ');
    const hasAuth = context.includes('requireAuth') || context.includes('requireAdmin');
    if (!hasAuth) {
      endpointsWithoutAuth.push({ method, endpoint, lineNum });
    }
  }
});

console.log(`Found ${endpointsWithoutAuth.length} endpoints without explicit requireAuth in signature:`);
endpointsWithoutAuth.forEach(e => console.log(`  [${e.method}] ${e.endpoint} (line ${e.lineNum})`));
