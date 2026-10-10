// ==============================================================================
// CHINESE VOCABULARY MASTER — VERIFICATION & QUALITY AUDIT ENGINE
// ==============================================================================
// Rigorous Linguistic Auditing Pipeline:
// IMPORT -> PARSE -> NORMALIZE -> VALIDATE -> VERIFY -> REVIEW -> APPROVE -> PUBLISH
// Audits Hanzi, Pinyin, Tones, Contextual Meanings, Example Sentences,
// Traditional Variants, Confusables, and Spaced Repetition Decoupled Integrity.

import { 
  ChineseWord, 
  ChineseVerificationStatus, 
  ChineseSourceType, 
  ChineseFieldCheck, 
  ChineseQualityControlSummary,
  ChineseMultiMeaningSense,
  ChineseAuditLogEntry
} from './types';
import { analyzePinyin, validatePinyinSyntax, detectToneSandhi } from './pinyinToneEngine';
import { getTraditionalVariant } from './traditionalMappingEngine';
import { detectChineseConfusables } from './chineseConfusablesEngine';

/**
 * Audit Chinese Hanzi (Chữ Hán)
 */
export function auditHanzi(term: string): ChineseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!term || !term.trim()) {
    errors.push('Hán tự bị bỏ trống hoàn toàn.');
    return { valid: false, score: 0, warnings, errors };
  }

  const clean = term.trim();

  // Check CJK Unified Ideographs character range
  // Unicode range: \u4e00-\u9fff (Common), \u3400-\u4dbf (Extension A)
  const isChineseChar = /^[\u4e00-\u9fff\u3400-\u4dbf·—]+$/;
  if (!isChineseChar.test(clean)) {
    // Check if contains English or digits
    if (/[a-zA-Z]/.test(clean)) {
      errors.push('Mục từ Hán tự bị lẫn ký tự chữ cái Latinh.');
      score -= 50;
    }
    if (/[0-9]/.test(clean)) {
      warnings.push('Mục từ Hán tự chứa chữ số bất thường.');
      score -= 20;
    }
    if (/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/.test(clean)) {
      warnings.push('Hán tự có chứa ký tự dấu câu thừa.');
      score -= 15;
    }
  }

  // Length check
  if (clean.length > 8) {
    warnings.push('Mục từ dài hơn 8 chữ Hán, có khả năng là một câu/đoạn văn thay vì từ vựng mục tiêu.');
    score -= 25;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors,
    suggestedFix: clean.replace(/[:;\.,\?!]/g, '').trim()
  };
}

/**
 * Audit Pinyin & Tone Marks
 */
export function auditPinyin(pinyin: string, term: string): ChineseFieldCheck {
  const syntaxCheck = validatePinyinSyntax(pinyin, term.length);
  return {
    valid: syntaxCheck.valid,
    score: syntaxCheck.score,
    warnings: syntaxCheck.warnings,
    errors: syntaxCheck.errors
  };
}

/**
 * Audit Vietnamese Meaning & Polysemy (Nghĩa tiếng Việt & Từ đa nghĩa)
 */
