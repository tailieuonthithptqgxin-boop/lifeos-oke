/**
 * vocabEnricher.ts
 * Hệ thống làm giàu dữ liệu từ vựng thông minh (Smart Vocabulary Enrichment Engine)
 * Giải quyết triệt để tình trạng thẻ Flashcard bị trống rỗng khi học từ vựng Oxford 3000 / JLPT / HSK.
 * Cung cấp ví dụ ngữ cảnh song ngữ (Anh - Việt), collocations, nhãn từ loại và mẹo nhớ trực quan.
 */

export interface EnrichedWordData {
  partOfSpeechLabel: string;
  exampleSentence: string;
  exampleTranslation: string;
  collocations: string[];
  explanation: string;
  mnemonic: string;
}

// 1. Từ điển mở rộng chuẩn hóa cho các từ Oxford 3000 phổ biến hay gặp
const CURATED_DICTIONARY: Record<string, Partial<EnrichedWordData>> = {
  criterion: {
    partOfSpeechLabel: 'Danh từ (n.)',
    exampleSentence: 'Academic ability is not the sole criterion for admission to this university.',
    exampleTranslation: 'Năng lực học tập không phải là tiêu chuẩn duy nhất để xét tuyển vào trường đại học này.',
    collocations: [
      'meet the criteria (đáp ứng tiêu chuẩn)',
      'selection criteria (tiêu chuẩn tuyển chọn)',
      'strict criteria (tiêu chuẩn nghiêm ngặt)'
    ],
    explanation: 'Danh từ số ít (Số nhiều bất quy tắc: criteria). Dùng để chỉ thước đo, nguyên tắc hay tiêu chuẩn để đánh giá, phán xét.',
    mnemonic: '💡 Mẹo nhớ: "Critique" (phê bình) + "on" = "Criterion" là chuẩn mực để đánh giá.'
  },
  critical: {
    partOfSpeechLabel: 'Tính từ (adj.)',
    exampleSentence: 'Regular practice is critical for long-term knowledge retention.',
    exampleTranslation: 'Việc ôn tập đều đặn đóng vai trò then chốt cho sự ghi nhớ lâu dài.',
    collocations: [
      'critical thinking (tư duy phản biện)',
      'play a critical role (đóng vai trò then chốt)',
      'critical condition (tình trạng nguy kịch)'
    ],
    explanation: 'Mang 2 nghĩa chính: 1. Then chốt, mang tính quyết định; 2. Phê bình, mang tính chỉ trích hoặc phân tích sâu.',
    mnemonic: '💡 Mẹo nhớ: "Crisis" (khủng hoảng) -> "Critical" là yếu tố quyết định để vượt qua khủng hoảng.'
  },
  crucial: {
    partOfSpeechLabel: 'Tính từ (adj.)',
    exampleSentence: 'Discipline is crucial to turning ambitious dreams into reality.',
    exampleTranslation: 'Kỷ luật là điều tối quan trọng để biến những ước mơ lớn thành hiện thực.',
    collocations: [
      'crucial factor (yếu tố cốt lõi)',
      'crucial decision (quyết định mang tính bước ngoặt)'
    ],
    explanation: 'Đặc biệt quan trọng, tối quan trọng; thành công hay thất bại của điều gì đó phụ thuộc vào nó.'
  },
  resilience: {
    partOfSpeechLabel: 'Danh từ (n.)',
    exampleSentence: 'True resilience is bouncing back stronger each time you face setbacks.',
    exampleTranslation: 'Sự kiên cường thực sự là đứng dậy mạnh mẽ hơn sau mỗi lần vấp ngã.',
    collocations: [
      'build resilience (xây dựng sự kiên cường)',
      'emotional resilience (bản lĩnh cảm xúc)'
    ],
    explanation: 'Khả năng phục hồi, bật dậy nhanh chóng sau khó khăn, nghịch cảnh hoặc chấn thương.'
  },
  analyze: {
    partOfSpeechLabel: 'Động từ (v.)',
    exampleSentence: 'We need to analyze the data carefully before drawing any conclusions.',
    exampleTranslation: 'Chúng ta cần phân tích dữ liệu cẩn thận trước khi đưa ra bất kỳ kết luận nào.',
    collocations: [
      'analyze the results (phân tích kết quả)',
      'deeply analyze (phân tích sâu)'
    ],
    explanation: 'Kiểm tra, phân tích chi tiết cấu trúc hoặc thành phần của một vấn đề.'
  },
  significant: {
    partOfSpeechLabel: 'Tính từ (adj.)',
    exampleSentence: 'She has made significant progress in her English speaking skills.',
    exampleTranslation: 'Cô ấy đã đạt được bước tiến đáng kể trong kỹ năng nói tiếng Anh.',
    collocations: [
      'significant improvement (sự cải thiện đáng kể)',
      'statistically significant (có ý nghĩa thống kê)'
    ],
    explanation: 'Lớn lao, đáng chú ý hoặc có tầm ảnh hưởng quan trọng.'
  },
  establish: {
    partOfSpeechLabel: 'Động từ (v.)',
    exampleSentence: 'They plan to establish a strong daily routine to boost productivity.',
    exampleTranslation: 'Họ dự định thiết lập một lịch trình hàng ngày vững chắc để tăng năng suất.',
    collocations: [
      'establish a habit (thiết lập thói quen)',
      'establish connection (thiết lập kết nối)'
    ],
    explanation: 'Thành lập, thiết lập hoặc chứng minh một sự thật được công nhận rộng rãi.'
  },
  indicate: {
    partOfSpeechLabel: 'Động từ (v.)',
    exampleSentence: 'Research indicates that spaced repetition dramatically increases recall rates.',
    exampleTranslation: 'Nghiên cứu chỉ ra rằng lặp lại ngắt quãng làm tăng đáng kể tỷ lệ ghi nhớ.',
    collocations: [
      'clearly indicate (chỉ ra rõ ràng)',
      'evidence indicates that (bằng chứng cho thấy rằng)'
    ],
    explanation: 'Chỉ ra, biểu thị, cho thấy hoặc là dấu hiệu của một điều gì đó.'
  },
  occur: {
    partOfSpeechLabel: 'Động từ (v.)',
    exampleSentence: 'Mistakes naturally occur when you are learning something completely new.',
    exampleTranslation: 'Sai sót đương nhiên sẽ xảy ra khi bạn đang học một điều hoàn toàn mới.',
    collocations: [
      'occur frequently (xảy ra thường xuyên)',
      'it occurred to me that (chợt lóe lên trong đầu tôi rằng)'
    ],
    explanation: 'Xảy ra, xuất hiện hoặc diễn ra (đồng nghĩa với happen).'
  },
  perspective: {
    partOfSpeechLabel: 'Danh từ (n.)',
    exampleSentence: 'Traveling to new places gives you a broader perspective on life.',
    exampleTranslation: 'Đi đến những vùng đất mới mang lại cho bạn góc nhìn rộng mở hơn về cuộc sống.',
    collocations: [
      'from my perspective (theo quan điểm của tôi)',
      'gain perspective (có được cái nhìn thấu đáo)'
    ],
    explanation: 'Góc nhìn, quan điểm hoặc cách nhìn nhận đánh giá sự vật, hiện tượng.'
  }
};

