// ==============================================================================
// VOCABULARY MASTER — VERIFICATION & DATA QUALITY AUDIT ENGINE
// ==============================================================================
// Comprehensive Linguistic Verification, IPA Checks, Confusables Detection,
// Transparent Source Tracking, Audit Trails, and Spaced Repetition Equivalence.

import { System3000Word, VocabWord, VocabUserData } from './vocabEngine';

export type VerificationStatus = 
  | 'unverified'          // Chưa kiểm tra
  | 'format_checked'       // Đã kiểm tra định dạng
  | 'lexical_verified'     // Đã đối chiếu nguồn tham khảo
  | 'needs_review'         // Cần xem xét thêm
  | 'flagged_error';       // Có lỗi cần sửa

export type VerificationSource = 
  | 'raw_document'         // Trích xuất từ DOCX gốc
  | 'format_normalized'    // Chuẩn hóa định dạng
  | 'dictionary_reference' // Đối chiếu từ điển (Oxford, Cambridge, Merriam-Webster, Wiktionary)
  | 'ai_generated'         // AI đề xuất (chưa xác minh đầy đủ)
  | 'user_contributed';    // Do học viên tự thêm

export interface FieldCheck {
  valid: boolean;
  score: number; // 0 to 100
  warnings: string[];
  errors: string[];
  suggestedFix?: string;
}

export interface ProposedEdit {
  term?: string;
  partOfSpeech?: string;
  phonetic?: string;
  meaning?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  reason: string;
  referenceSource?: string;
  referenceUrl?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  timestamp: string;
  action: 'SCANNED' | 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'MANUAL_EDIT' | 'VERIFIED';
  actor: string;
  details: string;
  previousValue?: any;
  newValue?: any;
}

export interface WordVerificationReport {
  wordId: string;
  term: string;
  status: VerificationStatus;
  primarySource: VerificationSource;
  qualityScore: number; // 0 to 100
  lastAuditedAt: string;
  referenceSource?: string;
  referenceUrl?: string;

  // Field-level checks
  termCheck: FieldCheck;
  posCheck: FieldCheck;
  phoneticCheck: FieldCheck;
  meaningCheck: FieldCheck;
  exampleCheck: FieldCheck;

  // Linguistic enrichment & warnings
  confusables?: Array<{
    word: string;
    distinction: string;
    exampleAlert: string;
  }>;
  isPhraseOrIdiom: boolean;
  dialectVariation?: string; // e.g. "BrE: colour, NAmE: color"

  // Audit trails & proposals
  proposedEdit?: ProposedEdit;
  auditTrail: AuditLogEntry[];
  reviewerNotes?: string;
}

export interface QualityAuditSummary {
  totalAudited: number;
  verifiedCount: number;
  formatCheckedCount: number;
  needsReviewCount: number;
  flaggedErrorCount: number;
  unverifiedCount: number;
  
  missingPhoneticCount: number;
  missingExampleCount: number;
  potentialConfusablesCount: number;
  proposedEditsCount: number;

  averageQualityScore: number;
  sourcesDistribution: Record<VerificationSource, number>;
  auditedAt: string;
}

// ------------------------------------------------------------------------------
// 1. CONFUSABLES & FALSE FRIENDS DATABASE
// ------------------------------------------------------------------------------

export interface ConfusablePair {
  term: string;
  confusedWith: string;
  distinction: string;
  exampleAlert: string;
}

