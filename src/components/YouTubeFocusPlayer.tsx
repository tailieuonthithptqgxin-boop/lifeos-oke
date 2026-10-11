import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Youtube, Star, Trash2, 
  ExternalLink, ChevronDown, ChevronUp, Music, Sparkles, AlertCircle, Plus 
} from 'lucide-react';
import { 
  YouTubeTrack, 
  CURATED_FOCUS_TRACKS, 
  extractYouTubeVideoId, 
  getYouTubeThumbnail, 
  youtubeMusicService 
} from '../lib/youtubeMusicEngine';

interface YouTubeFocusPlayerProps {
  compact?: boolean;
  onTrackChange?: (track: YouTubeTrack | null) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function YouTubeFocusPlayer({
  compact = false,
  onTrackChange,
  className = '',
  defaultExpanded = true
}: YouTubeFocusPlayerProps) {
  const [currentVideoId, setCurrentVideoId] = useState<string>(() => youtubeMusicService.getLastPlayedId());
  const [inputUrl, setInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isPlaying, setIsPlaying] = useState(false);
  const [favorites, setFavorites] = useState<YouTubeTrack[]>(() => youtubeMusicService.getFavorites());
  const [recentTracks, setRecentTracks] = useState<YouTubeTrack[]>(() => youtubeMusicService.getRecentTracks());
  const [activeTab, setActiveTab] = useState<'curated' | 'favorites' | 'custom'>('curated');

  // Active track info
  const activeTrack = 
    CURATED_FOCUS_TRACKS.find(t => t.id === currentVideoId) ||
    favorites.find(t => t.id === currentVideoId) ||
    recentTracks.find(t => t.id === currentVideoId) ||
    {
      id: currentVideoId,
      url: `https://www.youtube.com/watch?v=${currentVideoId}`,
      title: 'Nhạc tập trung YouTube',
      thumbnailUrl: getYouTubeThumbnail(currentVideoId),
      category: 'custom' as const
    };

  const handleLoadTrack = (track: YouTubeTrack) => {
    setCurrentVideoId(track.id);
    youtubeMusicService.recordPlayed(track);
    setRecentTracks(youtubeMusicService.getRecentTracks());
    setIsPlaying(true);
    setErrorMsg(null);
    if (onTrackChange) onTrackChange(track);
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
      title: customTitle.trim() || `YouTube Track (${videoId})`,
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
    <div className={`rounded-3xl border border-purple-100/80 dark:border-purple-900/40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-300 card-cute ${className}`}>
      
      {/* Header bar / Mini Control bar */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-purple-100/60 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/20 animate-wiggle">
            <Youtube className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Study Ambient Music 🎵
              </span>
              {isPlaying && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-xs">
              {activeTrack.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => toggleFavorite(activeTrack)}
            title={isCurrentFavorite ? 'Xóa khỏi yêu thích' : 'Lưu vào danh sách yêu thích'}
            className={`btn-squishy p-2 rounded-2xl transition-all cursor-pointer ${
              isCurrentFavorite 
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
          >
            <Star className={`w-4 h-4 ${isCurrentFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Thu gọn trình phát' : 'Mở rộng tùy chọn nhạc'}
            className="btn-squishy p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Embedded YouTube IFrame */}
      <div className={`transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
        <div className="relative aspect-video w-full bg-black/90 max-h-48 sm:max-h-56">
          <iframe
            key={currentVideoId}
            src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=${isPlaying ? '1' : '0'}&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
            title="YouTube Focus Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Navigation Tabs for Tracks */}
        <div className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-1.5 p-1 bg-purple-50/70 dark:bg-slate-800/80 rounded-2xl text-xs border border-purple-100/60 dark:border-purple-900/40">
            <button
              type="button"
              onClick={() => setActiveTab('curated')}
              className={`btn-squishy flex-1 py-1.5 rounded-xl font-extrabold text-center transition-all cursor-pointer text-xs ${
                activeTab === 'curated'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Gợi ý chill ✨
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`btn-squishy flex-1 py-1.5 rounded-xl font-extrabold text-center transition-all cursor-pointer text-xs ${
                activeTab === 'favorites'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Yêu thích ({favorites.length}) ⭐
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`btn-squishy flex-1 py-1.5 rounded-xl font-extrabold text-center transition-all cursor-pointer text-xs ${
                activeTab === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              + Link riêng 🔗
            </button>
          </div>

          {/* Tab 1: Curated list */}
          {activeTab === 'curated' && (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {CURATED_FOCUS_TRACKS.map(track => {
                const isSelected = track.id === currentVideoId;
                return (
                  <div
                    key={track.id}
                    onClick={() => handleLoadTrack(track)}
                    className={`btn-squishy flex items-center justify-between p-2 rounded-2xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 font-extrabold text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'hover:bg-purple-50/40 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={track.thumbnailUrl}
                        alt={track.title}
                        className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-xs"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-800 dark:text-slate-200">{track.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{track.channel}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-extrabold shrink-0 ml-2 shadow-xs">
                        Đang phát ✨
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Favorites list */}
          {activeTab === 'favorites' && (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {favorites.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  <Star className="w-6 h-6 mx-auto mb-1.5 text-amber-300 opacity-80 animate-wiggle" />
                  <span className="font-medium">Chưa có video yêu thích nào. Bấm ngôi sao ⭐ để lưu lại nhạc bạn thích nhé!</span>
                </div>
              ) : (
                favorites.map(track => {
                  const isSelected = track.id === currentVideoId;
                  return (
                    <div
                      key={track.id}
                      className={`btn-squishy flex items-center justify-between p-2 rounded-2xl text-xs transition-all ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 font-extrabold text-amber-700 dark:text-amber-300 shadow-xs'
                          : 'hover:bg-purple-50/40 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div 
                        onClick={() => handleLoadTrack(track)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <img
                          src={track.thumbnailUrl}
                          alt={track.title}
                          className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-800 dark:text-slate-200">{track.title}</p>
                          <p className="text-[10px] text-amber-500 font-semibold">Đã lưu ⭐</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(track)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-xl transition-colors ml-2 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Xóa khỏi yêu thích"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: Custom URL input */}
          {activeTab === 'custom' && (
            <form onSubmit={handleCustomSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-extrabold text-purple-600 dark:text-purple-400 mb-1 uppercase tracking-wider">
                  Dán link YouTube (Video hoặc Live stream):
                </label>
                <input
                  type="text"
                  required
                  value={inputUrl}
                  onChange={e => {
                    setInputUrl(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="VD: https://www.youtube.com/watch?v=..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/50 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-purple-400 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Tên gợi nhớ (Tùy chọn, VD: Nhạc piano chill ✨)"
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/50 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-purple-400 text-slate-900 dark:text-white"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-squishy w-full py-2.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-pink-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nạp & Bắt đầu phát 🎵</span>
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-purple-100/60 dark:border-purple-900/30 flex items-center justify-between text-[11px] text-slate-400">
            <span>Âm lượng & điều khiển trực tiếp trên video 🎧</span>
            <a
              href={`https://www.youtube.com/watch?v=${currentVideoId}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-indigo-500 flex items-center gap-1"
            >
              <span>Xem trên YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
