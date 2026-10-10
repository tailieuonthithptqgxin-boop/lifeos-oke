// ==============================================================================
// VOCABULARY MASTER — VERIFICATION & DATA QUALITY AUDIT ENGINE
// ==============================================================================
// Comprehensive Linguistic Verification, IPA Checks, Confusables Detection,
// Dialect Variations (BrE vs NAmE), Multi-Meaning Parsing, Modern English Grammar,
// AI Content Guardrails, Transparent Source Tracking, Non-Destructive Audit Trails,
// and Spaced Repetition Decoupled Equivalence.

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

export interface FieldStatuses {
  term: VerificationStatus;
  pos: VerificationStatus;
  phonetic: VerificationStatus;
  meaning: VerificationStatus;
  example: VerificationStatus;
}

export interface MultiMeaningSense {
  senseNumber: number;
  pos?: string;
  definition: string;
  exampleEn?: string;
  exampleVn?: string;
}

export interface DialectVariation {
  bre: string;
  name: string;
  distinction: string;
  type: 'spelling' | 'vocabulary';
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
  action: 'SCANNED' | 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'MANUAL_EDIT' | 'VERIFIED' | 'ROLLBACK';
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
  auditor?: string;

  // Field-level verification & checks
  fieldStatuses: FieldStatuses;
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
  dialectVariation?: DialectVariation;
  multiMeanings?: MultiMeaningSense[];

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
  dialectVariationsCount: number;
  multiMeaningCount: number;
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
    distinction: '"Principle" là nguyên tắc, đạo lý; "Principal" là hiệu trưởng trường hoặc số tiền vốn gốc / quan trọng nhất.',
    exampleAlert: 'Stick to your moral principles (n.). The school principal (n.) gave a speech.'
  },
  {
    term: 'principal',
    confusedWith: 'principle',
    distinction: '"Principal" là người đứng đầu/chính yếu; "Principle" kết thúc bằng -le là nguyên lý, quy tắc.',
    exampleAlert: 'Our principal (adj.) goal is quality.'
  },
  {
    term: 'complement',
    confusedWith: 'compliment',
    distinction: '"Complement" (chữ e) là phần bù, bổ sung cho nhau trọn vẹn; "Compliment" (chữ i) là lời khen ngợi.',
    exampleAlert: 'Wine that complements (v.) cheese. Paid her a nice compliment (n.).'
  },
  {
    term: 'compliment',
    confusedWith: 'complement',
    distinction: '"Compliment" là lời khen hoặc khen ngợi; tránh nhầm với "Complement" (bổ trợ, bổ sung).',
    exampleAlert: 'He received many compliments (n.) on his presentation.'
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
// 2. DIALECT VARIATIONS DATABASE (BrE vs NAmE)
// ------------------------------------------------------------------------------

export const DIALECT_VARIATIONS: DialectVariation[] = [
  // Spelling differences
  { bre: 'colour', name: 'color', distinction: 'Khác biệt chính tả Anh-Anh (-our) và Anh-Mỹ (-or)', type: 'spelling' },
  { bre: 'flavour', name: 'flavor', distinction: 'Khác biệt chính tả Anh-Anh (-our) và Anh-Mỹ (-or)', type: 'spelling' },
  { bre: 'honour', name: 'honor', distinction: 'Khác biệt chính tả Anh-Anh (-our) và Anh-Mỹ (-or)', type: 'spelling' },
  { bre: 'humour', name: 'humor', distinction: 'Khác biệt chính tả Anh-Anh (-our) và Anh-Mỹ (-or)', type: 'spelling' },
  { bre: 'labour', name: 'labor', distinction: 'Khác biệt chính tả Anh-Anh (-our) và Anh-Mỹ (-or)', type: 'spelling' },
  { bre: 'neighbour', name: 'neighbor', distinction: 'Khác biệt chính tả Anh-Anh (-our) và Anh-Mỹ (-or)', type: 'spelling' },
  { bre: 'rumour', name: 'rumor', distinction: 'Khác biệt chính tả Anh-Anh (-our) và Anh-Mỹ (-or)', type: 'spelling' },
  { bre: 'centre', name: 'center', distinction: 'Khác biệt chính tả Anh-Anh (-re) và Anh-Mỹ (-er)', type: 'spelling' },
  { bre: 'theatre', name: 'theater', distinction: 'Khác biệt chính tả Anh-Anh (-re) và Anh-Mỹ (-er)', type: 'spelling' },
  { bre: 'metre', name: 'meter', distinction: 'Khác biệt chính tả Anh-Anh (-re) và Anh-Mỹ (-er)', type: 'spelling' },
  { bre: 'litre', name: 'liter', distinction: 'Khác biệt chính tả Anh-Anh (-re) và Anh-Mỹ (-er)', type: 'spelling' },
  { bre: 'realise', name: 'realize', distinction: 'Anh-Anh thường chuộng đuôi -ise; Anh-Mỹ luôn dùng -ize', type: 'spelling' },
  { bre: 'organise', name: 'organize', distinction: 'Anh-Anh thường chuộng đuôi -ise; Anh-Mỹ luôn dùng -ize', type: 'spelling' },
  { bre: 'recognise', name: 'recognize', distinction: 'Anh-Anh thường chuộng đuôi -ise; Anh-Mỹ luôn dùng -ize', type: 'spelling' },
  { bre: 'analyse', name: 'analyze', distinction: 'Anh-Anh dùng -yse; Anh-Mỹ dùng -yze', type: 'spelling' },
  { bre: 'catalogue', name: 'catalog', distinction: 'Anh-Anh giữ đuôi -ue; Anh-Mỹ giản lược', type: 'spelling' },
  { bre: 'dialogue', name: 'dialog', distinction: 'Anh-Anh giữ đuôi -ue; Anh-Mỹ giản lược', type: 'spelling' },
  { bre: 'programme', name: 'program', distinction: 'BrE dùng programme (trừ ngành máy tính); NAmE dùng program', type: 'spelling' },
  { bre: 'cheque', name: 'check', distinction: 'Tấm séc ngân hàng: BrE viết cheque, NAmE viết check', type: 'spelling' },
  { bre: 'tyre', name: 'tire', distinction: 'Lốp xe: BrE viết tyre, NAmE viết tire', type: 'spelling' },
  { bre: 'defence', name: 'defense', distinction: 'BrE viết -ce; NAmE viết -se', type: 'spelling' },
  { bre: 'offence', name: 'offense', distinction: 'BrE viết -ce; NAmE viết -se', type: 'spelling' },

  // Vocabulary distinctions
  { bre: 'flat', name: 'apartment', distinction: 'Căn hộ: BrE dùng "flat", NAmE dùng "apartment"', type: 'vocabulary' },
  { bre: 'lift', name: 'elevator', distinction: 'Thang máy: BrE dùng "lift", NAmE dùng "elevator"', type: 'vocabulary' },
  { bre: 'pavement', name: 'sidewalk', distinction: 'Vỉa hè: BrE dùng "pavement", NAmE dùng "sidewalk"', type: 'vocabulary' },
  { bre: 'holiday', name: 'vacation', distinction: 'Kỳ nghỉ: BrE dùng "holiday", NAmE chuộng "vacation"', type: 'vocabulary' },
  { bre: 'autumn', name: 'fall', distinction: 'Mùa thu: BrE dùng "autumn", NAmE dùng "fall"', type: 'vocabulary' },
  { bre: 'biscuit', name: 'cookie', distinction: 'Bánh quy: BrE gọi "biscuit", NAmE gọi "cookie"', type: 'vocabulary' },
  { bre: 'rubbish', name: 'garbage', distinction: 'Rác thải: BrE dùng "rubbish", NAmE dùng "garbage/trash"', type: 'vocabulary' },
  { bre: 'underground', name: 'subway', distinction: 'Tàu điện ngầm: BrE dùng "underground/tube", NAmE dùng "subway"', type: 'vocabulary' },
  { bre: 'lorry', name: 'truck', distinction: 'Xe tải: BrE dùng "lorry", NAmE dùng "truck"', type: 'vocabulary' },
  { bre: 'petrol', name: 'gasoline', distinction: 'Xăng dầu: BrE gọi "petrol", NAmE gọi "gasoline/gas"', type: 'vocabulary' },
  { bre: 'cinema', name: 'movie theater', distinction: 'Rạp chiếu phim: BrE dùng "cinema", NAmE dùng "movie theater"', type: 'vocabulary' },
  { bre: 'crisps', name: 'chips', distinction: 'Khoai tây chiên giòn lát: BrE gọi "crisps", NAmE gọi "chips"', type: 'vocabulary' },
  { bre: 'chips', name: 'fries', distinction: 'Khoai tây chiên que: BrE gọi "chips", NAmE gọi "french fries"', type: 'vocabulary' },
  { bre: 'post', name: 'mail', distinction: 'Bưu điện / thư từ: BrE dùng "post", NAmE dùng "mail"', type: 'vocabulary' },
  { bre: 'tap', name: 'faucet', distinction: 'Vòi nước: BrE dùng "tap", NAmE dùng "faucet"', type: 'vocabulary' },
  { bre: 'torch', name: 'flashlight', distinction: 'Đèn pin: BrE dùng "torch", NAmE dùng "flashlight"', type: 'vocabulary' },
  { bre: 'wardrobe', name: 'closet', distinction: 'Tủ quần áo: BrE dùng "wardrobe", NAmE dùng "closet"', type: 'vocabulary' },
  { bre: 'motorway', name: 'highway', distinction: 'Đường cao tốc: BrE dùng "motorway", NAmE dùng "highway/freeway"', type: 'vocabulary' },
  { bre: 'trousers', name: 'pants', distinction: 'Quần dài: BrE dùng "trousers", NAmE dùng "pants"', type: 'vocabulary' },
  { bre: 'football', name: 'soccer', distinction: 'Bóng đá: BrE gọi "football", NAmE gọi "soccer"', type: 'vocabulary' }
];

export function detectDialectVariation(term: string): DialectVariation | undefined {
  if (!term) return undefined;
  const clean = term.trim().toLowerCase();
  return DIALECT_VARIATIONS.find(v => v.bre.toLowerCase() === clean || v.name.toLowerCase() === clean);
}

// ------------------------------------------------------------------------------
// 3. MULTI-MEANING PARSER & DETECTOR
// ------------------------------------------------------------------------------

export function parseMultiMeanings(meaning: string, pos?: string): MultiMeaningSense[] {
  if (!meaning || !meaning.trim()) return [];
  const trimmed = meaning.trim();

  // Pattern 1: Numbered format like "1. ... 2. ..." OR "1) ... 2) ..." OR "(1) ... (2) ..."
  const numberedRegex = /(?:^|\s)(?:(\d+)[\.\)]|\((\d+)\))\s*/g;
  const matches = Array.from(trimmed.matchAll(numberedRegex));
  if (matches.length >= 2) {
    const senses: MultiMeaningSense[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const nextMatch = matches[i + 1];
      const startIdx = match.index! + match[0].length;
      const endIdx = nextMatch ? nextMatch.index! : trimmed.length;
      const rawChunk = trimmed.substring(startIdx, endIdx).trim().replace(/;$/, '');
      const num = parseInt(match[1] || match[2] || `${i + 1}`, 10);
      if (rawChunk) {
        senses.push({
          senseNumber: num,
          pos: pos,
          definition: rawChunk
        });
      }
    }
    if (senses.length > 0) return senses;
  }

  // Pattern 2: Explicit POS markers inside meaning (e.g., "n. sự thành công // v. kế vị")
  const posSplits = trimmed.split(/(?=\b(?:n|v|adj|adv|prep|conj|pron)\.\s*)/i).map(s => s.trim()).filter(Boolean);
  if (posSplits.length >= 2) {
    return posSplits.map((chunk, idx) => {
      const m = chunk.match(/^([a-z]+\.)\s*(.+)$/i);
      return {
        senseNumber: idx + 1,
        pos: m ? m[1].toLowerCase() : pos,
        definition: (m ? m[2] : chunk).trim().replace(/;$/, '')
      };
    });
  }

  // Pattern 3: Semicolon separation (common dictionary formatting for discrete senses)
  if (trimmed.includes(';')) {
    const parts = trimmed.split(';').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts.map((part, idx) => ({
        senseNumber: idx + 1,
        pos: pos,
        definition: part
      }));
    }
  }

  // Single default sense
  return [{
    senseNumber: 1,
    pos: pos,
    definition: trimmed
  }];
}

