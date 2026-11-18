import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://127.0.0.1:3000';
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('🧪 LIFEOS COMPREHENSIVE AUTHENTICATION TEST SUITE');
  console.log('======================================================\n');

  // Ensure Admin user exists with known credentials
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123456', salt);
  await prisma.user.upsert({
    where: { email: 'admin@lifeos.com' },
    update: { passwordHash, role: 'SUPERADMIN', plan: 'TEAM', status: 'ACTIVE' },
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

  // --------------------------------------------------------------------------
  // TEST GROUP 1: EMAIL + PASSWORD LOGIN
  // --------------------------------------------------------------------------
  console.log('\n--- 1. EMAIL + PASSWORD LOGIN ---');

  // Test 1.1: Login with correct password
  const res1 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@lifeos.com', password: 'Admin@123456' })
  });
  const data1 = await res1.json();
  const setCookie1 = res1.headers.get('set-cookie');
  assert(res1.status === 200, `Login đúng mật khẩu trả về HTTP 200 (nhận ${res1.status})`);
  assert(data1.success === true, 'Response body có success === true');
  assert(Boolean(data1.token), 'Response body có chứa JWT token dự phòng cho client');
  assert(Boolean(setCookie1 && setCookie1.includes('token=')), 'Set-Cookie header được gửi về trình duyệt');
  assert(data1.user.email === 'admin@lifeos.com', 'Thông tin user khớp với tài khoản');
  assert(data1.user.role === 'SUPERADMIN', 'Role của Admin là SUPERADMIN');

  // Test 1.2: Login with wrong password
  const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@lifeos.com', password: 'WrongPassword123' })
  });
  const data2 = await res2.json();
  assert(res2.status === 401, `Login sai mật khẩu trả về HTTP 401 (nhận ${res2.status})`);
  assert(data2.error?.code === 'INVALID_CREDENTIALS', 'Error code là INVALID_CREDENTIALS');

  // Test 1.3: Login with non-existent email
  const res3 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'notfound_user_999@test.com', password: 'AnyPassword123!' })
  });
  const data3 = await res3.json();
  assert(res3.status === 401, `Email không tồn tại trả về HTTP 401 (nhận ${res3.status})`);
  assert(data3.error?.code === 'INVALID_CREDENTIALS', 'Email không tồn tại trả về generic INVALID_CREDENTIALS (không leak data)');

  // Test 1.4: Email có uppercase/lowercase
  const res4 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'ADMIN@LIFEOS.COM', password: 'Admin@123456' })
  });
  assert(res4.status === 200, `Email viết hoa ADMIN@LIFEOS.COM được normalize chính xác (HTTP ${res4.status})`);

  // Test 1.5: Register with special characters password & login
  const testEmail = `test_special_${Date.now()}@lifeos.com`;
  const specialPass = 'P@ssw0rd!#%^&*()_2026';
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nguyễn Văn Test', email: testEmail, password: specialPass })
  });
  const regData = await regRes.json();
  assert(regRes.status === 201, `Đăng ký mật khẩu có ký tự đặc biệt thành công (HTTP ${regRes.status})`);
  assert(Boolean(regData.token), 'Đăng ký trả về token trong body cho client');

  // Login with newly registered user
  const logNewRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testEmail, password: specialPass })
  });
  const logNewData = await logNewRes.json();
  assert(logNewRes.status === 200, `Đăng nhập tài khoản mới bằng mật khẩu đặc biệt thành công (HTTP ${logNewRes.status})`);

  // --------------------------------------------------------------------------
  // TEST GROUP 2: SESSION & /ME AUTHENTICATION
  // --------------------------------------------------------------------------
  console.log('\n--- 2. SESSION & /ME AUTHENTICATION ---');

  // Verify /api/auth/me with Bearer token
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${logNewData.token}` }
  });
  const meData = await meRes.json();
  assert(meRes.status === 200, `/api/auth/me trả về HTTP 200 với Bearer token (nhận ${meRes.status})`);
  assert(meData.user.email === testEmail, 'Email trong /me khớp với tài khoản');
  assert(meData.subscriptionStatus?.hasAccess === true, 'Tài khoản mới được hưởng 7 ngày dùng thử (hasAccess: true)');
  assert(meData.subscriptionStatus?.isTrial === true, 'Subscription status xác nhận isTrial === true');

  // Test Logout
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${logNewData.token}` }
  });
  assert(logoutRes.status === 200, `Đăng xuất thành công (HTTP ${logoutRes.status})`);

  // Verify /me fails after logout
  const meAfterLogout = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${logNewData.token}` }
  });
  assert(meAfterLogout.status === 401, `/api/auth/me bị từ chối sau khi đăng xuất (HTTP ${meAfterLogout.status})`);

  // --------------------------------------------------------------------------
  // TEST GROUP 3: FORGOT & RESET PASSWORD
  // --------------------------------------------------------------------------
  console.log('\n--- 3. PASSWORD RESET FLOW ---');

  // Create reset token directly for test user
  const resetTokenStr = 'test_reset_token_' + Date.now();
  await prisma.passwordResetToken.create({
    data: {
      userId: logNewData.user.id,
      token: resetTokenStr,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }
  });

  const newPass = 'BrandNewP@ssword2026!';
  const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetTokenStr, newPassword: newPass })
  });
  assert(resetRes.status === 200, `Đặt lại mật khẩu thành công (HTTP ${resetRes.status})`);

  // Old password should now fail
  const oldLogRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testEmail, password: specialPass })
  });
  assert(oldLogRes.status === 401, `Mật khẩu cũ không còn đăng nhập được (HTTP ${oldLogRes.status})`);

  // New password should succeed
  const newLogRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testEmail, password: newPass })
  });
  assert(newLogRes.status === 200, `Đăng nhập thành công bằng mật khẩu mới (HTTP ${newLogRes.status})`);

  // --------------------------------------------------------------------------
  // TEST GROUP 4: GOOGLE OAUTH FLOW & ACCOUNT LINKING
  // --------------------------------------------------------------------------
  console.log('\n--- 4. GOOGLE OAUTH FLOW & ACCOUNT LINKING ---');

  // Test 4.1: Initiate Google OAuth (check URL generation & signed state)
  const gInitRes = await fetch(`${BASE_URL}/api/auth/google`, { redirect: 'manual' });
  const location = gInitRes.headers.get('location');
  const gCookie = gInitRes.headers.get('set-cookie');
  assert(gInitRes.status === 302, `Initiate Google OAuth trả về redirect 302 (nhận ${gInitRes.status})`);
  assert(Boolean(location && location.includes('accounts.google.com')), 'Redirect URL trỏ chính xác đến accounts.google.com');
  assert(Boolean(location && location.includes('client_id=')), 'Redirect URL có client_id');
  assert(Boolean(location && location.includes('state=')), 'Redirect URL có signed state parameter');
  assert(Boolean(gCookie && gCookie.includes('google_oauth_state=')), 'Cookie google_oauth_state được thiết lập');

  // Test 4.2: Google Account Linking (User created with Google)
  const googleEmail = `google_user_${Date.now()}@gmail.com`;
  const mockGoogleId = 'gid_' + Date.now();
  const gUser = await prisma.user.create({
    data: {
      name: 'Google Test User',
      email: googleEmail,
      googleId: mockGoogleId,
      passwordHash: await bcrypt.hash('random_unusable_google_hash', 10),
      role: 'USER',
      plan: 'FREE',
      status: 'ACTIVE',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  // Attempting to login with password on Google-only account
  const gPwdAttempt = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: googleEmail, password: 'AnyPassword123!' })
  });
  const gPwdData = await gPwdAttempt.json();
  assert(gPwdAttempt.status === 401, `Đăng nhập mật khẩu vào tài khoản Google trả về 401 (nhận ${gPwdAttempt.status})`);
  assert(gPwdData.error?.code === 'OAUTH_ACCOUNT', 'Hệ thống nhận diện chính xác OAUTH_ACCOUNT và hướng dẫn dùng Google Sign-In');

  // Test 4.3: Issue session for Google user and verify entitlement preservation
  const jwtSecret = process.env.JWT_SECRET || 'dev_lifeos_secure_jwt_secret_key_2026';
  const gToken = jwt.sign({ userId: gUser.id, role: gUser.role, email: gUser.email }, jwtSecret, { expiresIn: '14d' });
  await prisma.session.create({
    data: {
      userId: gUser.id,
      token: gToken,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });

  const gMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${gToken}` }
  });
  const gMeData = await gMeRes.json();
  assert(gMeRes.status === 200, `Tài khoản Google gọi /me thành công (HTTP ${gMeRes.status})`);
  assert(gMeData.user.email === googleEmail, 'Email Google user khớp chính xác');
  assert(gMeData.subscriptionStatus?.hasAccess === true, 'Entitlement 7 ngày dùng thử của Google user được bảo tồn 100%');

  // Test 4.4: Cross-Auth (Linking Google ID to existing Email/Password user)
  await prisma.user.update({
    where: { id: logNewData.user.id },
    data: { googleId: 'linked_google_' + Date.now() }
  });
  const linkedLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: testEmail, password: newPass })
  });
  assert(linkedLogin.status === 200, `Tài khoản sau khi liên kết Google vẫn đăng nhập bình thường bằng mật khẩu (HTTP ${linkedLogin.status})`);

  console.log('\n======================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('======================================================\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  prisma.$disconnect();
  process.exit(1);
});
