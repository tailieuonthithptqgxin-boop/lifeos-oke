const fs = require('fs');
const content = fs.readFileSync('src/lib/scheduleReminderScheduler.ts', 'utf-8');
const lines = content.split('\n');

console.log('=== scheduleReminderScheduler.ts lines 240-270 ===');
console.log(lines.slice(240, 270).join('\n'));
