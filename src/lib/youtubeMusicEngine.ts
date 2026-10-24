/**
 * YouTube Focus Music Engine & Player Service
 * Handles YouTube URL extraction, validation, curated presets, persistent favorites,
 * global playback state, volume management, and zero-reload iframe communication.
 */
import React, { useState, useEffect } from 'react';

export interface YouTubeTrack {
  id: string; // YouTube 11-char Video ID
  url: string;
  title: string;
  channel?: string;
  thumbnailUrl: string;
  category: 'lofi' | 'ambient' | 'classical' | 'piano' | 'nature' | 'custom';
  addedAt?: string;
}

export interface FocusMusicState {
  currentTrack: YouTubeTrack;
  isPlaying: boolean;
  volume: number; // 0 to 100
  isMuted: boolean;
  previousVolume: number; // For restoring on unmute
}

export type FocusMusicListener = (state: FocusMusicState) => void;

export const CURATED_FOCUS_TRACKS: YouTubeTrack[] = [
  {
    id: '5qap5aO4i9A',
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    title: 'Rain & Lo-Fi Waves',
    channel: 'Focus Mixtape',
    thumbnailUrl: 'https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg',
    category: 'lofi'
  },
  {
    id: 'xNN7iTA57jM',
    url: 'https://www.youtube.com/watch?v=xNN7iTA57jM',
    title: 'Deep Forest Ambience',
    channel: 'Nature Soundscapes',
    thumbnailUrl: 'https://img.youtube.com/vi/xNN7iTA57jM/hqdefault.jpg',
    category: 'nature'
  },
  {
    id: 'nMfPqeZjc2c',
    url: 'https://www.youtube.com/watch?v=nMfPqeZjc2c',
    title: 'White Noise Generator',
    channel: 'Pure Frequencies',
    thumbnailUrl: 'https://img.youtube.com/vi/nMfPqeZjc2c/hqdefault.jpg',
    category: 'ambient'
  },
  {
    id: 'gaGrHUekGdc',
    url: 'https://www.youtube.com/watch?v=gaGrHUekGdc',
    title: 'Cafe Chatter & Jazz',
    channel: 'Cozy Coffee Shop',
    thumbnailUrl: 'https://img.youtube.com/vi/gaGrHUekGdc/hqdefault.jpg',
    category: 'ambient'
  },
  {
    id: 'mPZkdNFkNps',
    url: 'https://www.youtube.com/watch?v=mPZkdNFkNps',
    title: 'Gentle Rain Shower',
    channel: 'Calm Rainfall',
    thumbnailUrl: 'https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg',
    category: 'nature'
  },
  {
    id: 'lTRiuFIWV54',
    url: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
    title: 'Bibliotheca Background',
    channel: 'Quiet Quest & Old Library',
    thumbnailUrl: 'https://img.youtube.com/vi/lTRiuFIWV54/hqdefault.jpg',
    category: 'ambient'
  },
  {
    id: 'WPni755-Krg',
    url: 'https://www.youtube.com/watch?v=WPni755-Krg',
    title: 'Classical Music for Brain Power',
    channel: 'HALIDONMUSIC',
    thumbnailUrl: 'https://img.youtube.com/vi/WPni755-Krg/hqdefault.jpg',
    category: 'classical'
  },
  {
    id: 'TURbeWK2wwg',
    url: 'https://www.youtube.com/watch?v=TURbeWK2wwg',
    title: 'Peaceful Piano Concentration',
    channel: 'Soothing Relaxation',
    thumbnailUrl: 'https://img.youtube.com/vi/TURbeWK2wwg/hqdefault.jpg',
    category: 'piano'
  }
];

