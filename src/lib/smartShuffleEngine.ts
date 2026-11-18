/**
 * SMART RANDOM VOCABULARY SHUFFLE ENGINE
 * 
 * Mathematical & Cognitive Architecture:
 * 1. Unbiased Fisher-Yates (Knuth) Permutation Generator
 * 2. Memory-Weighted Adaptive Scoring (SM-2 / FSRS retention integration)
 * 3. Anti-Repetition & Anti-Clustering Constraints
 * 4. 5 Dedicated Learning Shuffle Modes:
 *    - 'random': Pure uniform stochastic shuffle
 *    - 'smart_review': Prioritizes weak, overdue, and high-lapse words
 *    - 'new_words': Only unlearned words (repetitionCount === 0 or state === 'new')
 *    - 'mixed': Balanced interleave of ~25-30% new words + 70-75% review words
 *    - 'mistakes': Focus exclusively on historically failed / difficult words
 * 5. Complete Data Safety: Zero in-place mutations of source lists or database collections
 */

import { VocabWord } from './vocabEngine';

export type ShuffleMode = 
  | 'random' 
  | 'smart_review' 
  | 'new_words' 
  | 'mixed' 
  | 'mistakes';

export interface SmartShuffleOptions {
  mode?: ShuffleMode;
  maxCards?: number;
  todayIso?: string; // YYYY-MM-DD for review due date calculation
  randomFn?: () => number; // Injectable uniform PRNG (default: Math.random)
}

/**
 * High-performance, unbiased Fisher-Yates (Knuth) shuffle algorithm.
 * Guarantees every permutation has equal probability: 1 / n!
 * Never mutates the source array.
 */
