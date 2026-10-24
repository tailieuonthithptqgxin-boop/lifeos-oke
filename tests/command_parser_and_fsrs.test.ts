import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../src/utils/commandParser';
import {
  calculateRetrievability,
  calculateInterval,
  createInitialFSRSItem,
  processFSRSReview,
  convertSM2ToFSRS
} from '../src/utils/fsrs';

test('Regex Command Parser: accurately parses task with all attributes', () => {
  const input = "Họp nhóm đồ án @mai 20:00 #quan-trong !cao ~45m";
  const parsed = parseCommand(input);

  assert.equal(parsed.title, "Họp nhóm đồ án");
  assert.equal(parsed.dueTime, "20:00");
  assert.ok(parsed.dueDisplay?.includes("Ngày mai lúc 20:00"));
  assert.deepEqual(parsed.tags, ["quan-trong"]);
  assert.equal(parsed.energy, "deep_work");
  assert.equal(parsed.energyDisplay?.label, "Deep Work");
  assert.equal(parsed.durationMinutes, 45);
  assert.equal(parsed.durationDisplay, "45m");
  assert.equal(parsed.hasSpecialTokens, true);
});

test('Regex Command Parser: parses quick win and duration in hours', () => {
  const input = "Đóng tiền nhà trọ tháng này !quick ~1.5h #tai-chinh";
  const parsed = parseCommand(input);

  assert.equal(parsed.title, "Đóng tiền nhà trọ tháng này");
  assert.equal(parsed.energy, "quick_win");
  assert.deepEqual(parsed.tags, ["tai-chinh"]);
  assert.equal(parsed.durationMinutes, 90);
  assert.equal(parsed.durationDisplay, "1h 30m");
});

test('Regex Command Parser: parses low battery and day of week @t6', () => {
  const input = "Dọn dẹp bàn học và tài liệu @t6 !thap";
  const parsed = parseCommand(input);

  assert.equal(parsed.title, "Dọn dẹp bàn học và tài liệu");
  assert.equal(parsed.energy, "low_battery");
  assert.ok(parsed.dueDisplay?.includes("T6"));
});

test('FSRS Algorithm: retrievability calculation matches retention curve', () => {
  const stability = 10; // 10 days
  // At t = 0, R = 1.0
  assert.equal(calculateRetrievability(stability, 0), 1.0);

  // At t = S (10 days), R should be exactly 0.90
  const rAtS = calculateRetrievability(stability, 10);
  assert.ok(Math.abs(rAtS - 0.90) < 0.01, `R at S should be ~0.90, got ${rAtS}`);

  // At t = 20 days, R should be lower than 0.90
  const rAt20 = calculateRetrievability(stability, 20);
  assert.ok(rAt20 < 0.85 && rAt20 > 0.75, `R at 20 should be ~0.81, got ${rAt20}`);
});

test('FSRS Algorithm: reviews properly scale stability and difficulty', () => {
  const item = createInitialFSRSItem('vocab_1');
  assert.equal(item.reps, 0);

  // First review with rating 3 (Good)
  const firstReview = processFSRSReview(item, 3);
  assert.equal(firstReview.reps, 1);
  assert.ok(firstReview.stability >= 3.0, 'First Good review stability should be >= 3.0');
  assert.ok(firstReview.intervalDays >= 3, 'First Good interval should be >= 3 days');

  // Second review after some time with rating 4 (Easy)
  const secondItem = {
    ...item,
    ...firstReview,
    lastReviewDate: new Date(Date.now() - 3 * 86400000).toISOString()
  };
  const secondReview = processFSRSReview(secondItem, 4);
  assert.equal(secondReview.reps, 2);
  assert.ok(secondReview.stability > firstReview.stability, 'Stability should increase after Easy recall');
  assert.ok(secondReview.intervalDays > firstReview.intervalDays, 'Interval should expand');
});

test('FSRS Algorithm: seamlessly converts SM-2 progress to FSRS', () => {
  const fsrsItem = convertSM2ToFSRS('word_oxford_1', 2.5, 6, 3);
  assert.equal(fsrsItem.id, 'word_oxford_1');
  assert.equal(fsrsItem.reps, 3);
  assert.ok(fsrsItem.stability >= 6);
  assert.ok(fsrsItem.difficulty >= 1.0 && fsrsItem.difficulty <= 10.0);
});
