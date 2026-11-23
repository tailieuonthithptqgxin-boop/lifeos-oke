const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/stage0_extracted_inventory.json', 'utf8'));

console.log('--- ALL 69 MODALS ---');
data.allModals.forEach((m, idx) => {
  console.log(`${idx + 1}. [${m.name}] (${m.path})`);
});