export const CONFUSABLE_PAIRS: ConfusablePair[] = [
  {
    term: 'affect',
    confusedWith: 'effect',
    distinction: '"Affect" thường là động từ (tác động đến), còn "Effect" thường là danh từ (kết quả/tác động).',
    exampleAlert: 'The weather will affect (v.) our trip. The greenhouse effect (n.) is rising.'
  },
  {
    term: 'effect',
    confusedWith: 'affect',
    distinction: '"Effect" là danh từ (hiệu ứng, kết quả), tránh dùng làm động từ thay cho "affect" (trừ nghĩa đặc biệt: to effect change).',
    exampleAlert: 'The medicine had a positive effect (n.) on her health.'
  },
  {
    term: 'accept',
    confusedWith: 'except',
    distinction: '"Accept" là động từ (chấp nhận), còn "Except" là giới từ/liên từ (ngoại trừ).',
    exampleAlert: 'I accept (v.) the offer. Everyone came except (prep.) John.'
  },
  {
    term: 'except',
    confusedWith: 'accept',
    distinction: '"Except" nghĩa là trừ ra, không bao gồm; không nhầm với "Accept" (nhận, bằng lòng).',
    exampleAlert: 'Except (prep.) for Sunday, the library is open every day.'
  },
  {
    term: 'advice',
    confusedWith: 'advise',
    distinction: '"Advice" là danh từ không đếm được (lời khuyên), còn "Advise" là động từ (khuyên nhủ).',
    exampleAlert: 'She gave me good advice (n.). He advised (v.) me to sleep early.'
  },
  {
    term: 'advise',
    confusedWith: 'advice',
    distinction: '"Advise" là động từ (khuyên), phát âm có âm /z/ ở cuối; danh từ là "advice" kết thúc bằng /s/.',
    exampleAlert: 'Doctors advise (v.) drinking plenty of water.'
  },
  {
    term: 'beside',
    confusedWith: 'besides',
    distinction: '"Beside" nghĩa là bên cạnh (vị trí không gian), còn "Besides" nghĩa là ngoài ra, thêm vào đó.',
    exampleAlert: 'Sit beside (prep.) me. Besides (adv.), it is too late to go now.'
  },
  {
    term: 'besides',
    confusedWith: 'beside',
    distinction: '"Besides" có "s" nghĩa là ngoài ra/hơn nữa; không nhầm với "Beside" không có s (ở cạnh bên).',
    exampleAlert: 'Besides (prep.) English, she also speaks French.'
  },
  {
    term: 'loose',
    confusedWith: 'lose',
    distinction: '"Loose" /luːs/ là tính từ (lỏng lẻo, rộng); "Lose" /luːz/ là động từ (đánh mất, thua cuộc).',
    exampleAlert: 'A loose (adj.) tooth. Don\'t lose (v.) your keys!'
  },
  {
    term: 'lose',
    confusedWith: 'loose',
    distinction: '"Lose" có 1 chữ "o", phát âm /luːz/ (thua, mất); "Loose" có 2 chữ "o" là lỏng lẻo.',
    exampleAlert: 'They might lose (v.) the match if they don\'t practice.'
  },
  {
    term: 'economic',
    confusedWith: 'economical',
    distinction: '"Economic" thuộc về nền kinh tế; còn "Economical" là tiết kiệm, kinh tế (chi phí rẻ).',
    exampleAlert: 'Economic (adj.) growth was slow. A small economical (adj.) car saves fuel.'
  },
  {
    term: 'economical',
    confusedWith: 'economic',
    distinction: '"Economical" nghĩa là tiết kiệm, chi tiêu hợp lý; không nhầm với "Economic" (thuộc kinh tế học).',
    exampleAlert: 'Buying in bulk is more economical (adj.).'
  },
  {
    term: 'historic',
    confusedWith: 'historical',
    distinction: '"Historic" nghĩa là có tính chất lịch sử quan trọng, mốc son; "Historical" nghĩa là thuộc về quá khứ lịch sử.',
    exampleAlert: 'A historic (adj.) victory. Historical (adj.) documents from the 18th century.'
  },
  {
    term: 'historical',
    confusedWith: 'historic',
    distinction: '"Historical" liên quan đến lịch sử hoặc nghiên cứu lịch sử; "Historic" là mang tính bước ngoặt vĩ đại.',
    exampleAlert: 'She enjoys reading historical (adj.) novels.'
  },
  {
    term: 'principle',
    confusedWith: 'principal',
    distinction: '"Principle" là nguyên tắc, đạo lý; "Principal" là hiệu trưởng trường hoặc số tiền vốn gốc.',
    exampleAlert: 'Stick to your moral principles (n.). The school principal (n.) gave a speech.'
  },
  {
    term: 'principal',
    confusedWith: 'principle',
    distinction: '"Principal" là người đứng đầu/chính yếu; "Principle" kết thúc bằng -le là nguyên lý, quy tắc.',
    exampleAlert: 'Our principal (adj.) goal is quality.'
  },
  {
    term: 'wander',
    confusedWith: 'wonder',
    distinction: '"Wander" /ˈwɒn.dər/ là đi lang thang; "Wonder" /ˈwʌn.dər/ là băn khoăn, tự hỏi, kỳ quan.',
    exampleAlert: 'We wandered (v.) around the old town. I wonder (v.) where they are.'
  },
  {
    term: 'wonder',
    confusedWith: 'wander',
    distinction: '"Wonder" là ngạc nhiên, tự hỏi (chữ "o"); "Wander" là đi dạo lang thang (chữ "a").',
    exampleAlert: 'Seven wonders (n.) of the ancient world.'
  },
  {
    term: 'breath',
    confusedWith: 'breathe',
    distinction: '"Breath" /breθ/ là danh từ (hơi thở); "Breathe" /briːð/ là động từ (hít thở, có đuôi -e).',
    exampleAlert: 'Take a deep breath (n.). Breathe (v.) in fresh morning air.'
  },
  {
    term: 'breathe',
    confusedWith: 'breath',
    distinction: '"Breathe" có chữ "e" ở cuối là động từ (thở); "Breath" không có chữ e là danh từ (hơi thở).',
    exampleAlert: 'It was hard to breathe (v.) at high altitudes.'
  },
  {
    term: 'quiet',
    confusedWith: 'quite',
    distinction: '"Quiet" /ˈkwaɪ.ət/ là yên tĩnh (tính từ); "Quite" /kwaɪt/ là trạng từ (khá là, hoàn toàn).',
    exampleAlert: 'A quiet (adj.) study room. The test was quite (adv.) difficult.'
  },
  {
    term: 'quite',
    confusedWith: 'quiet',
    distinction: '"Quite" kết thúc bằng -te là phó từ mức độ; "Quiet" kết thúc bằng -et là yên ắng, trật tự.',
    exampleAlert: 'I am quite (adv.) confident about this result.'
  },
  {
    term: 'desert',
    confusedWith: 'dessert',
    distinction: '"Desert" /ˈdez.ət/ là sa mạc (hoặc /dɪˈzɜːt/ bỏ rơi); "Dessert" /dɪˈzɜːt/ có 2 chữ s là món tráng miệng.',
    exampleAlert: 'Sahara Desert (n.). We had chocolate ice cream for dessert (n.).'
  },
  {
    term: 'dessert',
    confusedWith: 'desert',
    distinction: '"Dessert" có 2 chữ "s" (món tráng miệng ngọt ngào); "Desert" có 1 chữ "s" là sa mạc cát khô cằn.',
    exampleAlert: 'What would you like for dessert (n.)?'
  }
];

