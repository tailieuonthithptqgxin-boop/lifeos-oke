const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      progression: true,
      referralProfile: true
    }
  });

  console.log(`Total users in SQLite: ${users.length}`);
  users.forEach(u => {
    console.log(`- User [${u.id}] ${u.email} (${u.name}, role: ${u.role}, plan: ${u.plan})`);
    console.log(`  totalStudyMinutes: ${u.totalStudyMinutes}, weeklyStudyMinutes: ${u.weeklyStudyMinutes}, championCount: ${u.championCount}`);
    if (u.progression) {
      console.log(`  Progression: Level: ${u.progression.level}, XP: ${u.progression.totalXp}, currentStreak: ${u.progression.currentStreak}, longestStreak: ${u.progression.longestStreak}`);
    } else {
      console.log('  Progression: None');
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
