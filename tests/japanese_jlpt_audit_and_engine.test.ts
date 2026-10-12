import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { 
  systemJapaneseWordToVocabWord, 
  calculateNextReview, 
  computeMemoryLevel,
  buildUnifiedStudyQueues,
  SystemJapaneseJlptWord,
  UserWordProgress
} from '../src/lib/vocabEngine.js';

test('1. JAPANESE VOCABULARY DATASET INTEGRITY (7,847 words)', (t) => {
  const raw = fs.readFileSync('src/data/japaneseJlptWords.json', 'utf8');
  const words: SystemJapaneseJlptWord[] = JSON.parse(raw);

  assert.equal(words.length, 7847, 'Total word count must be exactly 7,847');

  const idSet = new Set<string>();
  let emptyTerm = 0;
  let emptyFurigana = 0;
  let emptyMeaning = 0;
  let emptyRomaji = 0;
  let emptyExample = 0;
  let emptyExampleTrans = 0;

  words.forEach(w => {
    assert.ok(!idSet.has(w.id), `ID must be unique: ${w.id}`);
    idSet.add(w.id);

    if (!w.term || !w.term.trim()) emptyTerm++;
    if (!w.furigana || !w.furigana.trim()) emptyFurigana++;
    if (!w.meaning || !w.meaning.trim()) emptyMeaning++;
    if (!w.romaji || !w.romaji.trim()) emptyRomaji++;
    if (!w.exampleSentence || !w.exampleSentence.trim()) emptyExample++;
    if (!w.exampleTranslation || !w.exampleTranslation.trim()) emptyExampleTrans++;
  });

  assert.equal(emptyTerm, 0, 'No words should have empty term');
  assert.equal(emptyFurigana, 0, 'No words should have empty furigana reading');
  assert.equal(emptyMeaning, 0, 'No words should have empty Vietnamese meaning');
  assert.equal(emptyRomaji, 0, 'No words should have empty romaji');
  assert.equal(emptyExample, 0, 'No words should have empty example sentence');
  assert.equal(emptyExampleTrans, 0, 'No words should have empty example translation');
});

test('2. HOMOGRAPHS & MULTIPLE READINGS INTEGRITY', (t) => {
  const raw = fs.readFileSync('src/data/japaneseJlptWords.json', 'utf8');
  const words: SystemJapaneseJlptWord[] = JSON.parse(raw);

  // Check homograph: 辛い (からい vs つらい)
  const karaiWords = words.filter(w => w.term === '辛い');
  assert.equal(karaiWords.length, 2, '辛い must have 2 distinct entries');
  const karai = karaiWords.find(w => w.furigana === 'からい');
  const tsurai = karaiWords.find(w => w.furigana === 'つらい');
  assert.ok(karai, '辛い (からい - spicy) must exist');
  assert.ok(tsurai, '辛い (つらい - painful/bitter) must exist');
  assert.notEqual(karai!.jlptLevel, tsurai!.jlptLevel, 'Levels must differ (N5 vs N3)');

  // Check homograph: 開く (あく vs ひらく)
  const hirakuWords = words.filter(w => w.term === '開く');
  assert.equal(hirakuWords.length, 2, '開く must have 2 distinct entries');
  const aku = hirakuWords.find(w => w.furigana === 'あく');
  const hiraku = hirakuWords.find(w => w.furigana === 'ひらく');
  assert.ok(aku, '開く (あく) must exist');
  assert.ok(hiraku, '開く (ひらく) must exist');
});

test('3. INITIAL STATE & MEMORY PYRAMID LEVEL (NEW WORDS START AT 0)', (t) => {
  const sampleWord: SystemJapaneseJlptWord = {
    id: 'ja_jlpt_5_1',
    index: 1,
    level: 'N5',
    jlptLevel: 5,
    term: '会う',
    furigana: 'あう',
    romaji: 'au',
    hanViet: 'HỘI',
    pos: 'Động từ',
    meaning: 'gặp gỡ',
    exampleSentence: '友達に会います。',
    exampleTranslation: 'Tôi gặp bạn bè.'
  };

  // Convert without prior progress (Fresh learner)
  const vocabWord = systemJapaneseWordToVocabWord(sampleWord);

  assert.equal(vocabWord.state, 'new', 'New word must have state "new"');
  assert.equal(vocabWord.repetitionCount, 0, 'New word repetitionCount must be 0');
  assert.equal(vocabWord.memoryLevel, 0, 'New word memoryLevel must be 0 (Chưa học)');
  assert.equal(vocabWord.intervalDays, 0, 'New word intervalDays must be 0');
  assert.equal(vocabWord.phonetic, 'あう', 'Phonetic must match furigana for accurate audio/flashcards');
});

test('4. SM-2 SPACED REPETITION STATE TRANSITIONS', (t) => {
  // Step A: First review with "Good" (rating 3)
  const r1 = calculateNextReview({
    rating: 3,
    repetitionCount: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    lapses: 0
  });

  assert.equal(r1.nextRepetitionCount, 1);
  assert.equal(r1.nextIntervalDays, 1);
  assert.equal(r1.nextState, 'reviewing');

  const levelAfterR1 = computeMemoryLevel(r1.nextRepetitionCount, r1.nextIntervalDays, r1.nextLapses);
  assert.equal(levelAfterR1, 1, 'Memory level becomes 1 after first successful recall');

  // Step B: Review with "Again" (rating 1 - Forgot)
  const rFail = calculateNextReview({
    rating: 1,
    repetitionCount: 3,
    easeFactor: 2.5,
    intervalDays: 7,
    lapses: 0
  });

  assert.equal(rFail.nextRepetitionCount, 0, 'Repetition streak resets on failure');
  assert.equal(rFail.nextIntervalDays, 1, 'Interval drops back to 1 day on failure');
  assert.equal(rFail.nextState, 'difficult', 'Word enters difficult state on failure');
  assert.equal(rFail.nextLapses, 1, 'Lapses count increments');

  const levelAfterFail = computeMemoryLevel(rFail.nextRepetitionCount, rFail.nextIntervalDays, rFail.nextLapses);
  assert.equal(levelAfterFail, 0, 'Memory level drops back to 0 on failure');
});

test('5. UNIFIED STUDY QUEUES WITH JAPANESE SOURCE', (t) => {
  const queues = buildUnifiedStudyQueues(
    [], // No personal words
    {}, // Fresh learner
    '3000', // System source
    undefined,
    'ja' // Active language is Japanese
  );

  assert.ok(queues.allWords.length > 0, 'Study queue must load Japanese system words');
  assert.equal(queues.newWords.length, queues.allWords.length, 'All unstudied words must be in newWords queue');
  assert.equal(queues.allWords[0].languageId, 'ja', 'Queue items must have languageId "ja"');
});
