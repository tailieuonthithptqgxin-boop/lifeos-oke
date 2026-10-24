// ==============================================================================
// FSRS (Free Spaced Repetition Scheduler) v4/v5 - Pure Mathematical Implementation
// ==============================================================================
// 100% Zero-AI / Pure Math TypeScript
// Based on the Free Spaced Repetition Scheduler algorithm:
// - Stability (S): Days until retrievability drops to 90%
// - Difficulty (D): Scale 1.0 - 10.0
// - Retrievability (R): R(t, S) = exp(- ln(10/9) * t / S)
// - Rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)

export type FSRSRating = 1 | 2 | 3 | 4;

export interface FSRSItem {
  id: string;
  stability: number; // in days
  difficulty: number; // 1.0 to 10.0
  reps: number;
  lapses: number;
  lastReviewDate?: string; // ISO string
  nextReviewDate: string; // ISO string
  intervalDays: number;
}

export interface FSRSReviewResult {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  intervalDays: number;
  nextReviewDate: string;
  retrievabilityBeforeReview: number;
}

// Default standard optimized FSRS weights
export const FSRS_WEIGHTS = {
  w0: 0.4,   // Initial stability for Again
  w1: 1.2,   // Initial stability for Hard
  w2: 3.2,   // Initial stability for Good
  w3: 8.0,   // Initial stability for Easy
  w4: 5.0,   // Initial difficulty base
  w5: 1.2,   // Difficulty modifier
  w6: 0.8,   // Difficulty delta per grade
  w7: 0.25,  // Stability decay on lapse
  w8: 0.3,   // Difficulty impact on lapse
  w9: 0.15,  // Stability growth base
  w10: 0.2,  // Stability damping
  w11: 2.1,  // Retrievability impact on recall
  w12: 0.8,  // Hard penalty
  w13: 1.3,  // Easy bonus
};

const DESIRED_RETENTION = 0.90; // Target 90% retention rate
const DECAY_FACTOR = Math.log(10 / 9); // ln(1.1111) approx 0.10536

/**
 * Calculates current retrievability probability R in [0, 1].
 * R = e^(- ln(10/9) * t / S)
 * At t = S, R = 0.90.
 */
export function calculateRetrievability(stability: number, daysElapsed: number): number {
  if (stability <= 0) return 0;
  if (daysElapsed <= 0) return 1.0;
  const r = Math.exp(-DECAY_FACTOR * (daysElapsed / stability));
  return Math.min(1.0, Math.max(0.01, r));
}

/**
 * Calculates optimal interval (in days) to achieve the target retention rate.
 */
export function calculateInterval(stability: number, desiredRetention = DESIRED_RETENTION): number {
  if (stability <= 0) return 1;
  const target = Math.min(0.99, Math.max(0.70, desiredRetention));
  const rawInterval = stability * (Math.log(target) / -DECAY_FACTOR);
  return Math.max(1, Math.round(rawInterval));
}

/**
 * Initializes a new FSRS item for a brand new card.
 */
export function createInitialFSRSItem(id: string): FSRSItem {
  const now = new Date();
  return {
    id,
    stability: 2.0,
    difficulty: 5.0,
    reps: 0,
    lapses: 0,
    intervalDays: 1,
    nextReviewDate: now.toISOString()
  };
}

/**
 * Converts legacy SM-2 word progress to FSRS state seamlessly.
 */
export function convertSM2ToFSRS(wordId: string, easeFactor = 2.5, intervalDays = 1, repetitionCount = 0): FSRSItem {
  const stability = Math.max(0.5, intervalDays > 0 ? intervalDays * 1.05 : 1.5);
  // In SM-2, easeFactor is typically 1.3 to 2.5. We map EF 1.3..2.5 -> Difficulty 8.0..3.0
  const difficulty = Math.max(1.0, Math.min(10.0, 11.0 - (easeFactor * 3.2)));
  
  const now = new Date();
  const nextDate = new Date(now.getTime() + intervalDays * 86400000);

  return {
    id: wordId,
    stability,
    difficulty,
    reps: repetitionCount,
    lapses: 0,
    intervalDays: Math.max(1, intervalDays),
    nextReviewDate: nextDate.toISOString()
  };
}

/**
 * Evaluates an FSRS review response and returns the new mathematical state.
 */
export function processFSRSReview(
  item: FSRSItem,
  rating: FSRSRating,
  reviewDate: Date = new Date()
): FSRSReviewResult {
  const lastDate = item.lastReviewDate ? new Date(item.lastReviewDate) : reviewDate;
  const msElapsed = Math.max(0, reviewDate.getTime() - lastDate.getTime());
  const daysElapsed = Math.max(0, msElapsed / 86400000);

  const currentR = item.reps > 0 ? calculateRetrievability(item.stability, daysElapsed) : 0.5;

  let nextStability: number;
  let nextDifficulty: number;
  let nextReps = item.reps + 1;
  let nextLapses = item.lapses;

  // 1. Initial Review (First time card is reviewed)
  if (item.reps === 0) {
    switch (rating) {
      case 1: // Again
        nextStability = FSRS_WEIGHTS.w0;
        nextDifficulty = Math.min(10, FSRS_WEIGHTS.w4 + 2);
        nextLapses += 1;
        break;
      case 2: // Hard
        nextStability = FSRS_WEIGHTS.w1;
        nextDifficulty = Math.min(10, FSRS_WEIGHTS.w4 + 1);
        break;
      case 3: // Good
        nextStability = FSRS_WEIGHTS.w2;
        nextDifficulty = FSRS_WEIGHTS.w4;
        break;
      case 4: // Easy
        nextStability = FSRS_WEIGHTS.w3;
        nextDifficulty = Math.max(1, FSRS_WEIGHTS.w4 - 1.5);
        break;
    }
  } else {
    // 2. Subsequent Reviews
    // Difficulty update: D' = D - w6 * (Rating - 3)
    const deltaD = -FSRS_WEIGHTS.w6 * (rating - 3);
    nextDifficulty = Math.min(10.0, Math.max(1.0, item.difficulty + deltaD));

    if (rating === 1) {
      // Lapse (Forgotten): stability reset with penalty
      nextLapses += 1;
      nextStability = Math.max(0.3, item.stability * FSRS_WEIGHTS.w7 * Math.pow(item.difficulty, -FSRS_WEIGHTS.w8));
    } else {
      // Successful Recall: Stability expands
      let gradeBonus = 1.0;
      if (rating === 2) gradeBonus = FSRS_WEIGHTS.w12; // Hard penalty
      if (rating === 4) gradeBonus = FSRS_WEIGHTS.w13; // Easy bonus

      const growth = Math.exp(FSRS_WEIGHTS.w9) *
        (11 - nextDifficulty) *
        Math.pow(item.stability, -FSRS_WEIGHTS.w10) *
        (Math.exp((1 - currentR) * FSRS_WEIGHTS.w11) - 1) *
        gradeBonus;

      nextStability = Math.max(item.stability + 0.1, item.stability * (1 + Math.max(0.05, growth)));
    }
  }

  // Calculate new optimal interval
  const nextIntervalDays = calculateInterval(nextStability, DESIRED_RETENTION);
  const nextReviewDateObj = new Date(reviewDate.getTime() + nextIntervalDays * 86400000);

  return {
    stability: Number(nextStability.toFixed(2)),
    difficulty: Number(nextDifficulty.toFixed(2)),
    reps: nextReps,
    lapses: nextLapses,
    intervalDays: nextIntervalDays,
    nextReviewDate: nextReviewDateObj.toISOString(),
    retrievabilityBeforeReview: Number(currentR.toFixed(3))
  };
}
