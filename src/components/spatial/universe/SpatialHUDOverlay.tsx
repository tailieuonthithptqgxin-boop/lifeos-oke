import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, VolumeX, Maximize2, Minimize2, Sparkles, 
  Compass, Zap, Radio, Layers, ChevronRight, X, ArrowUpRight 
} from 'lucide-react';
import { spatialAudio } from '../sound/SpatialAudioEngine';
import { SpatialThemeMode } from './SpatialMaterials';
import { StationDetail } from './SpatialStations';

interface SpatialHUDOverlayProps {
  telemetry: {
    x: number;
    y: number;
    z: number;
    currentZone: number;
    scrollOffset: number;
  };
  currentTheme: SpatialThemeMode;
  onThemeChange: (theme: SpatialThemeMode) => void;
  onJumpToZone: (zoneIndex: number) => void;
  onOpenApp: (view?: string) => void;
  activeStationDetail: StationDetail | null;
  onCloseStationDetail: () => void;
}

export const SpatialHUDOverlay: React.FC<SpatialHUDOverlayProps> = ({
  telemetry,
  currentTheme,
  onThemeChange,
  onJumpToZone,
  onOpenApp,
  activeStationDetail,
  onCloseStationDetail
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // Real-time FPS Calculation
  useEffect(() => {
    let animId: number;
    const calcFps = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animId = requestAnimationFrame(calcFps);
    };
    animId = requestAnimationFrame(calcFps);
    return () => cancelAnimationFrame(animId);
  }, []);

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

  const ZONES = [
    { index: 0, label: '01 PORTAL', name: 'Hero Portal' },
    { index: 1, label: '02 ISLANDS', name: 'Feature Islands' },
    { index: 2, label: '03 BENTO', name: 'Spatial Bento' },
    { index: 3, label: '04 CORE', name: 'Quantum Core' },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      
      {/* ===================================================================== */}
      {/* 1. TOP HEADER ROW (TELEMETRY HUD & CONTROLS)                          */}
      {/* ===================================================================== */}
      <div className="w-full flex items-start justify-between gap-4">
        
        {/* Left Telemetry HUD */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Logo Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 border border-white/10 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
            <span className="font-mono text-xs font-black tracking-wider text-white">
              LIFE<span className="text-[#CCFF00]">OS</span>.3D
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
              AESTHETIC v2.6
            </span>
          </div>

          {/* Micro Telemetry Coordinates */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-lg bg-black/50 border border-white/5 backdrop-blur-xs font-mono text-[10px] text-slate-400">
            <span>CAM: <span className="text-white">X:{telemetry.x} Y:{telemetry.y} Z:{telemetry.z}</span></span>
            <span className="text-white/20">|</span>
            <span>FPS: <span className={fps >= 55 ? 'text-emerald-400' : 'text-amber-400'}>{fps}</span></span>
            <span className="text-white/20">|</span>
            <span>LATENCY: <span className="text-emerald-400">0ms LOCAL</span></span>
          </div>
        </div>

        {/* Right Controller HUD */}
        <div className="flex items-center gap-2 pointer-events-auto">
          
          {/* Theme / Shader Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/70 border border-white/10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                spatialAudio.playHoverSound();
                onThemeChange('cyber_zen');
              }}
              title="Cyber-Zen Obsidian & Emerald"
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                currentTheme === 'cyber_zen'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ZEN
            </button>
            <button
              type="button"
              onClick={() => {
                spatialAudio.playHoverSound();
                onThemeChange('acid_neon');
              }}
              title="Gen Z Acid Neon & Violet"
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                currentTheme === 'acid_neon'
                  ? 'bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ACID
            </button>
            <button
              type="button"
              onClick={() => {
                spatialAudio.playHoverSound();
                onThemeChange('hologram_chrome');
              }}
              title="Holographic Chrome"
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                currentTheme === 'hologram_chrome'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CHROME
            </button>
          </div>

          {/* Sound / Ambient Synthesizer Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={isMuted ? 'Bật âm thanh không gian' : 'Tắt âm thanh'}
            className="p-2 rounded-xl bg-black/70 hover:bg-black/90 border border-white/10 text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#CCFF00]" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            className="hidden sm:flex p-2 rounded-xl bg-black/70 hover:bg-black/90 border border-white/10 text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Direct Launch LifeOS App Button */}
          <button
            type="button"
            onClick={() => {
              spatialAudio.playSelectSound();
              onOpenApp('dashboard');
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#CCFF00] to-emerald-400 hover:from-[#d4ff1a] hover:to-emerald-300 text-slate-950 font-black text-xs tracking-wide shadow-lg shadow-[#CCFF00]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>VÀO APP (0ms)</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. INSPECTION MODAL (TRIGGERED BY RAYCAST CLICK ON 3D STATIONS)       */}
      {/* ===================================================================== */}
      {activeStationDetail && (
        <div className="self-center pointer-events-auto max-w-md w-full animate-in zoom-in-95 duration-200">
          <div className="relative p-6 rounded-3xl bg-black/85 border border-white/15 backdrop-blur-2xl shadow-2xl shadow-[#CCFF00]/10 text-left">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={onCloseStationDetail}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/30 uppercase">
                {activeStationDetail.badge}
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                {activeStationDetail.category}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-black text-white tracking-tight">
              {activeStationDetail.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {activeStationDetail.description}
            </p>

            {/* Stat Pill */}
            <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {activeStationDetail.statLabel}
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {activeStationDetail.statValue}
              </span>
            </div>

            {/* Action CTA */}
            <button
              type="button"
              onClick={() => {
                spatialAudio.playSelectSound();
                if (activeStationDetail.onAction) {
                  activeStationDetail.onAction();
                } else {
                  onOpenApp(activeStationDetail.id);
                }
              }}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#CCFF00] to-emerald-400 hover:scale-[1.02] active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{activeStationDetail.actionText}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. BOTTOM FOOTER ROW (QUICK-JUMP MINI-MAP & PROGRESS)                  */}
      {/* ===================================================================== */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
        
        {/* Quick-Jump Mini-Map */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/75 border border-white/10 backdrop-blur-md shadow-xl overflow-x-auto max-w-full">
          {ZONES.map((zone) => {
            const isActive = telemetry.currentZone === zone.index;
            return (
              <button
                key={zone.index}
                type="button"
                onClick={() => {
                  spatialAudio.playHoverSound();
                  onJumpToZone(zone.index);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#CCFF00] text-slate-950 shadow-md shadow-[#CCFF00]/20 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-slate-950' : 'bg-slate-600'}`} />
                <span>{zone.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Scroll Progress Bar */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/60 border border-white/5 backdrop-blur-md font-mono text-[10px] text-slate-400">
          <span>PROGRESS</span>
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-[#CCFF00] transition-all duration-75"
              style={{ width: `${Math.round(telemetry.scrollOffset * 100)}%` }}
            />
          </div>
          <span className="text-white font-bold w-7 text-right">
            {Math.round(telemetry.scrollOffset * 100)}%
          </span>
        </div>
      </div>

    </div>
  );
};

export default SpatialHUDOverlay;
