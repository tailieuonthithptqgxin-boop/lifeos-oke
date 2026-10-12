import fs from 'fs';
import path from 'path';

const filePath = 'src/data/japaneseJlptWords.json';
const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('--- STARTING FULL AUDIT OF JAPANESE JLPT VOCABULARY ---');
console.log(`Total words in database: ${words.length}`);

// 1. Check Field Completeness
const missingFields = {
  term: 0,
  furigana: 0,
  romaji: 0,
  hanViet: 0,
  pos: 0,
  meaning: 0,
  level: 0,
  jlptLevel: 0,
  exampleSentence: 0,
  exampleTranslation: 0
};

const wordsWithMissingFurigana = [];
const wordsWithMissingRomaji = [];
const wordsWithMissingMeaning = [];

words.forEach(w => {
  if (!w.term || !w.term.trim()) missingFields.term++;
  if (!w.furigana || !w.furigana.trim()) {
    missingFields.furigana++;
    wordsWithMissingFurigana.push(w);
  }
  if (!w.romaji || !w.romaji.trim()) {
    missingFields.romaji++;
    wordsWithMissingRomaji.push(w);
  }
  if (!w.hanViet || !w.hanViet.trim()) missingFields.hanViet++;
  if (!w.pos || !w.pos.trim()) missingFields.pos++;
  if (!w.meaning || !w.meaning.trim()) {
    missingFields.meaning++;
    wordsWithMissingMeaning.push(w);
  }
  if (!w.level) missingFields.level++;
  if (!w.jlptLevel) missingFields.jlptLevel++;
  if (!w.exampleSentence || !w.exampleSentence.trim()) missingFields.exampleSentence++;
  if (!w.exampleTranslation || !w.exampleTranslation.trim()) missingFields.exampleTranslation++;
});

console.log('\n1. Missing Fields Breakdown:', missingFields);

// 2. Reading & Kanji Validation
let kanjiWithoutFurigana = 0;
let furiganaMismatch = 0;
const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/;
const kanaRegex = /^[\u3040-\u309f\u30a0-\u30ff\u30fc\s・]+$/;

words.forEach(w => {
  const hasKanji = kanjiRegex.test(w.term);
  if (hasKanji && (!w.furigana || !kanaRegex.test(w.furigana))) {
    kanjiWithoutFurigana++;
  }
});
console.log(`\n2. Kanji Words with missing/invalid Kana reading: ${kanjiWithoutFurigana}`);

// 3. Duplicate Analysis
const idMap = new Map();
const duplicateIds = [];
const termMap = new Map();

words.forEach(w => {
  if (idMap.has(w.id)) duplicateIds.push(w.id);
  idMap.set(w.id, true);

  if (!termMap.has(w.term)) termMap.set(w.term, []);
  termMap.get(w.term).push(w);
});

let trueDuplicates = []; // Same term AND same reading AND same meaning
let homographs = [];     // Same term, but different reading or level or meaning

termMap.forEach((list, term) => {
  if (list.length > 1) {
    const readingSet = new Set(list.map(x => x.furigana));
    const levelSet = new Set(list.map(x => x.level));
    if (readingSet.size > 1 || levelSet.size > 1) {
      homographs.push({ term, count: list.length, items: list });
    } else {
      trueDuplicates.push({ term, count: list.length, items: list });
    }
  }
});

console.log(`\n3. Duplicate Analysis:`);
console.log(`- Duplicate IDs: ${duplicateIds.length}`);
console.log(`- Valid Homographs / Polysemy entries (different readings/levels): ${homographs.length}`);
console.log(`- True exact duplicates (same term, reading, level): ${trueDuplicates.length}`);

// 4. Example Translation Language
let englishTranslations = 0;
let vietnameseTranslations = 0;
const sampleEnglishTranslations = [];

words.forEach(w => {
  if (w.exampleTranslation && w.exampleTranslation.trim()) {
    // English indicator: contains English words without Vietnamese diacritics
    const isEn = /^[A-Za-z0-9\s,\.!\?'\-\"\(\)]+$/.test(w.exampleTranslation);
    if (isEn) {
      englishTranslations++;
      if (sampleEnglishTranslations.length < 5) {
        sampleEnglishTranslations.push({ term: w.term, ja: w.exampleSentence, en: w.exampleTranslation });
      }
    } else {
      vietnameseTranslations++;
    }
  }
});

console.log(`\n4. Example Sentence Translations:`);
console.log(`- In Vietnamese: ${vietnameseTranslations}`);
console.log(`- In English: ${englishTranslations}`);
console.log(`- Empty/Missing: ${missingFields.exampleTranslation}`);

// 5. JLPT Level Distribution
const levelDist = {};
words.forEach(w => {
  levelDist[w.level] = (levelDist[w.level] || 0) + 1;
});
console.log('\n5. JLPT Level Distribution:', levelDist);
