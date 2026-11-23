const fs = require('fs');
const content = fs.readFileSync('src/backend/routes/auth.ts', 'utf-8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('router.get(\'/me\'') || l.includes('authRouter.get(\'/me\'') || l.includes('authRouter.get("/me"')) {
    console.log(lines.slice(i, i + 60).join('\n'));
  }
});
