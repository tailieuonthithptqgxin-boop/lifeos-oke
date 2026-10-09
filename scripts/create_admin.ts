import 'dotenv/config';
import { PrismaClient, Role, Plan, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

function prompt(query: string, hideText: boolean = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.log('====================================================');
  console.log('   LifeOS Production Admin Bootstrap Utility        ');
  console.log('====================================================');

  const argEmail = process.env.ADMIN_EMAIL || process.argv[2];
  const argPassword = process.env.ADMIN_PASSWORD || process.argv[3];
  const argName = process.env.ADMIN_NAME || process.argv[4] || 'System Administrator';

  const email = argEmail || await prompt('Nhập Email quản trị viên (Admin Email): ');
  if (!email || !email.includes('@')) {
    console.error('❌ Email không hợp lệ.');
    process.exit(1);
  }

  const password = argPassword || await prompt('Nhập Mật khẩu quản trị viên (min 10 ký tự, gồm số & chữ): ');
  if (!password || password.length < 10) {
    console.error('❌ Mật khẩu phải có tối thiểu 10 ký tự để đảm bảo an ninh sản xuất.');
    process.exit(1);
  }

  const name = argName || 'LifeOS SuperAdmin';

  console.log(`\n⏳ Đang khởi tạo tài khoản quản trị cho: ${email}...`);

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: Role.SUPERADMIN,
        plan: Plan.TEAM,
        status: UserStatus.ACTIVE,
        passwordHash,
        name,
      },
    });
    console.log(`✅ [THÀNH CÔNG] Đã nâng cấp và cập nhật mật khẩu cho SuperAdmin: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        username: email.split('@')[0],
        passwordHash,
        role: Role.SUPERADMIN,
        plan: Plan.TEAM,
        status: UserStatus.ACTIVE,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff`,
        onboardingCompleted: true,
      },
    });
    console.log(`✅ [THÀNH CÔNG] Đã tạo mới tài khoản SuperAdmin: ${email}`);
  }

  console.log('🔒 Ghi chú: Mật khẩu đã được mã hóa Bcrypt an toàn (12 rounds) và không được lưu nhật ký (no log).');
  console.log('====================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khởi tạo SuperAdmin:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
