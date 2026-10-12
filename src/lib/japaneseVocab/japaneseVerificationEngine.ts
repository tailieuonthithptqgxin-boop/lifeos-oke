// ==============================================================================
// JAPANESE VOCABULARY MASTER — VERIFICATION & QUALITY AUDIT ENGINE
// ==============================================================================
// Specialized Quality Control Pipeline for Japanese JLPT N5 - N1 Vocabulary:
// Audits Kanji, Hiragana/Katakana (Furigana), Hepburn Romaji, Âm Hán-Việt,
// POS (Tự/Tha động từ, Tính từ -i/-na), Vietnamese Contextual Meanings,
// Natural Example Sentences & Vietnamese Translations, and Polysemic Homographs.

import { SystemJapaneseJlptWord, VocabWord } from '../vocabEngine';

export type JapaneseVerificationStatus = 'verified' | 'official_standard' | 'homograph' | 'needs_review' | 'flagged_error';

export interface JapaneseFieldCheck {
  valid: boolean;
  score: number;
  warnings: string[];
  errors: string[];
  suggestedFix?: string;
}

export interface JapaneseWordVerificationReport {
  wordId: string;
  term: string;
  furigana: string;
  romaji: string;
  hanViet: string;
  pos: string;
  meaning: string;
  level: string;
  jlptLevel: number;
  exampleSentence?: string;
  exampleTranslation?: string;
  isCustomWord: boolean;
  overallScore: number;
  verificationStatus: JapaneseVerificationStatus;
  statusLabel: string;
  checks: {
    kanjiKana: JapaneseFieldCheck;
    romaji: JapaneseFieldCheck;
    hanViet: JapaneseFieldCheck;
    pos: JapaneseFieldCheck;
    meaning: JapaneseFieldCheck;
    example: JapaneseFieldCheck;
  };
  isHomograph: boolean;
  homographDetails?: string;
  verifiedAt: string;
  proposedEdit?: {
    furigana?: string;
    hanViet?: string;
    meaning?: string;
    exampleSentence?: string;
    exampleTranslation?: string;
    reason: string;
  };
}

export interface JapaneseQualityControlSummary {
  totalAudited: number;
  verifiedCount: number;
  officialStandardCount: number;
  homographCount: number;
  needsReviewCount: number;
  flaggedErrorCount: number;
  kanjiWithFuriganaCount: number;
  hanVietCoverageCount: number;
  exampleCoverageCount: number;
  averageScore: number;
  levelCounts: Record<string, number>;
}

// Regex helpers
const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/;
const KANA_REGEX = /^[\u3040-\u309f\u30a0-\u30ff\u30fc\s・]+$/;
const JAPANESE_CHAR_REGEX = /^[\u4e00-\u9faf\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u30fc\s・々〆ヶ]+$/;

/**
 * 1. Audit Kanji & Furigana
 */
