import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, Volume1, VolumeX, Sparkles, 
  RotateCcw, ExternalLink, Music, X, Search, Check, 
  Headphones, Radio, Heart, Flame, Moon, Coffee, Brain, ListMusic
} from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';
import { toast } from '../../lib/toast';

export interface YouTubePreset {
  id: string;
  videoId: string;
  title: string;
  subtitle: string;
  category: 'lofi' | 'focus' | 'ambient' | 'classical' | 'piano' | 'synthwave';
  icon: string;
}

export const YOUTUBE_STUDY_PRESETS: YouTubePreset[] = [
  {
    id: 'lofi-girl',
    videoId: 'jfKfPfyJRdk',
    title: 'Lofi Girl - 24/7 Relax & Study Beats',
    subtitle: 'Nhạc Lofi Hip Hop số 1 thế giới cho việc học tập',
    category: 'lofi',
    icon: '☕'
  },
  {
    id: 'deep-focus-alpha',
    videoId: 'WPni755-Krg',
    title: 'Deep Focus - Sóng Não Alpha 432Hz',
    subtitle: 'Kích thích sóng não tăng tập trung & ghi nhớ sâu',
    category: 'focus',
    icon: '🧠'
  },
  {
    id: 'rain-piano',
    videoId: 'mPZkdNFkN84',
    title: 'Cozy Rain & Soft Piano',
    subtitle: 'Tiếng mưa rơi nhẹ kết hợp đàn piano thư thái',
    category: 'ambient',
    icon: '🌧️'
  },
  {
    id: 'ghibli-piano',
    videoId: '0fONrn_21hQ',
    title: 'Ghibli Studio Chill Piano Melodies',
    subtitle: 'Giai điệu Anime tuổi thơ nhẹ nhàng, chữa lành',
    category: 'piano',
    icon: '🍃'
  },
  {
    id: 'mozart-study',
    videoId: 'jgpJVI3tDbY',
    title: 'Mozart Classical for Brain Power',
    subtitle: 'Nhạc cổ điển kích hoạt tư duy logic & học tập',
    category: 'classical',
    icon: '🎻'
  },
  {
    id: 'synthwave-coder',
    videoId: '4xDzrJKXOOY',
    title: 'Synthwave / Chillwave Coding Radio',
    subtitle: 'Âm hưởng Cyberpunk cho lập trình & cày đêm',
    category: 'synthwave',
    icon: '🌌'
  }
];

export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle standard youtube URLs
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') {
        return url.searchParams.get('v');
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/embed/')[1]?.split('?')[0];
      }
      if (url.pathname.startsWith('/live/')) {
        return url.pathname.split('/live/')[1]?.split('?')[0];
      }
      if (url.pathname.startsWith('/v/')) {
        return url.pathname.split('/v/')[1]?.split('?')[0];
      }
    }
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('?')[0];
    }
  } catch {
    // Regex fallback
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

interface YouTubeStudyPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
  onPlayStateChange?: (isPlaying: boolean, trackTitle: string) => void;
}

