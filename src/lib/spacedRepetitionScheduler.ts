// ==============================================================================
// VOCABULARY MASTER — ADVANCED SPACED REPETITION & FORGETTING CURVE SCHEDULER
// ==============================================================================
// Implements Evidence-based Spaced Repetition (Enhanced SM-2 + Ebbinghaus Forgetting Curve)
// Personalized Retention Modeling, Overdue Handling, Stability Scoring, and Active Recall Scheduling.

import { MasteryState, VocabWord, ReviewLog } from './vocabEngine';

export const ALGORITHM_VERSION = 'SM2_FORGETTING_CURVE_V1';

/**
 * 4 standard user ratings during Active Recall:
 * 1: Again (Quên hoàn toàn) - Không nhớ được từ, cần học lại ngay
 * 2: Hard (Khó nhớ) - Nhớ sau nhiều nỗ lực hoặc cần gợi ý
 * 3: Good (Nhớ được) - Trả lời đúng với độ tin cậy vừa phải
 * 4: Easy (Nhớ dễ dàng) - Trả lời ngay lập tức, tự tin tuyệt đối
 */
export type ActiveRecallRating = 1 | 2 | 3 | 4;

export interface SchedulerInput {
  rating: ActiveRecallRating;
  repetitionCount: number;
  easeFactor: number; // Base default: 2.5 (range: 1.3 - 3.2)
  intervalDays: number;
  lapses: number;
  lastReviewedAt?: string; // ISO date string
  reviewType?: 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank' | 'listening';
  targetDate?: string; // Override today for deterministic testing
}

export interface SchedulerOutput {
  nextRepetitionCount: number;
  nextEaseFactor: number;
  nextIntervalDays: number;
  nextReviewAt: string; // YYYY-MM-DD
  nextState: MasteryState;
  nextLapses: number;
  estimatedRetentionRate: number; // 0 to 100 percentage
  stability: number; // Memory half-life in days
  reviewLog: ReviewLog;
}

export interface ForgettingCurvePoint {
  day: number;
  retentionPercent: number; // 0 to 100
  label: string;
}

export interface TodayStudyPlan {
  overdueWords: VocabWord[];
  dueTodayWords: VocabWord[];
  difficultWords: VocabWord[];
  newWords: VocabWord[];
  totalToStudy: number;
  estimatedMinutes: number;
  completedTodayCount: number;
  dailyGoal: number;
  completionPercent: number;
}

// ------------------------------------------------------------------------------
// 1. FORGETTING CURVE & RETENTION MODELING
// ------------------------------------------------------------------------------

/**
 * Calculates Memory Stability (S) in days.
 * S represents the time required for retention to fall to approximately 90% (or R = e^(-t/S)).
 * Higher stability means memory decays slower.
 */
export function calculateMemoryStability(intervalDays: number, easeFactor: number, lapses: number): number {
  const baseStability = Math.max(1, intervalDays);
  const lapsePenalty = Math.pow(0.85, Math.min(lapses, 5));
  const efMultiplier = easeFactor / 2.5;
  return Number((baseStability * efMultiplier * lapsePenalty).toFixed(2));
}

/**
 * Estimates Current Retention Rate R(t) = exp( - deltaDays / S )
 * Based on Ebbinghaus Forgetting Curve exponential decay.
 * @returns Retention probability as a percentage (0 to 100).
 */
export function estimateRetentionProbability(
  lastReviewedAt?: string,
  intervalDays: number = 1,
  easeFactor: number = 2.5,
  lapses: number = 0,
  referenceDate?: string
): number {
  if (!lastReviewedAt) {
    // New or unreviewed word
    return 100;
  }

  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const last = new Date(lastReviewedAt);
  const diffTime = Math.max(0, ref.getTime() - last.getTime());
  const elapsedDays = diffTime / (1000 * 60 * 60 * 24);

  const stability = calculateMemoryStability(intervalDays, easeFactor, lapses);
  
  // Standard exponential retention model (Target recall probability at scheduled interval is 90%):
  // R(t) = 0.90^(elapsedDays / stability)
  const retention = Math.pow(0.90, elapsedDays / Math.max(1, stability));

  return Math.min(100, Math.max(5, Math.round(retention * 100)));
}

/**
 * Generates data points to plot the estimated Forgetting Curve for a word or cohort.
 */