export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL regex patterns
  const patterns = [
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([a-zA-Z0-9_-]{11})/i,
    /^[a-zA-Z0-9_-]{11}$/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function safeSetItem(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {}
}

const STORAGE_KEY_FAVORITES = 'lifeos_youtube_focus_favorites';
const STORAGE_KEY_RECENT = 'lifeos_youtube_focus_recent';
const STORAGE_KEY_LAST_PLAYED = 'lifeos_youtube_last_played_id';
const STORAGE_KEY_VOLUME = 'lifeos_focus_music_volume';
const STORAGE_KEY_MUTED = 'lifeos_focus_music_muted';
const STORAGE_KEY_PREV_VOL = 'lifeos_focus_music_prev_volume';

class YouTubeMusicEngine {
  private state: FocusMusicState;
  private listeners: Set<FocusMusicListener> = new Set();
  private iframeRef: HTMLIFrameElement | null = null;

  constructor() {
    const initialTrack = this.resolveInitialTrack();
    const savedVolume = this.getSavedVolume();
    const savedMuted = this.getSavedMuted();
    const savedPrevVol = this.getSavedPrevVolume();

    this.state = {
      currentTrack: initialTrack,
      isPlaying: false,
      volume: savedVolume,
      isMuted: savedMuted,
      previousVolume: savedPrevVol
    };
  }

  private resolveInitialTrack(): YouTubeTrack {
    try {
      const lastId = this.getLastPlayedId();
      const preset = CURATED_FOCUS_TRACKS.find(t => t.id === lastId);
      if (preset) return preset;

      const fav = this.getFavorites().find(t => t.id === lastId);
      if (fav) return fav;

      const rec = this.getRecentTracks().find(t => t.id === lastId);
      if (rec) return rec;

      return {
        id: lastId,
        url: `https://www.youtube.com/watch?v=${lastId}`,
        title: 'Rain & Lo-Fi Waves',
        channel: 'Focus Mixtape',
        thumbnailUrl: getYouTubeThumbnail(lastId),
        category: 'ambient'
      };
    } catch {
      return CURATED_FOCUS_TRACKS[0];
    }
  }

  private getSavedVolume(): number {
    const saved = safeGetItem(STORAGE_KEY_VOLUME);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed;
      }
    }
    return 70; // 70% balanced default volume
  }

  private getSavedMuted(): boolean {
    const saved = safeGetItem(STORAGE_KEY_MUTED);
    return saved === 'true';
  }

  private getSavedPrevVolume(): number {
    const saved = safeGetItem(STORAGE_KEY_PREV_VOL);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        return parsed;
      }
    }
    return 70;
  }

  public getState(): FocusMusicState {
    return { ...this.state };
  }

  public subscribe(listener: FocusMusicListener): () => void {
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
        console.warn('[FocusMusic] listener error:', e);
      }
    });
  }

  public registerIframe(iframe: HTMLIFrameElement | null) {
    this.iframeRef = iframe;
    if (iframe) {
      // Sync initial state to iframe after mount
      setTimeout(() => {
        this.syncIframeSettings();
      }, 350);
    }
  }

  public syncIframeSettings() {
    if (!this.iframeRef) return;
    this.sendCommand('listening');
    const effectiveVol = this.state.isMuted ? 0 : this.state.volume;
    this.sendCommand('setVolume', [effectiveVol]);
    if (this.state.isMuted) {
      this.sendCommand('mute');
    } else {
      this.sendCommand('unMute');
    }
    if (this.state.isPlaying) {
      this.sendCommand('playVideo');
    }
  }

  public sendCommand(func: string, args: any[] = []) {
    if (this.iframeRef && this.iframeRef.contentWindow) {
      try {
        this.iframeRef.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args
          }),
          '*'
        );
      } catch (err) {
        console.warn('[FocusMusic] sendCommand error:', err);
      }
    }
  }

  // Playback control
  public play() {
    this.state.isPlaying = true;
    this.sendCommand('playVideo');
    this.notify();
  }

  public pause() {
    this.state.isPlaying = false;
    this.sendCommand('pauseVideo');
    this.notify();
  }

  public togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  // Volume control (0 - 100)
  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    this.state.volume = clamped;

    if (clamped === 0) {
      this.state.isMuted = true;
      this.sendCommand('mute');
      this.sendCommand('setVolume', [0]);
    } else {
      if (this.state.isMuted) {
        this.state.isMuted = false;
        this.sendCommand('unMute');
      }
      this.state.previousVolume = clamped;
      this.sendCommand('setVolume', [clamped]);
    }

    safeSetItem(STORAGE_KEY_VOLUME, String(this.state.volume));
    safeSetItem(STORAGE_KEY_MUTED, String(this.state.isMuted));
    safeSetItem(STORAGE_KEY_PREV_VOL, String(this.state.previousVolume));

    this.notify();
  }

  public adjustVolume(delta: number) {
    this.setVolume(this.state.volume + delta);
  }

  public toggleMute() {
    if (this.state.isMuted || this.state.volume === 0) {
      // Unmute: restore previous non-zero volume
      const restoreVol = this.state.previousVolume > 0 ? this.state.previousVolume : 70;
      this.state.volume = restoreVol;
      this.state.isMuted = false;
      this.sendCommand('unMute');
      this.sendCommand('setVolume', [restoreVol]);
    } else {
      // Mute: save current volume and set 0
      this.state.previousVolume = this.state.volume > 0 ? this.state.volume : 70;
      this.state.isMuted = true;
      this.sendCommand('mute');
      this.sendCommand('setVolume', [0]);
    }

    safeSetItem(STORAGE_KEY_MUTED, String(this.state.isMuted));
    safeSetItem(STORAGE_KEY_VOLUME, String(this.state.volume));
    safeSetItem(STORAGE_KEY_PREV_VOL, String(this.state.previousVolume));

    this.notify();
  }

  public loadTrack(track: YouTubeTrack, autoPlay: boolean = true) {
    const isNewTrack = track.id !== this.state.currentTrack.id;
    this.state.currentTrack = track;
    this.recordPlayed(track);

    if (autoPlay) {
      this.state.isPlaying = true;
    }

    if (isNewTrack && this.iframeRef) {
      if (autoPlay) {
        this.sendCommand('loadVideoById', [track.id]);
      } else {
        this.sendCommand('cueVideoById', [track.id]);
      }
    } else if (autoPlay) {
      this.play();
    }

    this.notify();
  }

  public nextTrack(playlist?: YouTubeTrack[]) {
    const list = playlist && playlist.length > 0 ? playlist : CURATED_FOCUS_TRACKS;
    const currentIndex = list.findIndex(t => t.id === this.state.currentTrack.id);
    const nextIndex = (currentIndex + 1) % list.length;
    this.loadTrack(list[nextIndex], this.state.isPlaying);
  }

  public prevTrack(playlist?: YouTubeTrack[]) {
    const list = playlist && playlist.length > 0 ? playlist : CURATED_FOCUS_TRACKS;
    const currentIndex = list.findIndex(t => t.id === this.state.currentTrack.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    this.loadTrack(list[prevIndex], this.state.isPlaying);
  }

  // Favorites & History (Preserving backward compatibility)
  public getFavorites(): YouTubeTrack[] {
    const data = safeGetItem(STORAGE_KEY_FAVORITES);
    return data ? JSON.parse(data) : [];
  }

  public addFavorite(track: YouTubeTrack): YouTubeTrack[] {
    const favorites = this.getFavorites();
    if (!favorites.some(f => f.id === track.id)) {
      const updated = [track, ...favorites];
      safeSetItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
      return updated;
    }
    return favorites;
  }

  public removeFavorite(videoId: string): YouTubeTrack[] {
    const favorites = this.getFavorites().filter(f => f.id !== videoId);
    safeSetItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
    return favorites;
  }

  public isFavorite(videoId: string): boolean {
    return this.getFavorites().some(f => f.id === videoId);
  }

  public getRecentTracks(): YouTubeTrack[] {
    const data = safeGetItem(STORAGE_KEY_RECENT);
    return data ? JSON.parse(data) : [];
  }

  public recordPlayed(track: YouTubeTrack) {
    safeSetItem(STORAGE_KEY_LAST_PLAYED, track.id);
    const recent = this.getRecentTracks().filter(r => r.id !== track.id);
    const updated = [{ ...track, addedAt: new Date().toISOString() }, ...recent].slice(0, 10);
    safeSetItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
  }

  public getLastPlayedId(): string {
    const saved = safeGetItem(STORAGE_KEY_LAST_PLAYED);
    if (saved && saved !== 'jfKfPfyJRdk' && saved !== '4xDzrJKXOOY' && saved !== 'eKFTSSKCzWA') {
      return saved;
    }
    return CURATED_FOCUS_TRACKS[0].id;
  }
}

export const youtubeMusicService = new YouTubeMusicEngine();

/**
 * React hook to bind any component seamlessly to the global Focus Music Engine
 */
export function useFocusMusic() {
  const [state, setState] = useState<FocusMusicState>(() => youtubeMusicService.getState());

  useEffect(() => {
    return youtubeMusicService.subscribe(setState);
  }, []);

  return {
    ...state,
    play: () => youtubeMusicService.play(),
    pause: () => youtubeMusicService.pause(),
    togglePlay: () => youtubeMusicService.togglePlay(),
    setVolume: (v: number) => youtubeMusicService.setVolume(v),
    adjustVolume: (delta: number) => youtubeMusicService.adjustVolume(delta),
    toggleMute: () => youtubeMusicService.toggleMute(),
    loadTrack: (t: YouTubeTrack, autoPlay?: boolean) => youtubeMusicService.loadTrack(t, autoPlay),
    nextTrack: (list?: YouTubeTrack[]) => youtubeMusicService.nextTrack(list),
    prevTrack: (list?: YouTubeTrack[]) => youtubeMusicService.prevTrack(list)
  };
}
