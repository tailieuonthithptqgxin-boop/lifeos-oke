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
  reviewType?: 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank' | 'listening' | 'speaking';
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
// 2. SPACED REPETITION SCHEDULER ALGORITHM (6-TIER MEMORY TOWER ENGINE)
// ------------------------------------------------------------------------------

/**
 * Main Scheduling Function:
 * Implements strict 6-Tier Memory Pyramid transitions:
 * Tầng 0 (Từ mới): Chưa học -> Lần đầu: Đúng -> Tầng 1 (1-2d); Sai -> Tầng 1 (1d), wrongCount+1
 * Tầng 1 (Mới học: 1-2d): Đúng -> Tầng 2 (3-6d); Sai -> Tầng 1 (1d), wrongCount+1
 * Tầng 2 (Đang nhớ / Chưa chắc: 3-6d): Đúng -> Tầng 3 (7-13d); Sai -> Rớt Tầng 1 (1d), wrongCount+1
 * Tầng 3 (Nhớ khá: 7-13d): Đúng -> Tầng 4 (14-29d); Sai -> Rớt Tầng 2 (3-6d)
 * Tầng 4 (Nhớ tốt: 14-29d): Đúng + Nhanh (<3s hoặc rating 4) -> Tầng 5 (>=30d); Đúng thường -> Giữ Tầng 4; Sai -> Rớt Tầng 2 (3-6d)
 * Tầng 5 (Thành thạo: >=30d): Đúng -> Giữ Tầng 5 x1.5 interval; Sai -> Rớt Tầng 2 (3-6d)
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

  // Determine current tier from repetition and interval
  const currentTier = (repetitionCount === 0 && (!lastReviewedAt || intervalDays === 0))
    ? 0
    : intervalDays >= 30 ? 5
    : intervalDays >= 14 ? 4
    : intervalDays >= 7 ? 3
    : intervalDays >= 3 ? 2
    : 1;

  let nextRep = repetitionCount;
  let nextEf = easeFactor;
  let nextInterval = 1;
  let nextLapses = lapses;
  let nextState: MasteryState = 'learning';
  let nextTier = 1;

  if (rating === 1 || rating === 2) {
    // --------------------------------------------------------------------------
    // SAI / CHƯA THUỘC (RATING 1 HOẶC 2) -> HẠ TẦNG THEO CHUẨN THÁP TRÍ NHỚ
    // --------------------------------------------------------------------------
    nextLapses = lapses + 1;
    nextEf = Math.max(1.3, Number((easeFactor - 0.20).toFixed(2)));
    nextState = 'difficult';

    if (currentTier >= 3) {
      // Tầng 3, 4, 5 khi sai rớt về Tầng 2 (3-6 ngày)
      nextTier = 2;
      nextInterval = 3;
      nextRep = 2;
    } else {
      // Tầng 0, 1, 2 khi sai ở lại hoặc rớt về Tầng 1 (1 ngày hẹn ôn ngày mai)
      nextTier = 1;
      nextInterval = 1;
      nextRep = 1;
    }
  } else {
    // --------------------------------------------------------------------------
    // ĐÚNG / ĐÃ NHỚ (RATING 3 HOẶC 4) -> THĂNG TẦNG THEO CHUẨN THÁP TRÍ NHỚ
    // --------------------------------------------------------------------------
    if (currentTier === 0) {
      // Tầng 0 -> Thăng Tầng 1 (1 - 2 ngày)
      nextTier = 1;
      nextInterval = rating === 4 ? 2 : 1;
      nextRep = 1;
    } else if (currentTier === 1) {
      // Tầng 1 -> Thăng Tầng 2 (3 - 6 ngày)
      nextTier = 2;
      nextInterval = rating === 4 ? 5 : 3;
      nextRep = Math.max(2, repetitionCount + 1);
    } else if (currentTier === 2) {
      // Tầng 2 -> Thăng Tầng 3 (7 - 13 ngày)
      nextTier = 3;
      nextInterval = rating === 4 ? 10 : 7;
      nextRep = Math.max(3, repetitionCount + 1);
    } else if (currentTier === 3) {
      // Tầng 3 -> Thăng Tầng 4 (14 - 29 ngày)
      nextTier = 4;
      nextInterval = rating === 4 ? 21 : 14;
      nextRep = Math.max(4, repetitionCount + 1);
    } else if (currentTier === 4) {
      // Tầng 4 -> Phản xạ nhanh (rating 4) -> Thăng Tầng 5 (>= 30 ngày)
      if (rating === 4) {
        nextTier = 5;
        nextInterval = 30;
        nextRep = Math.max(5, repetitionCount + 1);
      } else {
        // Nhớ được bình thường (rating 3) -> Giữ Tầng 4 củng cố (18-28 ngày)
        nextTier = 4;
        nextInterval = Math.min(28, Math.max(18, Math.round((intervalDays || 14) * 1.3)));
        nextRep = repetitionCount + 1;
      }
    } else {
      // Tầng 5 -> Thành thạo (>= 30 ngày): Nhân khoảng cách x1.5
      nextTier = 5;
      nextInterval = Math.max(35, Math.round((intervalDays || 30) * 1.5));
      nextRep = repetitionCount + 1;
    }

    nextEf = rating === 4
      ? Math.min(3.2, Number((easeFactor + 0.15).toFixed(2)))
      : Number(easeFactor.toFixed(2));

    nextState = nextTier === 5 ? 'mastered' : 'reviewing';
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
  allWords: VocabWord[] = [],
  dailyNewWordTarget: number = 10,
  dailyReviewTarget: number = 30,
  todayStr: string = new Date().toISOString().split('T')[0]
): TodayStudyPlan {
  const overdueWords: VocabWord[] = [];
  const dueTodayWords: VocabWord[] = [];
  const difficultWords: VocabWord[] = [];
  const newWordsPool: VocabWord[] = [];
  let completedTodayCount = 0;
  const safeWords = Array.isArray(allWords) ? allWords : [];

  for (const w of safeWords) {
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
export function sliceStudyBatches(words: VocabWord[] = [], batchSize: number = 20): VocabWord[][] {
  const safeWords = Array.isArray(words) ? words : [];
  if (safeWords.length === 0) return [];
  const batches: VocabWord[][] = [];
  for (let i = 0; i < safeWords.length; i += batchSize) {
    batches.push(safeWords.slice(i, i + batchSize));
  }
  return batches;
}
