const fs = require('fs');

console.log('=== .env ===');
if (fs.existsSync('.env')) {
  console.log(fs.readFileSync('.env', 'utf-8'));
} else {
  console.log('No .env file found');
}

console.log('=== prisma/schema.prisma datasource ===');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');
console.log(schema.slice(0, 300));
