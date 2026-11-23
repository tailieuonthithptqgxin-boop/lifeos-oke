const fs = require('fs');
console.log('--- TopBar.tsx ---');
console.log(fs.readFileSync('src/components/TopBar.tsx', 'utf-8').slice(0, 3000));
