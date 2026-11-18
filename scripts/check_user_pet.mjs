import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const pets = await prisma.userPet.findMany();
  console.log(JSON.stringify(pets, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