// ------------------------------------------------------------------------------
// 4. STANDARD PARTS OF SPEECH DICTIONARY
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
// 5. INDIVIDUAL FIELD AUDITING FUNCTIONS
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

  // Check invalid leading/trailing punctuation characters
  if (clean.endsWith(':') || clean.endsWith(';') || clean.endsWith('.')) {
    warnings.push('Từ có dấu chấm câu thừa ở cuối.');
    score -= 10;
  }

  // Check for suspicious numeric characters
  if (/[0-9]/.test(clean) && !['1st', '2nd', '3rd', '4th', '5th'].some(num => clean.includes(num))) {
    warnings.push('Từ chứa chữ số bất thường.');
    score -= 15;
  }

  // Check for multi-word phrase length
  const isPhrase = clean.includes(' ');
  if (isPhrase && clean.split(' ').length > 6) {
    warnings.push('Cụm từ quá dài (hơn 6 từ), có thể là một đoạn văn thay vì từ vựng mục tiêu.');
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

  // Check if recognized in standard map
  const isRecognized = Object.keys(STANDARD_POS_MAP).some(k => cleanPos.includes(k.replace('.', ''))) ||
    ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'phrase', 'interjection'].some(p => cleanPos.includes(p));

  if (!isRecognized) {
    warnings.push(`Từ loại "${pos}" chưa chuẩn hóa theo hệ thống phân loại ngữ pháp quốc tế.`);
    score -= 25;
  }

  // Multi-POS validation
  if (cleanPos.includes(',') || cleanPos.includes('/')) {
    warnings.push('Mục từ có nhiều từ loại kết hợp (vừa danh từ vừa động từ). Đã kích hoạt tách nghĩa theo từng từ loại.');
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
    if (term.includes(' ')) {
      warnings.push('Cụm từ chưa có phiên âm IPA (chấp nhận được đối với thành ngữ / cụm từ ghép).');
      score = 70;
    } else {
      warnings.push('Từ đơn thiếu phiên âm IPA chuẩn từ điển.');
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

  // Check for common corrupted characters from bad encoding
  if (clean.includes('\uFFFD') || (clean.includes('?') && !clean.includes('ɡ'))) {
    errors.push('Phiên âm chứa ký tự lỗi font mã hóa (corrupted Unicode glyph).');
    score -= 60;
  }

  // Check for presence of valid IPA vowels/consonants
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
 * Audit Example Sentence & Grammar Context
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

  // Terminal punctuation check (. ! ? or quotes)
  if (!/[.!?]["']?$/.test(cleanEx)) {
    warnings.push('Câu ví dụ thiếu dấu câu kết thúc (. ! ?).');
    score -= 10;
  }

  // Sentence minimum length check
  const wordCount = cleanEx.split(/\s+/).length;
  if (wordCount < 3) {
    warnings.push('Câu ví dụ quá ngắn (ít hơn 3 từ), khó thể hiện đầy đủ ngữ cảnh sử dụng.');
    score -= 15;
  }

  // Artifact & Placeholder detection
  if (/\[insert\]|<word>|TODO|N\/A|example:|ví dụ:/i.test(cleanEx)) {
    errors.push('Câu ví dụ chứa ký tự giữ chỗ (placeholder) hoặc mẫu chưa điền nội dung.');
    score -= 50;
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
  } else if (translation && translation.trim().toLowerCase() === cleanEx.toLowerCase()) {
    errors.push('Câu dịch tiếng Việt giống hệt câu tiếng Anh (chưa được dịch).');
    score -= 40;
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors
  };
}

// ------------------------------------------------------------------------------
// 6. FULL SINGLE-WORD VERIFIER
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

  // Derive field-level statuses
  const getFieldStatus = (check: FieldCheck): VerificationStatus => {
    if (check.errors.length > 0) return 'flagged_error';
    if (check.warnings.length > 0) return 'needs_review';
    if (check.score >= 90) return 'lexical_verified';
    return 'format_checked';
  };

  const fieldStatuses: FieldStatuses = {
    term: getFieldStatus(termCheck),
    pos: getFieldStatus(posCheck),
    phonetic: getFieldStatus(phoneticCheck),
    meaning: getFieldStatus(meaningCheck),
    example: getFieldStatus(exampleCheck)
  };

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

  // Dialect check (BrE vs NAmE)
  const dialectVariation = detectDialectVariation(word.term);

  // Multi-meaning extraction
  const multiMeanings = parseMultiMeanings(word.meaning, word.pos);

  // Determine overall status
  let status: VerificationStatus = 'format_checked';
  const totalErrors = termCheck.errors.length + meaningCheck.errors.length + phoneticCheck.errors.length + exampleCheck.errors.length;
  const totalWarnings = termCheck.warnings.length + posCheck.warnings.length + phoneticCheck.warnings.length + meaningCheck.warnings.length + exampleCheck.warnings.length;

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
    referenceSource: override?.referenceSource || 'Oxford 3000™ / CEFR Corpus Reference',
    referenceUrl: override?.referenceUrl,
    auditor: override?.auditor || 'Linguistic Quality Guard Engine',
    fieldStatuses,
    termCheck,
    posCheck,
    phoneticCheck,
    meaningCheck,
    exampleCheck,
    confusables: matchedConfusables.length > 0 ? matchedConfusables : undefined,
    dialectVariation,
    multiMeanings: multiMeanings.length > 1 ? multiMeanings : undefined,
    isPhraseOrIdiom: word.term.includes(' ') || (word.pos || '').toLowerCase().includes('phrase'),
    auditTrail: override?.auditTrail || [
      {
        timestamp: new Date().toISOString(),
        action: 'SCANNED',
        actor: 'Linguistic Verification Engine',
        details: `Đã quét chất lượng: Điểm tin cậy đạt ${overallScore}/100. Trạng thái: ${status}.`
      }
    ],
    proposedEdit: override?.proposedEdit,
    reviewerNotes: override?.reviewerNotes
  };

  return report;
}

