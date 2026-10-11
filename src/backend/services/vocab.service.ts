import { getPrisma } from '../db.js';

export interface VocabReviewInput {
  wordId: string;
  languageId?: string;
  term: string;
  meaning: string;
  phonetic?: string;
  partOfSpeech?: string;
  exerciseType: 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank';
  rating: 1 | 2 | 3 | 4;
  isCorrect?: boolean;
  responseTimeMs?: number;
}

export class VocabService {
  /**
   * Determine Memory Level (0 to 5) based on repetition count, interval, and lapses
   */
  private computeMemoryLevel(repetitionCount: number, intervalDays: number, lapses: number): number {
    if (repetitionCount === 0) return 0; // Level 0: Chưa học
    if (repetitionCount === 1) return 1; // Level 1: Mới học
    if (repetitionCount === 2 || lapses > 2) return 2; // Level 2: Đang ghi nhớ / Chưa chắc
    if (intervalDays >= 30 && repetitionCount >= 5) return 5; // Level 5: Thành thạo
    if (intervalDays >= 14 && repetitionCount >= 4) return 4; // Level 4: Đã nhớ / Nhớ tốt
    if (repetitionCount >= 3) return 3; // Level 3: Nhớ khá
    return 2;
  }

  /**
   * Record a review outcome into PostgreSQL with atomic updates to WordProgress & ReviewLog
   */
  async recordReview(userId: string, input: VocabReviewInput) {
    const prisma = getPrisma();
    const languageId = input.languageId || 'en';
    const now = new Date();
    const isCorrect = input.isCorrect !== undefined ? input.isCorrect : input.rating >= 3;

    // 1. Fetch existing word progress or prepare default
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM vocab_word_progress 
       WHERE "userId" = $1 AND "languageId" = $2 AND "wordId" = $3 LIMIT 1`,
      userId,
      languageId,
      input.wordId
    );

    let progress = existing[0] || null;

    let repCount = progress?.repetitionCount || 0;
    let easeFactor = progress?.easeFactor || 2.5;
    let intervalDays = progress?.intervalDays || 0;
    let lapses = progress?.lapses || 0;
    let correctCount = progress?.correctCount || 0;
    let incorrectCount = progress?.incorrectCount || 0;
    let currentLevel = progress?.memoryLevel || 0;

    const memoryLevelBefore = currentLevel;
    const intervalBefore = intervalDays;

    // 2. SM-2 Algorithm & Memory Pyramid Progression Logic
    let nextRep = repCount;
    let nextInterval = intervalDays;
    let nextEf = easeFactor;
    let nextLapses = lapses;
    let nextState = progress?.state || 'new';

    if (input.rating === 1 || !isCorrect) {
      // AGAIN / INCORRECT: Penalty, reset repetition streak, increase lapses
      nextRep = 0;
      nextInterval = 1;
      nextLapses = lapses + 1;
      nextEf = Math.max(1.3, Number((easeFactor - 0.20).toFixed(2)));
      nextState = 'difficult';
      incorrectCount++;
    } else if (input.rating === 2) {
      // HARD: Slight progress
      nextRep = Math.max(1, repCount + 1);
      nextInterval = Math.max(1, Math.round(intervalDays * 1.2));
      nextEf = Math.max(1.3, Number((easeFactor - 0.15).toFixed(2)));
      nextState = 'learning';
      correctCount++;
    } else if (input.rating === 3) {
      // GOOD: Standard retention increment
      if (repCount === 0) nextInterval = 1;
      else if (repCount === 1) nextInterval = 3;
      else if (repCount === 2) nextInterval = 7;
      else if (repCount === 3) nextInterval = 14;
      else if (repCount === 4) nextInterval = 30;
      else nextInterval = Math.round(intervalDays * easeFactor);

      nextRep = repCount + 1;
      nextState = nextInterval >= 21 ? 'mastered' : 'reviewing';
      correctCount++;
    } else {
      // EASY: Bonus multiplier and ease boost
      if (repCount === 0) nextInterval = 3;
      else if (repCount === 1) nextInterval = 6;
      else if (repCount === 2) nextInterval = 12;
      else nextInterval = Math.round(intervalDays * easeFactor * 1.35);

      nextRep = repCount + 1;
      nextEf = Math.min(3.2, Number((easeFactor + 0.15).toFixed(2)));
      nextState = nextInterval >= 14 ? 'mastered' : 'reviewing';
      correctCount++;
    }

    const nextLevel = this.computeMemoryLevel(nextRep, nextInterval, nextLapses);

    // Calculate next review date
    const nextReviewDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

    let progressId = progress?.id;

    if (!progress) {
      // Insert new progress
      const inserted = await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO vocab_word_progress (
          id, "userId", "languageId", "wordId", term, meaning, phonetic, "partOfSpeech",
          "memoryLevel", "repetitionCount", "easeFactor", "intervalDays", "lastReviewedAt",
          "nextReviewAt", "correctCount", "incorrectCount", lapses, state, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        ) RETURNING id`,
        userId,
        languageId,
        input.wordId,
        input.term,
        input.meaning,
        input.phonetic || null,
        input.partOfSpeech || null,
        nextLevel,
        nextRep,
        nextEf,
        nextInterval,
        now,
        nextReviewDate,
        correctCount,
        incorrectCount,
        nextLapses,
        nextState
      );
      progressId = inserted[0]?.id;
    } else {
      // Update existing progress
      await prisma.$queryRawUnsafe(
        `UPDATE vocab_word_progress SET
          term = $1, meaning = $2, phonetic = $3, "partOfSpeech" = $4,
          "memoryLevel" = $5, "repetitionCount" = $6, "easeFactor" = $7, "intervalDays" = $8,
          "lastReviewedAt" = $9, "nextReviewAt" = $10, "correctCount" = $11, "incorrectCount" = $12,
          lapses = $13, state = $14, "updatedAt" = NOW()
        WHERE id = $15`,
        input.term,
        input.meaning,
        input.phonetic || null,
        input.partOfSpeech || null,
        nextLevel,
        nextRep,
        nextEf,
        nextInterval,
        now,
        nextReviewDate,
        correctCount,
        incorrectCount,
        nextLapses,
        nextState,
        progressId
      );
    }

    // 3. Insert Review Log
    await prisma.$queryRawUnsafe(
      `INSERT INTO vocab_review_logs (
        id, "userId", "progressId", "wordId", "exerciseType", rating, "isCorrect",
        "responseTimeMs", "memoryLevelBefore", "memoryLevelAfter", "intervalBefore", "intervalAfter", "reviewedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
      )`,
      userId,
      progressId,
      input.wordId,
      input.exerciseType,
      input.rating,
      isCorrect,
      input.responseTimeMs || null,
      memoryLevelBefore,
      nextLevel,
      intervalBefore,
      nextInterval
    );

    return {
      wordId: input.wordId,
      memoryLevelBefore,
      memoryLevelAfter: nextLevel,
      intervalBefore,
      intervalAfter: nextInterval,
      nextReviewAt: nextReviewDate.toISOString().split('T')[0],
      isCorrect,
      repetitionCount: nextRep,
      easeFactor: nextEf,
      lapses: nextLapses,
      state: nextState
    };
  }

  /**
   * Get comprehensive dashboard metrics, Memory Pyramid tiers, Today's Review & Weak Words
   */
  async getDashboardAnalytics(userId: string, languageId: string = 'en') {
    const prisma = getPrisma();
    const today = new Date().toISOString().split('T')[0];

    // Fetch all words progress for this user & language
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM vocab_word_progress 
       WHERE "userId" = $1 AND "languageId" = $2`,
      userId,
      languageId
    );

    // 1. Pyramid distribution (Levels 0 to 5)
    const pyramid = {
      level0: 0, // Tầng 1: Chưa học / Mới
      level1: 0, // Tầng 2: Mới học
      level2: 0, // Tầng 3: Đang ghi nhớ / Chưa chắc
      level3: 0, // Tầng 4: Nhớ khá
      level4: 0, // Tầng 5: Nhớ tốt / Đã nhớ
      level5: 0  // Tầng 6: Thành thạo
    };

    let totalReviews = 0;
    let totalCorrect = 0;
    let masteredCount = 0;

    const dueTodayWords: any[] = [];
    const weakWords: any[] = [];

    for (const r of rows) {
      const lvl = r.memoryLevel ?? 0;
      if (lvl === 0) pyramid.level0++;
      else if (lvl === 1) pyramid.level1++;
      else if (lvl === 2) pyramid.level2++;
      else if (lvl === 3) pyramid.level3++;
      else if (lvl === 4) pyramid.level4++;
      else if (lvl >= 5) {
        pyramid.level5++;
        masteredCount++;
      }

      totalCorrect += r.correctCount || 0;
      totalReviews += (r.correctCount || 0) + (r.incorrectCount || 0);

      // Check due today
      const nextDate = r.nextReviewAt ? new Date(r.nextReviewAt).toISOString().split('T')[0] : today;
      if (nextDate <= today || r.memoryLevel === 1) {
        // Priority Score: 
        // 1. Recent lapse (1000 pts)
        // 2. Low level (500 pts - lvl*50)
        // 3. Overdue days
        let priority = 0;
        if (r.lapses > 0) priority += 1000;
        priority += (5 - (r.memoryLevel || 0)) * 100;
        dueTodayWords.push({
          ...r,
          priorityScore: priority
        });
      }

      // Check weak words: lapses >= 2 or incorrect > correct or accuracy < 60%
      const totalAtt = (r.correctCount || 0) + (r.incorrectCount || 0);
      const acc = totalAtt > 0 ? (r.correctCount / totalAtt) : 1;
      if (r.lapses >= 2 || (totalAtt >= 2 && acc < 0.6)) {
        weakWords.push({
          ...r,
          accuracy: Math.round(acc * 100)
        });
      }
    }

    // Sort due words by priority score descending
    dueTodayWords.sort((a, b) => b.priorityScore - a.priorityScore);

    // Sort weak words by accuracy ascending
    weakWords.sort((a, b) => a.accuracy - b.accuracy);

    const overallAccuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 100;
    const totalWordsTracked = rows.length;
    const completionPercent = totalWordsTracked > 0 ? Math.round((masteredCount / totalWordsTracked) * 100) : 0;

    return {
      totalWords: totalWordsTracked,
      masteredCount,
      completionPercent,
      overallAccuracy,
      totalReviews,
      pyramid: {
        total: totalWordsTracked,
        level0_new: pyramid.level0,
        level1_learning: pyramid.level1,
        level2_uncertain: pyramid.level2,
        level3_good: pyramid.level3,
        level4_strong: pyramid.level4,
        level5_mastered: pyramid.level5
      },
      dueTodayCount: dueTodayWords.length,
      dueTodayWords: dueTodayWords.slice(0, 30),
      weakWordsCount: weakWords.length,
      weakWords: weakWords.slice(0, 20)
    };
  }

  /**
   * Get learning review history logs grouped by date
   */
  async getLearningHistory(userId: string, limit: number = 50) {
    const prisma = getPrisma();
    const logs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT l.*, p.term, p.meaning, p.phonetic
       FROM vocab_review_logs l
       JOIN vocab_word_progress p ON l."progressId" = p.id
       WHERE l."userId" = $1
       ORDER BY l."reviewedAt" DESC
       LIMIT $2`,
      userId,
      limit
    );

    // Group logs by date
    const grouped: Record<string, any[]> = {};
    for (const log of logs) {
      const d = log.reviewedAt ? new Date(log.reviewedAt).toISOString().split('T')[0] : 'today';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(log);
    }

    return {
      logs,
      groupedByDate: grouped,
      totalLogs: logs.length
    };
  }

  /**
   * Sync a batch of words or client data to Postgres
   */
  async syncWordsBatch(userId: string, languageId: string, words: any[]) {
    const prisma = getPrisma();
    let synced = 0;

    for (const w of words) {
      const wordId = w.id || w.wordId;
      const term = w.term;
      const meaning = w.meaning;
      if (!wordId || !term || !meaning) continue;

      const memLevel = this.computeMemoryLevel(w.repetitionCount || 0, w.intervalDays || 0, w.lapses || 0);

      await prisma.$queryRawUnsafe(
        `INSERT INTO vocab_word_progress (
          id, "userId", "languageId", "wordId", term, meaning, phonetic, "partOfSpeech",
          "memoryLevel", "repetitionCount", "easeFactor", "intervalDays", "lastReviewedAt",
          "nextReviewAt", "correctCount", "incorrectCount", lapses, state, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        )
        ON CONFLICT ("userId", "languageId", "wordId") DO UPDATE SET
          term = EXCLUDED.term,
          meaning = EXCLUDED.meaning,
          phonetic = EXCLUDED.phonetic,
          "partOfSpeech" = EXCLUDED."partOfSpeech",
          "memoryLevel" = EXCLUDED."memoryLevel",
          "repetitionCount" = EXCLUDED."repetitionCount",
          "easeFactor" = EXCLUDED."easeFactor",
          "intervalDays" = EXCLUDED."intervalDays",
          "lastReviewedAt" = EXCLUDED."lastReviewedAt",
          "nextReviewAt" = EXCLUDED."nextReviewAt",
          state = EXCLUDED.state,
          "updatedAt" = NOW()`,
        userId,
        languageId,
        wordId,
        term,
        meaning,
        w.phonetic || null,
        w.partOfSpeech || null,
        memLevel,
        w.repetitionCount || 0,
        w.easeFactor || 2.5,
        w.intervalDays || 0,
        w.lastReviewedAt ? new Date(w.lastReviewedAt) : null,
        w.nextReviewAt ? new Date(w.nextReviewAt) : new Date(),
        w.correctCount || 0,
        w.incorrectCount || 0,
        w.lapses || 0,
        w.state || 'new'
      );
      synced++;
    }

    return { success: true, count: synced };
  }
}

export const vocabService = new VocabService();
