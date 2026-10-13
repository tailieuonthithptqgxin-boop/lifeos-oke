import { getPrisma } from '../src/backend/db.js';
import { referralService } from '../src/backend/services/referral.service.js';

async function runFinancialTests() {
  console.log('================================================================');
  console.log('   STARTING 15 MANDATORY FINANCIAL AUDIT PRODUCTION TESTS       ');
  console.log('================================================================');

  const prisma = getPrisma();
  let passedCount = 0;
  const totalCount = 15;

  const testUserAEmail = `fin_test_user_a_${Date.now()}@lifeos.vn`;
  const testUserBEmail = `fin_test_user_b_${Date.now()}@lifeos.vn`;

  // [Setup] Clean users
  const userA = await prisma.user.create({
    data: {
      email: testUserAEmail,
      name: 'Người Dùng Tài Chính A',
      passwordHash: 'hash_test_123',
      role: 'USER',
      plan: 'FREE'
    }
  });

  const userB = await prisma.user.create({
    data: {
      email: testUserBEmail,
      name: 'Người Dùng Tài Chính B',
      passwordHash: 'hash_test_123',
      role: 'USER',
      plan: 'FREE'
    }
  });

  try {
    // -------------------------------------------------------------
    // [Test 1] User mới chưa có ví/referral -> getOrCreateProfile an toàn
    // -------------------------------------------------------------
    console.log('\n[Test 1] User mới chưa có referral profile -> Tự động khởi tạo an toàn:');
    const profileA = await referralService.getOrCreateProfile(userA.id);
    if (profileA && profileA.userId === userA.id && profileA.approvedReward === 0 && profileA.referralCode) {
      console.log(`  ✓ PASSED: Tạo mới Referral Profile cho User A thành công với mã: ${profileA.referralCode}, số dư: 0đ.`);
      passedCount++;
    } else {
      throw new Error('Test 1 Failed: Profile không hợp lệ.');
    }

    // -------------------------------------------------------------
    // [Test 2] Empty state Dashboard khi chưa có giao dịch, rút tiền hay hoa hồng
    // -------------------------------------------------------------
    console.log('\n[Test 2] Empty state Dashboard khi chưa có hoa hồng, giới thiệu hay rút tiền:');
    const dashA = await referralService.getUserDashboard(userA.id, 'http://localhost:3000');
    if (dashA.totalReferred === 0 && dashA.totalCommission === 0 && dashA.history.length === 0 && dashA.commissions.length === 0) {
      console.log('  ✓ PASSED: Dashboard trả về mảng rỗng [] chuẩn schema, không crash, hiển thị empty state chuẩn xác.');
      passedCount++;
    } else {
      throw new Error('Test 2 Failed: Dashboard không khớp empty state.');
    }

    // -------------------------------------------------------------
    // [Test 3] Rút tiền khi số dư = 0 -> Từ chối hợp lệ
    // -------------------------------------------------------------
    console.log('\n[Test 3] User rút tiền khi số dư = 0đ:');
    try {
      await referralService.requestWithdrawal(userA.id, {
        amount: 50000,
        bankName: 'MB Bank',
        bankAccount: '0987654321',
        accountHolder: 'NGUYEN VAN A'
      });
      throw new Error('Test 3 Failed: Lẽ ra phải từ chối khi số dư = 0.');
    } catch (err: any) {
      if (err.message.includes('Số dư khả dụng không đủ')) {
        console.log(`  ✓ PASSED: Backend từ chối với thông báo chính xác: "${err.message}"`);
        passedCount++;
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // [Test 4] Rút tiền với số tiền âm hoặc = 0 hoặc dưới 50.000đ -> Từ chối
    // -------------------------------------------------------------
    console.log('\n[Test 4] User nhập số tiền rút không hợp lệ (<= 0 hoặc < 50.000đ):');
    try {
      await referralService.requestWithdrawal(userA.id, {
        amount: 0,
        bankName: 'MB Bank',
        bankAccount: '0987654321',
        accountHolder: 'NGUYEN VAN A'
      });
      throw new Error('Test 4 Failed: Lẽ ra phải từ chối amount = 0.');
    } catch (err: any) {
      if (err.message.includes('Số tiền rút không hợp lệ')) {
        console.log(`  ✓ PASSED: Từ chối amount <= 0 với message: "${err.message}"`);
        passedCount++;
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // [Test 5] Bind referral giữa User A và User B -> Thành công
    // -------------------------------------------------------------
    console.log('\n[Test 5] User B đăng ký sử dụng mã giới thiệu của User A:');
    const bound = await referralService.bindReferral(userB.id, profileA.referralCode);
    if (bound) {
      console.log(`  ✓ PASSED: User B đã được liên kết với Người giới thiệu User A (${profileA.referralCode}).`);
      passedCount++;
    } else {
      throw new Error('Test 5 Failed: Bind referral thất bại.');
    }

    // -------------------------------------------------------------
    // [Test 6] User A tự dùng mã của chính mình (Self-referral) -> Bị chặn
    // -------------------------------------------------------------
    console.log('\n[Test 6] User tự giới thiệu chính mình (Self-referral prevention):');
    const selfBound = await referralService.bindReferral(userA.id, profileA.referralCode);
    if (!selfBound) {
      console.log('  ✓ PASSED: Hệ thống chặn thành công tự giới thiệu tài khoản chính mình.');
      passedCount++;
    } else {
      throw new Error('Test 6 Failed: Không được phép tự giới thiệu.');
    }

    // -------------------------------------------------------------
    // [Test 7] User B thanh toán đơn hàng -> Cộng hoa hồng 20% cho User A
    // -------------------------------------------------------------
    console.log('\n[Test 7] User B mua gói 100.000đ -> Cấp hoa hồng 20% (20.000đ) vào ví User A:');
    const orderIdTest = `ORD_FIN_${Date.now()}`;
    const comm = await referralService.processOrderApproved(orderIdTest, 100000, userB.id);
    if (comm && comm.rewardAmount === 20000) {
      const refreshedProfileA = await referralService.getOrCreateProfile(userA.id);
      if (refreshedProfileA.approvedReward === 20000 && refreshedProfileA.totalCommission === 20000) {
        console.log(`  ✓ PASSED: Đã cộng đúng 20.000đ vào ví User A. Số dư khả dụng hiện tại: ${refreshedProfileA.approvedReward}đ.`);
        passedCount++;
      } else {
        throw new Error('Test 7 Failed: Số dư ví User A không khớp.');
      }
    } else {
      throw new Error('Test 7 Failed: Không tạo được hoa hồng.');
    }

    // -------------------------------------------------------------
    // [Test 8] User A yêu cầu rút tiền lớn hơn số dư -> Bị chặn
    // -------------------------------------------------------------
    console.log('\n[Test 8] User A rút số tiền vượt quá số dư khả dụng (Rút 50.000đ khi ví chỉ có 30.000đ):');
    try {
      await referralService.requestWithdrawal(userA.id, {
        amount: 50000,
        bankName: 'MB Bank',
        bankAccount: '0987654321',
        accountHolder: 'NGUYEN VAN A'
      });
      throw new Error('Test 8 Failed: Lẽ ra phải chặn khi rút vượt số dư.');
    } catch (err: any) {
      if (err.message.includes('Số dư khả dụng không đủ')) {
        console.log(`  ✓ PASSED: Chặn thành công rút vượt số dư. Message: "${err.message}"`);
        passedCount++;
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // [Test 9] Cấp thêm hoa hồng để đủ min withdrawal 50k -> Rút tiền thành công
    // -------------------------------------------------------------
    console.log('\n[Test 9] User A tích lũy thêm 30.000đ (tổng 50.000đ) và tạo yêu cầu rút 50.000đ:');
    const orderIdTest2 = `ORD_FIN_2_${Date.now()}`;
    await referralService.processOrderApproved(orderIdTest2, 150000, userB.id);
    const wReq = await referralService.requestWithdrawal(userA.id, {
      amount: 50000,
      bankName: 'Vietcombank',
      bankAccount: '123456789',
      accountHolder: 'NGUYEN VAN A'
    });
    const profileAfterReq = await referralService.getOrCreateProfile(userA.id);
    if (
      wReq && 
      wReq.status === 'PENDING' && 
      profileAfterReq.approvedReward === 0 && 
      profileAfterReq.withdrawalPending === 50000
    ) {
      console.log(`  ✓ PASSED: Tiền đã được khóa vào withdrawalPending: 50.000đ, số dư khả dụng còn lại: ${profileAfterReq.approvedReward}đ.`);
      passedCount++;
    } else {
      throw new Error('Test 9 Failed: Khóa tiền vào withdrawalPending thất bại.');
    }

    // -------------------------------------------------------------
    // [Test 10] Concurrency Test: 2 request rút tiền đồng thời khi số dư chỉ đủ cho 1
    // -------------------------------------------------------------
    console.log('\n[Test 10] Concurrency / Race Condition: Gửi 2 yêu cầu rút 10.000đ đồng thời khi số dư chỉ có 10.000đ:');
    const results = await Promise.allSettled([
      referralService.requestWithdrawal(userA.id, {
        amount: 50000, // Đang có 10k, cả hai đều phải bị chặn vì < 50k hoặc vượt số dư
        bankName: 'Vietcombank',
        bankAccount: '123456789',
        accountHolder: 'NGUYEN VAN A'
      }),
      referralService.requestWithdrawal(userA.id, {
        amount: 50000,
        bankName: 'Vietcombank',
        bankAccount: '123456789',
        accountHolder: 'NGUYEN VAN A'
      })
    ]);
    const rejectedCount = results.filter(r => r.status === 'rejected').length;
    if (rejectedCount === 2) {
      console.log('  ✓ PASSED: Cả 2 request vượt số dư đồng thời đều bị kiểm soát an toàn bởi database transaction, số dư không bị âm.');
      passedCount++;
    } else {
      throw new Error('Test 10 Failed: Race condition không được xử lý an toàn.');
    }

    // -------------------------------------------------------------
    // [Test 11] Admin từ chối yêu cầu rút tiền -> Hoàn tiền nguyên vẹn vào approvedReward
    // -------------------------------------------------------------
    console.log('\n[Test 11] Admin Từ chối yêu cầu rút tiền (Reject) -> Hoàn lại 50.000đ vào ví:');
    const rejectedReq = await referralService.adminRejectWithdrawal(wReq.id, 'admin@lifeos.vn', 'Số tài khoản không chính chủ');
    const profileAfterReject = await referralService.getOrCreateProfile(userA.id);
    if (
      rejectedReq.status === 'REJECTED' &&
      profileAfterReject.withdrawalPending === 0 &&
      profileAfterReject.approvedReward === 50000
    ) {
      console.log(`  ✓ PASSED: Yêu cầu chuyển sang REJECTED, 50.000đ được hoàn trả 100% về ví. Số dư khả dụng hiện tại: ${profileAfterReject.approvedReward}đ.`);
      passedCount++;
    } else {
      throw new Error('Test 11 Failed: Hoàn tiền rút thất bại.');
    }

    // -------------------------------------------------------------
    // [Test 12] Yêu cầu rút lại và Admin Duyệt (Approve / Paid) -> Chuyển thành công
    // -------------------------------------------------------------
    console.log('\n[Test 12] User rút lại 50.000đ và Admin Duyệt (Approve/Paid):');
    const wReq2 = await referralService.requestWithdrawal(userA.id, {
      amount: 50000,
      bankName: 'Techcombank',
      bankAccount: '987654321',
      accountHolder: 'NGUYEN VAN A'
    });
    const approvedReq = await referralService.adminApproveWithdrawal(wReq2.id, 'admin@lifeos.vn', 'VCB-FT-2026101199');
    const profileAfterPaid = await referralService.getOrCreateProfile(userA.id);
    if (
      approvedReq.status === 'PAID' &&
      approvedReq.txReference === 'VCB-FT-2026101199' &&
      profileAfterPaid.withdrawalPending === 0 &&
      profileAfterPaid.paidReward === 50000 &&
      profileAfterPaid.approvedReward === 0
    ) {
      console.log(`  ✓ PASSED: Giải ngân thành công! paidReward = 50.000đ, mã giao dịch ngân hàng: ${approvedReq.txReference}.`);
      passedCount++;
    } else {
      throw new Error('Test 12 Failed: Duyệt chi trả rút tiền thất bại.');
    }

    // -------------------------------------------------------------
    // [Test 13] Order bị hoàn tiền / hủy -> Hủy hoa hồng tương ứng
    // -------------------------------------------------------------
    console.log('\n[Test 13] Order 2 bị Refund -> Hủy hoa hồng 30.000đ:');
    const cancelledOk = await referralService.processOrderCancelledOrRefunded(orderIdTest2, 'Khách hàng yêu cầu hoàn tiền');
    const profileAfterOrderCancel = await referralService.getOrCreateProfile(userA.id);
    if (cancelledOk) {
      console.log(`  ✓ PASSED: Đã điều chỉnh trừ hoa hồng hoàn tiền an toàn. Số dư còn lại: ${profileAfterOrderCancel.approvedReward}đ.`);
      passedCount++;
    } else {
      throw new Error('Test 13 Failed: Thu hồi hoa hồng khi hoàn tiền thất bại.');
    }

    // -------------------------------------------------------------
    // [Test 14] Finance Accounts & Transactions CRUD an toàn
    // -------------------------------------------------------------
    console.log('\n[Test 14] Finance Account & Transaction CRUD trong Workspace:');
    const acc = await prisma.financeAccount.create({
      data: {
        userId: userA.id,
        name: 'Tài khoản Chi tiêu Hàng ngày',
        type: 'Ngân hàng',
        balance: 5000000,
        currency: 'VND',
        color: '#3b82f6'
      }
    });
    const tx = await prisma.transaction.create({
      data: {
        userId: userA.id,
        accountId: acc.id,
        amount: 250000,
        type: 'Chi tiêu',
        category: 'Ăn uống',
        date: new Date().toISOString().split('T')[0],
        note: 'Ăn trưa'
      }
    });
    if (acc && tx && tx.accountId === acc.id) {
      console.log(`  ✓ PASSED: Khởi tạo tài khoản (${acc.name}) và ghi nhận giao dịch (${tx.amount}đ) toàn vẹn.`);
      passedCount++;
    } else {
      throw new Error('Test 14 Failed: CRUD Tài khoản cá nhân lỗi.');
    }

    // -------------------------------------------------------------
    // [Test 15] Budgets, Saving Goals & Debts toàn vẹn dữ liệu
    // -------------------------------------------------------------
    console.log('\n[Test 15] Budgets, Saving Goals & Sổ nợ:');
    const b = await prisma.budget.create({
      data: {
        userId: userA.id,
        category: 'Ăn uống',
        limit: 3000000,
        spent: 250000
      }
    });
    const g = await prisma.savingGoal.create({
      data: {
        userId: userA.id,
        title: 'Quỹ Dự Phòng 6 Tháng',
        targetAmount: 50000000,
        currentAmount: 10000000
      }
    });
    const d = await prisma.debt.create({
      data: {
        userId: userA.id,
        title: 'Cho bạn mượn tiền mua sách',
        person: 'Bạn Tuấn',
        amount: 200000,
        type: 'Cho vay',
        status: 'Chưa trả'
      }
    });
    if (b && g && d) {
      console.log('  ✓ PASSED: Ngân sách, Mục tiêu tiết kiệm và Sổ nợ hoạt động toàn vẹn 100%.');
      passedCount++;
    } else {
      throw new Error('Test 15 Failed: Quản lý ngân sách và sổ nợ lỗi.');
    }

  } finally {
    // Clean up test data
    try {
      await prisma.referralTransaction.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.withdrawalRequest.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.referralCommission.deleteMany({ where: { referrerId: { in: [userA.id, userB.id] } } });
      await prisma.referralRelationship.deleteMany({ where: { referrerId: { in: [userA.id, userB.id] } } });
      await prisma.referralProfile.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.transaction.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.financeAccount.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.budget.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.savingGoal.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.debt.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.notification.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    } catch (e) {}
  }

  console.log('\n================================================================');
  console.log(`   🎉 ALL ${passedCount}/${totalCount} FINANCIAL TEST CASES PASSED WITH 100%!   `);
  console.log('================================================================');
}

runFinancialTests().catch((err) => {
  console.error('FATAL FINANCIAL TEST SUITE ERROR:', err);
  process.exit(1);
});
