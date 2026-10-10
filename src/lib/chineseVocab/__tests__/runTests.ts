import { runChineseVocabTestSuite } from './chineseVocabSuite';

console.log('--- STARTING CHINESE VOCABULARY TEST SUITE ---');
const suite = runChineseVocabTestSuite();
console.log(`Passed: ${suite.passedTests} / ${suite.totalTests}`);
console.log(`All Passed: ${suite.allPassed ? 'YES ✓' : 'NO ✕'}`);

suite.results.forEach(r => {
  console.log(`[Test ${r.testId}] ${r.testName}: ${r.passed ? 'PASSED ✓' : 'FAILED ✕'} (${r.details})`);
});

if (!suite.allPassed) {
  process.exit(1);
} else {
  console.log('--- ALL 20 TESTS PASSED SUCCESSFULLY ---');
}
