// ==============================================================================
// CHINESE VOCABULARY MASTER — DATA SERVICE
// ==============================================================================
// Manages 10,240 System HSK Words + Personal Words (我的词汇),
// User Data Isolation, SM-2 Spaced Repetition Binding, and Audit Overrides.

import rawChineseWords from '../../data/chineseHskWords.json';
import { ChineseWord, ChineseQualityControlSummary, ChineseProposedEdit } from './types';
import { verifyChineseWord, runFullChineseQualityAudit } from './chineseVerificationEngine';
import { stripPinyinTones } from './pinyinToneEngine';
import { UserWordProgress, MasteryState, calculateNextReview } from '../vocabEngine';

let cachedSystemChineseWords: ChineseWord[] | null = null;

/**
 * Load and cache all verified System Chinese HSK words
 */
export function getSystemChineseWords(overridesMap: Record<string, any> = {}): ChineseWord[] {
  if (!cachedSystemChineseWords) {
    cachedSystemChineseWords = (rawChineseWords as any[]).map(raw => {
      const override = overridesMap[raw.id];
      return verifyChineseWord(raw, override);
    });
  }
  return cachedSystemChineseWords;
}

/**
 * Get Chinese Vocabulary Audit KPI Summary
 */
export function getChineseAuditSummary(
  personalWords: any[] = [],
  overridesMap: Record<string, any> = {}
): {
  summary: ChineseQualityControlSummary;
  allWords: ChineseWord[];
} {
  const systemWords = rawChineseWords as any[];
  const audit = runFullChineseQualityAudit(systemWords, personalWords, overridesMap);
  return {
    summary: audit.summary,
    allWords: audit.reports
  };
}

/**
 * Filter words by search query, HSK level, and verification status
 */
export function filterChineseWords(
  words: ChineseWord[],
  options: {
    query?: string;
    level?: number;
    status?: string;
    pos?: string;
    hasConfusableOnly?: boolean;
    hasToneSandhiOnly?: boolean;
  }
): ChineseWord[] {
  const { query, level, status, pos, hasConfusableOnly, hasToneSandhiOnly } = options;
  const q = query?.trim().toLowerCase();

  return words.filter(w => {
    // 1. Level
    if (level && level > 0) {
      if (level === 7) {
        if (w.hskLevel < 7) return false;
      } else if (w.hskLevel !== level) {
        return false;
      }
    }

    // 2. Query (Hanzi term, traditionalTerm, Pinyin with/without tones, Meaning)
    if (q) {
      const qToneless = stripPinyinTones(q);
      const matchTerm = w.term.toLowerCase().includes(q);
      const matchTrad = w.traditionalTerm?.toLowerCase().includes(q);
      const matchPinyin = w.pinyin.toLowerCase().includes(q) || stripPinyinTones(w.pinyin).includes(qToneless);
      const matchMeaning = w.meaning.toLowerCase().includes(q);
      if (!matchTerm && !matchTrad && !matchPinyin && !matchMeaning) return false;
    }

    // 3. Status
    if (status && status !== 'all') {
      if (status === 'verified' && w.verificationStatus !== 'dictionary_verified' && w.verificationStatus !== 'approved') return false;
      if (status === 'needs_review' && w.verificationStatus !== 'needs_review') return false;
      if (status === 'flagged_error' && w.verificationStatus !== 'flagged_error') return false;
      if (status === 'format_checked' && w.verificationStatus !== 'format_checked') return false;
    }

    // 4. POS
    if (pos && pos !== 'all') {
      if (!w.pos.toLowerCase().includes(pos.toLowerCase())) return false;
    }

    // 5. Confusable filter
    if (hasConfusableOnly && (!w.confusables || w.confusables.length === 0)) return false;

    // 6. Tone Sandhi filter
    if (hasToneSandhiOnly && !w.toneSandhi) return false;

    return true;
  });
}

/**
 * Handle Spaced Repetition (SM-2) review update for a Chinese word
 */
export function updateChineseWordSpacedRepetition(
  prevProgress: UserWordProgress | undefined,
  wordId: string,
  rating: 1 | 2 | 3 | 4
): UserWordProgress {
  const existing = prevProgress || {
    wordId,
    state: 'new' as MasteryState,
    repetitionCount: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: new Date().toISOString().split('T')[0],
    reviewLogs: [],
    lapses: 0,
    updatedAt: new Date().toISOString()
  };

  const sm2Result = calculateNextReview({
    rating,
    repetitionCount: existing.repetitionCount,
    easeFactor: existing.easeFactor,
    intervalDays: existing.intervalDays,
    lapses: existing.lapses,
    lastReviewedAt: existing.lastReviewedAt
  });

  return {
    ...existing,
    state: sm2Result.nextState,
    repetitionCount: sm2Result.nextRepetitionCount,
    easeFactor: sm2Result.nextEaseFactor,
    intervalDays: sm2Result.nextIntervalDays,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: sm2Result.nextReviewAt,
    lapses: sm2Result.nextLapses,
    reviewLogs: [...existing.reviewLogs, sm2Result.reviewLog],
    updatedAt: new Date().toISOString()
  };
}
