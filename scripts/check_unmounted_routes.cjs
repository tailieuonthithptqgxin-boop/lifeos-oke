const fs = require('fs');
const content = fs.readFileSync('src/backend/serverMain.ts', 'utf-8');

console.log('Does serverMain import storageAudit?:', content.includes('storageAudit'));
console.log('Does serverMain import widget.routes?:', content.includes('widget'));
