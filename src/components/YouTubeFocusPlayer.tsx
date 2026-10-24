import React, { useState } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Star, Trash2, 
  ExternalLink, ChevronDown, ChevronUp, Music, AlertCircle, Plus,
  SkipBack, SkipForward, Radio, Disc
} from 'lucide-react';
import { 
  YouTubeTrack, 
  CURATED_FOCUS_TRACKS, 
  extractYouTubeVideoId, 
  getYouTubeThumbnail, 
  youtubeMusicService,
  useFocusMusic 
} from '../lib/youtubeMusicEngine';
import { FocusVolumeControl } from './focus/FocusVolumeControl';

interface YouTubeFocusPlayerProps {
  compact?: boolean;
  onTrackChange?: (track: YouTubeTrack | null) => void;
  className?: string;
  defaultExpanded?: boolean;
}

function EqualizerIcon() {
  return (
    <span className="flex items-end gap-[2px] h-3.5 w-3.5 shrink-0 justify-center">
      <span className="w-[2px] h-3 bg-emerald-500 animate-[pulse_0.8s_ease-in-out_infinite] rounded-full" />
      <span className="w-[2px] h-2 bg-emerald-500 animate-[pulse_0.8s_ease-in-out_0.2s_infinite] rounded-full" />
      <span className="w-[2px] h-3.5 bg-emerald-500 animate-[pulse_0.8s_ease-in-out_0.4s_infinite] rounded-full" />
    </span>
  );
}

