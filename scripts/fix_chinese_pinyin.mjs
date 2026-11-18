import fs from 'fs';

const zhWords = JSON.parse(fs.readFileSync('src/data/chineseHskWords.json', 'utf8'));

const PINYIN_FIXES = {
  '摩擦': 'mócā',
  '停留': 'tíngliú',
  '西红柿': 'xīhóngshì',
  '信箱': 'xìnxiāng',
  '妙': 'miào',
  '陪同': 'péitóng'
};

let fixedCount = 0;
const updatedList = zhWords.map(w => {
  if (!w.pinyin && PINYIN_FIXES[w.term]) {
    fixedCount++;
    return {
      ...w,
      pinyin: PINYIN_FIXES[w.term]
    };
  }
  return w;
});

console.log(`Fixed missing Pinyin for ${fixedCount} words.`);
const stillMissing = updatedList.filter(w => !w.pinyin);
console.log(`Still missing Pinyin: ${stillMissing.length}`);

fs.writeFileSync('src/data/chineseHskWords.json', JSON.stringify(updatedList, null, 2), 'utf8');
console.log('Successfully updated src/data/chineseHskWords.json!');