// ------------------------------------------------------------------------------
// 2. STANDARD PARTS OF SPEECH DICTIONARY
// ------------------------------------------------------------------------------

export const STANDARD_POS_MAP: Record<string, { standard: string; vn: string; category: string }> = {
  'n.': { standard: 'noun', vn: 'Danh từ', category: 'noun' },
  'v.': { standard: 'verb', vn: 'Động từ', category: 'verb' },
  'adj.': { standard: 'adjective', vn: 'Tính từ', category: 'adjective' },
  'adv.': { standard: 'adverb', vn: 'Trạng từ', category: 'adverb' },
  'prep.': { standard: 'preposition', vn: 'Giới từ', category: 'preposition' },
  'conj.': { standard: 'conjunction', vn: 'Liên từ', category: 'conjunction' },
  'pron.': { standard: 'pronoun', vn: 'Đại từ', category: 'pronoun' },
  'det.': { standard: 'determiner', vn: 'Từ hạn định', category: 'determiner' },
  'modal v.': { standard: 'modal verb', vn: 'Động từ khuyết thiếu', category: 'verb' },
  'auxiliary v.': { standard: 'auxiliary verb', vn: 'Trợ động từ', category: 'verb' },
  'exclamation': { standard: 'interjection', vn: 'Thán từ', category: 'interjection' },
  'phrase': { standard: 'phrase', vn: 'Cụm từ / Thành ngữ', category: 'phrase' },
  'prefix': { standard: 'prefix', vn: 'Tiền tố', category: 'affix' },
  'suffix': { standard: 'suffix', vn: 'Hậu tố', category: 'affix' },
  'number': { standard: 'number', vn: 'Số từ', category: 'number' },
  'ordinal number': { standard: 'ordinal number', vn: 'Số thứ tự', category: 'number' },
  'definite article': { standard: 'definite article', vn: 'Mạo từ xác định', category: 'determiner' }
};