export function YouTubeFocusPlayer({
  compact = false,
  onTrackChange,
  className = '',
  defaultExpanded = true
}: YouTubeFocusPlayerProps) {
  const { 
    currentTrack, 
    isPlaying, 
    isMuted, 
    volume, 
    togglePlay, 
    loadTrack, 
    nextTrack, 
    prevTrack 
  } = useFocusMusic();

  const [inputUrl, setInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [favorites, setFavorites] = useState<YouTubeTrack[]>(() => youtubeMusicService.getFavorites());
  const [recentTracks, setRecentTracks] = useState<YouTubeTrack[]>(() => youtubeMusicService.getRecentTracks());
  const [activeTab, setActiveTab] = useState<'curated' | 'favorites' | 'custom'>('curated');

  const currentVideoId = currentTrack.id;
  const activeTrack = currentTrack;

  const handleLoadTrack = (track: YouTubeTrack) => {
    loadTrack(track, true);
    setRecentTracks(youtubeMusicService.getRecentTracks());
    setErrorMsg(null);
    if (onTrackChange) onTrackChange(track);
  };

  const handleNextTrack = () => {
    const list = activeTab === 'favorites' && favorites.length > 0 ? favorites : CURATED_FOCUS_TRACKS;
    nextTrack(list);
  };

  const handlePrevTrack = () => {
    const list = activeTab === 'favorites' && favorites.length > 0 ? favorites : CURATED_FOCUS_TRACKS;
    prevTrack(list);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const videoId = extractYouTubeVideoId(inputUrl);
    if (!videoId) {
      setErrorMsg('Đường dẫn YouTube không hợp lệ. Hãy dán link dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...');
      return;
    }

    const newTrack: YouTubeTrack = {
      id: videoId,
      url: inputUrl.trim(),
      title: customTitle.trim() || `Ambient Track (${videoId})`,
      thumbnailUrl: getYouTubeThumbnail(videoId),
      category: 'custom'
    };

    handleLoadTrack(newTrack);
    setInputUrl('');
    setCustomTitle('');
    setErrorMsg(null);
  };

  const toggleFavorite = (track: YouTubeTrack) => {
    if (youtubeMusicService.isFavorite(track.id)) {
      const updated = youtubeMusicService.removeFavorite(track.id);
      setFavorites(updated);
    } else {
      const updated = youtubeMusicService.addFavorite(track);
      setFavorites(updated);
    }
  };

  const isCurrentFavorite = youtubeMusicService.isFavorite(currentVideoId);

  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#0F172A] text-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${className}`}>
      
      {/* Header mini bar with expand/collapse toggle */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800/80 bg-[#0F172A]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-xs font-medium text-slate-300 tracking-tight flex items-center gap-1.5">
            <span>Ambient Soundscape</span>
            {isPlaying && <EqualizerIcon />}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* ========================================================================= */}
          {/* MINIMALIST AUDIO PLAYER SECTION (Cover art blurred + vector controls)     */}
          {/* ========================================================================= */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950/70 p-3.5">
            {/* Dark blurred track cover background */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-lg scale-110 pointer-events-none transition-all duration-700"
              style={{ backgroundImage: `url(${activeTrack.thumbnailUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/90 pointer-events-none" />

            <div className="relative z-10 flex items-center gap-3.5">
              {/* Dark moody cover thumbnail */}
              <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-800 bg-slate-900">
                <img 
                  src={activeTrack.thumbnailUrl} 
                  alt={activeTrack.title}
                  className="w-full h-full object-cover filter brightness-75 contrast-125"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Title & Vector Controls */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-white tracking-tight truncate">
                      {activeTrack.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5 font-normal">
                      {activeTrack.channel || 'Focus Mixtape'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(activeTrack)}
                    className="text-slate-400 hover:text-amber-400 transition-colors p-1 shrink-0"
                    title={isCurrentFavorite ? 'Xóa khỏi yêu thích' : 'Lưu yêu thích'}
                  >
                    <Star className={`w-3.5 h-3.5 ${isCurrentFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Sleek Progress Line with Emerald Accent */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full bg-emerald-500 rounded-full transition-all duration-500 ${isPlaying ? 'w-full animate-pulse' : 'w-0'}`} 
                    />
                  </div>
                </div>

                {/* Vector playback icons: Previous, Play/Pause, Next & Volume Controls */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePrevTrack}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Bài trước"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="p-1 text-white hover:text-emerald-400 transition-colors cursor-pointer"
                      title={isPlaying ? 'Tạm dừng' : 'Phát'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextTrack}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Bài kế tiếp"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Complete Volume Controls: Mute, Minus, Slider, Plus, Percentage */}
                  <FocusVolumeControl sliderWidthClass="w-16 sm:w-20" />
                </div>
              </div>
            </div>
          </div>

          {/* Minimalist Tab Selector */}
          <div className="flex items-center border-b border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('curated')}
              className={`pb-2 px-3 font-medium transition-colors cursor-pointer relative ${
                activeTab === 'curated'
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Âm thanh tuyển chọn
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`pb-2 px-3 font-medium transition-colors cursor-pointer relative ${
                activeTab === 'favorites'
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yêu thích ({favorites.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`pb-2 px-3 font-medium transition-colors cursor-pointer relative ${
                activeTab === 'custom'
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              URL Riêng
            </button>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM SECTION: SLEEK TRACKLIST WITH THIN DIVIDERS & TINY EQUALIZER       */}
          {/* ========================================================================= */}
          {activeTab === 'curated' && (
            <div className="divide-y divide-slate-800/80">
              {CURATED_FOCUS_TRACKS.map(track => {
                const isSelected = track.id === currentVideoId;
                return (
                  <div
                    key={track.id}
                    onClick={() => handleLoadTrack(track)}
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors group"
                  >
                    <span className={`text-xs truncate transition-colors ${
                      isSelected 
                        ? 'text-emerald-400 font-medium' 
                        : 'text-slate-300 group-hover:text-white'
                    }`}>
                      {track.title}
                    </span>
                    {isSelected && (
                      <EqualizerIcon />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="divide-y divide-slate-800/80">
              {favorites.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-normal">
                  Chưa có bài yêu thích. Nhấn vào biểu tượng ngôi sao để lưu lại âm thanh yêu thích của bạn.
                </div>
              ) : (
                favorites.map(track => {
                  const isSelected = track.id === currentVideoId;
                  return (
                    <div
                      key={track.id}
                      className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-800/40 rounded-lg transition-colors group"
                    >
                      <div 
                        onClick={() => handleLoadTrack(track)}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className={`text-xs truncate transition-colors ${
                          isSelected 
                            ? 'text-emerald-400 font-medium' 
                            : 'text-slate-300 group-hover:text-white'
                        }`}>
                          {track.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isSelected && <EqualizerIcon />}
                        <button
                          type="button"
                          onClick={() => toggleFavorite(track)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Xóa khỏi yêu thích"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <form onSubmit={handleCustomSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Đường dẫn YouTube:
                </label>
                <input
                  type="text"
                  required
                  value={inputUrl}
                  onChange={e => {
                    setInputUrl(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Tên âm thanh gợi nhớ (tùy chọn)"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500 text-white placeholder-slate-500"
                />
              </div>

              {errorMsg && (
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-300 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nạp âm thanh</span>
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Âm thanh nền thuần túy cho Deep Work</span>
            <a
              href={`https://www.youtube.com/watch?v=${currentVideoId}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <span>Xem nguồn</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
