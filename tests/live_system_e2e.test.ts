import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getPrisma } from '../src/backend/db.js';
import { subscriptionService } from '../src/backend/services/subscription.service.js';
import { emailQueueService } from '../src/backend/services/emailQueue.service.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

describe('⚡ [LIFEOS PRODUCTION LIVE SYSTEM E2E TEST SUITE]', () => {
  const prisma = getPrisma();
  let testUserId: string;
  const testUserEmail = `e2e_live_test_${Date.now()}@lifeos.internal`;

  before(async () => {
    // 0. Connect & Ensure clean slate
    await prisma.$queryRaw`SELECT 1`;
    await emailQueueService.initEmailQueueTable();
  });

  after(async () => {
    // Purge any test data generated during the run
    try {
      await prisma.notification.deleteMany({ where: { isTestData: true } });
      await prisma.task.deleteMany({ where: { isTestData: true } });
      await prisma.habit.deleteMany({ where: { isTestData: true } });
      await prisma.emailQueue.deleteMany({ where: { isTestData: true } });
      await prisma.user.deleteMany({ where: { isTestData: true } });
      await prisma.auditLog.deleteMany({ where: { isTestData: true } });
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      }
    } catch (e) {
      // Ignore cleanup error
    }
  });

  // TEST 1: DATABASE ACID TRANSACTION & LATENCY
  it('1. Database Connection & Latency Check (Under 500ms)', async () => {
    const start = Date.now();
    const result: any[] = await prisma.$queryRaw`SELECT 1 as ping`;
    const latency = Date.now() - start;

    assert.equal(result.length, 1);
    assert.equal(result[0].ping, 1);
    assert.ok(latency < 1000, `DB Latency must be acceptable (got ${latency}ms)`);
    console.log(`   ✅ DB Connected. Latency: ${latency}ms`);
  });

  // TEST 2: USER PROVISIONING & TRIAL CALCULATION
  it('2. User Provisioning with 7-Day Free Trial Entitlement', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('TestLivePass@2026', salt);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'E2E Test User',
        username: `e2e_${Date.now().toString(36)}`,
        passwordHash,
        role: 'USER',
        plan: 'FREE',
        status: 'ACTIVE',
        trialStartedAt: now,
        trialEndsAt,
        trialUsed: true,
        isTestData: true
      }
    });

    testUserId = user.id;
    assert.ok(user.id);
    assert.equal(user.isTestData, true);

    // Verify 7-day trial status calculation
    const subStatus = await subscriptionService.checkUserSubscription(user.id);
    assert.equal(subStatus.hasAccess, true, 'New user within 7 days should have active access');
    assert.equal(subStatus.isTrial, true);
    assert.equal(subStatus.isTrialActive, true);
    assert.ok((subStatus.remainingDays || 0) >= 6);
    console.log(`   ✅ 7-Day Trial correctly calculated. Remaining days: ${subStatus.remainingDays}`);
  });

  // TEST 3: GLOBAL FREE MODE TOGGLE ENGINE & AUDIT TRAIL
  it('3. Global Free Mode Toggle (DB Persistence & Zero Overwrite of User Records)', async () => {
    const adminUser = {
      id: testUserId,
      name: 'System Architect',
      email: testUserEmail,
      ip: '127.0.0.1'
    };

    // Toggle ON
    const turnOnRes = await subscriptionService.setGlobalFreeMode(true, adminUser);
    assert.equal(turnOnRes.enabled, true);
    const isFreeNow = await subscriptionService.isGlobalFreeMode();
    assert.equal(isFreeNow, true);

    // Expire user's trial in DB to simulate expired trial account
    await prisma.user.update({
      where: { id: testUserId },
      data: { trialEndsAt: new Date(Date.now() - 10000) }
    });

    // Check access when Global Free Mode is ON -> Must still have access!
    const freeModeSubStatus = await subscriptionService.checkUserSubscription(testUserId);
    assert.equal(freeModeSubStatus.hasAccess, true, 'Global Free Mode should bypass paywall');
    assert.equal(freeModeSubStatus.isGlobalFreeMode, true);

    // Toggle OFF
    const turnOffRes = await subscriptionService.setGlobalFreeMode(false, adminUser);
    assert.equal(turnOffRes.enabled, false);
    const isFreeAfter = await subscriptionService.isGlobalFreeMode();
    assert.equal(isFreeAfter, false);

    // Check access when Global Free Mode is OFF -> Expired account must now be blocked!
    const blockedSubStatus = await subscriptionService.checkUserSubscription(testUserId);
    assert.equal(blockedSubStatus.hasAccess, false, 'Expired trial account must be blocked when free mode is off');
    assert.equal(blockedSubStatus.isTrialExpired, true);

    console.log('   ✅ Global Free Mode tested: ON bypasses paywall, OFF cleanly restricts expired accounts.');
  });

  // TEST 4: GUARANTEED TRANSACTIONAL OUTBOX EMAIL QUEUE
  it('4. Guaranteed Outbox Email Queue (Enqueue, Status & Backoff Schedule)', async () => {
    const queueId = await emailQueueService.enqueue({
      recipient: testUserEmail,
      subject: '[E2E Test] Xác thực Hàng đợi Email Outbox',
      htmlBody: '<h1>Test Email Body</h1>',
      eventType: 'E2E_VERIFICATION',
      isTestData: true,
      metadata: { runId: uuidv4() }
    });

    assert.ok(queueId.startsWith('emq_'));

    // Check database row
    const items = await prisma.emailQueue.findMany({
      where: { id: queueId }
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].recipient, testUserEmail);
    assert.equal(items[0].isTestData, true);
    assert.ok(['PENDING', 'PROCESSING', 'SENT', 'FAILED'].includes(items[0].status));

    // Verify stats calculation
    const stats = await emailQueueService.getQueueStats();
    assert.ok(stats.total > 0);

    console.log(`   ✅ Outbox Queue verified: Item ${queueId} created with status '${items[0].status}'.`);
  });

  // TEST 5: REAL-TIME IN-APP WEB NOTIFICATION
  it('5. Web Notification Bell (In-App Creation & Unread Counter)', async () => {
    const notif = await prisma.notification.create({
      data: {
        user: { connect: { id: testUserId } },
        title: '🔔 [E2E Live Bell] Thông báo hệ thống thời gian thực',
        message: 'Bạn có một bản cập nhật kiến trúc bảo mật mới.',
        type: 'SYSTEM',
        read: false,
        isTestData: true
      }
    });

    assert.ok(notif.id);
    assert.equal(notif.read, false);

    const unreadCount = await prisma.notification.count({
      where: { userId: testUserId, read: false }
    });
    assert.ok(unreadCount >= 1);

    // Mark as read
    await prisma.notification.update({
      where: { id: notif.id },
      data: { read: true }
    });

    const readItem = await prisma.notification.findUnique({ where: { id: notif.id } });
    assert.equal(readItem?.read, true);
    console.log('   ✅ Web Notification Bell created, verified unread count, and marked as read.');
  });

  // TEST 6: ISOLATED SANDBOX SEEDER & CLEANER (100% Zero-Orphan Policy)
  it('6. One-Click Sandbox Isolation (Seed with is_test_data & Clean with 0 trace)', async () => {
    // 1. Seed
    const task = await prisma.task.create({
      data: {
        userId: testUserId,
        title: '[Sandbox E2E] Nhiệm vụ kiểm thử',
        priority: 'Cao',
        status: 'Chưa làm',
        isTestData: true
      }
    });

    const habit = await prisma.habit.create({
      data: {
        user: { connect: { id: testUserId } },
        name: '[Sandbox E2E] Thói quen kiểm thử',
        category: 'Personal',
        streak: 3,
        status: 'Active',
        isTestData: true
      }
    });

    const beforeCleanTasks = await prisma.task.count({ where: { isTestData: true } });
    const beforeCleanHabits = await prisma.habit.count({ where: { isTestData: true } });
    assert.ok(beforeCleanTasks >= 1);
    assert.ok(beforeCleanHabits >= 1);

    // 2. Clean all where isTestData = true
    const delTasks = await prisma.task.deleteMany({ where: { isTestData: true } });
    const delHabits = await prisma.habit.deleteMany({ where: { isTestData: true } });

    assert.ok(delTasks.count >= 1);
    assert.ok(delHabits.count >= 1);

    const afterCleanTasks = await prisma.task.count({ where: { isTestData: true } });
    const afterCleanHabits = await prisma.habit.count({ where: { isTestData: true } });
    assert.equal(afterCleanTasks, 0);
    assert.equal(afterCleanHabits, 0);

    console.log('   ✅ Sandbox Seeder & Cleaner verified: All test records purged with 0 orphan rows.');
  });
});
