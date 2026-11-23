const fs = require('fs');
const path = require('path');

// 1. Audit all 16 backend route files for:
// - requireAuth / requireAdmin coverage
// - IDOR vulnerabilities (using params.id without checking userId or ownership)
// - Try-catch blocks and error handling
// - Mock / placeholder responses
const routeFiles = fs.readdirSync('src/backend/routes').filter(f => f.endsWith('.ts'));

const routeAudits = [];

for (const file of routeFiles) {
  const filePath = path.join('src/backend/routes', file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let routerAuthLevel = null;
  if (content.includes('router.use(requireAuth)') || content.includes('authRouter.use(requireAuth)')) {
    routerAuthLevel = 'requireAuth';
  }

  lines.forEach((line, idx) => {
    const l = line.trim();
    const routeMatch = l.match(/(?:router|authRouter|studySpaceRouter|classroomRouter|petRouter|connectRouter|analyticsRouter|notificationRouter|cronRouter|r2Router|customModulesRouter|vocabRouter|aiRouter|testLabRouter)\.(get|post|put|delete|patch|all)\(\s*['"`]([^'"`]+)['"`](.*)/i);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();
      const subPath = routeMatch[2];
      const rest = routeMatch[3];

      let auth = routerAuthLevel || 'Public';
      if (rest.includes('requireAdmin') || rest.includes('adminRoleMiddleware')) {
        auth = 'requireAdmin';
      } else if (rest.includes('requireAuth')) {
        auth = 'requireAuth';
      }

      // Check if handler block has try-catch
      let hasTryCatch = false;
      const handlerLines = lines.slice(idx, idx + 40).join('\n');
      if (handlerLines.includes('try {') && handlerLines.includes('catch')) {
        hasTryCatch = true;
      }

      // Check for potential IDOR: uses req.params.id in prisma query without checking req.userId
      let idorRisk = false;
      if (subPath.includes(':id') && !auth.includes('requireAdmin')) {
        // if it does prisma.something.delete({ where: { id } }) without userId
        if (handlerLines.includes('where: { id }') && !handlerLines.includes('userId')) {
          idorRisk = true;
        }
      }

      routeAudits.push({
        file,
        line: idx + 1,
        method,
        subPath,
        auth,
        hasTryCatch,
        idorRisk
      });
    }
  });
}

console.log(`Audited ${routeAudits.length} routes across ${routeFiles.length} files.`);
const idorIssues = routeAudits.filter(r => r.idorRisk);
console.log(`Routes with potential IDOR risks: ${idorIssues.length}`);
idorIssues.forEach(r => console.log(`- [IDOR Risk] ${r.file}:${r.line} -> ${r.method} ${r.subPath}`));

fs.writeFileSync('scripts/route_audit_results.json', JSON.stringify({
  totalRoutes: routeAudits.length,
  idorCount: idorIssues.length,
  idorIssues,
  routes: routeAudits
}, null, 2));
