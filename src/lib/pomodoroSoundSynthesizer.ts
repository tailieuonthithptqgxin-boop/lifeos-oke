// --------------------------------------------------------------------------
// Pomodoro Web Audio API Synthesizer (100% Local, Zero External MP3)
// Generates crystal-clear, harmonic bell & chime sounds natively in browser
// Compatible with iOS Safari, Android Chrome, and Desktop
// --------------------------------------------------------------------------

export type PomodoroSoundType = 'zen' | 'energetic' | 'bell';
export type PomodoroPhaseType = 'FOCUS_END' | 'BREAK_END' | 'PREVIEW';

let audioCtx: AudioContext | null = null;

/**
 * Get or create browser AudioContext with auto-unlock for iOS & Android
 */
export function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Call on first touch/click to unlock audio on mobile browsers
 */
export function unlockAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
}

/**
 * Play synthesized chime alarm without any external audio file
 */
export function playPomodoroAlarm(
  soundType: PomodoroSoundType = 'zen',
  phase: PomodoroPhaseType = 'FOCUS_END',
  volume: number = 0.8
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Haptic vibration on mobile if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (phase === 'FOCUS_END') {
          navigator.vibrate([200, 100, 200, 100, 300]);
        } else {
          navigator.vibrate([150, 80, 150]);
        }
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.05, Math.min(1, volume)), now);
      masterGain.connect(ctx.destination);

      if (soundType === 'zen') {
        // ---------------------------------------------------------------
        // 1. ZEN TIBETAN SINGING BOWL / MEDITATION CHIME (528Hz Solfeggio)
        // Warm, resonant, long exponential decay ~2.8 seconds
        // ---------------------------------------------------------------
        const baseFreq = phase === 'BREAK_END' ? 440 : 528;
        const harmonics = [1, 2.01, 3.02, 4.05];
        const harmonicGains = [0.6, 0.25, 0.1, 0.05];

        harmonics.forEach((h, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq * h, now);

          // Subtle natural frequency shimmer
          osc.frequency.exponentialRampToValueAtTime(baseFreq * h * 0.998, now + 2.8);

          const peakGain = harmonicGains[i];
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(peakGain, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 2.85);
        });

        setTimeout(resolve, 2800);

      } else if (soundType === 'energetic') {
        // ---------------------------------------------------------------
        // 2. ENERGETIC HARMONIC MARIMBA / TINH TINH
        // Cheerful ascending arpeggio (C5 -> E5 -> G5 -> C6)
        // ---------------------------------------------------------------
        const notes = phase === 'BREAK_END' 
          ? [587.33, 739.99, 880.00] // D5 - F#5 - A5
          : [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6
        
        const noteDuration = 0.18;
        const totalDuration = notes.length * noteDuration + 1.2;

        notes.forEach((freq, idx) => {
          const noteStart = now + idx * noteDuration;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteStart);

          gain.gain.setValueAtTime(0.001, noteStart);
          gain.gain.linearRampToValueAtTime(0.5, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.2);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(noteStart);
          osc.stop(noteStart + 1.25);
        });

        setTimeout(resolve, Math.round(totalDuration * 1000));

      } else {
        // ---------------------------------------------------------------
        // 3. CRISP DIGITAL DUAL-TONE BELL (Clear & Penetrating)
        // High-clarity double-ping (880Hz -> 1760Hz) with resonant decay
        // ---------------------------------------------------------------
        const pings = phase === 'BREAK_END' 
          ? [{ freq: 880, delay: 0 }, { freq: 1174.66, delay: 0.22 }]
          : [{ freq: 880, delay: 0 }, { freq: 1760, delay: 0.22 }, { freq: 1318.51, delay: 0.44 }];

        pings.forEach(({ freq, delay }) => {
          const tStart = now + delay;
          const osc = ctx.createOscillator();
          const oscHarmonic = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, tStart);

          oscHarmonic.type = 'sine';
          oscHarmonic.frequency.setValueAtTime(freq * 2.02, tStart);

          gain.gain.setValueAtTime(0.001, tStart);
          gain.gain.linearRampToValueAtTime(0.4, tStart + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, tStart + 1.4);

          osc.connect(gain);
          oscHarmonic.connect(gain);
          gain.connect(masterGain);

          osc.start(tStart);
          oscHarmonic.start(tStart);
          osc.stop(tStart + 1.45);
          oscHarmonic.stop(tStart + 1.45);
        });

        setTimeout(resolve, 2200);
      }
    } catch (err) {
      console.warn('Pomodoro synthesizer audio playback notice:', err);
      resolve();
    }
  });
}
