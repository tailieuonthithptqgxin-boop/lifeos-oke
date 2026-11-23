const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');
const lines = schema.split('\n');

let inModel = false;
let modelName = '';
lines.forEach((l, i) => {
  if (l.startsWith('model User ') || l.startsWith('model UserProgression ')) {
    inModel = true;
    modelName = l.trim();
    console.log(`\n=== ${modelName} ===`);
  }
  if (inModel) {
    if (l.includes('@default') || l.includes('Int') || l.includes('streak') || l.includes('level') || l.includes('xp') || l.includes('coins')) {
      console.log(`${l.trim()}`);
    }
    if (l.startsWith('}')) {
      inModel = false;
    }
  }
});
