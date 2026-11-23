const fs = require('fs');
const authContent = fs.readFileSync('src/backend/routes/auth.ts', 'utf-8');
const lines = authContent.split('\n');

lines.forEach((l, i) => {
  if (l.includes('register') || l.includes('createUser') || l.includes('signup')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
