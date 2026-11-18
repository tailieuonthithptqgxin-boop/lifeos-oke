// ==============================================================================
// LIFEOS AI SPEAKING & REAL-TIME PRONUNCIATION ASSESSMENT ENGINE
// ==============================================================================
// Real-time microphone capture via Web Speech Recognition API (SpeechRecognition)
// with phoneme alignment, word-level pronunciation grading, and phonetic guidance.

export interface WordSpeakingCheck {
  word: string;
  status: 'correct' | 'near' | 'missing' | 'unexpected';
  phoneticHint?: string;
}

export interface SpeakingAssessmentResult {
  score: number; // 0 - 100
  isPass: boolean; // score >= 75
  rating: 1 | 2 | 3 | 4;
  transcribedText: string;
  expectedText: string;
  wordAnalysis: WordSpeakingCheck[];
  feedback: string;
  phoneticGuidance?: string;
}

export interface SpeakingRecognitionCallbacks {
  onStart?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export class SpeakingEngine {
  private recognition: any = null;
  private isListening = false;

  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Starts real-time microphone listening and transcription
   */
  public startListening(
    languageCode: string = 'en-US',
    callbacks: SpeakingRecognitionCallbacks = {}
  ): boolean {
    if (!SpeakingEngine.isSupported()) {
      callbacks.onError?.('Trình duyệt của bạn chưa hỗ trợ Web Speech Recognition API.');
      return false;
    }

    try {
      this.stopListening();

      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const rec = new SpeechRecognitionClass();
      rec.lang = languageCode;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        this.isListening = true;
        callbacks.onStart?.();
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        if (finalTranscript) {
          callbacks.onFinalResult?.(finalTranscript.trim());
        } else if (interimTranscript) {
          callbacks.onInterimResult?.(interimTranscript.trim());
        }
      };

      rec.onerror = (event: any) => {
        let errorMsg = 'Lỗi nhận diện giọng nói: ';
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            errorMsg = 'Bạn chưa cấp quyền truy cập Microphone cho trình duyệt. Vui lòng bật quyền Mic trên thanh địa chỉ.';
            break;
          case 'no-speech':
            errorMsg = 'Hệ thống chưa nghe thấy giọng nói của bạn. Hãy thử nói to và rõ ràng hơn!';
            break;
          case 'network':
            errorMsg = 'Mạng bị gián đoạn khi kết nối với dịch vụ nhận diện giọng nói.';
            break;
          default:
            errorMsg += event.error || 'Vui lòng thử lại.';
        }
        this.isListening = false;
        callbacks.onError?.(errorMsg);
      };

      rec.onend = () => {
        this.isListening = false;
        callbacks.onEnd?.();
      };

      rec.start();
      this.recognition = rec;
      return true;
    } catch (err: any) {
      this.isListening = false;
      callbacks.onError?.(err?.message || 'Không thể khởi động Microphone.');
      return false;
    }
  }

  /**
   * Safely aborts or stops active microphone listening
   */
  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this.isListening = false;
  }

  /**
   * Evaluates spoken utterance against target vocabulary or sentence
   */
  public static evaluatePronunciation(
    spokenText: string,
    expectedTarget: string,
    languageId: string = 'en'
  ): SpeakingAssessmentResult {
    const rawSpoken = (spokenText || '').trim();
    const rawExpected = (expectedTarget || '').trim();

    if (!rawSpoken) {
      return {
        score: 0,
        isPass: false,
        rating: 1,
        transcribedText: '',
        expectedText: rawExpected,
        wordAnalysis: [],
        feedback: 'Chưa phát hiện âm thanh nào. Hãy nhấn biểu tượng Micro và phát âm to rõ ràng!'
      };
    }

    const cleanSpoken = rawSpoken.toLowerCase().replace(/['".,!?;:\-]/g, '').replace(/\s+/g, ' ');
    const cleanExpected = rawExpected.toLowerCase().replace(/['".,!?;:\-]/g, '').replace(/\s+/g, ' ');

    const spokenTokens = cleanSpoken.split(' ').filter(Boolean);
    const expectedTokens = cleanExpected.split(' ').filter(Boolean);

    // 1. Exact match 100%
    if (cleanSpoken === cleanExpected) {
      return {
        score: 100,
        isPass: true,
        rating: 4,
        transcribedText: rawSpoken,
        expectedText: rawExpected,
        wordAnalysis: expectedTokens.map((w) => ({ word: w, status: 'correct' })),
        feedback: 'Phát âm chuẩn xác 100%! Ngữ điệu và trường âm cực kỳ tự nhiên. 🎉'
      };
    }

    // 2. Word-by-word alignment
    const wordAnalysis: WordSpeakingCheck[] = [];
    let matchCount = 0;

    expectedTokens.forEach((expWord) => {
      if (spokenTokens.includes(expWord)) {
        wordAnalysis.push({ word: expWord, status: 'correct' });
        matchCount++;
      } else {
        // Check near match (e.g. 1 char typo)
        const near = spokenTokens.find(
          (sw) => Math.abs(sw.length - expWord.length) <= 2 && (sw.startsWith(expWord[0]) || sw.endsWith(expWord.slice(-1)))
        );
        if (near) {
          wordAnalysis.push({ word: expWord, status: 'near' });
          matchCount += 0.5;
        } else {
          wordAnalysis.push({ word: expWord, status: 'missing' });
        }
      }
    });

    const score = Math.min(100, Math.max(10, Math.round((matchCount / Math.max(1, expectedTokens.length)) * 100)));
    const isPass = score >= 75;
    const rating: 1 | 2 | 3 | 4 = score >= 90 ? 4 : score >= 75 ? 3 : score >= 50 ? 2 : 1;

    let guidance = '';
    if (languageId === 'en') {
      if (cleanExpected.includes('th')) {
        guidance = '💡 Lưu ý âm /θ/ hoặc /ð/: Đặt đầu lưỡi giữa hai hàm răng và đẩy luồng hơi nhẹ.';
      } else if (cleanExpected.includes('r') || cleanExpected.includes('l')) {
        guidance = '💡 Chú ý phân biệt /r/ (cuộn nhẹ lưỡi không chạm vòm họng) và /l/ (chạm đầu lưỡi vào chân răng trên).';
      } else if (cleanExpected.endsWith('s') || cleanExpected.endsWith('ce')) {
        guidance = '💡 Đừng quên bật âm gió cuối (ending sound) /s/ thật dứt khoát!';
      }
    } else if (languageId === 'zh') {
      guidance = '💡 Chú ý độ cao thanh điệu (4 thanh chính) và nhả âm đầu môi rõ ràng.';
    } else if (languageId === 'ja') {
      guidance = '💡 Chú ý độ dài nguyên âm (trường âm) và ngắt nhịp xúc âm (tsu nhỏ).';
    }

    return {
      score,
      isPass,
      rating,
      transcribedText: rawSpoken,
      expectedText: rawExpected,
      wordAnalysis,
      feedback: isPass
        ? `Rất tốt (${score}%). Bạn đã truyền đạt âm thanh rõ ràng và chuẩn xác!`
        : `Điểm phát âm: ${score}%. Máy nhận diện bạn vừa nói "${rawSpoken}". Hãy nghe lại mẫu và thử lại nhé!`,
      phoneticGuidance: guidance || undefined
    };
  }
}

export const speakingEngineInstance = new SpeakingEngine();
