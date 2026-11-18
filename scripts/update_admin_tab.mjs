import fs from 'fs';
let content = fs.readFileSync('src/components/admin/types.ts', 'utf8');
content = content.replace("| 'announcements'", "| 'announcements'\n  | 'communities'");
fs.writeFileSync('src/components/admin/types.ts', content, 'utf8');
console.log('Successfully updated AdminTab type');
