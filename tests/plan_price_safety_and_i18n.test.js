import { describe, it, after } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

describe('Admin Service Plans Management, Price Safety & Languages Test Suite', () => {
  let userCookie = '';
  let adminCookie = '';
  let paymentReq1Id = '';
  let paymentReq2Id = '';

  const timestamp = Date.now();
  const userEmail = `user_pricesafety_${timestamp}@lifeos.test`;
  const adminEmail = `admin_pricesafety_${timestamp}@lifeos.test`;
  const password = 'SafetyPassword2026!';

  it('1. Register normal user and admin user', async () => {
    // Register standard user
    const regUser = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Standard User', email: userEmail, password })
    });
    assert.strictEqual(regUser.status, 201);
    userCookie = regUser.headers.get('set-cookie').split(';')[0];

    // Register admin user
    const regAdmin = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Admin User', email: adminEmail, password })
    });
    assert.strictEqual(regAdmin.status, 201);
    adminCookie = regAdmin.headers.get('set-cookie').split(';')[0];

    // Promote admin in DB
    const { PrismaClient } = await import('@prisma/client');
    const p = new PrismaClient();
    await p.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' }
    });
    await p.$disconnect();
  });

  it('2. Languages: Check default languages & permissions', async () => {
    // Public /languages endpoint works without auth
    const publicLangRes = await fetch(`${BASE_URL}/api/languages`);
    assert.strictEqual(publicLangRes.status, 200);
    const publicLangData = await publicLangRes.json();
    assert.strictEqual(publicLangData.success, true);
    assert.ok(publicLangData.languages.some(l => l.code === 'vi' && l.status === 'ACTIVE'));
    assert.ok(publicLangData.languages.some(l => l.code === 'en' && l.status === 'ACTIVE'));
    assert.strictEqual(publicLangData.defaultLanguage, 'vi');

    // Normal user CANNOT modify languages (authorization check)
    const forbiddenRes = await fetch(`${BASE_URL}/api/admin/languages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        languages: [{ code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', status: 'ACTIVE', isDefault: true }]
      })
    });
    assert.strictEqual(forbiddenRes.status, 403, 'Normal user must be forbidden from updating languages');

    // Admin CAN update languages (toggle English or add French)
    const adminLangRes = await fetch(`${BASE_URL}/api/admin/languages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        languages: [
          { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', status: 'ACTIVE', isDefault: true },
          { code: 'en', name: 'English', flag: '🇬🇧', status: 'INACTIVE', isDefault: false },
          { code: 'fr', name: 'Français', flag: '🇫🇷', status: 'ACTIVE', isDefault: false }
        ]
      })
    });
    assert.strictEqual(adminLangRes.status, 200);
    const adminLangData = await adminLangRes.json();
    assert.strictEqual(adminLangData.success, true);
    assert.strictEqual(adminLangData.languages.find(l => l.code === 'fr').status, 'ACTIVE');

    // Delete custom language (fr)
    const delRes = await fetch(`${BASE_URL}/api/admin/languages/fr`, {
      method: 'DELETE',
      headers: { 'Cookie': adminCookie }
    });
    assert.strictEqual(delRes.status, 200);

    // Reset languages back to clean active vi & en
    await fetch(`${BASE_URL}/api/admin/languages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        languages: [
          { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', status: 'ACTIVE', isDefault: true },
          { code: 'en', name: 'English', flag: '🇬🇧', status: 'ACTIVE', isDefault: false }
        ]
      })
    });
  });

  it('3. Plan Price Safety: Request 1 created with initial price (199.000đ)', async () => {
    // Checkout session for PRO (monthly)
    const sessionRes = await fetch(`${BASE_URL}/api/payments/checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        plan: 'PRO',
        cycle: 'monthly'
      })
    });
    assert.strictEqual(sessionRes.status, 200);
    const sessionData = await sessionRes.json();
    assert.strictEqual(sessionData.success, true);
    assert.strictEqual(sessionData.checkoutSession.total, 199000, 'Base price of Pro must be 199.000đ');

    // Submit payment request
    const submitRes = await fetch(`${BASE_URL}/api/payments/submit-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        orderId: sessionData.checkoutSession.orderId,
        note: 'Customer paid 199.000đ via QR'
      })
    });
    assert.strictEqual(submitRes.status, 200);
    const submitData = await submitRes.json();
    paymentReq1Id = submitData.payment.id;
    assert.strictEqual(submitData.payment.amount, 199000);
    assert.strictEqual(submitData.payment.status, 'PENDING');
  });

  it('4. Admin changes PRO price from 199.000đ to 249.000đ with authorization & audit log', async () => {
    // Normal user CANNOT change plan price
    const unauthorizedRes = await fetch(`${BASE_URL}/api/admin/plans/PRO`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        name: 'Pro',
        description: 'Updated PRO plan',
        monthlyPrice: 249000,
        yearlyPrice: 2490000,
        billingCycle: '30 ngày',
        status: 'ACTIVE',
        order: 2,
        features: ['Full PRO Features'],
        quota: 'Unlimited'
      })
    });
    assert.strictEqual(unauthorizedRes.status, 403, 'Normal user must be forbidden from editing plans');

    // Admin updates price to 249.000đ
    const updateRes = await fetch(`${BASE_URL}/api/admin/plans/PRO`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        name: 'Pro',
        description: 'Updated PRO plan with new price',
        monthlyPrice: 249000,
        yearlyPrice: 2490000,
        billingCycle: '30 ngày',
        status: 'ACTIVE',
        order: 2,
        features: ['Full PRO Features'],
        quota: 'Unlimited'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.success, true);
    assert.strictEqual(updateData.plan.monthlyPrice, 249000);

    // Verify audit log exists
    const auditRes = await fetch(`${BASE_URL}/api/admin/plans/audit-history`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.strictEqual(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.ok(auditData.logs.length > 0);
    const latestLog = auditData.logs[0];
    const beforeState = JSON.parse(latestLog.beforeState);
    const afterState = JSON.parse(latestLog.afterState);
    assert.strictEqual(beforeState.monthlyPrice, 199000, 'Audit before price must be 199000');
    assert.strictEqual(afterState.monthlyPrice, 249000, 'Audit after price must be 249000');
  });

  it('5. Price Safety: Request 2 uses NEW price (249.000đ), Request 1 STILL preserves OLD price (199.000đ)', async () => {
    // Create new checkout session
    const sessionRes = await fetch(`${BASE_URL}/api/payments/checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        plan: 'PRO',
        cycle: 'monthly'
      })
    });
    assert.strictEqual(sessionRes.status, 200);
    const sessionData = await sessionRes.json();
    assert.strictEqual(sessionData.checkoutSession.total, 249000, 'New session must strictly use the NEW price 249.000đ');

    // Submit payment request 2
    const submitRes = await fetch(`${BASE_URL}/api/payments/submit-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        orderId: sessionData.checkoutSession.orderId,
        note: 'Customer paid 249.000đ via QR'
      })
    });
    paymentReq2Id = (await submitRes.json()).payment.id;

    // Check Admin Payment Requests list
    const adminReqsRes = await fetch(`${BASE_URL}/api/admin/payments/requests`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.strictEqual(adminReqsRes.status, 200);
    const adminReqsData = await adminReqsRes.json();
    
    const req1 = adminReqsData.requests.find(r => r.id === paymentReq1Id);
    const req2 = adminReqsData.requests.find(r => r.id === paymentReq2Id);

    assert.ok(req1, 'Old request must still exist');
    assert.ok(req2, 'New request must exist');

    assert.strictEqual(req1.amount, 199000, 'Old request MUST PRESERVE original snapshot amount 199.000đ');
    assert.strictEqual(req2.amount, 249000, 'New request must use updated price 249.000đ');
  });

  it('6. Admin approves OLD Payment Request (199.000đ) -> upgrades user account correctly while keeping price intact', async () => {
    const approveRes = await fetch(`${BASE_URL}/api/admin/payments/${paymentReq1Id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      }
    });
    assert.strictEqual(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.strictEqual(approveData.success, true);
    assert.strictEqual(approveData.payment.status, 'APPROVED');
    assert.strictEqual(approveData.payment.amount, 199000, 'Approved payment must keep its original 199.000đ amount');

    // Verify user plan upgraded in /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Cookie': userCookie }
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.strictEqual(meData.user.plan, 'PRO', 'User plan must be successfully upgraded to PRO');

    // Reset plan price back to 199000 for standard environment
    await fetch(`${BASE_URL}/api/admin/plans/PRO`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        name: 'Pro',
        description: 'Mở khóa toàn diện Decision Engine, tự động hóa Automation Rules và báo cáo hiệu suất chuyên sâu.',
        monthlyPrice: 199000,
        yearlyPrice: 1990000,
        billingCycle: '30 ngày',
        status: 'ACTIVE',
        order: 2,
        features: [
          'Decision Engine & Mô phỏng What-if không giới hạn',
          'Automation Rules Engine (Tự động hóa đa module)',
          'Phân tích chỉ số năng suất và cảnh báo xung đột lịch',
          'Đồng bộ dữ liệu thời gian thực',
          'Ưu tiên hỗ trợ kỹ thuật 24/7'
        ],
        quota: 'Không giới hạn tính năng cá nhân'
      })
    });
  });

  after(async () => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const testUsers = await prisma.user.findMany({
        where: { email: { in: [userEmail, adminEmail] } },
        select: { id: true }
      });
      const ids = testUsers.map(u => u.id);
      if (ids.length > 0) {
        await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
        await prisma.order.deleteMany({ where: { userId: { in: ids } } });
        await prisma.subscription.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
      await prisma.$disconnect();
    } catch (e) {
      console.error('Teardown cleanup error:', e);
    }
  });
});
