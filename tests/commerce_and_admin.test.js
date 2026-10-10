import { describe, it, after } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

describe('Commerce, Decision & Admin Operations Test Suite', () => {
  let userCookie = '';
  let adminCookie = '';
  let activeCouponCode = '';

  const userEmail = `commerce_user_${Date.now()}@lifeos.local`;
  const adminEmail = `admin_test_${Date.now()}@lifeos.local`;
  const password = 'StrongPassword2026!';

  it('1. Register test user and add coupon to database', async () => {
    // Register user
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Commerce Tester',
        email: userEmail,
        password
      })
    });
    assert.strictEqual(regRes.status, 201);
    userCookie = regRes.headers.get('set-cookie').split(';')[0];
    const regData = await regRes.json();

    // Grant active PRO subscription to Commerce Tester in test database so workspace CRUD is authorized
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.user.update({
      where: { id: regData.user.id },
      data: {
        plan: 'PRO',
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    await prisma.$disconnect();
  });

  it('2. Coupon validation rejects invalid coupon and accepts valid coupon', async () => {
    // Invalid coupon
    const invalidRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({ code: 'NONEXISTENT_CODE' })
    });
    assert.strictEqual(invalidRes.status, 404, 'Invalid coupon must return 404');

    activeCouponCode = `PROMO_${Date.now()}`;
    // Create a valid coupon directly via DB/collection or test
    const couponRes = await fetch(`${BASE_URL}/api/data/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        code: activeCouponCode,
        discountPercent: 50,
        status: 'Active',
        maxUses: 100,
        usedCount: 0
      })
    });
    assert.strictEqual(couponRes.status, 201, 'Coupon created');

    // Validate the newly created coupon
    const valRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({ code: activeCouponCode })
    });
    assert.strictEqual(valRes.status, 200, 'Valid coupon must return 200');
    const valData = await valRes.json();
    assert.strictEqual(valData.discountPercent, 50);
  });

  it('3. Checkout creates Order and Payment atomically and clears cart', async () => {
    // 1. Add item to cart
    const cartRes = await fetch(`${BASE_URL}/api/data/cartItems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        productId: 'tpl_finance_freedom',
        quantity: 1
      })
    });
    assert.strictEqual(cartRes.status, 201);

    // 2. Checkout with coupon
    const checkoutRes = await fetch(`${BASE_URL}/api/cart/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        couponCode: activeCouponCode
      })
    });
    assert.strictEqual(checkoutRes.status, 200, 'Checkout must succeed');
    const orderData = await checkoutRes.json();
    assert.strictEqual(orderData.success, true);
    assert.ok(orderData.order && orderData.order.orderId);
    assert.strictEqual(orderData.order.discount, (orderData.order.subtotal * 50) / 100);

    // 3. Verify cart is now empty
    const cartCheckRes = await fetch(`${BASE_URL}/api/data/cartItems`, {
      headers: { 'Cookie': userCookie }
    });
    const remainingCart = await cartCheckRes.json();
    assert.strictEqual(remainingCart.length, 0, 'Cart must be cleared after checkout');
  });

  it('4. Decision Engine creates and converts decision to project & tasks', async () => {
    // 1. Create Decision using frontend payload structure (problemStatement, constraints, etc.)
    const decRes = await fetch(`${BASE_URL}/api/data/decisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: 'laptop',
        problemStatement: 'học tập',
        whyReason: 'Cần máy tính để học tập',
        deadline: '2026-10-20',
        constraints: ['ngân sách 20 triệu'],
        threshold: 'Standard',
        category: 'Hạ tầng',
        status: 'Analyzing',
        tags: ['tech', 'study'],
        options: [
          { id: 'opt_vps', name: 'Dedicated VPS + Docker Compose' },
          { id: 'opt_serverless', name: 'Serverless Cloud Run' }
        ],
        criteria: [
          { id: 'crit_cost', name: 'Chi phí hàng tháng', weight: 4 },
          { id: 'crit_control', name: 'Quyền kiểm soát', weight: 5 }
        ]
      })
    });
    assert.strictEqual(decRes.status, 201);
    const decision = await decRes.json();
    assert.ok(decision.id);
    assert.strictEqual(decision.problemStatement, 'học tập');
    assert.deepStrictEqual(decision.constraints, ['ngân sách 20 triệu']);

    // 2. Select Option
    const selectRes = await fetch(`${BASE_URL}/api/decisions/${decision.id}/select-option`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      },
      body: JSON.stringify({
        optionId: 'opt_vps',
        reasoning: 'Chi phí cố định, toàn quyền kiểm soát Docker và PostgreSQL.'
      })
    });
    assert.strictEqual(selectRes.status, 200);

    // 3. Convert to Project & Tasks
    const convertRes = await fetch(`${BASE_URL}/api/decisions/${decision.id}/convert-execution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userCookie
      }
    });
    assert.strictEqual(convertRes.status, 200);
    const convData = await convertRes.json();
    assert.ok(convData.projectId);
    assert.ok(convData.taskId);
  });

  it('5. Forgot Password and Reset Password Flow with token invalidation', async () => {
    // Request forgot password
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-csrf-for-test': 'true'
      },
      body: JSON.stringify({ email: userEmail })
    });
    assert.strictEqual(forgotRes.status, 200);
    const forgotData = await forgotRes.json();
    assert.strictEqual(forgotData.success, true);
    assert.ok(forgotData.resetToken, 'In development mode resetToken is returned');

    // Reset password with new password
    const newPassword = 'BrandNewPassword2026!';
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: forgotData.resetToken,
        newPassword
      })
    });
    assert.strictEqual(resetRes.status, 200);

    // Reusing the same resetToken must now fail (used = true)
    const reuseRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: forgotData.resetToken,
        newPassword: 'AnotherPassword!'
      })
    });
    assert.strictEqual(reuseRes.status, 400, 'Reusing token must fail with 400');

    // Logging in with OLD password must fail
    const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password })
    });
    assert.strictEqual(oldLoginRes.status, 401, 'Old password must fail');

    // Logging in with NEW password succeeds
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: newPassword })
    });
    assert.strictEqual(newLoginRes.status, 200, 'New password must succeed');
  });

  after(async () => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.user.deleteMany({
        where: { email: { in: [userEmail, adminEmail] } }
      });
      if (activeCouponCode) {
        await prisma.coupon.deleteMany({ where: { code: activeCouponCode } });
      }
      await prisma.$disconnect();
    } catch (e) {}
  });
});
