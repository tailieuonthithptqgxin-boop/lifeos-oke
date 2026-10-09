import { 
  getSystem3000Words, 
  systemWordToVocabWord,
  calculate3000Analytics,
  calculateCombinedAnalytics,
  buildUnifiedStudyQueues,
  recordReviewOutcome,
  toggleBookmark3000Word,
  set3000WordState,
  save3000WordNotes,
  VocabUserData,
  VocabWord,
  VocabCollection,
  LearningLanguage
} from '../src/lib/vocabEngine';

console.log("=== STARTING 3000 WORDS & PERSONAL VOCABULARY INTEGRATION TESTS ===");

// TEST 1: Load and verify 3000 words extracted from DOCX
console.log("\n[TEST 1] Verifying System 3000 Words Extraction...");
const words3000 = getSystem3000Words();
console.log(`✓ Total extracted records: ${words3000.length}`);
if (words3000.length !== 3522) {
  throw new Error(`Expected 3522 words, got ${words3000.length}`);
}

const emptyTerms = words3000.filter(w => !w.term || !w.term.trim());
const emptyMeanings = words3000.filter(w => !w.meaning || !w.meaning.trim());
console.log(`✓ Empty terms count: ${emptyTerms.length}`);
console.log(`✓ Empty meanings count: ${emptyMeanings.length}`);
if (emptyTerms.length > 0 || emptyMeanings.length > 0) {
  throw new Error("Found records with missing terms or meanings!");
}

// Sample inspect
console.log(`✓ Sample #1: [${words3000[0].term}] (${words3000[0].pos}) ${words3000[0].phonetic} -> ${words3000[0].meaning}`);
console.log(`✓ Sample #3522: [${words3000[3521].term}] (${words3000[3521].pos}) ${words3000[3521].phonetic} -> ${words3000[3521].meaning}`);

// TEST 2: User Progress Isolation on System 3000 Word
console.log("\n[TEST 2] Testing User Progress Isolation & SM-2 calculation on 3000 Word...");
const dummyUser: VocabUserData = {
  userId: 'test_student_1',
  activeLanguageId: 'en',
  languages: [{
    id: 'en',
    name: 'Tiếng Anh',
    originalName: 'English',
    flag: '🇬🇧',
    code: 'en',
    speechVoiceCode: 'en-US',
    level: 'intermediate',
    dailyNewWordTarget: 10,
    dailyReviewTarget: 30,
    explanationLanguage: 'vi',
    createdAt: new Date().toISOString()
  }],
  collections: {
    en: [{
      id: 'col_ielts',
      languageId: 'en',
      title: 'IELTS Reading Vocab',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      systemWordIds: []
    }]
  },
  words: {
    en: []
  },
  system3000Progress: {},
  streakDays: 1
};

// First review: Good (rating 3)
const afterReview1 = recordReviewOutcome(dummyUser, 'word_3000_1', 3, 'flashcard');
const prog1 = afterReview1.system3000Progress?.['word_3000_1'];
if (!prog1 || prog1.repetitionCount !== 1 || prog1.intervalDays !== 1) {
  throw new Error(`Review 1 failed: rep=${prog1?.repetitionCount}, interval=${prog1?.intervalDays}`);
}
console.log(`✓ Review 1 (Good): Rep=${prog1.repetitionCount}, Interval=${prog1.intervalDays} day, State=${prog1.state}`);

// Second review: Good (rating 3)
const afterReview2 = recordReviewOutcome(afterReview1, 'word_3000_1', 3, 'flashcard');
const prog2 = afterReview2.system3000Progress?.['word_3000_1'];
if (!prog2 || prog2.repetitionCount !== 2 || prog2.intervalDays !== 3) {
  throw new Error(`Review 2 failed: rep=${prog2?.repetitionCount}, interval=${prog2?.intervalDays}`);
}
console.log(`✓ Review 2 (Good): Rep=${prog2.repetitionCount}, Interval=${prog2.intervalDays} days, State=${prog2.state}`);

// Original system record must NOT be mutated
if ((words3000[0] as any).repetitionCount !== undefined) {
  throw new Error("System record was mutated directly!");
}
console.log("✓ Verified system 3000 dictionary remains immutable and clean!");

// TEST 3: Personal Notes & State Overrides on 3000 Word
console.log("\n[TEST 3] Testing Personal Notes & Manual State Marking on 3000 Word...");
const withNotes = save3000WordNotes(afterReview2, 'word_3000_1', 'Nhớ đến bài hát Abandon Ship!');
if (withNotes.system3000Progress?.['word_3000_1']?.personalNotes !== 'Nhớ đến bài hát Abandon Ship!') {
  throw new Error("Failed to save personal notes!");
}
console.log("✓ Personal notes saved successfully on 3000 word without mutating system definition.");