export function generateForgettingCurvePoints(
  stabilityDays: number,
  maxDays: number = 30
): ForgettingCurvePoint[] {
  const points: ForgettingCurvePoint[] = [];
  const checkpoints = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30].filter(d => d <= maxDays);

  if (!checkpoints.includes(maxDays)) {
    checkpoints.push(maxDays);
  }

  for (const day of checkpoints) {
    const retention = Math.pow(0.90, day / Math.max(1, stabilityDays));
    points.push({
      day,
      retentionPercent: Math.min(100, Math.max(5, Math.round(retention * 100))),
      label: day === 0 ? 'Hôm nay' : `Ngày ${day}`
    });
  }

  return points;
}

// ------------------------------------------------------------------------------
// 2. SPACED REPETITION SCHEDULER ALGORITHM (SM-2 + OVERDUE BONUS)
// ------------------------------------------------------------------------------

/**
 * Main Scheduling Function:
 * Calculates the next review date, interval, and ease factor given student recall rating.
 */
export function scheduleNextReview(input: SchedulerInput): SchedulerOutput {
  const {
    rating,
    repetitionCount,
    easeFactor,
    intervalDays,
    lapses,
    lastReviewedAt,
    reviewType = 'flashcard',
    targetDate
  } = input;

  const today = targetDate ? new Date(targetDate) : new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calculate elapsed days since last review to check for overdue bonus
  let overdueDays = 0;
  if (lastReviewedAt) {
    const last = new Date(lastReviewedAt);
    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    overdueDays = Math.max(0, diffDays - intervalDays);
  }

  let nextRep = repetitionCount;
  let nextEf = easeFactor;
  let nextInterval = intervalDays;
  let nextLapses = lapses;
  let nextState: MasteryState = 'learning';

  if (rating === 1) {
    // --------------------------------------------------------------------------
    // RATING 1: AGAIN (Quên hoàn toàn)
    // --------------------------------------------------------------------------
    // Reset repetition streak, increment lapse, penalty on ease factor
    nextRep = 0;
    nextInterval = 1; // Review again tomorrow (or in next session)
    nextLapses = lapses + 1;
    nextEf = Math.max(1.3, Number((easeFactor - 0.20).toFixed(2)));
    nextState = 'difficult';

  } else if (rating === 2) {
    // --------------------------------------------------------------------------
    // RATING 2: HARD (Khó nhớ / Cần gợi ý)
    // --------------------------------------------------------------------------
    // Slight progress, slight interval increase (1.2x), slight EF penalty
    nextRep = Math.max(1, repetitionCount + 1);
    if (intervalDays === 0) {
      nextInterval = 1;
    } else {
      nextInterval = Math.max(1, Math.round(intervalDays * 1.2));
    }
    nextEf = Math.max(1.3, Number((easeFactor - 0.15).toFixed(2)));
    nextState = 'learning';

  } else if (rating === 3) {
    // --------------------------------------------------------------------------
    // RATING 3: GOOD (Nhớ được)
    // --------------------------------------------------------------------------
    // Standard successful recall
    if (repetitionCount === 0) {
      nextInterval = 1; // Step 1: 1 day
    } else if (repetitionCount === 1) {
      nextInterval = 3; // Step 2: 3 days
    } else if (repetitionCount === 2) {
      nextInterval = 7; // Step 3: 7 days
    } else if (repetitionCount === 3) {
      nextInterval = 14; // Step 4: 14 days
    } else if (repetitionCount === 4) {
      nextInterval = 30; // Step 5: 30 days
    } else {
      // Step 6+: Multiply by Ease Factor + partial overdue credit
      const overdueCredit = overdueDays > 0 ? Math.round(overdueDays * 0.3) : 0;
      nextInterval = Math.round(intervalDays * easeFactor) + overdueCredit;
    }

    nextRep = repetitionCount + 1;
    // Standard SM-2 delta for grade 4: delta = 0
    // Keep EF steady or minor adjustment
    nextEf = Number(easeFactor.toFixed(2));

    if (nextRep >= 5 && nextInterval >= 21) {
      nextState = 'mastered';
    } else {
      nextState = 'reviewing';
    }

  } else {
    // --------------------------------------------------------------------------
    // RATING 4: EASY (Nhớ dễ dàng)
    // --------------------------------------------------------------------------
    // High confidence recall -> Bonus interval & increase Ease Factor
    if (repetitionCount === 0) {
      nextInterval = 3; // Jump directly to 3 days
    } else if (repetitionCount === 1) {
      nextInterval = 6;
    } else if (repetitionCount === 2) {
      nextInterval = 12;
    } else {
      const easyBonus = 1.35;
      const overdueCredit = overdueDays > 0 ? Math.round(overdueDays * 0.5) : 0;
      nextInterval = Math.round(intervalDays * easeFactor * easyBonus) + overdueCredit;
    }

    nextRep = repetitionCount + 1;
    // Increase EF by 0.15 (max 3.20)
    nextEf = Math.min(3.2, Number((easeFactor + 0.15).toFixed(2)));

    if (nextRep >= 4 && nextInterval >= 14) {
      nextState = 'mastered';
    } else {
      nextState = 'reviewing';
    }
  }

  // Calculate next review calendar date (YYYY-MM-DD)
  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + nextInterval);
  const nextReviewAt = nextDate.toISOString().split('T')[0];

  const stability = calculateMemoryStability(nextInterval, nextEf, nextLapses);
  const estimatedRetentionRate = 100; // Right after successful review, retention is freshly 100%

  const reviewLog: ReviewLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    reviewedAt: new Date().toISOString(),
    rating,
    reviewType: reviewType === 'fill_in_blank' || reviewType === 'flashcard_reverse' ? 'flashcard' : reviewType,
    intervalBefore: intervalDays,
    intervalAfter: nextInterval,
    easeFactorBefore: easeFactor,
    easeFactorAfter: nextEf
  };

  return {
    nextRepetitionCount: nextRep,
    nextEaseFactor: nextEf,
    nextIntervalDays: nextInterval,
    nextReviewAt,
    nextState,
    nextLapses,
    estimatedRetentionRate,
    stability,
    reviewLog
  };
}

