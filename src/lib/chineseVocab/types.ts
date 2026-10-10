// ==============================================================================
// CHINESE VOCABULARY MASTER — DATA MODELS & TYPES
// ==============================================================================
// Architecture supporting 10,000+ Chinese HSK words, Linguistic Verification,
// Simplified & Traditional Chinese, Pinyin & Tone Sandhi, Contextual Multi-meanings,
// Confusables Detection, Spaced Repetition (SM-2), and Non-destructive Audit Trails.

export type ChineseVerificationStatus = 
  | 'unverified'          // Chưa kiểm tra
  | 'format_checked'       // Đã kiểm tra định dạng
  | 'dictionary_verified'  // Đã đối chiếu nguồn từ điển học thuật
  | 'needs_review'         // Cần xem xét thêm
  | 'flagged_error'        // Có lỗi cần sửa
  | 'approved';            // Đã phê duyệt chính thức

export type ChineseSourceType = 
  | 'official_hsk'             // Nguồn chính thức HSK 3.0 / HSK 2.0
  | 'dictionary_verified'      // Đối chiếu Từ điển Hán-Việt / Tân Hoa / HSK Standard Course
  | 'user_contributed'         // Do học viên tự tạo (我的词汇)
  | 'ai_generated_unverified'  // AI đề xuất (Bắt buộc gắn nhãn chưa xác minh)
  | 'format_normalized';       // Đã qua chuẩn hóa kỹ thuật

export interface ChineseFieldCheck {
  valid: boolean;
  score: number; // 0 to 100
  warnings: string[];
  errors: string[];
  details?: string;
  suggestedFix?: string;
}

export interface PinyinAnalysis {
  raw: string;
  syllables: string[];
  toneMarks: number[]; // 1, 2, 3, 4, or 0 (neutral tone)
  neutralToneDetected: boolean;
  toneSandhiNotes?: string;
}

export interface TraditionalVariant {
  simplified: string;
  traditional: string;
  isOneToMany: boolean;
  note?: string;
}

export interface ChineseMultiMeaningSense {
  senseNumber: number;
  pos?: string;
  definition: string;
  contextNotes?: string;
  exampleHanzi?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
}

export interface ChineseConfusable {
  term: string;
  confusedWith: string;
  type: 'shape' | 'pronunciation' | 'synonym' | 'usage'; // 形近字, 同音字, 近义词, 易混淆词
  distinction: string;
  exampleContrast: string;
}

export interface ChineseAuditLogEntry {
  timestamp: string;
  action: 'IMPORT' | 'NORMALIZE' | 'VALIDATE' | 'VERIFY' | 'REVIEW' | 'APPROVE' | 'EDIT' | 'ROLLBACK';
  actor: string;
  field?: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  source?: string;
}

export interface ChineseProposedEdit {
  term?: string;
  traditionalTerm?: string;
  pinyin?: string;
  meaning?: string;
  pos?: string;
  exampleSentence?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  reason: string;
  source: string;
  createdAt: string;
}

export interface ChineseWord {
  id: string; // e.g. "zh_hsk_1_1" or "zh_user_..."
  term: string; // Hán tự giản thể
  traditionalTerm?: string; // Hán tự phồn thể (nếu có nguồn xác minh)
  pinyin: string;
  tones?: number[]; // [4] for ài
  pos: string; // Từ loại (danh từ, động từ, v.v.)
  meaning: string;
  secondaryMeanings?: string[];
  multiMeanings?: ChineseMultiMeaningSense[];
  exampleSentence?: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  hskLevel: number; // 1 to 9, hoặc 0 nếu unclassified
  levelLabel: string; // "HSK 1", "HSK 2", ... "HSK 7-9", "unclassified"
  
  // Verification & Source Transparency
  verificationStatus: ChineseVerificationStatus;
  sourceType: ChineseSourceType;
  sourceName: string;
  sourceReference?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  pronunciationStatus: 'verified' | 'needs_review';
  exampleStatus: 'verified' | 'needs_review' | 'missing';
  
  // Linguistic Field Checks & Scores
  hanziCheck: ChineseFieldCheck;
  pinyinCheck: ChineseFieldCheck;
  meaningCheck: ChineseFieldCheck;
  exampleCheck: ChineseFieldCheck;
  qualityScore: number; // 0 - 100
  
  // Linguistic Enrichment
  confusables?: ChineseConfusable[];
  toneSandhi?: string;
  
  // Non-destructive Audit Trail & Rollback
  proposedEdit?: ChineseProposedEdit;
  auditTrail: ChineseAuditLogEntry[];
}

export interface ChineseQualityControlSummary {
  totalRecords: number;
  verifiedCount: number;
  formatCheckedCount: number;
  needsReviewCount: number;
  flaggedErrorCount: number;
  unverifiedCount: number;
  
  missingPinyinCount: number;
  missingMeaningCount: number;
  missingExampleCount: number;
  confusablesCount: number;
  traditionalMappedCount: number;
  toneSandhiCount: number;
  multiMeaningCount: number;
  proposedEditsCount: number;
  
  hskLevelCounts: Record<string, number>;
  averageQualityScore: number;
  auditedAt: string;
}

export type ActiveRecallMode = 
  | 'hanzi_to_meaning'   // Hán tự → Nghĩa
  | 'meaning_to_hanzi'   // Nghĩa → Hán tự
  | 'pinyin_to_hanzi'    // Pinyin → Hán tự
  | 'hanzi_to_pinyin'    // Hán tự → Pinyin
  | 'audio_to_hanzi'     // Nghe phát âm → Hán tự
  | 'fill_in_blank'      // Điền từ vào chỗ trống trong câu ví dụ
  | 'context_recall';    // Context Recall theo ngữ cảnh

export interface ChineseRecallQuestion {
  id: string;
  wordId: string;
  mode: ActiveRecallMode;
  prompt: string;
  promptSub?: string;
  audioPromptUrl?: string;
  options?: string[];
  correctOptionIndex?: number;
  answer: string;
  pinyinAnswer?: string;
  hint?: string;
  exampleSnippet?: string;
}
