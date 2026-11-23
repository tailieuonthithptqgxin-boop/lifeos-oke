const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
console.log('Scripts in package.json:');
console.log(pkg.scripts);
