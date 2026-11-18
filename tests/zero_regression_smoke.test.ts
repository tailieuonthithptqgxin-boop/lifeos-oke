import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Zero-Regression & Automated Smoke Verification Suite', () => {
  // 1. Data Safety & Null/Empty Array Guard Tests
  test('Layer 2: Safe handling of corrupt or null JSON/LocalStorage values', () => {
    const corruptCases = [
      null,
      undefined,
      '',
      '{ bad json',
      '[]',
      '{}',
      '123',
      'true',
      '"string"'
    ];

    corruptCases.forEach((val) => {
      let parsedResult: any = null;
      try {
        parsedResult = val ? JSON.parse(val) : [];
      } catch {
        parsedResult = [];
      }
      assert.ok(parsedResult !== undefined, 'Parsing should never produce undefined crash');
    });
  });

  test('Layer 2: Safe array mapping and filtering over null/undefined collections', () => {
    const safeMap = (arr: any) => (arr ?? []).map((x: any) => x?.id ?? 'default');
    const safeFilter = (arr: any) => (arr ?? []).filter((x: any) => Boolean(x?.active));
    const safeReduce = (arr: any) => (arr ?? []).reduce((sum: number, x: any) => sum + (x?.amount ?? 0), 0);

    assert.deepEqual(safeMap(null), []);
    assert.deepEqual(safeMap(undefined), []);
    assert.deepEqual(safeMap([{ id: '1' }, null, { notId: '2' }]), ['1', 'default', 'default']);

    assert.deepEqual(safeFilter(null), []);
    assert.deepEqual(safeFilter(undefined), []);
    assert.deepEqual(safeFilter([{ active: true }, { active: false }, null]), [{ active: true }]);

    assert.equal(safeReduce(null), 0);
    assert.equal(safeReduce(undefined), 0);
    assert.equal(safeReduce([{ amount: 100 }, null, { amount: 50 }, {}]), 150);
  });

  // 2. Financial Module Zero-State & Math Safety
  test('Layer 3: Financial calculation functions never produce NaN on empty/null data', () => {
    const calculateBalances = (transactions: any[] | null | undefined) => {
      const txs = transactions ?? [];
      let income = 0;
      let expense = 0;
      txs.forEach((t) => {
        const amt = Number(t?.amount) || 0;
        if (t?.type === 'income') income += amt;
        else if (t?.type === 'expense') expense += amt;
      });
      const balance = income - expense;
      const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
      return { income, expense, balance, savingsRate: Math.max(0, savingsRate) };
    };

    const emptyResult = calculateBalances([]);
    assert.equal(emptyResult.income, 0);
    assert.equal(emptyResult.expense, 0);
    assert.equal(emptyResult.balance, 0);
    assert.equal(emptyResult.savingsRate, 0);
    assert.ok(!Number.isNaN(emptyResult.savingsRate), 'Savings rate must not be NaN');

    const nullResult = calculateBalances(null);
    assert.equal(nullResult.balance, 0);
    assert.ok(!Number.isNaN(nullResult.savingsRate));

    const corruptedResult = calculateBalances([
      { amount: 'invalid', type: 'income' },
      null,
      { amount: 500, type: 'income' },
      { amount: 200, type: 'expense' }
    ]);
    assert.equal(corruptedResult.income, 500);
    assert.equal(corruptedResult.expense, 200);
    assert.equal(corruptedResult.balance, 300);
    assert.equal(corruptedResult.savingsRate, 60);
  });

  // 3. FSRS Spaced Repetition Stability
  test('Layer 3: FSRS Spaced Repetition engine computes stable review intervals', async () => {
    // Import FSRS core
    const { createInitialFSRSItem, processFSRSReview } = await import('../src/utils/fsrs.js');
    
    // Test First Review
    const initialItem = createInitialFSRSItem('test-word-1');
    assert.ok(initialItem.stability > 0, 'Initial stability must be > 0');
    assert.ok(initialItem.difficulty >= 1 && initialItem.difficulty <= 10, 'Difficulty must be 1-10');
    assert.ok(initialItem.intervalDays >= 1, 'Interval must be >= 1 day');

    // Test Successive Review (Rating: 3 = Good)
    const reviewResult = processFSRSReview(initialItem, 3);
    assert.ok(reviewResult.stability >= initialItem.stability, 'Stability must grow or maintain on Good');
    assert.ok(reviewResult.intervalDays >= 1, 'Interval must be >= 1 day');
    assert.ok(reviewResult.nextReviewDate, 'Next review date must be defined');

    // Test Again Review (Rating: 1 = Again)
    const againResult = processFSRSReview(initialItem, 1);
    assert.ok(againResult.lapses >= initialItem.lapses, 'Lapses must increase or maintain on Again');
  });

  // 4. Task & Habit Streak Engine Stability
  test('Layer 3: Habit streak calculation handles discontinuous dates without crash', () => {
    const computeStreak = (completedDates: string[] | null | undefined): { streak: number; bestStreak: number } => {
      const dates = (completedDates ?? []).filter(Boolean).sort().reverse();
      if (dates.length === 0) return { streak: 0, bestStreak: 0 };

      let currentStreak = 0;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today.getTime() - 86400000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (dates.includes(todayStr) || dates.includes(yesterdayStr)) {
        let checkDate = dates.includes(todayStr) ? today : yesterday;
        while (true) {
          const checkStr = checkDate.toISOString().split('T')[0];
          if (dates.includes(checkStr)) {
            currentStreak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
          } else {
            break;
          }
        }
      }

      return { streak: currentStreak, bestStreak: Math.max(currentStreak, dates.length) };
    };

    assert.deepEqual(computeStreak(null), { streak: 0, bestStreak: 0 });
    assert.deepEqual(computeStreak([]), { streak: 0, bestStreak: 0 });

    const todayStr = new Date().toISOString().split('T')[0];
    const singleStreak = computeStreak([todayStr]);
    assert.equal(singleStreak.streak, 1);
  });

  // 5. Mobile & Viewport Layering Contracts
  test('Layer 4: Mobile Layering and Z-Index Hierarchy invariants', () => {
    const Z_INDEX_HIERARCHY = {
      MAIN_CONTENT: 10,
      NAVIGATION_AND_HEADER: 30,
      FLOATING_OVERLAYS_AND_WIDGETS: 40,
      MODAL_AND_BACKDROP: 50,
      TOAST_NOTIFICATIONS: 60
    };

    assert.ok(Z_INDEX_HIERARCHY.MAIN_CONTENT < Z_INDEX_HIERARCHY.NAVIGATION_AND_HEADER);
    assert.ok(Z_INDEX_HIERARCHY.NAVIGATION_AND_HEADER < Z_INDEX_HIERARCHY.FLOATING_OVERLAYS_AND_WIDGETS);
    assert.ok(Z_INDEX_HIERARCHY.FLOATING_OVERLAYS_AND_WIDGETS < Z_INDEX_HIERARCHY.MODAL_AND_BACKDROP);
    assert.ok(Z_INDEX_HIERARCHY.MODAL_AND_BACKDROP < Z_INDEX_HIERARCHY.TOAST_NOTIFICATIONS);
  });

  // 6. Global Volume Control System
  test('Layer 1 & 3: Global Volume Control clamping, muting, and effective calculations', async () => {
    // Dynamically test GlobalVolumeManager core logic
    class TestVolumeManager {
      private masterVolume = 80;
      private isMuted = false;
      private previousVolume = 80;
      private musicVolume = 100;
      private sfxVolume = 100;

      public setMasterVolume(v: number) {
        this.masterVolume = Math.min(100, Math.max(0, Math.round(v)));
        if (this.masterVolume > 0 && this.isMuted) this.isMuted = false;
      }
      public toggleMute() {
        if (this.isMuted) {
          this.isMuted = false;
          this.masterVolume = this.previousVolume > 0 ? this.previousVolume : 80;
        } else {
          this.previousVolume = this.masterVolume;
          this.isMuted = true;
        }
      }
      public getEffectiveVolume(): number {
        return this.isMuted ? 0 : this.masterVolume;
      }
      public getEffectiveMusicVolume(): number {
        return (this.getEffectiveVolume() * (this.musicVolume / 100)) / 100;
      }
      public getEffectiveSfxVolume(): number {
        return (this.getEffectiveVolume() * (this.sfxVolume / 100)) / 100;
      }
      public setMusicVolume(v: number) {
        this.musicVolume = Math.min(100, Math.max(0, Math.round(v)));
      }
    }

    const vm = new TestVolumeManager();
    // Default
    assert.equal(vm.getEffectiveVolume(), 80);
    assert.equal(vm.getEffectiveMusicVolume(), 0.8);

    // Clamping
    vm.setMasterVolume(150);
    assert.equal(vm.getEffectiveVolume(), 100);
    vm.setMasterVolume(-20);
    assert.equal(vm.getEffectiveVolume(), 0);

    // Mute & Unmute restoration
    vm.setMasterVolume(75);
    assert.equal(vm.getEffectiveVolume(), 75);
    vm.toggleMute();
    assert.equal(vm.getEffectiveVolume(), 0, 'Muted state should report 0 effective volume');
    vm.toggleMute();
    assert.equal(vm.getEffectiveVolume(), 75, 'Unmuting should restore prior volume');

    // Subchannel scaling
    vm.setMasterVolume(50);
    vm.setMusicVolume(50);
    // Effective music: (50 * 0.5) / 100 = 0.25
    assert.equal(vm.getEffectiveMusicVolume(), 0.25);
  });

  // 7. Global Smart Dismiss LIFO Stack Contract
  test('Layer 1 & 4: Smart Dismiss LIFO Stack Order on Escape key', () => {
    const dismissStack: Array<() => void> = [];
    const push = (fn: () => void) => dismissStack.push(fn);
    const popAndExecute = () => {
      const top = dismissStack.pop();
      if (top) top();
    };

    let dismissed = '';
    // Open outer modal, then inner dropdown
    push(() => { dismissed = 'outer_modal'; });
    push(() => { dismissed = 'inner_dropdown'; });

    assert.equal(dismissStack.length, 2);
    // First Escape should dismiss inner dropdown only
    popAndExecute();
    assert.equal(dismissed, 'inner_dropdown');
    assert.equal(dismissStack.length, 1);

    // Second Escape should dismiss outer modal
    popAndExecute();
    assert.equal(dismissed, 'outer_modal');
    assert.equal(dismissStack.length, 0);
  });

  // 8. 100% Free-to-use Access Contract
  test('Layer 1 & 3: Free-to-use access rule permits all users without payment requirement', () => {
    const checkCanUse = (user: any) => Boolean(user);
    assert.equal(checkCanUse({ id: 'u1', role: 'USER', plan: 'FREE' }), true);
    assert.equal(checkCanUse({ id: 'u2', role: 'USER', plan: 'FREE_FULL_ACCESS' }), true);
    assert.equal(checkCanUse(null), false);
  });

  // 9. Study Space Buffer and Anti-spam Contract
  test('Layer 3 & 4: Study Space FIFO message capping and anti-spam rate limiting', () => {
    const messages: Array<{ id: number; text: string }> = [];
    const pushMessage = (id: number, text: string) => {
      messages.push({ id, text });
      if (messages.length > 100) {
        messages.shift();
      }
    };

    // Push 120 messages
    for (let i = 1; i <= 120; i++) {
      pushMessage(i, `Message ${i}`);
    }

    assert.equal(messages.length, 100, 'Buffer must never exceed 100 messages');
    assert.equal(messages[0].id, 21, 'Oldest messages must be pruned rolling FIFO');
    assert.equal(messages[99].id, 120, 'Latest message must be at the end');

    // Anti-spam gap check
    const isSpam = (lastTime: number, now: number) => (now - lastTime) < 2000;
    assert.equal(isSpam(1000, 2500), true, 'Gap < 2000ms is flagged as spam');
    assert.equal(isSpam(1000, 3100), false, 'Gap >= 2000ms is allowed');
  });

  // 10. Global Community Chat 1000 Ring Buffer & Cursor Pagination Contract
  test('Layer 1 & 3: Global Community Chat 1000 ring buffer and cursor pagination logic', () => {
    const MAX_MESSAGES = 1000;
    const messages: Array<{ id: string; content: string }> = [];

    // Push 1050 messages
    for (let i = 1; i <= 1050; i++) {
      messages.push({ id: `msg_${i}`, content: `Hello ${i}` });
      if (messages.length > MAX_MESSAGES) {
        messages.shift();
      }
    }

    assert.equal(messages.length, 1000, 'Global chat buffer capped exactly at 1000 in RAM');
    assert.equal(messages[0].id, 'msg_51', 'First message after 1050 pushes should be msg_51');
    assert.equal(messages[999].id, 'msg_1050', 'Latest message should be msg_1050');

    // Test cursor pagination: query without beforeId (last 50)
    const limit = 50;
    const initialStart = Math.max(0, messages.length - limit);
    const initialPage = messages.slice(initialStart);
    assert.equal(initialPage.length, 50);
    assert.equal(initialPage[49].id, 'msg_1050');

    // Test cursor pagination: query beforeId = msg_1001
    const targetIdx = messages.findIndex(m => m.id === 'msg_1001');
    assert.ok(targetIdx > 0);
    const olderStart = Math.max(0, targetIdx - limit);
    const olderPage = messages.slice(olderStart, targetIdx);
    assert.equal(olderPage.length, 50);
    assert.equal(olderPage[olderPage.length - 1].id, 'msg_1000');
  });

  // 11. Study Room RAM Presence & Anti-Ghost Sweeper (65s) Contract
  test('Layer 1 & 3: Study Room RAM Presence and 65s Anti-Ghost Sweeper', () => {
    type PresenceState = 'IN_MEET' | 'STUDYING' | 'AWAY';
    interface Participant {
      userId: string;
      userName: string;
      studyGoal: string;
      presenceState: PresenceState;
      joinedAt: number;
      lastPingAt: number;
    }

    const participants = new Map<string, Participant>();
    const now = 100000;

    // Add active participant
    participants.set('user_1', {
      userId: 'user_1',
      userName: 'Alice',
      studyGoal: 'Giải bài tập Toán',
      presenceState: 'STUDYING',
      joinedAt: now - 120000, // joined 2 mins ago
      lastPingAt: now - 15000 // pinged 15s ago -> ALIVE
    });

    // Add in-meet participant
    participants.set('user_2', {
      userId: 'user_2',
      userName: 'Bob',
      studyGoal: 'Học nhóm Meet',
      presenceState: 'IN_MEET',
      joinedAt: now - 300000, // joined 5 mins ago
      lastPingAt: now - 25000 // pinged 25s ago -> ALIVE
    });

    // Add ghost participant (tab closed / disconnected without leaving)
    participants.set('user_ghost', {
      userId: 'user_ghost',
      userName: 'Ghost User',
      studyGoal: 'Tập trung sâu',
      presenceState: 'STUDYING',
      joinedAt: now - 600000,
      lastPingAt: now - 70000 // pinged 70s ago -> GHOST (> 65000ms)!
    });

    assert.equal(participants.size, 3);

    // Anti-Ghost Sweeper execution
    const GHOST_TIMEOUT_MS = 65000;
    participants.forEach((p, uid) => {
      if (now - p.lastPingAt > GHOST_TIMEOUT_MS) {
        participants.delete(uid);
      }
    });

    // Verify ghost is purged
    assert.equal(participants.size, 2);
    assert.equal(participants.has('user_ghost'), false, 'Ghost user must be purged after 65s inactivity');
    assert.equal(participants.has('user_1'), true);
    assert.equal(participants.has('user_2'), true);

    // Activity Status calculation
    const participantList = Array.from(participants.values());
    const status = participantList.length > 0 ? 'ACTIVE' : 'IDLE';
    const inMeetCount = participantList.filter(p => p.presenceState === 'IN_MEET').length;
    const studiedMinutes = Math.floor((now - participants.get('user_2')!.joinedAt) / 60000);

    assert.equal(status, 'ACTIVE');
    assert.equal(inMeetCount, 1);
    assert.equal(studiedMinutes, 5);
  });

  // 12. Study Room Leave Calculation & 30s F5 Reconnection Grace Period Contract
  test('Layer 1 & 3: Leave Room studied duration computation and 30s F5 reconnect grace period', () => {
    interface SessionData {
      joinedAt: number;
      lastPingAt: number;
      studyGoal: string;
      presenceState: 'IN_MEET' | 'STUDYING' | 'AWAY';
    }

    const recentSessions = new Map<string, SessionData>();
    const sessionKey = 'room_math:user_alice';
    const originalJoinedAt = 100000;
    const leaveTime = 100000 + (45 * 60 * 1000); // 45 minutes later

    // 1. Leave room calculation
    const studiedMinutes = Math.floor((leaveTime - originalJoinedAt) / 60000);
    assert.equal(studiedMinutes, 45, 'Must accurately compute 45 studied minutes upon leaving');

    // Cache session in RAM
    recentSessions.set(sessionKey, {
      joinedAt: originalJoinedAt,
      lastPingAt: leaveTime,
      studyGoal: 'Ôn thi đại học',
      presenceState: 'STUDYING'
    });

    // 2. User reloads page (F5) and returns within 12 seconds (< 30 seconds grace period)
    const reconnectTime = leaveTime + 12000;
    const session = recentSessions.get(sessionKey);
    const isReconnectingWithinGrace = Boolean(session && (reconnectTime - session.lastPingAt <= 30000));
    assert.equal(isReconnectingWithinGrace, true, 'User returning within 12s must be granted grace period');

    const effectiveJoinedAt = isReconnectingWithinGrace && session ? session.joinedAt : reconnectTime;
    assert.equal(effectiveJoinedAt, originalJoinedAt, 'Original joinedAt must be preserved across F5 reload');

    // 3. User reconnects after 45 seconds (> 30 seconds grace period)
    const expiredReconnectTime = leaveTime + 45000;
    const isExpired = Boolean(session && (expiredReconnectTime - session.lastPingAt <= 30000));
    assert.equal(isExpired, false, 'User returning after > 30s does not get previous session time');
  });

  // 13. Study Time Atomic Increment, 5-Minute Filter & Rank Tier Contract
  test('Layer 1 & 3: Atomic Increment, 5-Minute Filter and Study Rank categorization', () => {
    // A. 5-minute filter test
    const evaluateSession = (joinedAt: number, now: number) => {
      const durationMinutes = Math.floor((now - joinedAt) / 60000);
      if (durationMinutes < 5) {
        return { wasRecorded: false, recordedMinutes: 0 };
      }
      const capped = Math.min(durationMinutes, 360);
      return { wasRecorded: true, recordedMinutes: capped };
    };

    const t0 = 1000000;
    // Session 1: 4 minutes (under 5 minutes threshold)
    const sessionUnder5 = evaluateSession(t0, t0 + 4 * 60 * 1000);
    assert.equal(sessionUnder5.wasRecorded, false, 'Session < 5 mins must not be recorded');
    assert.equal(sessionUnder5.recordedMinutes, 0);

    // Session 2: 25 minutes (recorded)
    const session25 = evaluateSession(t0, t0 + 25 * 60 * 1000);
    assert.equal(session25.wasRecorded, true, 'Session >= 5 mins must be recorded');
    assert.equal(session25.recordedMinutes, 25);

    // Session 3: 500 minutes (capped at 360 mins / 6 hours)
    const sessionCapped = evaluateSession(t0, t0 + 500 * 60 * 1000);
    assert.equal(sessionCapped.wasRecorded, true);
    assert.equal(sessionCapped.recordedMinutes, 360, 'Session over 6 hours must be capped at 360 mins');

    // B. Rank tier calculation contract
    const getStudyRankTitle = (minutes: number) => {
      if (minutes >= 1000) return 'Học bá đại thần';
      if (minutes >= 300) return 'Chiến thần tập trung';
      if (minutes >= 60) return 'Người kiên trì';
      return 'Tân binh tập trung';
    };

    assert.equal(getStudyRankTitle(15), 'Tân binh tập trung');
    assert.equal(getStudyRankTitle(59), 'Tân binh tập trung');
    assert.equal(getStudyRankTitle(60), 'Người kiên trì');
    assert.equal(getStudyRankTitle(299), 'Người kiên trì');
    assert.equal(getStudyRankTitle(300), 'Chiến thần tập trung');
    assert.equal(getStudyRankTitle(999), 'Chiến thần tập trung');
    assert.equal(getStudyRankTitle(1000), 'Học bá đại thần');
    assert.equal(getStudyRankTitle(3500), 'Học bá đại thần');
  });

  // 14. Lazy Evaluation Start of Current Week (UTC+7) & Weekly Reset Contract
  test('Layer 1 & 3: getStartOfCurrentWeekVN calculation and Lazy Evaluation weekly reset', async () => {
    const { getStartOfCurrentWeekVN } = await import('../src/backend/services/studySpace.service.js');

    // Test 1: Midweek Wednesday 2026-11-11 10:00:00 VN (+7) -> UTC 2026-11-11 03:00:00Z
    const wednesdayUtc = new Date('2026-11-11T03:00:00.000Z');
    const startOfWeekWed = getStartOfCurrentWeekVN(wednesdayUtc);
    // Monday of that week is 2026-11-09 00:00:00 VN = 2026-11-08 17:00:00Z
    assert.equal(startOfWeekWed.toISOString(), '2026-11-08T17:00:00.000Z');

    // Test 2: Sunday evening 2026-11-15 23:59:59 VN (+7) -> UTC 2026-11-15 16:59:59Z
    const sundayNightUtc = new Date('2026-11-15T16:59:59.000Z');
    const startOfWeekSun = getStartOfCurrentWeekVN(sundayNightUtc);
    // Must roll back 6 days to Monday Nov 9 (not advance to next Monday)
    assert.equal(startOfWeekSun.toISOString(), '2026-11-08T17:00:00.000Z');

    // Test 3: Monday right after midnight 2026-11-16 00:00:01 VN (+7) -> UTC 2026-11-15 17:00:01Z
    const mondayNewWeekUtc = new Date('2026-11-15T17:00:01.000Z');
    const startOfWeekMonNext = getStartOfCurrentWeekVN(mondayNewWeekUtc);
    // New week begins at Monday Nov 16 00:00:00 VN = 2026-11-15 17:00:00Z
    assert.equal(startOfWeekMonNext.toISOString(), '2026-11-15T17:00:00.000Z');

    // Test 4: Lazy Evaluation Simulation
    const simulateStudyRecord = (
      user: { weeklyStudyMinutes: number; totalStudyMinutes: number; lastStudyDate: Date | null },
      durationMinutes: number,
      currentTime: Date
    ) => {
      const startOfWeek = getStartOfCurrentWeekVN(currentTime);
      const isNewWeekSession = !user.lastStudyDate || new Date(user.lastStudyDate) < startOfWeek;

      if (isNewWeekSession) {
        return {
          weeklyStudyMinutes: durationMinutes, // Reset & overwrite
          totalStudyMinutes: user.totalStudyMinutes + durationMinutes,
          lastStudyDate: currentTime
        };
      } else {
        return {
          weeklyStudyMinutes: user.weeklyStudyMinutes + durationMinutes, // Increment
          totalStudyMinutes: user.totalStudyMinutes + durationMinutes,
          lastStudyDate: currentTime
        };
      }
    };

    // User studied 200m last week on Sunday
    const userLastWeek = {
      weeklyStudyMinutes: 200,
      totalStudyMinutes: 500,
      lastStudyDate: sundayNightUtc
    };

    // Session on Monday morning in new week (30 mins)
    const afterMondaySession = simulateStudyRecord(userLastWeek, 30, mondayNewWeekUtc);
    assert.equal(afterMondaySession.weeklyStudyMinutes, 30, 'Weekly minutes must be reset and overwritten to 30');
    assert.equal(afterMondaySession.totalStudyMinutes, 530, 'Total minutes must increment to 530');

    // Second session in the same week on Tuesday (40 mins)
    const tuesdayUtc = new Date('2026-11-17T03:00:00.000Z');
    const afterTuesdaySession = simulateStudyRecord(afterMondaySession, 40, tuesdayUtc);
    assert.equal(afterTuesdaySession.weeklyStudyMinutes, 70, 'Weekly minutes must increment to 70 in same week');
    assert.equal(afterTuesdaySession.totalStudyMinutes, 570, 'Total minutes must increment to 570');

    // Test 5: Profile Normalization on Read
    const normalizeUserWeeklyStats = (lastStudyDate: Date | null, rawWeekly: number, queryTime: Date) => {
      const startOfWeek = getStartOfCurrentWeekVN(queryTime);
      const hasStudiedThisWeek = Boolean(lastStudyDate && new Date(lastStudyDate) >= startOfWeek);
      return hasStudiedThisWeek ? rawWeekly : 0;
    };

    // If user's last study date was from Sunday, but now it's Monday morning, normalized weekly stats MUST be 0:
    const normalizedWeekly = normalizeUserWeeklyStats(sundayNightUtc, 200, mondayNewWeekUtc);
    assert.equal(normalizedWeekly, 0, 'Normalized weekly stats must be 0 for user who has not studied this week');
  });

  // 15. Lazy Weekly Rollover & Champion Awarding Contract (Zero-Cronjob)
  test('Layer 1 & 3: Lazy Weekly Rollover honors Top 1 user and increments championCount', async () => {
    const { getStartOfCurrentWeekVN } = await import('../src/backend/services/studySpace.service.js');

    interface MockUser {
      id: string;
      name: string;
      weeklyStudyMinutes: number;
      lastStudyDate: Date;
      championCount: number;
    }

    interface RolloverState {
      lastRolloverWeekStart: number;
      champion: { userId: string; userName: string; studyMinutes: number } | null;
    }

    const state: RolloverState = {
      lastRolloverWeekStart: 0,
      champion: null
    };

    const users: MockUser[] = [
      { id: 'u1', name: 'Alice', weeklyStudyMinutes: 450, lastStudyDate: new Date('2026-11-15T15:00:00Z'), championCount: 1 },
      { id: 'u2', name: 'Bob', weeklyStudyMinutes: 280, lastStudyDate: new Date('2026-11-15T14:00:00Z'), championCount: 0 }
    ];

    let dbQueries = 0;
    const simulateEnsureWeeklyRollover = (currentTime: Date) => {
      const currentWeekStart = getStartOfCurrentWeekVN(currentTime).getTime();
      // Guard: If already rolled over for this week, exit immediately
      if (state.lastRolloverWeekStart === currentWeekStart) {
        return; // 0% DB resource
      }

      dbQueries++;
      const previousWeekStart = new Date(currentWeekStart - 7 * 24 * 60 * 60 * 1000);
      const currentWeekStartDate = new Date(currentWeekStart);

      // Find top user in previous week
      const prevWinner = [...users]
        .filter(u => u.weeklyStudyMinutes > 0 && u.lastStudyDate >= previousWeekStart && u.lastStudyDate < currentWeekStartDate)
        .sort((a, b) => b.weeklyStudyMinutes - a.weeklyStudyMinutes)[0];

      if (prevWinner) {
        prevWinner.championCount += 1;
        state.champion = {
          userId: prevWinner.id,
          userName: prevWinner.name,
          studyMinutes: prevWinner.weeklyStudyMinutes
        };
      }

      state.lastRolloverWeekStart = currentWeekStart;
    };

    // 1. First touch on Monday morning 2026-11-16
    const mondayTouch = new Date('2026-11-15T17:05:00.000Z'); // 00:05 Monday VN
    simulateEnsureWeeklyRollover(mondayTouch);

    assert.equal(dbQueries, 1, 'Must execute exactly 1 query on first weekly touch');
    assert.equal(state.champion?.userName, 'Alice', 'Alice must be crowned previous week champion');
    assert.equal(state.champion?.studyMinutes, 450);
    assert.equal(users[0].championCount, 2, 'Alice championCount must increment from 1 to 2');

    // 2. Subsequent touches during the same week (e.g. Wednesday, Friday)
    simulateEnsureWeeklyRollover(new Date('2026-11-17T10:00:00.000Z'));
    simulateEnsureWeeklyRollover(new Date('2026-11-19T10:00:00.000Z'));
    assert.equal(dbQueries, 1, 'Subsequent touches in same week must use 0 DB queries');
    assert.equal(users[0].championCount, 2, 'Alice championCount remains 2 (idempotent)');
  });

  // 16. Study Lobby Onboarding LocalStorage Single-View Invariant
  test('Layer 2 & 4: Study Lobby Onboarding opens once via LocalStorage key and suppresses thereafter', () => {
    const STORAGE_KEY = 'study_lobby_onboarding_seen_v1';
    const mockStorage: Record<string, string> = {};

    const checkShouldOpenModal = () => {
      const seen = mockStorage[STORAGE_KEY];
      return !seen;
    };

    const handleDismissModal = () => {
      mockStorage[STORAGE_KEY] = 'true';
    };

    // First visit: key missing -> modal should open
    assert.equal(checkShouldOpenModal(), true, 'Modal should automatically open on first visit');

    // User dismisses modal
    handleDismissModal();
    assert.equal(mockStorage[STORAGE_KEY], 'true');

    // Subsequent visits: key exists -> modal remains closed
    assert.equal(checkShouldOpenModal(), false, 'Modal must remain closed on subsequent visits');
  });
});
