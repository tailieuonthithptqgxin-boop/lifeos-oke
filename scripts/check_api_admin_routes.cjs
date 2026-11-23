const fs = require('fs');
const content = fs.readFileSync('src/backend/routes/api.ts', 'utf-8');
const lines = content.split('\n');

const adminRoutes = [];
lines.forEach((l, i) => {
  if (l.includes("'/admin") || l.includes('"/admin')) {
    adminRoutes.push({ line: i + 1, code: l.trim() });
  }
});

console.log('Total /admin routes in api.ts:', adminRoutes.length);
adminRoutes.forEach(r => console.log(`L${r.line}: ${r.code}`));
