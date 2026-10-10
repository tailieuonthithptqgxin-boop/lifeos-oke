// ==============================================================================
// CHINESE VOCABULARY MASTER — PINYIN & TONE SANDHI ENGINE
// ==============================================================================
// Accurate Syllable Parsing, Tone Mark Verification (1-4 and Neutral Tone),
// and Tone Sandhi (Biến điệu) Rules for Mandarin Chinese.

import { PinyinAnalysis } from './types';

// Tone Vowel Character Sets
const TONE_1 = ['ā', 'ē', 'ī', 'ō', 'ū', 'ǖ', 'Ā', 'Ē', 'Ī', 'Ō', 'Ū', 'Ǖ'];
const TONE_2 = ['á', 'é', 'í', 'ó', 'ú', 'ǘ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ǘ'];
const TONE_3 = ['ǎ', 'ě', 'ǐ', 'ǒ', 'ǔ', 'ǚ', 'Ǎ', 'Ě', 'Ǐ', 'Ǒ', 'Ǔ', 'Ǚ'];
const TONE_4 = ['à', 'è', 'ì', 'ò', 'ù', 'ǜ', 'À', 'È', 'Ì', 'Ò', 'Ù', 'Ǜ'];

/**
 * Detect tone number from a single syllable
 * 1: Yinping (Âm bình)
 * 2: Yangping (Dương bình)
 * 3: Shangsheng (Thượng thanh)
 * 4: Qusheng (Khứ thanh)
 * 0: Qingsheng (Thanh nhẹ / Neutral)
 */
export function getToneFromSyllable(syllable: string): number {
  for (const ch of syllable) {
    if (TONE_1.includes(ch)) return 1;
    if (TONE_2.includes(ch)) return 2;
    if (TONE_3.includes(ch)) return 3;
    if (TONE_4.includes(ch)) return 4;
  }
  return 0; // Neutral tone
}

/**
 * Remove tone diacritics from Pinyin for flexible searching
 * e.g. "xuéxí" -> "xuexi", "nǐ hǎo" -> "ni hao"
 */
export function stripPinyinTones(pinyin: string): string {
  if (!pinyin) return '';
  return pinyin
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[āáǎà]/gi, 'a')
    .replace(/[ēéěè]/gi, 'e')
    .replace(/[īíǐì]/gi, 'i')
    .replace(/[ōóǒò]/gi, 'o')
    .replace(/[ūúǔù]/gi, 'u')
    .replace(/[ǖǘǚǜü]/gi, 'v')
    .toLowerCase();
}

/**
 * Split Pinyin string into individual syllables
 * Supports space-separated, apostrophe-separated (xi'an), or concatenated syllables.
 */
