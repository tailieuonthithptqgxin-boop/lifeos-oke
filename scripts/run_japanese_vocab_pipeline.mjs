import fs from 'fs';
import path from 'path';
import { getHanVietForWord, mapPos, batchTranslate, SACH_100_OVERRIDES } from './build_japanese_vocab.mjs';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function processLevel(levelKey, levelNum, rawWords) {
  console.log(`\n========================================`);
  console.log(`Processing JLPT ${levelKey.toUpperCase()} (${rawWords.length} words)...`);
  console.log(`========================================`);

  const results = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < rawWords.length; i += BATCH_SIZE) {
    const chunk = rawWords.slice(i, i + BATCH_SIZE);
    
    // Check which words need translation vs override
    const textsToTranslate = [];
    const chunkIndices = [];

    chunk.forEach((w, idx) => {
      const term = w.word;
      if (SACH_100_OVERRIDES[term]) {
        // Already have exact Sách 100 translation
      } else {
        const enMeaning = (w.meanings && w.meanings.length > 0) ? w.meanings.slice(0, 2).join(', ') : '';
        textsToTranslate.push(enMeaning || w.word);
        chunkIndices.push(idx);
      }
    });

    let translatedMeanings = [];
    if (textsToTranslate.length > 0) {
      try {
        translatedMeanings = await batchTranslate(textsToTranslate);
      } catch (e) {
        console.warn(`Translation batch error at index ${i}:`, e.message);
        translatedMeanings = textsToTranslate;
      }
      await sleep(150); // Respect rate limit
    }

    let tIndex = 0;
    chunk.forEach((w, idx) => {
      const index = i + idx + 1;
      const term = w.word;
      const reading = w.reading || '';
      const romaji = w.romaji || '';
      const pos = mapPos(w.pos);
      
      let hanViet = '';
      let meaning = '';

      if (SACH_100_OVERRIDES[term]) {
        hanViet = SACH_100_OVERRIDES[term].hanViet || getHanVietForWord(term);
        meaning = SACH_100_OVERRIDES[term].meaning;
      } else {
        hanViet = getHanVietForWord(term);
        meaning = translatedMeanings[tIndex] || (w.meanings && w.meanings.join(', ')) || '';
        tIndex++;
      }

      // Cleanup meaning
      meaning = meaning.replace(/[\n\r]+/g, ' ').trim();

      const item = {
        id: `ja_jlpt_${levelNum}_${index}`,
        index,
        level: levelKey.toUpperCase(),
        jlptLevel: levelNum,
        term,
        furigana: reading,
        romaji,
        hanViet,
        pos,
        meaning,
        meaningEn: (w.meanings || []).join('; '),
        exampleSentence: w.examples?.[0]?.ja || '',
        exampleFurigana: w.examples?.[0]?.furigana || '',
        exampleTranslation: w.examples?.[0]?.en || ''
      };

      results.push(item);
    });

    process.stdout.write(`  [${levelKey.toUpperCase()}] Processed ${Math.min(i + BATCH_SIZE, rawWords.length)} / ${rawWords.length}\r`);
  }

  console.log(`\n  Completed ${levelKey.toUpperCase()}: ${results.length} words.`);
  return results;
}

async function main() {
  const levels = [
    { key: 'n5', num: 5 },
    { key: 'n4', num: 4 },
    { key: 'n3', num: 3 },
    { key: 'n2', num: 2 },
    { key: 'n1', num: 1 }
  ];

  let allWords = [];

  for (const lvl of levels) {
    const filePath = `src/data/raw_jlpt/${lvl.key}.json`;
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const processed = await processLevel(lvl.key, lvl.num, rawData);
    allWords.push(...processed);
  }

  // Also verify that all keys from SACH_100_OVERRIDES exist in allWords, if not prepend them
  const existingTerms = new Set(allWords.map(w => w.term));
  let extraCount = 0;
  for (const [term, data] of Object.entries(SACH_100_OVERRIDES)) {
    if (!existingTerms.has(term)) {
      allWords.unshift({
        id: `ja_sach100_${++extraCount}`,
        index: allWords.length + extraCount,
        level: 'N5',
        jlptLevel: 5,
        term,
        furigana: '',
        romaji: '',
        hanViet: data.hanViet,
        pos: 'Từ vựng',
        meaning: data.meaning,
        meaningEn: '',
        exampleSentence: '',
        exampleFurigana: '',
        exampleTranslation: ''
      });
    }
  }

  const outPath = 'src/data/japaneseJlptWords.json';
  fs.writeFileSync(outPath, JSON.stringify(allWords, null, 2), 'utf8');
  console.log(`\n========================================`);
  console.log(`SUCCESS! Generated ${allWords.length} Japanese JLPT vocabulary entries.`);
  console.log(`Saved to: ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`========================================\n`);
}

main().catch(console.error);
