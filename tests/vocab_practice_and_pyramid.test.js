import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { vocabService } from '../src/backend/services/vocab.service.js';
import { 
  computeMemoryLevel, 
  calculateMemoryPyramid, 
  buildSmartReviewQueue 
} from '../src/lib/vocabEngine.js';
import { isEquivalentAnswer } from '../src/lib/vocabVerificationEngine.js';
import { getPrisma } from '../src/backend/db.js';

test('Vocab Practice Methods & Memory Pyramid Comprehensive Test Suite', async (t) => {
  const prisma = getPrisma();
  const testRunId = Date.now().toString(36);
  const testUserEmail = `vocab_test_${testRunId}@test.com`;

  let testUser;

  await t.test('1. Setup Test User in Database', async () => {
    testUser = await prisma.user.create({
      data: {
        name: 'Vocab Test User',
        email: testUserEmail,
        passwordHash: 'dummy_hash',
        role: 'USER',
        plan: 'FREE'
      }
    });
    assert.ok(testUser.id, 'Test user must be created in DB');
  });

  await t.test('2. Method 1: Flashcard Anh -> Việt (Active Recall & Memory Level 1)', async () => {
    const res = await vocabService.recordReview(testUser.id, {
      wordId: `test_word_1_${testRunId}`,
      languageId: 'en',
      term: 'resilient',
      meaning: 'kiên cường, có khả năng phục hồi',
      phonetic: '/rɪˈzɪl.jənt/',
      partOfSpeech: 'adjective',
      exerciseType: 'flashcard',
      rating: 3, // Good
      isCorrect: true,
      responseTimeMs: 3200
    });

    assert.equal(res.isCorrect, true);
    assert.equal(res.memoryLevelAfter, 1, 'First successful review should advance to Level 1 (Mới học)');
    assert.equal(res.repetitionCount, 1);
    assert.equal(res.intervalAfter, 1);
  });

  await t.test('3. Method 2: Flashcard Đảo Chiều Việt -> Anh (Advance to Level 2)', async () => {
    const res = await vocabService.recordReview(testUser.id, {
      wordId: `test_word_1_${testRunId}`,
      languageId: 'en',
      term: 'resilient',
      meaning: 'kiên cường, có khả năng phục hồi',
      phonetic: '/rɪˈzɪl.jənt/',
      partOfSpeech: 'adjective',
      exerciseType: 'flashcard_reverse',
      rating: 3, // Good
      isCorrect: true,
      responseTimeMs: 4500
    });

    assert.equal(res.isCorrect, true);
    assert.equal(res.memoryLevelAfter, 2, 'Second recall should advance to Level 2 (Đang ghi nhớ)');
    assert.equal(res.repetitionCount, 2);
    assert.equal(res.intervalAfter, 3);
  });

  await t.test('4. Method 3: Trắc nghiệm 4 đáp án (Quiz) - Correct & Wrong Logic', async () => {
    // 4.1 Answer validation
    const correctAnswer = 'kiên cường, có khả năng phục hồi';
    const wrongAnswer = 'yếu đuối, mỏng manh';
    const checkCorrect = isEquivalentAnswer(correctAnswer, correctAnswer);
    const checkWrong = isEquivalentAnswer(wrongAnswer, correctAnswer);
    assert.equal(checkCorrect.isMatch, true, 'Correct option must match');
    assert.equal(checkWrong.isMatch, false, 'Wrong option must not match');

    // 4.2 Record quiz review advancing to Level 3
    const res = await vocabService.recordReview(testUser.id, {
      wordId: `test_word_1_${testRunId}`,
      languageId: 'en',
      term: 'resilient',
      meaning: correctAnswer,
      phonetic: '/rɪˈzɪl.jənt/',
      partOfSpeech: 'adjective',
      exerciseType: 'quiz',
      rating: 4, // Easy
      isCorrect: true,
      responseTimeMs: 1800
    });

    assert.equal(res.isCorrect, true);
    assert.equal(res.memoryLevelAfter, 3, 'Third recall with Easy rating should advance to Level 3 (Nhớ khá)');
    assert.ok(res.intervalAfter >= 7, 'Interval should expand to at least 7 days');
  });

  await t.test('5. Method 4: Luyện gõ chính tả (Spelling) - Case & Whitespace Tolerance', async () => {
    // 5.1 Text normalization check
    const rawInput = '   Resilient   ';
    const targetTerm = 'resilient';
    const checkSpelling = isEquivalentAnswer(rawInput.trim().toLowerCase(), targetTerm);
    assert.equal(checkSpelling.isMatch, true, 'Spelling check must tolerate leading/trailing spaces and mixed case');

    // 5.2 Failure scenario: wrong spelling resets repetition and demotes level
    const failRes = await vocabService.recordReview(testUser.id, {
      wordId: `test_word_1_${testRunId}`,
      languageId: 'en',
      term: 'resilient',
      meaning: 'kiên cường',
      phonetic: '/rɪˈzɪl.jənt/',
      partOfSpeech: 'adjective',
      exerciseType: 'spelling',
      rating: 1, // Again
      isCorrect: false,
      responseTimeMs: 5000
    });

    assert.equal(failRes.isCorrect, false);
    assert.equal(failRes.lapses, 1, 'Lapses must increment on failure');
    assert.equal(failRes.repetitionCount, 0, 'Repetition streak must reset');
    assert.equal(failRes.intervalAfter, 1, 'Interval must reset to 1 day');
  });

  await t.test('6. Memory Pyramid Calculations & Smart Review Prioritization', async () => {
    const mockWords = [
      { id: 'w0', term: 'alpha', meaning: 'a', repetitionCount: 0, intervalDays: 0, lapses: 0, state: 'new' },
      { id: 'w1', term: 'bravo', meaning: 'b', repetitionCount: 1, intervalDays: 1, lapses: 0, state: 'learning' },
      { id: 'w2', term: 'charlie', meaning: 'c', repetitionCount: 2, intervalDays: 4, lapses: 0, state: 'learning' },
      { id: 'w3', term: 'delta', meaning: 'd', repetitionCount: 3, intervalDays: 10, lapses: 0, state: 'reviewing' },
      { id: 'w4', term: 'echo', meaning: 'e', repetitionCount: 4, intervalDays: 20, lapses: 0, state: 'reviewing' },
      { id: 'w5', term: 'foxtrot', meaning: 'f', repetitionCount: 6, intervalDays: 35, lapses: 0, state: 'mastered' },
      { id: 'w_weak', term: 'golf', meaning: 'g', repetitionCount: 2, intervalDays: 1, lapses: 3, state: 'difficult', incorrectCount: 4, correctCount: 1 }
    ];

    const pyramid = calculateMemoryPyramid(mockWords);
    assert.equal(pyramid.total, 7);
    assert.equal(pyramid.level0_new, 1, 'Level 0 must be 1');
    assert.equal(pyramid.level1_learning, 1, 'Level 1 must be 1');
    assert.equal(pyramid.level2_uncertain, 2, 'Level 2 must be 2 (including lapsed word)');
    assert.equal(pyramid.level3_good, 1, 'Level 3 must be 1');
    assert.equal(pyramid.level4_strong, 1, 'Level 4 must be 1');
    assert.equal(pyramid.level5_mastered, 1, 'Level 5 must be 1');

    // Smart Queue priority
    const smartQueue = buildSmartReviewQueue(mockWords);
    assert.equal(smartQueue[0].id, 'w_weak', 'Highest lapse word must be priority #1 in smart review queue');
  });

  await t.test('7. Database Learning History Verification', async () => {
    const history = await vocabService.getLearningHistory(testUser.id, 10);
    assert.ok(history.logs.length >= 4, 'Must have at least 4 recorded review logs in PostgreSQL');
    assert.ok(history.groupedByDate, 'Must have grouped logs by date');
  });

  await t.test('8. Teardown Test Data', async () => {
    await prisma.user.delete({ where: { id: testUser.id } });
  });
});
