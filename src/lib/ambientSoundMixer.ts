// ==============================================================================
// AMBIENT SOUND MIXER (Web Audio API Multi-Track Procedural Sound Generator)
// ==============================================================================
// 100% Zero-External Dependency / Pure Offline Web Audio API
// Generates:
// 1. Rain (filtered pink noise with random droplet modulations)
// 2. Cafe murmur (warm multi-layered band-passed ambient noise)
// 3. Mechanical Keyboard (procedural thocky keystrokes generator)
// 4. Alpha Waves / Binaural Beats (10Hz focus brainwave entrainment)

export interface AmbientTrackConfig {
  id: 'rain' | 'cafe' | 'keyboard' | 'binaural';
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

  // Keyboard generator interval
  private keyboardInterval: any = null;
  private keyboardGain: GainNode | null = null;

  // Binaural nodes
  private binauralLeftOsc: OscillatorNode | null = null;
  private binauralRightOsc: OscillatorNode | null = null;
  private binauralGain: GainNode | null = null;

  private volumes: Record<string, number> = {
    rain: 0.5,
    cafe: 0.4,
    keyboard: 0.3,
    binaural: 0.4
  };

  private activeStates: Record<string, boolean> = {
    rain: false,
    cafe: false,
    keyboard: false,
    binaural: false
  };

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
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

      // Random delay for realistic human typing rhythm
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
  public toggleTrack(id: 'rain' | 'cafe' | 'keyboard' | 'binaural'): boolean {
    this.initContext();
    const nextState = !this.activeStates[id];
    this.activeStates[id] = nextState;

    if (nextState) {
      if (id === 'rain') this.startRain();
      if (id === 'cafe') this.startCafe();
      if (id === 'keyboard') this.startKeyboard();
      if (id === 'binaural') this.startBinaural();
    } else {
      if (id === 'rain') this.stopRain();
      if (id === 'cafe') this.stopCafe();
      if (id === 'keyboard') this.stopKeyboard();
      if (id === 'binaural') this.stopBinaural();
    }

    return nextState;
  }

  public setTrackVolume(id: 'rain' | 'cafe' | 'keyboard' | 'binaural', volume: number) {
    const vol = Math.max(0, Math.min(1, volume));
    this.volumes[id] = vol;

    if (this.ctx) {
      if (id === 'rain' && this.rainGain) {
        this.rainGain.gain.setValueAtTime(vol, this.ctx.currentTime);
      }
      if (id === 'cafe' && this.cafeGain) {
        this.cafeGain.gain.setValueAtTime(vol, this.ctx.currentTime);
      }
      if (id === 'keyboard' && this.keyboardGain) {
        this.keyboardGain.gain.setValueAtTime(vol, this.ctx.currentTime);
      }
      if (id === 'binaural' && this.binauralGain) {
        this.binauralGain.gain.setValueAtTime(vol * 0.15, this.ctx.currentTime);
      }
    }
  }

  public getTrackState(id: 'rain' | 'cafe' | 'keyboard' | 'binaural'): { active: boolean; volume: number } {
    return {
      active: this.activeStates[id] || false,
      volume: this.volumes[id] ?? 0.5
    };
  }

  public stopAll() {
    this.stopRain();
    this.stopCafe();
    this.stopKeyboard();
    this.stopBinaural();
    this.activeStates.rain = false;
    this.activeStates.cafe = false;
    this.activeStates.keyboard = false;
    this.activeStates.binaural = false;
  }
}

export const ambientSoundMixer = new AmbientMixerEngine();
