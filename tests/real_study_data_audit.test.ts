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

describe('100% Real Study Data & Edge Schema Audit (Zero Fake Data)', () => {
  test('1. Leaving study room after 15 seconds MUST return 0 recordedMinutes, wasRecorded=false, 0 XP (Never +25m!)', async () => {
    // Check in to room-dalat-rain
    const checkinReq = new Request('https://quanlicanhan.online/api/study-space/rooms/room-dalat-rain/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_15s_test',
        userName: 'Trúc Trương',
        goal: 'Giải bài tập & Làm đề',
      }),
    });
    const checkinRes = await worker.fetch(checkinReq, mockEnv, mockCtx);
    assert.equal(checkinRes.status, 200);

    // Leave right away (simulating 15s client elapsed, while server joinedAt was <1s ago)
    const leaveReq = new Request('https://quanlicanhan.online/api/study-space/rooms/room-dalat-rain/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_15s_test',
        userName: 'Trúc Trương',
        elapsedSeconds: 15,
        roomName: 'Góc Cafe Mưa Đà Lạt',
      }),
    });
    const leaveRes = await worker.fetch(leaveReq, mockEnv, mockCtx);
    assert.equal(leaveRes.status, 200);
    const data: any = await leaveRes.json();

    assert.equal(data.success, true);
    assert.equal(data.studiedMinutes, 0, '15s session must be 0 minutes, never 25!');
    assert.equal(data.recordedMinutes, 0, '15s session must record 0 minutes');
    assert.equal(data.wasRecorded, false, 'Sessions under 60s must NOT be recorded');
    assert.equal(data.xpEarned, 0, 'Sessions under 60s must earn 0 XP');
  });

  test('2. Spoofing 1500s client timer right after joining MUST be clamped by server real joinedAt', async () => {
    await worker.fetch(
      new Request('https://quanlicanhan.online/api/study-space/rooms/room-dalat-rain/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user_spoof_test', userName: 'Tester', goal: 'Test' }),
      }),
      mockEnv,
      mockCtx
    );

    const leaveRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/study-space/rooms/room-dalat-rain/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user_spoof_test', elapsedSeconds: 1500 }),
      }),
      mockEnv,
      mockCtx
    );
    const data: any = await leaveRes.json();
    assert.equal(data.wasRecorded, false);
    assert.equal(data.recordedMinutes, 0);
  });

  test('3. Cold-start isolate recovery with 125 real seconds records exact 2 minutes & updates real leaderboard/profile', async () => {
    const leaveRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/study-space/rooms/room-sprint-prep/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_real_2m',
          userName: 'Học Viên Thật',
          elapsedSeconds: 125,
        }),
      }),
      mockEnv,
      mockCtx
    );
    const data: any = await leaveRes.json();
    assert.equal(data.wasRecorded, true);
    assert.equal(data.studiedMinutes, 2);
    assert.equal(data.recordedMinutes, 2);
    assert.equal(data.xpEarned, 4);
    assert.equal(data.streakDays, 1);

    const lbRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/study-space/leaderboard'),
      mockEnv,
      mockCtx
    );
    const lbData: any = await lbRes.json();
    assert.equal(lbData.topWeekly.length, 1);
    assert.equal(lbData.topWeekly[0].minutes, 2);
    assert.equal(lbData.topWeekly[0].name, 'Học Viên Thật');
  });

  test('4. Connect profile & Progression endpoints return 0-start real stats and valid equipped.frame object', async () => {
    const profRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/connect/profile/me'),
      mockEnv,
      mockCtx
    );
    const profData: any = await profRes.json();
    assert.equal(profData.profile.totalStudyMinutes, 0, 'Must never hardcode 120 fake minutes');
    assert.equal(profData.profile.weeklyStudyMinutes, 0, 'Must never hardcode 60 fake minutes');
    assert.equal(profData.profile.championCount, 0, 'Must never hardcode 1 fake champion');

    const progRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/progression'),
      mockEnv,
      mockCtx
    );
    const progData: any = await progRes.json();
    assert.equal(progData.success, true);
    assert.equal(Array.isArray(progData.data), false, 'Progression data must be an object, never []');
    assert.equal(progData.data.equipped.frame, 'default');
    assert.equal(progData.data.totalXp, 0);

    const rpgRes = await worker.fetch(
      new Request('https://quanlicanhan.online/api/rpg/character'),
      mockEnv,
      mockCtx
    );
    const rpgData: any = await rpgRes.json();
    assert.equal(rpgData.success, true);
    assert.equal(typeof rpgData.data.combatPower, 'number');
    assert.equal(typeof rpgData.data.hp.max, 'number');
    assert.equal(typeof rpgData.data.stats.power, 'number');
    assert.ok(rpgData.data.statBreakdown.tasksContribution);
  });

  test('5. Pages Function fallback /api/study-space/rooms/:id/leave also enforces strict 60s rule', async () => {
    const pagesRes = await onRequestPagesFunction({
      request: new Request('https://quanlicanhan.online/api/study-space/rooms/room-dalat-rain/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elapsedSeconds: 15 }),
      }),
      env: mockEnv,
      next: async () => new Response('next', { status: 404 }),
    } as any);
    const pagesData: any = await pagesRes.json();
    assert.equal(pagesData.recordedMinutes, 0);
    assert.equal(pagesData.wasRecorded, false);
  });
});