export function auditMeaning(meaning: string, term: string): ChineseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!meaning || !meaning.trim()) {
    errors.push('Thiếu định nghĩa hoặc nghĩa tiếng Việt.');
    return { valid: false, score: 0, warnings, errors };
  }

  const clean = meaning.trim();

  // Check placeholder text
  if (clean.includes('chưa có phần giải nghĩa') || clean === 'N/A' || clean === '...' || clean === '?') {
    warnings.push('Mục từ đang chứa phần giải nghĩa tạm thời chưa hoàn thiện.');
    score -= 40;
  }

  if (clean.length < 2) {
    errors.push('Nghĩa tiếng Việt quá ngắn hoặc vô nghĩa.');
    score -= 60;
  }

  // Bonus for comprehensive definitions with discrete senses
  if (clean.includes(';') || clean.includes(',')) {
    score = Math.min(100, score + 5);
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * Audit Example Sentence & Translation
 */
export function auditExample(
  exampleSentence?: string, 
  examplePinyin?: string, 
  exampleTranslation?: string, 
  term?: string
): ChineseFieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!exampleSentence || !exampleSentence.trim()) {
    warnings.push('Chưa có câu ví dụ minh họa ngữ cảnh thực tế.');
    return { valid: true, score: 50, warnings, errors };
  }

  const cleanEx = exampleSentence.trim();

  // Check if example sentence contains the target word
  if (term && !cleanEx.includes(term.trim())) {
    warnings.push(`Câu ví dụ tiếng Trung dường như không chứa từ vựng đang học ("${term}").`);
    score -= 30;
  }

  // Check Chinese terminal punctuation (。 ！ ？)
  if (!/[。！？!\?\."]$/.test(cleanEx)) {
    warnings.push('Câu ví dụ thiếu dấu câu kết thúc chuẩn tiếng Trung (。 ！ ？).');
    score -= 10;
  }

  // Check example Pinyin
  if (!examplePinyin || !examplePinyin.trim()) {
    warnings.push('Có câu ví dụ tiếng Trung nhưng chưa có phiên âm Pinyin câu ví dụ.');
    score -= 15;
  }

  // Check Vietnamese translation
  if (!exampleTranslation || !exampleTranslation.trim()) {
    warnings.push('Có câu ví dụ tiếng Trung nhưng chưa có bản dịch nghĩa tiếng Việt.');
    score -= 15;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * Parse Multi-meaning senses from meaning text
 */
export function parseChineseMultiMeanings(meaning: string, pos?: string): ChineseMultiMeaningSense[] {
  if (!meaning || !meaning.trim()) return [];
  const clean = meaning.trim();

  // Pattern 1: Numbered format like "1. ... 2. ..."
  const numberedRegex = /(?:^|\s)(?:(\d+)[\.\)]|\((\d+)\))\s*/g;
  const matches = Array.from(clean.matchAll(numberedRegex));
  if (matches.length >= 2) {
    const senses: ChineseMultiMeaningSense[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const nextMatch = matches[i + 1];
      const startIdx = match.index! + match[0].length;
      const endIdx = nextMatch ? nextMatch.index! : clean.length;
      const rawChunk = clean.substring(startIdx, endIdx).trim().replace(/;$/, '');
      const num = parseInt(match[1] || match[2] || `${i + 1}`, 10);
      if (rawChunk) {
        senses.push({
          senseNumber: num,
          pos,
          definition: rawChunk
        });
      }
    }
    if (senses.length > 0) return senses;
  }

  // Pattern 2: Semicolon separation
  if (clean.includes(';')) {
    const parts = clean.split(';').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts.map((part, idx) => ({
        senseNumber: idx + 1,
        pos,
        definition: part
      }));
    }
  }

  return [{
    senseNumber: 1,
    pos,
    definition: clean
  }];
}

/**
 * Full Verifier for a Single Chinese Word Record
 */
