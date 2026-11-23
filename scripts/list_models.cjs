const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/stage0_extracted_inventory.json', 'utf8'));

console.log('Total models:', data.models.length);
console.log('Total enums:', data.enums.length);

const grouped = {};
data.models.forEach(m => {
  console.log(`- ${m.name} (${m.fieldCount} fields, ${m.relations.length} relations)`);
});
