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
    <div className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg overflow-hidden transition-all duration-300 ${className}`}>
      
      {/* Header bar / Mini Control bar */}
      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
            <Youtube className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400">
                Study Ambient Music
              </span>
              {isPlaying && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-xs">
              {activeTrack.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => toggleFavorite(activeTrack)}
            title={isCurrentFavorite ? 'Xóa khỏi yêu thích' : 'Lưu vào danh sách yêu thích'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isCurrentFavorite 
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Star className={`w-4 h-4 ${isCurrentFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Thu gọn trình phát' : 'Mở rộng tùy chọn nhạc'}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Embedded YouTube IFrame (Responsive & Hidden when minimized if desired) */}
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
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('curated')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                activeTab === 'curated'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Gợi ý tuyển chọn
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Yêu thích ({favorites.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              + Dán link cá nhân
            </button>
          </div>

          {/* Tab 1: Curated list */}
          {activeTab === 'curated' && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {CURATED_FOCUS_TRACKS.map(track => {
                const isSelected = track.id === currentVideoId;
                return (
                  <div
                    key={track.id}
                    onClick={() => handleLoadTrack(track)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 font-bold text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={track.thumbnailUrl}
                        alt={track.title}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{track.title}</p>
                        <p className="text-[10px] text-slate-400">{track.channel}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold shrink-0 ml-2">
                        Đang chọn
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Favorites list */}
          {activeTab === 'favorites' && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {favorites.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  <Star className="w-5 h-5 mx-auto mb-1 text-slate-300 opacity-60" />
                  <span>Chưa có video yêu thích nào. Bấm ngôi sao để lưu lại nhạc bạn thích!</span>
                </div>
              ) : (
                favorites.map(track => {
                  const isSelected = track.id === currentVideoId;
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 font-bold text-amber-700 dark:text-amber-300'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div 
                        onClick={() => handleLoadTrack(track)}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        <img
                          src={track.thumbnailUrl}
                          alt={track.title}
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{track.title}</p>
                          <p className="text-[10px] text-slate-400">Đã lưu</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(track)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors ml-2 cursor-pointer"
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
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Tên gợi nhớ (Tùy chọn, VD: Nhạc piano cafe)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nạp & Bắt đầu phát</span>
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Âm lượng & điều khiển trực tiếp trên trình phát video</span>
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