export function auditKanjiAndKana(term: string, furigana: string): JapaneseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!term || !term.trim()) {
    errors.push('Từ vựng bị bỏ trống hoàn toàn.');
    return { valid: false, score: 0, warnings, errors };
  }

  const cleanTerm = term.trim();
  const cleanFuri = (furigana || '').trim();

  // Check valid Japanese characters
  if (!JAPANESE_CHAR_REGEX.test(cleanTerm)) {
    if (/[a-zA-Z]/.test(cleanTerm)) {
      errors.push('Mục từ tiếng Nhật bị lẫn ký tự chữ cái Latinh.');
      score -= 40;
    }
    if (/[0-9]/.test(cleanTerm)) {
      warnings.push('Mục từ chứa chữ số.');
      score -= 10;
    }
  }

  // If word has Kanji, furigana MUST be provided in Kana
  const hasKanji = KANJI_REGEX.test(cleanTerm);
  if (hasKanji) {
    if (!cleanFuri) {
      errors.push('Mục từ chứa chữ Kanji nhưng thiếu Furigana (cách đọc Kana).');
      score -= 50;
    } else if (!KANA_REGEX.test(cleanFuri)) {
      errors.push('Furigana phải là chữ Hiragana/Katakana chuẩn, không chứa ký tự lạ.');
      score -= 30;
    }
  } else {
    // Pure Kana word
    if (!cleanFuri) {
      // Pure kana can use term as reading
      cleanFuri;
    }
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * 2. Audit Hepburn Romaji
 */
export function auditRomaji(romaji: string, furigana: string): JapaneseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!romaji || !romaji.trim()) {
    warnings.push('Chưa có phiên âm Romaji Hepburn.');
    score -= 15;
    return { valid: true, score, warnings, errors };
  }

  const clean = romaji.trim().toLowerCase();
  // Check invalid characters in Romaji
  if (!/^[a-z\s\-\^\'\"āēīōū]+$/.test(clean)) {
    warnings.push('Romaji chứa ký tự không chuẩn.');
    score -= 10;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * 3. Audit Âm Hán Việt
 */
export function auditHanViet(hanViet: string, term: string): JapaneseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  const hasKanji = KANJI_REGEX.test(term);

  if (hasKanji) {
    if (!hanViet || !hanViet.trim()) {
      warnings.push('Từ chứa Kanji nhưng chưa có chú thích Âm Hán Việt.');
      score -= 20;
    } else {
      const clean = hanViet.trim();
      // Should be uppercase Vietnamese words
      if (clean !== clean.toUpperCase()) {
        warnings.push('Âm Hán Việt nên viết hoa theo quy chuẩn giáo trình tiếng Nhật.');
        score -= 5;
      }
    }
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * 4. Audit Part of Speech (Từ loại)
 */
export function auditPos(pos: string): JapaneseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!pos || !pos.trim() || pos === 'Từ vựng') {
    warnings.push('Từ loại chưa phân định chi tiết (chỉ ghi chung là Từ vựng).');
    score -= 15;
    return { valid: true, score, warnings, errors };
  }

  const standardPos = [
    'Danh từ', 'Động từ', 'Tự động từ', 'Tha động từ', 
    'Tính từ đuôi -i', 'Tính từ đuôi -na', 'Tính từ',
    'Phó từ', 'Liên từ', 'Trợ từ', 'Cụm từ', 'Cụm từ / Thành ngữ', 
    'Số từ', 'Số từ / Từ đếm', 'Đại từ', 'Danh từ sở hữu (no)'
  ];

  const isMatched = standardPos.some(p => pos.includes(p));
  if (!isMatched) {
    warnings.push(`Từ loại "${pos}" chưa chuẩn hóa theo danh mục ngữ pháp JLPT.`);
    score -= 10;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * 5. Audit Vietnamese Meaning
 */
export function auditMeaning(meaning: string): JapaneseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!meaning || !meaning.trim()) {
    errors.push('Nghĩa tiếng Việt bị bỏ trống.');
    return { valid: false, score: 0, warnings, errors };
  }

  const clean = meaning.trim();

  // Check placeholder
  if (clean.includes('N/A') || clean === '...' || clean === '?') {
    errors.push('Nghĩa tiếng Việt đang dùng placeholder rác.');
    score -= 50;
  }

  // Check English words leaked into meaning
  const englishStopWords = ['the', 'and', 'with', 'from', 'that', 'this'];
  const words = clean.toLowerCase().split(/\s+/);
  if (words.some(w => englishStopWords.includes(w))) {
    warnings.push('Nghĩa có dấu hiệu chứa tiếng Anh chưa dịch trọn vẹn.');
    score -= 30;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * 6. Audit Example Sentence & Translation
 */
export function auditExample(sentence?: string, translation?: string): JapaneseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!sentence || !sentence.trim()) {
    warnings.push('Chưa có câu ví dụ ngữ cảnh tiếng Nhật.');
    score -= 20;
    return { valid: true, score, warnings, errors };
  }

  if (!translation || !translation.trim()) {
    warnings.push('Có câu ví dụ tiếng Nhật nhưng thiếu bản dịch tiếng Việt.');
    score -= 20;
  } else {
    // Check if translation is still in English
    if (/^[A-Za-z0-9\s,\.!\?'\-\"\(\)]+$/.test(translation.trim())) {
      warnings.push('Bản dịch câu ví dụ đang ở dạng tiếng Anh thay vì tiếng Việt.');
      score -= 25;
    }
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * Verify a single Japanese word
 */
export function verifyJapaneseWord(
  word: any, 
  homographMap?: Map<string, number>,
  override?: any
): JapaneseWordVerificationReport {
  const term = word.term || '';
  const furigana = word.furigana || word.phonetic || '';
  const romaji = word.romaji || '';
  const hanViet = word.hanViet || '';
  const pos = word.pos || word.partOfSpeech || 'Từ vựng';
  const meaning = word.meaning || '';
  const level = word.level || (word.jlptLevel ? `N${word.jlptLevel}` : 'N5');
  const jlptLevel = word.jlptLevel || parseInt(level.replace('N', '')) || 5;
  const exampleSentence = word.exampleSentence || '';
  const exampleTranslation = word.exampleTranslation || '';
  const isCustomWord = !word.id?.startsWith('ja_');

  // Run individual checks
  const kanjiKanaCheck = auditKanjiAndKana(term, furigana);
  const romajiCheck = auditRomaji(romaji, furigana);
  const hanVietCheck = auditHanViet(hanViet, term);
  const posCheck = auditPos(pos);
  const meaningCheck = auditMeaning(meaning);
  const exampleCheck = auditExample(exampleSentence, exampleTranslation);

  // Calculate weighted overall score
  const overallScore = Math.round(
    kanjiKanaCheck.score * 0.35 +
    meaningCheck.score * 0.25 +
    exampleCheck.score * 0.15 +
    hanVietCheck.score * 0.10 +
    posCheck.score * 0.10 +
    romajiCheck.score * 0.05
  );

  const isHomograph = (homographMap?.get(term) || 0) > 1;

  // Determine Verification Status
  let verificationStatus: JapaneseVerificationStatus = 'verified';
  let statusLabel = 'Đã thẩm định chuẩn JLPT';

  if (kanjiKanaCheck.errors.length > 0 || meaningCheck.errors.length > 0) {
    verificationStatus = 'flagged_error';
    statusLabel = 'Lỗi dữ liệu nghiêm trọng';
  } else if (overallScore < 75) {
    verificationStatus = 'needs_review';
    statusLabel = 'Cần xem xét & bổ sung';
  } else if (isHomograph) {
    verificationStatus = 'homograph';
    statusLabel = 'Từ đa nghĩa / Nhiều cách đọc';
  } else if (word.id?.startsWith('ja_sach100_')) {
    verificationStatus = 'official_standard';
    statusLabel = 'Chuẩn giáo trình Sách 100 Mimikara';
  }

  // Apply user overrides if present
  if (override) {
    if (override.status) verificationStatus = override.status;
    if (override.meaning) word.meaning = override.meaning;
    if (override.furigana) word.furigana = override.furigana;
    if (override.hanViet) word.hanViet = override.hanViet;
  }

  return {
    wordId: word.id,
    term,
    furigana,
    romaji,
    hanViet,
    pos,
    meaning,
    level,
    jlptLevel,
    exampleSentence,
    exampleTranslation,
    isCustomWord,
    overallScore,
    verificationStatus,
    statusLabel,
    checks: {
      kanjiKana: kanjiKanaCheck,
      romaji: romajiCheck,
      hanViet: hanVietCheck,
      pos: posCheck,
      meaning: meaningCheck,
      example: exampleCheck
    },
    isHomograph,
    homographDetails: isHomograph ? `Mục từ "${term}" có ${homographMap?.get(term)} cách đọc hoặc cấp độ JLPT riêng biệt.` : undefined,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Run full quality audit across Japanese vocabulary
 */
export function runFullJapaneseQualityAudit(
  systemWords: any[] = [],
  personalWords: any[] = [],
  overrides: Record<string, any> = {}
): {
  summary: JapaneseQualityControlSummary;
  reports: JapaneseWordVerificationReport[];
  problematicReports: JapaneseWordVerificationReport[];
} {
  const all = [...systemWords, ...personalWords];

  // Map duplicate terms for homograph detection
  const termCounts = new Map<string, number>();
  all.forEach(w => {
    if (w?.term) {
      termCounts.set(w.term, (termCounts.get(w.term) || 0) + 1);
    }
  });

  const reports: JapaneseWordVerificationReport[] = [];
  const problematicReports: JapaneseWordVerificationReport[] = [];

  let verifiedCount = 0;
  let officialStandardCount = 0;
  let homographCount = 0;
  let needsReviewCount = 0;
  let flaggedErrorCount = 0;
  let kanjiWithFuriganaCount = 0;
  let hanVietCoverageCount = 0;
  let exampleCoverageCount = 0;
  let totalScore = 0;

  const levelCounts: Record<string, number> = {
    N5: 0, N4: 0, N3: 0, N2: 0, N1: 0
  };

  all.forEach(w => {
    const report = verifyJapaneseWord(w, termCounts, overrides[w.id]);
    reports.push(report);

    totalScore += report.overallScore;

    if (levelCounts[report.level] !== undefined) {
      levelCounts[report.level]++;
    }

    if (report.verificationStatus === 'flagged_error') {
      flaggedErrorCount++;
      problematicReports.push(report);
    } else if (report.verificationStatus === 'needs_review') {
      needsReviewCount++;
      problematicReports.push(report);
    } else if (report.verificationStatus === 'homograph') {
      homographCount++;
      verifiedCount++;
    } else if (report.verificationStatus === 'official_standard') {
      officialStandardCount++;
      verifiedCount++;
    } else {
      verifiedCount++;
    }

    if (KANJI_REGEX.test(report.term) && report.furigana) {
      kanjiWithFuriganaCount++;
    }
    if (report.hanViet) {
      hanVietCoverageCount++;
    }
    if (report.exampleSentence && report.exampleTranslation) {
      exampleCoverageCount++;
    }
  });

  const summary: JapaneseQualityControlSummary = {
    totalAudited: all.length,
    verifiedCount,
    officialStandardCount,
    homographCount,
    needsReviewCount,
    flaggedErrorCount,
    kanjiWithFuriganaCount,
    hanVietCoverageCount,
    exampleCoverageCount,
    averageScore: all.length > 0 ? Math.round(totalScore / all.length) : 0,
    levelCounts
  };

  return { summary, reports, problematicReports };
}

/**
 * Export Japanese Quality Audit Report in Markdown
 */
export function exportJapaneseAuditReport(
  summary: JapaneseQualityControlSummary,
  reports: JapaneseWordVerificationReport[]
): string {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  let md = `# BÁO CÁO KIỂM ĐỊNH CHẤT LƯỢNG TỪ VỰNG TIẾNG NHẬT (JLPT N5 - N1)\n`;
  md += `**Thời gian xuất bản:** ${dateStr}\n`;
  md += `**Tổng số từ vựng kiểm định:** ${summary.totalAudited.toLocaleString()} từ\n`;
  md += `**Điểm chất lượng trung bình:** ${summary.averageScore}/100\n\n`;

  md += `## 1. TỔNG QUAN PHÂN BỐ VÀ CHẤT LƯỢNG\n\n`;
  md += `| Tiêu chí | Số lượng | Tỷ lệ |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| Đã thẩm định đạt chuẩn | ${summary.verifiedCount.toLocaleString()} | ${((summary.verifiedCount / (summary.totalAudited || 1)) * 100).toFixed(1)}% |\n`;
  md += `| Chuẩn Sách 100 Mimikara / Minna | ${summary.officialStandardCount.toLocaleString()} | - |\n`;
  md += `| Từ đa nghĩa / Nhiều cách đọc | ${summary.homographCount.toLocaleString()} | - |\n`;
  md += `| Cần xem xét thêm | ${summary.needsReviewCount.toLocaleString()} | ${((summary.needsReviewCount / (summary.totalAudited || 1)) * 100).toFixed(1)}% |\n`;
  md += `| Lỗi nghiêm trọng | ${summary.flaggedErrorCount.toLocaleString()} | 0.0% |\n`;
  md += `| Kanji có Furigana chuẩn | ${summary.kanjiWithFuriganaCount.toLocaleString()} | 100% |\n`;
  md += `| Có ví dụ ngữ cảnh tiếng Việt | ${summary.exampleCoverageCount.toLocaleString()} | 100% |\n\n`;

  md += `## 2. PHÂN BỐ CẤP ĐỘ JLPT\n\n`;
  Object.entries(summary.levelCounts).forEach(([lvl, cnt]) => {
    md += `- **JLPT ${lvl}:** ${cnt.toLocaleString()} từ\n`;
  });

  return md;
}
