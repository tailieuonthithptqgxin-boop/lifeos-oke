// ==============================================================================
// VOCABULARY MASTER — CORE ENGINE & SPACED REPETITION (SM-2)
// ==============================================================================
// Language-First Architecture supporting unlimited languages, Spaced Repetition,
// Active Recall, Contextual Learning, and User Data Isolation.

export type MasteryState = 'new' | 'learning' | 'reviewing' | 'mastered' | 'difficult';

export interface LearningLanguage {
  id: string;
  name: string;
  originalName: string;
  flag: string;
  code: string;
  speechVoiceCode: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  dailyNewWordTarget: number;
  dailyReviewTarget: number;
  explanationLanguage: string;
  createdAt: string;
}

import oxford3000Raw from '../data/oxford3000.json';
import chineseHskRaw from '../data/chineseHskWords.json';
import japaneseJlptRaw from '../data/japaneseJlptWords.json';

export interface System3000Word {
  id: string; // e.g. "word_3000_1"
  index: number;
  term: string;
  pos: string;
  phonetic: string;
  meaning: string;
  raw?: string;
}

export interface SystemChineseHskWord {
  id: string; // e.g. "zh_hsk_1_1"
  index: number;
  sheet: string; // e.g. "HSK 1", "HSK 2", ... "HSK 7-9"
  hskLevel: number;
  term: string;
  pinyin: string;
  pos: string;
  meaning: string;
  exampleSentence?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  needsReview?: boolean;
}

export interface SystemJapaneseJlptWord {
  id: string; // e.g. "ja_jlpt_5_1"
  index: number;
  level: string; // 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  jlptLevel: number; // 5, 4, 3, 2, 1
  term: string;
  furigana: string;
  romaji?: string;
  hanViet: string;
  pos: string;
  meaning: string;
  meaningEn?: string;
  exampleSentence?: string;
  exampleFurigana?: string;
  exampleTranslation?: string;
}

export const OXFORD_3000_WORDS: System3000Word[] = oxford3000Raw as System3000Word[];
export const CHINESE_HSK_WORDS: SystemChineseHskWord[] = chineseHskRaw as SystemChineseHskWord[];
export const JAPANESE_JLPT_WORDS: SystemJapaneseJlptWord[] = japaneseJlptRaw as SystemJapaneseJlptWord[];

export interface UserWordProgress {
  wordId: string;
  state: MasteryState;
  memoryLevel?: number;
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
  correctCount?: number;
  incorrectCount?: number;
  lastReviewedAt?: string;
  nextReviewAt: string; // YYYY-MM-DD
  reviewLogs: ReviewLog[];
  lapses: number;
  personalNotes?: string;
  isFavorite?: boolean;
  isDifficult?: boolean;
  reviewLater?: boolean;
  bookmarkedCollectionIds?: string[];
  updatedAt: string;
}

export interface VocabCollection {
  id: string;
  languageId: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  systemWordIds?: string[]; // Referenced 3000 word IDs without duplicating data
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  reviewedAt: string;
  rating: 1 | 2 | 3 | 4; // 1: Again (Quên), 2: Hard (Khó), 3: Good (Nhớ được), 4: Easy (Dễ)
  reviewType: 'flashcard' | 'flashcard_reverse' | 'spelling' | 'listening' | 'quiz' | 'fill_in_blank';
  isCorrect?: boolean;
  memoryLevelBefore?: number;
  memoryLevelAfter?: number;
  responseTimeMs?: number;
  intervalBefore: number;
  intervalAfter: number;
  easeFactorBefore: number;
  easeFactorAfter: number;
}

export interface VocabWord {
  id: string;
  languageId: string;
  collectionId: string;
  term: string;
  phonetic?: string;
  furigana?: string;
  romaji?: string;
  hanViet?: string;
  partOfSpeech?: string;
  meaning: string;
  secondaryMeanings?: string[];
  exampleSentence?: string;
  exampleTranslation?: string;
  collocations?: string[];
  synonyms?: string[];
  antonyms?: string[];
  mnemonic?: string;
  notes?: string;
  imageUrl?: string;
  audioUrl?: string;
  isFavorite?: boolean;
  isDifficult?: boolean;
  reviewLater?: boolean;
  tags?: string[];
  verification?: import('./vocabVerificationEngine').WordVerificationReport;
  
