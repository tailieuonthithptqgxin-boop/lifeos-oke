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

  await t.test('3. Chat is always open 24/7 across all phases (FOCUS & BREAK)', () => {
    // In FOCUS phase, chat is allowed
    const validation = manager.validateChatMessage(roomId, 'user_1', 'Xin chào mọi người!');
    assert.equal(validation.allowed, true);
  });

  await t.test('4. Chat Anti-Spam Rate Limit (2s cooldown)', () => {
    // 2nd message within 2s is REJECTED with RATE_LIMITED
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

  await t.test('8. Host Permissions: Kick Member and enforce Ban list', () => {
    // Create dedicated private room with specific host
    const hostRoomId = `host-test-room-${Date.now()}`;
    manager.getOrCreateRoom(hostRoomId, {
      name: 'Phòng của Host Minh',
      topic: 'Lập trình TypeScript',
      hostId: 'host_user_1',
      isSystemRoom: false,
    });

    manager.addParticipant(hostRoomId, 'socket_host', {
      userId: 'host_user_1',
      name: 'Minh (Chủ phòng)',
      avatar: '',
      isHost: true,
    });

    manager.addParticipant(hostRoomId, 'socket_troll', {
      userId: 'troll_user_99',
      name: 'Kẻ Phá Bĩnh',
      avatar: '',
      isHost: false,
    });

    manager.addParticipant(hostRoomId, 'socket_regular', {
      userId: 'regular_user_2',
      name: 'Học Sinh Chăm Chỉ',
      avatar: '',
      isHost: false,
    });

    // Non-host regular_user_2 attempts to kick troll_user_99 -> REJECTED
    const forbiddenKick = manager.kickParticipant(hostRoomId, 'regular_user_2', 'troll_user_99', 'Spam');
    assert.equal(forbiddenKick.success, false);
    assert.match(forbiddenKick.message || '', /Chỉ Chủ phòng/);

    // Host host_user_1 kicks troll_user_99 -> SUCCESS
    const hostKick = manager.kickParticipant(hostRoomId, 'host_user_1', 'troll_user_99', 'Phá phòng');
    assert.equal(hostKick.success, true);
    assert.equal(hostKick.targetName, 'Kẻ Phá Bĩnh');
    assert.equal(hostKick.targetSocketId, 'socket_troll');

    // Verify troll_user_99 is banned and cannot rejoin
    const bannedRejoin = manager.addParticipant(hostRoomId, 'socket_troll_new', {
      userId: 'troll_user_99',
      name: 'Kẻ Phá Bĩnh Lại Vào',
      avatar: '',
      isHost: false,
    });
    assert.equal(bannedRejoin.isBanned, true);
    assert.equal(bannedRejoin.isNewUser, false);
  });

  await t.test('9. Host Permissions: Update Room Settings & Duration', () => {
    const hostRoomId = `settings-test-room-${Date.now()}`;
    manager.getOrCreateRoom(hostRoomId, {
      name: 'Phòng Toán Học 12',
      topic: 'Giải tích & Tích phân',
      hostId: 'host_user_1',
      isSystemRoom: false,
    });

    // Non-host cannot update settings
    const forbiddenUpdate = manager.updateRoomSettings(hostRoomId, 'user_impostor', {
      name: 'Hacked Room',
    });
    assert.equal(forbiddenUpdate.success, false);
    assert.match(forbiddenUpdate.message || '', /Chỉ Chủ phòng/);

    // Host updates settings
    const hostUpdate = manager.updateRoomSettings(hostRoomId, 'host_user_1', {
      name: 'Phòng Ôn Thi Chuyên Sâu 2026',
      topic: 'Toán & Lý Siêu Tốc',
      focusDuration: 50 * 60,
    });
    assert.equal(hostUpdate.success, true);
    assert.equal(hostUpdate.room?.name, 'Phòng Ôn Thi Chuyên Sâu 2026');
    assert.equal(hostUpdate.room?.topic, 'Toán & Lý Siêu Tốc');
    assert.equal(hostUpdate.room?.focusDuration, 50 * 60);

    const room = manager.getRoom(hostRoomId);
    assert.equal(room?.name, 'Phòng Ôn Thi Chuyên Sâu 2026');
    assert.equal(room?.topic, 'Toán & Lý Siêu Tốc');
    assert.equal(room?.timer.durationSeconds, 50 * 60);
  });
});
