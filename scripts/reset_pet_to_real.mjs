import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting user_pets to real baseline (Level 1, 0 EXP, 0 food, 0 study minutes)...');
  
  // 1. Reset admin@lifeos.com specifically
  const admin = await prisma.user.findFirst({ where: { email: 'admin@lifeos.com' } });
  if (admin) {
    const res = await prisma.$executeRawUnsafe(`
      UPDATE "user_pets"
      SET "level" = 1,
          "exp" = 0,
          "food_count" = 0,
          "total_study_minutes" = 0,
          "hunger" = 85,
          "happiness" = 90,
          "mood" = 'HAPPY',
          "name" = 'Bé Capy',
          "type" = 'CAPYBARA',
          "equipped_skin" = 'default',
          "unlocked_skins" = '["default"]',
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "user_id" = $1
    `, admin.id);
    console.log(`Updated admin pet (${admin.id}): ${res} rows affected.`);
  }

  // 2. Also reset any other mock test pets that had default 5 foodCount without earning it
  await prisma.$executeRawUnsafe(`
    UPDATE "user_pets"
    SET "food_count" = 0
    WHERE "food_count" = 5 AND "total_study_minutes" = 0 AND "exp" = 0
  `);

  // Verify
  const allPets = await prisma.$queryRawUnsafe(`SELECT * FROM "user_pets"`);
  console.log('Current user_pets in DB after clean reset:', JSON.stringify(allPets, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