// 2. Chuyển đổi mã từ loại tiếng Anh sang nhãn tiếng Việt chuẩn
export function formatPartOfSpeech(pos?: string): string {
  if (!pos) return '';
  const p = pos.trim().toLowerCase();
  if (p.includes('noun') || p === 'n.' || p === 'n') return 'Danh từ (Noun)';
  if (p.includes('verb') || p === 'v.' || p === 'v') return 'Động từ (Verb)';
  if (p.includes('adj') || p === 'a.' || p === 'a') return 'Tính từ (Adjective)';
  if (p.includes('adv')) return 'Trạng từ (Adverb)';
  if (p.includes('prep')) return 'Giới từ (Preposition)';
  if (p.includes('conj')) return 'Liên từ (Conjunction)';
  if (p.includes('pron')) return 'Đại từ (Pronoun)';
  if (p.includes('idiom')) return 'Thành ngữ (Idiom)';
  if (p.includes('phr')) return 'Cụm từ (Phrase)';
  return pos;
}

// 3. Trình làm giàu dữ liệu từ vựng tổng quát
export function enrichVocabWord(termRaw: string, posRaw?: string, meaningRaw?: string): EnrichedWordData {
  const term = String(termRaw || '').trim().toLowerCase();
  const pos = String(posRaw || '').trim();
  const meaning = String(meaningRaw || '').trim();

  // Kiểm tra từ điển có sẵn
  if (CURATED_DICTIONARY[term]) {
    const cur = CURATED_DICTIONARY[term];
    return {
      partOfSpeechLabel: cur.partOfSpeechLabel || formatPartOfSpeech(pos),
      exampleSentence: cur.exampleSentence || '',
      exampleTranslation: cur.exampleTranslation || '',
      collocations: cur.collocations || [],
      explanation: cur.explanation || '',
      mnemonic: cur.mnemonic || ''
    };
  }

  // Thuật toán Rule-Based thông minh tự động sinh câu ví dụ ngữ cảnh
  const posLabel = formatPartOfSpeech(pos);
  const cleanMeaning = meaning.split(/[;,/]/)[0].trim() || 'khái niệm này';
  const displayTerm = termRaw || term;

  let generatedSentence = '';
  let generatedTranslation = '';
  let generatedCollocations: string[] = [];

  if (pos.includes('v') || pos === 'v.') {
    generatedSentence = `It is important to ${displayTerm} with care in daily practice.`;
    generatedTranslation = `Điều quan trọng là phải ${cleanMeaning} một cách cẩn trọng trong thực tế hàng ngày.`;
    generatedCollocations = [`learn to ${displayTerm} (học cách ${cleanMeaning})`, `actively ${displayTerm} (chủ động ${cleanMeaning})`];
  } else if (pos.includes('adj') || pos === 'a.') {
    generatedSentence = `Maintaining a ${displayTerm} attitude will help you overcome difficulties.`;
    generatedTranslation = `Duy trì một thái độ ${cleanMeaning} sẽ giúp bạn vượt qua mọi khó khăn.`;
    generatedCollocations = [`very ${displayTerm} (rất ${cleanMeaning})`, `remain ${displayTerm} (giữ sự ${cleanMeaning})`];
  } else if (pos.includes('adv')) {
    generatedSentence = `She completed her assignments ${displayTerm} every single day.`;
    generatedTranslation = `Cô ấy hoàn thành bài tập một cách ${cleanMeaning} mỗi ngày.`;
    generatedCollocations = [`worked ${displayTerm} (làm việc một cách ${cleanMeaning})`];
  } else {
    // Mặc định cho Danh từ
    generatedSentence = `Understanding this ${displayTerm} is essential for continuous progress.`;
    generatedTranslation = `Hiểu rõ ${cleanMeaning} này là điều thiết yếu để tiến bộ không ngừng.`;
    generatedCollocations = [
      `key ${displayTerm} (${cleanMeaning} then chốt)`,
      `apply the ${displayTerm} (áp dụng ${cleanMeaning})`
    ];
  }

  return {
    partOfSpeechLabel: posLabel,
    exampleSentence: generatedSentence,
    exampleTranslation: generatedTranslation,
    collocations: generatedCollocations,
    explanation: `Từ vựng cốt lõi thường xuất hiện trong giao tiếp và các kỳ thi chuẩn hóa.`,
    mnemonic: `💡 Chú ý kết hợp ngữ cảnh câu khi học để ghi nhớ bền vững lâu dài.`
  };
}

export function getEnrichedExample(term: string, pos?: string, meaning?: string): string {
  return enrichVocabWord(term, pos, meaning).exampleSentence;
}

export function getEnrichedTranslation(term: string, pos?: string, meaning?: string): string {
  return enrichVocabWord(term, pos, meaning).exampleTranslation;
}

export function getEnrichedExplanation(term: string, pos?: string, meaning?: string): string {
  return enrichVocabWord(term, pos, meaning).explanation;
}

export function getEnrichedCollocations(term: string, pos?: string, meaning?: string): string[] {
  return enrichVocabWord(term, pos, meaning).collocations;
}

export function getEnrichedMnemonic(term: string, pos?: string, meaning?: string): string {
  return enrichVocabWord(term, pos, meaning).mnemonic;
}
