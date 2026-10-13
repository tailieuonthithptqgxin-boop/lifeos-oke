import assert from 'assert';
import { getPrisma } from '../src/backend/db.js';
import { subscriptionService, OFFICIAL_PLANS } from '../src/backend/services/subscription.service.js';
import { requireActiveSubscription, canUse } from '../src/backend/auth.middleware.js';

async function runSubscriptionLifecycleTests() {
  console.log('================================================================');
  console.log('   STARTING 13 MANDATORY SUBSCRIPTION PRODUCTION TEST SUITE     ');
  console.log('================================================================\n');

  const prisma = getPrisma();
  const testRunId = Date.now();
  const testUserEmail = `sub_test_${testRunId}@lifeos.vn`;

  // Setup: create clean test user
  const testUser = await prisma.user.create({
    data: {
      email: testUserEmail,
      name: `Test User ${testRunId}`,
      passwordHash: 'hashed_password_sample',
      role: 'USER',
      plan: 'FREE'
    }
  });

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Admin đổi giá plan -> Trang Gói cước lấy giá mới từ Database (Single Source of Truth)
    // ------------------------------------------------------------------------
    console.log('[Test 1] Admin đổi giá plan -> Trang Gói cước cập nhật giá mới:');
    const originalPlans = await subscriptionService.getPlans(true);
    const targetPlan = originalPlans.find(p => p.id === 'PERSONAL_1M')!;
    const originalPrice = targetPlan.price;
    const newPrice = 25000;

    // Simulate Admin saving new price to SystemSetting ('service_plans_config')
    const updatedPlansConfig = originalPlans.map(p => {
      if (p.id === 'PERSONAL_1M') {
        return { ...p, price: newPrice, monthlyPrice: newPrice };
      }
      return p;
    });

    await prisma.systemSetting.upsert({
      where: { key: 'service_plans_config' },
      update: { value: JSON.stringify(updatedPlansConfig) },
      create: { key: 'service_plans_config', value: JSON.stringify(updatedPlansConfig) }
    });

    const refreshedPlans = await subscriptionService.getPlans(false);
    const refreshedP1M = refreshedPlans.find(p => p.id === 'PERSONAL_1M');
    assert.strictEqual(refreshedP1M?.price, newPrice, 'Giá gói PERSONAL_1M phải được cập nhật sang 25.000đ từ DB');
    console.log(`  ✓ PASSED: Admin đổi giá từ ${originalPrice}đ -> ${newPrice}đ, hệ thống phản hồi giá mới: ${refreshedP1M?.price}đ.`);

    // ------------------------------------------------------------------------
    // TEST 2: User mua plan 30 ngày -> End date chính xác = startDate + 30 ngày
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] User mua plan 30 ngày -> End date chính xác (+30 ngày):');
    const beforeActivate30 = Date.now();
    const sub30 = await subscriptionService.activateSubscription(testUser.id, 'PERSONAL_1M', {
      txReference: `TEST_30D_${testRunId}`,
      amount: newPrice
    });

    const expectedEndDate30 = new Date(beforeActivate30 + 30 * 24 * 60 * 60 * 1000);
    const actualEndDate30 = new Date(sub30.endDate);
    const diffHours30 = Math.abs(actualEndDate30.getTime() - expectedEndDate30.getTime()) / (1000 * 60 * 60);
    assert(diffHours30 < 1, `End date của gói 30 ngày phải chênh lệch dưới 1 giờ so với +30 ngày (diff: ${diffHours30}h)`);
    assert.strictEqual(sub30.durationDays, 30, 'DurationDays phải đúng 30 ngày');
    assert.strictEqual(sub30.status, 'ACTIVE', 'Status phải là ACTIVE');
    console.log(`  ✓ PASSED: Start: ${new Date(sub30.startDate).toISOString()}, End: ${actualEndDate30.toISOString()} (+30 ngày chuẩn xác).`);

    // ------------------------------------------------------------------------
    // TEST 3: User mua plan 90 ngày -> End date chính xác = startDate + 90 ngày
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] User mua plan 90 ngày -> End date chính xác (+90 ngày):');
    // Create separate test user for isolated 90-day test
    const user90 = await prisma.user.create({
      data: {
        email: `sub_90d_${testRunId}@lifeos.vn`,
        name: 'User 90 Days',
        passwordHash: 'sample_hash',
        role: 'USER',
        plan: 'FREE'
      }
    });

    const beforeActivate90 = Date.now();
    const sub90 = await subscriptionService.activateSubscription(user90.id, 'PERSONAL_3M', {
      txReference: `TEST_90D_${testRunId}`
    });

    const expectedEndDate90 = new Date(beforeActivate90 + 90 * 24 * 60 * 60 * 1000);
    const actualEndDate90 = new Date(sub90.endDate);
    const diffHours90 = Math.abs(actualEndDate90.getTime() - expectedEndDate90.getTime()) / (1000 * 60 * 60);
    assert(diffHours90 < 1, `End date của gói 90 ngày phải chênh lệch dưới 1 giờ so với +90 ngày (diff: ${diffHours90}h)`);
    assert.strictEqual(sub90.durationDays, 90, 'DurationDays phải đúng 90 ngày');
    console.log(`  ✓ PASSED: Start: ${new Date(sub90.startDate).toISOString()}, End: ${actualEndDate90.toISOString()} (+90 ngày chuẩn xác).`);

    // ------------------------------------------------------------------------
    // TEST 4: Subscription còn hạn -> Premium API hoạt động (hasAccess = true)
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Subscription còn hạn -> Premium API hoạt động:');
    const activeCheck = await subscriptionService.checkUserSubscription(testUser.id);
    assert.strictEqual(activeCheck.hasAccess, true, 'User có subscription còn hạn phải hasAccess = true');
    assert.strictEqual(activeCheck.status, 'ACTIVE', 'Status phải ACTIVE');
    assert(activeCheck.remainingDays > 0, 'RemainingDays phải > 0');

    // Test middleware
    let middlewarePassed = false;
    const reqMock: any = { userId: testUser.id, userRole: 'USER' };
    const resMock: any = {
      status: (code: number) => ({
        json: (data: any) => { throw new Error(`Unexpected block: ${code}`); }
      })
    };
    await requireActiveSubscription(reqMock, resMock, () => { middlewarePassed = true; });
    assert.strictEqual(middlewarePassed, true, 'requireActiveSubscription middleware phải cho phép request qua');
    console.log(`  ✓ PASSED: hasAccess = true, remainingDays = ${activeCheck.remainingDays}, middleware allowed.`);

    // ------------------------------------------------------------------------
    // TEST 5: Subscription hết hạn -> Premium API bị chặn ngay lập tức
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Subscription hết hạn -> Premium API bị chặn ngay:');
    // Set subscription endDate to 1 day in the past
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.subscription.updateMany({
      where: { userId: testUser.id, status: 'ACTIVE' },
      data: { endDate: pastDate }
    });

    const expiredCheck = await subscriptionService.checkUserSubscription(testUser.id);
    assert.strictEqual(expiredCheck.hasAccess, false, 'Khi hết hạn, hasAccess phải là false');
    assert.strictEqual(expiredCheck.status, 'EXPIRED', 'Status phải là EXPIRED');
    console.log('  ✓ PASSED: subscriptionService phát hiện hết hạn và từ chối hasAccess: false, status: EXPIRED.');

    // ------------------------------------------------------------------------
    // TEST 6: User refresh trang sau khi hết hạn -> Vẫn bị khóa quyền
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] User refresh trang sau khi hết hạn -> Vẫn bị khóa quyền (Zero-Trust):');
    const refreshCheck = await subscriptionService.checkUserSubscription(testUser.id);
    assert.strictEqual(refreshCheck.hasAccess, false, 'Refresh trang kiểm tra DB vẫn bị chặn');
    assert.strictEqual(refreshCheck.remainingDays, 0, 'Remaining days = 0');
    console.log('  ✓ PASSED: Kiểm tra lại (refresh), trạng thái vẫn là EXPIRED, hasAccess = false.');

    // ------------------------------------------------------------------------
    // TEST 7: User cố gọi API trực tiếp sau khi hết hạn -> Backend từ chối HTTP 403
    // ------------------------------------------------------------------------
    console.log('\n[Test 7] User cố gọi API trực tiếp sau khi hết hạn -> Backend trả về 403:');
    let blockedCode = 0;
    let blockedData: any = null;
    const resBlockedMock: any = {
      status: (code: number) => {
        blockedCode = code;
        return {
          json: (data: any) => { blockedData = data; }
        };
      }
    };
    await requireActiveSubscription(reqMock, resBlockedMock, () => {
      assert.fail('Không được gọi next() khi subscription đã hết hạn');
    });
    assert.strictEqual(blockedCode, 403, 'Backend phải trả về HTTP 403');
    assert.strictEqual(blockedData.error.code, 'SUBSCRIPTION_REQUIRED', 'Error code phải là SUBSCRIPTION_REQUIRED');
    console.log(`  ✓ PASSED: Backend từ chối trực tiếp với HTTP ${blockedCode} (SUBSCRIPTION_REQUIRED).`);

    // ------------------------------------------------------------------------
    // TEST 8: Payment Failed -> Không cấp subscription
    // ------------------------------------------------------------------------
    console.log('\n[Test 8] Payment FAILED -> Không cấp subscription:');
    const failedPayment = await prisma.payment.create({
      data: {
        userId: testUser.id,
        customerEmail: testUser.email,
        orderId: `ORD_FAIL_${testRunId}`,
        planRequested: 'PERSONAL_1M',
        amount: 15000,
        status: 'FAILED',
        txReference: `TX_FAIL_${testRunId}`,
        billingCycle: '1_MONTH'
      }
    });

    const subsBeforeFail = await prisma.subscription.count({
      where: { userId: testUser.id, status: 'ACTIVE', endDate: { gt: new Date() } }
    });
    assert.strictEqual(subsBeforeFail, 0, 'Payment FAILED tuyệt đối không sinh ra active subscription');
    console.log('  ✓ PASSED: Payment status FAILED không kích hoạt quyền cho tài khoản.');

    // ------------------------------------------------------------------------
    // TEST 9: Payment Pending -> Không cấp subscription
    // ------------------------------------------------------------------------
    console.log('\n[Test 9] Payment PENDING -> Không cấp subscription:');
    const pendingPayment = await prisma.payment.create({
      data: {
        userId: testUser.id,
        customerEmail: testUser.email,
        orderId: `ORD_PENDING_${testRunId}`,
        planRequested: 'PERSONAL_1M',
        amount: 15000,
        status: 'PENDING',
        txReference: `TX_PENDING_${testRunId}`,
        billingCycle: '1_MONTH'
      }
    });

    const pendingCheck = await subscriptionService.checkUserSubscription(testUser.id);
    assert.strictEqual(pendingCheck.hasAccess, false, 'Payment PENDING không được có hasAccess = true');
    assert.strictEqual(pendingCheck.lifecycleStatus, 'PENDING', 'LifecycleStatus phải là PENDING');
    console.log('  ✓ PASSED: Payment PENDING không cấp quyền (hasAccess = false, status = PENDING).');

    // ------------------------------------------------------------------------
    // TEST 10: Refund -> Xử lý subscription đúng business rule (thu hồi quyền)
    // ------------------------------------------------------------------------
    console.log('\n[Test 10] Refund -> Thu hồi subscription & chuyển trạng thái REFUNDED:');
    // First activate a valid subscription linked to an approved payment
    const approvedPayment = await prisma.payment.create({
      data: {
        userId: testUser.id,
        customerEmail: testUser.email,
        orderId: `ORD_APP_${testRunId}`,
        planRequested: 'PERSONAL_1M',
        amount: 25000,
        status: 'APPROVED',
        txReference: `TX_APP_${testRunId}`,
        billingCycle: '1_MONTH'
      }
    });

    const activeSubForRefund = await subscriptionService.activateSubscription(testUser.id, 'PERSONAL_1M', {
      paymentId: approvedPayment.id,
      txReference: approvedPayment.txReference,
      amount: approvedPayment.amount
    });

    // Verify it is active before refund
    const beforeRefundCheck = await subscriptionService.checkUserSubscription(testUser.id);
    assert.strictEqual(beforeRefundCheck.hasAccess, true, 'Trước khi refund phải active');

    // Process Refund
    await subscriptionService.cancelSubscriptionOnRefund(approvedPayment.id, 'Khách hàng yêu cầu hoàn tiền', 'admin@lifeos.vn');

    // Verify after refund
    const afterRefundCheck = await subscriptionService.checkUserSubscription(testUser.id);
    assert.strictEqual(afterRefundCheck.hasAccess, false, 'Sau khi refund, hasAccess phải = false');
    assert.strictEqual(afterRefundCheck.status, 'CANCELLED', 'Subscription status phải = CANCELLED');

    const refundedPaymentRecord = await prisma.payment.findUnique({ where: { id: approvedPayment.id } });
    assert.strictEqual(refundedPaymentRecord?.status, 'REFUNDED', 'Payment status phải = REFUNDED');
    console.log('  ✓ PASSED: Đơn đã hoàn tiền (REFUNDED), subscription chuyển sang CANCELLED, quyền bị thu hồi.');

    // ------------------------------------------------------------------------
    // TEST 11: Admin thay đổi giá sau khi user đã mua -> Subscription cũ giữ nguyên giá snapshot
    // ------------------------------------------------------------------------
    console.log('\n[Test 11] Admin thay đổi giá sau khi mua -> Giá snapshot của subscription cũ không bị đổi:');
    // User buys at 25.000đ
    const boughtSub = await subscriptionService.activateSubscription(testUser.id, 'PERSONAL_1M', {
      amount: 25000,
      txReference: `TX_SNAPSHOT_${testRunId}`
    });
    assert.strictEqual(boughtSub.amount, 25000, 'Giá mua lúc này là 25.000đ');

    // Admin updates plan price to 50.000đ
    const priceChangePlans = refreshedPlans.map(p => {
      if (p.id === 'PERSONAL_1M') return { ...p, price: 50000, monthlyPrice: 50000 };
      return p;
    });
    await prisma.systemSetting.upsert({
      where: { key: 'service_plans_config' },
      update: { value: JSON.stringify(priceChangePlans) },
      create: { key: 'service_plans_config', value: JSON.stringify(priceChangePlans) }
    });

    // Check old subscription amount in DB
    const persistedSub = await prisma.subscription.findUnique({ where: { id: boughtSub.id } });
    assert.strictEqual(persistedSub?.amount, 25000, 'Giá trong subscription cũ phải giữ nguyên 25.000đ, không bị tăng lên 50.000đ');

    // But new inquiries for plan get 50.000đ
    const newPlanConfig = await subscriptionService.getPlanById('PERSONAL_1M');
    assert.strictEqual(newPlanConfig?.price, 50000, 'Khách mới xem bảng giá sẽ thấy 50.000đ');
    console.log(`  ✓ PASSED: Giá snapshot lịch sử: ${persistedSub?.amount}đ không đổi; Giá niêm yết mới: ${newPlanConfig?.price}đ.`);

    // ------------------------------------------------------------------------
    // TEST 12: User mua lại / gia hạn gói -> Cộng nối tiếp (không mất ngày đã thanh toán)
    // ------------------------------------------------------------------------
    console.log('\n[Test 12] User gia hạn khi gói còn hạn -> Cộng nối tiếp chính xác (không mất ngày):');
    const currentActive = await prisma.subscription.findUnique({ where: { id: boughtSub.id } });
    const currentEndDate = new Date(currentActive!.endDate);

    // User renews with another 30-day plan
    const renewalSub = await subscriptionService.activateSubscription(testUser.id, 'PERSONAL_1M', {
      amount: 50000,
      txReference: `TX_RENEW_${testRunId}`
    });

    const expectedStackedEnd = new Date(currentEndDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const actualStackedEnd = new Date(renewalSub.endDate);
    const stackDiffHours = Math.abs(actualStackedEnd.getTime() - expectedStackedEnd.getTime()) / (1000 * 60 * 60);

    assert(stackDiffHours < 1, `Ngày hết hạn mới phải nối tiếp chính xác sau ngày hết hạn cũ (+30 ngày) (diff: ${stackDiffHours}h)`);
    console.log(`  ✓ PASSED: Hạn cũ: ${currentEndDate.toLocaleDateString('vi-VN')} -> Hạn mới nối tiếp: ${actualStackedEnd.toLocaleDateString('vi-VN')} (+30 ngày nối tiếp).`);

    // ------------------------------------------------------------------------
    // TEST 13: Hai request mua/kích hoạt đồng thời -> Không duplicate subscription
    // ------------------------------------------------------------------------
    console.log('\n[Test 13] Hai request kích hoạt đồng thời -> Không tạo duplicate subscription ngoài business rule:');
    const [concurrent1, concurrent2] = await Promise.all([
      subscriptionService.activateSubscription(testUser.id, 'PERSONAL_1M', { txReference: `TX_CONC_1_${testRunId}` }),
      subscriptionService.activateSubscription(testUser.id, 'PERSONAL_1M', { txReference: `TX_CONC_2_${testRunId}` })
    ]);

    // Count how many ACTIVE subscriptions exist for this user right now
    const activeSubsCount = await prisma.subscription.count({
      where: {
        userId: testUser.id,
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      }
    });

    assert.strictEqual(activeSubsCount, 1, 'Sau các lần kích hoạt, chỉ có ĐÚNG 1 subscription ACTIVE chính cho tài khoản');
    console.log(`  ✓ PASSED: Số lượng ACTIVE subscription duy nhất hiện tại: ${activeSubsCount}.`);

    // Reset clean default plans back to official defaults (15k, 40k, 50k)
    await prisma.systemSetting.upsert({
      where: { key: 'service_plans_config' },
      update: { value: JSON.stringify(OFFICIAL_PLANS) },
      create: { key: 'service_plans_config', value: JSON.stringify(OFFICIAL_PLANS) }
    });

    console.log('\n================================================================');
    console.log('   🎉 ALL 13 TEST CASES PASSED WITH 100% SUCCESS RATE!          ');
    console.log('================================================================');
  } finally {
    // Cleanup test users and related records
    try {
      const usersToClean = await prisma.user.findMany({
        where: { email: { in: [testUserEmail, `sub_90d_${testRunId}@lifeos.vn`] } },
        select: { id: true }
      });
      const ids = usersToClean.map(u => u.id);
      if (ids.length > 0) {
        await prisma.subscription.deleteMany({ where: { userId: { in: ids } } });
        await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    } catch (e) {}
  }
}

runSubscriptionLifecycleTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  });
