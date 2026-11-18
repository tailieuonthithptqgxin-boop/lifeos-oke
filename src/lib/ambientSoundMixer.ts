// ==============================================================================
// AMBIENT SOUND MIXER (Web Audio API Multi-Track Procedural Sound Generator)
// ==============================================================================
// 100% Zero-External Dependency / Pure Offline Web Audio API
// Generates:
// 1. Rain (filtered pink noise with random droplet modulations)
// 2. Cafe murmur (warm multi-layered band-passed ambient noise)
// 3. Campfire (crackling low flame rumble + random snapping embers)
// 4. Lo-Fi Chill (warm dual-oscillator resonant ambient chord pad)
// 5. Mechanical Keyboard (procedural thocky keystrokes generator)
// 6. Alpha Waves / Binaural Beats (10Hz focus brainwave entrainment)

import { globalVolumeManager } from './globalVolumeManager';

export type AmbientTrackId = 'rain' | 'cafe' | 'campfire' | 'lofi' | 'keyboard' | 'binaural';

export interface AmbientTrackConfig {
  id: AmbientTrackId;
  name: string;
  icon: string;
  description: string;
  volume: number; // 0.0 to 1.0
  active: boolean;
}

class AmbientMixerEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Rain nodes
  private rainSource: AudioNode | null = null;
  private rainGain: GainNode | null = null;

  // Cafe nodes
  private cafeSource: AudioNode | null = null;
  private cafeGain: GainNode | null = null;

  // Campfire nodes
  private campfireSource: AudioNode | null = null;
  private campfireGain: GainNode | null = null;
  private campfireInterval: any = null;

  // Lo-Fi Chill nodes
  private lofiOsc1: OscillatorNode | null = null;
  private lofiOsc2: OscillatorNode | null = null;
  private lofiOsc3: OscillatorNode | null = null;
  private lofiFilter: BiquadFilterNode | null = null;
  private lofiGain: GainNode | null = null;

  // Keyboard generator interval
  private keyboardInterval: any = null;
  private keyboardGain: GainNode | null = null;

  // Binaural nodes
  private binauralLeftOsc: OscillatorNode | null = null;
  private binauralRightOsc: OscillatorNode | null = null;
  private binauralGain: GainNode | null = null;

  private volumes: Record<AmbientTrackId, number> = {
    rain: 0.5,
    cafe: 0.4,
    campfire: 0.5,
    lofi: 0.45,
    keyboard: 0.3,
    binaural: 0.4
  };

  private activeStates: Record<AmbientTrackId, boolean> = {
    rain: false,
    cafe: false,
    campfire: false,
    lofi: false,
    keyboard: false,
    binaural: false
  };

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
    const targetGain = (vol / 100) * 0.8;
    try {
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    } catch {}
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.updateMasterGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Rain Generator (Pink Noise + Lowpass) ---
  private startRain() {
    if (!this.ctx || !this.masterGain) return;
    this.stopRain();

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(this.volumes.rain, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    whiteNoise.start();
    this.rainSource = whiteNoise;
  }

  private stopRain() {
    if (this.rainSource) {
      try { (this.rainSource as AudioBufferSourceNode).stop(); } catch {}
      this.rainSource = null;
    }
  }

  // --- Cafe Murmur Generator (Warm Bandpass Noise) ---
  private startCafe() {
    if (!this.ctx || !this.masterGain) return;
    this.stopCafe();

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.cafeGain = this.ctx.createGain();
    this.cafeGain.gain.setValueAtTime(this.volumes.cafe, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(this.cafeGain);
    this.cafeGain.connect(this.masterGain);

    source.start();
    this.cafeSource = source;
  }

  private stopCafe() {
    if (this.cafeSource) {
      try { (this.cafeSource as AudioBufferSourceNode).stop(); } catch {}
      this.cafeSource = null;
    }
  }

  // --- Campfire Generator (Warm Low Rumble + Crackling Embers) ---
  private startCampfire() {
    if (!this.ctx || !this.masterGain) return;
    this.stopCampfire();

    // Base rumble: Lowpass filtered noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.06;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);

    this.campfireGain = this.ctx.createGain();
    this.campfireGain.gain.setValueAtTime(this.volumes.campfire, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(this.campfireGain);
    this.campfireGain.connect(this.masterGain);
    source.start();
    this.campfireSource = source;

    // Embers crackle pops
    const triggerCrackle = () => {
      if (!this.ctx || !this.campfireGain || !this.activeStates.campfire) return;
      const osc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400 + Math.random() * 1200, this.ctx.currentTime);
      popGain.gain.setValueAtTime(0.18 + Math.random() * 0.15, this.ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(popGain);
      popGain.connect(this.campfireGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);

      const nextPopDelay = 150 + Math.random() * 500;
      this.campfireInterval = setTimeout(triggerCrackle, nextPopDelay);
    };

    triggerCrackle();
  }

  private stopCampfire() {
    if (this.campfireSource) {
      try { (this.campfireSource as AudioBufferSourceNode).stop(); } catch {}
      this.campfireSource = null;
    }
    if (this.campfireInterval) {
      clearTimeout(this.campfireInterval);
      this.campfireInterval = null;
    }
  }

  // --- Lo-Fi Chill Generator (Warm Resonant Chord Pad - Dm9/Fmaj7) ---
  private startLofi() {
    if (!this.ctx || !this.masterGain) return;
    this.stopLofi();

    // D3 (146.8Hz), F3 (174.6Hz), A3 (220.0Hz), C4 (261.6Hz)
    this.lofiOsc1 = this.ctx.createOscillator();
    this.lofiOsc1.type = 'sine';
    this.lofiOsc1.frequency.setValueAtTime(146.83, this.ctx.currentTime);

    this.lofiOsc2 = this.ctx.createOscillator();
    this.lofiOsc2.type = 'triangle';
    this.lofiOsc2.frequency.setValueAtTime(220.0, this.ctx.currentTime);

    this.lofiOsc3 = this.ctx.createOscillator();
    this.lofiOsc3.type = 'sine';
    this.lofiOsc3.frequency.setValueAtTime(261.63, this.ctx.currentTime);

    this.lofiFilter = this.ctx.createBiquadFilter();
    this.lofiFilter.type = 'lowpass';
    this.lofiFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.lofiFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.lofiGain = this.ctx.createGain();
    this.lofiGain.gain.setValueAtTime(this.volumes.lofi * 0.6, this.ctx.currentTime);

    this.lofiOsc1.connect(this.lofiFilter);
    this.lofiOsc2.connect(this.lofiFilter);
    this.lofiOsc3.connect(this.lofiFilter);
    this.lofiFilter.connect(this.lofiGain);
    this.lofiGain.connect(this.masterGain);

    this.lofiOsc1.start();
    this.lofiOsc2.start();
    this.lofiOsc3.start();
  }

  private stopLofi() {
    if (this.lofiOsc1) {
      try { this.lofiOsc1.stop(); } catch {}
      this.lofiOsc1 = null;
    }
    if (this.lofiOsc2) {
      try { this.lofiOsc2.stop(); } catch {}
      this.lofiOsc2 = null;
    }
    if (this.lofiOsc3) {
      try { this.lofiOsc3.stop(); } catch {}
      this.lofiOsc3 = null;
    }
  }

  // --- Mechanical Keyboard Procedural Keystroke Clicks ---
  private startKeyboard() {
    if (!this.ctx || !this.masterGain) return;
    this.stopKeyboard();

    this.keyboardGain = this.ctx.createGain();
    this.keyboardGain.gain.setValueAtTime(this.volumes.keyboard, this.ctx.currentTime);
    this.keyboardGain.connect(this.masterGain);

    const playKeystroke = () => {
      if (!this.ctx || !this.keyboardGain || !this.activeStates.keyboard) return;
      const osc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      
      const pitch = 220 + Math.random() * 60; // Thocky pitch
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.04);

      clickGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(clickGain);
      clickGain.connect(this.keyboardGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);

      const nextDelay = 120 + Math.random() * 260;
      this.keyboardInterval = setTimeout(playKeystroke, nextDelay);
    };

    playKeystroke();
  }

  private stopKeyboard() {
    if (this.keyboardInterval) {
      clearTimeout(this.keyboardInterval);
      this.keyboardInterval = null;
    }
  }

  // --- Binaural Beats (10Hz Alpha Waves for Focus) ---
  private startBinaural() {
    if (!this.ctx || !this.masterGain) return;
    this.stopBinaural();

    const merger = this.ctx.createChannelMerger(2);

    // Left ear: 200 Hz
    this.binauralLeftOsc = this.ctx.createOscillator();
    this.binauralLeftOsc.type = 'sine';
    this.binauralLeftOsc.frequency.setValueAtTime(200, this.ctx.currentTime);
    this.binauralLeftOsc.connect(merger, 0, 0);

    // Right ear: 210 Hz (10Hz differential = Alpha wave)
    this.binauralRightOsc = this.ctx.createOscillator();
    this.binauralRightOsc.type = 'sine';
    this.binauralRightOsc.frequency.setValueAtTime(210, this.ctx.currentTime);
    this.binauralRightOsc.connect(merger, 0, 1);

    this.binauralGain = this.ctx.createGain();
    this.binauralGain.gain.setValueAtTime(this.volumes.binaural * 0.15, this.ctx.currentTime);

    merger.connect(this.binauralGain);
    this.binauralGain.connect(this.masterGain);

    this.binauralLeftOsc.start();
    this.binauralRightOsc.start();
  }

  private stopBinaural() {
    if (this.binauralLeftOsc) {
      try { this.binauralLeftOsc.stop(); } catch {}
      this.binauralLeftOsc = null;
    }
    if (this.binauralRightOsc) {
      try { this.binauralRightOsc.stop(); } catch {}
      this.binauralRightOsc = null;
    }
  }

  // --- Public Controls ---
  public toggleTrack(id: AmbientTrackId): boolean {
    this.initContext();
    const nextState = !this.activeStates[id];
    this.activeStates[id] = nextState;

    if (nextState) {
      if (id === 'rain') this.startRain();
      if (id === 'cafe') this.startCafe();
      if (id === 'campfire') this.startCampfire();
      if (id === 'lofi') this.startLofi();
      if (id === 'keyboard') this.startKeyboard();
      if (id === 'binaural') this.startBinaural();
    } else {
      if (id === 'rain') this.stopRain();
      if (id === 'cafe') this.stopCafe();
      if (id === 'campfire') this.stopCampfire();
      if (id === 'lofi') this.stopLofi();
      if (id === 'keyboard') this.stopKeyboard();
      if (id === 'binaural') this.stopBinaural();
    }

    return nextState;
  }

  public setTrackVolume(id: AmbientTrackId, volume: number) {
    const vol = Math.max(0, Math.min(1, volume));
    this.volumes[id] = vol;

    if (this.ctx) {
      if (id === 'rain' && this.rainGain) {
        this.rainGain.gain.setValueAtTime(vol, this.ctx.currentTime);
      }
      if (id === 'cafe' && this.cafeGain) {
        this.cafeGain.gain.setValueAtTime(vol, this.ctx.currentTime);
      }
      if (id === 'campfire' && this.campfireGain) {
        this.campfireGain.gain.setValueAtTime(vol, this.ctx.currentTime);
      }
      if (id === 'lofi' && this.lofiGain) {
        this.lofiGain.gain.setValueAtTime(vol * 0.6, this.ctx.currentTime);
      }
      if (id === 'keyboard' && this.keyboardGain) {
        this.keyboardGain.gain.setValueAtTime(vol, this.ctx.currentTime);
      }
      if (id === 'binaural' && this.binauralGain) {
        this.binauralGain.gain.setValueAtTime(vol * 0.15, this.ctx.currentTime);
      }
    }
  }

  public getTrackState(id: AmbientTrackId): { active: boolean; volume: number } {
    return {
      active: this.activeStates[id] || false,
      volume: this.volumes[id] ?? 0.5
    };
  }

  public getTracks(): AmbientTrackConfig[] {
    return [
      { id: 'rain', name: 'Tiếng Mưa Rơi', icon: '🌧️', description: 'Tiếng mưa êm dịu, tăng cường tập trung', volume: this.volumes.rain ?? 0.5, active: Boolean(this.activeStates.rain) },
      { id: 'cafe', name: 'Quán Cà Phê', icon: '☕', description: 'Âm thanh quán cà phê ấm cúng', volume: this.volumes.cafe ?? 0.4, active: Boolean(this.activeStates.cafe) },
      { id: 'campfire', name: 'Lửa Trại', icon: '🔥', description: 'Tiếng củi lách tách ấm áp, thư giãn', volume: this.volumes.campfire ?? 0.5, active: Boolean(this.activeStates.campfire) },
      { id: 'lofi', name: 'Nhạc Lo-Fi Chill', icon: '🎧', description: 'Giai điệu lofi nhẹ nhàng, êm tai', volume: this.volumes.lofi ?? 0.45, active: Boolean(this.activeStates.lofi) },
      { id: 'keyboard', name: 'Gõ Phím Cơ', icon: '⌨️', description: 'Âm thanh phím cơ lách cách nhịp nhàng', volume: this.volumes.keyboard ?? 0.3, active: Boolean(this.activeStates.keyboard) },
      { id: 'binaural', name: 'Sóng Não 10Hz', icon: '🧠', description: 'Sóng âm kích thích sáng tạo & ghi nhớ', volume: this.volumes.binaural ?? 0.4, active: Boolean(this.activeStates.binaural) },
    ];
  }

  public stopAll() {
    this.stopRain();
    this.stopCafe();
    this.stopCampfire();
    this.stopLofi();
    this.stopKeyboard();
    this.stopBinaural();
    this.activeStates.rain = false;
    this.activeStates.cafe = false;
    this.activeStates.campfire = false;
    this.activeStates.lofi = false;
    this.activeStates.keyboard = false;
    this.activeStates.binaural = false;
  }
}

export const ambientSoundMixer = new AmbientMixerEngine();
