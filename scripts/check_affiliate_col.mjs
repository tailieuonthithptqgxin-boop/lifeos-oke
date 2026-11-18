import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_affiliate" BOOLEAN DEFAULT false;
  `);
  console.log('Successfully ensured is_affiliate column on users table!');
  const test = await prisma.$queryRawUnsafe(`SELECT id, email, is_affiliate FROM "users" LIMIT 3;`);
  console.log('Sample users with is_affiliate:', test);
}

run().catch(console.error).finally(() => prisma.$disconnect());
