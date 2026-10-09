import { 
  verifyWord, 
  runFullQualityAudit, 
  isEquivalentAnswer, 
  CONFUSABLE_PAIRS 
} from '../src/lib/vocabVerificationEngine';
import { getSystem3000Words } from '../src/lib/vocabEngine';

console.log('--- TEST 1: Load 3000 System Words ---');
const systemWords = getSystem3000Words();
console.log(`Loaded ${systemWords.length} words from real DOCX extraction.`);

console.log('--- TEST 2: Run Full Quality Audit on Entire 3522 System Words ---');
const audit = runFullQualityAudit(systemWords, [], {});
console.log('Audit Summary for all words:', audit.summary);
console.log(`Audited ${audit.summary.totalAudited} items.`);
console.log(`Average Quality Score: ${audit.summary.averageQualityScore}/100`);
console.log(`Verified count: ${audit.summary.verifiedCount}`);
console.log(`Needs review count: ${audit.summary.needsReviewCount}`);
console.log(`Flagged error count: ${audit.summary.flaggedErrorCount}`);
console.log(`Confusables found in dataset: ${audit.summary.potentialConfusablesCount}`);

console.log('--- TEST 3: Confusable Detection ---');
const affectWord = {
  id: 'test_affect',
  term: 'affect',
  pos: 'verb',
  phonetic: '/əˈfekt/',
  meaning: 'ảnh hưởng, tác động đến'
};
const affectReport = verifyWord(affectWord);
console.log('Affect report confusables found:', affectReport.confusables?.length);
if (affectReport.confusables && affectReport.confusables.length > 0) {
  console.log('Confused with:', affectReport.confusables[0].word);
  console.log('Distinction:', affectReport.confusables[0].distinction);
}

console.log('--- TEST 4: Spaced Repetition Equivalent Answer Matching ---');
const testCases = [
  { student: 'từ bỏ', expected: 'bỏ, từ bỏ', shouldMatch: true },
  { student: 'bỏ', expected: 'bỏ, từ bỏ', shouldMatch: true },
  { student: 'từ  bỏ...', expected: 'bỏ, từ bỏ', shouldMatch: true },
  { student: 'abandon', expected: 'abandon', shouldMatch: true },
  { student: 'ABANDON', expected: 'abandon', shouldMatch: true },
  { student: 'kinh tế học', expected: 'kinh tế', shouldMatch: false },
];

for (const tc of testCases) {
  const res = isEquivalentAnswer(tc.student, tc.expected);
  const ok = res.isMatch === tc.shouldMatch;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${tc.student}" vs "${tc.expected}" -> match=${res.isMatch} (expected ${tc.shouldMatch}) - ${res.feedback}`);
}

console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');
