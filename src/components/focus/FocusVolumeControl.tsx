import React from 'react';
import { Volume2, VolumeX, Volume1, Minus, Plus } from 'lucide-react';
import { useFocusMusic } from '../../lib/youtubeMusicEngine';

interface FocusVolumeControlProps {
  className?: string;
  showPercentage?: boolean;
  sliderWidthClass?: string;
}

export function FocusVolumeControl({
  className = '',
  showPercentage = true,
  sliderWidthClass = 'w-16 sm:w-24 md:w-28'
}: FocusVolumeControlProps) {
  const { volume, isMuted, toggleMute, setVolume, adjustVolume } = useFocusMusic();

  const effectiveVolume = isMuted ? 0 : volume;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = Number(e.target.value);
    setVolume(val);
  };

  const handleMinus = (e: React.MouseEvent) => {
    e.stopPropagation();
    adjustVolume(-5);
  };

  const handlePlus = (e: React.MouseEvent) => {
    e.stopPropagation();
    adjustVolume(5);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
  };

  // Determine icon based on volume level
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : (volume < 50 ? Volume1 : Volume2);

  return (
    <div 
      className={`flex items-center gap-1.5 sm:gap-2 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 4. Nút Mute / Unmute */}
      <button
        type="button"
        onClick={handleToggleMute}
        aria-label={isMuted ? 'Bật âm lượng (Unmute)' : 'Tắt tiếng (Mute)'}
        title={isMuted ? 'Bật âm lượng (Unmute)' : 'Tắt tiếng (Mute)'}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0 min-h-[32px] min-w-[32px] ${
          isMuted || volume === 0
            ? 'text-rose-400 hover:text-rose-300 bg-rose-500/10'
            : 'text-slate-300 hover:text-emerald-400 hover:bg-slate-800'
        }`}
      >
        <VolumeIcon className="w-4 h-4" />
      </button>

      {/* 1. Nút giảm âm lượng (-) */}
      <button
        type="button"
        onClick={handleMinus}
        disabled={effectiveVolume <= 0}
        aria-label="Giảm âm lượng 5%"
        title="Giảm âm lượng 5%"
        className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0 min-h-[28px] min-w-[28px] flex items-center justify-center font-bold"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* 2. Thanh trượt volume */}
      <div className={`relative flex items-center ${sliderWidthClass}`}>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={effectiveVolume}
          onChange={handleSliderChange}
          aria-label="Thanh trượt điều chỉnh âm lượng Focus Music"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={effectiveVolume}
          className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-400"
        />
      </div>

      {/* 3. Nút tăng âm lượng (+) */}
      <button
        type="button"
        onClick={handlePlus}
        disabled={effectiveVolume >= 100}
        aria-label="Tăng âm lượng 5%"
        title="Tăng âm lượng 5%"
        className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0 min-h-[28px] min-w-[28px] flex items-center justify-center font-bold"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {/* 5. Hiển thị mức âm lượng theo phần trăm (%) */}
      {showPercentage && (
        <span 
          className="text-xs font-mono font-bold text-slate-300 shrink-0 min-w-[36px] text-right"
          aria-live="polite"
        >
          {effectiveVolume}%
        </span>
      )}
    </div>
  );
}
