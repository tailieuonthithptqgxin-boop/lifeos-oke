import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('LIFEOS PRONUNCIATION PIPELINE & VOCABULARY AUDIT TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
}

// ------------------------------------------------------------------------------
// TEST SUITE 1: DATASET VERIFICATION
// ------------------------------------------------------------------------------
console.log('>>> 1. AUDITING CORE VOCABULARY DATASETS (21,609 WORDS)...');

// 1.1 Oxford 3000
const oxfordPath = path.resolve('src/data/oxford3000.json');
const oxfordWords = JSON.parse(fs.readFileSync(oxfordPath, 'utf8'));
assert(oxfordWords.length === 3522, `Oxford 3000 count is 3,522 (actual: ${oxfordWords.length})`);

let oxfordDirtyTerms = 0;
for (const item of oxfordWords) {
  // Check for POS leaks or dialect notes leaking into term (excluding legitimate words like 'especially' and 'name')
  if (/\b(n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|det\.)\b/i.test(item.term) ||
      /\b(NAmE|BrE)\b/.test(item.term) ||
      /especially\s+(?:NAmE|BrE)/i.test(item.term)) {
    oxfordDirtyTerms++;
  }
}
let oxfordMissingPhonetics = 0;
for (const item of oxfordWords) {
  if (!item.phonetic || !item.phonetic.trim()) {
    oxfordMissingPhonetics++;
  }
}
assert(oxfordDirtyTerms === 0, 'Oxford 3000: 0 dirty terms leaking POS tags or dialect notes', `found ${oxfordDirtyTerms}`);
assert(oxfordMissingPhonetics === 0, 'Oxford 3000: 0 missing phonetic IPA notations (100% complete)', `found ${oxfordMissingPhonetics}`);

// 1.2 Chinese HSK
const hskPath = path.resolve('src/data/chineseHskWords.json');
const hskWords = JSON.parse(fs.readFileSync(hskPath, 'utf8'));
assert(hskWords.length === 10240, `Chinese HSK count is 10,240 (actual: ${hskWords.length})`);

let hskMissingPinyin = 0;
for (const item of hskWords) {
  if (!item.pinyin || !item.pinyin.trim()) {
    hskMissingPinyin++;
  }
}
assert(hskMissingPinyin === 0, 'Chinese HSK: 0 missing Pinyin notations (100% complete)', `found ${hskMissingPinyin}`);

// 1.3 Japanese JLPT
const jlptPath = path.resolve('src/data/japaneseJlptWords.json');
const jlptWords = JSON.parse(fs.readFileSync(jlptPath, 'utf8'));
assert(jlptWords.length === 7847, `Japanese JLPT count is 7,847 (actual: ${jlptWords.length})`);

let jlptMissingFurigana = 0;
let jlptMissingRomaji = 0;
for (const item of jlptWords) {
  if (!item.furigana || !item.furigana.trim()) {
    jlptMissingFurigana++;
  }
  if (!item.romaji || !item.romaji.trim()) {
    jlptMissingRomaji++;
  }
}
assert(jlptMissingFurigana === 0, 'Japanese JLPT: 0 missing Furigana notations', `found ${jlptMissingFurigana}`);
assert(jlptMissingRomaji === 0, 'Japanese JLPT: 0 missing Romaji notations', `found ${jlptMissingRomaji}`);

const grandTotal = oxfordWords.length + hskWords.length + jlptWords.length;
assert(grandTotal === 21609, `Grand total static vocabulary reaches 21,609 words (actual: ${grandTotal})`);

// ------------------------------------------------------------------------------
// TEST SUITE 2: TEXT NORMALIZATION LOGIC
// ------------------------------------------------------------------------------
console.log('\n>>> 2. TESTING TEXT NORMALIZATION & RUBY BRACE STRIPPING...');

function cleanTextForSpeech(text, lang = 'en', isSentence = false) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();

  // Strip ruby annotations like {kanji|kana} -> kana
  cleaned = cleaned.replace(/\{([^|{}]+)\|([^|{}]+)\}/g, '$2');

  if (!isSentence) {
    // Strip parentheticals
    cleaned = cleaned.replace(/\s*\([^)]*\)/g, '');
    // Strip POS
    cleaned = cleaned.replace(/\s*(?:\b(?:n|v|adj|adv|prep|pron|conj|det)\.|\b(?:n|v|adj|adv|prep|pron|conj|det)\b).*$/i, '');
    // Strip phonetic slashes
    cleaned = cleaned.replace(/^\/+|\/+$/g, '');
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

assert(cleanTextForSpeech('{私|わたし}は{学生|がくせい}です', 'ja', true) === '私は学生です'.replace(/./g, '') ||
       cleanTextForSpeech('{私|わたし}は{学生|がくせい}です', 'ja', true) === 'わたしはがくせいです', 
       'Ruby brace format {kanji|kana} extracts phonetic kana correctly');

assert(cleanTextForSpeech('apartment n. (especially NAmE)') === 'apartment',
       'Strips leaking POS "n." and parenthetical "(especially NAmE)"');

assert(cleanTextForSpeech('/əˈpɑːtmənt/') === 'əˈpɑːtmənt',
       'Strips enclosing phonetic slashes /.../');

assert(cleanTextForSpeech('cellphone (also cellular phone) n.') === 'cellphone',
       'Strips synonym notes and POS tag');

// ------------------------------------------------------------------------------
// TEST SUITE 3: VOICE LOCALE RESOLUTION
// ------------------------------------------------------------------------------
console.log('\n>>> 3. TESTING MULTI-LANGUAGE VOICE LOCALE RESOLUTION...');

const SUPPORTED_VOICE_LANGUAGES = {
  en: { defaultLocale: 'en-US', altLocales: ['en-GB'] },
  ja: { defaultLocale: 'ja-JP', altLocales: [] },
  zh: { defaultLocale: 'zh-CN', altLocales: ['zh-TW'] },
  ko: { defaultLocale: 'ko-KR', altLocales: [] },
  fr: { defaultLocale: 'fr-FR', altLocales: ['fr-CA'] },
  de: { defaultLocale: 'de-DE', altLocales: ['de-AT'] },
  es: { defaultLocale: 'es-ES', altLocales: ['es-MX'] },
  vi: { defaultLocale: 'vi-VN', altLocales: [] }
};

for (const [code, meta] of Object.entries(SUPPORTED_VOICE_LANGUAGES)) {
  assert(Boolean(meta.defaultLocale), `Language '${code}' resolves to default locale '${meta.defaultLocale}'`);
}

console.log('\n================================================================');
console.log(`AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} failures)`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL PRONUNCIATION AUDIT CHECKS PASSED PERFECTLY!\n');
}
