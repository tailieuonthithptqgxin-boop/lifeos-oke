const fs = require('fs');
console.log('=== cron.routes.ts ===');
console.log(fs.readFileSync('src/backend/routes/cron.routes.ts', 'utf-8'));
