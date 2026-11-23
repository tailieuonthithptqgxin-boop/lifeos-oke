const fs = require('fs');
const content = fs.readFileSync('src/components/dashboard/FocusEconomyShopModal.tsx', 'utf-8');
const lines = content.split('\n');

console.log('=== FocusEconomyShopModal.tsx lines 70-130 ===');
console.log(lines.slice(70, 130).join('\n'));
