import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/cloudflare/worker';
import { onRequest as onRequestPagesFunction } from '../functions/api/[[route]]';

const mockEnv: any = {
  JWT_SECRET: 'test_jwt_secret_super_secure_32_characters_long_min',
  INITIAL_ADMIN_EMAIL: 'admin@lifeos.com',
  INITIAL_ADMIN_PASSWORD: 'Admin@123456',
  NODE_ENV: 'production',
};

const mockCtx: any = {
  waitUntil: () => {},
  passThroughOnException: () => {},
};

describe('End-to-End User Data Persistence Audit (Zero Data Loss on Reload/Exit)', () => {
  let userAToken = '';
  let userAId = '';

  test('1. Register user, create tasks/notes/habits/finance/milestones, close & reopen web -> 100% preserved!', async () => {
    // 1. Register User A
    const regRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Trúc Trương',
          email: `persist_test_${Date.now()}@example.com`,
          password: 'SafePassword@2026',
        }),
      }),
      mockEnv,
      mockCtx
    );
    assert.equal(regRes.status, 201);
    const regData: any = await regRes.json();
    userAToken = regData.token;
    userAId = regData.user.id;
    assert.ok(userAToken);

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userAToken}`,
      'X-LifeOS-User-Id': userAId,
    };

    // 2. Create 3 Tasks
    const t1Res = await worker.fetch(
      new Request('https://quanlicanhan.online/api/data/tasks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Giải đề Toán 50 câu', priority: 'Cao', status: 'Chưa làm' }),
      }),
      mockEnv,
      mockCtx
    );
    assert.equal(t1Res.status, 201);
    const t1: any = await t1Res.json();

    const t2Res = await worker.fetch(
      new Request('https://quanlicanhan.online/api/data/tasks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Ôn 30 từ vựng IELTS', priority: 'Trung bình', status: 'Chưa làm' }),
      }),
      mockEnv,
      mockCtx
    );
    const t2: any = await t2Res.json();

    const t3Res = await worker.fetch(
      new Request('https://quanlicanhan.online/api/data/tasks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Nhiệm vụ nháp cần xóa', status: 'Chưa làm' }),
      }),
      mockEnv,
      mockCtx
    );
    const t3: any = await t3Res.json();

    // 3. Complete Task 1 & Delete Task 3
    await worker.fetch(
      new Request(`https://quanlicanhan.online/api/data/tasks/${t1.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'Hoàn thành' }),
      }),
      mockEnv,
      mockCtx
    );
    await worker.fetch(
      new Request(`https://quanlicanhan.online/api/data/tasks/${t3.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      }),
      mockEnv,
      mockCtx
    );

    // 4. Create a Note & a Habit + Toggle Habit
    await worker.fetch(
      new Request('https://quanlicanhan.online/api/data/notes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Công thức đạo hàm', content: 'y = x^n => y\' = n*x^(n-1)' }),
      }),
      mockEnv,
      mockCtx
    );
    const habitRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/data/habits', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Đọc sách 20 trang', streak: 0, completedDates: [] }),
      }),
      mockEnv,
      mockCtx
    );
    const habit: any = await habitRes.json();
    await worker.fetch(
      new Request(`https://quanlicanhan.online/api/habits/${habit.id}/toggle`, {
        method: 'POST',
        headers: authHeaders,
      }),
      mockEnv,
      mockCtx
    );

    // 5. Create Finance Account & Expense Transaction (verifies auto-balance calculation)
    const accRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/data/financeAccounts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Ví chính', balance: 500000 }),
      }),
      mockEnv,
      mockCtx
    );
    const acc: any = await accRes.json();
    await worker.fetch(
      new Request('https://quanlicanhan.online/api/data/transactions', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Mua sách giải đề', amount: 120000, type: 'Expense', accountId: acc.id }),
      }),
      mockEnv,
      mockCtx
    );

    // 6. Create Journey Milestone
    await worker.fetch(
      new Request('https://quanlicanhan.online/api/journey/milestone', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Đạt 8.5 Toán thi thử', category: 'learning' }),
      }),
      mockEnv,
      mockCtx
    );

    // 7. SIMULATE EXITING & REOPENING WEB APP: Call /api/data-batch & /api/journey!
    const reopenRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/data-batch', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          collections: ['tasks', 'notes', 'habits', 'financeAccounts', 'transactions'],
        }),
      }),
      mockEnv,
      mockCtx
    );
    assert.equal(reopenRes.status, 200);
    const reopenData: any = await reopenRes.json();

    assert.equal(reopenData.success, true);
    assert.equal(reopenData.isColdEdgeVault, false);
    assert.equal(reopenData.data.tasks.length, 2, '2 tasks must remain after reopening web');
    assert.equal(reopenData.data.tasks[0].title, 'Giải đề Toán 50 câu');
    assert.equal(reopenData.data.tasks[0].status, 'Hoàn thành', 'Task completion status must persist');
    assert.equal(reopenData.data.tasks[1].id, t2.id);
    assert.equal(reopenData.data.notes.length, 1, 'Note must persist');
    assert.equal(reopenData.data.habits.length, 1, 'Habit must persist');
    assert.equal(reopenData.data.habits[0].streak, 1, 'Toggled habit streak must persist');
    assert.equal(reopenData.data.financeAccounts[0].balance, 380000, 'Account balance (500k - 120k) must persist');
    assert.equal(reopenData.data.transactions.length, 1, 'Transaction must persist');

    const journeyRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/journey', { headers: authHeaders }),
      mockEnv,
      mockCtx
    );
    const journeyData: any = await journeyRes.json();
    assert.equal(journeyData.milestones.length, 1, 'Journey milestone must persist');
    assert.equal(journeyData.milestones[0].title, 'Đạt 8.5 Toán thi thử');
  });

  test('2. Cold Edge isolate with clientSnapshot seeds server instead of wiping local browser tasks', async () => {
    const coldUserId = `cold_user_${Date.now()}`;
    const res = await worker.fetch(
      new Request('https://quanlicanhan.online/api/data-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LifeOS-User-Id': coldUserId },
        body: JSON.stringify({
          collections: ['tasks', 'notes'],
          userId: coldUserId,
          clientSnapshot: {
            tasks: [{ id: 'local_1', title: 'Nhiệm vụ lưu trong máy người dùng', status: 'Chưa làm' }],
            notes: [{ id: 'note_1', title: 'Ghi chú quan trọng' }],
          },
        }),
      }),
      mockEnv,
      mockCtx
    );
    const body: any = await res.json();
    assert.equal(body.data.tasks.length, 1, 'Cold Edge isolate must hydrate from clientSnapshot, NEVER return []!');
    assert.equal(body.data.tasks[0].title, 'Nhiệm vụ lưu trong máy người dùng');
    assert.equal(body.data.notes.length, 1);
  });

  test('3. Strict Per-User Isolation: Another user cannot see User A tasks', async () => {
    const otherRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/data-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LifeOS-User-Id': 'completely_different_user_999' },
        body: JSON.stringify({ collections: ['tasks', 'notes'] }),
      }),
      mockEnv,
      mockCtx
    );
    const otherData: any = await otherRes.json();
    assert.equal(otherData.data.tasks.length, 0);
    assert.equal(otherData.data.notes.length, 0);
  });

  test('4. Pages Functions gateway (functions/api/[[route]].ts) also persists tasks across reload', async () => {
    const pagesUserId = `pages_user_${Date.now()}`;
    await onRequestPagesFunction({
      request: new Request('https://quanlicanhan.online/api/data/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LifeOS-User-Id': pagesUserId },
        body: JSON.stringify({ title: 'Task qua Pages Function', status: 'Chưa làm' }),
      }),
      env: mockEnv,
      waitUntil: () => {},
      next: async () => new Response('next', { status: 404 }),
    } as any);

    const getRes = await onRequestPagesFunction({
      request: new Request('https://quanlicanhan.online/api/data-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LifeOS-User-Id': pagesUserId },
        body: JSON.stringify({ collections: ['tasks'] }),
      }),
      env: mockEnv,
      waitUntil: () => {},
      next: async () => new Response('next', { status: 404 }),
    } as any);
    const getBody: any = await getRes.json();
    assert.equal(getBody.data.tasks.length, 1);
    assert.equal(getBody.data.tasks[0].title, 'Task qua Pages Function');
  });
});
