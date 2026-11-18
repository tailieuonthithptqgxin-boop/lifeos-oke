import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123456', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lifeos.com' },
    update: {
      passwordHash,
      role: 'SUPERADMIN',
      plan: 'TEAM',
      status: 'ACTIVE'
    },
    create: {
      email: 'admin@lifeos.com',
      name: 'LifeOS SuperAdmin',
      username: 'admin',
      passwordHash,
      role: 'SUPERADMIN',
      plan: 'TEAM',
      status: 'ACTIVE'
    }
  });

  console.log('✅ Admin user ready:', admin.email, admin.role, admin.id);
  await prisma.$disconnect();
}

main().catch(console.error);
