import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Headphones,
  Brain,
  HelpCircle,
  Star,
  Clock,
  Award,
  AlertCircle,
  X,
  Flame,
  ArrowRight,
  Compass,
  Check,
  ChevronRight,
  ChevronLeft,
  VolumeX,
  CloudRain,
  Radio,
  Eye,
  Bookmark,
  Zap,
  Play,
  Music,
  Mic,
  MicOff,
  Volume1,
  RefreshCw,
  CheckCircle,
  Sliders,
  Type,
  Shuffle,
  RotateCw,
  Lightbulb
} from 'lucide-react';
import { speakWord, VocabWord } from '../../lib/vocabEngine';
import { fisherYatesShuffle, ShuffleMode } from '../../lib/smartShuffleEngine';
import { isEquivalentAnswer } from '../../lib/vocabVerificationEngine';
import { soundEngine } from '../../lib/soundEngine';
import { LiveMascotCharacter } from '../companion/LiveMascotCharacter';
import { useAppStore } from '../../lib/store';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { YouTubeFocusPlayer } from '../YouTubeFocusPlayer';
import { recordUserActivity } from '../../lib/globalUserSync';
import {
  evaluateListeningAnswer,
  ListeningEvaluation,
  ListeningExerciseMode,
  CharDiffItem
} from '../../lib/listeningEngine';
import { 
  enrichVocabWord,
  getEnrichedExample, 
  getEnrichedTranslation, 
  getEnrichedExplanation, 
  getEnrichedCollocations, 
  getEnrichedMnemonic, 
  formatPartOfSpeech 
} from '../../lib/vocabEnricher';

export type FocusPracticeMode =
  | 'flashcard'
  | 'flashcard_reverse'
  | 'listening'
  | 'typing'
  | 'quiz';

// ============================================================================
// 1. DATA NORMALIZER & REGEX UTILITIES (Chống sập 100% dữ liệu thiếu trường & ký tự đặc biệt)
// ============================================================================

export function escapeRegExp(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function safeBlankContextSentence(sentence: string, wordTerm: string): string {
  if (!sentence || typeof sentence !== 'string') return '';
  const cleanTerm = (wordTerm || '').trim();
  if (!cleanTerm) return sentence;
  try {
    const escaped = escapeRegExp(cleanTerm);
    return sentence.replace(new RegExp(escaped, 'gi'), '______');
  } catch {
    return sentence.split(cleanTerm).join('______');
  }
}

export function getMaskedWordHint(word: string, hintCount: number = 0): string {
  if (!word || typeof word !== 'string') return '';
  const trimmed = word.trim();
  const chars = trimmed.split('');
  return chars.map((ch, idx) => {
    if (ch === ' ' || ch === '-' || ch === "'") return ch;
    // Always reveal first letter (uppercase)
    if (idx === 0) return ch.toUpperCase();
    // Reveal last letter if word has at least 4 letters
    if (idx === chars.length - 1 && chars.length >= 4) return ch.toLowerCase();
    // Reveal progressive letters based on hintCount
    if (idx <= hintCount) return ch.toLowerCase();
    return '_';
  }).join(' ');
}

export function getWordTerm(w?: any): string {
  if (!w) return '';
  return String(w.term || w.word || '').trim();
}

export function getWordPhonetic(w?: any): string {
  if (!w) return '';
  return String(
    w.phonetic ||
    w.ipa ||
    w.pinyin ||
    w.romaji ||
    (w.furigana ? `${w.furigana} (${w.romaji || ''})` : '') ||
    ''
  ).trim();
}

export function getWordMeaning(w?: any): string {
  if (!w) return '';
  return String(w.meaning || w.definition || w.explanation || '').trim();
}

export function getWordPartOfSpeech(w?: any): string {
  if (!w) return '';
  return String(w.partOfSpeech || w.pos || '').trim();
}

export function getWordExample(w?: any): string {
  if (!w) return '';
  const direct = String(w.exampleSentence || w.example || '').trim();
  if (direct) return direct;
  return getEnrichedExample(w.term || w.word || '', w.partOfSpeech || w.pos || '', w.meaning || '');
}

export function getWordExampleTranslation(w?: any): string {
  if (!w) return '';
  const direct = String(w.exampleTranslation || '').trim();
  if (direct) return direct;
  return getEnrichedTranslation(w.term || w.word || '', w.partOfSpeech || w.pos || '', w.meaning || '');
}

export function getWordExplanation(w?: any): string {
  if (!w) return '';
  const direct = String(w.explanation || w.notes || '').trim();
  if (direct) return direct;
  return getEnrichedExplanation(w.term || w.word || '', w.partOfSpeech || w.pos || '', w.meaning || '');
}

export function getWordMnemonic(w?: any): string {
  if (!w) return '';
  const direct = String(w.mnemonic || '').trim();
  if (direct) return direct;
  return getEnrichedMnemonic(w.term || w.word || '', w.partOfSpeech || w.pos || '', w.meaning || '');
}

export function getWordSynonyms(w?: any): string[] {
  if (!w) return [];
  if (Array.isArray(w.synonyms) && w.synonyms.length > 0) return w.synonyms.filter(Boolean).map(String);
  if (Array.isArray(w.collocations) && w.collocations.length > 0) return w.collocations.filter(Boolean).map(String);
  return getEnrichedCollocations(w.term || w.word || '', w.partOfSpeech || w.pos || '', w.meaning || '');
}

/**
 * Chuẩn hóa triệt để mọi object từ vựng trước khi đưa vào state luyện tập.
 * Đảm bảo không bao giờ bị undefined ở bất kỳ trường nào khi truy cập.
 */
export function normalizeWord(raw: any, fallbackId: string = 'word'): VocabWord {
  if (!raw || typeof raw !== 'object') {
    return {
      id: fallbackId,
      term: 'Từ vựng',
      word: 'Từ vựng',
      meaning: 'Chưa có định nghĩa',
      definition: 'Chưa có định nghĩa',
      phonetic: '',
      partOfSpeech: 'vocab',
      exampleSentence: '',
      exampleTranslation: '',
      explanation: '',
      mnemonic: '',
      synonyms: [],
      collocations: [],
      audioUrl: '',
      level: 'A1',
      languageId: 'en',
      collectionId: 'default',
      state: 'new',
      repetitionCount: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      nextReviewAt: new Date().toISOString().split('T')[0],
      reviewLogs: [],
      lapses: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
  }

  const term = String(raw.term ?? raw.word ?? '').trim() || 'Từ vựng';
  const meaning = String(raw.meaning ?? raw.definition ?? raw.explanation ?? '').trim() || 'Chưa có định nghĩa';
  const phonetic = String(
    raw.phonetic ??
    raw.ipa ??
    raw.pinyin ??
    raw.romaji ??
    (raw.furigana ? `${raw.furigana} (${raw.romaji ?? ''})` : '') ??
    ''
  ).trim();
  const partOfSpeech = String(raw.partOfSpeech ?? raw.pos ?? '').trim() || 'vocab';

  const enriched = enrichVocabWord(term, partOfSpeech, meaning);
  const exampleSentence = String(raw.exampleSentence ?? raw.example ?? enriched.exampleSentence).trim();
  const exampleTranslation = String(raw.exampleTranslation ?? enriched.exampleTranslation).trim();
  const explanation = String(raw.explanation ?? raw.notes ?? enriched.explanation).trim();
  const mnemonic = String(raw.mnemonic ?? enriched.mnemonic).trim();
  const synonyms = (Array.isArray(raw.synonyms) && raw.synonyms.length > 0)
    ? raw.synonyms.filter(Boolean).map(String)
    : (Array.isArray(raw.collocations) && raw.collocations.length > 0)
    ? raw.collocations.filter(Boolean).map(String)
    : enriched.collocations;

  return {
    ...raw,
    id: String(raw.id ?? fallbackId),
    term,
    word: term,
    meaning,
    definition: meaning,
    phonetic,
    partOfSpeech,
    exampleSentence,
    exampleTranslation,
    explanation,
    mnemonic,
    synonyms,
    languageId: String(raw.languageId ?? 'en'),
    collectionId: String(raw.collectionId ?? 'default'),
    state: raw.state ?? 'new',
    repetitionCount: Number(raw.repetitionCount) || 0,
    easeFactor: Number(raw.easeFactor) || 2.5,
    intervalDays: Number(raw.intervalDays) || 0,
    nextReviewAt: raw.nextReviewAt ? String(raw.nextReviewAt).split('T')[0] : new Date().toISOString().split('T')[0],
    reviewLogs: Array.isArray(raw.reviewLogs) ? raw.reviewLogs : [],
    lapses: Number(raw.lapses) || 0,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

// ============================================================================
// 2. SINGLETON WEB AUDIO API SYNTHESIZER (Chống tràn AudioContext & InvalidStateError)
// ============================================================================
class FocusChamberAudioEngine {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private isAmbientPlaying = false;
  public currentAmbient: 'rain' | 'brown' | 'off' = 'off';

  private initCtx() {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Mechanical Keyboard "Thock" Sound Synthesis
  playThock() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Bottom thock: low frequency sine drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.05);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);

      // Top snap: subtle noise burst
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.015);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.1, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.015);
    } catch {
      // Audio policy safe
    }
  }

  // Harmonic Chime on Success/Streak
  playChime(isCombo: boolean = false) {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const baseFreq = isCombo ? 587.33 : 523.25; // D5 or C5

      [baseFreq, baseFreq * 1.25, baseFreq * 1.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);

        gain.gain.setValueAtTime(0.001, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.18, t + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.04 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.35);
      });
    } catch {
      // Audio policy safe
    }
  }

  // Soft Miss Sound on Incorrect
  playMiss() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch {
      // Audio policy safe
    }
  }

  // Procedural Ambient Generator: Rain or Brown Noise
  setAmbient(type: 'rain' | 'brown' | 'off') {
    try {
      this.initCtx();
      if (!this.ctx) return;

      this.stopAmbientSourceOnly();
      this.currentAmbient = type;
      if (type === 'off') return;

      const sampleRate = this.ctx.sampleRate;
      const bufferLength = sampleRate * 5; // 5 seconds looped buffer
      const buffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
      const data = buffer.getChannelData(0);

      if (type === 'brown') {
        let lastOut = 0.0;
        for (let i = 0; i < bufferLength; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
      } else {
        // Rain: Pinkish noise with subtle high crackles
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferLength; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, this.ctx.currentTime + 1.5);

      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();

      this.ambientSource = source;
      this.ambientGain = gain;
      this.isAmbientPlaying = true;
    } catch {
      // Audio policy safe
    }
  }

  private stopAmbientSourceOnly() {
    if (this.ambientSource && this.isAmbientPlaying) {
      try {
        this.ambientSource.stop();
      } catch {}
      try {
        this.ambientSource.disconnect();
      } catch {}
      this.ambientSource = null;
      this.isAmbientPlaying = false;
    }
  }

  stopAll() {
    try {
      this.stopAmbientSourceOnly();
      this.currentAmbient = 'off';
    } catch {}
  }
}

const chamberAudio = new FocusChamberAudioEngine();

// ============================================================================
// 3. CANVAS 3D PARTICLES & DUST FIELD (Safe Memory & Cleanup)
// ============================================================================
interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  vx: number;
  vy: number;
}

