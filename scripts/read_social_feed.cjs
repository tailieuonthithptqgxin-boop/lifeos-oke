const fs = require('fs');
const content = fs.readFileSync('src/components/connect/SocialFeedView.tsx', 'utf-8');
const lines = content.split('\n');

console.log('=== SocialFeedView.tsx lines 1-100 ===');
console.log(lines.slice(0, 100).join('\n'));
