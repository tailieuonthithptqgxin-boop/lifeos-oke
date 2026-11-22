import test from 'node:test';
import assert from 'node:assert/strict';
import { HighScaleRoomManager } from '../src/backend/realtime/RoomManager.js';

test('HighScaleRoomManager: In-Memory scaling & Delta updates for 150+ users', async (t) => {
  const manager = HighScaleRoomManager.getInstance();
  const roomId = `test-room-${Date.now()}`;

  await t.test('1. Initialize room and verify defaults', () => {
    const room = manager.getOrCreateRoom(roomId, {
      name: 'Thư Viện Test 500 Người',
      topic: 'Kiểm thử tải bộ nhớ',
    });
    assert.equal(room.roomId, roomId);
    assert.equal(room.timer.phase, 'FOCUS');
    assert.equal(room.timer.durationSeconds, 1500);
    assert.equal(room.members.size, 0);
  });

  await t.test('2. Add 150 concurrent simulated users to In-Memory Map', () => {
    for (let i = 1; i <= 150; i++) {
      const { isNewUser, compact, activeCount } = manager.addParticipant(
        roomId,
        `socket_${i}`,
        {
          userId: `user_${i}`,
          name: `Học Sinh ${i}`,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=user_${i}`,
          studyGoal: `Giải bài tập ${i}`,
          streakDays: i % 10 + 1,
        }
      );
      assert.equal(isNewUser, true);
      assert.equal(compact.id, `user_${i}`);
      assert.equal(activeCount, i);
    }

    const room = manager.getRoom(roomId);
    assert.ok(room);
    assert.equal(room.members.size, 150);
    assert.equal(room.energy.activeStudyingCount, 150);
  });

  await t.test('3. Focus Shield: Chat is strictly dropped during FOCUS phase', () => {
    const validation = manager.validateChatMessage(roomId, 'user_1', 'Xin chào mọi người!');
    assert.equal(validation.allowed, false);
    assert.equal(validation.code, 'FOCUS_MODE_LOCKED');
  });

  await t.test('4. Break Mode & Slow Mode (1 msg / 5s)', () => {
    // Switch to BREAK phase
    manager.updateTimer(roomId, 'switch_phase', { phase: 'BREAK' });

    // 1st message is allowed
    const msg1 = manager.validateChatMessage(roomId, 'user_1', 'Giải lao rồi!');
    assert.equal(msg1.allowed, true);

    // 2nd message within 5s is REJECTED with RATE_LIMITED
    const msg2 = manager.validateChatMessage(roomId, 'user_1', 'Gửi thêm tin thứ 2');
    assert.equal(msg2.allowed, false);
    assert.equal(msg2.code, 'RATE_LIMITED');
    assert.ok(msg2.waitSeconds && msg2.waitSeconds > 0);
  });

  await t.test('5. Kudos Sliding Window Batch Buffer', (ctx, done) => {
    // 50 users send kudos
    let flushCount = 0;
    for (let i = 1; i <= 50; i++) {
      manager.bufferKudos(roomId, `user_${i}`, i % 2 === 0 ? '🔥' : '👏', (batch) => {
        flushCount++;
        assert.equal(batch.total, 50);
        assert.equal(batch.senderCount, 50);
        assert.ok(batch.breakdown['🔥'] > 0);
        assert.ok(batch.breakdown['👏'] > 0);
        done();
      });
    }
  });

  await t.test('6. Snapshot generation contains Pinned Friends (max 6) + Compact List', () => {
    const snapshot = manager.getRoomSnapshot(roomId, 'user_1');
    assert.equal(snapshot.room.id, roomId);
    assert.equal(snapshot.pinnedFriends.length, 6);
    assert.equal(snapshot.members.length, 150);
    assert.ok(snapshot.timer);
    assert.ok(snapshot.energy);
  });

  await t.test('7. Disconnect and remove participant by socket ID in O(1)', () => {
    const removed = manager.removeParticipantBySocket('socket_150');
    assert.ok(removed);
    assert.equal(removed.userId, 'user_150');
    assert.equal(removed.activeCount, 149);

    const room = manager.getRoom(roomId);
    assert.equal(room?.members.size, 149);
  });
});
