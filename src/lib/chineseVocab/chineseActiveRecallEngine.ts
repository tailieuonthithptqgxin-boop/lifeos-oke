// ==============================================================================
// CHINESE VOCABULARY MASTER — ACTIVE RECALL ENGINE
// ==============================================================================
// 7 Multi-dimensional Recall Formats:
// 1. Hanzi -> Meaning
// 2. Meaning -> Hanzi
// 3. Pinyin -> Hanzi
// 4. Hanzi -> Pinyin
// 5. Audio Listening -> Hanzi
// 6. Fill in the Blank (Cloze in Context Sentence)
// 7. Context Recall

import { ChineseWord, ActiveRecallMode, ChineseRecallQuestion } from './types';

/**
 * Generate a randomized pool of questions for Active Recall practice
 */
export function generateChineseRecallQuestions(
  targetWords: ChineseWord[],
  allPoolWords: ChineseWord[],
  mode: ActiveRecallMode = 'hanzi_to_meaning',
  questionCount: number = 10
): ChineseRecallQuestion[] {
  if (!targetWords || targetWords.length === 0) return [];

  // Shuffle target words
  const shuffledTargets = [...targetWords].sort(() => Math.random() - 0.5).slice(0, questionCount);

  return shuffledTargets.map((word, index) => {
    // Pick 3 distractors from same HSK level if possible
    const sameLevelPool = allPoolWords.filter(w => w.id !== word.id && (w.hskLevel === word.hskLevel || allPoolWords.length < 10));
    const distractors = [...(sameLevelPool.length >= 3 ? sameLevelPool : allPoolWords.filter(w => w.id !== word.id))]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    return createQuestionForWord(word, distractors, mode, index + 1);
  });
}

function createQuestionForWord(
  target: ChineseWord,
  distractors: ChineseWord[],
  mode: ActiveRecallMode,
  index: number
): ChineseRecallQuestion {
  const id = `recall_q_${target.id}_${index}_${Date.now()}`;

  switch (mode) {
    case 'meaning_to_hanzi': {
      const options = [target.term, ...distractors.map(d => d.term)].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(target.term);
      return {
        id,
        wordId: target.id,
        mode,
        prompt: target.meaning,
        promptSub: `Từ loại: ${target.pos} • Cấp độ: ${target.levelLabel}`,
        options,
        correctOptionIndex: correctIdx,
        answer: target.term,
        pinyinAnswer: target.pinyin,
        hint: `Pinyin gợi ý: ${target.pinyin}`
      };
    }

    case 'pinyin_to_hanzi': {
      const options = [target.term, ...distractors.map(d => d.term)].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(target.term);
      return {
        id,
        wordId: target.id,
        mode,
        prompt: target.pinyin,
        promptSub: `Nghĩa gợi ý: ${target.meaning}`,
        options,
        correctOptionIndex: correctIdx,
        answer: target.term,
        pinyinAnswer: target.pinyin,
        hint: `Nét nghĩa: ${target.meaning}`
      };
    }

    case 'hanzi_to_pinyin': {
      const options = [target.pinyin, ...distractors.map(d => d.pinyin)].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(target.pinyin);
      return {
        id,
        wordId: target.id,
        mode,
        prompt: target.term,
        promptSub: `Nghĩa: ${target.meaning}`,
        options,
        correctOptionIndex: correctIdx,
        answer: target.pinyin,
        pinyinAnswer: target.pinyin,
        hint: `Từ này thuộc ${target.pos}`
      };
    }

    case 'audio_to_hanzi': {
      const options = [target.term, ...distractors.map(d => d.term)].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(target.term);
      return {
        id,
        wordId: target.id,
        mode,
        prompt: '🔊 Nghe phát âm và chọn Hán tự chính xác',
        promptSub: `Nghĩa: ${target.meaning}`,
        options,
        correctOptionIndex: correctIdx,
        answer: target.term,
        pinyinAnswer: target.pinyin,
        hint: `Pinyin: ${target.pinyin}`
      };
    }

    case 'fill_in_blank': {
      const ex = target.exampleSentence || `${target.term} 是很有用的词。`;
      const clozeSentence = ex.replace(new RegExp(target.term, 'g'), ' [ ___ ] ');
      const options = [target.term, ...distractors.map(d => d.term)].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(target.term);
      return {
        id,
        wordId: target.id,
        mode,
        prompt: clozeSentence,
        promptSub: target.exampleTranslation || `Điền từ thích hợp mang nghĩa: "${target.meaning}"`,
        options,
        correctOptionIndex: correctIdx,
        answer: target.term,
        pinyinAnswer: target.pinyin,
        hint: `Pinyin cần điền: ${target.pinyin}`
      };
    }

    case 'context_recall': {
      const options = [target.term, ...distractors.map(d => d.term)].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(target.term);
      return {
        id,
        wordId: target.id,
        mode,
        prompt: `Trong ngữ cảnh giao tiếp: Để diễn đạt nghĩa "${target.meaning}", người bản ngữ sử dụng từ nào?`,
        promptSub: `Từ loại: ${target.pos}`,
        options,
        correctOptionIndex: correctIdx,
        answer: target.term,
        pinyinAnswer: target.pinyin,
        hint: `Phiên âm: ${target.pinyin}`
      };
    }

    case 'hanzi_to_meaning':
    default: {
      const options = [target.meaning, ...distractors.map(d => d.meaning)].sort(() => Math.random() - 0.5);
      const correctIdx = options.indexOf(target.meaning);
      return {
        id,
        wordId: target.id,
        mode: 'hanzi_to_meaning',
        prompt: target.term,
        promptSub: `Pinyin: ${target.pinyin} • ${target.pos}`,
        options,
        correctOptionIndex: correctIdx,
        answer: target.meaning,
        pinyinAnswer: target.pinyin,
        hint: `Phát âm: ${target.pinyin}`
      };
    }
  }
}
