const fs = require('fs');

const authContent = fs.readFileSync('src/backend/routes/auth.ts', 'utf-8');
const lines = authContent.split('\n');

console.log('=== User Registration Defaults in auth.ts ===');
let inRegister = false;
lines.forEach((l, i) => {
  if (l.includes('router.post(\'/register\'') || l.includes('router.post("/register"')) {
    inRegister = true;
  }
  if (inRegister) {
    if (l.includes('prisma.user.create')) {
      console.log(lines.slice(i, i + 35).join('\n'));
      inRegister = false;
    }
  }
});