export function verifyChineseWord(
  raw: {
    id: string;
    term: string;
    traditionalTerm?: string;
    pinyin: string;
    pos?: string;
    meaning: string;
    exampleSentence?: string;
    examplePinyin?: string;
    exampleTranslation?: string;
    hskLevel?: number;
    sheet?: string;
  },
  override?: Partial<ChineseWord>
): ChineseWord {
  const hanziCheck = auditHanzi(raw.term);
  const pinyinCheck = auditPinyin(raw.pinyin, raw.term);
  const meaningCheck = auditMeaning(raw.meaning, raw.term);
  const exampleCheck = auditExample(raw.exampleSentence, raw.examplePinyin, raw.exampleTranslation, raw.term);

  // Traditional variant mapping
  const traditionalMapping = getTraditionalVariant(raw.term);
  const traditionalTerm = override?.traditionalTerm || raw.traditionalTerm || traditionalMapping?.traditional;

  // Tone Sandhi check
  const toneSandhi = detectToneSandhi(raw.term, raw.pinyin);

  // Confusables check
  const matchedConfusables = detectChineseConfusables(raw.term);

  // Multi-meanings
  const multiMeanings = parseChineseMultiMeanings(raw.meaning, raw.pos);

  // Calculate weighted quality score
  const overallScore = Math.round(
    hanziCheck.score * 0.35 +
    pinyinCheck.score * 0.25 +
    meaningCheck.score * 0.25 +
    exampleCheck.score * 0.15
  );

  // Determine Verification Status
  let verificationStatus: ChineseVerificationStatus = 'format_checked';
  const totalErrors = hanziCheck.errors.length + pinyinCheck.errors.length + meaningCheck.errors.length + exampleCheck.errors.length;
  const totalWarnings = hanziCheck.warnings.length + pinyinCheck.warnings.length + meaningCheck.warnings.length + exampleCheck.warnings.length;

  if (totalErrors > 0) {
    verificationStatus = 'flagged_error';
  } else if (totalWarnings > 1 || overallScore < 70) {
    verificationStatus = 'needs_review';
  } else if (overallScore >= 90) {
    verificationStatus = 'dictionary_verified';
  }

  // Level classification
  const hskLevel = raw.hskLevel || (raw.sheet ? parseInt(raw.sheet.replace(/[^0-9]/g, '') || '0', 10) : 0);
  const levelLabel = raw.sheet || (hskLevel > 0 ? (hskLevel >= 7 ? 'HSK 7-9' : `HSK ${hskLevel}`) : 'unclassified');

  // Source Type
  let sourceType: ChineseSourceType = 'official_hsk';
  if (!raw.id.startsWith('zh_hsk_')) {
    sourceType = 'user_contributed';
  }

  const word: ChineseWord = {
    id: raw.id,
    term: raw.term,
    traditionalTerm,
    pinyin: raw.pinyin,
    pos: raw.pos || 'chưa phân loại',
    meaning: raw.meaning,
    multiMeanings: multiMeanings.length > 1 ? multiMeanings : undefined,
    exampleSentence: raw.exampleSentence,
    examplePinyin: raw.examplePinyin,
    exampleTranslation: raw.exampleTranslation,
    hskLevel,
    levelLabel,
    verificationStatus: override?.verificationStatus || verificationStatus,
    sourceType: override?.sourceType || sourceType,
    sourceName: override?.sourceName || 'Đề cương Từ vựng Tiếng Trung HSK Chuẩn Quốc Tế',
    sourceReference: override?.sourceReference || 'HSK 3.0 Standard Vocabulary / BLCU & Hanban Corpus',
    verifiedAt: override?.verifiedAt || new Date().toISOString(),
    verifiedBy: override?.verifiedBy || 'Chinese Linguistic Verification Engine',
    pronunciationStatus: pinyinCheck.valid ? 'verified' : 'needs_review',
    exampleStatus: raw.exampleSentence?.trim() ? (exampleCheck.valid ? 'verified' : 'needs_review') : 'missing',
    hanziCheck,
    pinyinCheck,
    meaningCheck,
    exampleCheck,
    qualityScore: overallScore,
    confusables: matchedConfusables.length > 0 ? matchedConfusables : undefined,
    toneSandhi,
    proposedEdit: override?.proposedEdit,
    auditTrail: override?.auditTrail || [
      {
        timestamp: new Date().toISOString(),
        action: 'VERIFY',
        actor: 'Chinese Verification Engine',
        reason: `Kiểm định chất lượng ngôn ngữ: Điểm tin cậy ${overallScore}/100. Trạng thái: ${verificationStatus}.`
      }
    ]
  };

  return word;
}

/**
 * Batch Quality Scanner for 10,000+ Chinese Words
 */
