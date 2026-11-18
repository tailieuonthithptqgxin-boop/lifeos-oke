import { getPrisma } from '../src/backend/db.js';

async function checkColumns() {
  const prisma = getPrisma();
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'posts';
  `;
  console.log('Posts table columns:', cols.map(c => c.column_name));
  process.exit(0);
}

checkColumns().catch(e => {
  console.error(e);
  process.exit(1);
});