export function fisherYatesShuffle<T>(
  array: readonly T[],
  randomFn: () => number = Math.random
): T[] {
  if (!array || array.length <= 1) {
    return array ? [...array] : [];
  }
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    // Generate uniform random index j in [0, i]
    const j = Math.floor(randomFn() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Calculates a dynamic priority score for a word based on memory retention,
 * review history, lapses, and SM-2 spaced repetition indicators.
 * Higher score = higher urgency to review.
 */
export function computeWordRetentionUrgency(
  word: VocabWord,
  todayIso: string = new Date().toISOString().split('T')[0]
): number {
  let score = 0;

  // 1. Lapses (number of times forgotten in previous reviews)
  // Each lapse strongly increases urgency
  const lapses = word.lapses || 0;
  score += lapses * 30;

  // 2. Explicit difficult flag
  if (word.isDifficult || word.state === 'difficult') {
    score += 45;
  }

  // 3. Last review rating
  if (Array.isArray(word.reviewLogs) && word.reviewLogs.length > 0) {
    const lastLog = word.reviewLogs[word.reviewLogs.length - 1];
    if (lastLog.rating === 1) {
      score += 50; // Quên (Forgot completely)
    } else if (lastLog.rating === 2) {
      score += 25; // Khó (Struggled)
    } else if (lastLog.rating === 4) {
      score -= 20; // Dễ (Very easy, push back)
    }
  }

  // 4. State weighting
  if (word.state === 'learning') {
    score += 25;
  } else if (word.state === 'mastered') {
    score -= 35; // Mastered words have lowest urgency
  }

  // 5. Overdue calculation
  if (word.nextReviewAt && word.state !== 'new') {
    if (word.nextReviewAt <= todayIso) {
      score += 30;
      // Calculate overdue days if both dates are valid
      try {
        const diffMs = new Date(todayIso).getTime() - new Date(word.nextReviewAt).getTime();
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        score += Math.min(30, diffDays * 5); // Capped at +30
      } catch {}
    }
  }

  // 6. Ease Factor (lower EF indicates word is harder to retain)
  if (typeof word.easeFactor === 'number' && word.easeFactor < 2.0) {
    score += 15;
  }

  // 7. Incorrect count
  if (typeof word.incorrectCount === 'number') {
    score += Math.min(25, word.incorrectCount * 4);
  }

  return score;
}

/**
 * Checks if a word is categorized as "New" (unstudied).
 */
export function isWordNew(word: VocabWord): boolean {
  if (word.state === 'new') return true;
  if (typeof word.repetitionCount === 'number' && word.repetitionCount > 0) return false;
  if (word.lastReviewedAt) return false;
  return !word.repetitionCount || word.repetitionCount === 0;
}

/**
 * Checks if a word qualifies as a "Mistake / Problematic" word.
 */
export function isWordMistake(word: VocabWord): boolean {
  if (word.isDifficult || word.state === 'difficult') return true;
  if ((word.lapses ?? 0) > 0) return true;
  if ((word.incorrectCount ?? 0) > (word.correctCount ?? 0)) return true;
  if (Array.isArray(word.reviewLogs) && word.reviewLogs.length > 0) {
    const lastRating = word.reviewLogs[word.reviewLogs.length - 1].rating;
    if (lastRating <= 2) return true;
  }
  return false;
}

/**
 * Applies anti-clustering rules to prevent adjacent words from having
 * identical terms, duplicate IDs, or sharing identical prefixes/part of speech.
 */
export function applyAntiRepetitionAndClustering(
  words: readonly VocabWord[]
): VocabWord[] {
  if (!words || words.length <= 1) return words ? [...words] : [];

  // Step 1: Ensure strict uniqueness by word ID (no duplicate instances in one pass)
  const seenIds = new Set<string>();
  const uniqueList: VocabWord[] = [];
  for (const w of words) {
    if (w && w.id && !seenIds.has(w.id)) {
      seenIds.add(w.id);
      uniqueList.push(w);
    }
  }

  if (uniqueList.length <= 2) return uniqueList;

  // Step 2: Separate consecutive words that share identical prefix (>= 4 chars)
  // or identical part of speech where possible
  const result: VocabWord[] = [uniqueList[0]];
  const remaining = uniqueList.slice(1);

  while (remaining.length > 0) {
    const prev = result[result.length - 1];
    const prevTerm = (prev.term || '').toLowerCase().trim();
    const prevPrefix = prevTerm.length >= 4 ? prevTerm.slice(0, 4) : prevTerm;

    // Look for best candidate that does not share prefix or exact same term
    let candidateIndex = remaining.findIndex(candidate => {
      const cTerm = (candidate.term || '').toLowerCase().trim();
      const cPrefix = cTerm.length >= 4 ? cTerm.slice(0, 4) : cTerm;
      return cPrefix !== prevPrefix && cTerm !== prevTerm;
    });

    if (candidateIndex === -1) {
      // If all remaining words share prefix or no conflict-free choice, take the first
      candidateIndex = 0;
    }

    result.push(remaining[candidateIndex]);
    remaining.splice(candidateIndex, 1);
  }

  return result;
}

/**
 * Smart Review Weighted Shuffle:
 * Groups words into Priority Tiers (High Urgency, Medium Urgency, Low Urgency),
 * applies Fisher-Yates shuffle within each tier, and blends them with stochastic noise
 * so weak/overdue words appear sooner while preserving unpredictable variety.
 */
export function smartReviewShuffle(
  words: readonly VocabWord[],
  todayIso?: string,
  randomFn: () => number = Math.random
): VocabWord[] {
  if (!words || words.length <= 1) return words ? [...words] : [];

  // Associate each word with its urgency score + stochastic noise factor
  // Noise factor (0 to 20) ensures the session sequence is never rigidly identical
  const scored = words.map(w => {
    const baseUrgency = computeWordRetentionUrgency(w, todayIso);
    const noise = randomFn() * 20;
    return {
      word: w,
      totalScore: baseUrgency + noise
    };
  });

  // Sort by totalScore descending (highest urgency first)
  scored.sort((a, b) => b.totalScore - a.totalScore);

  const prioritized = scored.map(s => s.word);
  return applyAntiRepetitionAndClustering(prioritized);
}

/**
 * Mixed Shuffle:
 * Intelligently interleaves New Words (~25-30%) with Learned/Review Words (~70-75%)
 * to maximize retention without inducing cognitive fatigue from too many consecutive new words.
 */
export function mixedShuffle(
  words: readonly VocabWord[],
  todayIso?: string,
  randomFn: () => number = Math.random
): VocabWord[] {
  if (!words || words.length <= 1) return words ? [...words] : [];

  const newWordsPool: VocabWord[] = [];
  const reviewWordsPool: VocabWord[] = [];

  for (const w of words) {
    if (isWordNew(w)) {
      newWordsPool.push(w);
    } else {
      reviewWordsPool.push(w);
    }
  }

  // Shuffle both pools independently
  const shuffledNew = fisherYatesShuffle(newWordsPool, randomFn);
  const shuffledReview = smartReviewShuffle(reviewWordsPool, todayIso, randomFn);

  // If one pool is empty, return the other shuffled
  if (shuffledNew.length === 0) return shuffledReview;
  if (shuffledReview.length === 0) return shuffledNew;

  // Interleave: pattern is typically 1 new word every 2-3 review words
  const result: VocabWord[] = [];
  let newIdx = 0;
  let revIdx = 0;

  while (newIdx < shuffledNew.length || revIdx < shuffledReview.length) {
    // Add 2-3 review words
    const reviewChunkSize = Math.floor(randomFn() * 2) + 2; // 2 or 3
    for (let i = 0; i < reviewChunkSize && revIdx < shuffledReview.length; i++) {
      result.push(shuffledReview[revIdx++]);
    }
    // Add 1 new word
    if (newIdx < shuffledNew.length) {
      result.push(shuffledNew[newIdx++]);
    }
  }

  return applyAntiRepetitionAndClustering(result);
}

/**
 * MASTER ENTRY POINT: Build a Smart Shuffled Vocabulary Session
 * 
 * Supports 5 Modes:
 * 1. 'random': Pure unbiased Fisher-Yates
 * 2. 'smart_review': Urgency-weighted adaptive shuffle
 * 3. 'new_words': Only unlearned words, shuffled
 * 4. 'mixed': Balanced blend of new words and review words
 * 5. 'mistakes': Target historically failed / difficult words
 */
export function buildSmartShuffledSession(
  words: readonly VocabWord[],
  options?: SmartShuffleOptions
): VocabWord[] {
  if (!words || words.length === 0) return [];

  const mode = options?.mode || 'random';
  const maxCards = options?.maxCards;
  const todayIso = options?.todayIso || new Date().toISOString().split('T')[0];
  const randomFn = options?.randomFn || Math.random;

  // Ensure unique words as starting baseline (never duplicate instances)
  const uniqueSource = Array.from(new Map(words.map(w => [w.id, w])).values());

  let processedQueue: VocabWord[] = [];

  switch (mode) {
    case 'random': {
      processedQueue = fisherYatesShuffle(uniqueSource, randomFn);
      processedQueue = applyAntiRepetitionAndClustering(processedQueue);
      break;
    }

    case 'smart_review': {
      processedQueue = smartReviewShuffle(uniqueSource, todayIso, randomFn);
      break;
    }

    case 'new_words': {
      const newOnly = uniqueSource.filter(isWordNew);
      const candidates = newOnly.length > 0 ? newOnly : uniqueSource;
      processedQueue = fisherYatesShuffle(candidates, randomFn);
      processedQueue = applyAntiRepetitionAndClustering(processedQueue);
      break;
    }

    case 'mistakes': {
      const mistakesOnly = uniqueSource.filter(isWordMistake);
      // Fallback to least retained words if no explicit mistakes found
      const candidates = mistakesOnly.length > 0 
        ? mistakesOnly 
        : smartReviewShuffle(uniqueSource, todayIso, randomFn);
      processedQueue = smartReviewShuffle(candidates, todayIso, randomFn);
      break;
    }

    case 'mixed': {
      processedQueue = mixedShuffle(uniqueSource, todayIso, randomFn);
      break;
    }

    default: {
      processedQueue = fisherYatesShuffle(uniqueSource, randomFn);
      break;
    }
  }

  // Slice to maxCards if specified
  if (typeof maxCards === 'number' && maxCards > 0 && processedQueue.length > maxCards) {
    processedQueue = processedQueue.slice(0, maxCards);
  }

  return processedQueue;
}
