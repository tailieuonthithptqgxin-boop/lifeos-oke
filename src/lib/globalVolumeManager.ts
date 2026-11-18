/**
 * LifeOS Unified Global Audio & Volume Management System
 * Single Source of Truth for:
 * 1. Master Volume (0-100%) & Global Mute/Unmute
 * 2. Focus Music (YouTube) & Procedural Ambient Sound (Rain, Cafe, Keystrokes, Alpha Waves)
 * 3. Dopamine SFX & Notification Chimes
 * 4. Voice / SpeechSynthesis Pronunciation Player
 * 5. Spatial 3D Audio Synthesizer
 *
 * Provides real-time audio scaling, state persistence to LocalStorage, and a React Hook.
 */
import { useState, useEffect } from 'react';

export interface GlobalVolumeState {
  masterVolume: number; // 0 to 100
  isMuted: boolean;
  previousVolume: number; // Preserves volume level on mute for clean unmute restoration
  musicVolume: number; // 0 to 100 (Focus Music & Ambient Sounds)
  sfxVolume: number; // 0 to 100 (Dopamine Clicks, Quests, Notifications)
  voiceVolume: number; // 0 to 100 (SpeechSynthesis & Pronunciation)
}

export type VolumeListener = (state: GlobalVolumeState) => void;

const STORAGE_KEYS = {
  MASTER_VOL: 'lifeos_master_volume',
  MUTED: 'lifeos_master_muted',
  PREV_VOL: 'lifeos_master_prev_vol',
  MUSIC_VOL: 'lifeos_music_volume',
  SFX_VOL: 'lifeos_sfx_volume',
  VOICE_VOL: 'lifeos_voice_volume'
};

function safeGetNumber(key: string, defaultVal: number, min = 0, max = 100): number {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= min && num <= max) return num;
    }
  } catch {}
  return defaultVal;
}

function safeGetBool(key: string, defaultVal: boolean): boolean {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return raw === 'true';
  } catch {}
  return defaultVal;
}

function safeSetItem(key: string, val: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, val);
  } catch {}
}

class GlobalVolumeManager {
  private state: GlobalVolumeState;
  private listeners: Set<VolumeListener> = new Set();

  constructor() {
    const masterVolume = safeGetNumber(STORAGE_KEYS.MASTER_VOL, 80);
    const isMuted = safeGetBool(STORAGE_KEYS.MUTED, false);
    const previousVolume = safeGetNumber(STORAGE_KEYS.PREV_VOL, 80, 1, 100);
    const musicVolume = safeGetNumber(STORAGE_KEYS.MUSIC_VOL, 75);
    const sfxVolume = safeGetNumber(STORAGE_KEYS.SFX_VOL, 85);
    const voiceVolume = safeGetNumber(STORAGE_KEYS.VOICE_VOL, 90);

    this.state = {
      masterVolume,
      isMuted,
      previousVolume,
      musicVolume,
      sfxVolume,
      voiceVolume
    };
  }

  public getState(): GlobalVolumeState {
    return { ...this.state };
  }

  public getEffectiveMasterVolume(): number {
    return this.state.isMuted ? 0 : this.state.masterVolume;
  }

  public getEffectiveMusicVolume(): number {
    if (this.state.isMuted) return 0;
    return Math.round((this.state.masterVolume / 100) * this.state.musicVolume);
  }

  public getEffectiveSfxVolume(): number {
    if (this.state.isMuted) return 0;
    return Math.round((this.state.masterVolume / 100) * this.state.sfxVolume);
  }

  public getEffectiveVoiceVolume(): number {
    if (this.state.isMuted) return 0;
    return Math.round((this.state.masterVolume / 100) * this.state.voiceVolume);
  }