const FocusSpatialCanvas: React.FC<{ combo: number }> = ({ combo }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isDestroyed = false;
    let width = (canvas.width = window.innerWidth || 800);
    let height = (canvas.height = window.innerHeight || 600);

    const handleResize = () => {
      if (isDestroyed || !canvasRef.current) return;
      width = canvasRef.current.width = window.innerWidth || 800;
      height = canvasRef.current.height = window.innerHeight || 600;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (isDestroyed) return;
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.04;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.04;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Seed particles
    const particleCount = 65;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 2 + 0.5,
        size: Math.random() * 1.8 + 0.5,
        alpha: Math.random() * 0.5 + 0.15,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.35 - 0.1
      });
    }

    const render = () => {
      if (isDestroyed || !canvasRef.current) return;

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Central Spotlight Beam
      const cx = width / 2 + mouseRef.current.x * 2;
      const cy = height * 0.38 + mouseRef.current.y * 2;
      const radGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(width, height) * 0.7);

      const auraIntensity = Math.min(0.28, 0.12 + (combo >= 3 ? combo * 0.02 : 0));
      radGrad.addColorStop(0, `rgba(16, 185, 129, ${auraIntensity})`);
      radGrad.addColorStop(0.5, 'rgba(5, 5, 7, 0.45)');
      radGrad.addColorStop(1, 'rgba(5, 5, 7, 0.98)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);

      // Render Floating Dust Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + mouseRef.current.x * 0.02 * p.z;
        p.y += p.vy;

        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${p.alpha * (combo >= 3 ? 1.4 : 1)})`;
        ctx.shadowBlur = combo >= 5 ? 12 : 6;
        ctx.shadowColor = '#10B981';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isDestroyed = true;
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [combo]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

// ============================================================================
// 4. RICH SAMPLE VOCABULARY FALLBACK DATA
// ============================================================================
export const RICH_SAMPLE_VOCAB: VocabWord[] = [
  {
    id: 'sample-1',
    term: 'resilience',
    word: 'resilience',
    phonetic: '/rɪˈzɪl.jəns/',
    ipa: '/rɪˈzɪl.jəns/',
    partOfSpeech: 'noun',
    pos: 'n.',
    meaning: 'Khả năng phục hồi, kiên cường vượt qua nghịch cảnh',
    definition: 'Khả năng phục hồi, kiên cường vượt qua nghịch cảnh',
    explanation: 'Sức mạnh tinh thần hoặc thể chất giúp một người nhanh chóng lấy lại cân bằng sau thất bại hoặc áp lực lớn.',
    exampleSentence: 'True resilience is not the absence of difficulty, but the courage to rise each time you fall.',
    example: 'True resilience is not the absence of difficulty, but the courage to rise each time you fall.',
    exampleTranslation: 'Sự kiên cường thực sự không phải là không gặp khó khăn, mà là lòng dũng cảm đứng lên sau mỗi lần vấp ngã.',
    synonyms: ['fortitude', 'toughness', 'tenacity', 'grit'],
    mnemonic: '💡 Mẹo nhớ: Re (lại) + Silience (nghe giống Silence - tĩnh lặng) → Giữ tâm tĩnh lặng để đứng dậy trở lại.',
    level: 'B2',
    audioUrl: '',
    languageId: 'en',
    collectionId: 'system_3000',
    state: 'learning',
    repetitionCount: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: new Date().toISOString().split('T')[0],
    reviewLogs: [],
    lapses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-2',
    term: 'serendipity',
    word: 'serendipity',
    phonetic: '/ˌser.ənˈdɪp.ə.ti/',
    ipa: '/ˌser.ənˈdɪp.ə.ti/',
    partOfSpeech: 'noun',
    pos: 'n.',
    meaning: 'Sự tình cờ may mắn, nhân duyên bất ngờ đầy thú vị',
    definition: 'Sự tình cờ may mắn, nhân duyên bất ngờ đầy thú vị',
    explanation: 'Việc vô tình phát hiện ra những điều tốt đẹp, giá trị một cách tình cờ mà không hề có chủ đích tìm kiếm trước.',
    exampleSentence: 'Finding this bookstore was pure serendipity on a rainy afternoon.',
    example: 'Finding this bookstore was pure serendipity on a rainy afternoon.',
    exampleTranslation: 'Tìm thấy tiệm sách này là một sự tình cờ may mắn tuyệt vời trong một buổi chiều mưa.',
    synonyms: ['fluke', 'happy chance', 'providence', 'blessing'],
    mnemonic: '💡 Mẹo nhớ: Seren (Serene - thanh bình) + Dip (nhúng vào) → Nhúng vào điều thanh bình may mắn một cách tình cờ.',
    level: 'C1',
    audioUrl: '',
    languageId: 'en',
    collectionId: 'system_3000',
    state: 'new',
    repetitionCount: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: new Date().toISOString().split('T')[0],
    reviewLogs: [],
    lapses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-3',
    term: 'ubiquitous',
    word: 'ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    ipa: '/juːˈbɪk.wɪ.təs/',
    partOfSpeech: 'adjective',
    pos: 'adj.',
    meaning: 'Có mặt ở khắp mọi nơi, phổ biến rộng rãi',
    definition: 'Có mặt ở khắp mọi nơi, phổ biến rộng rãi',
    explanation: 'Tồn tại hoặc xuất hiện tràn ngập ở bất kỳ ngóc ngách nào trong đời sống hiện đại.',
    exampleSentence: 'Smartphones have become ubiquitous in modern daily life across all generations.',
    example: 'Smartphones have become ubiquitous in modern daily life across all generations.',
    exampleTranslation: 'Điện thoại thông minh đã trở nên phổ biến ở khắp mọi nơi trong đời sống hiện đại.',
    synonyms: ['omnipresent', 'pervasive', 'universal'],
    mnemonic: '💡 Mẹo nhớ: U-bi (U ở đâu cũng bị) → Ở đâu cũng thấy, đâu đâu cũng gặp.',
    level: 'C1',
    audioUrl: '',
    languageId: 'en',
    collectionId: 'system_3000',
    state: 'learning',
    repetitionCount: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: new Date().toISOString().split('T')[0],
    reviewLogs: [],
    lapses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-4',
    term: 'meticulous',
    word: 'meticulous',
    phonetic: '/məˈtɪk.jə.ləs/',
    ipa: '/məˈtɪk.jə.ləs/',
    partOfSpeech: 'adjective',
    pos: 'adj.',
    meaning: 'Tỉ mỉ, cẩn thận kỹ lưỡng đến từng chi tiết nhỏ',
    definition: 'Tỉ mỉ, cẩn thận kỹ lưỡng đến từng chi tiết nhỏ',
    explanation: 'Rất chú ý và quan tâm sâu sắc tới từng chi tiết chính xác nhất, không bao giờ qua loa.',
    exampleSentence: 'Her meticulous attention to code quality ensured zero production defects.',
    example: 'Her meticulous attention to code quality ensured zero production defects.',
    exampleTranslation: 'Sự chú ý tỉ mỉ của cô ấy đến chất lượng mã nguồn đã đảm bảo không xảy ra lỗi vận hành.',
    synonyms: ['scrupulous', 'painstaking', 'thorough', 'diligent'],
    mnemonic: '💡 Mẹo nhớ: Me-ti-cu (Mê tỉ mỉ từng chi tiết cũ) → Cẩn trọng vô cùng.',
    level: 'C1',
    audioUrl: '',
    languageId: 'en',
    collectionId: 'system_3000',
    state: 'new',
    repetitionCount: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: new Date().toISOString().split('T')[0],
    reviewLogs: [],
    lapses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-5',
    term: 'ephemeral',
    word: 'ephemeral',
    phonetic: '/ɪˈfem.ər.əl/',
    ipa: '/ɪˈfem.ər.əl/',
    partOfSpeech: 'adjective',
    pos: 'adj.',
    meaning: 'Phù du, ngắn ngủi, thoáng qua trong chốc lát',
    definition: 'Phù du, ngắn ngủi, thoáng qua trong chốc lát',
    explanation: 'Chỉ kéo dài trong một khoảng thời gian rất ngắn rồi biến mất.',
    exampleSentence: 'The cherry blossom beauty is breathtaking yet inherently ephemeral.',
    example: 'The cherry blossom beauty is breathtaking yet inherently ephemeral.',
    exampleTranslation: 'Vẻ đẹp hoa anh đào làm say đắm lòng người nhưng bản chất lại rất ngắn ngủi phù du.',
    synonyms: ['fleeting', 'transient', 'evanescent'],
    mnemonic: '💡 Mẹo nhớ: Ê-phê (Phê một tí rồi hết) → Thoáng qua, phù du.',
    level: 'C2',
    audioUrl: '',
    languageId: 'en',
    collectionId: 'system_3000',
    state: 'learning',
    repetitionCount: 3,
    easeFactor: 2.5,
    intervalDays: 2,
    nextReviewAt: new Date().toISOString().split('T')[0],
    reviewLogs: [],
    lapses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ============================================================================
// 5. MAIN PROPS INTERFACE
// ============================================================================
export interface StudySessionScreenProps {
  activeLang: any;
  words: any[];
  currentIndex: number;
  mode: string;
  shuffleMode?: ShuffleMode;
  onShuffleModeChange?: (mode: ShuffleMode) => void;
  onReshuffleSession?: (mode?: ShuffleMode) => void;
  isRevealed: boolean;
  isCompleted: boolean;
  stats: { reviewed: number; passed: number; again: number };
  quizSelectedOption: string | null;
  spellingInput: string;
  spellingChecked: boolean;
  distractorPool?: any[];
  durationMinutes?: number;
  onReveal: () => void;
  onRate: (rating: 1 | 2 | 3 | 4) => void;
  onNextCard?: () => void;
  onPrevCard?: () => void;
  onSelectQuizOption?: (option: string) => void;
  onSpellingChange?: (val: string) => void;
  onCheckSpelling?: () => void;
  onExitSession: () => void;
  onRestartSession: () => void;
  onToggleFavorite?: (wordId: string) => void;
  onToggleDifficult?: (wordId: string) => void;
  onSkipWord?: () => void;
  onRemoveWordFromSession?: (wordId: string) => void;
  onReviewMistakes?: (mistakeWords: VocabWord[]) => void;
  onEndSessionEarly?: () => void;
}

export const StudySessionScreen: React.FC<StudySessionScreenProps> = ({
  activeLang,
  words: incomingWords = [],
  currentIndex: incomingCurrentIndex = 0,
  mode = 'flashcard',
  shuffleMode: incomingShuffleMode = 'smart_review',
  onShuffleModeChange,
  onReshuffleSession,
  isRevealed: incomingIsRevealed = false,
  isCompleted: incomingIsCompleted = false,
  stats: incomingStats,
  quizSelectedOption: incomingQuizOption = null,
  spellingInput: incomingSpellingInput = '',
  spellingChecked: incomingSpellingChecked = false,
  distractorPool,
  durationMinutes = 15,
  onReveal,
  onRate,
  onNextCard,
  onPrevCard,
  onSelectQuizOption,
  onSpellingChange,
  onCheckSpelling,
  onExitSession,
  onRestartSession,
  onToggleFavorite,
  onReviewMistakes
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  // Smart Shuffle state tracking
  const [activeShuffleMode, setActiveShuffleMode] = useState<ShuffleMode>(incomingShuffleMode);
  const [showShuffleMenu, setShowShuffleMenu] = useState(false);

  useEffect(() => {
    if (incomingShuffleMode) {
      setActiveShuffleMode(incomingShuffleMode);
    }
  }, [incomingShuffleMode]);

  // 1. Safe word deck fallback & normalization (bảo vệ tuyệt đối chống undefined)
  const sessionWords: VocabWord[] = useMemo(() => {
    const rawList = Array.isArray(incomingWords) && incomingWords.length > 0 ? incomingWords : RICH_SAMPLE_VOCAB;
    return rawList.map((w, idx) => normalizeWord(w, `session-word-${idx}`));
  }, [incomingWords]);

  // Lock body scroll in focus chamber
  useBodyScrollLock(true);

  // Session state tracking
  const [internalIndex, setInternalIndex] = useState(incomingCurrentIndex);
  const [internalRevealed, setInternalRevealed] = useState(incomingIsRevealed);
  const [internalCompleted, setInternalCompleted] = useState(incomingIsCompleted);
  const [activePracticeMode, setActivePracticeMode] = useState<FocusPracticeMode>(() => {
    if (mode === 'listening') return 'listening';
    if (mode === 'flashcard_reverse') return 'flashcard_reverse';
    if (mode === 'spelling') return 'typing';
    if (mode === 'quiz') return 'quiz';
    return 'flashcard';
  });

  // Transition locking & Timer Refs (Chống double-click & lệch bounds)
  const isTransitioningRef = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const keycapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Bio-feedback streak & stats
  const [streakCombo, setStreakCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [reviewedWords, setReviewedWords] = useState<Array<{ word: VocabWord; rating: number }>>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [activeKeycap, setActiveKeycap] = useState<string | null>(null);

  // Active recall typing state
  const [typingInput, setTypingInput] = useState(incomingSpellingInput);
  const [typingFeedback, setTypingFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [typingShowAnswer, setTypingShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [typingHintLetters, setTypingHintLetters] = useState(0);

  // Quiz Mode Evaluation state (Báo đúng / sai rõ ràng kèm đáp án chuẩn)
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isFastQuizReflex, setIsFastQuizReflex] = useState<boolean>(false);
  const quizCardStartTimeRef = useRef<number>(Date.now());

  // Touch Swipe Gesture Refs for mobile navigation
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Audio-First Listening state (Không bao giờ lộ đáp án trước khi kiểm tra)
  const [listeningInput, setListeningInput] = useState('');
  const [listeningEval, setListeningEval] = useState<ListeningEvaluation | null>(null);
  const [isListeningEvaluated, setIsListeningEvaluated] = useState(false);
  const [listeningSubMode, setListeningSubMode] = useState<ListeningExerciseMode>('listen_and_type');
  const [showListeningHint, setShowListeningHint] = useState(false);
  const [selectedQuizChoice, setSelectedQuizChoice] = useState<string | null>(null);

  // Exit dialog, audio ambient & YouTube music player state
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [ambientMode, setAmbientMode] = useState<'rain' | 'brown' | 'off'>('off');
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 3D Card Tilt state
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listeningInputRef = useRef<HTMLInputElement>(null);

  // Safe Current Word and bounds protection
  const currentWord: VocabWord | null = useMemo(() => {
    if (!sessionWords || sessionWords.length === 0) return null;
    const safeIdx = Math.max(0, Math.min(internalIndex, sessionWords.length - 1));
    return sessionWords[safeIdx] ?? sessionWords[0] ?? null;
  }, [sessionWords, internalIndex]);

  // Sync state from props if controlled externally
  useEffect(() => {
    setInternalIndex(incomingCurrentIndex);
    setInternalRevealed(incomingIsRevealed);
  }, [incomingCurrentIndex, incomingIsRevealed]);

  useEffect(() => {
    setInternalCompleted(incomingIsCompleted);
  }, [incomingIsCompleted]);

  // Dọn dẹp toàn bộ timers & audio khi unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
      if (keycapTimerRef.current) clearTimeout(keycapTimerRef.current);
      chamberAudio.stopAll();
    };
  }, []);

  // In-session timer
  useEffect(() => {
    if (internalCompleted) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [internalCompleted]);

  // Synchronize completed study session with global user activity & streak
  const hasRecordedActivityRef = useRef(false);
  useEffect(() => {
    if (internalCompleted && !hasRecordedActivityRef.current) {
      hasRecordedActivityRef.current = true;
      const studyMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      recordUserActivity('vocab', studyMinutes);
    }
  }, [internalCompleted, elapsedSeconds]);

  // Safe normalized fields with fallbacks
  const term = currentWord ? getWordTerm(currentWord) : '';
  const phonetic = currentWord ? getWordPhonetic(currentWord) : '';
  const meaning = currentWord ? getWordMeaning(currentWord) : '';
  const partOfSpeech = currentWord ? getWordPartOfSpeech(currentWord) : '';
  const exampleSentence = currentWord ? getWordExample(currentWord) : '';
  const exampleTranslation = currentWord ? getWordExampleTranslation(currentWord) : '';
  const explanation = currentWord ? getWordExplanation(currentWord) : '';
  const mnemonic = currentWord ? getWordMnemonic(currentWord) : '';
  const synonyms = currentWord ? getWordSynonyms(currentWord) : [];
  const furigana = (currentWord as any)?.furigana || '';
  const romaji = (currentWord as any)?.romaji || '';
  const pinyin = (currentWord as any)?.pinyin || '';
  const hanViet = (currentWord as any)?.hanViet || '';
  const cardLevel =
    (currentWord as any)?.level ||
    ((currentWord as any)?.hskLevel ? `HSK ${(currentWord as any).hskLevel}` : '') ||
    ((currentWord as any)?.jlptLevel ? `N${(currentWord as any).jlptLevel}` : '') ||
    'Oxford';

  // Mascot dynamic expression
  const mascotMood = useMemo(() => {
    if (internalCompleted) return 'celebrate';
    if (streakCombo >= 5) return 'celebrate';
    if (isShaking) return 'encourage';
    if (showHint || showListeningHint) return 'happy';
    return 'focus';
  }, [internalCompleted, streakCombo, isShaking, showHint, showListeningHint]);

  // Audio Pronunciation Handler (Natural Voice & Rate control)
  const handlePlayAudio = useCallback((rate: number = 0.9, overrideText?: string) => {
    if (!currentWord) return;
    setIsAudioPlaying(true);
    chamberAudio.playThock();
    const textToSpeak = overrideText
      ? overrideText
      : (activeLang?.id === 'ja' && furigana) ? furigana : term;

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speakWord(textToSpeak, activeLang?.speechVoiceCode || activeLang?.voiceCode || 'en-US', { rate });
      }
    } catch (err) {
      console.warn('Speech synthesis caught safely:', err);
    }

    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    audioTimerRef.current = setTimeout(() => setIsAudioPlaying(false), 1400);
  }, [currentWord, term, furigana, activeLang]);

  // Auto-play audio when entering listening mode for each new card
  useEffect(() => {
    if (activePracticeMode === 'listening' && !isListeningEvaluated && currentWord) {
      const t = setTimeout(() => {
        handlePlayAudio(1.0);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [internalIndex, activePracticeMode, isListeningEvaluated, currentWord]);

  // Reset local state between card advances
  const resetCardState = useCallback(() => {
    setInternalRevealed(false);
    setTypingInput('');
    setTypingFeedback('idle');
    setTypingShowAnswer(false);
    setShowHint(false);
    setTypingHintLetters(0);
    setQuizSelectedAnswer(null);
    setQuizFeedback(null);
    setIsFastQuizReflex(false);
    quizCardStartTimeRef.current = Date.now();
    setListeningInput('');
    setListeningEval(null);
    setIsListeningEvaluated(false);
    setShowListeningHint(false);
    setSelectedQuizChoice(null);
  }, []);

  // 3D Card Tilt Mouse Follower (Ref & Bounds Protected)
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;
    setTilt({
      rotateX: Number.isFinite(rotX) ? rotX : 0,
      rotateY: Number.isFinite(rotY) ? rotY : 0
    });
  };

  const handleCardMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  // Flip Card Action (Chạm bất kỳ đâu trên thẻ để lật, trừ các nút bấm và ô nhập liệu)
  const handleRevealCard = (e?: React.MouseEvent) => {
    if (e) {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, textarea, select, a, [data-interactive="true"]')) {
        return;
      }
    }
    chamberAudio.playThock();
    setInternalRevealed((prev) => {
      const next = !prev;
      try {
        if (next && onReveal) onReveal();
      } catch (err) {
        console.warn('onReveal callback error caught safely:', err);
      }
      return next;
    });
  };

  // Rating Submission Action (1 = Quên, 2 = Mơ hồ, 3 = Nhớ, 4 = Quá dễ)
  // Có khóa chống click đúp (Debounce Guard) và chống nhảy đúp thẻ
  const handleRateRating = (rating: 1 | 2 | 3 | 4) => {
    if (isTransitioningRef.current || !currentWord || internalCompleted) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);

    chamberAudio.playThock();

    if (rating >= 3) {
      const nextCombo = streakCombo + 1;
      setStreakCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);
      chamberAudio.playChime(nextCombo >= 3);
    } else {
      setStreakCombo(0);
      setIsShaking(true);
      chamberAudio.playMiss();
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setIsShaking(false), 380);
    }

    setReviewedWords((prev) => [...prev, { word: currentWord, rating }]);

    try {
      if (onRate) onRate(rating);
    } catch (err) {
      console.warn('onRate callback error caught safely:', err);
    }

    // Tiến hành reset và chuyển thẻ sau animation ngắn
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      if (!onRate) {
        const nextIdx = internalIndex + 1;
        if (nextIdx >= sessionWords.length) {
          setInternalCompleted(true);
        } else {
          setInternalIndex(nextIdx);
        }
      }
      resetCardState();
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }, 220);
  };

  // Previous & Next Card Navigation (Keyboard & Touch Swipe)
  const handleGoNextWord = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (internalIndex < sessionWords.length - 1) {
      if (onNextCard) {
        onNextCard();
      } else {
        setInternalIndex((prev) => prev + 1);
      }
      resetCardState();
      chamberAudio.playThock();
    } else {
      setInternalCompleted(true);
    }
  }, [internalIndex, sessionWords.length, onNextCard, resetCardState]);

  const handleGoPrevWord = useCallback(() => {
    if (isTransitioningRef.current || internalIndex <= 0) return;
    if (onPrevCard) {
      onPrevCard();
    } else {
      setInternalIndex((prev) => Math.max(0, prev - 1));
    }
    resetCardState();
    chamberAudio.playThock();
  }, [internalIndex, onPrevCard, resetCardState]);

  // Touch Swipe Handlers for mobile gestures (Vuốt trái/phải để chuyển từ)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : touchStartXRef.current;
    const endY = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartYRef.current;
    const deltaX = endX - touchStartXRef.current;
    const deltaY = endY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Minimum swipe threshold: 40px ngang và không phải cuộn dọc
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < 0) {
        // Vuốt sang trái -> Thẻ tiếp theo (Next)
        handleGoNextWord();
      } else {
        // Vuốt sang phải -> Thẻ trước đó (Previous)
        handleGoPrevWord();
      }
    }
  };

  // Check Multiple Choice Quiz Option (Báo đúng / sai rõ ràng kèm màu sắc & thời gian phản xạ <3s)
  const handleSelectQuizOption = (opt: string) => {
    if (isTransitioningRef.current || quizFeedback !== null) return;
    setQuizSelectedAnswer(opt);
    if (onSelectQuizOption) onSelectQuizOption(opt);

    const elapsedSec = (Date.now() - quizCardStartTimeRef.current) / 1000;
    const isFast = elapsedSec < 3.0;
    setIsFastQuizReflex(isFast);

    const isMatch = (opt.trim().toLowerCase() === (meaning || '').trim().toLowerCase());
    if (isMatch) {
      setQuizFeedback('correct');
      handlePlayAudio(1.0);
      const nextCombo = streakCombo + 1;
      setStreakCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);
      chamberAudio.playChime(true);
    } else {
      setQuizFeedback('wrong');
      setStreakCombo(0);
      setIsShaking(true);
      chamberAudio.playMiss();
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setIsShaking(false), 380);
    }
  };

  // Check Active Recall Typing
  const handleVerifyTyping = () => {
    if (!currentWord || isTransitioningRef.current) return;
    const cleanInput = (typingInput || '').trim().toLowerCase();
    const cleanTarget = (term || '').trim().toLowerCase();

    if (onCheckSpelling) {
      try {
        onCheckSpelling();
      } catch (err) {
        console.warn('onCheckSpelling callback error caught safely:', err);
      }
    }

    const matchResult = isEquivalentAnswer(cleanInput, cleanTarget, synonyms);

    if (matchResult.isMatch) {
      setTypingFeedback('correct');
      const nextCombo = streakCombo + 1;
      setStreakCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);
      chamberAudio.playChime(true);
    } else {
      setTypingFeedback('wrong');
      setStreakCombo(0);
      setIsShaking(true);
      chamberAudio.playMiss();
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setIsShaking(false), 380);
    }
  };

  // Verify Audio-First Listening
  const handleVerifyListening = () => {
    if (!currentWord || isTransitioningRef.current) return;
    const isSentenceMode = listeningSubMode === 'listen_and_transcribe';
    const target = isSentenceMode ? (exampleSentence || term) : term;
    const studentAns = listeningSubMode === 'listen_and_choose' ? (selectedQuizChoice || '') : listeningInput;

    const evaluation = evaluateListeningAnswer(studentAns, target, {
      languageId: activeLang?.id || 'en',
      isSentence: isSentenceMode,
      synonyms
    });

    setListeningEval(evaluation);
    setIsListeningEvaluated(true);
    chamberAudio.playThock();

    if (evaluation.rating >= 3) {
      const nextCombo = streakCombo + 1;
      setStreakCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);
      chamberAudio.playChime(nextCombo >= 3);
    } else {
      setStreakCombo(0);
      setIsShaking(true);
      chamberAudio.playMiss();
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setIsShaking(false), 380);
    }
  };

  // Quiz Mode Multiple Choice Pool (Array Safe)
  const quizOptions = useMemo(() => {
    if (!currentWord) return [];
    const pool = Array.isArray(distractorPool) && distractorPool.length > 0 ? distractorPool : sessionWords;
    const currentMeaning = meaning;
    const otherMeanings = (pool ?? [])
      .filter((w: any) => w && w.id !== currentWord?.id && getWordMeaning(w) !== currentMeaning)
      .map((w: any) => getWordMeaning(w))
      .filter(Boolean);

    const shuffledOthers = fisherYatesShuffle([...new Set(otherMeanings)]).slice(0, 3);
    const combined = [currentMeaning, ...shuffledOthers];
    while (combined.length < 4) {
      combined.push(`Nghĩa bổ sung ${combined.length + 1}`);
    }
    return fisherYatesShuffle(combined);
  }, [currentWord, meaning, distractorPool, sessionWords]);

  // Ambient Sound Toggler
  const handleToggleAmbient = (next: 'rain' | 'brown' | 'off') => {
    chamberAudio.playThock();
    setAmbientMode(next);
    chamberAudio.setAmbient(next);
  };

  // Tactile Keycap Press Simulator
  const triggerKeycapPress = (key: string) => {
    setActiveKeycap(key);
    if (keycapTimerRef.current) clearTimeout(keycapTimerRef.current);
    keycapTimerRef.current = setTimeout(() => setActiveKeycap(null), 150);
  };

  // Physical Keyboard Navigation Hook (Được bọc thép tuyệt đối)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Chặn toàn bộ phím tắt nếu người dùng đang gõ trong ô input / textarea
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (isInputActive) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (activePracticeMode === 'listening') {
            handleVerifyListening();
          } else {
            handleVerifyTyping();
          }
        }
        return;
      }

      // 2. Chặn phím tắt khi đã hoàn thành hoặc đang trong quá trình chuyển thẻ
      if (internalCompleted || isTransitioningRef.current || !currentWord) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowExitConfirm((prev) => !prev);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowExitConfirm((prev) => !prev);
        return;
      }

      // Space: Reveal / Flip Card (trong flashcard mode) hoặc Next card sau khi evaluate
      if (e.code === 'Space') {
        e.preventDefault();
        triggerKeycapPress('Space');
        if (activePracticeMode === 'listening' && isListeningEvaluated) {
          handleRateRating(listeningEval?.rating || 3);
        } else {
          handleRevealCard();
        }
        return;
      }

      // R: Pronounce Audio
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        triggerKeycapPress('R');
        handlePlayAudio(1.0);
        return;
      }

      // S: Slow Audio (0.72x speed)
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        triggerKeycapPress('S');
        handlePlayAudio(0.72);
        return;
      }

      // H: Hint
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        triggerKeycapPress('H');
        if (activePracticeMode === 'listening') {
          setShowListeningHint((prev) => !prev);
        } else {
          setShowHint((prev) => !prev);
        }
        return;
      }

      // Arrow Left / Right: Card Navigation (Lướt chuyển từ cũ / mới)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoPrevWord();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoNextWord();
        return;
      }

      // 1-4: SM-2 Ratings (Được phép đánh giá khi thẻ đã lật hoặc đã qua kiểm tra nghe)
      if (['1', '2', '3', '4'].includes(e.key)) {
        const canRate =
          internalRevealed ||
          (activePracticeMode === 'listening' && isListeningEvaluated);

        if (!canRate) {
          return;
        }
        e.preventDefault();
        const rating = parseInt(e.key, 10) as 1 | 2 | 3 | 4;
        triggerKeycapPress(e.key);
        handleRateRating(rating);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    internalRevealed,
    internalCompleted,
    currentWord,
    activePracticeMode,
    isListeningEvaluated,
    listeningEval,
    listeningInput,
    typingInput,
    handleGoNextWord,
    handleGoPrevWord
  ]);

  // Progress metrics
  const progressPercent = useMemo(() => {
    if (!sessionWords || sessionWords.length === 0) return 0;
    return Math.round(((internalIndex + (internalRevealed ? 0.5 : 0)) / sessionWords.length) * 100);
  }, [internalIndex, internalRevealed, sessionWords]);

  // Session Summary Bento Stats
  const sessionDurationFormatted = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }, [elapsedSeconds]);

  const accuracyPercent = useMemo(() => {
    if (!reviewedWords || reviewedWords.length === 0) return 100;
    const correctCount = reviewedWords.filter((w) => w && w.rating >= 3).length;
    return Math.round((correctCount / reviewedWords.length) * 100);
  }, [reviewedWords]);

  const masteredList = useMemo(() => {
    return reviewedWords.filter((w) => w && w.rating >= 3 && w.word).map((w) => w.word);
  }, [reviewedWords]);

  const needsReviewList = useMemo(() => {
    return reviewedWords.filter((w) => w && w.rating <= 2 && w.word).map((w) => w.word);
  }, [reviewedWords]);

  return (
    <div
      data-testid="focus-chamber-screen"
      className="fixed inset-0 z-[120] w-screen h-screen overflow-hidden select-none flex flex-col justify-between font-sans transition-all duration-700 animate-in fade-in zoom-in-95"
      style={{
        backgroundColor: '#050507',
        backgroundImage: `radial-gradient(circle at 50% 30%, rgba(16, 185, 129, ${
          streakCombo >= 3 ? '0.14' : '0.06'
        }) 0%, rgba(5, 5, 7, 0.98) 75%)`
      }}
    >
      {/* 3D Dust Particles & Dynamic Spotlight Field */}
      <FocusSpatialCanvas combo={streakCombo} />

      {/* =================================================================== */}
      {/* 1. TOP FLOATING HUD (Glowing Thread, Combo, YouTube Lo-Fi & Esc)   */}
      {/* =================================================================== */}
      <header className="relative z-20 w-full px-4 sm:px-8 pt-4 pb-3 flex flex-col gap-3">
        {/* Glowing Progress Thread (3px) */}
        <div
          data-testid="focus-progress-thread"
          className="w-full bg-slate-900/80 h-[3px] rounded-full overflow-hidden relative shadow-xs"
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-300 ease-out"
            style={{
              width: `${Math.max(4, progressPercent)}%`,
              boxShadow: '0 0 12px #10B981, 0 0 4px #34D399'
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Left: Progress count & Flow State Combo */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold tracking-wider text-slate-400 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
              {Math.min(internalIndex + 1, sessionWords.length)} / {sessionWords.length}
            </span>

            {/* Streak Combo Badge */}
            <div
              data-testid="focus-streak-badge"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-wide border transition-all duration-300 ${
                streakCombo > 0 ? 'opacity-100' : 'opacity-40'
              } ${
                streakCombo >= 5
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              }`}
            >
              <Flame className="w-4 h-4 fill-current animate-pulse text-amber-400" />
              <span>
                {streakCombo > 0 ? `x${streakCombo} ${streakCombo >= 5 ? 'FLOW STATE 🔥' : 'COMBO'}` : 'FLOW 0'}
              </span>
            </div>
          </div>

          {/* Center: Practice Mode Selector Pills (First-class across mobile & desktop) */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950/80 border border-white/10 backdrop-blur-xl overflow-x-auto max-w-[50vw]">
            <button
              type="button"
              onClick={() => {
                chamberAudio.playThock();
                setActivePracticeMode('flashcard');
                resetCardState();
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activePracticeMode === 'flashcard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🗂️ Flashcard</span>
            </button>
            <button
              type="button"
              onClick={() => {
                chamberAudio.playThock();
                setActivePracticeMode('flashcard_reverse');
                resetCardState();
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activePracticeMode === 'flashcard_reverse'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔄 Đảo chiều</span>
            </button>
            <button
              type="button"
              onClick={() => {
                chamberAudio.playThock();
                setActivePracticeMode('listening');
                resetCardState();
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activePracticeMode === 'listening'
                  ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🎧 Luyện Nghe</span>
            </button>
            <button
              type="button"
              onClick={() => {
                chamberAudio.playThock();
                setActivePracticeMode('typing');
                resetCardState();
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activePracticeMode === 'typing'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>✍️ Gõ từ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                chamberAudio.playThock();
                setActivePracticeMode('quiz');
                resetCardState();
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activePracticeMode === 'quiz'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📝 Quiz</span>
            </button>
          </div>

          {/* Right: YouTube Focus Music, Smart Shuffle, Ambient Sound Mixer & Exit Button */}
          <div className="flex items-center gap-2">
            {/* Smart Random Shuffle Control & Reshuffle Action */}
            <div className="relative">
              <button
                type="button"
                id="btn-smart-shuffle-toggle"
                data-testid="smart-shuffle-toggle"
                onClick={() => {
                  chamberAudio.playThock();
                  setShowShuffleMenu(prev => !prev);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer backdrop-blur-md ${
                  showShuffleMenu
                    ? 'bg-purple-600/30 border-purple-500/60 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white'
                }`}
                title="Cơ chế Xáo trộn Thông minh (Smart Random Shuffle)"
              >
                <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-bold hidden sm:inline">
                  {activeShuffleMode === 'smart_review' && '🧠 Ôn thông minh'}
                  {activeShuffleMode === 'random' && '🎲 Ngẫu nhiên'}
                  {activeShuffleMode === 'new_words' && '🌱 Chỉ từ mới'}
                  {activeShuffleMode === 'mixed' && '⚡ Kết hợp'}
                  {activeShuffleMode === 'mistakes' && '🔥 Hay sai'}
                </span>
                <span className="font-bold sm:hidden">
                  {activeShuffleMode === 'smart_review' ? '🧠' : activeShuffleMode === 'random' ? '🎲' : activeShuffleMode === 'new_words' ? '🌱' : activeShuffleMode === 'mixed' ? '⚡' : '🔥'}
                </span>
              </button>

              {/* Shuffle Menu Dropdown */}
              {showShuffleMenu && (
                <div
                  id="shuffle-mode-menu"
                  data-testid="shuffle-mode-menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-slate-950/95 border border-white/15 backdrop-blur-2xl shadow-2xl p-2.5 z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                    <span>Cơ chế Xáo Trộn</span>
                    <span className="text-purple-400 font-bold">Anti-Repetition</span>
                  </div>

                  {[
                    { id: 'smart_review', label: '🧠 Ôn thông minh (Smart)', desc: 'Ưu tiên từ yếu, hay quên, đến hạn' },
                    { id: 'random', label: '🎲 Ngẫu nhiên hoàn toàn', desc: 'Xáo trộn đều Fisher-Yates' },
                    { id: 'new_words', label: '🌱 Chỉ từ mới', desc: 'Nạp từ vựng chưa từng học' },
                    { id: 'mixed', label: '⚡ Kết hợp đan xen', desc: '30% từ mới + 70% ôn tập' },
                    { id: 'mistakes', label: '🔥 Tập trung hay sai', desc: 'Chỉ các từ từng quên / đánh dấu khó' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        chamberAudio.playThock();
                        const target = item.id as ShuffleMode;
                        setActiveShuffleMode(target);
                        setShowShuffleMenu(false);
                        if (onShuffleModeChange) onShuffleModeChange(target);
                        if (onReshuffleSession) onReshuffleSession(target);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition cursor-pointer flex flex-col gap-0.5 ${
                        activeShuffleMode === item.id
                          ? 'bg-purple-600/30 border border-purple-500/50 text-white'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{item.desc}</span>
                    </button>
                  ))}

                  <div className="pt-1.5 border-t border-white/10">
                    <button
                      type="button"
                      id="btn-reshuffle-now"
                      data-testid="btn-reshuffle-now"
                      onClick={() => {
                        chamberAudio.playThock();
                        setShowShuffleMenu(false);
                        if (onReshuffleSession) onReshuffleSession(activeShuffleMode);
                      }}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Xáo trộn lại phiên học
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* YouTube Focus Music Player Toggle - ALWAYS PROMINENT */}
            <button
              type="button"
              id="btn-youtube-focus-toggle"
              data-testid="youtube-focus-toggle"
              onClick={() => {
                chamberAudio.playThock();
                setShowMusicPlayer((prev) => !prev);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer backdrop-blur-md ${
                showMusicPlayer
                  ? 'bg-rose-500/25 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Nhạc tập trung Lo-Fi YouTube"
            >
              <Music className={`w-3.5 h-3.5 ${showMusicPlayer ? 'text-rose-400 animate-pulse' : 'text-rose-400'}`} />
              <span className="font-bold">{showMusicPlayer ? 'Ẩn nhạc' : 'Nhạc YouTube'}</span>
            </button>

            {/* Ambient Sound Dropdown / Quick Mixer */}
            <div
              data-testid="ambient-sound-btn"
              className="flex items-center rounded-xl bg-slate-900/80 border border-white/10 p-0.5 text-xs text-slate-300 backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => handleToggleAmbient(ambientMode === 'rain' ? 'off' : 'rain')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  ambientMode === 'rain' ? 'bg-blue-600 text-white' : 'hover:text-white'
                }`}
                title="Âm thanh Mưa đêm"
              >
                <CloudRain className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleAmbient(ambientMode === 'brown' ? 'off' : 'brown')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  ambientMode === 'brown' ? 'bg-amber-700 text-white' : 'hover:text-white'
                }`}
                title="Tiếng ồn Nâu (Brown Noise)"
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleAmbient('off')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  ambientMode === 'off' ? 'text-slate-500' : 'text-slate-300 hover:text-white'
                }`}
                title="Tắt âm thanh môi trường"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Exit with Esc badge */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 text-xs font-bold transition-all backdrop-blur-md cursor-pointer"
            >
              <span className="text-[10px] font-mono px-1 py-0.5 rounded-sm bg-white/10 text-slate-300">
                Esc
              </span>
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Collapsible YouTube Lo-Fi Music Player Drawer */}
      {showMusicPlayer && (
        <div
          data-testid="focus-youtube-container"
          className="fixed top-16 right-4 sm:right-8 z-[130] w-full max-w-sm animate-in slide-in-from-top-3 duration-200"
        >
          <div className="relative shadow-2xl rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-1">
            <button
              type="button"
              onClick={() => setShowMusicPlayer(false)}
              className="absolute top-3 right-3 p-1 rounded-full bg-slate-900/90 text-slate-400 hover:text-white border border-white/10 z-20 transition-colors cursor-pointer"
              title="Đóng bảng nhạc"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <YouTubeFocusPlayer defaultExpanded={true} />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. CENTER STAGE: 3D FLASHCARD / ACTIVE RECALL / DICTATION STAGE    */}
      {/* =================================================================== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 max-w-4xl mx-auto w-full">
        {!internalCompleted && currentWord ? (
          <>
            {/* Quick Word Navigator: Từ trước | Từ X/Y (Vuốt ◄ ►) | Từ sau */}
            <div className="flex items-center justify-between w-full max-w-xl px-2.5 py-1.5 mb-2.5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-lg">
              <button
                type="button"
                disabled={internalIndex <= 0 || isTransitioning}
                onClick={handleGoPrevWord}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  internalIndex <= 0 || isTransitioning
                    ? 'text-slate-600 opacity-40 cursor-not-allowed'
                    : 'text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer active:translate-y-[1px]'
                }`}
                title="Từ trước (Phím ← Mũi tên trái hoặc vuốt sang phải)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Từ trước</span>
              </button>

              <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5 select-none">
                <span className="font-bold text-white text-xs">{internalIndex + 1}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{sessionWords.length}</span>
                <span className="text-[10px] text-emerald-400 font-sans ml-1 hidden sm:inline">(Vuốt ◄ ► chuyển từ)</span>
              </div>

              <button
                type="button"
                disabled={internalIndex >= sessionWords.length - 1 || isTransitioning}
                onClick={handleGoNextWord}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  internalIndex >= sessionWords.length - 1 || isTransitioning
                    ? 'text-slate-600 opacity-40 cursor-not-allowed'
                    : 'text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer active:translate-y-[1px]'
                }`}
                title="Từ sau (Phím → Mũi tên phải hoặc vuốt sang trái)"
              >
                <span className="hidden sm:inline">Từ sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`w-full max-w-xl transition-transform duration-300 ease-out ${
                isShaking ? 'animate-[wiggle_0.2s_ease-in-out_infinite]' : ''
              }`}
            >
              {/* Thẻ học luôn thẳng tắp, phẳng, không bị nghiêng 3D */}
              <div
                ref={cardRef}
                onClick={handleRevealCard}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative w-full rounded-3xl border border-white/10 transition-colors duration-200 cursor-pointer overflow-hidden shadow-2xl backdrop-blur-2xl"
                style={{
                  backgroundColor: 'rgba(9, 9, 11, 0.85)',
                  boxShadow:
                    streakCombo >= 3
                      ? '0 25px 60px -15px rgba(16, 185, 129, 0.25), 0 0 30px rgba(16, 185, 129, 0.12)'
                      : '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.03)'
                }}
              >
              {/* ---------------- A. AUDIO-FIRST LISTENING CENTER STAGE ---------------- */}
              {activePracticeMode === 'listening' ? (
                !isListeningEvaluated ? (
                  /* GIAI ĐOẠN 1: NGHE ÂM THANH - TUYỆT ĐỐI KHÔNG HIỂN THỊ TỪ / PHIÊN ÂM / NGHĨA */
                  <div className="w-full p-6 sm:p-9 flex flex-col justify-between min-h-[420px] sm:min-h-[460px] animate-in fade-in duration-200 cursor-default">
                    {/* Header: Meta & Sub-mode tabs */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          {partOfSpeech || 'vocab'}
                        </span>
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                          {cardLevel}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                          <Headphones className="w-3 h-3" /> Audio-First
                        </span>
                      </div>

                      {/* Sub-mode selector */}
                      <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setListeningSubMode('listen_and_type'); }}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            listeningSubMode === 'listen_and_type' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Gõ từ
                        </button>
                        {exampleSentence && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setListeningSubMode('listen_and_complete'); }}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              listeningSubMode === 'listen_and_complete' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Điền câu
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setListeningSubMode('listen_and_choose'); }}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            listeningSubMode === 'listen_and_choose' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Chọn nghĩa
                        </button>
                      </div>
                    </div>

                    {/* Central Audio Hub: Big Glowing Play & Slow Play Buttons */}
                    <div className="py-6 sm:py-8 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="w-16 h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-950">
                        <Headphones className={`w-8 h-8 ${isAudioPlaying ? 'animate-bounce text-emerald-400' : ''}`} />
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-white">
                          Lắng nghe cẩn thận âm thanh
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Từ vựng và đáp án được bảo mật 100%. Hãy nghe và phản xạ từ trí nhớ của bạn!
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-2">
                        {/* 1.0x Normal Audio Button */}
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(1.0)}
                          className={`px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-indigo-900/40 flex items-center gap-2 active:scale-95 ${
                            isAudioPlaying ? 'ring-4 ring-indigo-400/40 animate-pulse' : ''
                          }`}
                          title="Phát âm thanh chuẩn (Phím R)"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>Nghe chuẩn 1.0x (R)</span>
                        </button>

                        {/* 0.72x Slow Audio Button */}
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(0.72)}
                          className="px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                          title="Nghe chậm rõ âm tiết (Phím S)"
                        >
                          <Volume1 className="w-4 h-4 text-indigo-400" />
                          <span>Chậm 0.75x (S)</span>
                        </button>
                      </div>

                      {exampleSentence && (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(0.85, exampleSentence)}
                          className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer pt-1"
                        >
                          <span>💬 Nghe ngữ cảnh câu ví dụ</span>
                        </button>
                      )}

                      {/* Interactive Sub-mode Input */}
                      {listeningSubMode === 'listen_and_type' && (
                        <div className="max-w-md mx-auto pt-2 space-y-2">
                          <input
                            ref={listeningInputRef}
                            type="text"
                            value={listeningInput}
                            onChange={(e) => setListeningInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleVerifyListening();
                              }
                            }}
                            placeholder="Gõ từ bạn vừa nghe được..."
                            autoFocus
                            className="w-full py-3.5 px-5 rounded-2xl text-center font-mono text-base font-bold bg-slate-900/90 border border-indigo-500/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                          />
                        </div>
                      )}

                      {listeningSubMode === 'listen_and_complete' && (
                        <div className="max-w-md mx-auto pt-2 space-y-3">
                          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                            "{safeBlankContextSentence(exampleSentence, term)}"
                          </div>
                          <input
                            type="text"
                            value={listeningInput}
                            onChange={(e) => setListeningInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleVerifyListening();
                              }
                            }}
                            placeholder="Điền từ còn thiếu vào chỗ trống..."
                            autoFocus
                            className="w-full py-3 px-4 rounded-xl text-center font-mono text-sm font-bold bg-slate-900 border border-indigo-500/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {listeningSubMode === 'listen_and_choose' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto pt-2">
                          {quizOptions.map((opt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedQuizChoice(opt)}
                              className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                                selectedQuizChoice === opt
                                  ? 'bg-indigo-600/40 border-indigo-400 text-white ring-2 ring-indigo-500/50 shadow-md'
                                  : 'bg-slate-900/80 border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-lg bg-white/10 text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate">{opt}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Non-leaking Hint */}
                      {showListeningHint && (
                        <div className="mt-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs text-left animate-in fade-in duration-200">
                          <strong>Gợi ý an toàn:</strong> Từ gồm {term.length} ký tự. Bắt đầu bằng chữ:{' '}
                          <strong className="uppercase font-mono text-white">{(term || '?')[0]}</strong>.
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setShowListeningHint((prev) => !prev)}
                        className="text-xs text-slate-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{showListeningHint ? 'Ẩn gợi ý' : 'Gợi ý an toàn (H)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleVerifyListening}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-950 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Kiểm tra đáp án [Enter]</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* GIAI ĐOẠN 2: KẾT QUẢ ĐÁNH GIÁ NGHE - HIỂN THỊ CHAR DIFF VÀ TOÀN BỘ CHI TIẾT TỪ */
                  <div className="w-full p-6 sm:p-9 flex flex-col justify-between min-h-[420px] sm:min-h-[460px] animate-in fade-in duration-200 cursor-default">
                    {/* Header: Score badge & Result Type */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                            listeningEval?.isExact
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : listeningEval?.isAcceptable
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {listeningEval?.isExact ? '🟢 Chính xác tuyệt đối' : listeningEval?.isAcceptable ? '🟡 Gần chính xác' : '🔴 Chưa chính xác'}
                          <span className="font-mono">({listeningEval?.score}%)</span>
                        </span>
                      </div>

                      {/* Audio replay controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(1.0)}
                          className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                          title="Nghe lại chuẩn 1.0x (R)"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(0.72)}
                          className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                          title="Nghe lại chậm 0.75x (S)"
                        >
                          <Volume1 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Diff & Analysis Body */}
                    <div className="py-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                      {/* Character Diff Visualizer */}
                      {listeningEval?.charDiff && listeningEval.charDiff.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            So sánh ký tự (Xanh: Khớp • Vàng/Đỏ: Cần chỉnh)
                          </span>
                          <div className="flex flex-wrap gap-1 font-mono text-base font-bold">
                            {listeningEval.charDiff.map((item, dIdx) => (
                              <span
                                key={dIdx}
                                className={`px-1.5 py-0.5 rounded-md ${
                                  item.type === 'match'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : item.type === 'substitute'
                                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                }`}
                                title={
                                  item.type === 'match'
                                    ? 'Khớp chính xác'
                                    : item.type === 'substitute'
                                    ? `Gõ '${item.char}', chuẩn là '${item.expected}'`
                                    : `Ký tự '${item.char}'`
                                }
                              >
                                {item.char === ' ' ? '␣' : item.char}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Explanation of mistake if detected */}
                      {listeningEval?.commonMistakeExplanation && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                          💡 <strong>Phân tích âm học:</strong> {listeningEval.commonMistakeExplanation}
                        </div>
                      )}

                      {/* Target Word Revealed */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                            {term}
                          </h2>
                          {phonetic && (
                            <span className="text-sm font-mono text-emerald-400">
                              {phonetic}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-emerald-400">
                          {meaning}
                        </h3>
                      </div>

                      {explanation && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {explanation}
                        </p>
                      )}

                      {exampleSentence && (
                        <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/5 space-y-1">
                          <p className="text-xs sm:text-sm text-slate-200 italic">"{exampleSentence}"</p>
                          {exampleTranslation && (
                            <p className="text-xs text-slate-400">→ {exampleTranslation}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Next Card & Try Again Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsListeningEvaluated(false);
                          setListeningInput('');
                          setListeningEval(null);
                        }}
                        className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Thử nghe lại</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRateRating(listeningEval?.rating || 3)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-950 flex items-center gap-1.5"
                      >
                        <span>Tiếp tục thẻ sau [Space]</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* ---------------- B. FLASHCARD / TYPING / QUIZ STAGE (CHẠM BẤT KỲ ĐÂU ĐỂ LẬT) ---------------- */
                !internalRevealed ? (
                  /* CARD FRONT */
                  <div className="w-full p-6 sm:p-9 flex flex-col justify-between min-h-[380px] sm:min-h-[420px] animate-in fade-in duration-200">
                    {/* Top Card Meta: Part of speech, Level & Speaker */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          {partOfSpeech || 'vocab'}
                        </span>
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                          {cardLevel}
                        </span>
                        {hanViet && (
                          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                            HV: {hanViet}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {onToggleFavorite && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                onToggleFavorite(currentWord.id);
                              } catch (err) {
                                console.warn('onToggleFavorite error:', err);
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                            title="Đánh dấu từ yêu thích"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                currentWord?.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                              }`}
                            />
                          </button>
                        )}

                        {/* Audio Waveform Speaker Button */}
                        <button
                          type="button"
                          id="btn-chamber-audio"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(1.0);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                          title="Phát âm từ vựng (R)"
                        >
                          <Volume2 className="w-4 h-4" />
                          <div className="flex items-end gap-0.5 h-3">
                            <span
                              className={`w-0.5 bg-emerald-400 rounded-full transition-all ${
                                isAudioPlaying ? 'h-3 animate-pulse' : 'h-1.5'
                              }`}
                            />
                            <span
                              className={`w-0.5 bg-emerald-400 rounded-full transition-all ${
                                isAudioPlaying ? 'h-2 animate-bounce' : 'h-2'
                              }`}
                            />
                            <span
                              className={`w-0.5 bg-emerald-400 rounded-full transition-all ${
                                isAudioPlaying ? 'h-3.5 animate-pulse' : 'h-1'
                              }`}
                            />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Main Word Stage */}
                    <div className="text-center py-5 sm:py-7 space-y-3">
                      {activePracticeMode === 'flashcard_reverse' ? (
                        /* Flashcard Đảo Chiều: Hiện Nghĩa Tiếng Việt trước */
                        <>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Nghĩa Tiếng Việt
                          </span>
                          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-emerald-400 drop-shadow-md">
                            {meaning || 'Chưa có định nghĩa'}
                          </h2>
                        </>
                      ) : activePracticeMode === 'typing' ? (
                        /* CHẾ ĐỘ ĐIỀN TỪ (ACTIVE RECALL): TUYỆT ĐỐI ẨN TỪ TIẾNG ANH GỐC */
                        <div className="space-y-3 max-w-lg mx-auto">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                              Active Recall · Nhớ & Điền từ
                            </span>
                            {partOfSpeech && (
                              <span className="text-xs font-medium text-slate-400 italic">
                                ({partOfSpeech})
                              </span>
                            )}
                          </div>

                          {/* Nghĩa Tiếng Việt là manh mối chính */}
                          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
                            {meaning || 'Chưa có định nghĩa'}
                          </h2>

                          {/* Phiên âm + Nút nghe phát âm Web Speech API */}
                          <div className="flex items-center justify-center gap-3 pt-1">
                            {phonetic && (
                              <span className="text-xs sm:text-sm font-mono text-emerald-400/90 font-medium">
                                {phonetic}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayAudio(1.0);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                              title="Nghe phát âm chuẩn"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Nghe phát âm</span>
                            </button>
                          </div>

                          {/* Khung gợi ý chữ cái đầu, cuối và độ dài từ: E _ _ _ _ _ t (7 chữ cái) */}
                          <div className="pt-2">
                            <div className="font-mono text-xl sm:text-3xl font-black text-amber-400 tracking-widest select-none drop-shadow-sm py-1">
                              {getMaskedWordHint(term, typingHintLetters)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              ({(term || '').trim().length} chữ cái)
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Standard Flashcard: Hiện Từ Vựng Tiếng Anh / Ngoại ngữ */
                        <>
                          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                            {term || 'Từ vựng'}
                          </h2>
                          <p className="text-sm sm:text-base font-mono text-emerald-400/90 font-medium tracking-wide">
                            {phonetic ||
                              (activeLang?.id === 'zh'
                                ? pinyin
                                : activeLang?.id === 'ja'
                                ? furigana
                                  ? `${furigana} (${romaji})`
                                  : romaji
                                : '')}
                          </p>
                        </>
                      )}

                      {/* Context sentence with safe fill-in-the-blank */}
                      {exampleSentence && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                          "{safeBlankContextSentence(exampleSentence, term)}"
                        </div>
                      )}

                      {/* Multiple Choice Quiz in Quiz Mode */}
                      {activePracticeMode === 'quiz' && (
                        <div className="pt-3 max-w-lg mx-auto space-y-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {quizOptions.map((opt, idx) => {
                              const isSelected = (quizSelectedAnswer === opt);
                              const isCorrectAnswer = (opt.trim().toLowerCase() === (meaning || '').trim().toLowerCase());
                              
                              let btnClass = 'bg-slate-900/90 border-white/10 hover:border-emerald-500/50 text-slate-200';
                              if (quizFeedback !== null) {
                                if (isCorrectAnswer) {
                                  btnClass = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50 shadow-lg';
                                } else if (isSelected && !isCorrectAnswer) {
                                  btnClass = 'bg-rose-950/90 border-rose-500 text-rose-200 ring-2 ring-rose-500/50';
                                } else {
                                  btnClass = 'bg-slate-900/40 border-white/5 text-slate-500 opacity-50';
                                }
                              }

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={isTransitioning || quizFeedback !== null}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectQuizOption(opt);
                                  }}
                                  className={`p-3 rounded-2xl border text-left text-xs font-medium transition-all flex items-center justify-between gap-2 ${btnClass} ${
                                    isTransitioning || quizFeedback !== null ? 'cursor-default' : 'cursor-pointer hover:bg-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="w-5 h-5 rounded-lg bg-white/10 text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                  </div>
                                  {quizFeedback !== null && isCorrectAnswer && (
                                    <span className="text-emerald-400 font-bold shrink-0 text-[11px]">✓ Đúng</span>
                                  )}
                                  {quizFeedback !== null && isSelected && !isCorrectAnswer && (
                                    <span className="text-rose-400 font-bold shrink-0 text-[11px]">✗ Sai</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Quiz Outcome Feedback Banner */}
                          {quizFeedback !== null && (
                            <div className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in duration-200 shadow-xl ${
                              quizFeedback === 'correct' 
                                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                {quizFeedback === 'correct' ? (
                                  <>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <strong className="text-emerald-300 text-sm">🎉 Chính xác! Tuyệt vời!</strong>
                                        {isFastQuizReflex && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs animate-bounce">
                                            ⚡ Phản xạ siêu nhanh (&lt;3s)
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-emerald-400/80">Từ gốc: <span className="font-mono font-bold uppercase">{term}</span> {phonetic && `(${phonetic})`}</div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                    <div>
                                      <strong className="text-rose-300 text-sm">❌ Chưa chính xác!</strong>
                                      <div className="text-[11px] text-rose-200/90">Đáp án đúng: "<strong className="text-white underline">{meaning}</strong>" (Đã đưa vào hàng đợi học lại cuối phiên)</div>
                                    </div>
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRateRating(quizFeedback === 'correct' ? (isFastQuizReflex ? 4 : 3) : 1)}
                                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-black text-xs shrink-0 cursor-pointer shadow-md transition active:translate-y-[1px] ${
                                  quizFeedback === 'correct' 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                                }`}
                              >
                                Từ tiếp theo →
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Active Recall Typing Input & Interactive Controls */}
                      {activePracticeMode === 'typing' && (
                        <div className="pt-2 max-w-md mx-auto space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <input
                              ref={inputRef}
                              type="text"
                              value={typingInput}
                              onChange={(e) => {
                                setTypingInput(e.target.value);
                                if (typingFeedback !== 'idle') setTypingFeedback('idle');
                                if (onSpellingChange) onSpellingChange(e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (typingFeedback === 'correct') {
                                    handleRateRating(3);
                                  } else {
                                    handleVerifyTyping();
                                  }
                                }
                              }}
                              placeholder="Tự nhớ và gõ từ tiếng Anh..."
                              autoFocus
                              disabled={isTransitioning || typingFeedback === 'correct'}
                              className={`w-full py-2.5 pl-4 pr-24 rounded-xl text-center font-mono text-sm sm:text-base font-bold bg-slate-900 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                                typingFeedback === 'correct'
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/20'
                                  : typingFeedback === 'wrong'
                                  ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                                  : 'border-white/10 focus:border-emerald-500'
                              }`}
                            />
                            <button
                              type="button"
                              disabled={isTransitioning || typingFeedback === 'correct'}
                              onClick={handleVerifyTyping}
                              className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors ${
                                isTransitioning || typingFeedback === 'correct' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              Kiểm tra
                            </button>
                          </div>

                          {/* Typing Feedback Box: Correct */}
                          {typingFeedback === 'correct' && (
                            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex flex-col gap-2 animate-in fade-in zoom-in-95 shadow-xl">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                  <span>🎉 Chính xác! Bạn đã nhớ đúng từ!</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handlePlayAudio(1.0)}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                                  title="Nghe phát âm chuẩn"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="text-slate-300">
                                Từ chuẩn: <span className="font-mono font-bold text-white text-sm uppercase">{term}</span> {phonetic && <span className="text-slate-400">({phonetic})</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRateRating(3)}
                                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all active:translate-y-[1px]"
                              >
                                Tiếp tục sang từ tiếp theo →
                              </button>
                            </div>
                          )}

                          {/* Typing Feedback Box: Wrong */}
                          {typingFeedback === 'wrong' && (
                            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex flex-col gap-2.5 animate-in fade-in zoom-in-95 shadow-xl">
                              <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                                <AlertCircle className="w-5 h-5 text-rose-400" />
                                <span>❌ Chưa chính xác!</span>
                              </div>
                              <div className="text-slate-300">
                                Bạn đã nhập: <span className="font-mono text-rose-300 line-through">"{typingInput}"</span>
                              </div>
                              {typingShowAnswer && (
                                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-slate-200">
                                  Đáp án đúng là: <strong className="font-mono text-emerald-400 text-sm uppercase">{term}</strong> {phonetic && <span className="text-slate-400">({phonetic})</span>}
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTypingFeedback('idle');
                                    setTypingInput('');
                                    inputRef.current?.focus();
                                  }}
                                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
                                >
                                  🔄 Thử lại
                                </button>
                                {!typingShowAnswer ? (
                                  <button
                                    type="button"
                                    onClick={() => setTypingShowAnswer(true)}
                                    className="px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold text-xs cursor-pointer"
                                  >
                                    👁️ Xem đáp án
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRateRating(1)}
                                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer"
                                  >
                                    Đã hiểu, tiếp tục →
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Quick Action Hint & Audio Buttons */}
                          {typingFeedback === 'idle' && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayAudio(0.7);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                title="Nghe phát âm tốc độ chậm 0.7x"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>🔊 Nghe chậm (0.7x)</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const maxHints = Math.max(0, (term || '').trim().length - 2);
                                  setTypingHintLetters((prev) => Math.min(prev + 1, maxHints));
                                  chamberAudio.playThock();
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Lightbulb className="w-3.5 h-3.5" />
                                <span>💡 Gợi ý (+1 chữ)</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInternalRevealed(true);
                                  chamberAudio.playThock();
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem đáp án</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hint Reveal Box */}
                      {showHint && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left animate-in fade-in duration-200">
                          <strong>Gợi ý:</strong> {(meaning || '').split(',')[0] || '...'} (Bắt đầu bằng chữ:{' '}
                          <span className="font-mono font-bold uppercase">{(term || '?')[0] || '?'}</span>)
                        </div>
                      )}
                    </div>

                    {/* Flip Instruction Pill */}
                    <div className="text-center pt-2">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 transition-all font-medium">
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Chạm bất kỳ đâu trên thẻ hoặc nhấn [Space] để lật</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CARD BACK (Revealed) */
                  <div className="w-full p-5 sm:p-7 flex flex-col justify-between min-h-[380px] max-h-[calc(100dvh-200px)] overflow-y-auto pr-1.5 scrollbar-thin animate-in fade-in duration-200 space-y-4">
                    {/* Header: Term, Phonetic, Part of Speech, Audio Controls */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-black tracking-wide text-white">
                          {term}
                        </span>
                        {phonetic && (
                          <span className="text-xs sm:text-sm font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {phonetic}
                          </span>
                        )}
                        {partOfSpeech && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            {formatPartOfSpeech(partOfSpeech)}
                          </span>
                        )}
                        {hanViet && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            HV: {hanViet}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(0.7);
                          }}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Phát âm chậm 0.7x"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>0.7x</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(1.0);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                          title="Phát âm chuẩn (Phím R)"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="space-y-3.5 py-1">
                      {/* Meaning Card */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/80 border border-emerald-500/25 shadow-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                          Nghĩa Tiếng Việt
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-emerald-300 leading-snug">
                          {meaning}
                        </h3>
                        {explanation && (
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed border-t border-white/5 pt-2">
                            {explanation}
                          </p>
                        )}
                      </div>

                      {/* Contextual Example Sentence */}
                      {exampleSentence && (
                        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <span>📝</span> Ví dụ ngữ cảnh
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayAudio(0.85, exampleSentence);
                              }}
                              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-emerald-400 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Nghe câu ví dụ"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Đọc câu</span>
                            </button>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-100 font-medium italic">"{exampleSentence}"</p>
                          {exampleTranslation && (
                            <p className="text-xs text-emerald-400/90 font-medium">→ {exampleTranslation}</p>
                          )}
                        </div>
                      )}

                      {/* Synonyms / Collocations */}
                      {synonyms && synonyms.length > 0 && (
                        <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Cụm từ liên quan & Phổ biến (Collocations)
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {synonyms.map((syn, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2.5 py-1 rounded-xl bg-slate-800/90 text-slate-200 text-xs font-medium border border-white/10 flex items-center gap-1 shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                {syn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mnemonic / Grammar Tip */}
                      {mnemonic && (
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs leading-relaxed flex items-start gap-2">
                          <span className="shrink-0 text-sm">💡</span>
                          <span>{mnemonic}</span>
                        </div>
                      )}
                    </div>

                    {/* 4 Interactive Active Recall Rating Buttons directly on card */}
                    <div className="pt-3 border-t border-white/10 space-y-2.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* [1] Quên */}
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerKeycapPress('1');
                            handleRateRating(1);
                          }}
                          className="py-2.5 px-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                        >
                          <span className="flex items-center gap-1 text-xs sm:text-sm font-black">
                            <span>🔴</span>
                            <span>1 · Quên</span>
                          </span>
                          <span className="text-[10px] text-rose-300/80">Học lại ngay</span>
                        </button>

                        {/* [2] Khó */}
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerKeycapPress('2');
                            handleRateRating(2);
                          }}
                          className="py-2.5 px-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                        >
                          <span className="flex items-center gap-1 text-xs sm:text-sm font-black">
                            <span>🟡</span>
                            <span>2 · Khó</span>
                          </span>
                          <span className="text-[10px] text-amber-300/80">Nhớ mơ màng</span>
                        </button>

                        {/* [3] Tốt */}
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerKeycapPress('3');
                            handleRateRating(3);
                          }}
                          className="py-2.5 px-2 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                        >
                          <span className="flex items-center gap-1 text-xs sm:text-sm font-black">
                            <span>🔵</span>
                            <span>3 · Tốt</span>
                          </span>
                          <span className="text-[10px] text-sky-300/80">Nhớ đúng lúc</span>
                        </button>

                        {/* [4] Dễ */}
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerKeycapPress('4');
                            handleRateRating(4);
                          }}
                          className="py-2.5 px-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                        >
                          <span className="flex items-center gap-1 text-xs sm:text-sm font-black">
                            <span>🟢</span>
                            <span>4 · Dễ</span>
                          </span>
                          <span className="text-[10px] text-emerald-300/80">Phản xạ nhanh</span>
                        </button>
                      </div>

                      {/* Flip Hint & Keyboard Shortcut Reminder */}
                      <div className="text-center pt-1 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors">
                          <RotateCcw className="w-3 h-3" /> Chạm vùng trống để lật lại mặt trước
                        </span>
                        <span className="hidden sm:inline">Phím tắt: 1 (Quên) • 2 (Khó) • 3 (Tốt) • 4 (Dễ)</span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          </>
        ) : !internalCompleted ? (
          /* Safe transition state if currentWord is temporarily pending */
          <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-4 max-w-sm">
            <Sparkles className="w-8 h-8 text-emerald-400 mx-auto animate-pulse" />
            <p className="text-sm font-semibold text-slate-200">Đang chuẩn bị thẻ học...</p>
            <button
              type="button"
              onClick={onExitSession}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Quay lại danh sách
            </button>
          </div>
        ) : (
          /* =================================================================== */
          /* 5. BENTO GRID SESSION SUMMARY (Completion Protocol)                 */
          /* =================================================================== */
          <div className="w-full max-w-3xl space-y-4 animate-in fade-in zoom-in-95 duration-400">
            <div className="text-center mb-6 space-y-2">
              <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Hoàn thành Phiên Tập Trung Đắm Chìm
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Chúc mừng bạn đã hoàn thành trọn vẹn buổi rèn luyện trong Focus Chamber!
              </p>
            </div>

            {/* Bento Grid 4 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Time & Volume */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    Thời gian & Khối lượng
                  </span>
                  <div className="text-2xl font-black text-white">
                    {sessionDurationFormatted}
                  </div>
                  <span className="text-xs text-slate-500">
                    {sessionWords.length} từ đã được nạp vào trí nhớ
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Accuracy & Max Streak */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    Độ chính xác & Streak
                  </span>
                  <div className="text-2xl font-black text-emerald-400">
                    {accuracyPercent}%
                  </div>
                  <span className="text-xs text-slate-500">
                    Chuỗi dài nhất: <strong className="text-amber-400">🔥 x{maxCombo}</strong>
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: Mastered vs Review Needed words */}
              <div className="sm:col-span-2 p-5 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400 uppercase tracking-wider text-[11px]">
                    Phân loại từ vựng trong phiên
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-emerald-400">✅ {masteredList.length} Đã nhớ</span>
                    <span className="text-rose-400">⚠️ {needsReviewList.length} Cần ôn</span>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 [scrollbar-gutter:stable]">
                  {reviewedWords.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{getWordTerm(item?.word)}</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {getWordPhonetic(item?.word)}
                        </span>
                        <span className="text-slate-400 truncate max-w-xs">
                          - {getWordMeaning(item?.word)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.rating >= 3
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {item.rating === 4
                          ? 'Dễ'
                          : item.rating === 3
                          ? 'Nhớ'
                          : item.rating === 2
                          ? 'Mơ hồ'
                          : 'Quên'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Action Controls */}
              <div className="sm:col-span-2 flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                {needsReviewList.length > 0 && onReviewMistakes && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        onReviewMistakes(needsReviewList);
                      } catch (err) {
                        console.warn('onReviewMistakes error:', err);
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Ôn lại {needsReviewList.length} từ cần củng cố</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onRestartSession}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Luyện tập lượt mới</span>
                </button>

                <button
                  type="button"
                  onClick={onExitSession}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Hoàn tất & Về sảnh</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 3. TACTILE KEYCAP DOCK (Mechanical Keycaps with Real Haptic Sinks)   */}
      {/* =================================================================== */}
      <footer
        data-testid="tactile-keycap-dock"
        className="relative z-20 w-full px-4 pb-6 pt-2 flex flex-col items-center justify-center"
      >
        <div className="p-2 rounded-3xl bg-slate-950/90 border border-white/10 backdrop-blur-2xl shadow-2xl flex items-center gap-2 max-w-xl w-full justify-between sm:justify-center overflow-x-auto">
          {activePracticeMode === 'listening' ? (
            !isListeningEvaluated ? (
              /* Listening In-Progress Dock */
              <>
                <button
                  type="button"
                  onClick={() => {
                    triggerKeycapPress('R');
                    handlePlayAudio(1.0);
                  }}
                  className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 font-bold text-xs transition-transform flex items-center justify-center gap-2 cursor-pointer active:translate-y-[2px] ${
                    activeKeycap === 'R' ? 'ring-2 ring-indigo-400' : ''
                  }`}
                >
                  <Volume2 className="w-4 h-4 text-indigo-300" />
                  <span>Nghe chuẩn (R)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerKeycapPress('S');
                    handlePlayAudio(0.72);
                  }}
                  className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-slate-900 border border-indigo-500/30 text-indigo-300 font-bold text-xs transition-transform flex items-center justify-center gap-2 cursor-pointer active:translate-y-[2px] ${
                    activeKeycap === 'S' ? 'ring-2 ring-indigo-400' : ''
                  }`}
                >
                  <Volume1 className="w-4 h-4 text-indigo-400" />
                  <span>Chậm 0.75x (S)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerKeycapPress('H');
                    setShowListeningHint((prev) => !prev);
                  }}
                  className="px-3 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </>
            ) : (
              /* Listening Evaluated Dock: 1 Again, 2 Hard, 3 Good, 4 Easy */
              <>
                <button
                  type="button"
                  disabled={isTransitioning}
                  onClick={() => {
                    setIsListeningEvaluated(false);
                    setListeningInput('');
                    setListeningEval(null);
                  }}
                  className="px-3 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  title="Thử lại"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lại</span>
                </button>
                <button
                  type="button"
                  disabled={isTransitioning}
                  onClick={() => {
                    triggerKeycapPress('1');
                    handleRateRating(1);
                  }}
                  className="flex-1 min-h-[48px] py-2.5 px-2 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-100 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer active:translate-y-[2px]"
                >
                  <span>🔴</span>
                  <span>Chưa thuộc</span>
                </button>
                <button
                  type="button"
                  disabled={isTransitioning}
                  onClick={() => {
                    triggerKeycapPress('2');
                    handleRateRating(2);
                  }}
                  className="flex-1 min-h-[48px] py-2.5 px-2 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-100 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer active:translate-y-[2px]"
                >
                  <span>🟡</span>
                  <span>Nhớ sơ sơ</span>
                </button>
                <button
                  type="button"
                  disabled={isTransitioning}
                  onClick={() => {
                    triggerKeycapPress('3');
                    handleRateRating(4);
                  }}
                  className="flex-1 min-h-[48px] py-2.5 px-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-100 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer active:translate-y-[2px]"
                >
                  <span>🟢</span>
                  <span>Đã nhớ rõ</span>
                </button>
              </>
            )
          ) : !internalRevealed ? (
            /* Front Dock: Space to Flip, R to Pronounce, H for Hint */
            <>
              <button
                type="button"
                disabled={isTransitioning}
                onClick={() => {
                  triggerKeycapPress('Space');
                  handleRevealCard();
                }}
                className={`flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 text-white font-bold text-xs shadow-lg transition-transform flex items-center justify-center gap-2 active:translate-y-[3px] active:shadow-none ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${activeKeycap === 'Space' ? 'translate-y-[3px] ring-2 ring-emerald-500' : ''}`}
                style={{
                  boxShadow: '0 4px 0 #1e293b, 0 8px 12px rgba(0,0,0,0.5)'
                }}
              >
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-emerald-400">
                  Space
                </span>
                <span>Lật thẻ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerKeycapPress('R');
                  handlePlayAudio(1.0);
                }}
                className={`px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-transform cursor-pointer flex items-center gap-1.5 active:translate-y-[3px] ${
                  activeKeycap === 'R' ? 'translate-y-[3px] ring-2 ring-emerald-500' : ''
                }`}
                style={{
                  boxShadow: '0 3px 0 #0f172a'
                }}
              >
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400">
                  R
                </span>
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerKeycapPress('H');
                  setShowHint((prev) => !prev);
                }}
                className={`px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-transform cursor-pointer flex items-center gap-1.5 active:translate-y-[3px] ${
                  activeKeycap === 'H' ? 'translate-y-[3px] ring-2 ring-amber-500' : ''
                }`}
                style={{
                  boxShadow: '0 3px 0 #0f172a'
                }}
              >
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400">
                  H
                </span>
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            /* Back Dock: Flip Back, 1 Again, 2 Hard, 3 Good, 4 Easy */
            <>
              {/* Lật lại mặt trước */}
              <button
                type="button"
                disabled={isTransitioning}
                onClick={() => {
                  triggerKeycapPress('Space');
                  handleRevealCard();
                }}
                className={`px-3 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-transform flex flex-col sm:flex-row items-center justify-center gap-1 active:translate-y-[3px] ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${activeKeycap === 'Space' ? 'translate-y-[3px] ring-2 ring-emerald-500' : ''}`}
                title="Lật lại mặt trước (Space)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lật lại</span>
              </button>

              {/* [1] 🔴 Quên (Học lại) */}
              <button
                type="button"
                disabled={isTransitioning}
                onClick={() => {
                  triggerKeycapPress('1');
                  handleRateRating(1);
                }}
                className={`flex-1 py-2.5 px-1.5 sm:px-2.5 min-h-[50px] rounded-2xl bg-gradient-to-b from-rose-900/80 to-rose-950 border border-rose-500/40 text-rose-100 font-bold text-xs sm:text-sm transition-transform flex flex-col sm:flex-row items-center justify-center gap-1 active:translate-y-[2px] active:scale-95 ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${activeKeycap === '1' ? 'ring-2 ring-rose-400' : ''}`}
                style={{
                  boxShadow: '0 4px 0 #4c0519, 0 8px 12px rgba(0,0,0,0.5)'
                }}
                title="Quên · Học lại (Phím 1)"
              >
                <span className="text-sm shrink-0">🔴</span>
                <span className="font-black text-xs sm:text-sm">Quên</span>
                <span className="text-[10px] text-rose-300 hidden md:inline">(Học lại)</span>
              </button>

              {/* [2] 🟡 Khó (Nhớ mơ màng) */}
              <button
                type="button"
                disabled={isTransitioning}
                onClick={() => {
                  triggerKeycapPress('2');
                  handleRateRating(2);
                }}
                className={`flex-1 py-2.5 px-1.5 sm:px-2.5 min-h-[50px] rounded-2xl bg-gradient-to-b from-amber-900/80 to-amber-950 border border-amber-500/40 text-amber-100 font-bold text-xs sm:text-sm transition-transform flex flex-col sm:flex-row items-center justify-center gap-1 active:translate-y-[2px] active:scale-95 ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${activeKeycap === '2' ? 'ring-2 ring-amber-400' : ''}`}
                style={{
                  boxShadow: '0 4px 0 #451a03, 0 8px 12px rgba(0,0,0,0.5)'
                }}
                title="Khó · Mơ màng (Phím 2)"
              >
                <span className="text-sm shrink-0">🟡</span>
                <span className="font-black text-xs sm:text-sm">Khó</span>
                <span className="text-[10px] text-amber-300 hidden md:inline">(Mơ màng)</span>
              </button>

              {/* [3] 🔵 Tốt (Đúng lúc) */}
              <button
                type="button"
                disabled={isTransitioning}
                onClick={() => {
                  triggerKeycapPress('3');
                  handleRateRating(3);
                }}
                className={`flex-1 py-2.5 px-1.5 sm:px-2.5 min-h-[50px] rounded-2xl bg-gradient-to-b from-sky-900/80 to-sky-950 border border-sky-500/40 text-sky-100 font-bold text-xs sm:text-sm transition-transform flex flex-col sm:flex-row items-center justify-center gap-1 active:translate-y-[2px] active:scale-95 ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${activeKeycap === '3' ? 'ring-2 ring-sky-400' : ''}`}
                style={{
                  boxShadow: '0 4px 0 #0c4a6e, 0 8px 12px rgba(0,0,0,0.5)'
                }}
                title="Tốt · Đúng lúc (Phím 3)"
              >
                <span className="text-sm shrink-0">🔵</span>
                <span className="font-black text-xs sm:text-sm">Tốt</span>
                <span className="text-[10px] text-sky-300 hidden md:inline">(Đúng lúc)</span>
              </button>

              {/* [4] 🟢 Dễ (Phản xạ nhanh) */}
              <button
                type="button"
                disabled={isTransitioning}
                onClick={() => {
                  triggerKeycapPress('4');
                  handleRateRating(4);
                }}
                className={`flex-1 py-2.5 px-1.5 sm:px-2.5 min-h-[50px] rounded-2xl bg-gradient-to-b from-emerald-800 to-emerald-950 border border-emerald-400/50 text-emerald-100 font-bold text-xs sm:text-sm transition-transform flex flex-col sm:flex-row items-center justify-center gap-1 active:translate-y-[2px] active:scale-95 ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${activeKeycap === '4' ? 'ring-2 ring-emerald-400' : ''}`}
                style={{
                  boxShadow: '0 4px 0 #064e3b, 0 8px 12px rgba(0,0,0,0.5)'
                }}
                title="Dễ · Phản xạ nhanh (Phím 4)"
              >
                <span className="text-sm shrink-0">🟢</span>
                <span className="font-black text-xs sm:text-sm">Dễ</span>
                <span className="text-[10px] text-emerald-300 hidden md:inline">(Thành thạo)</span>
              </button>
            </>
          )}
        </div>
      </footer>

      {/* =================================================================== */}
      {/* 4. COMPANION MASCOT CORNER (Lumi Live Expression)                   */}
      {/* =================================================================== */}
      <div className="hidden sm:block absolute bottom-28 right-8 z-30 pointer-events-none transition-transform duration-500">
        <div className="relative group pointer-events-auto">
          <div className="scale-75 origin-bottom-right">
            <LiveMascotCharacter
              mood={mascotMood}
              size="normal"
              interactive={true}
              tooltipText={
                streakCombo >= 5
                  ? 'Tuyệt vời! Bạn đang trong dòng chảy tập trung sâu (Flow State)!'
                  : isShaking
                  ? 'Đừng lo! Lặp lại nhiều lần sẽ khắc sâu vào trí nhớ dài hạn.'
                  : 'Hãy tập trung ghi nhớ từ vựng này nhé!'
              }
            />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. MODAL XÁC NHẬN THOÁT PHÒNG HỌC (Exit Modal)                      */}
      {/* =================================================================== */}
      {showExitConfirm && (
        <div
          data-testid="focus-exit-modal"
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Bạn muốn tạm dừng phiên học?</h3>
              <p className="text-xs text-slate-400">
                Tiến độ của các từ bạn vừa ôn luyện đã được tự động lưu an toàn vào hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Tiếp tục học
              </button>
              <button
                type="button"
                onClick={() => {
                  chamberAudio.stopAll();
                  onExitSession();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Rời phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
