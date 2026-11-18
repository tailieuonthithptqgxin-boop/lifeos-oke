import fs from 'fs';

const filePath = 'src/backend/serverMain.ts';
let code = fs.readFileSync(filePath, 'utf-8');

const target = "script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;";
const replacement = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com;";

if (!code.includes(target)) {
  console.log('Target string not found in', filePath);
} else {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf-8');
  console.log('Successfully updated CSP in serverMain.ts');
}
