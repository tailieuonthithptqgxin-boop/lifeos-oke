import { describe, it, after } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

describe('LifeOS Production Core Test Suite', () => {
  let userACookie = '';
  let userAToken = '';
  let userAId = '';
  let userATaskId = '';
  let userAAccountId = '';

  let userBCookie = '';
  let userBToken = '';
  let userBId = '';

  const testEmailA = `test_user_a_${Date.now()}@lifeos.local`;
  const testEmailB = `test_user_b_${Date.now()}@lifeos.local`;
  const testPassword = 'SecurePassword123!';

  it('1. Health check returns 200 OK and database connected', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.strictEqual(res.status, 200, 'Health check must return 200');
    const data = await res.json();
    assert.strictEqual(data.status, 'ok', 'Status must be ok');
    assert.strictEqual(data.database, 'connected', 'Database must be connected');
  });

  it('2. Readiness check returns 200 ready', async () => {
    const res = await fetch(`${BASE_URL}/ready`);
    assert.strictEqual(res.status, 200, 'Readiness probe must return 200');
    const data = await res.json();
    assert.strictEqual(data.status, 'ready');
  });

  it('3. User A registration succeeds and sets HttpOnly cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Alpha',
        email: testEmailA,
        password: testPassword
      })
    });

    assert.strictEqual(res.status, 201, 'Registration must return 201 Created');
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('token='), 'Must set session cookie');
    userACookie = setCookie.split(';')[0];

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.user && data.user.id);
    assert.strictEqual(data.user.email, testEmailA);
    assert.strictEqual(data.user.role, 'USER');
    assert.strictEqual(data.user.plan, 'FREE');
    userAId = data.user.id;
    userAToken = data.token;
  });

  it('4. User A verifies session via /api/auth/me using cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Cookie': userACookie
      }
    });

    assert.strictEqual(res.status, 200, '/api/auth/me with cookie must return 200');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.id, userAId);
  });

  it('5. User A creates a task and finance account', async () => {
    // Create Task
    const taskRes = await fetch(`${BASE_URL}/api/data/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        title: 'Báo cáo tài chính quý 3',
        priority: 'Cao',
        status: 'Chưa làm',
        estimatedHours: 3
      })
    });
    assert.strictEqual(taskRes.status, 201, 'Task creation must return 201');
    const task = await taskRes.json();
    assert.ok(task.id);
    userATaskId = task.id;

    // Create Finance Account
    const accRes = await fetch(`${BASE_URL}/api/data/financeAccounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        name: 'Tài khoản Tiết kiệm A',
        balance: 10000000,
        currency: 'VND'
      })
    });
    assert.strictEqual(accRes.status, 201, 'Finance account creation must return 201');
    const acc = await accRes.json();
    assert.ok(acc.id);
    userAAccountId = acc.id;
  });

  it('6. User B registers successfully', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User Beta',
        email: testEmailB,
        password: testPassword
      })
    });

    assert.strictEqual(res.status, 201);
    const setCookie = res.headers.get('set-cookie');
    userBCookie = setCookie.split(';')[0];
    const data = await res.json();
    userBId = data.user.id;
    userBToken = data.token;
  });

  it('7. SECURITY TEST: User B CANNOT read, update, or delete User A data (User Isolation)', async () => {
    // User B tries to read User A's tasks collection
    const bTasksRes = await fetch(`${BASE_URL}/api/data/tasks`, {
      headers: { 'Cookie': userBCookie }
    });
    const bTasks = await bTasksRes.json();
    const leakedTask = bTasks.find(t => t.id === userATaskId);
    assert.strictEqual(leakedTask, undefined, 'User B must not see User A task in collection');

    // User B tries to directly GET /api/data/tasks/:userATaskId (if route existed) or UPDATE it
    const updateRes = await fetch(`${BASE_URL}/api/data/tasks/${userATaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userBCookie
      },
      body: JSON.stringify({
        title: 'Hacked by User B'
      })
    });
    assert.ok(
      updateRes.status === 400 || updateRes.status === 403 || updateRes.status === 404,
      'User B modifying User A task must fail with 400, 403, or 404'
    );

    // User B tries to delete User A task
    const deleteRes = await fetch(`${BASE_URL}/api/data/tasks/${userATaskId}`, {
      method: 'DELETE',
      headers: { 'Cookie': userBCookie }
    });
    assert.ok(
      deleteRes.status === 400 || deleteRes.status === 403 || deleteRes.status === 404,
      'User B deleting User A task must fail'
    );
  });

  it('8. Finance Transaction updates balance atomically', async () => {
    const txRes = await fetch(`${BASE_URL}/api/finance/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        accountId: userAAccountId,
        amount: 500000,
        type: 'Chi tiêu',
        category: 'Ăn uống',
        date: new Date().toISOString().split('T')[0],
        note: 'Bữa trưa công việc'
      })
    });

    assert.strictEqual(txRes.status, 200, 'Finance transaction must succeed with 200');
    const txData = await txRes.json();
    assert.strictEqual(txData.success, true);
    assert.strictEqual(txData.transaction.amount, 500000);

    // Check updated account balance
    const accountsRes = await fetch(`${BASE_URL}/api/data/financeAccounts`, {
      headers: { 'Cookie': userACookie }
    });
    const accounts = await accountsRes.json();
    const updatedAcc = accounts.find(a => a.id === userAAccountId);
    assert.ok(updatedAcc);
    assert.strictEqual(updatedAcc.balance, 9500000, 'Account balance must be 10,000,000 - 500,000 = 9,500,000');
  });

  it('9. Today Engine aggregates tasks, events, and habits without AI', async () => {
    const res = await fetch(`${BASE_URL}/api/today`, {
      headers: { 'Cookie': userACookie }
    });

    assert.strictEqual(res.status, 200, 'Today engine must return 200');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.summary, 'Summary must exist');
    assert.ok(Array.isArray(data.tasks.mustDo), 'mustDo tasks array must exist');
  });

  it('10. Logout invalidates database session', async () => {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(logoutRes.status, 200, 'Logout must succeed');

    // /api/auth/me with old cookie must now be rejected with 401
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(meRes.status, 401, 'Request with logged out session cookie must return 401');
  });

  after(async () => {
    try {
      const { getPrisma } = await import('../src/backend/db.js');
      const prisma = getPrisma();
      if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
      if (userBId) await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
    } catch (e) {}
  });
});