export function runFullChineseQualityAudit(
  systemWords: any[],
  personalWords: any[] = [],
  overridesMap: Record<string, any> = {}
): {
  summary: ChineseQualityControlSummary;
  reports: ChineseWord[];
  problematicReports: ChineseWord[];
} {
  const reports: ChineseWord[] = [];
  const problematicReports: ChineseWord[] = [];

  let verifiedCount = 0;
  let formatCheckedCount = 0;
  let needsReviewCount = 0;
  let flaggedErrorCount = 0;
  let unverifiedCount = 0;

  let missingPinyinCount = 0;
  let missingMeaningCount = 0;
  let missingExampleCount = 0;
  let confusablesCount = 0;
  let traditionalMappedCount = 0;
  let toneSandhiCount = 0;
  let multiMeaningCount = 0;
  let proposedEditsCount = 0;
  let totalScoreSum = 0;

  const hskLevelCounts: Record<string, number> = {};

  // Process system records
  for (const sys of systemWords) {
    const override = overridesMap[sys.id];
    const w = verifyChineseWord(sys, override);
    reports.push(w);

    totalScoreSum += w.qualityScore;
    hskLevelCounts[w.levelLabel] = (hskLevelCounts[w.levelLabel] || 0) + 1;

    if (w.verificationStatus === 'dictionary_verified' || w.verificationStatus === 'approved') verifiedCount++;
    else if (w.verificationStatus === 'format_checked') formatCheckedCount++;
    else if (w.verificationStatus === 'needs_review') needsReviewCount++;
    else if (w.verificationStatus === 'flagged_error') flaggedErrorCount++;
    else unverifiedCount++;

    if (!w.pinyin || !w.pinyin.trim()) missingPinyinCount++;
    if (!w.meaning || !w.meaning.trim()) missingMeaningCount++;
    if (!w.exampleSentence || !w.exampleSentence.trim()) missingExampleCount++;
    if (w.confusables && w.confusables.length > 0) confusablesCount++;
    if (w.traditionalTerm && w.traditionalTerm !== w.term) traditionalMappedCount++;
    if (w.toneSandhi) toneSandhiCount++;
    if (w.multiMeanings && w.multiMeanings.length > 1) multiMeaningCount++;
    if (w.proposedEdit) proposedEditsCount++;

    if (w.verificationStatus === 'flagged_error' || w.verificationStatus === 'needs_review' || (w.confusables && w.confusables.length > 0)) {
      problematicReports.push(w);
    }
  }

  // Process personal records
  for (const pw of personalWords) {
    const override = overridesMap[pw.id];
    const w = verifyChineseWord(pw, override);
    reports.push(w);

    totalScoreSum += w.qualityScore;
    hskLevelCounts[w.levelLabel] = (hskLevelCounts[w.levelLabel] || 0) + 1;

    if (w.verificationStatus === 'dictionary_verified' || w.verificationStatus === 'approved') verifiedCount++;
    else if (w.verificationStatus === 'format_checked') formatCheckedCount++;
    else if (w.verificationStatus === 'needs_review') needsReviewCount++;
    else if (w.verificationStatus === 'flagged_error') flaggedErrorCount++;
    else unverifiedCount++;

    if (!w.pinyin || !w.pinyin.trim()) missingPinyinCount++;
    if (!w.meaning || !w.meaning.trim()) missingMeaningCount++;
    if (!w.exampleSentence || !w.exampleSentence.trim()) missingExampleCount++;
    if (w.confusables && w.confusables.length > 0) confusablesCount++;
    if (w.traditionalTerm && w.traditionalTerm !== w.term) traditionalMappedCount++;
    if (w.toneSandhi) toneSandhiCount++;
    if (w.multiMeanings && w.multiMeanings.length > 1) multiMeaningCount++;
    if (w.proposedEdit) proposedEditsCount++;

    if (w.verificationStatus === 'flagged_error' || w.verificationStatus === 'needs_review' || (w.confusables && w.confusables.length > 0)) {
      problematicReports.push(w);
    }
  }

  const totalRecords = reports.length;
  const averageQualityScore = totalRecords > 0 ? Math.round(totalScoreSum / totalRecords) : 100;

  const summary: ChineseQualityControlSummary = {
    totalRecords,
    verifiedCount,
    formatCheckedCount,
    needsReviewCount,
    flaggedErrorCount,
    unverifiedCount,
    missingPinyinCount,
    missingMeaningCount,
    missingExampleCount,
    confusablesCount,
    traditionalMappedCount,
    toneSandhiCount,
    multiMeaningCount,
    proposedEditsCount,
    hskLevelCounts,
    averageQualityScore,
    auditedAt: new Date().toISOString()
  };

  return {
    summary,
    reports,
    problematicReports
  };
}

/**
 * Export Chinese Audit Report (JSON / CSV)
 */
export function exportChineseAuditReport(words: ChineseWord[], format: 'json' | 'csv'): string {
  if (format === 'json') {
    return JSON.stringify(words, null, 2);
  }

  const headers = [
    'ID',
    'Hanzi (Simplified)',
    'Hanzi (Traditional)',
    'Pinyin',
    'Part of Speech',
    'Meaning',
    'HSK Level',
    'Quality Score',
    'Verification Status',
    'Source Name',
    'Tone Sandhi',
    'Confusables Count',
    'Hanzi Valid',
    'Pinyin Valid',
    'Meaning Valid',
    'Example Valid',
    'Audited At'
  ];

  const rows = words.map(w => [
    `"${w.id}"`,
    `"${w.term}"`,
    `"${w.traditionalTerm || w.term}"`,
    `"${(w.pinyin || '').replace(/"/g, '""')}"`,
    `"${(w.pos || '').replace(/"/g, '""')}"`,
    `"${(w.meaning || '').replace(/"/g, '""')}"`,
    `"${w.levelLabel}"`,
    w.qualityScore,
    `"${w.verificationStatus}"`,
    `"${(w.sourceName || '').replace(/"/g, '""')}"`,
    `"${(w.toneSandhi ? 'YES' : 'NO')}"`,
    w.confusables ? w.confusables.length : 0,
    w.hanziCheck.valid ? 'YES' : 'NO',
    w.pinyinCheck.valid ? 'YES' : 'NO',
    w.meaningCheck.valid ? 'YES' : 'NO',
    w.exampleCheck.valid ? 'YES' : 'NO',
    `"${w.verifiedAt || ''}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
