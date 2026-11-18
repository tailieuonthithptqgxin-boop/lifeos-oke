import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { 
  normalizeUserStats, 
  calculateNextStreak, 
  computeBadgeLevel, 
  getLocalDateKey,
  recordUserActivity,
  GLOBAL_SYNC_EVENT
} from '../../src/lib/globalUserSync';

// Mock localStorage and window in node environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, val: string) { this.store[key] = String(val); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;
(globalThis as any).fetch = async () => new Response(JSON.stringify({ success: true }), {
  status: 200,
  headers: { 'content-type': 'application/json' }
});

describe('Cross-Module Data Sync & Zero Hardcoded Data Suite', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('Standard 2: New user profile starts strictly from 0 with Zero Fake Data', () => {
    const rawUser = { id: 'u_new_123', name: 'Nguyễn Văn A' };
    const normalized = normalizeUserStats(rawUser);

    assert.equal(normalized.streakDays, 0, 'New user streak must start at 0');
    assert.equal(normalized.totalStudyMinutes, 0, 'New user totalStudyMinutes must start at 0');
    assert.equal(normalized.todayStudyMinutes, 0, 'New user todayStudyMinutes must start at 0');
    assert.equal(normalized.commissionBalance, 0, 'New user commissionBalance must start at 0');
    assert.equal(normalized.referredCount, 0, 'New user referredCount must start at 0');
    assert.equal(normalized.badgeLevel, 'Tân Binh', 'New user badge level must be Tân Binh');
  });

  test('Standard 1: calculateNextStreak handles consecutive days vs skipped days accurately in GMT+7', () => {
    const today = getLocalDateKey();
    
    // First activity ever: initializes streak to 1
    const firstDay = calculateNextStreak(0, null, today);
    assert.equal(firstDay.newStreak, 1);
    assert.equal(firstDay.newLastActiveDate, today);
    assert.equal(firstDay.isStreakIncremented, true);

    // Same day repeat: preserves streak without duplicate increment
    const sameDay = calculateNextStreak(1, today, today);
    assert.equal(sameDay.newStreak, 1);
    assert.equal(sameDay.isStreakIncremented, false);

    // Consecutive next day: increments streak by 1
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateKey(yesterday);

    const nextDay = calculateNextStreak(1, yesterdayStr, today);
    assert.equal(nextDay.newStreak, 2);
    assert.equal(nextDay.isStreakIncremented, true);

    // Broken streak (>1 day gap): resets to 1
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = getLocalDateKey(threeDaysAgo);

    const broken = calculateNextStreak(5, threeDaysAgoStr, today);
    assert.equal(broken.newStreak, 1);
    assert.equal(broken.isStreakIncremented, true);
  });

  test('Standard 1: computeBadgeLevel upgrades dynamically based on genuine study minutes and streak', () => {
    assert.equal(computeBadgeLevel(0, 0), 'Tân Binh');
    assert.equal(computeBadgeLevel(6, 120), 'Tân Binh');
    assert.equal(computeBadgeLevel(7, 0), 'Chiến Binh');
    assert.equal(computeBadgeLevel(0, 300), 'Chiến Binh');
    assert.equal(computeBadgeLevel(30, 0), 'Ngôi Sao');
    assert.equal(computeBadgeLevel(0, 1800), 'Ngôi Sao');
  });

  test('Standard 1: recordUserActivity updates user streak, study minutes, and persists immediately', () => {
    const initialUser = {
      id: 'u_sync_test',
      name: 'Học Viên Pro',
      streakDays: 0,
      totalStudyMinutes: 0,
      todayStudyMinutes: 0
    };
    mockStorage.setItem('lifeos_user', JSON.stringify(initialUser));

    // Record 25 minutes of Focus Pomodoro
    const updatedUser = recordUserActivity('focus', 25);
    assert.equal(updatedUser.streakDays, 1);
    assert.equal(updatedUser.totalStudyMinutes, 25);
    assert.equal(updatedUser.todayStudyMinutes, 25);

    // Verify localStorage persistence
    const saved = JSON.parse(mockStorage.getItem('lifeos_user') || '{}');
    assert.equal(saved.streakDays, 1);
    assert.equal(saved.totalStudyMinutes, 25);
  });
});