export function splitPinyinSyllables(pinyin: string): string[] {
  if (!pinyin || !pinyin.trim()) return [];
  const clean = pinyin.trim();

  // If already separated by space or apostrophe
  if (clean.includes(' ') || clean.includes("'")) {
    return clean.split(/[\s']+/).filter(Boolean);
  }

  // Regex-based syllable segmentation for standard mandarin pinyin
  const pinyinRegex = /(?:[bcdfghjklmnpqrstwxyzBCDFGHJKLMNPQRSTWXYZ]?[h]?)?[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜAEIOUÜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛ]+(?:ng|n|r)?/g;
  const matches = clean.match(pinyinRegex);
  if (matches && matches.length > 0) {
    return matches;
  }

  return [clean];
}

/**
 * Detect Tone Sandhi (Quy tắc biến điệu ngữ âm tiếng Trung)
 */
export function detectToneSandhi(hanzi: string, pinyin: string): string | undefined {
  if (!hanzi || !pinyin) return undefined;
  const syllables = splitPinyinSyllables(pinyin);
  const tones = syllables.map(s => getToneFromSyllable(s));

  // 1. Two 3rd tones in succession (3 + 3 -> 2 + 3)
  for (let i = 0; i < tones.length - 1; i++) {
    if (tones[i] === 3 && tones[i + 1] === 3) {
      const w1 = hanzi[i] || syllables[i];
      const w2 = hanzi[i + 1] || syllables[i + 1];
      return `Biến điệu 2 thanh 3 liền kề (${w1}${w2}): Âm tiết thứ nhất chuyển đọc thành thanh 2 (ví dụ: 你好 nǐ hǎo → đọc là ní hǎo).`;
    }
  }

  // 2. Sandhi for "一" (yī)
  if (hanzi.includes('一') && hanzi.length > 1) {
    const idx = hanzi.indexOf('一');
    const nextChar = hanzi[idx + 1];
    const nextTone = tones[idx + 1];

    if (nextTone === 4) {
      return `Biến điệu chữ "一" trước thanh 4: "一" đứng trước thanh 4 đổi đọc thành thanh 2 (yí) (ví dụ: 一定 yídìng, 一样 yíyàng).`;
    } else if (nextTone >= 1 && nextTone <= 3) {
      return `Biến điệu chữ "一" trước thanh 1, 2, 3: "一" đổi đọc thành thanh 4 (yì) (ví dụ: 一天 yìtiān, 一起 yìqǐ).`;
    }
  }

  // 3. Sandhi for "不" (bù)
  if (hanzi.includes('不') && hanzi.length > 1) {
    const idx = hanzi.indexOf('不');
    const nextTone = tones[idx + 1];

    if (nextTone === 4) {
      return `Biến điệu chữ "不" trước thanh 4: "不" đứng trước thanh 4 đổi đọc thành thanh 2 (bú) (ví dụ: 不是 búshì, 不要 búyào).`;
    }
  }

  return undefined;
}

/**
 * Full Linguistic Pinyin Analysis
 */
export function analyzePinyin(pinyin: string, hanzi?: string): PinyinAnalysis {
  if (!pinyin || !pinyin.trim()) {
    return {
      raw: '',
      syllables: [],
      toneMarks: [],
      neutralToneDetected: false
    };
  }

  const clean = pinyin.trim();
  const syllables = splitPinyinSyllables(clean);
  const toneMarks = syllables.map(s => getToneFromSyllable(s));
  const neutralToneDetected = toneMarks.some(t => t === 0);
  const toneSandhiNotes = hanzi ? detectToneSandhi(hanzi, clean) : undefined;

  return {
    raw: clean,
    syllables,
    toneMarks,
    neutralToneDetected,
    toneSandhiNotes
  };
}

/**
 * Validate Pinyin Syntax & Vietnamese Corruption
 */
export function validatePinyinSyntax(pinyin: string, hanziLength?: number): {
  valid: boolean;
  score: number;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!pinyin || !pinyin.trim()) {
    errors.push('Pinyin bị bỏ trống hoàn toàn.');
    return { valid: false, score: 0, warnings, errors };
  }

  const clean = pinyin.trim();

  // Check for corrupted encoding
  if (clean.includes('\uFFFD') || clean.includes('?')) {
    errors.push('Pinyin chứa ký tự lỗi font mã hóa (corrupted Unicode glyph).');
    score -= 60;
  }

  // Check for Vietnamese phonetic approximation incorrectly used as Pinyin
  if (/[ơưđĐ]/i.test(clean)) {
    errors.push('Pinyin chứa ký tự chữ cái tiếng Việt (ơ, ư, đ), đây không phải phiên âm quốc tế Hanyu Pinyin chuẩn.');
    score -= 70;
  }

  // Check syllable count alignment with Hanzi
  const syllables = splitPinyinSyllables(clean);
  if (hanziLength && hanziLength > 0 && syllables.length !== hanziLength) {
    // Some compound words or interjections may have slight variance, but warn
    warnings.push(`Số lượng âm tiết Pinyin (${syllables.length}) không khớp chính xác với số chữ Hán (${hanziLength}).`);
    score -= 15;
  }

  // Check if syllables have tone marks
  const tones = syllables.map(s => getToneFromSyllable(s));
  const allNeutral = tones.every(t => t === 0);
  if (allNeutral && syllables.length > 0 && !['ma', 'ba', 'ne', 'de', 'le'].includes(clean.toLowerCase())) {
    warnings.push('Pinyin không có dấu thanh điệu (chỉ chứa thanh nhẹ hoặc chưa gán dấu thanh).');
    score -= 20;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}
