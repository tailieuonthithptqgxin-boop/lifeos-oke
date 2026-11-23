const fs = require('fs');
const content = fs.readFileSync('src/backend/routes/connect.routes.ts', 'utf-8');
const lines = content.split('\n');

lines.slice(0, 50).forEach((l, i) => {
  console.log(`${i+1}: ${l}`);
});
