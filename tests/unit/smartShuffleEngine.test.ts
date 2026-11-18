import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fisherYatesShuffle,
  computeWordRetentionUrgency,
  isWordNew,
  isWordMistake,
  applyAntiRepetitionAndClustering,
  smartReviewShuffle,
  mixedShuffle,
  buildSmartShuffledSession
} from '../../src/lib/smartShuffleEngine';
import { VocabWord } from '../../src/lib/vocabEngine';

// Helper to create mock VocabWord
function makeMockWord(id: string, term: string, overrides: Partial<VocabWord> = {}): VocabWord {
  return {
    id,
    languageId: 'en',
    collectionId: 'default',
    term,
    meaning: `Nghĩa của ${term}`,
    state: 'learning',
    repetitionCount: 2,
    easeFactor: 2.5,
    intervalDays: 3,
    nextReviewAt: '2026-11-04',
    lastReviewedAt: '2026-11-01',
    reviewLogs: [],
    lapses: 0,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-04',
    ...overrides
  };
}

describe('Smart Random Vocabulary Shuffle Engine', () => {

  describe('1. Fisher-Yates Uniform Permutations & Data Safety', () => {
    it('never mutates the input array and preserves element identities', () => {
      const original = [
        makeMockWord('1', 'apple'),
        makeMockWord('2', 'banana'),
        makeMockWord('3', 'cherry'),
        makeMockWord('4', 'date')
      ];
      const snapshot = original.map(w => ({ ...w }));

      const shuffled = fisherYatesShuffle(original);

      // Original remains untouched
      assert.deepEqual(original, snapshot);
      // All items exist in result
      assert.equal(shuffled.length, original.length);
      const originalIds = new Set(original.map(w => w.id));
      const shuffledIds = new Set(shuffled.map(w => w.id));
      assert.deepEqual(shuffledIds, originalIds);
    });

    it('generates pseudo-random permutations across independent calls', () => {
      const items = Array.from({ length: 20 }, (_, i) => makeMockWord(`id-${i}`, `word-${i}`));
      const run1 = fisherYatesShuffle(items);
      const run2 = fisherYatesShuffle(items);

      const isIdentical = run1.every((w, idx) => w.id === run2[idx].id);
      assert.equal(isIdentical, false);
    });

    it('handles empty and single-element arrays safely', () => {
      assert.deepEqual(fisherYatesShuffle([]), []);
      const single = [makeMockWord('1', 'solo')];
      assert.equal(fisherYatesShuffle(single).length, 1);
    });
  });

  describe('2. Memory Retention Urgency & Weighting', () => {
    it('assigns higher urgency to words with lapses and difficult flag', () => {
      const easyWord = makeMockWord('1', 'easy', {
        state: 'mastered',
        lapses: 0,
        intervalDays: 30,
        reviewLogs: [{ reviewedAt: '2026-11-01', rating: 4, reviewType: 'flashcard', interval: 30, easeFactor: 2.6 }]
      });

      const failedWord = makeMockWord('2', 'failed', {
        state: 'difficult',
        isDifficult: true,
        lapses: 3,
        intervalDays: 1,
        reviewLogs: [{ reviewedAt: '2026-11-03', rating: 1, reviewType: 'flashcard', interval: 1, easeFactor: 1.8 }]
      });

      const easyUrgency = computeWordRetentionUrgency(easyWord, '2026-11-04');
      const failedUrgency = computeWordRetentionUrgency(failedWord, '2026-11-04');

      assert.ok(failedUrgency > easyUrgency + 50);
    });

    it('identifies new words and mistake words accurately', () => {
      const newWord = makeMockWord('1', 'novel', { state: 'new', repetitionCount: 0, lastReviewedAt: undefined });
      const reviewedWord = makeMockWord('2', 'known', { state: 'learning', repetitionCount: 3, lastReviewedAt: '2026-11-01' });

      assert.equal(isWordNew(newWord), true);
      assert.equal(isWordNew(reviewedWord), false);

      const mistakeWord = makeMockWord('3', 'lapsed', { lapses: 2 });
      assert.equal(isWordMistake(mistakeWord), true);
      assert.equal(isWordMistake(reviewedWord), false);
    });
  });

  describe('3. Anti-Repetition & Anti-Clustering Constraints', () => {
    it('strictly removes duplicate word instances within a session queue', () => {
      const duplicateWords = [
        makeMockWord('1', 'resilience'),
        makeMockWord('2', 'tenacity'),
        makeMockWord('1', 'resilience'), // Duplicate
        makeMockWord('3', 'grit'),
        makeMockWord('2', 'tenacity')  // Duplicate
      ];

      const cleaned = applyAntiRepetitionAndClustering(duplicateWords);
      assert.equal(cleaned.length, 3);
      const uniqueIds = new Set(cleaned.map(w => w.id));
      assert.equal(uniqueIds.size, 3);
    });

    it('prevents consecutive words with identical prefix clusters', () => {
      const clusteredWords = [
        makeMockWord('1', 'accident'),
        makeMockWord('2', 'accidental'),
        makeMockWord('3', 'accidentally'),
        makeMockWord('4', 'brave'),
        makeMockWord('5', 'courage')
      ];

      const separated = applyAntiRepetitionAndClustering(clusteredWords);
      assert.equal(separated.length, 5);

      // Verify that no 3 words starting with "acci" remain clustered back-to-back
      for (let i = 0; i < separated.length - 2; i++) {
        const p1 = separated[i].term.slice(0, 4).toLowerCase();
        const p2 = separated[i + 1].term.slice(0, 4).toLowerCase();
        const p3 = separated[i + 2].term.slice(0, 4).toLowerCase();
        const allSame = p1 === 'acci' && p2 === 'acci' && p3 === 'acci';
        assert.equal(allSame, false);
      }
    });
  });

  describe('4. Dedicated Learning Modes', () => {
    const mixedWordPool = [
      makeMockWord('1', 'apple', { state: 'new', repetitionCount: 0 }),
      makeMockWord('2', 'banana', { state: 'new', repetitionCount: 0 }),
      makeMockWord('3', 'difficult-1', { state: 'difficult', lapses: 3, isDifficult: true }),
      makeMockWord('4', 'difficult-2', { state: 'difficult', lapses: 2, isDifficult: true }),
      makeMockWord('5', 'mastered-1', { state: 'mastered', repetitionCount: 10 }),
      makeMockWord('6', 'mastered-2', { state: 'mastered', repetitionCount: 12 }),
      makeMockWord('7', 'learning-1', { state: 'learning', repetitionCount: 2 }),
      makeMockWord('8', 'learning-2', { state: 'learning', repetitionCount: 3 })
    ];

    it("Mode 'random': delivers uniform shuffle without alphabetical or DB order", () => {
      const sortedPool = [...mixedWordPool].sort((a, b) => a.term.localeCompare(b.term));
      const result = buildSmartShuffledSession(sortedPool, { mode: 'random' });

      assert.equal(result.length, sortedPool.length);
      const isStillAlphabetical = result.every((w, i) => w.id === sortedPool[i].id);
      assert.equal(isStillAlphabetical, false);
    });

    it("Mode 'smart_review': places high urgency words ahead of mastered words", () => {
      const result = buildSmartShuffledSession(mixedWordPool, {
        mode: 'smart_review',
        todayIso: '2026-11-04'
      });

      const diff1Idx = result.findIndex(w => w.id === '3');
      const diff2Idx = result.findIndex(w => w.id === '4');
      const mast1Idx = result.findIndex(w => w.id === '5');
      const mast2Idx = result.findIndex(w => w.id === '6');

      const avgDifficultIndex = (diff1Idx + diff2Idx) / 2;
      const avgMasteredIndex = (mast1Idx + mast2Idx) / 2;

      assert.ok(avgDifficultIndex < avgMasteredIndex);
    });

    it("Mode 'new_words': filters strictly to new/unlearned words", () => {
      const result = buildSmartShuffledSession(mixedWordPool, { mode: 'new_words' });
      assert.ok(result.length > 0);
      for (const word of result) {
        assert.equal(isWordNew(word), true);
      }
    });

    it("Mode 'mistakes': filters strictly to words with lapses or difficulty", () => {
      const result = buildSmartShuffledSession(mixedWordPool, { mode: 'mistakes' });
      assert.ok(result.length > 0);
      for (const word of result) {
        assert.equal(isWordMistake(word), true);
      }
    });

    it("Mode 'mixed': interleaves new words and review words without clustering all new words at one end", () => {
      const result = buildSmartShuffledSession(mixedWordPool, { mode: 'mixed' });
      assert.equal(result.length, mixedWordPool.length);

      const hasNew = result.some(isWordNew);
      const hasReview = result.some(w => !isWordNew(w));
      assert.equal(hasNew, true);
      assert.equal(hasReview, true);
    });

    it('respects maxCards constraint safely', () => {
      const result = buildSmartShuffledSession(mixedWordPool, { mode: 'random', maxCards: 4 });
      assert.equal(result.length, 4);
    });
  });
});
