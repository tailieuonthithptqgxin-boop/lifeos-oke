// ==============================================================================
// LIFEOS LISTENING & AUDIO-FIRST COMPREHENSION ENGINE
// ==============================================================================
// Deep phoneme, orthographic, Levenshtein & grammatical error classification
// for Audio-first dictation, transcription, minimal pairs, and comprehension.

export type ListeningExerciseMode =
  | 'listen_and_type'        // Nghe từ và nhập lại chính xác mặt chữ
  | 'listen_and_complete'    // Nghe cả câu và điền từ còn thiếu trong ngữ cảnh
  | 'listen_and_choose'      // Nghe âm thanh (không lộ chữ) và chọn nghĩa đúng
  | 'listen_and_transcribe'; // Nghe cả câu dài và chép chính tả toàn bộ câu

export type ListeningResultType =
  | 'exact'
  | 'minor_typo'
  | 'phonetic_confusion'
  | 'missing_words'
  | 'extra_words'
  | 'incorrect';

export interface CharDiffItem {
  type: 'match' | 'insert' | 'delete' | 'substitute';
  char: string;
  expected?: string;
}

export interface ListeningEvaluation {
  score: number; // 0 - 100
  rating: 1 | 2 | 3 | 4; // 1: Quên/Sai, 2: Khó/Nhiều lỗi, 3: Tốt/Lỗi nhẹ, 4: Hoàn hảo
  isExact: boolean;
  isAcceptable: boolean;
  resultType: ListeningResultType;
  title: string;
  feedback: string;
  charDiff?: CharDiffItem[];
  commonMistakeExplanation?: string;
  expectedNormalized: string;
  studentNormalized: string;
}

// ------------------------------------------------------------------------------
// LEVENSHTEIN DISTANCE MATRIX & CHAR DIFF ALGORITHM
// ------------------------------------------------------------------------------
export function computeLevenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