  public subscribe(listener: VolumeListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = { ...this.state };
    this.listeners.forEach(fn => {
      try {
        fn(copy);
      } catch (e) {
        console.warn('[GlobalVolumeManager] listener error:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lifeos-global-volume-change', {
          detail: {
            ...copy,
            effectiveMaster: this.getEffectiveMasterVolume(),
            effectiveMusic: this.getEffectiveMusicVolume(),
            effectiveSfx: this.getEffectiveSfxVolume(),
            effectiveVoice: this.getEffectiveVoiceVolume()
          }
        })
      );
    }
  }

  // --- Master Volume Controls ---
  public setMasterVolume(val: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    const wasMuted = this.state.isMuted;

    this.state.masterVolume = clamped;
    safeSetItem(STORAGE_KEYS.MASTER_VOL, String(clamped));

    if (clamped > 0 && wasMuted) {
      this.state.isMuted = false;
      safeSetItem(STORAGE_KEYS.MUTED, 'false');
    } else if (clamped === 0 && !wasMuted) {
      this.state.isMuted = true;
      safeSetItem(STORAGE_KEYS.MUTED, 'true');
    }

    if (clamped > 0) {
      this.state.previousVolume = clamped;
      safeSetItem(STORAGE_KEYS.PREV_VOL, String(clamped));
    }

    this.notify();
  }

  public adjustMasterVolume(delta: number) {
    const current = this.state.isMuted ? 0 : this.state.masterVolume;
    this.setMasterVolume(current + delta);
  }

  public toggleMute(): boolean {
    if (this.state.isMuted) {
      // Unmute: restore previous volume
      const restoreVol = this.state.previousVolume > 0 ? this.state.previousVolume : 70;
      this.state.isMuted = false;
      this.state.masterVolume = restoreVol;
      safeSetItem(STORAGE_KEYS.MUTED, 'false');
      safeSetItem(STORAGE_KEYS.MASTER_VOL, String(restoreVol));
    } else {
      // Mute: save current volume to previousVolume and set mute flag
      if (this.state.masterVolume > 0) {
        this.state.previousVolume = this.state.masterVolume;
        safeSetItem(STORAGE_KEYS.PREV_VOL, String(this.state.masterVolume));
      }
      this.state.isMuted = true;
      safeSetItem(STORAGE_KEYS.MUTED, 'true');
    }

    this.notify();
    return this.state.isMuted;
  }

  public setMuted(muted: boolean) {
    if (this.state.isMuted === muted) return;
    this.toggleMute();
  }

  // --- Channel Controls ---
  public setMusicVolume(val: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    this.state.musicVolume = clamped;
    safeSetItem(STORAGE_KEYS.MUSIC_VOL, String(clamped));
    this.notify();
  }

  public setSfxVolume(val: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    this.state.sfxVolume = clamped;
    safeSetItem(STORAGE_KEYS.SFX_VOL, String(clamped));
    this.notify();
  }

  public setVoiceVolume(val: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    this.state.voiceVolume = clamped;
    safeSetItem(STORAGE_KEYS.VOICE_VOL, String(clamped));
    this.notify();
  }
}

export const globalVolumeManager = new GlobalVolumeManager();

// Reactive React Hook for UI components
export function useGlobalVolume() {
  const [volState, setVolState] = useState<GlobalVolumeState>(() => globalVolumeManager.getState());

  useEffect(() => {
    return globalVolumeManager.subscribe((nextState) => {
      setVolState(nextState);
    });
  }, []);

  const effectiveVolume = volState.isMuted ? 0 : volState.masterVolume;

  return {
    ...volState,
    effectiveVolume,
    effectiveMasterVolume: effectiveVolume,
    effectiveMusicVolume: volState.isMuted ? 0 : Math.round((volState.masterVolume / 100) * volState.musicVolume),
    effectiveSfxVolume: volState.isMuted ? 0 : Math.round((volState.masterVolume / 100) * volState.sfxVolume),
    effectiveVoiceVolume: volState.isMuted ? 0 : Math.round((volState.masterVolume / 100) * volState.voiceVolume),
    setMasterVolume: (val: number) => globalVolumeManager.setMasterVolume(val),
    adjustMasterVolume: (delta: number) => globalVolumeManager.adjustMasterVolume(delta),
    toggleMute: () => globalVolumeManager.toggleMute(),
    setMuted: (muted: boolean) => globalVolumeManager.setMuted(muted),
    setMusicVolume: (val: number) => globalVolumeManager.setMusicVolume(val),
    setSfxVolume: (val: number) => globalVolumeManager.setSfxVolume(val),
    setVoiceVolume: (val: number) => globalVolumeManager.setVoiceVolume(val)
  };
}
