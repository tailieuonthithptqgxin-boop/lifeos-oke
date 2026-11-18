// ==============================================================================
// LIFEOS PRONUNCIATION SERVICE — CORE SPEECH SYNTHESIS & AUDIO ENGINE
// ==============================================================================
// Authoritative speech synthesis, multi-language voice binding, text normalization,
// audio caching, debouncing, and regression-tested phonetic accuracy.

import { globalVolumeManager } from './globalVolumeManager';

export interface PronounceOptions {
  languageId?: string;       // e.g. 'en', 'ja', 'zh', 'ko', 'fr', 'de', 'es', 'vi'
  voiceCode?: string;        // e.g. 'en-US', 'en-GB', 'ja-JP', 'zh-CN', 'ko-KR'
  rate?: number;             // 0.8 - 1.0 (default 0.9)
  pitch?: number;            // default 1.0
  volume?: number;           // 0.0 - 1.0 (default 1.0)
  furigana?: string;         // Japanese phonetic kana
  pinyin?: string;           // Chinese phonetic pinyin
  phonetic?: string;         // IPA phonetic notation
  audioUrl?: string;         // Pre-recorded audio URL (if available)
  isSentence?: boolean;      // Whether input is a full example sentence
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export interface VoiceLanguageMeta {
  code: string;
  defaultLocale: string;
  altLocales: string[];
  nameVi: string;
  nameEn: string;
  flag: string;
}

export const SUPPORTED_VOICE_LANGUAGES: Record<string, VoiceLanguageMeta> = {
  en: { code: 'en', defaultLocale: 'en-US', altLocales: ['en-GB', 'en-AU', 'en-CA'], nameVi: 'Tiếng Anh', nameEn: 'English', flag: '🇬🇧' },
  ja: { code: 'ja', defaultLocale: 'ja-JP', altLocales: [], nameVi: 'Tiếng Nhật', nameEn: 'Japanese', flag: '🇯🇵' },
  zh: { code: 'zh', defaultLocale: 'zh-CN', altLocales: ['zh-TW', 'zh-HK'], nameVi: 'Tiếng Trung', nameEn: 'Chinese', flag: '🇨🇳' },
  ko: { code: 'ko', defaultLocale: 'ko-KR', altLocales: [], nameVi: 'Tiếng Hàn', nameEn: 'Korean', flag: '🇰🇷' },
  fr: { code: 'fr', defaultLocale: 'fr-FR', altLocales: ['fr-CA'], nameVi: 'Tiếng Pháp', nameEn: 'French', flag: '🇫🇷' },
  de: { code: 'de', defaultLocale: 'de-DE', altLocales: ['de-AT', 'de-CH'], nameVi: 'Tiếng Đức', nameEn: 'German', flag: '🇩🇪' },
  es: { code: 'es', defaultLocale: 'es-ES', altLocales: ['es-MX', 'es-US'], nameVi: 'Tiếng Tây Ban Nha', nameEn: 'Spanish', flag: '🇪🇸' },
  vi: { code: 'vi', defaultLocale: 'vi-VN', altLocales: [], nameVi: 'Tiếng Việt', nameEn: 'Vietnamese', flag: '🇻🇳' }
};

class PronunciationService {
  private voicesCache: SpeechSynthesisVoice[] = [];
  private isVoicesLoaded = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isCurrentlySpeaking = false;
  private activeWordKey: string | null = null;
  private lastSpeakTimestamp = 0;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    this.initVoices();
  }