export function computeCharDiff(student: string, expected: string): CharDiffItem[] {
  const s1 = student.toLowerCase();
  const s2 = expected.toLowerCase();
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const diff: CharDiffItem[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
      diff.unshift({ type: 'match', char: expected[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j] && dp[i][j - 1] <= dp[i - 1][j - 1])) {
      diff.unshift({ type: 'delete', char: '', expected: expected[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] <= dp[i][j - 1] && dp[i - 1][j] <= dp[i - 1][j - 1])) {
      diff.unshift({ type: 'insert', char: student[i - 1] });
      i--;
    } else if (i > 0 && j > 0) {
      diff.unshift({ type: 'substitute', char: student[i - 1], expected: expected[j - 1] });
      i--;
      j--;
    }
  }

  return diff;
}

// ------------------------------------------------------------------------------
// COMMON PHONETIC CONFUSION PAIRS
// ------------------------------------------------------------------------------
const PHONETIC_CONFUSION_PAIRS: Array<[string, string, string]> = [
  ['b', 'p', 'Cặp âm môi vô thanh / hữu thanh /p/ và /b/'],
  ['d', 't', 'Cặp âm đầu lưỡi /t/ và /d/'],
  ['v', 'f', 'Cặp âm răng môi /f/ và /v/'],
  ['s', 'sh', 'Âm xát /s/ và /ʃ/ (s vs sh)'],
  ['s', 'z', 'Cặp âm /s/ và /z/'],
  ['th', 't', 'Âm thè lưỡi /θ/ nhầm sang /t/'],
  ['th', 'd', 'Âm thè lưỡi /ð/ nhầm sang /d/'],
  ['l', 'r', 'Phân biệt âm cuộn lưỡi /r/ và âm cạnh lưỡi /l/'],
  ['i', 'ee', 'Nguyên âm ngắn /ɪ/ và nguyên âm dài /iː/'],
  ['c', 'k', 'Quy tắc chính tả âm /k/ viết bằng c hoặc k'],
  ['ou', 'o', 'Nguyên âm đôi /aʊ/ và nguyên âm /oʊ/']
];

function detectPhoneticConfusion(input: string, expected: string): string | null {
  const inNorm = input.toLowerCase();
  const expNorm = expected.toLowerCase();

  for (const [a, b, note] of PHONETIC_CONFUSION_PAIRS) {
    if (
      (inNorm.includes(a) && expNorm.includes(b) && inNorm.replace(a, b) === expNorm) ||
      (inNorm.includes(b) && expNorm.includes(a) && inNorm.replace(b, a) === expNorm)
    ) {
      return note;
    }
  }
  return null;
}

// ------------------------------------------------------------------------------
// EVALUATE LISTENING ANSWER
// ------------------------------------------------------------------------------
export function evaluateListeningAnswer(
  studentInput: string,
  expectedTarget: string,
  options: {
    languageId?: string;
    isSentence?: boolean;
    synonyms?: string[];
  } = {}
): ListeningEvaluation {
  const rawInput = (studentInput || '').trim();
  const rawExpected = (expectedTarget || '').trim();

  const cleanStudent = rawInput.toLowerCase().replace(/['".,!?;:\-]/g, '').replace(/\s+/g, ' ');
  const cleanExpected = rawExpected.toLowerCase().replace(/['".,!?;:\-]/g, '').replace(/\s+/g, ' ');

  if (!cleanStudent) {
    return {
      score: 0,
      rating: 1,
      isExact: false,
      isAcceptable: false,
      resultType: 'missing_words',
      title: 'Chưa có câu trả lời',
      feedback: 'Bạn chưa nhập nội dung nghe được. Hãy bấm phát lại và gõ những gì bạn nghe thấy!',
      expectedNormalized: rawExpected,
      studentNormalized: ''
    };
  }

  // 1. EXACT MATCH 100%
  if (cleanStudent === cleanExpected) {
    return {
      score: 100,
      rating: 4,
      isExact: true,
      isAcceptable: true,
      resultType: 'exact',
      title: 'Chính xác 100%! 🎯',
      feedback: 'Tuyệt đỉnh! Đôi tai của bạn bắt âm cực kỳ chuẩn xác và ghi nhớ mặt chữ hoàn hảo.',
      charDiff: computeCharDiff(rawInput, rawExpected),
      expectedNormalized: rawExpected,
      studentNormalized: rawInput
    };
  }

  // 2. CHECK SYNONYMS & ALTERNATIVES (nếu từ điển cho phép biến thể)
  if (Array.isArray(options.synonyms)) {
    const matchedSyn = options.synonyms.find(
      (s) => s.toLowerCase().replace(/['".,!?;:\-]/g, '').trim() === cleanStudent
    );
    if (matchedSyn) {
      return {
        score: 95,
        rating: 3,
        isExact: false,
        isAcceptable: true,
        resultType: 'exact',
        title: 'Đúng nghĩa tương đương! ✨',
        feedback: `Bạn nghe và nhập từ đồng nghĩa "${matchedSyn}", từ chính xác trong bài nghe là "${rawExpected}".`,
        charDiff: computeCharDiff(rawInput, rawExpected),
        expectedNormalized: rawExpected,
        studentNormalized: rawInput
      };
    }
  }

  // 3. SENTENCE WORD-BY-WORD COMPARISON (Dành cho nghe chép chính tả câu)
  if (options.isSentence) {
    const studentWords = cleanStudent.split(' ').filter(Boolean);
    const expectedWords = cleanExpected.split(' ').filter(Boolean);

    let matchedWordCount = 0;
    expectedWords.forEach((ew) => {
      if (studentWords.includes(ew)) matchedWordCount++;
    });

    const wordMatchRatio = matchedWordCount / Math.max(1, expectedWords.length);

    if (wordMatchRatio >= 0.85) {
      const score = Math.round(wordMatchRatio * 100);
      return {
        score,
        rating: 3,
        isExact: false,
        isAcceptable: true,
        resultType: studentWords.length < expectedWords.length ? 'missing_words' : 'minor_typo',
        title: 'Khá tốt! Gần đúng hoàn toàn 🌟',
        feedback: `Bạn đã nghe được ${matchedWordCount}/${expectedWords.length} từ trong câu. Hãy đối chiếu các từ còn thiếu/sai khác bên dưới!`,
        charDiff: computeCharDiff(rawInput, rawExpected),
        expectedNormalized: rawExpected,
        studentNormalized: rawInput
      };
    }
  }

  // 4. LEVENSHTEIN DISTANCE & MINOR TYPO CHECK
  const distance = computeLevenshteinDistance(cleanStudent, cleanExpected);
  const maxLen = Math.max(cleanStudent.length, cleanExpected.length);
  const similarityScore = Math.max(0, Math.round(((maxLen - distance) / maxLen) * 100));

  // Check phonetic confusion
  const phoneticNote = detectPhoneticConfusion(cleanStudent, cleanExpected);

  if (distance <= 2 && maxLen >= 4) {
    return {
      score: Math.max(80, similarityScore),
      rating: 3,
      isExact: false,
      isAcceptable: true,
      resultType: phoneticNote ? 'phonetic_confusion' : 'minor_typo',
      title: phoneticNote ? 'Nhầm lẫn âm nghe tương đồng 👂' : 'Sai chính tả nhẹ ✏️',
      feedback: phoneticNote
        ? `Bạn nghe được gần hết từ nhưng đang nhầm ${phoneticNote}. Hãy phát lại âm thanh để nhận diện sự khác biệt!`
        : `Bạn chỉ gõ lệch ${distance} ký tự nhỏ. Hãy đối chiếu mặt chữ chuẩn để củng cố phản xạ!`,
      charDiff: computeCharDiff(rawInput, rawExpected),
      commonMistakeExplanation: phoneticNote || undefined,
      expectedNormalized: rawExpected,
      studentNormalized: rawInput
    };
  }

  // 5. MODERATE SIMILARITY (score 50 - 79%)
  if (similarityScore >= 50) {
    return {
      score: similarityScore,
      rating: 2,
      isExact: false,
      isAcceptable: false,
      resultType: phoneticNote ? 'phonetic_confusion' : 'incorrect',
      title: 'Chưa chính xác (Cần ôn kỹ) ⚠️',
      feedback: `Độ tương đồng: ${similarityScore}%. Hãy bấm "Nghe tốc độ chậm 0.75x" để nghe từng âm tiết rõ ràng hơn.`,
      charDiff: computeCharDiff(rawInput, rawExpected),
      commonMistakeExplanation: phoneticNote || undefined,
      expectedNormalized: rawExpected,
      studentNormalized: rawInput
    };
  }

  // 6. INCORRECT (< 50%)
  return {
    score: Math.max(10, similarityScore),
    rating: 1,
    isExact: false,
    isAcceptable: false,
    resultType: 'incorrect',
    title: 'Sai hoàn toàn ❌',
    feedback: `Từ bạn vừa nghe là "${rawExpected}". Đừng lo lắng! Hãy bấm biểu tượng loa để nghe lại 2-3 lần cho quen tai.`,
    charDiff: computeCharDiff(rawInput, rawExpected),
    expectedNormalized: rawExpected,
    studentNormalized: rawInput
  };
}