export function YouTubeStudyPlayer({
  isOpen,
  onClose,
  isLight = false,
  onPlayStateChange
}: YouTubeStudyPlayerProps) {
  const [currentVideoId, setCurrentVideoId] = useState<string>(() => {
    try {
      return localStorage.getItem('lifeos_study_youtube_id') || 'jfKfPfyJRdk';
    } catch {
      return 'jfKfPfyJRdk';
    }
  });

  const [currentTitle, setCurrentTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('lifeos_study_youtube_title') || 'Lofi Girl - 24/7 Relax & Study Beats';
    } catch {
      return 'Lofi Girl - 24/7 Relax & Study Beats';
    }
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const v = localStorage.getItem('lifeos_study_youtube_vol');
      return v ? parseInt(v, 10) : 75;
    } catch {
      return 75;
    }
  });
  const [isMuted, setIsMuted] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [recentTracks, setRecentTracks] = useState<Array<{ id: string; title: string }>>(() => {
    try {
      const raw = localStorage.getItem('lifeos_study_youtube_recent');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      { id: 'jfKfPfyJRdk', title: 'Lofi Girl - Relax & Study Beats' },
      { id: 'WPni755-Krg', title: 'Deep Focus - Sóng Não Alpha 432Hz' },
      { id: 'mPZkdNFkN84', title: 'Cozy Rain & Soft Piano' }
    ];
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync to parent component (e.g. for mini ticker on bottom dock)
  useEffect(() => {
    onPlayStateChange?.(isPlaying, currentTitle);
  }, [isPlaying, currentTitle, onPlayStateChange]);

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem('lifeos_study_youtube_id', currentVideoId);
      localStorage.setItem('lifeos_study_youtube_title', currentTitle);
      localStorage.setItem('lifeos_study_youtube_vol', volume.toString());
      localStorage.setItem('lifeos_study_youtube_recent', JSON.stringify(recentTracks.slice(0, 10)));
    } catch {}
  }, [currentVideoId, currentTitle, volume, recentTracks]);

  // Send commands to YouTube Iframe API via postMessage
  const sendIframeCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args
        }),
        '*'
      );
    }
  };

  const handleTogglePlay = () => {
    soundEngine.playPop();
    if (isPlaying) {
      sendIframeCommand('pauseVideo');
      setIsPlaying(false);
    } else {
      sendIframeCommand('playVideo');
      sendIframeCommand('unMute');
      sendIframeCommand('setVolume', [isMuted ? 0 : volume]);
      setIsPlaying(true);
      toast.success(`Đang phát: ${currentTitle} 🎵`);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    sendIframeCommand('setVolume', [newVol]);
    if (newVol > 0) {
      sendIframeCommand('unMute');
    }
  };

  const handleToggleMute = () => {
    soundEngine.playPop();
    if (isMuted) {
      setIsMuted(false);
      sendIframeCommand('unMute');
      sendIframeCommand('setVolume', [volume]);
    } else {
      setIsMuted(true);
      sendIframeCommand('mute');
    }
  };

  const handleSelectPreset = (preset: YouTubePreset) => {
    soundEngine.playSuccess();
    setCurrentVideoId(preset.videoId);
    setCurrentTitle(preset.title);
    setIsPlaying(true);

    // Update recents
    setRecentTracks(prev => {
      const filtered = prev.filter(t => t.id !== preset.videoId);
      return [{ id: preset.videoId, title: preset.title }, ...filtered].slice(0, 8);
    });

    toast.success(`Đã nạp: ${preset.title} 🎶`);
  };

  const handleLoadCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractYouTubeVideoId(customUrlInput);
    if (!videoId) {
      toast.error('Đường dẫn YouTube không hợp lệ. Vui lòng kiểm tra lại link!');
      soundEngine.playPop();
      return;
    }

    soundEngine.playSuccess();
    const title = `Bản nhạc YouTube #${videoId.slice(0, 6)}`;
    setCurrentVideoId(videoId);
    setCurrentTitle(title);
    setIsPlaying(true);
    setCustomUrlInput('');

    // Update recents
    setRecentTracks(prev => {
      const filtered = prev.filter(t => t.id !== videoId);
      return [{ id: videoId, title }, ...filtered].slice(0, 8);
    });

    toast.success('Đã nạp video YouTube thành công! Đang phát nhạc...');
  };

  // Video embed URL with autoplay, loop, and jsapi enabled
  const embedUrl = `https://www.youtube-nocookie.com/embed/${currentVideoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${currentVideoId}&modestbranding=1&rel=0&iv_load_policy=3&controls=0&playsinline=1`;

  return (
    <>
      {/* Hidden/Persistent IFrame Player (keeps playing even when modal is closed) */}
      <div 
        className="fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none" 
        aria-hidden="true"
      >
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="YouTube Study Music Engine"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          onLoad={() => {
            // Unmute and set initial volume once iframe loads
            setTimeout(() => {
              if (isPlaying) {
                sendIframeCommand('unMute');
                sendIframeCommand('setVolume', [isMuted ? 0 : volume]);
                sendIframeCommand('playVideo');
              }
            }, 1000);
          }}
        />
      </div>

      {/* Main Interactive Music Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#181a1d] border-white/10 text-white'
            }`}
          >
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isLight ? 'border-slate-100 bg-slate-50/80' : 'border-white/10 bg-[#1e2023]'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                  <Music className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base tracking-tight">YouTube Study Music Studio</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                      LIVE STREAM
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Phát nhạc Lofi, nhạc sóng não Alpha và nhạc cá nhân từ link YouTube
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
                title="Đóng bảng nhạc"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              
              {/* 1. NOW PLAYING HERO CARD WITH DYNAMIC AUDIO VISUALIZER */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isPlaying 
                  ? (isLight ? 'bg-gradient-to-br from-rose-50/80 via-white to-amber-50/60 border-red-200 shadow-md' : 'bg-gradient-to-br from-red-950/30 via-[#202124] to-amber-950/20 border-red-500/30 shadow-xl')
                  : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5')
              }`}>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Thumbnail / Animated Art */}
                  <div className="relative w-28 h-20 sm:w-32 sm:h-22 rounded-xl overflow-hidden shrink-0 shadow-md bg-black">
                    <img
                      src={`https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`}
                      alt={currentTitle}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition transform hover:scale-110 active:scale-95 cursor-pointer"
                        title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc ngay'}
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                      </button>
                    </div>

                    {/* Live Visualizer Bars in corner */}
                    {isPlaying && (
                      <div className="absolute bottom-1.5 right-1.5 flex items-end gap-0.5 h-4 px-1 py-0.5 rounded bg-black/70 backdrop-blur-xs">
                        <span className="w-1 bg-red-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                        <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2.5" />
                        <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Title & Controls */}
                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {isPlaying ? 'Đang phát trực tiếp' : 'Đang tạm dừng'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm sm:text-base line-clamp-2 leading-snug">
                      {currentTitle}
                    </h4>

                    {/* Volume Slider & Mute */}
                    <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                        title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-red-400" />
                        ) : volume < 50 ? (
                          <Volume1 className="w-4 h-4 text-slate-300" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                        className="w-28 sm:w-36 h-1.5 accent-red-500 rounded-lg cursor-pointer bg-slate-300 dark:bg-slate-700"
                        title={`Âm lượng: ${volume}%`}
                      />
                      <span className="text-xs font-mono font-bold text-slate-400 w-8">
                        {isMuted ? '0%' : `${volume}%`}
                      </span>

                      <a
                        href={`https://www.youtube.com/watch?v=${currentVideoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition cursor-pointer"
                        title="Mở trên tab YouTube"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. CUSTOM YOUTUBE URL INPUT */}
              <form onSubmit={handleLoadCustomUrl} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Dán đường dẫn / Link YouTube của bạn
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="Dán link (VD: https://youtube.com/watch?v=... hoặc youtu.be/...)"
                      className={`w-full min-h-[44px] pl-10 pr-4 text-base sm:text-xs rounded-xl border focus:outline-none transition ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-red-500'
                          : 'bg-white/5 border-white/10 text-white focus:border-red-500'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!customUrlInput.trim()}
                    className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-red-500/20 cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Phát Ngay</span>
                  </button>
                </div>
              </form>

              {/* 3. 6 CURATED HOT STUDY PRESETS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Danh sách phát đề xuất cho phòng học
                  </span>
                  <span className="text-[10px] text-slate-400">1-Chạm nghe ngay</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {YOUTUBE_STUDY_PRESETS.map((preset) => {
                    const isCurrent = currentVideoId === preset.videoId;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group ${
                          isCurrent
                            ? (isLight ? 'bg-red-50 border-red-300 ring-2 ring-red-400/30' : 'bg-red-950/40 border-red-500/50 ring-2 ring-red-500/20')
                            : (isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-white/5 hover:bg-white/10 border-white/5')
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-lg shrink-0 shadow-xs group-hover:scale-105 transition">
                          {preset.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-xs truncate group-hover:text-red-400 transition">
                            {preset.title}
                          </h5>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {preset.subtitle}
                          </p>
                        </div>
                        {isCurrent && isPlaying ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. RECENT PLAYLIST HISTORY */}
              {recentTracks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <ListMusic className="w-3.5 h-3.5" />
                      Bản nhạc đã nghe gần đây ({recentTracks.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recentTracks.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playSuccess();
                          setCurrentVideoId(track.id);
                          setCurrentTitle(track.title);
                          setIsPlaying(true);
                          toast.success(`Đang phát: ${track.title}`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                          currentVideoId === track.id
                            ? 'bg-red-500/20 border-red-500 text-red-400 font-bold'
                            : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300')
                        }`}
                      >
                        <Music className="w-3 h-3 text-red-400" />
                        <span className="max-w-[140px] truncate">{track.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              isLight ? 'border-slate-100 bg-slate-50 text-slate-500' : 'border-white/10 bg-[#1e2023] text-slate-400'
            }`}>
              <span>💡 Nhạc YouTube tự động phát liên tục trong lúc bạn học tập</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold cursor-pointer"
              >
                Xong & Tiếp tục học
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