// ------------------------------------------------------------------------------
// 3. TODAY STUDY PLANNER & QUEUE SLICING
// ------------------------------------------------------------------------------

/**
 * Organizes words into an optimized "Today's Study Plan":
 * Prioritizes: Overdue (Critical) -> Due Today -> Difficult/Lapsed -> New Words (daily cap)
 */
export function buildTodayStudyPlan(
  allWords: VocabWord[],
  dailyNewWordTarget: number = 10,
  dailyReviewTarget: number = 30,
  todayStr: string = new Date().toISOString().split('T')[0]
): TodayStudyPlan {
  const overdueWords: VocabWord[] = [];
  const dueTodayWords: VocabWord[] = [];
  const difficultWords: VocabWord[] = [];
  const newWordsPool: VocabWord[] = [];
  let completedTodayCount = 0;

  for (const w of allWords) {
    // Check if reviewed today
    if (w.lastReviewedAt && w.lastReviewedAt.startsWith(todayStr)) {
      completedTodayCount++;
    }

    if (w.state === 'new') {
      newWordsPool.push(w);
    } else if (w.state === 'difficult' || w.lapses >= 2) {
      difficultWords.push(w);
    } else if (w.nextReviewAt < todayStr) {
      overdueWords.push(w);
    } else if (w.nextReviewAt === todayStr) {
      dueTodayWords.push(w);
    }
  }

  // Sort overdue: oldest overdue first
  overdueWords.sort((a, b) => (a.nextReviewAt > b.nextReviewAt ? 1 : -1));

  // Cap new words to avoid overwhelming the learner
  const newWords = newWordsPool.slice(0, dailyNewWordTarget);

  // Total words needing attention today
  const totalToStudy = overdueWords.length + dueTodayWords.length + difficultWords.length + newWords.length;

  // Estimate study time: ~35 seconds per active recall card
  const estimatedMinutes = Math.max(1, Math.round((totalToStudy * 35) / 60));

  const dailyGoal = dailyReviewTarget + dailyNewWordTarget;
  const completionPercent = dailyGoal > 0
    ? Math.min(100, Math.round((completedTodayCount / dailyGoal) * 100))
    : 0;

  return {
    overdueWords,
    dueTodayWords,
    difficultWords,
    newWords,
    totalToStudy,
    estimatedMinutes,
    completedTodayCount,
    dailyGoal,
    completionPercent
  };
}

/**
 * Slices a massive review list into bite-sized study sessions (e.g., batches of 15-20)
 * to prevent cognitive fatigue.
 */
export function sliceStudyBatches(words: VocabWord[], batchSize: number = 20): VocabWord[][] {
  if (words.length === 0) return [];
  const batches: VocabWord[][] = [];
  for (let i = 0; i < words.length; i += batchSize) {
    batches.push(words.slice(i, i + batchSize));
  }
  return batches;
}
