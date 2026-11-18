const fs = require('fs');
const files = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js'));
for (const f of files) {
  const c = fs.readFileSync('dist/assets/' + f, 'utf8');
  if (c.includes('Sparkles')) {
    console.log('File has Sparkles:', f);
  }
}