  /**
   * Initializes and listens for browser speech synthesis voices
   */
  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          this.voicesCache = voices;
          this.isVoicesLoaded = true;
        }
      } catch (e) {
        console.warn('[PronunciationService] Error loading voices:', e);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Returns all available voices from the browser
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    if (this.voicesCache.length === 0) {
      this.voicesCache = window.speechSynthesis.getVoices();
    }
    return this.voicesCache;
  }

  /**
   * Resolves the best matching SpeechSynthesisVoice for a target language/locale
   */
  public findBestVoice(localeOrLang: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    const normalized = localeOrLang.toLowerCase().replace('_', '-');
    const langPrefix = normalized.split('-')[0];

    // Priority 1: Exact locale match (e.g. 'ja-jp' === 'ja-jp' or 'en-us' === 'en-us')
    let candidate = voices.find(v => v.lang.toLowerCase().replace('_', '-') === normalized);
    if (candidate) return candidate;

    // Priority 2: High quality / natural voice for the target language
    const langVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix));
    if (langVoices.length > 0) {
      // Prioritize Google, Natural, Microsoft, Apple premium voices
      const premium = langVoices.find(v => 
        /google|natural|premium|online|neural|siri/i.test(v.name)
      );
      if (premium) return premium;
      return langVoices[0];
    }

    return null;
  }

  /**
   * Normalizes and cleans text before sending to speech synthesis
   * Removes brackets, dictionary notes, POS tags, and ruby annotations
   */
  public cleanTextForSpeech(text: string, lang = 'en', isSentence = false): string {
    if (!text) return '';
    let cleaned = text.trim();

    // 1. Strip HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    // 2. Clean Japanese ruby syntax: {Kanji|Kana} -> Kana (e.g. {鞄|かばん} -> かばん)
    if (lang === 'ja' || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(cleaned)) {
      cleaned = cleaned.replace(/\{([^}|]+)\|([^}]+)\}/g, '$2');
    }

    if (!isSentence) {
      // 3. For single words, strip dictionary parenthetical annotations
      // e.g. "cellphone (also cellular phone) n." -> "cellphone"
      // e.g. "in addition (to)" -> "in addition to"
      // e.g. "take part (in)" -> "take part in"
      cleaned = cleaned.replace(/\s*\((?:especially\s+|also\s+)?(?:BrE|NAmE|also|abbr\.|cellular)[^)]*\)/gi, '');
      cleaned = cleaned.replace(/\s*\(\+[^)]*\)/g, ''); // (+to, for)
      cleaned = cleaned.replace(/\s*\(([^)]+)\)/g, ' $1'); // convert "(to)" to "to"

      // Strip POS markers if left over (handling non-word boundary with dot)
      cleaned = cleaned.replace(/\s*(?:\b(?:n|v|adj|adv|prep|pron|conj|det|prefix|suffix)\.|\b(?:n|v|adj|adv|prep|pron|conj|det|prefix|suffix)\b).*$/i, '');
      
      // Strip slashes from IPA notation if someone accidentally passed phonetic
      cleaned = cleaned.replace(/^\/|\/$/g, '');
      cleaned = cleaned.replace(/^\[|\]$/g, '');

      // Strip multiple spaces
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
    } else {
      // For sentences, keep natural punctuation but strip brackets/ruby
      cleaned = cleaned.replace(/\{([^}|]+)\|([^}]+)\}/g, '$2');
    }

    return cleaned;
  }

  /**
   * Resolves appropriate locale and text to speak for any vocabulary item
   */
  public resolveSpeechParams(item: any, options: PronounceOptions = {}): {
    textToSpeak: string;
    targetLocale: string;
    voice: SpeechSynthesisVoice | null;
  } {
    // 1. Determine language
    let lang = options.languageId || item?.languageId;
    if (!lang && options.voiceCode) {
      lang = options.voiceCode.split('-')[0].toLowerCase();
    }

    // Auto-detect language if not explicitly provided
    if (!lang) {
      const term = item?.term || (typeof item === 'string' ? item : '');
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(term)) {
        lang = 'ja';
      } else if (/[\u4E00-\u9FAF]/.test(term)) {
        // Japanese or Chinese: check if furigana/pinyin present
        if (item?.furigana || item?.hanViet) lang = 'ja';
        else if (item?.pinyin) lang = 'zh';
        else lang = 'zh';
      } else if (/[\uAC00-\uD7AF]/.test(term)) {
        lang = 'ko';
      } else {
        lang = 'en';
      }
    }

    // 2. Determine target locale
    let targetLocale = options.voiceCode;
    if (!targetLocale) {
      const meta = SUPPORTED_VOICE_LANGUAGES[lang];
      targetLocale = meta ? meta.defaultLocale : 'en-US';
    }

    // 3. Determine clean text to speak based on language characteristics
    let rawText = '';
    const isSentence = Boolean(options.isSentence);

    if (isSentence) {
      rawText = item?.exampleSentence || (typeof item === 'string' ? item : item?.term || '');
    } else if (lang === 'ja') {
      // For Japanese single words:
      // Authoritative source: verified Hiragana/Furigana provides 100% reading accuracy
      // without On'yomi/Kun'yomi homophone ambiguity!
      const furigana = options.furigana || item?.furigana;
      if (furigana && typeof furigana === 'string' && furigana.trim()) {
        rawText = furigana;
      } else {
        rawText = item?.term || (typeof item === 'string' ? item : '');
      }
    } else {
      rawText = item?.term || (typeof item === 'string' ? item : '');
    }

    const textToSpeak = this.cleanTextForSpeech(rawText, lang, isSentence);
    const voice = this.findBestVoice(targetLocale);

    return {
      textToSpeak,
      targetLocale,
      voice
    };
  }

  /**
   * Stops any currently active speech or audio
   */
  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    this.isCurrentlySpeaking = false;
    this.activeWordKey = null;
  }

  /**
   * Main entry point: Pronounces a word or vocabulary object accurately
   */
  public speak(
    input: any,
    options: PronounceOptions = {}
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      // Debounce: prevent rapid-click stutter
      const now = Date.now();
      if (now - this.lastSpeakTimestamp < 150) {
        resolve(false);
        return;
      }
      this.lastSpeakTimestamp = now;

      // Stop previous audio
      this.stop();

      // Check if item has pre-recorded audioUrl (e.g. R2 / CDN)
      const audioUrl = options.audioUrl || (typeof input === 'object' ? input?.audioUrl : null);
      if (audioUrl && typeof audioUrl === 'string' && audioUrl.startsWith('http')) {
        this.playAudioFile(audioUrl)
          .then(() => {
            options.onEnd?.();
            resolve(true);
          })
          .catch(() => {
            // Audio file failed -> Fallback to SpeechSynthesis
            this.speakWithTTS(input, options).then(resolve);
          });
        return;
      }

      // Default: High-fidelity SpeechSynthesis
      this.speakWithTTS(input, options).then(resolve);
    });
  }

  /**
   * Plays a pre-recorded audio file via HTML5 Audio with caching
   */
  private playAudioFile(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let audio = this.audioCache.get(url);
        if (!audio) {
          audio = new Audio(url);
          this.audioCache.set(url, audio);
        }
        this.currentAudio = audio;
        audio.currentTime = 0;
        audio.volume = Math.max(0, Math.min(1, globalVolumeManager.getEffectiveVoiceVolume() / 100));

        audio.onended = () => {
          this.currentAudio = null;
          this.isCurrentlySpeaking = false;
          resolve();
        };

        audio.onerror = (err) => {
          this.currentAudio = null;
          this.isCurrentlySpeaking = false;
          reject(err);
        };

        this.isCurrentlySpeaking = true;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(reject);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Executes Web Speech API SpeechSynthesis with strict voice binding
   */
  private speakWithTTS(input: any, options: PronounceOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('[PronunciationService] SpeechSynthesis not supported in this browser environment.');
        options.onError?.(new Error('SpeechSynthesis not supported'));
        resolve(false);
        return;
      }

      const { textToSpeak, targetLocale, voice } = this.resolveSpeechParams(input, options);

      if (!textToSpeak) {
        resolve(false);
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = targetLocale;
        utterance.rate = options.rate ?? 0.9;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume !== undefined 
          ? options.volume 
          : Math.max(0, Math.min(1, globalVolumeManager.getEffectiveVoiceVolume() / 100));

        // CRITICAL FIX: Explicitly bind the matched SpeechSynthesisVoice object!
        // This prevents the OS from defaulting to English or Vietnamese when speaking Japanese, Chinese, etc.
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          this.isCurrentlySpeaking = true;
          this.activeWordKey = textToSpeak;
          options.onStart?.();
        };

        utterance.onend = () => {
          this.isCurrentlySpeaking = false;
          this.activeWordKey = null;
          this.currentUtterance = null;
          options.onEnd?.();
          resolve(true);
        };

        utterance.onerror = (e) => {
          this.isCurrentlySpeaking = false;
          this.activeWordKey = null;
          this.currentUtterance = null;
          options.onError?.(e);
          resolve(false);
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('[PronunciationService] Speech error:', err);
        options.onError?.(err);
        resolve(false);
      }
    });
  }

  /**
   * Helper: Speaks an example sentence in its native language
   */
  public speakSentence(sentence: string, lang = 'en', voiceCode?: string): Promise<boolean> {
    return this.speak(sentence, {
      languageId: lang,
      voiceCode,
      isSentence: true
    });
  }

  /**
   * Returns current speaking state and active word
   */
  public getStatus() {
    return {
      isSpeaking: this.isCurrentlySpeaking,
      activeWord: this.activeWordKey,
      totalVoices: this.voicesCache.length,
      voicesLoaded: this.isVoicesLoaded
    };
  }
}

// Global Singleton Instance
export const pronunciationService = new PronunciationService();

// Standalone backward-compatible helper for legacy components
export function speakWord(
  input: any, 
  voiceCode: string = 'en-US',
  options: PronounceOptions = {}
) {
  return pronunciationService.speak(input, {
    voiceCode,
    ...options
  });
}
