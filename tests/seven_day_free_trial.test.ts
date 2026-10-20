import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrisma, dbService } from '../src/backend/db.js';
import { subscriptionService } from '../src/backend/services/subscription.service.js';
import bcrypt from 'bcryptjs';

test('Comprehensive 7-Day Free Trial Lifecycle & Access Control Test Suite', async (t) => {
  const prisma = getPrisma();
  const timestamp = Date.now();
  const testEmail = `trial_tester_${timestamp}@lifeos.test`;
  let testUserId = '';

  const now = new Date();
  const expectedTrialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await t.test('1. Setup New User Registration with 7-Day Free Trial', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('SecurePassword@123', salt);

    const user = await dbService.createUser({
      name: 'Trial Tester',
      email: testEmail,
      username: `trial_${timestamp}`,
      passwordHash,
      role: 'USER',
      plan: 'FREE',
      status: 'ACTIVE',
      trialStartedAt: now,
      trialEndsAt: expectedTrialEnd,
      trialUsed: true
    });

    assert.ok(user.id);
    testUserId = user.id;

    // Verify stored timestamps in DB
    const dbUser = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { trialStartedAt: true, trialEndsAt: true, trialUsed: true }
    });

    assert.ok(dbUser?.trialStartedAt);
    assert.ok(dbUser?.trialEndsAt);
    assert.equal(dbUser?.trialUsed, true);

    const diffMs = new Date(dbUser!.trialEndsAt!).getTime() - new Date(dbUser!.trialStartedAt!).getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    assert.equal(diffHours, 168); // Exact 7 * 24 = 168 hours
  });

  await t.test('2. Entitlement Check: Active 7-Day Free Trial grants Full Access', async () => {
    const subStatus = await subscriptionService.checkUserSubscription(testUserId);

    assert.equal(subStatus.hasAccess, true);
    assert.equal(subStatus.isTrial, true);
    assert.equal(subStatus.isTrialActive, true);
    assert.equal(subStatus.isTrialExpired, false);
    assert.equal(subStatus.lifecycleStatus, 'ACTIVE');
    assert.equal(subStatus.planId, 'FREE_TRIAL_7D');
    assert.ok(subStatus.remainingDays >= 6 && subStatus.remainingDays <= 7);
  });

  await t.test('3. Entitlement Check: Near Expiration (e.g. Day 6 of 7)', async () => {
    // Simulate user with 1 day remaining (trialEndsAt = now + 1 day)
    const nearExpiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: testUserId },
      data: { trialEndsAt: nearExpiryDate }
    });

    const subStatus = await subscriptionService.checkUserSubscription(testUserId);
    assert.equal(subStatus.hasAccess, true);
    assert.equal(subStatus.isTrialActive, true);
    assert.equal(subStatus.remainingDays, 1);
  });

  await t.test('4. Expiration Enforcement: Immediate Paywall Lock when Trial Ends', async () => {
    // Simulate trial ending in the past (now - 1 second)
    const expiredDate = new Date(Date.now() - 1000);
    await prisma.user.update({
      where: { id: testUserId },
      data: { trialEndsAt: expiredDate }
    });

    const subStatus = await subscriptionService.checkUserSubscription(testUserId);

    // Access must be strictly revoked
    assert.equal(subStatus.hasAccess, false);
    assert.equal(subStatus.isTrial, true);
    assert.equal(subStatus.isTrialActive, false);
    assert.equal(subStatus.isTrialExpired, true);
    assert.equal(subStatus.lifecycleStatus, 'EXPIRED');
    assert.equal(subStatus.remainingDays, 0);
  });

  await t.test('5. Global Free Mode Override: Admin Open Mode grants access even when expired', async () => {
    // Turn ON Global Free Mode
    await prisma.systemSetting.upsert({
      where: { key: 'global_free_mode' },
      update: { value: 'true' },
      create: { key: 'global_free_mode', value: 'true' }
    });

    const subStatusOpen = await subscriptionService.checkUserSubscription(testUserId);
    assert.equal(subStatusOpen.hasAccess, true);
    assert.equal(subStatusOpen.isGlobalFreeMode, true);

    // Turn OFF Global Free Mode -> Must revert to locked state immediately
    await prisma.systemSetting.upsert({
      where: { key: 'global_free_mode' },
      update: { value: 'false' },
      create: { key: 'global_free_mode', value: 'false' }
    });

    const subStatusClosed = await subscriptionService.checkUserSubscription(testUserId);
    assert.equal(subStatusClosed.hasAccess, false);
    assert.equal(subStatusClosed.isTrialExpired, true);
  });

  await t.test('6. Paid Subscription Activation restores Full Access after Trial Expiry', async () => {
    // User purchases Personal 1M plan
    const subStartDate = new Date();
    const subEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const paidSub = await prisma.subscription.create({
      data: {
        userId: testUserId,
        planId: 'PERSONAL_1M',
        planType: 'PERSONAL',
        planName: 'Gói Cá Nhân 1 Tháng',
        amount: 29000,
        billingCycle: '1_MONTH',
        durationDays: 30,
        paymentStatus: 'PAID',
        status: 'ACTIVE',
        startDate: subStartDate,
        endDate: subEndDate
      }
    });

    assert.ok(paidSub.id);

    // Verify subscriptionService now prioritizes the paid subscription over the expired trial
    const subStatus = await subscriptionService.checkUserSubscription(testUserId);
    assert.equal(subStatus.hasAccess, true);
    assert.equal(subStatus.planId, 'PERSONAL_1M');
    assert.equal(subStatus.isTeamOwner, false);
    assert.ok(subStatus.remainingDays >= 29);

    // Clean up paid sub
    await prisma.subscription.delete({ where: { id: paidSub.id } });
  });

  await t.test('7. Anti-Abuse: Existing Users without trial do not get accidental trial', async () => {
    const existingUser = await dbService.createUser({
      name: 'Old User',
      email: `old_user_${timestamp}@lifeos.test`,
      username: `old_${timestamp}`,
      passwordHash: 'dummy',
      role: 'USER',
      plan: 'FREE',
      status: 'ACTIVE'
    });

    const subStatus = await subscriptionService.checkUserSubscription(existingUser.id);
    assert.equal(subStatus.hasAccess, false);
    assert.equal(subStatus.isTrial, undefined);

    await prisma.user.delete({ where: { id: existingUser.id } });
  });

  await t.test('8. Teardown Test Data', async () => {
    await prisma.notification.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });
});
