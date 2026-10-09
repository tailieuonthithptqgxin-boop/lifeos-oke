import assert from 'node:assert';
import {
  calculateNextReview,
  buildStudyQueues,
  calculateLanguageAnalytics,
  exportWordsToCsv,
  parseWordsFromCsv,
  getInitialCollectionsAndWords,
  VocabWord
} from '../src/lib/vocabEngine';

console.log('--- STARTING VOCABULARY MASTER ENGINE TESTS ---');

// 1. SM-2 Spaced Repetition Calculations
console.log('Test 1: SM-2 Calculation logic');

// 1.1 Rating 1 (Again / Forgot completely)
const againResult = calculateNextReview({
  rating: 1,
  repetitionCount: 3,
  easeFactor: 2.5,
  intervalDays: 12,
  lapses: 0
});
assert.strictEqual(againResult.nextRepetitionCount, 0, 'Repetitions should reset to 0 on rating 1');
assert.strictEqual(againResult.nextIntervalDays, 1, 'Interval should be 1 day on rating 1');
assert.strictEqual(againResult.nextState, 'difficult', 'State should be difficult on rating 1');
assert.strictEqual(againResult.nextLapses, 1, 'Lapses should increase by 1');
assert.ok(againResult.nextEaseFactor < 2.5, 'Ease factor should decrease');
console.log('✓ Rating 1 (Again) correctly resets interval to 1 day and flags word as difficult');

// 1.2 Rating 3 (Good) on initial review
const goodInitial = calculateNextReview({
  rating: 3,
  repetitionCount: 0,
  easeFactor: 2.5,
  intervalDays: 0,
  lapses: 0
});
assert.strictEqual(goodInitial.nextRepetitionCount, 1, 'Repetitions should become 1');
assert.strictEqual(goodInitial.nextIntervalDays, 1, 'First interval should be 1 day');
assert.strictEqual(goodInitial.nextState, 'reviewing', 'State should be reviewing');
console.log('✓ Rating 3 (Good) on first review correctly sets 1-day interval');

// 1.3 Rating 3 (Good) on second review
const goodSecond = calculateNextReview({
  rating: 3,
  repetitionCount: 1,
  easeFactor: 2.5,
  intervalDays: 1,
  lapses: 0
});
assert.strictEqual(goodSecond.nextRepetitionCount, 2);
assert.strictEqual(goodSecond.nextIntervalDays, 3, 'Second interval should be 3 days');
console.log('✓ Rating 3 (Good) on second review advances interval to 3 days');

// 1.4 Rating 4 (Easy) consecutively -> advances to mastered
let wordState = {
  repetitionCount: 3,
  easeFactor: 2.5,
  intervalDays: 10,
  lapses: 0
};
const easyResult = calculateNextReview({
  rating: 4,
  ...wordState
});
assert.ok(easyResult.nextIntervalDays > 20, 'Easy rating should give bonus interval');
assert.strictEqual(easyResult.nextState, 'mastered', 'Word with repetitionCount >= 4 and interval >= 21 is mastered');
assert.ok(easyResult.nextEaseFactor > 2.5, 'Ease factor increases on easy rating');
console.log('✓ Rating 4 (Easy) grants bonus interval and graduates word to mastered state');

// 2. Queue building & Filtering
console.log('\nTest 2: Study Queues Building');
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const sampleWords: VocabWord[] = [
  {
    id: 'w1',
    languageId: 'en',
    collectionId: 'c1',
    term: 'Word Due Today',
    meaning: 'Nghĩa',
    state: 'reviewing',
    repetitionCount: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: today,
    reviewLogs: [],
    lapses: 0,
    createdAt: today,
    updatedAt: today
  },
  {
    id: 'w2',
    languageId: 'en',
    collectionId: 'c1',
    term: 'Word Due Yesterday',
    meaning: 'Nghĩa',
    state: 'reviewing',
    repetitionCount: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: yesterday,
    reviewLogs: [],
    lapses: 0,
    createdAt: today,
    updatedAt: today
  },
  {
    id: 'w3',
    languageId: 'en',
    collectionId: 'c1',
    term: 'Word Due Tomorrow',
    meaning: 'Nghĩa',
    state: 'reviewing',
    repetitionCount: 2,
    easeFactor: 2.5,
    intervalDays: 3,
    nextReviewAt: tomorrow,
    reviewLogs: [],
    lapses: 0,
    createdAt: today,
    updatedAt: today
  },
  {
    id: 'w4',
    languageId: 'en',
    collectionId: 'c1',
    term: 'New Word',
    meaning: 'Nghĩa',
    state: 'new',
    repetitionCount: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: today,
    reviewLogs: [],
    lapses: 0,
    createdAt: today,
    updatedAt: today
  },
  {
    id: 'w5',
    languageId: 'en',
    collectionId: 'c1',
    term: 'Difficult Word',
    meaning: 'Nghĩa',
    state: 'difficult',
    repetitionCount: 0,
    easeFactor: 1.8,
    intervalDays: 1,
    nextReviewAt: today,
    reviewLogs: [],
    lapses: 3,
    createdAt: today,
    updatedAt: today
  }
];

const queues = buildStudyQueues(sampleWords);
assert.strictEqual(queues.dueWords.length, 3, 'Should have 3 due words (yesterday, today, difficult)');
assert.strictEqual(queues.newWords.length, 1, 'Should have 1 new word');
assert.strictEqual(queues.difficultWords.length, 1, 'Should have 1 difficult word');
console.log('✓ Queues accurately partition due words, new words, and difficult words');

// 3. Analytics Calculation
console.log('\nTest 3: Language Analytics');
const analytics = calculateLanguageAnalytics(sampleWords);
assert.strictEqual(analytics.totalWords, 5);
assert.strictEqual(analytics.newWordsCount, 1);
assert.strictEqual(analytics.difficultCount, 1);
assert.strictEqual(analytics.dueTodayCount, 3);
console.log('✓ Analytics correctly aggregates vocabulary metrics');

// 4. CSV Export and Parse
console.log('\nTest 4: CSV Export & Parse');
const csv = exportWordsToCsv(sampleWords);
assert.ok(csv.includes('Word Due Today'));
const parsed = parseWordsFromCsv(csv, 'en', 'c1');
assert.strictEqual(parsed.length, 5, 'Should parse back 5 words from CSV');
assert.strictEqual(parsed[0].term, 'Word Due Today');
console.log('✓ CSV export & import roundtrips cleanly without corruption');

// 5. Initial Collections per Language
console.log('\nTest 5: Curated Starters');
const enStarter = getInitialCollectionsAndWords('en');
assert.ok(enStarter.collections.length > 0);
assert.ok(enStarter.words.length > 0);

const jaStarter = getInitialCollectionsAndWords('ja');
assert.ok(jaStarter.words.some(w => w.term === '桜'));

const zhStarter = getInitialCollectionsAndWords('zh');
assert.ok(zhStarter.words.some(w => w.term === '学习'));
console.log('✓ Curated starters for EN, JA, ZH are populated and valid');

console.log('\n========================================');
console.log('ALL VOCABULARY MASTER ENGINE TESTS PASSED!');
console.log('========================================');
