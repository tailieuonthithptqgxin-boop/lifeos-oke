import { getPrisma } from '../src/backend/db.ts';
import { Prisma } from '@prisma/client';

async function main() {
  const prisma = getPrisma();
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'focus_sessions' 
    ORDER BY ordinal_position
  `;
  console.log('PostgreSQL focus_sessions columns:');
  console.table(cols);

  const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'FocusSession');
  console.log('Generated Prisma Client FocusSession scalar fields:');
  console.log(model?.fields.filter(f => !f.relationName).map(f => f.name + ' (' + f.type + ')'));
}

main().catch(console.error);
