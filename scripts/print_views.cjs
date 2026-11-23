const fs = require('fs');
const list = JSON.parse(fs.readFileSync('scripts/rendered_views_detail.json', 'utf8'));
list.forEach(item => {
  console.log(`${item.tab} -> ${item.jsx}`);
});