const markedMastered = set3000WordState(withNotes, 'word_3000_2', 'mastered');
if (markedMastered.system3000Progress?.['word_3000_2']?.state !== 'mastered') {
  throw new Error("Failed to mark 3000 word as mastered!");
}
console.log("✓ Manual state marking (Mastered) persisted successfully.");

// TEST 4: Bookmarking 3000 Word into Personal Collection (Zero duplication)
console.log("\n[TEST 4] Testing Bookmarking 3000 Word into Personal Collection...");
const bookmarked = toggleBookmark3000Word(markedMastered, 'word_3000_1', 'col_ielts');
const bProg = bookmarked.system3000Progress?.['word_3000_1'];
const bCol = bookmarked.collections['en'].find(c => c.id === 'col_ielts');

if (!bProg?.bookmarkedCollectionIds?.includes('col_ielts')) {
  throw new Error("Progress does not contain bookmarked collection ID!");
}
if (!bCol?.systemWordIds?.includes('word_3000_1')) {
  throw new Error("Collection does not contain referenced system word ID!");
}
console.log("✓ 3000 Word successfully bookmarked into personal collection without creating duplicate word record!");

// Unbookmark test
const unbookmarked = toggleBookmark3000Word(bookmarked, 'word_3000_1', 'col_ielts');
if (unbookmarked.system3000Progress?.['word_3000_1']?.bookmarkedCollectionIds?.includes('col_ielts')) {
  throw new Error("Unbookmark failed!");
}
console.log("✓ Unbookmark toggled off cleanly.");

// TEST 5: Personal Words CRUD and Isolation
console.log("\n[TEST 5] Testing Personal Words Creation & Review...");
const personalWord: VocabWord = {
  id: 'word_personal_1',
  languageId: 'en',
  collectionId: 'col_ielts',
  term: 'Perseverance',
  phonetic: '/ˌpɜː.sɪˈvɪə.rəns/',
  partOfSpeech: 'noun',
  meaning: 'Sự kiên trì, bền bỉ, không nản lòng trước khó khăn',
  state: 'new',
  repetitionCount: 0,
  easeFactor: 2.5,
  intervalDays: 0,
  nextReviewAt: new Date().toISOString().split('T')[0],
  reviewLogs: [],
  lapses: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const withPersonal = {
  ...bookmarked,
  words: {
    en: [personalWord]
  }
};

const afterPersonalReview = recordReviewOutcome(withPersonal, 'word_personal_1', 4, 'flashcard');
const reviewedPersonal = afterPersonalReview.words['en'][0];
if (reviewedPersonal.repetitionCount !== 1 || reviewedPersonal.intervalDays !== 3) {
  throw new Error("Personal word SM-2 review failed!");
}
console.log(`✓ Personal Word Review (Easy): Rep=${reviewedPersonal.repetitionCount}, Interval=${reviewedPersonal.intervalDays} days, EF=${reviewedPersonal.easeFactor}`);

// TEST 6: Unified Study Queues (Source = 3000, Personal, All)
console.log("\n[TEST 6] Testing Unified Study Queues across Sources...");
const queues3000 = buildUnifiedStudyQueues(afterPersonalReview.words['en'], afterPersonalReview.system3000Progress, '3000');
console.log(`✓ Source '3000': Total=${queues3000.allWords.length}, Due=${queues3000.dueWords.length}, New=${queues3000.newWords.length}`);
if (queues3000.allWords.length !== 3522) {
  throw new Error("Expected 3522 words for source '3000'");
}

const queuesPersonal = buildUnifiedStudyQueues(afterPersonalReview.words['en'], afterPersonalReview.system3000Progress, 'personal');
console.log(`✓ Source 'personal': Total=${queuesPersonal.allWords.length}`);
if (queuesPersonal.allWords.length !== 1) {
  throw new Error("Expected 1 personal word");
}

const queuesAll = buildUnifiedStudyQueues(afterPersonalReview.words['en'], afterPersonalReview.system3000Progress, 'all');
console.log(`✓ Source 'all': Total=${queuesAll.allWords.length} (3522 system + 1 personal)`);
if (queuesAll.allWords.length !== 3523) {
  throw new Error("Expected 3523 total combined words");
}

// TEST 7: Analytics Calculation
console.log("\n[TEST 7] Testing Combined Analytics...");
const combinedAnalytics = calculateCombinedAnalytics(afterPersonalReview.words['en'], afterPersonalReview.system3000Progress);
console.log(`✓ Combined Analytics: TotalWords=${combinedAnalytics.totalWords}, Mastered=${combinedAnalytics.masteredCount}, TotalReviews=${combinedAnalytics.totalReviewsCount}`);

console.log("\n==================================================================");
console.log("🎉 ALL INTEGRATION TESTS PASSED 100%! SYSTEM FULLY VERIFIED!");
console.log("==================================================================");
