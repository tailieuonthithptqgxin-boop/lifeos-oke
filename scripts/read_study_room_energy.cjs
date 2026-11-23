const fs = require('fs');
const content = fs.readFileSync('src/components/study-space/StudyRoomView.tsx', 'utf-8');
const lines = content.split('\n');

console.log('=== Lines 500-550 of StudyRoomView.tsx ===');
console.log(lines.slice(500, 560).join('\n'));
