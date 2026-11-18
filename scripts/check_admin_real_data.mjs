import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const adminId = '6e45291f-b9a3-4811-8528-1e7e755a463a';
  const focusSessions = await prisma.focusSession.findMany({ where: { userId: adminId } });
  const studySessions = await prisma.studySession.findMany({ where: { userId: adminId } });
  const completedTasks = await prisma.task.count({ where: { userId: adminId, status: 'DONE' } });
  const user = await prisma.user.findUnique({ where: { id: adminId } });
  
  console.log('User:', { id: user?.id, email: user?.email, totalStudyMinutes: user?.totalStudyMinutes });
  console.log('Focus Sessions count:', focusSessions.length, focusSessions);
  console.log('Study Sessions count:', studySessions.length, studySessions);
  console.log('Completed Tasks:', completedTasks);

  const pet = await prisma.userPet.findFirst({ where: { userId: adminId } });
  console.log('Current Pet:', pet);

  await prisma.$disconnect();
}

main().catch(console.error);
