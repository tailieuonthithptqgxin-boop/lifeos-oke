// ==============================================================================
// SPATIAL AUDIO ENGINE - PROCEDURAL WEB AUDIO SYNTHESIZER
// Zero external .mp3/.wav dependencies - 100% offline & instant playback
// ==============================================================================

import { globalVolumeManager } from '../../../lib/globalVolumeManager';

class SpatialAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private ambientDroneGain: GainNode | null = null;
  private isDronePlaying: boolean = false;
  private activeOscillators: OscillatorNode[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      globalVolumeManager.subscribe(() => {
        this.updateMasterGain();
      });
    }
  }

  public updateMasterGain() {
    if (!this.ctx || !this.masterGain) return;
    const vol = globalVolumeManager.getEffectiveMusicVolume(); // 0 to 100
    const targetGain = (this.isMuted || vol === 0) ? 0 : (vol / 100) * 0.7;
    try {
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    } catch {}
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.updateMasterGain();
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : 0.7,
        this.ctx.currentTime,
        0.05
      );
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // 1. Procedural Ambient Cyber-Zen Drone (48Hz fundamental + 96Hz octave + soft harmonic filter)
  public startAmbientDrone() {
    if (this.isDronePlaying) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      this.ambientDroneGain = this.ctx.createGain();
      this.ambientDroneGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.ambientDroneGain.gain.exponentialRampToValueAtTime(0.25, this.ctx.currentTime + 3.0);
      this.ambientDroneGain.connect(this.masterGain);

      // Low-pass filter for velvety space warmth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.5, this.ctx.currentTime);
      filter.connect(this.ambientDroneGain);

      // Fundamental deep bass oscillator
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(48, this.ctx.currentTime); // C1
      osc1.connect(filter);
      osc1.start();
      this.activeOscillators.push(osc1);

      // Second detuned harmonic oscillator for cosmic chorus width
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(72.5, this.ctx.currentTime); // D1# detuned
      osc2.connect(filter);
      osc2.start();
      this.activeOscillators.push(osc2);

      // Ethereal fifth
      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(144, this.ctx.currentTime);
      osc3.connect(filter);
      osc3.start();
      this.activeOscillators.push(osc3);

      this.isDronePlaying = true;
    } catch (e) {
      console.warn('[SpatialAudio] Drone initialization error:', e);
    }
  }

  public stopAmbientDrone() {
    if (!this.isDronePlaying || !this.ctx || !this.ambientDroneGain) return;
    try {
      this.ambientDroneGain.gain.setValueAtTime(this.ambientDroneGain.gain.value, this.ctx.currentTime);
      this.ambientDroneGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
      setTimeout(() => {
        this.activeOscillators.forEach(osc => {
          try { osc.stop(); osc.disconnect(); } catch {}
        });
        this.activeOscillators = [];
        this.isDronePlaying = false;
      }, 1050);
    } catch {
      this.isDronePlaying = false;
    }
  }

  // 2. High-Tech Holographic Hover Tick (Micro-sine click)
  public playHoverSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  }

  public playHoverSparkle() {
    this.playHoverSound();
  }

  // 3. Spatial Click / Quantum Warp Impact Boom
  public playSelectSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }

  // 4. Warp Transition Whoosh (When jumping between zones)
  public playWarpWhoosh() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.4);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.52);
    } catch {}
  }
}

export const spatialAudio = new SpatialAudioEngine();
