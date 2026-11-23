const fs = require('fs');
console.log('=== server.ts ===');
console.log(fs.readFileSync('server.ts', 'utf-8').slice(0, 1500));