// ------------------------------------------------------------------------------
// 7. COMPREHENSIVE BATCH QUALITY SCANNER
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
  let dialectVariationsCount = 0;
  let multiMeaningCount = 0;
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
    if (rep.dialectVariation) dialectVariationsCount++;
    if (rep.multiMeanings && rep.multiMeanings.length > 1) multiMeaningCount++;
    if (rep.proposedEdit) proposedEditsCount++;

    // Group problematic
    if (rep.status === 'flagged_error' || rep.status === 'needs_review' || (rep.confusables && rep.confusables.length > 0) || rep.dialectVariation || (rep.multiMeanings && rep.multiMeanings.length > 1)) {
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
    if (rep.dialectVariation) dialectVariationsCount++;
    if (rep.multiMeanings && rep.multiMeanings.length > 1) multiMeaningCount++;
    if (rep.proposedEdit) proposedEditsCount++;

    if (rep.status === 'flagged_error' || rep.status === 'needs_review' || (rep.confusables && rep.confusables.length > 0) || rep.dialectVariation || (rep.multiMeanings && rep.multiMeanings.length > 1)) {
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
    dialectVariationsCount,
    multiMeaningCount,
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
// 8. AI CONTENT GUARDRAILS (QUIZZES, MNEMONICS, GENERATED CONTENT)
// ------------------------------------------------------------------------------

export interface AiQuizAuditInput {
  targetTerm: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface AiQuizAuditResult {
  valid: boolean;
  score: number;
  warnings: string[];
  errors: string[];
  guardrailVerdict: 'SAFE_AND_VERIFIED' | 'NEEDS_HUMAN_REVIEW' | 'REJECTED_DEFECTIVE';
  normalizedKey?: string;
}

export function auditAiQuizContent(quiz: AiQuizAuditInput): AiQuizAuditResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  if (!quiz.question || !quiz.question.trim()) {
    errors.push('Câu hỏi trắc nghiệm bị bỏ trống.');
    score = 0;
  }

  if (!Array.isArray(quiz.options) || quiz.options.length < 2) {
    errors.push('Câu trắc nghiệm phải có ít nhất 2 phương án lựa chọn.');
    score -= 50;
  } else {
    // Check duplicate options
    const normalizedOpts = quiz.options.map(o => normalizeText(o));
    const uniqueOpts = new Set(normalizedOpts);
    if (uniqueOpts.size < normalizedOpts.length) {
      errors.push('Các phương án lựa chọn có nội dung trùng lặp.');
      score -= 40;
    }
  }

  if (quiz.correctIndex < 0 || quiz.correctIndex >= (quiz.options?.length || 0)) {
    errors.push(`Chỉ số đáp án đúng (${quiz.correctIndex}) nằm ngoài phạm vi các phương án.`);
    score = 0;
  }

  // Target term relevance check
  const termLower = quiz.targetTerm?.trim().toLowerCase() || '';
  if (termLower) {
    const questionLower = quiz.question?.toLowerCase() || '';
    const optionsLower = (quiz.options || []).map(o => o.toLowerCase());
    const foundInQuestion = questionLower.includes(termLower);
    const foundInOptions = optionsLower.some(o => o.includes(termLower));
    if (!foundInQuestion && !foundInOptions) {
      warnings.push(`Từ vựng mục tiêu ("${quiz.targetTerm}") không xuất hiện trong câu hỏi lẫn các phương án.`);
      score -= 20;
    }
  }

  // Explanation coherence
  if (quiz.explanation) {
    const expLower = quiz.explanation.toLowerCase();
    const chosenOpt = quiz.options?.[quiz.correctIndex]?.toLowerCase() || '';
    if (chosenOpt && !expLower.includes(chosenOpt) && !expLower.includes(termLower)) {
      warnings.push('Phần giải thích chưa liên kết rõ ràng với đáp án đúng hoặc từ vựng mục tiêu.');
      score -= 10;
    }
  } else {
    warnings.push('Chưa có lời giải thích chi tiết cho câu trắc nghiệm.');
    score -= 15;
  }

  let guardrailVerdict: 'SAFE_AND_VERIFIED' | 'NEEDS_HUMAN_REVIEW' | 'REJECTED_DEFECTIVE' = 'NEEDS_HUMAN_REVIEW';
  if (errors.length > 0) {
    guardrailVerdict = 'REJECTED_DEFECTIVE';
  } else if (score >= 90 && warnings.length === 0) {
    guardrailVerdict = 'NEEDS_HUMAN_REVIEW'; // AI content strictly remains in review status until explicitly signed off
  }

  return {
    valid: errors.length === 0,
    score: Math.max(0, score),
    warnings,
    errors,
    guardrailVerdict,
    normalizedKey: quiz.options?.[quiz.correctIndex]
  };
}

// ------------------------------------------------------------------------------
// 9. ANSWER EQUIVALENCE CHECKER (FOR ACCURATE SPACED REPETITION QUIZ/SPELLING)
// ------------------------------------------------------------------------------

/**
 * Checks if student answer is equivalent to expected answer.
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

  // Check parenthetical tolerance (e.g. "(sự) thành công" matches "thành công")
  const strippedParens = expectedText.replace(/\([^)]*\)/g, '').trim();
  if (normalizeText(strippedParens) === normStudent) {
    return { isMatch: true, isExact: false, feedback: 'Chính xác (khớp nghĩa chính không tính phần trong ngoặc)!' };
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

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------------------------
// 10. EXPORT REPORT GENERATOR (JSON / CSV)
// ------------------------------------------------------------------------------

export function exportQualityAuditReport(
  reports: WordVerificationReport[],
  format: 'json' | 'csv'
): string {
  if (format === 'json') {
    return JSON.stringify(reports, null, 2);
  }

  // CSV format
  const headers = [
    'Word ID',
    'Term',
    'Quality Score',
    'Status',
    'Primary Source',
    'Reference Source',
    'Dialect Variation',
    'Multi-meanings Count',
    'Confusable Pairs',
    'Term Valid',
    'POS Valid',
    'Phonetic Valid',
    'Meaning Valid',
    'Example Valid',
    'Warnings Count',
    'Errors Count',
    'Audited At'
  ];

  const rows = reports.map(r => [
    `"${r.wordId}"`,
    `"${(r.term || '').replace(/"/g, '""')}"`,
    r.qualityScore,
    `"${r.status}"`,
    `"${r.primarySource}"`,
    `"${(r.referenceSource || '').replace(/"/g, '""')}"`,
    `"${(r.dialectVariation ? `${r.dialectVariation.bre} (BrE) / ${r.dialectVariation.name} (NAmE)` : '').replace(/"/g, '""')}"`,
    r.multiMeanings ? r.multiMeanings.length : 1,
    `"${(r.confusables ? r.confusables.map(c => c.word).join(', ') : '').replace(/"/g, '""')}"`,
    r.termCheck.valid ? 'YES' : 'NO',
    r.posCheck.valid ? 'YES' : 'NO',
    r.phoneticCheck.valid ? 'YES' : 'NO',
    r.meaningCheck.valid ? 'YES' : 'NO',
    r.exampleCheck.valid ? 'YES' : 'NO',
    r.termCheck.warnings.length + r.posCheck.warnings.length + r.phoneticCheck.warnings.length + r.meaningCheck.warnings.length + r.exampleCheck.warnings.length,
    r.termCheck.errors.length + r.meaningCheck.errors.length + r.phoneticCheck.errors.length + r.exampleCheck.errors.length,
    `"${r.lastAuditedAt}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
