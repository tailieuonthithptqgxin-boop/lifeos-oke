const fs = require('fs');
const content = fs.readFileSync('src/backend/realtime/RoomManager.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== RoomManager.ts lines 110-150 ===');
console.log(lines.slice(105, 145).join('\n'));