// ------------------------------------------------------------------------------
// 3. INDIVIDUAL FIELD AUDITING FUNCTIONS
// ------------------------------------------------------------------------------

/**
 * Audit English Term Syntax & Spelling
 */
export function auditTerm(term: string): FieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!term || !term.trim()) {
    errors.push('Từ hoặc cụm từ bị bỏ trống hoàn toàn.');
    return { valid: false, score: 0, warnings, errors };
  }

  const clean = term.trim();

  // Check invalid leading/trailing characters
  if (clean.endsWith(':') || clean.endsWith(';') || clean.endsWith('.')) {
    warnings.push('Từ có dấu chấm câu thừa ở cuối.');
    score -= 10;
  }

  // Check for suspicious numeric or corrupted characters
  if (/[0-9]/.test(clean) && !['1st', '2nd', '3rd', '4th'].some(num => clean.includes(num))) {
    warnings.push('Từ chứa chữ số bất thường.');
    score -= 15;
  }

  // Check for multi-word phrase
  const isPhrase = clean.includes(' ');
  if (isPhrase && clean.split(' ').length > 6) {
    warnings.push('Cụm từ quá dài (hơn 6 từ), có thể là một đoạn câu thay vì từ vựng mục tiêu.');
    score -= 20;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors,
    suggestedFix: clean.replace(/[:;\.]$/, '').trim()
  };
}

/**
 * Audit Part of Speech
 */
