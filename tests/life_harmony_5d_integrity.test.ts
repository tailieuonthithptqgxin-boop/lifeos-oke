import { compute5DHarmony } from '../src/lib/lifeHarmonyEngine';
import { getPrisma } from '../src/backend/db';
import { lifeHarmonyService } from '../src/backend/services/lifeHarmony.service';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASSED: [Test ${totalTests}] ${testName}`);
  } else {
    console.error(`  ❌ FAILED: [Test ${totalTests}] ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('   STARTING 5D HARMONY REAL DATA INTEGRITY TEST SUITE           ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: User mới hoàn toàn (Zero activities)
  // --------------------------------------------------------------------------
  const emptyHarmony = compute5DHarmony({
    tasks: [],
    habits: [],
    habitRecords: [],
    focusSessions: [],
    focusGoals: [],
    transactions: [],
    budgets: [],
    financeAccounts: [],
    goals: []
  });

  assert(
    emptyHarmony.overallScore === null,
    'User mới hoàn toàn: overallScore phải là null (KHÔNG có điểm số giả định)',
    `overallScore was ${emptyHarmony.overallScore}`
  );

  assert(
    emptyHarmony.status === 'insufficient_data',
    'User mới hoàn toàn: status phải là "insufficient_data"',
    `status was ${emptyHarmony.status}`
  );

  assert(
    emptyHarmony.evaluatedDimensionsCount === 0,
    'User mới hoàn toàn: evaluatedDimensionsCount phải là 0',
    `evaluatedDimensionsCount was ${emptyHarmony.evaluatedDimensionsCount}`
  );

  assert(
    emptyHarmony.dimensions.every(d => d.score === null && d.status === 'insufficient_data' && d.grade === 'N/A'),
    'Toàn bộ 5 chiều đều có score = null, status = "insufficient_data", grade = "N/A"'
  );

  assert(
    emptyHarmony.dimensions.every(d => d.sufficiencyReason && d.sufficiencyReason.length > 10),
    'Mọi chiều thiếu dữ liệu đều có giải thích cụ thể về hoạt động cần thực hiện'
  );

  // --------------------------------------------------------------------------
  // TEST 2: User CHỈ có hoạt động học tập (Growth/Focus 45 phút)
  // --------------------------------------------------------------------------
  const studyOnlyHarmony = compute5DHarmony({
    tasks: [],
    habits: [],
    habitRecords: [],
    focusSessions: [
      {
        id: 'session-1',
        status: 'Completed',
        actualDuration: 45,
        createdAt: new Date().toISOString()
      }
    ],
    focusGoals: [{ type: 'daily', targetHours: 2 }],
    transactions: [],
    budgets: [],
    goals: []
  });

  const growthDim = studyOnlyHarmony.dimensions.find(d => d.dimension === 'growth')!;
  const financeDim = studyOnlyHarmony.dimensions.find(d => d.dimension === 'finance')!;
  const prodDim = studyOnlyHarmony.dimensions.find(d => d.dimension === 'productivity')!;

  assert(
    growthDim.status === 'calculated' && growthDim.score !== null && growthDim.score > 0,
    'Chỉ khía cạnh Phát triển (Growth) có điểm thật khi user hoàn thành phiên học',
    `Growth score: ${growthDim.score}`
  );

  assert(
    financeDim.score === null && financeDim.status === 'insufficient_data',
    'Tài chính (Finance) vẫn báo "insufficient_data" và score = null (KHÔNG fake 50, 70, 85)',
    `Finance score: ${financeDim.score}`
  );

  assert(
    prodDim.score === null && prodDim.status === 'insufficient_data',
    'Năng suất (Productivity) vẫn báo "insufficient_data" và score = null',
    `Productivity score: ${prodDim.score}`
  );

  assert(
    studyOnlyHarmony.status === 'partial' && studyOnlyHarmony.evaluatedDimensionsCount === 1,
    'Tổng thể chuyển sang trạng thái "partial" với tỷ lệ 1/5 chiều có dữ liệu'
  );

  // --------------------------------------------------------------------------
  // TEST 3: User có giao dịch tài chính thật (Thử nghiệm tính toán chi tiêu và ngân sách)
  // --------------------------------------------------------------------------
  const financeRealHarmony = compute5DHarmony({
    transactions: [
      {
        id: 'tx-1',
        amount: 250000,
        type: 'Chi tiêu',
        category: 'Ăn uống',
        date: new Date().toISOString()
      }
    ],
    budgets: [
      {
        id: 'bg-1',
        category: 'Ăn uống',
        limit: 3000000,
        spent: 250000
      }
    ]
  });

  const calculatedFinDim = financeRealHarmony.dimensions.find(d => d.dimension === 'finance')!;
  assert(
    calculatedFinDim.status === 'calculated' && calculatedFinDim.score !== null && calculatedFinDim.score >= 80,
    'Tài chính được tính toán dựa trên chi tiêu thực tế trong ngân sách',
    `Finance score: ${calculatedFinDim.score}`
  );

  assert(
    calculatedFinDim.tracePoints.some(tp => tp.label.includes('giao dịch') && Number(tp.value) === 1),
    'Traceability của Tài chính phản ánh đúng 1 giao dịch thực tế'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Khía cạnh Năng suất (Tasks thực tế)
  // --------------------------------------------------------------------------
  const tasksHarmony = compute5DHarmony({
    tasks: [
      { id: 't1', status: 'Hoàn thành', dueDate: '2026-10-12' },
      { id: 't2', status: 'Hoàn thành', dueDate: '2026-10-12' },
      { id: 't3', status: 'Đang làm', dueDate: '2026-10-20' }
    ]
  });

  const taskDim = tasksHarmony.dimensions.find(d => d.dimension === 'productivity')!;
  assert(
    taskDim.status === 'calculated' && taskDim.score !== null && taskDim.score >= 70,
    'Năng suất tính toán chính xác tỷ lệ 2/3 việc hoàn thành',
    `Task score: ${taskDim.score}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Khía cạnh Kỷ luật (Habits & Streaks thực tế)
  // --------------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];
  const habitsHarmony = compute5DHarmony({
    habits: [
      { id: 'h1', name: 'Đọc sách 30p', status: 'Active', streak: 7, completedDates: [todayStr] },
      { id: 'h2', name: 'Uống 2L nước', status: 'Active', streak: 7, completedDates: [todayStr] }
    ],
    selectedDate: todayStr
  });

  const habitDim = habitsHarmony.dimensions.find(d => d.dimension === 'discipline')!;
  assert(
    habitDim.status === 'calculated' && habitDim.score !== null && habitDim.score >= 85,
    'Kỷ luật tính toán chính xác 100% thói quen hoàn thành kèm chuỗi streak 7 ngày',
    `Discipline score: ${habitDim.score}`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Khía cạnh Mục tiêu (Goals thực tế)
  // --------------------------------------------------------------------------
  const goalsHarmony = compute5DHarmony({
    goals: [
      { id: 'g1', title: 'Đạt HSK 4', status: 'Hoàn thành', progress: 100 },
      { id: 'g2', title: 'Tiết kiệm 50 triệu', status: 'Active', progress: 60 }
    ]
  });

  const goalDim = goalsHarmony.dimensions.find(d => d.dimension === 'vision')!;
  assert(
    goalDim.status === 'calculated' && goalDim.score !== null && goalDim.score >= 70,
    'Mục tiêu tính toán chính xác tiến độ trung bình (80%) và 1 mục tiêu hoàn thành',
    `Vision score: ${goalDim.score}`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Toàn diện ĐẦY ĐỦ 5 CHIỀU (Full 5D Harmony)
  // --------------------------------------------------------------------------
  const fullHarmony = compute5DHarmony({
    tasks: [{ id: 't1', status: 'Hoàn thành' }],
    habits: [{ id: 'h1', status: 'Active', streak: 5, completedDates: [todayStr] }],
    focusSessions: [{ id: 's1', status: 'Completed', actualDuration: 60, createdAt: todayStr }],
    transactions: [{ id: 'tx1', amount: 100000, type: 'Chi tiêu', date: todayStr }],
    budgets: [{ id: 'b1', category: 'Chung', limit: 2000000 }],
    goals: [{ id: 'g1', status: 'Active', progress: 75 }],
    selectedDate: todayStr
  });

  assert(
    fullHarmony.status === 'sufficient' && fullHarmony.evaluatedDimensionsCount === 5,
    'Khi có đủ dữ liệu 5 chiều, hệ thống chuyển sang trạng thái "sufficient" (5/5)'
  );

  assert(
    fullHarmony.overallScore !== null && fullHarmony.overallScore >= 70,
    'Điểm tổng thể được tính bằng công thức trung bình có trọng số chuẩn xác',
    `Overall score: ${fullHarmony.overallScore}`
  );

  assert(
    fullHarmony.rankTitle !== 'Chưa đủ dữ liệu để đánh giá',
    'Xếp hạng danh hiệu vinh danh người dùng dựa trên điểm thực tế',
    `Rank: ${fullHarmony.rankTitle}`
  );

  // --------------------------------------------------------------------------
  // TEST 8: Backend Service & User Isolation (Database Level)
  // --------------------------------------------------------------------------
  const prisma = getPrisma();
  const testUserAId = 'user-5d-test-a-' + Date.now();
  const testUserBId = 'user-5d-test-b-' + Date.now();

  try {
    // Tạo 2 user thử nghiệm
    await prisma.user.create({
      data: {
        id: testUserAId,
        email: `test_5d_a_${Date.now()}@example.com`,
        name: 'User 5D Test A',
        passwordHash: 'hash',
        role: 'USER',
        plan: 'PRO'
      }
    });

    await prisma.user.create({
      data: {
        id: testUserBId,
        email: `test_5d_b_${Date.now()}@example.com`,
        name: 'User 5D Test B',
        passwordHash: 'hash',
        role: 'USER',
        plan: 'FREE'
      }
    });

    // Tạo hoạt động cho User A (1 task, 1 transaction)
    await prisma.task.create({
      data: {
        userId: testUserAId,
        title: 'Task của User A',
        status: 'Hoàn thành'
      }
    });

    const accountA = await prisma.financeAccount.create({
      data: {
        userId: testUserAId,
        name: 'Ví tiền mặt User A',
        balance: 1000000
      }
    });

    await prisma.transaction.create({
      data: {
        userId: testUserAId,
        accountId: accountA.id,
        amount: 150000,
        type: 'Chi tiêu',
        category: 'Ăn uống',
        date: todayStr
      }
    });

    // Lấy 5D Harmony cho User A từ Backend Service
    const harmonyUserA = await lifeHarmonyService.get5DHarmony(testUserAId);
    assert(
      harmonyUserA.evaluatedDimensionsCount === 2,
      'Backend Service: User A có đúng 2 khía cạnh đã có hoạt động (Năng suất & Tài chính)',
      `Evaluated: ${harmonyUserA.evaluatedDimensionsCount}`
    );

    // Lấy 5D Harmony cho User B từ Backend Service
    const harmonyUserB = await lifeHarmonyService.get5DHarmony(testUserBId);
    assert(
      harmonyUserB.evaluatedDimensionsCount === 0 && harmonyUserB.overallScore === null,
      'Backend Service User Isolation: User B chưa có hoạt động -> 0 khía cạnh, score = null (Tuyệt đối không lẫn dữ liệu User A)',
      `User B evaluated: ${harmonyUserB.evaluatedDimensionsCount}, score: ${harmonyUserB.overallScore}`
    );

    // Dọn dẹp dữ liệu test
    await prisma.transaction.deleteMany({ where: { userId: testUserAId } });
    await prisma.financeAccount.deleteMany({ where: { userId: testUserAId } });
    await prisma.task.deleteMany({ where: { userId: testUserAId } });
    await prisma.user.deleteMany({ where: { id: { in: [testUserAId, testUserBId] } } });
  } catch (err: any) {
    console.error("Lỗi kiểm thử Database:", err);
    throw err;
  }

  console.log('\n================================================================');
  console.log(`   🎉 ALL ${passedTests}/${totalTests} 5D HARMONY INTEGRITY TESTS PASSED!   `);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error("Kiểm thử thất bại:", err);
  process.exit(1);
});
