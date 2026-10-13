// Web Audio API Procedural Sound Engine
// Zero external mp3 dependencies, works 100% offline and instantaneous latency!
import { hapticEngine } from './hapticEngine';

export type SoundpackId = 'modern_pop' | 'mechanical_thock' | 'water_drop' | 'arcade_8bit';

export interface SoundpackConfig {
  id: SoundpackId;
  name: string;
  emoji: string;
  description: string;
}

export const SOUNDPACKS: Record<SoundpackId, SoundpackConfig> = {
  modern_pop: {
    id: 'modern_pop',
    name: 'Modern Pop',
    emoji: '🫧',
    description: 'Bong bóng vỡ pop nhẹ nhàng, thanh thoát'
  },
  mechanical_thock: {
    id: 'mechanical_thock',
    name: 'Thocky Mechanical',
    emoji: '⌨️',
    description: 'Tiếng phím cơ switch bôi trơn thocky cực phê tai'
  },
  water_drop: {
    id: 'water_drop',
    name: 'Water Drop',
    emoji: '💧',
    description: 'Giọt nước rơi trong trẻo, thư giãn chữa lành ASMR'
  },
  arcade_8bit: {
    id: 'arcade_8bit',
    name: '8-Bit Arcade',
    emoji: '👾',
    description: 'Âm thanh điện tử retro game thùng thập niên 90'
  }
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private soundpack: SoundpackId = 'modern_pop';

  constructor() {
    try {
      const saved = localStorage.getItem('lifeos_sfx_enabled');
      this.enabled = saved !== null ? saved === 'true' : true;
      const savedPack = localStorage.getItem('lifeos_soundpack') as SoundpackId;
      if (savedPack && SOUNDPACKS[savedPack]) {
        this.soundpack = savedPack;
      }
    } catch {
      this.enabled = true;
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('lifeos_sfx_enabled', String(val));
    } catch {}
  }

  public getSoundpack(): SoundpackId {
    return this.soundpack;
  }

  public setSoundpack(pack: SoundpackId) {
    if (!SOUNDPACKS[pack]) return;
    this.soundpack = pack;
    try {
      localStorage.setItem('lifeos_soundpack', pack);
    } catch {}
    this.playPop();
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.playPop();
    }
    return this.enabled;
  }

  // 1. Pop Sound (Dopamine checkmark / button click)
  public playPop() {
    hapticEngine.trigger('light');
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Procedural sound based on selected soundpack
    if (this.soundpack === 'mechanical_thock') {
      // Mechanical keyboard switch 'thock' (punchy low frequency transient)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.05);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
      return;
    }

    if (this.soundpack === 'water_drop') {
      // Natural organic water droplet
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(1750, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(1350, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      return;
    }

    if (this.soundpack === 'arcade_8bit') {
      // 8-bit retro arcade blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.035);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      return;
    }

    // Default: Modern Pop sine sweep (400Hz -> 880Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // 2. Success / Level Up / Quest Done Chime
  public playSuccess() {
    hapticEngine.trigger('success');
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Pleasant chord: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  // 3. Card Flip / Flashcard Swish
  public playFlip() {
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.06);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // 4. Bell Ding (Focus session finish)
  public playBell() {
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  // 5. Grand Celebration Arpeggio (Quest done, 100% habits)
  public playCelebration() {
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C5, E5, G5, B5, C6 arpeggio with shimmer
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.14, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  // 6. Cute Companion Speech Synthesis via Web Speech API
  public speak(text: string, lang: string = 'vi-VN') {
    if (!this.enabled || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Slightly lively rate
      utterance.pitch = 1.2; // Cute higher pitch for cute mascot feel
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Graceful fallback if speech synthesis is blocked
    }
  }

  // 7. Treasure Chest Open (Mystical ascending twinkle)
  public playChestOpen() {
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // 8. Coin Shower (Metallic coins clicking)
  public playCoinShower() {
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + i * 0.05 + Math.random() * 0.02;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800 + i * 150, startTime);
      osc.frequency.exponentialRampToValueAtTime(2400 + i * 100, startTime + 0.08);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.09);
    }
  }

  // 9. Level Up Epic Fanfare
  public playLevelUpFanfare() {
    if (!this.enabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chords = [
      { t: 0, f: [523.25, 659.25, 783.99] },      // C major
      { t: 0.18, f: [587.33, 739.99, 880.00] },  // D major
      { t: 0.36, f: [659.25, 830.61, 987.77] },  // E major
      { t: 0.54, f: [783.99, 987.77, 1174.66, 1567.98] } // G major with high G
    ];

    chords.forEach(chord => {
      chord.f.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + chord.t;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    });
  }
}

export const soundEngine = new SoundEngine();
