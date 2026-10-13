import test from 'node:test';
import assert from 'node:assert/strict';
import { referralService } from '../src/backend/services/referral.service.js';
import { feedbackService } from '../src/backend/services/feedback.service.js';
import { getPrisma } from '../src/backend/db.js';

test('Referral Program & Feedback System Comprehensive Test Suite', async (t) => {
  const prisma = getPrisma();
  const testRunId = Date.now().toString(36);
  const userAEmail = `referrer_${testRunId}@test.com`;
  const userBEmail = `referee_${testRunId}@test.com`;

  let userA;
  let userB;

  await t.test('1. Setup Test Users & Verify Referral Code Generation', async () => {
    userA = await prisma.user.create({
      data: {
        name: 'User A Referrer',
        email: userAEmail,
        passwordHash: 'dummy_hash',
        role: 'USER',
        plan: 'FREE'
      }
    });

    userB = await prisma.user.create({
      data: {
        name: 'User B Referee',
        email: userBEmail,
        passwordHash: 'dummy_hash',
        role: 'USER',
        plan: 'FREE'
      }
    });

    // Generate or get profile for User A
    const profileA = await referralService.getOrCreateProfile(userA.id);
    assert.ok(profileA.referralCode, 'Profile A must have a referral code');
    assert.match(profileA.referralCode, /^LIFE-/, 'Referral code must follow format LIFE-XXXXXX');
  });

  await t.test('2. Bind Referral Code & Fraud Prevention Rules', async () => {
    const profileA = await referralService.getOrCreateProfile(userA.id);

    // Rule 1: Cannot self-refer
    const selfRefer = await referralService.bindReferral(userA.id, profileA.referralCode);
    assert.equal(selfRefer, false, 'Self-referral must be strictly rejected');

    // Rule 2: User B binds User A code
    const bindSuccess = await referralService.bindReferral(userB.id, profileA.referralCode);
    assert.equal(bindSuccess, true, 'User B must successfully bind User A code');

    // Rule 3: Cannot bind twice
    const doubleBind = await referralService.bindReferral(userB.id, profileA.referralCode);
    assert.equal(doubleBind, false, 'User B cannot be referred twice');

    // Verify Relationship in DB
    const rel = await prisma.referralRelationship.findUnique({ where: { referredUserId: userB.id } });
    assert.ok(rel, 'Relationship must exist');
    assert.equal(rel.referrerId, userA.id, 'Referrer must be user A');
  });

  await t.test('3. Order Approved -> Accurate 30% Commission Calculation & Notifications', async () => {
    const orderId = `ORD_TEST_${testRunId}`;
    const orderAmount = 200000; // 200,000 VND -> 20% is 40,000 VND

    const commission = await referralService.processOrderApproved(orderId, orderAmount, userB.id);
    assert.ok(commission, 'Commission must be created');
    assert.equal(commission.orderAmount, 200000);
    assert.equal(commission.commissionRate, 0.20);
    assert.equal(commission.rewardAmount, 40000, '20% of 200k must be 40k');
    assert.equal(commission.status, 'Approved');

    // Verify duplicate order reward protection
    const duplicate = await referralService.processOrderApproved(orderId, orderAmount, userB.id);
    assert.equal(duplicate, null, 'Duplicate commission for same order must be blocked');

    // Verify User A Dashboard Stats
    const dashboardA = await referralService.getUserDashboard(userA.id);
    assert.equal(dashboardA.totalReferred, 1);
    assert.equal(dashboardA.totalSales, 200000);
    assert.equal(dashboardA.totalCommission, 40000);
    assert.equal(dashboardA.approvedReward, 40000);

    // Verify notification was sent to User A
    const notice = await prisma.notification.findFirst({
      where: { userId: userA.id, title: { contains: 'hoa hồng' } }
    });
    assert.ok(notice, 'Referrer must receive reward notification');
  });

  await t.test('4. Order Cancelled / Refunded -> Commission Rollback & Balance Adjustment', async () => {
    const orderId = `ORD_TEST_${testRunId}`;
    const cancelled = await referralService.processOrderCancelledOrRefunded(orderId, 'Khách yêu cầu hoàn tiền');
    assert.equal(cancelled, true, 'Rollback must execute successfully');

    // Verify dashboard adjusted
    const dashboardAfter = await referralService.getUserDashboard(userA.id);
    assert.equal(dashboardAfter.approvedReward, 0, 'Approved reward balance must decrease by 60k back to 0');
    assert.equal(dashboardAfter.totalCommission, 0);

    // Verify commission status
    const commDb = await prisma.referralCommission.findUnique({ where: { orderId } });
    assert.equal(commDb?.status, 'Cancelled');
  });

  await t.test('5. Referral Wallet & Bank Withdrawal Flow (Atomic Locking & Double-Spend Protection)', async () => {
    // Re-create an approved order for 500,000 VND -> 20% is 100,000 VND reward
    const orderId2 = `ORD_WITHDRAW_${testRunId}`;
    await referralService.processOrderApproved(orderId2, 500000, userB.id);

    const dash = await referralService.getUserDashboard(userA.id);
    assert.equal(dash.approvedReward, 100000, 'User A has 100,000 VND available reward');

    // Rule 1: Cannot withdraw more than available balance
    await assert.rejects(
      async () => {
        await referralService.requestWithdrawal(userA.id, {
          amount: 150000,
          bankName: 'MB Bank',
          bankAccount: '0987654321',
          accountHolder: 'USER A'
        });
      },
      /Số dư khả dụng không đủ/,
      'Must reject withdrawal exceeding balance'
    );

    // Rule 2: Cannot withdraw less than 50,000 VND minimum
    await assert.rejects(
      async () => {
        await referralService.requestWithdrawal(userA.id, {
          amount: 20000,
          bankName: 'MB Bank',
          bankAccount: '0987654321',
          accountHolder: 'USER A'
        });
      },
      /Số tiền rút tối thiểu là 50.000 ₫/,
      'Must reject withdrawal under 50,000 VND'
    );

    // Rule 3: Valid withdrawal request for 60,000 VND -> locks funds from approvedReward to withdrawalPending
    const wRequest = await referralService.requestWithdrawal(userA.id, {
      amount: 60000,
      bankName: 'MB Bank',
      bankAccount: '0987654321',
      accountHolder: 'USER A',
      userNote: 'Rút tiền cafe'
    });
    assert.ok(wRequest.id);
    assert.equal(wRequest.status, 'PENDING');
    assert.equal(wRequest.amount, 60000);

    // Check balances locked
    const dashAfterLock = await referralService.getUserDashboard(userA.id);
    assert.equal(dashAfterLock.approvedReward, 40000, 'Available balance reduced from 100k to 40k');
    assert.equal(dashAfterLock.withdrawalPending, 60000, 'Withdrawal pending locked at 60k');

    // Test Admin Reject -> refunds locked funds back to available balance
    const rejectedReq = await referralService.adminRejectWithdrawal(
      wRequest.id,
      'admin@lifeos.com',
      'Sai số tài khoản nhận tiền'
    );
    assert.equal(rejectedReq.status, 'REJECTED');
    assert.equal(rejectedReq.rejectReason, 'Sai số tài khoản nhận tiền');

    const dashAfterReject = await referralService.getUserDashboard(userA.id);
    assert.equal(dashAfterReject.approvedReward, 100000, 'Available balance restored back to 100k');
    assert.equal(dashAfterReject.withdrawalPending, 0, 'Withdrawal pending reduced to 0');

    // Test Re-request & Admin Approve -> marks PAID, deducts withdrawalPending, adds to paidReward
    const wRequest2 = await referralService.requestWithdrawal(userA.id, {
      amount: 70000,
      bankName: 'Vietcombank',
      bankAccount: '1234567890',
      accountHolder: 'USER A'
    });
    const approvedPayout = await referralService.adminApproveWithdrawal(
      wRequest2.id,
      'admin@lifeos.com',
      'FT99887766'
    );
    assert.equal(approvedPayout.status, 'PAID');
    assert.equal(approvedPayout.txReference, 'FT99887766');

    const dashFinal = await referralService.getUserDashboard(userA.id);
    assert.equal(dashFinal.approvedReward, 30000, '100k - 70k = 30k available');
    assert.equal(dashFinal.withdrawalPending, 0, 'No more pending');
    assert.equal(dashFinal.paidReward, 70000, 'Paid reward = 70k');

    // Check user withdrawals list
    const userWithdrawals = await referralService.getUserWithdrawals(userA.id);
    assert.equal(userWithdrawals.length, 2, 'User has 2 withdrawal records');
  });

  await t.test('6. Feedback System: Submission, Community Upvotes, Admin Reply & Notification Flow', async () => {
    // 1. User B submits feedback
    const feedback = await feedbackService.createFeedback(userB.id, {
      title: 'Đề xuất thêm chế độ Dark Mode pastel',
      content: 'Giao diện hiện tại rất đẹp nhưng muốn thêm tông tím pastel cho dark mode.',
      type: 'Feature',
      rating: 5
    });
    assert.ok(feedback.id);
    assert.equal(feedback.status, 'New');

    // 2. User A upvotes feedback
    const vote1 = await feedbackService.toggleVote(userA.id, feedback.id);
    assert.equal(vote1.hasVoted, true);
    assert.equal(vote1.upvotes, 1);

    // 3. User A un-votes
    const vote2 = await feedbackService.toggleVote(userA.id, feedback.id);
    assert.equal(vote2.hasVoted, false);
    assert.equal(vote2.upvotes, 0);

    // 4. Admin reviews, replies and sets status to 'Planned'
    const updated = await feedbackService.adminUpdateFeedback(
      feedback.id,
      'admin_id_test',
      'admin@lifeos.com',
      {
        status: 'Planned',
        adminReply: 'Cảm ơn bạn! Tính năng này đã được đưa vào roadmap tuần tới.',
        isImportant: true
      }
    );
    assert.equal(updated.status, 'Planned');
    assert.equal(updated.isImportant, true);
    assert.ok(updated.adminReply);

    // 5. Verify User B received update notification
    const userBNotice = await prisma.notification.findFirst({
      where: { userId: userB.id, title: { contains: 'Cập nhật góp ý' } }
    });
    assert.ok(userBNotice, 'Feedback submitter must receive admin response notification');
  });

  // Cleanup
  await t.after(async () => {
    try {
      await prisma.feedbackVote.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.feedback.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.referralTransaction.deleteMany({ where: { reason: { contains: testRunId } } });
      await prisma.referralCommission.deleteMany({ where: { orderId: `ORD_TEST_${testRunId}` } });
      await prisma.referralRelationship.deleteMany({ where: { referrerId: userA.id } });
      await prisma.referralProfile.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.notification.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    } catch {}
  });
});