export function auditPartOfSpeech(pos: string, term: string): FieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!pos || !pos.trim()) {
    warnings.push('Chưa xác định từ loại (Part of Speech). Mặc định xếp vào Cụm từ.');
    return { valid: true, score: 50, warnings, errors, suggestedFix: 'phrase' };
  }

  const cleanPos = pos.trim().toLowerCase();

  // Check if known in standard map
  const isRecognized = Object.keys(STANDARD_POS_MAP).some(k => cleanPos.includes(k.replace('.', ''))) ||
    ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'phrase'].some(p => cleanPos.includes(p));

  if (!isRecognized) {
    warnings.push(`Từ loại "${pos}" chưa chuẩn hóa theo hệ thống phân loại ngữ pháp.`);
    score -= 25;
  }

  // Multi-POS validation
  if (cleanPos.includes(',') || cleanPos.includes('/')) {
    warnings.push('Mục từ này có nhiều từ loại kết hợp (ví dụ: vừa danh từ vừa động từ). Nên hiển thị từng nghĩa riêng.');
    score -= 5;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * Audit Phonetic IPA
 */
export function auditPhonetic(phonetic: string | undefined, term: string): FieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!phonetic || !phonetic.trim()) {
    // Phrases often don't have IPA
    if (term.includes(' ')) {
      warnings.push('Cụm từ chưa có phiên âm IPA (chấp nhận được đối với thành ngữ/cụm từ ghép).');
      score = 70;
    } else {
      warnings.push('Từ đơn thiếu phiên âm IPA chuẩn.');
      score = 40;
    }
    return { valid: true, score, warnings, errors };
  }

  const clean = phonetic.trim();

  // Check enclosing slashes
  if (!clean.startsWith('/') || !clean.endsWith('/')) {
    warnings.push('Phiên âm thiếu dấu gạch chéo bao bọc (/.../) theo quy ước IPA.');
    score -= 15;
  }

  // Check for common corrupted characters from bad encoding (replacement char)
  if (clean.includes('\uFFFD') || (clean.includes('?') && !clean.includes('ɡ'))) {
    errors.push('Phiên âm chứa ký tự lỗi font mã hóa (corrupted Unicode glyph).');
    score -= 60;
  }

  // Check for presence of valid IPA symbols
  const hasIpaVowels = /[əæɪʊʌɒeɪaɪɔɪəʊaʊiːuːɔːɜːɑː]/i.test(clean);
  if (!hasIpaVowels && clean.length > 4) {
    warnings.push('Phiên âm có thể sử dụng ký tự phát âm phi chuẩn thay vì bảng mẫu tự IPA quốc tế.');
    score -= 20;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

/**
 * Audit Vietnamese Meaning
 */
export function auditMeaning(meaning: string): FieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!meaning || !meaning.trim()) {
    errors.push('Thiếu định nghĩa hoặc nghĩa tiếng Việt.');
    return { valid: false, score: 0, warnings, errors };
  }

  const clean = meaning.trim();

  // Check uninformative placeholders
  if (clean.includes('chưa có phần giải nghĩa') || clean === 'N/A' || clean === '...') {
    warnings.push('Mục từ đang chứa phần giải nghĩa tạm thời chưa hoàn chỉnh.');
    score -= 50;
  }

  // Check if meaning is too short
  if (clean.length < 2) {
    errors.push('Nghĩa tiếng Việt quá ngắn hoặc vô nghĩa.');
    score -= 70;
  }

  // Check if meaning contains multiple definitions separated by semicolons
  if (clean.includes(';') || clean.includes(',')) {
    // Positive: comprehensive definition
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
 * Audit Example Sentence
 */
export function auditExample(example?: string, translation?: string, term?: string): FieldCheck {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!example || !example.trim()) {
    warnings.push('Chưa có câu ví dụ minh họa ngữ cảnh.');
    return { valid: true, score: 50, warnings, errors };
  }

  const cleanEx = example.trim();

  // Sentence capitalization check
  const firstLetter = cleanEx.charAt(0);
  if (firstLetter !== firstLetter.toUpperCase() && /[a-z]/.test(firstLetter)) {
    warnings.push('Câu ví dụ chưa viết hoa chữ cái đầu câu.');
    score -= 10;
  }

  // Terminal punctuation check
  if (!/[.!?]["']?$/.test(cleanEx)) {
    warnings.push('Câu ví dụ thiếu dấu câu kết thúc (. ! ?).');
    score -= 10;
  }

  // Check if target term (or root of term) appears in the sentence
  if (term) {
    const rootTerm = term.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    if (rootTerm.length >= 3 && !cleanEx.toLowerCase().includes(rootTerm)) {
      warnings.push(`Câu ví dụ dường như không chứa từ vựng đang học ("${term}").`);
      score -= 25;
    }
  }

  // Check translation
  if (example && (!translation || !translation.trim())) {
    warnings.push('Có câu ví dụ tiếng Anh nhưng chưa có câu dịch tiếng Việt.');
    score -= 15;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

// ------------------------------------------------------------------------------
// 4. FULL SINGLE-WORD VERIFIER
// ------------------------------------------------------------------------------

export function verifyWord(
  word: {
    id: string;
    term: string;
    pos?: string;
    phonetic?: string;
    meaning: string;
    exampleSentence?: string;
    exampleTranslation?: string;
    raw?: string;
  },
  override?: Partial<WordVerificationReport>
): WordVerificationReport {
  const termCheck = auditTerm(word.term);
  const posCheck = auditPartOfSpeech(word.pos || '', word.term);
  const phoneticCheck = auditPhonetic(word.phonetic, word.term);
  const meaningCheck = auditMeaning(word.meaning);
  const exampleCheck = auditExample(word.exampleSentence, word.exampleTranslation, word.term);

  // Calculate weighted overall score
  const overallScore = Math.round(
    termCheck.score * 0.25 +
    posCheck.score * 0.15 +
    phoneticCheck.score * 0.20 +
    meaningCheck.score * 0.25 +
    exampleCheck.score * 0.15
  );

  // Confusables check
  const cleanTermLower = word.term.trim().toLowerCase();
  const matchedConfusables = CONFUSABLE_PAIRS.filter(p => p.term.toLowerCase() === cleanTermLower).map(p => ({
    word: p.confusedWith,
    distinction: p.distinction,
    exampleAlert: p.exampleAlert
  }));

  // Determine status
  let status: VerificationStatus = 'format_checked';

  const totalErrors = termCheck.errors.length + meaningCheck.errors.length + phoneticCheck.errors.length;
  const totalWarnings = termCheck.warnings.length + posCheck.warnings.length + phoneticCheck.warnings.length + meaningCheck.warnings.length;

  if (totalErrors > 0) {
    status = 'flagged_error';
  } else if (totalWarnings > 1 || overallScore < 70) {
    status = 'needs_review';
  } else if (overallScore >= 90) {
    status = 'lexical_verified';
  }

  // Determine default source
  let primarySource: VerificationSource = 'format_normalized';
  if (word.id.startsWith('word_3000_')) {
    primarySource = 'format_normalized';
  } else {
    primarySource = 'user_contributed';
  }

  // Base report
  const report: WordVerificationReport = {
    wordId: word.id,
    term: word.term,
    status: override?.status || status,
    primarySource: override?.primarySource || primarySource,
    qualityScore: overallScore,
    lastAuditedAt: new Date().toISOString(),
    referenceSource: override?.referenceSource || 'Oxford 3000™ / DOCX Core Reference',
    referenceUrl: override?.referenceUrl,
    termCheck,
    posCheck,
    phoneticCheck,
    meaningCheck,
    exampleCheck,
    confusables: matchedConfusables.length > 0 ? matchedConfusables : undefined,
    isPhraseOrIdiom: word.term.includes(' ') || (word.pos || '').toLowerCase().includes('phrase'),
    auditTrail: override?.auditTrail || [
      {
        timestamp: new Date().toISOString(),
        action: 'SCANNED',
        actor: 'Linguistic Verification Engine',
        details: `Đã quét chất lượng: Điểm tin cậy đạt ${overallScore}/100. Trạng thái: ${status}.`
      }
    ],
    reviewerNotes: override?.reviewerNotes
  };

  return report;
}

// ------------------------------------------------------------------------------
// 5. COMPREHENSIVE BATCH QUALITY SCANNER
// ------------------------------------------------------------------------------

export function runFullQualityAudit(
  system3000Words: System3000Word[],
  personalWords: VocabWord[] = [],
  overridesMap: Record<string, any> = {}
): {
  summary: QualityAuditSummary;
  reports: WordVerificationReport[];
  problematicReports: WordVerificationReport[];
} {
  const reports: WordVerificationReport[] = [];
  const problematicReports: WordVerificationReport[] = [];

  let verifiedCount = 0;
  let formatCheckedCount = 0;
  let needsReviewCount = 0;
  let flaggedErrorCount = 0;
  let unverifiedCount = 0;

  let missingPhoneticCount = 0;
  let missingExampleCount = 0;
  let potentialConfusablesCount = 0;
  let proposedEditsCount = 0;
  let totalScoreSum = 0;

  const sourcesDistribution: Record<VerificationSource, number> = {
    raw_document: 0,
    format_normalized: 0,
    dictionary_reference: 0,
    ai_generated: 0,
    user_contributed: 0
  };

  // 1. Audit System 3000 words
  for (const sys of system3000Words) {
    const override = overridesMap[sys.id];
    const rep = verifyWord({
      id: sys.id,
      term: sys.term,
      pos: sys.pos,
      phonetic: sys.phonetic,
      meaning: sys.meaning,
      raw: sys.raw
    }, override);

    reports.push(rep);
    totalScoreSum += rep.qualityScore;
    sourcesDistribution[rep.primarySource] = (sourcesDistribution[rep.primarySource] || 0) + 1;

    if (rep.status === 'lexical_verified') verifiedCount++;
    else if (rep.status === 'format_checked') formatCheckedCount++;
    else if (rep.status === 'needs_review') needsReviewCount++;
    else if (rep.status === 'flagged_error') flaggedErrorCount++;
    else unverifiedCount++;

    if (!sys.phonetic || !sys.phonetic.trim()) missingPhoneticCount++;
    if (rep.confusables && rep.confusables.length > 0) potentialConfusablesCount++;
    if (rep.proposedEdit) proposedEditsCount++;

    // Group problematic
    if (rep.status === 'flagged_error' || rep.status === 'needs_review' || (rep.confusables && rep.confusables.length > 0)) {
      problematicReports.push(rep);
    }
  }

  // 2. Audit Personal words
  for (const pw of personalWords) {
    const override = overridesMap[pw.id];
    const rep = verifyWord({
      id: pw.id,
      term: pw.term,
      pos: pw.partOfSpeech,
      phonetic: pw.phonetic,
      meaning: pw.meaning,
      exampleSentence: pw.exampleSentence,
      exampleTranslation: pw.exampleTranslation
    }, override);

    reports.push(rep);
    totalScoreSum += rep.qualityScore;
    sourcesDistribution[rep.primarySource] = (sourcesDistribution[rep.primarySource] || 0) + 1;

    if (rep.status === 'lexical_verified') verifiedCount++;
    else if (rep.status === 'format_checked') formatCheckedCount++;
    else if (rep.status === 'needs_review') needsReviewCount++;
    else if (rep.status === 'flagged_error') flaggedErrorCount++;
    else unverifiedCount++;

    if (!pw.phonetic || !pw.phonetic.trim()) missingPhoneticCount++;
    if (!pw.exampleSentence || !pw.exampleSentence.trim()) missingExampleCount++;
    if (rep.confusables && rep.confusables.length > 0) potentialConfusablesCount++;
    if (rep.proposedEdit) proposedEditsCount++;

    if (rep.status === 'flagged_error' || rep.status === 'needs_review' || (rep.confusables && rep.confusables.length > 0)) {
      problematicReports.push(rep);
    }
  }

  const totalAudited = reports.length;
  const averageQualityScore = totalAudited > 0 ? Math.round(totalScoreSum / totalAudited) : 100;

  const summary: QualityAuditSummary = {
    totalAudited,
    verifiedCount,
    formatCheckedCount,
    needsReviewCount,
    flaggedErrorCount,
    unverifiedCount,
    missingPhoneticCount,
    missingExampleCount,
    potentialConfusablesCount,
    proposedEditsCount,
    averageQualityScore,
    sourcesDistribution,
    auditedAt: new Date().toISOString()
  };

  return {
    summary,
    reports,
    problematicReports
  };
}

// ------------------------------------------------------------------------------
// 6. SPORADIC EQUIVALENCE CHECKER (FOR ACCURATE SPACED REPETITION QUIZ/SPELLING)
// ------------------------------------------------------------------------------

/**
 * Checks if student answer is equivalent to expected answer
 * Tolerates reasonable synonyms, alternative spellings, punctuation, and minor spacing.
 */
export function isEquivalentAnswer(
  studentInput: string, 
  expectedText: string, 
  alternatives?: string[]
): {
  isMatch: boolean;
  isExact: boolean;
  feedback: string;
} {
  const normStudent = normalizeText(studentInput);
  const normExpected = normalizeText(expectedText);

  if (!normStudent || !normExpected) {
    return { isMatch: false, isExact: false, feedback: 'Chưa có câu trả lời.' };
  }

  // Exact match
  if (normStudent === normExpected) {
    return { isMatch: true, isExact: true, feedback: 'Chính xác 100%!' };
  }

  // Check if expected text has multiple options separated by comma, slash, or semicolon
  // e.g.: "bỏ, từ bỏ" -> accepts "từ bỏ" or "bỏ"
  const expectedParts = expectedText.split(/[,;\/]/).map(p => normalizeText(p)).filter(Boolean);
  if (alternatives && alternatives.length > 0) {
    for (const alt of alternatives) {
      if (alt) {
        alt.split(/[,;\/]/).forEach(p => {
          const n = normalizeText(p);
          if (n) expectedParts.push(n);
        });
      }
    }
  }

  if (expectedParts.some(part => part === normStudent)) {
    return { isMatch: true, isExact: false, feedback: 'Chính xác (khớp một trong các nghĩa hợp lệ)!' };
  }

  // Check partial containment if student answer matches substantial part (length >= 3)
  if (normExpected.includes(normStudent) && normStudent.length >= 4 && normStudent.length / normExpected.length >= 0.6) {
    return { isMatch: true, isExact: false, feedback: 'Chấp nhận (đúng nghĩa cốt lõi)!' };
  }

  return {
    isMatch: false,
    isExact: false,
    feedback: `Chưa chính xác. Đáp án mong đợi: "${expectedText}"`
  };
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
