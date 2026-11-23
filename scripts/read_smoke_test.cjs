const fs = require('fs');
console.log('=== tests/zero_regression_smoke.test.ts ===');
console.log(fs.readFileSync('tests/zero_regression_smoke.test.ts', 'utf-8').slice(0, 1500));
