import { getPrisma, dbService } from '../src/backend/db.js';

async function testCrossFeatureSync() {
  console.log('================================================================');
  console.log('   RUNNING CROSS-FEATURE RECONCILIATION & SYNC TESTS (14-28)    ');
  console.log('================================================================');

  const prisma = getPrisma();
  let passedCount = 0;
  const totalCount = 6;

  const testUserEmail = `cross_test_${Date.now()}@lifeos.vn`;

  // 1. Create a test user
  const user = await prisma.user.create({
    data: {
      email: testUserEmail,
      name: 'Test Cross Sync User',
      passwordHash: 'hash_test_123',
      role: 'USER',
      plan: 'FREE'
    }
  });

  try {
    // -------------------------------------------------------------
    // [Test 1] Create Account and Initial Balance
    // -------------------------------------------------------------
    console.log('\n[Test 1] Create Finance Account:');
    const account = await prisma.financeAccount.create({
      data: {
        userId: user.id,
        name: 'Tài khoản chính',
        type: 'Ngân hàng',
        balance: 5000000,
        currency: 'VND',
        color: '#10b981'
      }
    });
    if (account && account.balance === 5000000) {
      console.log(`  ✓ PASSED: Account created with balance 5,000,000 VND.`);
      passedCount++;
    } else {
      throw new Error('Test 1 Failed: Account creation failed.');
    }

    // -------------------------------------------------------------
    // [Test 2] Create Budget
    // -------------------------------------------------------------
    console.log('\n[Test 2] Create Monthly Budget:');
    const budget = await prisma.budget.create({
      data: {
        userId: user.id,
        category: 'Ăn uống',
        limit: 2000000,
        spent: 0,
        period: 'monthly'
      }
    });
    if (budget && budget.spent === 0 && budget.limit === 2000000) {
      console.log(`  ✓ PASSED: Budget created with 2,000,000 limit and 0 spent.`);
      passedCount++;
    } else {
      throw new Error('Test 2 Failed: Budget creation failed.');
    }

    // -------------------------------------------------------------
    // [Test 3] Create Expense Transaction -> Verify Atomic Account & Budget deduction
    // -------------------------------------------------------------
    console.log('\n[Test 3] Atomic Transaction Create via executeFinanceTransaction:');
    const tx = await dbService.executeFinanceTransaction(user.id, {
      type: 'Chi tiêu',
      amount: 150000,
      category: 'Ăn uống',
      accountId: account.id,
      date: new Date().toISOString().split('T')[0],
      note: '[Project: Khởi nghiệp] Ăn trưa tiếp đối tác'
    });

    const updatedAccount1 = await prisma.financeAccount.findUnique({ where: { id: account.id } });
    const updatedBudget1 = await prisma.budget.findUnique({ where: { id: budget.id } });

    if (updatedAccount1?.balance === 4850000 && updatedBudget1?.spent === 150000) {
      console.log(`  ✓ PASSED: Account balance decremented to 4,850,000 and budget spent increased to 150,000.`);
      passedCount++;
    } else {
      throw new Error(`Test 3 Failed: Account balance is ${updatedAccount1?.balance}, budget spent is ${updatedBudget1?.spent}`);
    }

    // -------------------------------------------------------------
    // [Test 4] Update Transaction via dbService.updateUserCollectionItem (Atomicity Diff)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Atomic Transaction Update (Change amount from 150k to 200k):');
    await dbService.updateUserCollectionItem('transactions', user.id, tx.id, {
      type: 'Chi tiêu',
      amount: 200000,
      category: 'Ăn uống',
      accountId: account.id,
      date: new Date().toISOString().split('T')[0],
      note: '[Project: Khởi nghiệp] Ăn trưa tiếp đối tác (update)',
      status: 'Completed'
    });

    const updatedAccount2 = await prisma.financeAccount.findUnique({ where: { id: account.id } });
    const updatedBudget2 = await prisma.budget.findUnique({ where: { id: budget.id } });

    if (updatedAccount2?.balance === 4800000 && updatedBudget2?.spent === 200000) {
      console.log(`  ✓ PASSED: Diffing reconciled account balance to 4,800,000 and budget spent to 200,000.`);
      passedCount++;
    } else {
      throw new Error(`Test 4 Failed: Account balance is ${updatedAccount2?.balance}, budget spent is ${updatedBudget2?.spent}`);
    }

    // -------------------------------------------------------------
    // [Test 5] Delete Transaction via dbService.deleteUserCollectionItem (Atomic Revert)
    // -------------------------------------------------------------
    console.log('\n[Test 5] Atomic Transaction Delete & Reversion:');
    await dbService.deleteUserCollectionItem('transactions', user.id, tx.id);

    const updatedAccount3 = await prisma.financeAccount.findUnique({ where: { id: account.id } });
    const updatedBudget3 = await prisma.budget.findUnique({ where: { id: budget.id } });

    if (updatedAccount3?.balance === 5000000 && updatedBudget3?.spent === 0) {
      console.log(`  ✓ PASSED: Account balance restored to 5,000,000 and budget spent restored to 0.`);
      passedCount++;
    } else {
      throw new Error(`Test 5 Failed: Account balance is ${updatedAccount3?.balance}, budget spent is ${updatedBudget3?.spent}`);
    }

    // -------------------------------------------------------------
    // [Test 6] Cross-Module Project Expense Linking Check
    // -------------------------------------------------------------
    console.log('\n[Test 6] Project Expense Tag Matching:');
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Khởi nghiệp',
        description: 'Dự án kinh doanh',
        status: 'In Progress',
        budget: 10000000
      }
    });

    const projTx = await dbService.executeFinanceTransaction(user.id, {
      type: 'Chi tiêu',
      amount: 500000,
      category: 'Kinh doanh',
      accountId: account.id,
      date: new Date().toISOString().split('T')[0],
      note: `[Project: ${project.name}] Mua tên miền website`
    });

    const allTx = await prisma.transaction.findMany({ where: { userId: user.id } });
    const projectExpenses = allTx
      .filter(t => t.type === 'Chi tiêu' && t.note?.includes(`[Project: ${project.name}]`))
      .reduce((sum, t) => sum + t.amount, 0);

    if (projectExpenses === 500000) {
      console.log(`  ✓ PASSED: Project expense dynamically matched from transaction tags (${projectExpenses} VND).`);
      passedCount++;
    } else {
      throw new Error(`Test 6 Failed: Calculated project expenses is ${projectExpenses}`);
    }

    console.log('\n================================================================');
    console.log(`   SUMMARY: PASSED ${passedCount}/${totalCount} TESTS SUCCESSFULLY!`);
    console.log('================================================================');

  } finally {
    // Cleanup test data
    try {
      await prisma.transaction.deleteMany({ where: { userId: user.id } });
      await prisma.budget.deleteMany({ where: { userId: user.id } });
      await prisma.financeAccount.deleteMany({ where: { userId: user.id } });
      await prisma.project.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log('Test cleanup completed cleanly.');
    } catch (e) {
      console.error('Cleanup notice:', e);
    }
  }
}

testCrossFeatureSync().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
