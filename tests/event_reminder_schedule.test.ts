import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateTimeInUserTz,
  REMINDER_MILESTONES,
  isEntityActive
} from '../src/backend/services/notification/eventReminderEngine.js';

describe('Event & Task 4-Tier Notification Reminder Engine', () => {
  it('1. parseDateTimeInUserTz parses event time in Asia/Ho_Chi_Minh timezone accurately', () => {
    // Event at 2026-10-24 20:00 in Vietnam (UTC+7)
    // In UTC, this must equal 2026-10-24 13:00:00 UTC
    const dateUtc = parseDateTimeInUserTz('2026-10-24', '20:00', 'Asia/Ho_Chi_Minh');
    assert.ok(dateUtc, 'Date must not be null');
    assert.strictEqual(dateUtc.toISOString(), '2026-10-24T13:00:00.000Z');
  });

  it('2. Calculates exact 4 milestones (T-5h, T-3h, T-30m, T=0) matching required messages and times', () => {
    // Event starting at 20:00 (13:00 UTC)
    const startUtc = parseDateTimeInUserTz('2026-10-24', '20:00', 'Asia/Ho_Chi_Minh')!;
    const eventTitle = 'Họp Chiến Lược Q4';

    // Milestone 1: T - 5 hours
    const m5h = REMINDER_MILESTONES.find(m => m.key === 'T_MINUS_5H')!;
    const time5h = new Date(startUtc.getTime() + m5h.offsetMinutes * 60 * 1000);
    // 20:00 - 5 hours = 15:00 (08:00 UTC)
    assert.strictEqual(time5h.toISOString(), '2026-10-24T08:00:00.000Z');
    assert.strictEqual(m5h.message(eventTitle, false), 'Sự kiện sẽ bắt đầu sau 5 giờ.');

    // Milestone 2: T - 3 hours
    const m3h = REMINDER_MILESTONES.find(m => m.key === 'T_MINUS_3H')!;
    const time3h = new Date(startUtc.getTime() + m3h.offsetMinutes * 60 * 1000);
    // 20:00 - 3 hours = 17:00 (10:00 UTC)
    assert.strictEqual(time3h.toISOString(), '2026-10-24T10:00:00.000Z');
    assert.strictEqual(m3h.message(eventTitle, false), 'Sự kiện sẽ bắt đầu sau 3 giờ.');

    // Milestone 3: T - 30 minutes
    const m30m = REMINDER_MILESTONES.find(m => m.key === 'T_MINUS_30M')!;
    const time30m = new Date(startUtc.getTime() + m30m.offsetMinutes * 60 * 1000);
    // 20:00 - 30 mins = 19:30 (12:30 UTC)
    assert.strictEqual(time30m.toISOString(), '2026-10-24T12:30:00.000Z');
    assert.strictEqual(m30m.message(eventTitle, false), 'Sự kiện sẽ bắt đầu sau 30 phút.');

    // Milestone 4: T = 0
    const mZero = REMINDER_MILESTONES.find(m => m.key === 'T_ZERO')!;
    const timeZero = new Date(startUtc.getTime() + mZero.offsetMinutes * 60 * 1000);
    // 20:00 (13:00 UTC)
    assert.strictEqual(timeZero.toISOString(), '2026-10-24T13:00:00.000Z');
    assert.strictEqual(mZero.message(eventTitle, false), 'Sự kiện đã bắt đầu.');
  });

  it('3. Automatically skips milestones that have already passed when event is created', () => {
    const startUtc = parseDateTimeInUserTz('2026-10-24', '20:00', 'Asia/Ho_Chi_Minh')!;
    // Current simulated time is 16:00 Vietnam time (09:00 UTC)
    // T-5h was at 15:00 (08:00 UTC) -> already passed!
    const simulatedNow = new Date('2026-10-24T09:00:00.000Z');

    const scheduled: string[] = [];
    const skipped: string[] = [];

    for (const milestone of REMINDER_MILESTONES) {
      const scheduledFor = new Date(startUtc.getTime() + milestone.offsetMinutes * 60 * 1000);
      const cutoff = milestone.key === 'T_ZERO' ? simulatedNow.getTime() - 2 * 60 * 1000 : simulatedNow.getTime();
      if (scheduledFor.getTime() <= cutoff) {
        skipped.push(milestone.key);
      } else {
        scheduled.push(milestone.key);
      }
    }

    assert.deepStrictEqual(skipped, ['T_MINUS_5H'], 'T-5h must be skipped because 15:00 has already passed');
    assert.deepStrictEqual(scheduled, ['T_MINUS_3H', 'T_MINUS_30M', 'T_ZERO'], 'Future milestones must be scheduled');
  });

  it('4. isEntityActive returns false for completed, cancelled, or deleted items', () => {
    assert.strictEqual(isEntityActive({ status: 'Đã lên lịch' }), true);
    assert.strictEqual(isEntityActive({ status: 'Chưa làm' }), true);

    assert.strictEqual(isEntityActive({ status: 'Đã xong' }), false);
    assert.strictEqual(isEntityActive({ status: 'Đã hủy' }), false);
    assert.strictEqual(isEntityActive({ status: 'Hoàn thành' }), false);
    assert.strictEqual(isEntityActive({ status: 'Hủy' }), false);
    assert.strictEqual(isEntityActive({ status: 'Completed' }), false);
    assert.strictEqual(isEntityActive({ status: 'Cancelled' }), false);
    assert.strictEqual(isEntityActive({ status: 'Đã lên lịch', deletedAt: new Date() }), false);
  });

  it('5. Supports Task start date and due date ISO strings', () => {
    const taskTime = parseDateTimeInUserTz('2026-10-25T14:30:00', null, 'Asia/Ho_Chi_Minh');
    assert.ok(taskTime, 'Task time must parse');
    // 14:30 Vietnam (UTC+7) = 07:30 UTC
    assert.strictEqual(taskTime.toISOString(), '2026-10-25T07:30:00.000Z');

    const taskTitle = 'Nộp Báo Cáo Tài Chính';
    const m5h = REMINDER_MILESTONES.find(m => m.key === 'T_MINUS_5H')!;
    assert.strictEqual(m5h.message(taskTitle, true), 'Nhiệm vụ sẽ bắt đầu sau 5 giờ.');

    const mZero = REMINDER_MILESTONES.find(m => m.key === 'T_ZERO')!;
    assert.strictEqual(mZero.message(taskTitle, true), 'Nhiệm vụ đã bắt đầu.');
  });
});
