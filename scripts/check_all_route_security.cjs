const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('src/backend/routes').filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const content = fs.readFileSync(path.join('src/backend/routes', f), 'utf-8');
  const lines = content.split('\n');
  const publicRoutes = [];
  const protectedRoutes = [];
  const adminRoutes = [];

  let isRouterProtected = content.includes('router.use(requireAuth)') || content.includes('authRouter.use(requireAuth)');

  lines.forEach((l, i) => {
    const m = l.match(/\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`](.*)/);
    if (m) {
      const rest = m[3];
      const routeStr = `${m[1].toUpperCase()} ${m[2]}`;
      if (rest.includes('requireAdmin') || rest.includes('adminRoleMiddleware')) {
        adminRoutes.push(routeStr);
      } else if (rest.includes('requireAuth') || isRouterProtected) {
        protectedRoutes.push(routeStr);
      } else {
        publicRoutes.push(routeStr);
      }
    }
  });

  console.log(`\n=== File: ${f} ===`);
  console.log(`Protected: ${protectedRoutes.length}, Admin: ${adminRoutes.length}, Public: ${publicRoutes.length}`);
  if (publicRoutes.length > 0) {
    console.log('   Public routes:', publicRoutes.slice(0, 10));
    if (publicRoutes.length > 10) console.log(`   ...and ${publicRoutes.length - 10} more`);
  }
});