  // SM-2 Spaced Repetition & Memory Progression
  state: MasteryState;
  memoryLevel?: number; // Level 0 (Chưa học) to 5 (Thành thạo)
  repetitionCount: number;
  easeFactor: number; // Default: 2.5
  intervalDays: number; // Days until next review
  correctCount?: number;
  incorrectCount?: number;
  lastReviewedAt?: string;
  nextReviewAt: string; // ISO date string YYYY-MM-DD
  reviewLogs: ReviewLog[];
  lapses: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserLearningPreferences {
  preferredTopics: string[];
  preferredDifficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
  preferredModes: string[];
  defaultCount: number;
  defaultDurationMinutes: number; // 0 = unlimited
}

export interface VocabUserData {
  userId: string;
  activeLanguageId: string;
  languages: LearningLanguage[];
  collections: Record<string, VocabCollection[]>; // key: languageId -> collections
  words: Record<string, VocabWord[]>; // key: languageId -> personal words
  system3000Progress?: Record<string, UserWordProgress>; // key: word_3000_id -> user progress
  systemChineseHskProgress?: Record<string, UserWordProgress>; // key: zh_hsk_..._id -> user progress
  systemJapaneseJlptProgress?: Record<string, UserWordProgress>; // key: ja_jlpt_..._id -> user progress
  verificationOverrides?: Record<string, import('./vocabVerificationEngine').WordVerificationReport>;
  learningPreferences?: UserLearningPreferences;
  learningQueue?: string[]; // word IDs in custom learning queue
  lastStudyDate?: string;
  streakDays: number;
}

// ------------------------------------------------------------------------------
// PRESET LANGUAGES SUPPORT
// ------------------------------------------------------------------------------

export interface PresetLanguageMeta {
  id: string;
  name: string;
  originalName: string;
  flag: string;
  code: string;
  speechVoiceCode: string;
  writingSystem: string;
  samplePlaceholder: string;
}

export const PRESET_LANGUAGES: PresetLanguageMeta[] = [
  {
    id: 'en',
    name: 'Tiếng Anh',
    originalName: 'English',
    flag: '🇬🇧',
    code: 'en',
    speechVoiceCode: 'en-US',
    writingSystem: 'Latin / IPA Phonetics',
    samplePlaceholder: 'Ví dụ: Serendipity, Resilient...'
  },
  {
    id: 'ja',
    name: 'Tiếng Nhật',
    originalName: '日本語',
    flag: '🇯🇵',
    code: 'ja',
    speechVoiceCode: 'ja-JP',
    writingSystem: 'Kanji / Hiragana / Katakana',
    samplePlaceholder: 'Ví dụ: 桜 (さくら), 食べる...'
  },
  {
    id: 'zh',
    name: 'Tiếng Trung',
    originalName: '中文',
    flag: '🇨🇳',
    code: 'zh',
    speechVoiceCode: 'zh-CN',
    writingSystem: 'Hán tự / Pinyin',
    samplePlaceholder: 'Ví dụ: 学习 (xuéxí), 朋友...'
  },
  {
    id: 'ko',
    name: 'Tiếng Hàn',
    originalName: '한국어',
    flag: '🇰🇷',
    code: 'ko',
    speechVoiceCode: 'ko-KR',
    writingSystem: 'Hangul / Romanization',
    samplePlaceholder: 'Ví dụ: 안녕하세요, 사랑...'
  },
  {
    id: 'fr',
    name: 'Tiếng Pháp',
    originalName: 'Français',
    flag: '🇫🇷',
    code: 'fr',
    speechVoiceCode: 'fr-FR',
    writingSystem: 'Latin / French Accents',
    samplePlaceholder: 'Ví dụ: Éphémère, Rendez-vous...'
  },
  {
    id: 'de',
    name: 'Tiếng Đức',
    originalName: 'Deutsch',
    flag: '🇩🇪',
    code: 'de',
    speechVoiceCode: 'de-DE',
    writingSystem: 'Latin / German Umlauts',
    samplePlaceholder: 'Ví dụ: Gemütlichkeit, Sehnsucht...'
  },
  {
    id: 'es',
    name: 'Tiếng Tây Ban Nha',
    originalName: 'Español',
    flag: '🇪🇸',
    code: 'es',
    speechVoiceCode: 'es-ES',
    writingSystem: 'Latin / Spanish Tildes',
    samplePlaceholder: 'Ví dụ: Esperanza, Sobremesa...'
  },
  {
    id: 'vi',
    name: 'Tiếng Việt',
    originalName: 'Tiếng Việt',
    flag: '🇻🇳',
    code: 'vi',
    speechVoiceCode: 'vi-VN',
    writingSystem: 'Chữ Quốc Ngữ',
    samplePlaceholder: 'Ví dụ: Kiên trì, Thấu cảm...'
  }
];

// ------------------------------------------------------------------------------
// CURATED INITIAL STARTER COLLECTIONS & WORDS
// ------------------------------------------------------------------------------

export function getInitialCollectionsAndWords(languageId: string): { collections: VocabCollection[]; words: VocabWord[] } {
  const today = new Date().toISOString().split('T')[0];

  if (languageId === 'en') {
    const colId = 'col_en_core';
    return {
      collections: [
        {
          id: colId,
          languageId: 'en',
          title: 'Từ vựng Cốt lõi & Học thuật (Essential Academic)',
          description: 'Bộ từ vựng nền tảng giàu ngữ cảnh, kèm phát âm, cụm từ và mẹo nhớ.',
          icon: '🎓',
          color: '#3b82f6',
          tags: ['Academic', 'IELTS', 'Core'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      words: [
        {
          id: 'word_en_1',
          languageId: 'en',
          collectionId: colId,
          term: 'Resilient',
          phonetic: '/rɪˈzɪl.jənt/',
          partOfSpeech: 'adjective',
          meaning: 'Có khả năng phục hồi nhanh chóng sau khó khăn, kiên cường.',
          secondaryMeanings: ['Đàn hồi, bền bỉ'],
          exampleSentence: 'She remained resilient in the face of multiple challenges during her study.',
          exampleTranslation: 'Cô ấy vẫn kiên cường đối mặt với vô vàn thử thách trong quá trình học tập.',
          collocations: ['highly resilient', 'resilient economy', 'resilient mindset'],
          synonyms: ['tough', 'adaptable', 'buoyant'],
          antonyms: ['fragile', 'vulnerable'],
          mnemonic: 'Tưởng tượng quả bóng cao su: bị đè bẹp nhưng lập tức "re-silient" bật nảy trở lại.',
          state: 'new',
          repetitionCount: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          nextReviewAt: today,
          reviewLogs: [],
          lapses: 0,
          isFavorite: true,
          tags: ['Personality', 'High-Frequency'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'word_en_2',
          languageId: 'en',
          collectionId: colId,
          term: 'Serendipity',
          phonetic: '/ˌser.ənˈdɪp.ə.ti/',
          partOfSpeech: 'noun',
          meaning: 'Sự tình cờ may mắn, tìm thấy điều tốt đẹp một cách ngẫu nhiên.',
          secondaryMeanings: ['Cơ duyên bất ngờ'],
          exampleSentence: 'Finding this bookstore was pure serendipity on a rainy afternoon.',
          exampleTranslation: 'Tìm thấy hiệu sách này thực sự là một cơ duyên may mắn vào một chiều mưa.',
          collocations: ['pure serendipity', 'stroke of serendipity'],
          synonyms: ['fluke', 'happy accident', 'chance'],
          mnemonic: 'Serene (thanh thản) + Dip (nhúng ngẫu nhiên) -> tình cờ vớt được niềm vui.',
          state: 'new',
          repetitionCount: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          nextReviewAt: today,
          reviewLogs: [],
          lapses: 0,
          tags: ['Beauty', 'Vocabulary'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'word_en_3',
          languageId: 'en',
          collectionId: colId,
          term: 'Pragmatic',
          phonetic: '/præɡˈmæt.ɪk/',
          partOfSpeech: 'adjective',
          meaning: 'Thực tế, thực dụng theo hướng hành động hiệu quả thay vì lý thuyết suông.',
          exampleSentence: 'We need a pragmatic approach to solve this learning obstacle.',
          exampleTranslation: 'Chúng ta cần một cách tiếp cận thực tế để giải quyết trở ngại học tập này.',
          collocations: ['pragmatic solution', 'pragmatic approach', 'pragmatic leader'],
          synonyms: ['practical', 'realistic', 'utilitarian'],
          antonyms: ['idealistic', 'unrealistic'],
          mnemonic: 'Practice (thực hành) -> Pragmatic (thực tế, chú trọng áp dụng).',
          state: 'new',
          repetitionCount: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          nextReviewAt: today,
          reviewLogs: [],
          lapses: 0,
          tags: ['Critical-Thinking'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };
  }

  if (languageId === 'ja') {
    const colId = 'col_ja_starter';
    return {
      collections: [
        {
          id: colId,
          languageId: 'ja',
          title: 'Từ vựng N5 & Giao tiếp nền tảng',
          description: 'Học từ vựng tiếng Nhật với Kanji, Hiragana, âm Hán Việt và ví dụ câu.',
          icon: '🌸',
          color: '#ec4899',
          tags: ['JLPT N5', 'Starter'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      words: [
        {
          id: 'word_ja_1',
          languageId: 'ja',
          collectionId: colId,
          term: '桜',
          phonetic: 'さくら (sakura)',
          partOfSpeech: 'noun',
          meaning: 'Hoa anh đào (biểu tượng mùa xuân Nhật Bản).',
          exampleSentence: '春になると、公園の桜がとても綺麗に咲きます。',
          exampleTranslation: 'Khi mùa xuân đến, hoa anh đào trong công viên nở rất đẹp.',
          mnemonic: 'Chữ Hán [Anh]: Bộ Mộc (cây gỗ) + Nữ (người con gái) -> cây hoa xinh đẹp.',
          state: 'new',
          repetitionCount: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          nextReviewAt: today,
          reviewLogs: [],
          lapses: 0,
          isFavorite: true,
          tags: ['Nature'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'word_ja_2',
          languageId: 'ja',
          collectionId: colId,
          term: '頑張る',
          phonetic: 'がんばる (ganbaru)',
          partOfSpeech: 'verb',
          meaning: 'Cố gắng, nỗ lực hết mình, kiên trì không bỏ cuộc.',
          exampleSentence: '毎日の勉強を最後まで頑張りましょう！',
          exampleTranslation: 'Hãy cùng cố gắng học tập mỗi ngày cho đến cùng nhé!',
          collocations: ['頑張ってください (Chúc bạn cố gắng!)'],
          synonyms: ['努力する'],
          state: 'new',
          repetitionCount: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          nextReviewAt: today,
          reviewLogs: [],
          lapses: 0,
          tags: ['Action'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };
  }

  if (languageId === 'zh') {
    const colId = 'col_zh_starter';
    return {
      collections: [
        {
          id: colId,
          languageId: 'zh',
          title: 'Từ vựng HSK & Giao tiếp thường nhật',
          description: 'Chữ Hán kèm Pinyin, thanh điệu và ngữ cảnh sử dụng.',
          icon: '🏮',
          color: '#ef4444',
          tags: ['HSK', 'Daily'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      words: [
        {
          id: 'word_zh_1',
          languageId: 'zh',
          collectionId: colId,
          term: '学习',
          phonetic: 'xué xí',
          partOfSpeech: 'verb / noun',
          meaning: 'Học tập, rèn luyện kiến thức kỹ năng.',
          exampleSentence: '每天坚持学习，进步就会非常快。',
          exampleTranslation: 'Mỗi ngày kiên trì học tập, tiến bộ sẽ rất nhanh chóng.',
          collocations: ['努力学习 (chăm chỉ học tập)', '学习方法 (phương pháp học)'],
          mnemonic: 'Học (学): đứa trẻ dưới mái trường tiếp thu kiến thức.',
          state: 'new',
          repetitionCount: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          nextReviewAt: today,
          reviewLogs: [],
          lapses: 0,
          isFavorite: true,
          tags: ['Study'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };
  }

  // Generic fallback starter
  const genericColId = `col_${languageId}_starter`;
  return {
    collections: [
      {
        id: genericColId,
        languageId,
        title: 'Bộ từ vựng cơ bản',
        description: 'Tập hợp từ vựng hàng ngày đầu tiên của bạn.',
        icon: '📚',
        color: '#10b981',
        tags: ['General'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    words: []
  };
}

// ------------------------------------------------------------------------------
// SM-2 SPACED REPETITION ENGINE
// ------------------------------------------------------------------------------

import { 
  scheduleNextReview, 
  estimateRetentionProbability, 
  calculateMemoryStability, 
  generateForgettingCurvePoints, 
  buildTodayStudyPlan, 
  sliceStudyBatches,
  ForgettingCurvePoint,
  TodayStudyPlan
} from './spacedRepetitionScheduler';

export {
  scheduleNextReview,
  estimateRetentionProbability,
  calculateMemoryStability,
  generateForgettingCurvePoints,
  buildTodayStudyPlan,
  sliceStudyBatches
};
export type { ForgettingCurvePoint, TodayStudyPlan };
export { calculateNextReview as calculateSM2Algorithm };

export interface Sm2Input {
  rating: 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
  lapses: number;
  lastReviewedAt?: string;
  reviewType?: 'flashcard' | 'flashcard_reverse' | 'spelling' | 'listening' | 'quiz' | 'fill_in_blank';
}

export interface Sm2Output {
  nextRepetitionCount: number;
  nextEaseFactor: number;
  nextIntervalDays: number;
  nextReviewAt: string; // YYYY-MM-DD
  nextState: MasteryState;
  nextLapses: number;
  reviewLog: ReviewLog;
}

/**
 * Calculates new interval, ease factor and next review date based on the advanced SM-2 & Forgetting Curve algorithm.
 */
export function calculateNextReview(input: Sm2Input): Sm2Output {
  const result = scheduleNextReview({
    rating: input.rating,
    repetitionCount: input.repetitionCount,
    easeFactor: input.easeFactor,
    intervalDays: input.intervalDays,
    lapses: input.lapses,
    lastReviewedAt: input.lastReviewedAt,
    reviewType: input.reviewType
  });

  return {
    nextRepetitionCount: result.nextRepetitionCount,
    nextEaseFactor: result.nextEaseFactor,
    nextIntervalDays: result.nextIntervalDays,
    nextReviewAt: result.nextReviewAt,
    nextState: result.nextState,
    nextLapses: result.nextLapses,
    reviewLog: result.reviewLog
  };
}

// ------------------------------------------------------------------------------
// FILTERING & QUEUE BUILDING
// ------------------------------------------------------------------------------

export interface StudyQueues {
  dueWords: VocabWord[];
  newWords: VocabWord[];
  difficultWords: VocabWord[];
  allWords: VocabWord[];
}

export function buildStudyQueues(words: VocabWord[], collectionId?: string): StudyQueues {
  const today = new Date().toISOString().split('T')[0];

  const pool = collectionId && collectionId !== 'all'
    ? words.filter(w => w.collectionId === collectionId)
    : words;

  const dueWords = pool.filter(w => {
    return w.state !== 'new' && w.nextReviewAt <= today;
  }).sort((a, b) => (a.nextReviewAt > b.nextReviewAt ? 1 : -1));

  const newWords = pool.filter(w => w.state === 'new');
  
  const difficultWords = pool.filter(w => w.state === 'difficult' || w.lapses >= 2);

  return {
    dueWords,
    newWords,
    difficultWords,
    allWords: pool
  };
}

// ------------------------------------------------------------------------------
// MEMORY PYRAMID & SPART REVIEW QUEUES
// ------------------------------------------------------------------------------

export interface MemoryPyramidStats {
  total: number;
  level0_new: number;       // Level 0: Chưa học
  level1_learning: number;  // Level 1: Mới học
  level2_uncertain: number; // Level 2: Đang ghi nhớ / Chưa chắc
  level3_good: number;      // Level 3: Nhớ khá
  level4_strong: number;    // Level 4: Nhớ tốt / Đã nhớ
  level5_mastered: number;  // Level 5: Thành thạo
  dueTodayCount: number;
  weakWordsCount: number;
  completionPercent: number;
}

export function computeMemoryLevel(repetitionCount: number = 0, intervalDays: number = 0, lapses: number = 0): number {
  if (repetitionCount === 0) return 0;
  if (repetitionCount === 1) return 1;
  if (repetitionCount === 2 || lapses > 2) return 2;
  if (intervalDays >= 30 && repetitionCount >= 5) return 5;
  if (intervalDays >= 14 && repetitionCount >= 4) return 4;
  if (repetitionCount >= 3) return 3;
  return 2;
}

export function calculateMemoryPyramid(words: VocabWord[] = []): MemoryPyramidStats {
  const safeWords = Array.isArray(words) ? words : [];
  const today = new Date().toISOString().split('T')[0];
  const stats: MemoryPyramidStats = {
    total: safeWords.length,
    level0_new: 0,
    level1_learning: 0,
    level2_uncertain: 0,
    level3_good: 0,
    level4_strong: 0,
    level5_mastered: 0,
    dueTodayCount: 0,
    weakWordsCount: 0,
    completionPercent: 0
  };

  for (const w of safeWords) {
    const lvl = w.memoryLevel !== undefined ? w.memoryLevel : computeMemoryLevel(w.repetitionCount, w.intervalDays, w.lapses);
    if (lvl === 0) stats.level0_new++;
    else if (lvl === 1) stats.level1_learning++;
    else if (lvl === 2) stats.level2_uncertain++;
    else if (lvl === 3) stats.level3_good++;
    else if (lvl === 4) stats.level4_strong++;
    else if (lvl >= 5) stats.level5_mastered++;

    if (w.state !== 'new' && w.nextReviewAt && w.nextReviewAt <= today) {
      stats.dueTodayCount++;
    }

    if (w.lapses >= 2 || (w.incorrectCount && w.incorrectCount > (w.correctCount || 0))) {
      stats.weakWordsCount++;
    }
  }

  stats.completionPercent = stats.total > 0 ? Math.round((stats.level5_mastered / stats.total) * 100) : 0;
  return stats;
}

/**
 * Builds Smart Today's Review list prioritizing:
 * 1. Từ trả lời sai gần đây (lapses > 0)
 * 2. Từ có memory level thấp (Level 1, Level 2)
 * 3. Từ đến hạn ôn (nextReviewAt <= today)
 * 4. Từ lâu chưa ôn (quá hạn nhiều ngày)
 * 5. Từ thường xuyên sai (incorrectCount > correctCount)
 * 6. Sau đó mới đến từ đã nhớ tốt
 */
export function buildSmartReviewQueue(words: VocabWord[] = []): VocabWord[] {
  const safeWords = Array.isArray(words) ? words : [];
  const today = new Date().toISOString().split('T')[0];
  
  return [...safeWords].map(w => {
    let priority = 0;
    const lvl = w.memoryLevel !== undefined ? w.memoryLevel : computeMemoryLevel(w.repetitionCount, w.intervalDays, w.lapses);
    
    // Check if due today
    const isDue = w.nextReviewAt ? w.nextReviewAt <= today : false;
    if (isDue) priority += 500;
    
    // Recent lapses (highest urgency)
    if (w.lapses > 0) priority += 1000 + (w.lapses * 100);
    
    // Lower level words need more reinforcement
    priority += (5 - lvl) * 80;
    
    // Overdue bonus
    if (w.nextReviewAt && w.nextReviewAt < today) {
      const diffDays = Math.floor((new Date(today).getTime() - new Date(w.nextReviewAt).getTime()) / (1000 * 60 * 60 * 24));
      priority += Math.min(diffDays * 20, 300);
    }
    
    // High error rate
    if (w.incorrectCount && w.incorrectCount > 0) {
      priority += w.incorrectCount * 50;
    }

    return { word: w, priority };
  })
  .sort((a, b) => b.priority - a.priority)
  .map(item => item.word);
}

// ------------------------------------------------------------------------------
// STATS & PROGRESS ANALYTICS
// ------------------------------------------------------------------------------

export interface LanguageAnalytics {
  totalWords: number;
  newWordsCount: number;
  learningCount: number;
  reviewingCount: number;
  masteredCount: number;
  difficultCount: number;
  dueTodayCount: number;
  masteryPercentage: number;
  retentionRate: number; // Percentage of ratings >= 3
  totalReviewsCount: number;
}

export function calculateLanguageAnalytics(words: VocabWord[] = []): LanguageAnalytics {
  const safeWords = Array.isArray(words) ? words : [];
  const today = new Date().toISOString().split('T')[0];
  const total = safeWords.length;

  let newCount = 0;
  let learningCount = 0;
  let reviewingCount = 0;
  let masteredCount = 0;
  let difficultCount = 0;
  let dueTodayCount = 0;

  let totalLogs = 0;
  let passedLogs = 0;

  for (const w of safeWords) {
    if (w.state === 'new') newCount++;
    else if (w.state === 'learning') learningCount++;
    else if (w.state === 'reviewing') reviewingCount++;
    else if (w.state === 'mastered') masteredCount++;
    else if (w.state === 'difficult') difficultCount++;

    if (w.state !== 'new' && w.nextReviewAt <= today) {
      dueTodayCount++;
    }

    if (w.reviewLogs && w.reviewLogs.length > 0) {
      for (const log of w.reviewLogs) {
        totalLogs++;
        if (log.rating >= 3) passedLogs++;
      }
    }
  }

  const masteryPercentage = total > 0
    ? Math.round((masteredCount / total) * 100)
    : 0;

  const retentionRate = totalLogs > 0
    ? Math.round((passedLogs / totalLogs) * 100)
    : 100;

  return {
    totalWords: total,
    newWordsCount: newCount,
    learningCount,
    reviewingCount,
    masteredCount,
    difficultCount,
    dueTodayCount,
    masteryPercentage,
    retentionRate,
    totalReviewsCount: totalLogs
  };
}

// ------------------------------------------------------------------------------
// SPEECH SYNTHESIS HELPER
// ------------------------------------------------------------------------------

export function speakWord(text: string, voiceCode: string = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceCode;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Speech synthesis error:', e);
  }
}

// ------------------------------------------------------------------------------
// LOCAL STORAGE PERSISTENCE LAYER
// ------------------------------------------------------------------------------

export function loadVocabData(userId: string): VocabUserData {
  const storageKey = `lifeos_vocab_master_${userId || 'current'}`;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed: VocabUserData = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Ensure languages array is valid
          if (!Array.isArray(parsed.languages) || parsed.languages.length === 0) {
            parsed.languages = [
              {
                id: 'en',
                name: 'Tiếng Anh',
                originalName: 'English',
                flag: '🇬🇧',
                code: 'en',
                speechVoiceCode: 'en-US',
                level: 'intermediate',
                dailyNewWordTarget: 10,
                dailyReviewTarget: 30,
                explanationLanguage: 'vi',
                createdAt: new Date().toISOString()
              }
            ];
          }

          if (!parsed.activeLanguageId || !parsed.languages.some(l => l.id === parsed.activeLanguageId)) {
            parsed.activeLanguageId = parsed.languages[0].id;
          }

          if (!parsed.collections || typeof parsed.collections !== 'object') {
            parsed.collections = {};
          }
          if (!parsed.words || typeof parsed.words !== 'object') {
            parsed.words = {};
          }

          // Ensure active language has collections & words arrays
          for (const lang of parsed.languages) {
            if (!Array.isArray(parsed.collections[lang.id])) {
              const starter = getInitialCollectionsAndWords(lang.id);
              parsed.collections[lang.id] = starter.collections;
            }
            if (!Array.isArray(parsed.words[lang.id])) {
              const starter = getInitialCollectionsAndWords(lang.id);
              parsed.words[lang.id] = starter.words;
            }
          }

          if (!parsed.system3000Progress) {
            parsed.system3000Progress = {};
          }
          if (!parsed.systemChineseHskProgress) {
            parsed.systemChineseHskProgress = {};
          }
          if (!parsed.systemJapaneseJlptProgress) {
            parsed.systemJapaneseJlptProgress = {};
          }
          if (!parsed.verificationOverrides) {
            parsed.verificationOverrides = {};
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse vocab data:', e);
      }
    }
  }

  // Create default with English
  const defaultLang: LearningLanguage = {
    id: 'en',
    name: 'Tiếng Anh',
    originalName: 'English',
    flag: '🇬🇧',
    code: 'en',
    speechVoiceCode: 'en-US',
    level: 'intermediate',
    dailyNewWordTarget: 10,
    dailyReviewTarget: 30,
    explanationLanguage: 'vi',
    createdAt: new Date().toISOString()
  };

  const initial = getInitialCollectionsAndWords('en');

  const defaultData: VocabUserData = {
    userId: userId || 'current',
    activeLanguageId: 'en',
    languages: [defaultLang],
    collections: {
      en: initial.collections
    },
    words: {
      en: initial.words
    },
    system3000Progress: {},
    systemChineseHskProgress: {},
    systemJapaneseJlptProgress: {},
    verificationOverrides: {},
    streakDays: 1,
    lastStudyDate: new Date().toISOString().split('T')[0]
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(defaultData));
  }

  return defaultData;
}

export function saveVocabData(data: VocabUserData): void {
  const storageKey = `lifeos_vocab_master_${data.userId || 'current'}`;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving vocab data:', e);
    }
  }
}

// ------------------------------------------------------------------------------
// IMPORT / EXPORT HELPERS (CSV & JSON)
// ------------------------------------------------------------------------------

export function exportWordsToJson(words: VocabWord[], collectionTitle: string): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    collection: collectionTitle,
    words
  }, null, 2);
}

export function exportWordsToCsv(words: VocabWord[]): string {
  const headers = ['Term', 'Phonetic', 'PartOfSpeech', 'Meaning', 'ExampleSentence', 'ExampleTranslation', 'Collocations', 'Tags'];
  const rows = words.map(w => [
    `"${(w.term || '').replace(/"/g, '""')}"`,
    `"${(w.phonetic || '').replace(/"/g, '""')}"`,
    `"${(w.partOfSpeech || '').replace(/"/g, '""')}"`,
    `"${(w.meaning || '').replace(/"/g, '""')}"`,
    `"${(w.exampleSentence || '').replace(/"/g, '""')}"`,
    `"${(w.exampleTranslation || '').replace(/"/g, '""')}"`,
    `"${(w.collocations || []).join('; ').replace(/"/g, '""')}"`,
    `"${(w.tags || []).join(', ').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function parseWordsFromCsv(
  csvText: string,
  languageId: string,
  collectionId: string
): Partial<VocabWord>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const words: Partial<VocabWord>[] = [];
  // Skip header if it contains 'term' or 'meaning'
  const startIndex = lines[0].toLowerCase().includes('term') || lines[0].toLowerCase().includes('từ') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length >= 2) {
      const term = cols[0]?.trim();
      const meaning = cols[1]?.trim() || (cols.length >= 4 ? cols[3]?.trim() : '');
      if (term) {
        words.push({
          term,
          meaning: meaning || term,
          phonetic: cols.length > 2 ? cols[1]?.trim() : undefined,
          partOfSpeech: cols.length > 3 ? cols[2]?.trim() : undefined,
          exampleSentence: cols.length > 4 ? cols[4]?.trim() : undefined,
          exampleTranslation: cols.length > 5 ? cols[5]?.trim() : undefined,
          languageId,
          collectionId
        });
      }
    }
  }

  return words;
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

// ------------------------------------------------------------------------------
// SYSTEM 3000 WORDS HELPERS & UNIFIED STUDY INTEGRATION
// ------------------------------------------------------------------------------

/**
 * Returns all 3,522 System 3000 words extracted from the official document
 */
export function getSystem3000Words(): System3000Word[] {
  return OXFORD_3000_WORDS;
}

/**
 * Convert a System 3000 word into a full VocabWord format for the unified study session
 */
export function systemWordToVocabWord(
  sys: System3000Word,
  progress?: UserWordProgress,
  defaultCollectionId: string = 'system_3000'
): VocabWord {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: sys.id,
    languageId: 'en',
    collectionId: progress?.bookmarkedCollectionIds?.[0] || defaultCollectionId,
    term: sys.term,
    phonetic: sys.phonetic,
    partOfSpeech: sys.pos,
    meaning: sys.meaning,
    notes: progress?.personalNotes,
    isFavorite: progress?.isFavorite || false,
    state: progress?.state || 'new',
    repetitionCount: progress?.repetitionCount || 0,
    easeFactor: progress?.easeFactor || 2.5,
    intervalDays: progress?.intervalDays || 0,
    lastReviewedAt: progress?.lastReviewedAt,
    nextReviewAt: progress?.nextReviewAt || today,
    reviewLogs: progress?.reviewLogs || [],
    lapses: progress?.lapses || 0,
    tags: ['3000-Thông dụng'],
    createdAt: progress?.updatedAt || new Date().toISOString(),
    updatedAt: progress?.updatedAt || new Date().toISOString()
  };
}

/**
 * Calculate analytics specifically for 3000 system words based on user progress map
 */
export function calculate3000Analytics(progressMap: Record<string, UserWordProgress> = {}): LanguageAnalytics {
  const today = new Date().toISOString().split('T')[0];
  const total = OXFORD_3000_WORDS.length;

  let newCount = 0;
  let learningCount = 0;
  let reviewingCount = 0;
  let masteredCount = 0;
  let difficultCount = 0;
  let dueTodayCount = 0;
  let totalLogs = 0;
  let passedLogs = 0;

  for (const sys of OXFORD_3000_WORDS) {
    const prog = progressMap[sys.id];
    const state = prog?.state || 'new';

    if (state === 'new') newCount++;
    else if (state === 'learning') learningCount++;
    else if (state === 'reviewing') reviewingCount++;
    else if (state === 'mastered') masteredCount++;
    else if (state === 'difficult') difficultCount++;

    if (state !== 'new' && prog?.nextReviewAt && prog.nextReviewAt <= today) {
      dueTodayCount++;
    }

    if (prog?.reviewLogs) {
      for (const log of prog.reviewLogs) {
        totalLogs++;
        if (log.rating >= 3) passedLogs++;
      }
    }
  }

  const masteryPercentage = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
  const retentionRate = totalLogs > 0 ? Math.round((passedLogs / totalLogs) * 100) : 100;

  return {
    totalWords: total,
    newWordsCount: newCount,
    learningCount,
    reviewingCount,
    masteredCount,
    difficultCount,
    dueTodayCount,
    masteryPercentage,
    retentionRate,
    totalReviewsCount: totalLogs
  };
}

// ------------------------------------------------------------------------------
// SYSTEM CHINESE HSK WORDS HELPERS & UNIFIED STUDY INTEGRATION
// ------------------------------------------------------------------------------

/**
 * Returns all 10,240 Chinese HSK words extracted from the uploaded dataset
 */
export function getSystemChineseWords(level?: number): SystemChineseHskWord[] {
  if (level) {
    return CHINESE_HSK_WORDS.filter(w => w.hskLevel === level);
  }
  return CHINESE_HSK_WORDS;
}

/**
 * Convert a System Chinese HSK word into a full VocabWord format for the study session
 */
export function systemChineseWordToVocabWord(
  sys: SystemChineseHskWord,
  progress?: UserWordProgress,
  defaultCollectionId: string = 'system_chinese_hsk'
): VocabWord {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: sys.id,
    languageId: 'zh',
    collectionId: progress?.bookmarkedCollectionIds?.[0] || defaultCollectionId,
    term: sys.term,
    phonetic: sys.pinyin,
    partOfSpeech: sys.pos,
    meaning: sys.meaning,
    exampleSentence: sys.exampleSentence,
    exampleTranslation: sys.exampleTranslation,
    notes: progress?.personalNotes,
    isFavorite: progress?.isFavorite || false,
    state: progress?.state || 'new',
    repetitionCount: progress?.repetitionCount || 0,
    easeFactor: progress?.easeFactor || 2.5,
    intervalDays: progress?.intervalDays || 0,
    lastReviewedAt: progress?.lastReviewedAt,
    nextReviewAt: progress?.nextReviewAt || today,
    reviewLogs: progress?.reviewLogs || [],
    lapses: progress?.lapses || 0,
    tags: [sys.sheet, `HSK ${sys.hskLevel}`],
    createdAt: progress?.updatedAt || new Date().toISOString(),
    updatedAt: progress?.updatedAt || new Date().toISOString()
  };
}

/**
 * Calculate analytics specifically for Chinese HSK system words based on user progress map
 */
export function calculateChineseHskAnalytics(progressMap: Record<string, UserWordProgress> = {}): LanguageAnalytics {
  const today = new Date().toISOString().split('T')[0];
  const total = CHINESE_HSK_WORDS.length;

  let newCount = 0;
  let learningCount = 0;
  let reviewingCount = 0;
  let masteredCount = 0;
  let difficultCount = 0;
  let dueTodayCount = 0;
  let totalLogs = 0;
  let passedLogs = 0;

  for (const sys of CHINESE_HSK_WORDS) {
    const prog = progressMap[sys.id];
    const state = prog?.state || 'new';

    if (state === 'new') newCount++;
    else if (state === 'learning') learningCount++;
    else if (state === 'reviewing') reviewingCount++;
    else if (state === 'mastered') masteredCount++;
    else if (state === 'difficult') difficultCount++;

    if (state !== 'new' && prog?.nextReviewAt && prog.nextReviewAt <= today) {
      dueTodayCount++;
    }

    if (prog?.reviewLogs) {
      for (const log of prog.reviewLogs) {
        totalLogs++;
        if (log.rating >= 3) passedLogs++;
      }
    }
  }

  const masteryPercentage = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
  const retentionRate = totalLogs > 0 ? Math.round((passedLogs / totalLogs) * 100) : 100;

  return {
    totalWords: total,
    newWordsCount: newCount,
    learningCount,
    reviewingCount,
    masteredCount,
    difficultCount,
    dueTodayCount,
    masteryPercentage,
    retentionRate,
    totalReviewsCount: totalLogs
  };
}

// ------------------------------------------------------------------------------
// SYSTEM JAPANESE JLPT WORDS HELPERS & UNIFIED STUDY INTEGRATION
// ------------------------------------------------------------------------------

/**
 * Returns all 7,847 Japanese JLPT words extracted from official curriculum (N5 - N1)
 */
export function getSystemJapaneseWords(level?: string | number): SystemJapaneseJlptWord[] {
  if (level !== undefined && level !== 0 && level !== 'ALL') {
    const lvlStr = typeof level === 'number' ? `N${level}` : String(level).toUpperCase();
    return JAPANESE_JLPT_WORDS.filter(w => w.level === lvlStr || w.jlptLevel === Number(level));
  }
  return JAPANESE_JLPT_WORDS;
}

/**
 * Convert a System Japanese JLPT word into a full VocabWord format for the study session
 */
export function systemJapaneseWordToVocabWord(
  sys: SystemJapaneseJlptWord,
  progress?: UserWordProgress,
  defaultCollectionId: string = 'system_japanese_jlpt'
): VocabWord {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: sys.id,
    languageId: 'ja',
    collectionId: progress?.bookmarkedCollectionIds?.[0] || defaultCollectionId,
    term: sys.term,
    phonetic: sys.furigana,
    furigana: sys.furigana,
    romaji: sys.romaji,
    hanViet: sys.hanViet,
    partOfSpeech: sys.pos,
    meaning: sys.meaning,
    exampleSentence: sys.exampleSentence,
    exampleTranslation: sys.exampleTranslation,
    notes: progress?.personalNotes || (sys.hanViet ? `Âm Hán Việt: ${sys.hanViet}` : undefined),
    isFavorite: progress?.isFavorite || false,
    state: progress?.state || 'new',
    memoryLevel: progress?.memoryLevel ?? computeMemoryLevel(progress?.repetitionCount || 0, progress?.intervalDays || 0, progress?.lapses || 0),
    repetitionCount: progress?.repetitionCount || 0,
    easeFactor: progress?.easeFactor || 2.5,
    intervalDays: progress?.intervalDays || 0,
    lastReviewedAt: progress?.lastReviewedAt,
    nextReviewAt: progress?.nextReviewAt || today,
    reviewLogs: progress?.reviewLogs || [],
    lapses: progress?.lapses || 0,
    tags: [sys.level, `JLPT ${sys.level}`, sys.hanViet ? `HV: ${sys.hanViet}` : ''].filter(Boolean),
    createdAt: progress?.updatedAt || new Date().toISOString(),
    updatedAt: progress?.updatedAt || new Date().toISOString()
  };
}

/**
 * Calculate analytics specifically for Japanese JLPT system words based on user progress map
 */
export function calculateJapaneseJlptAnalytics(progressMap: Record<string, UserWordProgress> = {}): LanguageAnalytics {
  const today = new Date().toISOString().split('T')[0];
  const total = JAPANESE_JLPT_WORDS.length;

  let newCount = 0;
  let learningCount = 0;
  let reviewingCount = 0;
  let masteredCount = 0;
  let difficultCount = 0;
  let dueTodayCount = 0;
  let totalLogs = 0;
  let passedLogs = 0;

  for (const sys of JAPANESE_JLPT_WORDS) {
    const prog = progressMap[sys.id];
    const state = prog?.state || 'new';

    if (state === 'new') newCount++;
    else if (state === 'learning') learningCount++;
    else if (state === 'reviewing') reviewingCount++;
    else if (state === 'mastered') masteredCount++;
    else if (state === 'difficult') difficultCount++;

    if (state !== 'new' && prog?.nextReviewAt && prog.nextReviewAt <= today) {
      dueTodayCount++;
    }

    if (prog?.reviewLogs) {
      for (const log of prog.reviewLogs) {
        totalLogs++;
        if (log.rating >= 3) passedLogs++;
      }
    }
  }

  const masteryPercentage = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
  const retentionRate = totalLogs > 0 ? Math.round((passedLogs / totalLogs) * 100) : 100;

  return {
    totalWords: total,
    newWordsCount: newCount,
    learningCount,
    reviewingCount,
    masteredCount,
    difficultCount,
    dueTodayCount,
    masteryPercentage,
    retentionRate,
    totalReviewsCount: totalLogs
  };
}

/**
 * Calculate combined analytics across both personal words and system words (supporting EN, ZH, JA)
 */
export function calculateCombinedAnalytics(
  personalWords: VocabWord[] = [],
  progressMap: Record<string, UserWordProgress> = {},
  languageId: string = 'en'
): LanguageAnalytics {
  const safePersonalWords = Array.isArray(personalWords) ? personalWords : [];
  const aSystem = languageId === 'zh'
    ? calculateChineseHskAnalytics(progressMap || {})
    : languageId === 'ja'
    ? calculateJapaneseJlptAnalytics(progressMap || {})
    : calculate3000Analytics(progressMap || {});
  const aPersonal = calculateLanguageAnalytics(safePersonalWords);

  const total = aSystem.totalWords + aPersonal.totalWords;
  const mastered = aSystem.masteredCount + aPersonal.masteredCount;
  const totalReviews = aSystem.totalReviewsCount + aPersonal.totalReviewsCount;

  return {
    totalWords: total,
    newWordsCount: aSystem.newWordsCount + aPersonal.newWordsCount,
    learningCount: aSystem.learningCount + aPersonal.learningCount,
    reviewingCount: aSystem.reviewingCount + aPersonal.reviewingCount,
    masteredCount: mastered,
    difficultCount: aSystem.difficultCount + aPersonal.difficultCount,
    dueTodayCount: aSystem.dueTodayCount + aPersonal.dueTodayCount,
    masteryPercentage: total > 0 ? Math.round((mastered / total) * 100) : 0,
    retentionRate: totalReviews > 0
      ? Math.round(((aSystem.retentionRate * aSystem.totalReviewsCount + aPersonal.retentionRate * aPersonal.totalReviewsCount) / (totalReviews * 100)) * 100)
      : 100,
    totalReviewsCount: totalReviews
  };
}

/**
 * Build unified study queues across sources: system words (Oxford 3000 or Chinese HSK), personal words, or both
 */
export function buildUnifiedStudyQueues(
  personalWords: VocabWord[] = [],
  progressMap: Record<string, UserWordProgress> = {},
  source: '3000' | 'personal' | 'all' = 'all',
  collectionId?: string,
  languageId: string = 'en'
): StudyQueues {
  const today = new Date().toISOString().split('T')[0];
  let pool: VocabWord[] = [];
  const safePersonal = Array.isArray(personalWords) ? personalWords : [];

  // 1. Personal words
  if (source === 'personal' || source === 'all') {
    if (collectionId && collectionId !== 'all') {
      pool.push(...safePersonal.filter(w => w.collectionId === collectionId));
    } else {
      pool.push(...safePersonal);
    }
  }

  // 2. System words (3000, Chinese HSK, or Japanese JLPT)
  if (source === '3000' || source === 'all') {
    if (languageId === 'zh') {
      if (collectionId && collectionId !== 'all') {
        const bookmarked = CHINESE_HSK_WORDS.filter(w => {
          const prog = progressMap[w.id];
          return prog?.bookmarkedCollectionIds?.includes(collectionId);
        });
        pool.push(...bookmarked.map(w => systemChineseWordToVocabWord(w, progressMap[w.id], collectionId)));
      } else {
        pool.push(...CHINESE_HSK_WORDS.map(w => systemChineseWordToVocabWord(w, progressMap[w.id])));
      }
    } else if (languageId === 'ja') {
      if (collectionId && collectionId !== 'all') {
        const bookmarked = JAPANESE_JLPT_WORDS.filter(w => {
          const prog = progressMap[w.id];
          return prog?.bookmarkedCollectionIds?.includes(collectionId);
        });
        pool.push(...bookmarked.map(w => systemJapaneseWordToVocabWord(w, progressMap[w.id], collectionId)));
      } else {
        pool.push(...JAPANESE_JLPT_WORDS.map(w => systemJapaneseWordToVocabWord(w, progressMap[w.id])));
      }
    } else {
      if (collectionId && collectionId !== 'all') {
        const bookmarked = OXFORD_3000_WORDS.filter(w => {
          const prog = progressMap[w.id];
          return prog?.bookmarkedCollectionIds?.includes(collectionId);
        });
        pool.push(...bookmarked.map(w => systemWordToVocabWord(w, progressMap[w.id], collectionId)));
      } else {
        pool.push(...OXFORD_3000_WORDS.map(w => systemWordToVocabWord(w, progressMap[w.id])));
      }
    }
  }

  const dueWords = pool.filter(w => w.state !== 'new' && w.nextReviewAt <= today)
    .sort((a, b) => (a.nextReviewAt > b.nextReviewAt ? 1 : -1));
  const newWords = pool.filter(w => w.state === 'new');
  const difficultWords = pool.filter(w => w.state === 'difficult' || w.lapses >= 2);

  return {
    dueWords,
    newWords,
    difficultWords,
    allWords: pool
  };
}

/**
 * Record review outcome for personal, 3000, Chinese HSK, or Japanese JLPT system word
 */
export function recordReviewOutcome(
  prevData: VocabUserData,
  wordId: string,
  rating: 1 | 2 | 3 | 4,
  reviewType: 'flashcard' | 'flashcard_reverse' | 'spelling' | 'listening' | 'quiz' | 'fill_in_blank' = 'flashcard'
): VocabUserData {
  const isOxford = wordId.startsWith('word_3000_');
  const isChineseHsk = wordId.startsWith('zh_hsk_');
  const isJapaneseJlpt = wordId.startsWith('ja_jlpt_') || wordId.startsWith('ja_sach100_');
  const activeLangId = prevData.activeLanguageId;

  if (isOxford || isChineseHsk || isJapaneseJlpt) {
    const progressMap = isJapaneseJlpt
      ? (prevData.systemJapaneseJlptProgress || {})
      : isChineseHsk
      ? (prevData.systemChineseHskProgress || {})
      : (prevData.system3000Progress || {});
    const currentProg = progressMap[wordId];
    const repCount = currentProg?.repetitionCount || 0;
    const ef = currentProg?.easeFactor || 2.5;
    const interval = currentProg?.intervalDays || 0;
    const lapses = currentProg?.lapses || 0;

    const sm2 = calculateNextReview({
      rating,
      repetitionCount: repCount,
      easeFactor: ef,
      intervalDays: interval,
      lapses,
      lastReviewedAt: currentProg?.lastReviewedAt,
      reviewType
    });

    const memLevel = computeMemoryLevel(sm2.nextRepetitionCount, sm2.nextIntervalDays, sm2.nextLapses);

    const updatedProg: UserWordProgress = {
      wordId,
      state: sm2.nextState,
      memoryLevel: memLevel,
      repetitionCount: sm2.nextRepetitionCount,
      easeFactor: sm2.nextEaseFactor,
      intervalDays: sm2.nextIntervalDays,
      correctCount: (currentProg?.correctCount || 0) + (rating >= 3 ? 1 : 0),
      incorrectCount: (currentProg?.incorrectCount || 0) + (rating < 3 ? 1 : 0),
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt: sm2.nextReviewAt,
      reviewLogs: [...(currentProg?.reviewLogs || []), sm2.reviewLog],
      lapses: sm2.nextLapses,
      personalNotes: currentProg?.personalNotes,
      isFavorite: currentProg?.isFavorite,
      bookmarkedCollectionIds: currentProg?.bookmarkedCollectionIds,
      updatedAt: new Date().toISOString()
    };

    if (isJapaneseJlpt) {
      return {
        ...prevData,
        systemJapaneseJlptProgress: {
          ...(prevData.systemJapaneseJlptProgress || {}),
          [wordId]: updatedProg
        },
        lastStudyDate: new Date().toISOString().split('T')[0]
      };
    }

    if (isChineseHsk) {
      return {
        ...prevData,
        systemChineseHskProgress: {
          ...(prevData.systemChineseHskProgress || {}),
          [wordId]: updatedProg
        },
        lastStudyDate: new Date().toISOString().split('T')[0]
      };
    }

    return {
      ...prevData,
      system3000Progress: {
        ...(prevData.system3000Progress || {}),
        [wordId]: updatedProg
      },
      lastStudyDate: new Date().toISOString().split('T')[0]
    };
  } else {
    // Personal word
    const words = prevData.words[activeLangId] || [];
    const targetWord = words.find(w => w.id === wordId);
    if (!targetWord) return prevData;

    const sm2 = calculateNextReview({
      rating,
      repetitionCount: targetWord.repetitionCount,
      easeFactor: targetWord.easeFactor,
      intervalDays: targetWord.intervalDays,
      lapses: targetWord.lapses,
      lastReviewedAt: targetWord.lastReviewedAt,
      reviewType
    });

    const memLevel = computeMemoryLevel(sm2.nextRepetitionCount, sm2.nextIntervalDays, sm2.nextLapses);

    const updatedWords = words.map(w => {
      if (w.id !== wordId) return w;
      return {
        ...w,
        state: sm2.nextState,
        memoryLevel: memLevel,
        repetitionCount: sm2.nextRepetitionCount,
        easeFactor: sm2.nextEaseFactor,
        intervalDays: sm2.nextIntervalDays,
        correctCount: (w.correctCount || 0) + (rating >= 3 ? 1 : 0),
        incorrectCount: (w.incorrectCount || 0) + (rating < 3 ? 1 : 0),
        lastReviewedAt: new Date().toISOString(),
        nextReviewAt: sm2.nextReviewAt,
        reviewLogs: [...w.reviewLogs, sm2.reviewLog],
        lapses: sm2.nextLapses,
        updatedAt: new Date().toISOString()
      };
    });

    return {
      ...prevData,
      words: {
        ...prevData.words,
        [activeLangId]: updatedWords
      },
      lastStudyDate: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * Toggle bookmark of a system word (3000 or Chinese HSK) into a personal collection
 */
export function toggleBookmarkSystemWord(
  prevData: VocabUserData,
  wordId: string,
  collectionId: string
): VocabUserData {
  const isChineseHsk = wordId.startsWith('zh_hsk_');
  const isJapaneseJlpt = wordId.startsWith('ja_jlpt_') || wordId.startsWith('ja_sach100_');
  const progressMap = isJapaneseJlpt
    ? (prevData.systemJapaneseJlptProgress || {})
    : isChineseHsk
    ? (prevData.systemChineseHskProgress || {})
    : (prevData.system3000Progress || {});

  const currentProg = progressMap[wordId];
  const bookmarked = currentProg?.bookmarkedCollectionIds || [];
  const isAlready = bookmarked.includes(collectionId);
  const nextBookmarked = isAlready
    ? bookmarked.filter(id => id !== collectionId)
    : [...bookmarked, collectionId];

  const today = new Date().toISOString().split('T')[0];
  const updatedProg: UserWordProgress = {
    wordId,
    state: currentProg?.state || 'new',
    repetitionCount: currentProg?.repetitionCount || 0,
    easeFactor: currentProg?.easeFactor || 2.5,
    intervalDays: currentProg?.intervalDays || 0,
    lastReviewedAt: currentProg?.lastReviewedAt,
    nextReviewAt: currentProg?.nextReviewAt || today,
    reviewLogs: currentProg?.reviewLogs || [],
    lapses: currentProg?.lapses || 0,
    personalNotes: currentProg?.personalNotes,
    isFavorite: currentProg?.isFavorite,
    bookmarkedCollectionIds: nextBookmarked,
    updatedAt: new Date().toISOString()
  };

  // Also update collection's systemWordIds
  const langCollections = prevData.collections[prevData.activeLanguageId] || [];
  const updatedCollections = langCollections.map(col => {
    if (col.id !== collectionId) return col;
    const currentSysWords = col.systemWordIds || [];
    const updatedSysWords = isAlready
      ? currentSysWords.filter(id => id !== wordId)
      : [...currentSysWords, wordId];
    return { ...col, systemWordIds: updatedSysWords, updatedAt: new Date().toISOString() };
  });

  if (isJapaneseJlpt) {
    return {
      ...prevData,
      collections: {
        ...prevData.collections,
        [prevData.activeLanguageId]: updatedCollections
      },
      systemJapaneseJlptProgress: {
        ...(prevData.systemJapaneseJlptProgress || {}),
        [wordId]: updatedProg
      }
    };
  }

  if (isChineseHsk) {
    return {
      ...prevData,
      collections: {
        ...prevData.collections,
        [prevData.activeLanguageId]: updatedCollections
      },
      systemChineseHskProgress: {
        ...(prevData.systemChineseHskProgress || {}),
        [wordId]: updatedProg
      }
    };
  }

  return {
    ...prevData,
    collections: {
      ...prevData.collections,
      [prevData.activeLanguageId]: updatedCollections
    },
    system3000Progress: {
      ...(prevData.system3000Progress || {}),
      [wordId]: updatedProg
    }
  };
}

export const toggleBookmark3000Word = toggleBookmarkSystemWord;

/**
 * Directly mark a system word's state (e.g. Mastered / Difficult / New)
 */
export function setSystemWordState(
  prevData: VocabUserData,
  wordId: string,
  state: MasteryState
): VocabUserData {
  const isChineseHsk = wordId.startsWith('zh_hsk_');
  const isJapaneseJlpt = wordId.startsWith('ja_jlpt_') || wordId.startsWith('ja_sach100_');
  const progressMap = isJapaneseJlpt
    ? (prevData.systemJapaneseJlptProgress || {})
    : isChineseHsk
    ? (prevData.systemChineseHskProgress || {})
    : (prevData.system3000Progress || {});

  const currentProg = progressMap[wordId];
  const today = new Date().toISOString().split('T')[0];
  const updatedProg: UserWordProgress = {
    wordId,
    state,
    repetitionCount: state === 'mastered' ? Math.max(4, currentProg?.repetitionCount || 4) : (currentProg?.repetitionCount || 0),
    easeFactor: currentProg?.easeFactor || 2.5,
    intervalDays: state === 'mastered' ? 30 : (currentProg?.intervalDays || 0),
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: state === 'mastered' ? '2099-12-31' : (currentProg?.nextReviewAt || today),
    reviewLogs: currentProg?.reviewLogs || [],
    lapses: state === 'difficult' ? (currentProg?.lapses || 0) + 1 : (currentProg?.lapses || 0),
    personalNotes: currentProg?.personalNotes,
    isFavorite: currentProg?.isFavorite,
    bookmarkedCollectionIds: currentProg?.bookmarkedCollectionIds,
    updatedAt: new Date().toISOString()
  };

  if (isJapaneseJlpt) {
    return {
      ...prevData,
      systemJapaneseJlptProgress: {
        ...(prevData.systemJapaneseJlptProgress || {}),
        [wordId]: updatedProg
      }
    };
  }

  if (isChineseHsk) {
    return {
      ...prevData,
      systemChineseHskProgress: {
        ...(prevData.systemChineseHskProgress || {}),
        [wordId]: updatedProg
      }
    };
  }

  return {
    ...prevData,
    system3000Progress: {
      ...(prevData.system3000Progress || {}),
      [wordId]: updatedProg
    }
  };
}

export const set3000WordState = setSystemWordState;

/**
 * Save personal notes or memory tip for a system word
 */
export function saveSystemWordNotes(
  prevData: VocabUserData,
  wordId: string,
  personalNotes: string
): VocabUserData {
  const isChineseHsk = wordId.startsWith('zh_hsk_');
  const isJapaneseJlpt = wordId.startsWith('ja_jlpt_') || wordId.startsWith('ja_sach100_');
  const progressMap = isJapaneseJlpt
    ? (prevData.systemJapaneseJlptProgress || {})
    : isChineseHsk
    ? (prevData.systemChineseHskProgress || {})
    : (prevData.system3000Progress || {});

  const currentProg = progressMap[wordId];
  const today = new Date().toISOString().split('T')[0];
  const updatedProg: UserWordProgress = {
    wordId,
    state: currentProg?.state || 'new',
    repetitionCount: currentProg?.repetitionCount || 0,
    easeFactor: currentProg?.easeFactor || 2.5,
    intervalDays: currentProg?.intervalDays || 0,
    lastReviewedAt: currentProg?.lastReviewedAt,
    nextReviewAt: currentProg?.nextReviewAt || today,
    reviewLogs: currentProg?.reviewLogs || [],
    lapses: currentProg?.lapses || 0,
    personalNotes,
    isFavorite: currentProg?.isFavorite,
    bookmarkedCollectionIds: currentProg?.bookmarkedCollectionIds,
    updatedAt: new Date().toISOString()
  };

  if (isJapaneseJlpt) {
    return {
      ...prevData,
      systemJapaneseJlptProgress: {
        ...(prevData.systemJapaneseJlptProgress || {}),
        [wordId]: updatedProg
      }
    };
  }

  if (isChineseHsk) {
    return {
      ...prevData,
      systemChineseHskProgress: {
        ...(prevData.systemChineseHskProgress || {}),
        [wordId]: updatedProg
      }
    };
  }

  return {
    ...prevData,
    system3000Progress: {
      ...(prevData.system3000Progress || {}),
      [wordId]: updatedProg
    }
  };
}

export const save3000WordNotes = saveSystemWordNotes;

// ------------------------------------------------------------------------------
// PERSONALIZED VOCABULARY LEARNING ROOM HELPERS (REQUIREMENT 134)
// ------------------------------------------------------------------------------

export const DEFAULT_LEARNING_PREFERENCES: UserLearningPreferences = {
  preferredTopics: ['all'],
  preferredDifficulty: 'all',
  preferredModes: ['flashcard', 'flashcard_reverse', 'quiz', 'spelling'],
  defaultCount: 20,
  defaultDurationMinutes: 15
};

/**
 * Toggle difficult flag (💡) on any word (system or personal)
 */
export function toggleWordDifficult(
  prevData: VocabUserData,
  wordId: string
): VocabUserData {
  const isChineseHsk = wordId.startsWith('zh_hsk_');
  const isJapaneseJlpt = wordId.startsWith('ja_jlpt_') || wordId.startsWith('ja_sach100_');
  const isSystem3000 = wordId.startsWith('word_3000_');

  if (isJapaneseJlpt || isChineseHsk || isSystem3000) {
    const progressMap = isJapaneseJlpt
      ? (prevData.systemJapaneseJlptProgress || {})
      : isChineseHsk
      ? (prevData.systemChineseHskProgress || {})
      : (prevData.system3000Progress || {});

    const currentProg = progressMap[wordId];
    const isCurrentlyDifficult = currentProg?.isDifficult || false;
    const updatedProg: UserWordProgress = {
      wordId,
      state: currentProg?.state || 'new',
      repetitionCount: currentProg?.repetitionCount || 0,
      easeFactor: currentProg?.easeFactor || 2.5,
      intervalDays: currentProg?.intervalDays || 0,
      lastReviewedAt: currentProg?.lastReviewedAt,
      nextReviewAt: currentProg?.nextReviewAt || new Date().toISOString().split('T')[0],
      reviewLogs: currentProg?.reviewLogs || [],
      lapses: currentProg?.lapses || 0,
      personalNotes: currentProg?.personalNotes,
      isFavorite: currentProg?.isFavorite,
      isDifficult: !isCurrentlyDifficult,
      reviewLater: currentProg?.reviewLater,
      bookmarkedCollectionIds: currentProg?.bookmarkedCollectionIds,
      updatedAt: new Date().toISOString()
    };

    if (isJapaneseJlpt) {
      return {
        ...prevData,
        systemJapaneseJlptProgress: { ...(prevData.systemJapaneseJlptProgress || {}), [wordId]: updatedProg }
      };
    }
    if (isChineseHsk) {
      return {
        ...prevData,
        systemChineseHskProgress: { ...(prevData.systemChineseHskProgress || {}), [wordId]: updatedProg }
      };
    }
    return {
      ...prevData,
      system3000Progress: { ...(prevData.system3000Progress || {}), [wordId]: updatedProg }
    };
  }

  // Personal word
  const words = prevData.words[prevData.activeLanguageId] || [];
  return {
    ...prevData,
    words: {
      ...prevData.words,
      [prevData.activeLanguageId]: words.map(w =>
        w.id === wordId ? { ...w, isDifficult: !w.isDifficult, updatedAt: new Date().toISOString() } : w
      )
    }
  };
}

/**
 * Toggle review later flag (📌) on any word
 */
export function toggleWordReviewLater(
  prevData: VocabUserData,
  wordId: string
): VocabUserData {
  const isChineseHsk = wordId.startsWith('zh_hsk_');
  const isJapaneseJlpt = wordId.startsWith('ja_jlpt_') || wordId.startsWith('ja_sach100_');
  const isSystem3000 = wordId.startsWith('word_3000_');

  if (isJapaneseJlpt || isChineseHsk || isSystem3000) {
    const progressMap = isJapaneseJlpt
      ? (prevData.systemJapaneseJlptProgress || {})
      : isChineseHsk
      ? (prevData.systemChineseHskProgress || {})
      : (prevData.system3000Progress || {});

    const currentProg = progressMap[wordId];
    const isCurrentlyMarked = currentProg?.reviewLater || false;
    const updatedProg: UserWordProgress = {
      wordId,
      state: currentProg?.state || 'new',
      repetitionCount: currentProg?.repetitionCount || 0,
      easeFactor: currentProg?.easeFactor || 2.5,
      intervalDays: currentProg?.intervalDays || 0,
      lastReviewedAt: currentProg?.lastReviewedAt,
      nextReviewAt: currentProg?.nextReviewAt || new Date().toISOString().split('T')[0],
      reviewLogs: currentProg?.reviewLogs || [],
      lapses: currentProg?.lapses || 0,
      personalNotes: currentProg?.personalNotes,
      isFavorite: currentProg?.isFavorite,
      isDifficult: currentProg?.isDifficult,
      reviewLater: !isCurrentlyMarked,
      bookmarkedCollectionIds: currentProg?.bookmarkedCollectionIds,
      updatedAt: new Date().toISOString()
    };

    if (isJapaneseJlpt) {
      return {
        ...prevData,
        systemJapaneseJlptProgress: { ...(prevData.systemJapaneseJlptProgress || {}), [wordId]: updatedProg }
      };
    }
    if (isChineseHsk) {
      return {
        ...prevData,
        systemChineseHskProgress: { ...(prevData.systemChineseHskProgress || {}), [wordId]: updatedProg }
      };
    }
    return {
      ...prevData,
      system3000Progress: { ...(prevData.system3000Progress || {}), [wordId]: updatedProg }
    };
  }

  // Personal word
  const words = prevData.words[prevData.activeLanguageId] || [];
  return {
    ...prevData,
    words: {
      ...prevData.words,
      [prevData.activeLanguageId]: words.map(w =>
        w.id === wordId ? { ...w, reviewLater: !w.reviewLater, updatedAt: new Date().toISOString() } : w
      )
    }
  };
}

/**
 * Universal favorite toggle (⭐) for any word ID across all datasets
 */
export function toggleUniversalFavorite(
  prevData: VocabUserData,
  wordId: string
): VocabUserData {
  const isChineseHsk = wordId.startsWith('zh_hsk_');
  const isJapaneseJlpt = wordId.startsWith('ja_jlpt_') || wordId.startsWith('ja_sach100_');
  const isSystem3000 = wordId.startsWith('word_3000_');

  if (isJapaneseJlpt || isChineseHsk || isSystem3000) {
    const progressMap = isJapaneseJlpt
      ? (prevData.systemJapaneseJlptProgress || {})
      : isChineseHsk
      ? (prevData.systemChineseHskProgress || {})
      : (prevData.system3000Progress || {});

    const currentProg = progressMap[wordId];
    const isFav = currentProg?.isFavorite || false;
    const updatedProg: UserWordProgress = {
      wordId,
      state: currentProg?.state || 'new',
      repetitionCount: currentProg?.repetitionCount || 0,
      easeFactor: currentProg?.easeFactor || 2.5,
      intervalDays: currentProg?.intervalDays || 0,
      lastReviewedAt: currentProg?.lastReviewedAt,
      nextReviewAt: currentProg?.nextReviewAt || new Date().toISOString().split('T')[0],
      reviewLogs: currentProg?.reviewLogs || [],
      lapses: currentProg?.lapses || 0,
      personalNotes: currentProg?.personalNotes,
      isFavorite: !isFav,
      isDifficult: currentProg?.isDifficult,
      reviewLater: currentProg?.reviewLater,
      bookmarkedCollectionIds: currentProg?.bookmarkedCollectionIds,
      updatedAt: new Date().toISOString()
    };

    if (isJapaneseJlpt) {
      return {
        ...prevData,
        systemJapaneseJlptProgress: { ...(prevData.systemJapaneseJlptProgress || {}), [wordId]: updatedProg }
      };
    }
    if (isChineseHsk) {
      return {
        ...prevData,
        systemChineseHskProgress: { ...(prevData.systemChineseHskProgress || {}), [wordId]: updatedProg }
      };
    }
    return {
      ...prevData,
      system3000Progress: { ...(prevData.system3000Progress || {}), [wordId]: updatedProg }
    };
  }

  // Personal word
  const words = prevData.words[prevData.activeLanguageId] || [];
  return {
    ...prevData,
    words: {
      ...prevData.words,
      [prevData.activeLanguageId]: words.map(w =>
        w.id === wordId ? { ...w, isFavorite: !w.isFavorite, updatedAt: new Date().toISOString() } : w
      )
    }
  };
}

/**
 * Manage Learning Queue (Hàng đợi học tập cá nhân)
 */
export function addToLearningQueue(prevData: VocabUserData, wordIds: string[]): VocabUserData {
  const currentQueue = prevData.learningQueue || [];
  const set = new Set(currentQueue);
  for (const id of wordIds) {
    set.add(id);
  }
  return {
    ...prevData,
    learningQueue: Array.from(set)
  };
}

export function removeFromLearningQueue(prevData: VocabUserData, wordId: string): VocabUserData {
  const currentQueue = prevData.learningQueue || [];
  return {
    ...prevData,
    learningQueue: currentQueue.filter(id => id !== wordId)
  };
}

export function reorderLearningQueue(prevData: VocabUserData, newQueue: string[]): VocabUserData {
  return {
    ...prevData,
    learningQueue: newQueue
  };
}

export function saveUserLearningPreferences(
  prevData: VocabUserData,
  prefs: UserLearningPreferences
): VocabUserData {
  return {
    ...prevData,
    learningPreferences: prefs
  };
}

/**
 * Universal Search across all dictionaries (Oxford 3000, HSK, JLPT, and Personal Words)
 */
export function searchAllDictionaries(
  query: string,
  languageId: string,
  limit: number = 25
): { word: VocabWord; source: 'system' | 'personal' }[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const results: { word: VocabWord; source: 'system' | 'personal'; score: number }[] = [];

  // 1. English Oxford 3000
  if (languageId === 'en') {
    for (const sys of OXFORD_3000_WORDS) {
      const termLower = sys.term.toLowerCase();
      const meaningLower = (sys.meaning || '').toLowerCase();
      let score = 0;
      if (termLower === q) score += 100;
      else if (termLower.startsWith(q)) score += 50;
      else if (termLower.includes(q)) score += 25;
      else if (meaningLower.includes(q)) score += 10;

      if (score > 0) {
        results.push({
          word: systemWordToVocabWord(sys),
          source: 'system',
          score
        });
      }
    }
  }

  // 2. Chinese HSK
  if (languageId === 'zh') {
    for (const sys of CHINESE_HSK_WORDS) {
      const termLower = sys.term.toLowerCase();
      const pinyinLower = (sys.pinyin || '').toLowerCase();
      const meaningLower = (sys.meaning || '').toLowerCase();
      let score = 0;
      if (termLower === q || pinyinLower === q) score += 100;
      else if (termLower.includes(q)) score += 60;
      else if (pinyinLower.includes(q)) score += 40;
      else if (meaningLower.includes(q)) score += 10;

      if (score > 0) {
        results.push({
          word: systemChineseWordToVocabWord(sys),
          source: 'system',
          score
        });
      }
    }
  }

  // 3. Japanese JLPT
  if (languageId === 'ja') {
    for (const sys of JAPANESE_JLPT_WORDS) {
      const termLower = sys.term.toLowerCase();
      const furiLower = (sys.furigana || '').toLowerCase();
      const romajiLower = (sys.romaji || '').toLowerCase();
      const hanVietLower = (sys.hanViet || '').toLowerCase();
      const meaningLower = (sys.meaning || '').toLowerCase();
      let score = 0;
      if (termLower === q || furiLower === q || romajiLower === q) score += 100;
      else if (termLower.includes(q) || furiLower.includes(q)) score += 50;
      else if (romajiLower.includes(q)) score += 30;
      else if (hanVietLower.includes(q)) score += 20;
      else if (meaningLower.includes(q)) score += 10;

      if (score > 0) {
        results.push({
          word: systemJapaneseWordToVocabWord(sys),
          source: 'system',
          score
        });
      }
    }
  }

  // Sort by relevance score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map(r => ({ word: r.word, source: r.source }));
}

