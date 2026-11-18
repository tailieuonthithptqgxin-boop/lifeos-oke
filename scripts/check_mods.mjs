import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const mods = await prisma.customModule.findMany();
  console.log('CUSTOM_MODULES:', mods);
  await prisma.$disconnect();
}
run();
