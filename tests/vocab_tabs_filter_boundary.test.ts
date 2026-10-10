import test from 'node:test';
import assert from 'node:assert/strict';

// Data types matching our interfaces
interface System3000Word {
  id: string;
  term: string;
  pos: string;
  meaning: string;
}

interface SystemChineseHskWord {
  id: string;
  term: string;
  pinyin: string;
  pos: string;
  meaning: string;
  hskLevel: number;
}

interface UserWordProgress {
  wordId: string;
  state: 'new' | 'learning' | 'reviewing' | 'mastered' | 'difficult';
  repetitionCount: number;
}

// Emulate filtering logic from Oxford3000Tab
function filterOxford3000Words(
  systemWords: System3000Word[] = [],
  searchTerm: string = '',
  selectedLetter: string = 'TẤT CẢ',
  posFilter: string = 'all'
): System3000Word[] {
  // Must never crash even if called directly
  const safeWords = systemWords || [];
  return safeWords.filter(w => {
    if (!w || !w.term) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchTerm = w.term.toLowerCase().includes(q);
      const matchMeaning = (w.meaning || '').toLowerCase().includes(q);
      if (!matchTerm && !matchMeaning) return false;
    }
    if (selectedLetter !== 'TẤT CẢ') {
      const first = w.term.trim().charAt(0).toUpperCase();
      if (first !== selectedLetter) return false;
    }
    if (posFilter !== 'all') {
      if (!w.pos || !w.pos.toLowerCase().includes(posFilter.toLowerCase())) return false;
    }
    return true;
  });
}

// Emulate filtering logic from ChineseHskTab
function filterChineseHskWords(
  systemWords: SystemChineseHskWord[] = [],
  selectedLevel: number = 0,
  searchTerm: string = '',
  posFilter: string = 'all'
): SystemChineseHskWord[] {
  // Must never crash even if called directly
  const safeWords = systemWords || [];
  return safeWords.filter(w => {
    if (!w || !w.term) return false;
    if (selectedLevel > 0) {
      if (selectedLevel === 7) {
        if (w.hskLevel < 7) return false;
      } else if (w.hskLevel !== selectedLevel) {
        return false;
      }
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchTerm = w.term.toLowerCase().includes(q);
      const matchPinyin = (w.pinyin || '').toLowerCase().includes(q);
      const matchMeaning = (w.meaning || '').toLowerCase().includes(q);
      if (!matchTerm && !matchPinyin && !matchMeaning) return false;
    }
    if (posFilter !== 'all') {
      if (!w.pos || !w.pos.toLowerCase().includes(posFilter.toLowerCase())) return false;
    }
    return true;
  });
}

test('Boundary Test: Oxford3000 filter behavior across edge cases', async (t) => {
  await t.test('1. Normal response: filters correctly', () => {
    const words: System3000Word[] = [
      { id: '1', term: 'apple', pos: 'n.', meaning: 'quả táo' },
      { id: '2', term: 'run', pos: 'v.', meaning: 'chạy' },
      { id: '3', term: 'brave', pos: 'adj.', meaning: 'dũng cảm' }
    ];
    const res = filterOxford3000Words(words, 'táo');
    assert.equal(res.length, 1);
    assert.equal(res[0].term, 'apple');
  });

  await t.test('2. Empty data: returns empty array without throwing', () => {
    const res = filterOxford3000Words([], 'test');
    assert.deepEqual(res, []);
  });

  await t.test('3. Undefined boundary: default parameter guard prevents TypeError', () => {
    // When component receives undefined props
    const res = filterOxford3000Words(undefined as any, 'test');
    assert.deepEqual(res, []);
  });

  await t.test('4. Malformed array entries: safely handles null or undefined items', () => {
    const words: any[] = [
      null,
      undefined,
      { id: '1', term: 'focus', pos: 'v.', meaning: 'tập trung' },
      {}
    ];
    const res = filterOxford3000Words(words, 'focus');
    assert.equal(res.length, 1);
    assert.equal(res[0].term, 'focus');
  });
});

test('Boundary Test: ChineseHskTab filter behavior across edge cases', async (t) => {
  await t.test('1. Normal response: filters correctly by HSK level and search query', () => {
    const words: SystemChineseHskWord[] = [
      { id: 'zh_1', term: '爱', pinyin: 'ài', pos: 'động từ', meaning: 'yêu', hskLevel: 1 },
      { id: 'zh_2', term: '学习', pinyin: 'xuéxí', pos: 'động từ', meaning: 'học tập', hskLevel: 2 },
      { id: 'zh_3', term: '哲学', pinyin: 'zhéxué', pos: 'danh từ', meaning: 'triết học', hskLevel: 7 }
    ];
    const resHsk1 = filterChineseHskWords(words, 1);
    assert.equal(resHsk1.length, 1);
    assert.equal(resHsk1[0].term, '爱');

    const resHsk7Plus = filterChineseHskWords(words, 7);
    assert.equal(resHsk7Plus.length, 1);
    assert.equal(resHsk7Plus[0].term, '哲学');
  });

  await t.test('2. Empty data: returns empty array without throwing', () => {
    const res = filterChineseHskWords([], 1);
    assert.deepEqual(res, []);
  });

  await t.test('3. Undefined boundary: default parameter guard prevents TypeError', () => {
    const res = filterChineseHskWords(undefined as any, 1);
    assert.deepEqual(res, []);
  });

  await t.test('4. Malformed response: safely ignores corrupted items', () => {
    const words: any[] = [
      null,
      { id: 'zh_1', term: '猫', pinyin: 'māo', pos: 'danh từ', meaning: 'con mèo', hskLevel: 1 }
    ];
    const res = filterChineseHskWords(words, 1);
    assert.equal(res.length, 1);
    assert.equal(res[0].term, '猫');
  });
});
