import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowRight, Sparkles, CheckCircle2, 
  RotateCcw, Compass, Zap, Flame, Shield, Layers 
} from 'lucide-react';
import { IslandStationData } from './IslandStations';
import { spatialAudio } from '../sound/SpatialAudioEngine';

interface StationBentoModalProps {
  station: IslandStationData | null;
  onClose: () => void;
  onLaunchView: (viewId: string) => void;
}

export const StationBentoModal: React.FC<StationBentoModalProps> = ({
  station,
  onClose,
  onLaunchView
}) => {
  React.useEffect(() => {
    if (!station) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [station, onClose]);

  if (!station) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50 flex items-end sm:items-center justify-end sm:p-8 p-4">
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="pointer-events-auto w-full max-w-lg bg-[#07090E]/85 dark:bg-[#07090E]/90 border border-white/15 backdrop-blur-3xl rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/80 text-left relative overflow-hidden"
          style={{
            boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 40px ${station.accentColor}25`
          }}
        >
          {/* Top Ambient Glow Rim */}
          <div 
            className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ backgroundColor: station.accentColor }}
          />

          {/* Modal Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    backgroundColor: `${station.accentColor}20`,
                    color: station.accentColor,
                    border: `1px solid ${station.accentColor}40`
                  }}
                >
                  {station.badge}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">
                  {station.category}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {station.name}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {station.tagline}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                spatialAudio.playHoverSound();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Đóng / Trở về toàn cảnh"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* VisionOS 2x2 Bento Grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Bento Card 1: Primary Stat */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {station.primaryStatLabel}
              </span>
              <div className="text-base sm:text-lg font-black text-white mt-2 font-mono">
                {station.primaryStatValue}
              </div>
            </div>

            {/* Bento Card 2: Secondary Stat */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {station.secondaryStatLabel}
              </span>
              <div 
                className="text-base sm:text-lg font-black mt-2 font-mono"
                style={{ color: station.accentColor }}
              >
                {station.secondaryStatValue}
              </div>
            </div>

            {/* Bento Card 3: Deep Work System Explanation (Col-span 2) */}
            <div className="col-span-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 leading-relaxed">
              <p>{station.description}</p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-2.5">
            {/* Reset Camera Button */}
            <button
              type="button"
              onClick={() => {
                spatialAudio.playHoverSound();
                onClose();
              }}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Toàn cảnh</span>
            </button>

            {/* Launch Real View Button */}
            <button
              type="button"
              onClick={() => {
                spatialAudio.playSelectSound();
                onLaunchView(station.viewId);
              }}
              className="flex-1 py-3 px-5 rounded-2xl text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              style={{
                backgroundColor: station.accentColor
              }}
            >
              <span>Mở Toàn Bộ Tính Năng (0ms)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StationBentoModal;
