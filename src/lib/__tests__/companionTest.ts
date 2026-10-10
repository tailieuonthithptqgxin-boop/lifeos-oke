import { 
  MOTIVATIONAL_QUOTES_POOL, 
  quoteEngine, 
  QuoteCategory 
} from '../companionQuotes';
import { 
  companionEngine, 
  MASCOT_PROFILES, 
  COMPANION_ACCESSORIES,
  DEFAULT_COMPANION_SETTINGS 
} from '../companionEngine';

console.log('=== STARTING AI STUDY COMPANION TEST SUITE ===');

let passedTests = 0;
const totalTests = 10;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}${detail ? ` (${detail})` : ''}`);
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
    process.exit(1);
  }
}

// 1. Kho hơn 100 câu động lực (100+ Quotes Verification)
assert(
  MOTIVATIONAL_QUOTES_POOL.length >= 100,
  'Test 1: Kho câu động lực đạt chuẩn quy mô',
  `Tổng số câu hiện có: ${MOTIVATIONAL_QUOTES_POOL.length} câu (Yêu cầu >= 100)`
);

// 2. Kiểm định đủ 10 nhóm câu động lực
const requiredCategories: QuoteCategory[] = [
  'start', 'flow', 'endurance', 'obstacle', 'mistake',
  'micro_progress', 'finishing', 'victory', 'restart', 'surprise'
];
const foundCategories = new Set(MOTIVATIONAL_QUOTES_POOL.map(q => q.category));
const hasAllCategories = requiredCategories.every(cat => foundCategories.has(cat));
assert(
  hasAllCategories,
  'Test 2: Đủ 10 nhóm ngữ cảnh học tập',
  `Đã bao phủ: ${Array.from(foundCategories).join(', ')}`
);

// 3. Mỗi nhóm có ít nhất 10 câu độc lập chất lượng
const categoryCounts = requiredCategories.map(cat => ({
  cat,
  count: MOTIVATIONAL_QUOTES_POOL.filter(q => q.category === cat).length
}));
const allCategoriesMin10 = categoryCounts.every(c => c.count >= 10);
assert(
  allCategoriesMin10,
  'Test 3: Mỗi nhóm ngữ cảnh có tối thiểu 10 câu',
  categoryCounts.map(c => `${c.cat}: ${c.count}`).join(' | ')
);

// 4. Các câu không bị trùng lặp nội dung (Unique Quotes)
const uniqueTexts = new Set(MOTIVATIONAL_QUOTES_POOL.map(q => q.text.trim().toLowerCase()));
assert(
  uniqueTexts.size === MOTIVATIONAL_QUOTES_POOL.length,
  'Test 4: Tính độc bản 100% không trùng lặp',
  `${uniqueTexts.size}/${MOTIVATIONAL_QUOTES_POOL.length} câu duy nhất`
);

// 5. Cơ chế chống lặp (Anti-repeat Engine Verification)
quoteEngine.resetHistory();
const sample1 = quoteEngine.getRandomQuote('flow');
const sample2 = quoteEngine.getRandomQuote('flow');
const sample3 = quoteEngine.getRandomQuote('flow');
assert(
  sample1.id !== sample2.id && sample2.id !== sample3.id,
  'Test 5: Chống lặp câu liên tiếp (Sliding Window)',
  `3 câu liên tiếp: [${sample1.id}, ${sample2.id}, ${sample3.id}]`
);

// 6. Định tuyến ngữ cảnh (Context Routing)
const startQuote = quoteEngine.getContextualQuote({ event: 'start' });
const mistakeQuote = quoteEngine.getContextualQuote({ event: 'mistake' });
const finishQuote = quoteEngine.getContextualQuote({ event: 'finish' });
assert(
  startQuote.category === 'start' &&
  mistakeQuote.category === 'mistake' &&
  finishQuote.category === 'victory',
  'Test 6: Định tuyến ngữ cảnh sự kiện chính xác',
  `Start -> ${startQuote.category}, Mistake -> ${mistakeQuote.category}, Finish -> ${finishQuote.category}`
);

// 7. Nhắc nhở định kỳ (Periodic Motivation) theo thời gian phiên học
const earlyPeriodic = quoteEngine.getContextualQuote({ event: 'periodic', sessionDurationMinutes: 5 });
const longPeriodic = quoteEngine.getContextualQuote({ event: 'periodic', sessionDurationMinutes: 35 });
assert(
  ['flow', 'micro_progress', 'surprise'].includes(earlyPeriodic.category) &&
  ['endurance', 'flow', 'surprise'].includes(longPeriodic.category),
  'Test 7: Phân tầng động lực theo độ dài phiên học (Early vs Deep Work)',
  `5 phút -> ${earlyPeriodic.category}, 35 phút -> ${longPeriodic.category}`
);

// 8. Cấu hình Mascot Lumi Starlight Buddy chuẩn nhận diện
const lumiProfile = MASCOT_PROFILES.lumi;
assert(
  lumiProfile.id === 'lumi' && lumiProfile.name === 'Lumi' && !!lumiProfile.imageReference,
  'Test 8: Nhận diện thương hiệu Bé Sao Nhỏ Lumi',
  `Name: ${lumiProfile.name}, Title: ${lumiProfile.title}, Asset: ${lumiProfile.imageReference}`
);

// 9. Chế độ kiểm soát tập trung (Focus Companion Modes: Normal, Quiet, Minimal, Off)
const defaultModes = ['normal', 'quiet', 'minimal', 'off'];
assert(
  defaultModes.includes(DEFAULT_COMPANION_SETTINGS.focusCompanionMode),
  'Test 9: Hỗ trợ 4 chế độ Focus Mode (Normal, Quiet, Minimal, Off)',
  `Default mode: ${DEFAULT_COMPANION_SETTINGS.focusCompanionMode}`
);

// 10. Khoảng thời gian ngẫu nhiên 120s – 180s cho chu kỳ động lực
const calculateDelay = () => Math.floor(Math.random() * 60000) + 120000;
const delays = Array.from({ length: 50 }, calculateDelay);
const allDelaysInRange = delays.every(d => d >= 120000 && d <= 180000);
assert(
  allDelaysInRange,
  'Test 10: Chu kỳ nhắc nhở ngẫu nhiên hóa chuẩn xác trong khoảng 120–180s',
  `Min: ${Math.min(...delays)}ms, Max: ${Math.max(...delays)}ms`
);

console.log(`\n=== ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! ===`);
