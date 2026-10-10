/**
 * YouTube Focus Music Engine & Player Service
 * Handles YouTube URL extraction, validation, curated presets, and persistent favorites.
 */

export interface YouTubeTrack {
  id: string; // YouTube 11-char Video ID
  url: string;
  title: string;
  channel?: string;
  thumbnailUrl: string;
  category: 'lofi' | 'ambient' | 'classical' | 'piano' | 'nature' | 'custom';
  addedAt?: string;
}

export const CURATED_FOCUS_TRACKS: YouTubeTrack[] = [
  {
    id: 'jfKfPfyJRdk',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio – Beats to Relax/Study to',
    channel: 'Lofi Girl',
    thumbnailUrl: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    category: 'lofi'
  },
  {
    id: '4xDzrJKXOOY',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    title: 'synthwave radio – beats to chill/game to',
    channel: 'Lofi Girl',
    thumbnailUrl: 'https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    category: 'lofi'
  },
  {
    id: 'WPni755-Krg',
    url: 'https://www.youtube.com/watch?v=WPni755-Krg',
    title: 'Classical Music for Studying & Brain Power (Mozart, Beethoven)',
    channel: 'HALIDONMUSIC',
    thumbnailUrl: 'https://img.youtube.com/vi/WPni755-Krg/hqdefault.jpg',
    category: 'classical'
  },
  {
    id: 'lTRiuFIWV54',
    url: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
    title: 'Deep Focus Music – 4 Hours Ambient Study Soundscape',
    channel: 'Quiet Quest',
    thumbnailUrl: 'https://img.youtube.com/vi/lTRiuFIWV54/hqdefault.jpg',
    category: 'ambient'
  },
  {
    id: 'eKFTSSKCzWA',
    url: 'https://www.youtube.com/watch?v=eKFTSSKCzWA',
    title: 'Peaceful Piano Music for Deep Concentration & Reading',
    channel: 'Soothing Relaxation',
    thumbnailUrl: 'https://img.youtube.com/vi/eKFTSSKCzWA/hqdefault.jpg',
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
  // 1. https://www.youtube.com/watch?v=VIDEO_ID
  // 2. https://youtu.be/VIDEO_ID
  // 3. https://www.youtube.com/embed/VIDEO_ID
  // 4. https://www.youtube.com/live/VIDEO_ID
  // 5. https://music.youtube.com/watch?v=VIDEO_ID
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

const STORAGE_KEY_FAVORITES = 'lifeos_youtube_focus_favorites';
const STORAGE_KEY_RECENT = 'lifeos_youtube_focus_recent';
const STORAGE_KEY_LAST_PLAYED = 'lifeos_youtube_last_played_id';

export const youtubeMusicService = {
  getFavorites(): YouTubeTrack[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addFavorite(track: YouTubeTrack): YouTubeTrack[] {
    const favorites = this.getFavorites();
    if (!favorites.some(f => f.id === track.id)) {
      const updated = [track, ...favorites];
      try {
        localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save YouTube favorite:', e);
      }
      return updated;
    }
    return favorites;
  },

  removeFavorite(videoId: string): YouTubeTrack[] {
    const favorites = this.getFavorites().filter(f => f.id !== videoId);
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to remove YouTube favorite:', e);
    }
    return favorites;
  },

  isFavorite(videoId: string): boolean {
    return this.getFavorites().some(f => f.id === videoId);
  },

  getRecentTracks(): YouTubeTrack[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_RECENT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  recordPlayed(track: YouTubeTrack) {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_PLAYED, track.id);
      const recent = this.getRecentTracks().filter(r => r.id !== track.id);
      const updated = [{ ...track, addedAt: new Date().toISOString() }, ...recent].slice(0, 10);
      localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to record played YouTube track:', e);
    }
  },

  getLastPlayedId(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_LAST_PLAYED) || CURATED_FOCUS_TRACKS[0].id;
    } catch {
      return CURATED_FOCUS_TRACKS[0].id;
    }
  }
};
