import React, { useState } from 'react';
import { 
  Volume2, VolumeX, Maximize2, Minimize2, Sparkles, 
  RotateCcw, Compass, ArrowUpRight, Sun, Moon, Zap, Layers 
} from 'lucide-react';
import { spatialAudio } from '../sound/SpatialAudioEngine';
import { IslandVibeMode, ISLAND_VIBES } from './CyberCozyVibes';
import { IslandStationData } from './IslandStations';

interface IslandHUDOverlayProps {
  currentVibe: IslandVibeMode;
  onVibeChange: (vibe: IslandVibeMode) => void;
  onResetCamera: () => void;
  onSelectStationById: (id: string) => void;
  onOpenDashboard: () => void;
  activeStation: IslandStationData | null;
}

export const IslandHUDOverlay: React.FC<IslandHUDOverlayProps> = ({
  currentVibe,
  onVibeChange,
  onResetCamera,
  onSelectStationById,
  onOpenDashboard,
  activeStation
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleSound = () => {
    const nextMuted = spatialAudio.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      spatialAudio.startAmbientDrone();
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  };

  const STATIONS_SHORTCUTS = [
    { id: 'desk', label: '📅 Lịch & Việc' },
    { id: 'focus', label: '🍅 Pomodoro' },
    { id: 'study', label: '📚 Từ vựng FSRS' },
    { id: 'finance', label: '💳 Tài chính' },
    { id: 'habits', label: '🔥 Thói quen' },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      
      {/* ===================================================================== */}
      {/* 1. TOP HEADER (BRANDING & VIBE SWITCHER)                               */}
      {/* ===================================================================== */}
      <div className="w-full flex items-start justify-between gap-3">
        
        {/* Left Branding */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-black/75 border border-white/10 backdrop-blur-xl shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
            <span className="font-mono text-xs font-black tracking-wider text-white">
              LIFE<span className="text-[#10B981]">OS</span> // CYBER-COZY ISOMETRIC
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
              360° ORBIT
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/50 border border-white/5 backdrop-blur-xs font-mono text-[10px] text-slate-400">
            <span>🖱️ Kéo chuột xoay 360° · Cuộn để zoom · Click vào trạm để khám phá</span>
          </div>
        </div>

        {/* Right Controller HUD */}
        <div className="flex items-center gap-2 pointer-events-auto">
          
          {/* Day / Night Vibe Switcher (Cyber Midnight vs Sunset Lo-Fi vs Acid Cyber) */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/75 border border-white/10 backdrop-blur-xl shadow-xl">
            {(Object.keys(ISLAND_VIBES) as IslandVibeMode[]).map((vibeKey) => {
              const cfg = ISLAND_VIBES[vibeKey];
              const isCurrent = currentVibe === vibeKey;
              return (
                <button
                  key={vibeKey}
                  type="button"
                  onClick={() => {
                    spatialAudio.playHoverSound();
                    onVibeChange(vibeKey);
                  }}
                  title={cfg.name}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-white/20 text-white border border-white/30 shadow-md scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{cfg.emoji}</span>
                  <span className="hidden md:inline">{cfg.name}</span>
                </button>
              );
            })}
          </div>

          {/* Sound / Ambient Synth Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={isMuted ? 'Bật âm thanh không gian' : 'Tắt âm thanh'}
            className="p-2.5 rounded-2xl bg-black/75 hover:bg-black/90 border border-white/10 text-slate-300 hover:text-white backdrop-blur-xl transition-all active:scale-95 cursor-pointer shadow-xl"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            className="hidden sm:flex p-2.5 rounded-2xl bg-black/75 hover:bg-black/90 border border-white/10 text-slate-300 hover:text-white backdrop-blur-xl transition-all active:scale-95 cursor-pointer shadow-xl"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Quick Exit to Dashboard Button */}
          <button
            type="button"
            onClick={() => {
              spatialAudio.playSelectSound();
              onOpenDashboard();
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs tracking-wide shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>VÀO DASHBOARD</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. BOTTOM CONTROLLER (STATION SHORTCUT DOCK & RESET CAMERA)            */}
      {/* ===================================================================== */}
      <div className="w-full flex items-center justify-center pointer-events-auto">
        <div className="flex items-center gap-1.5 p-1.5 rounded-3xl bg-black/80 border border-white/15 backdrop-blur-2xl shadow-2xl overflow-x-auto max-w-full">
          
          {/* Reset Camera to Isometric Overview */}
          <button
            type="button"
            onClick={() => {
              spatialAudio.playHoverSound();
              onResetCamera();
            }}
            className={`px-3 py-2 rounded-2xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              !activeStation
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Thu phóng về toàn cảnh hòn đảo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Toàn cảnh</span>
          </button>

          <span className="w-px h-5 bg-white/15 my-auto" />

          {/* Station Quick Jump Buttons */}
          {STATIONS_SHORTCUTS.map((st) => {
            const isSelected = activeStation?.id === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  spatialAudio.playHoverSound();
                  onSelectStationById(st.id);
                }}
                className={`px-3 py-2 rounded-2xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default IslandHUDOverlay;
