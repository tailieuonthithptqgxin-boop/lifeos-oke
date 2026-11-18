import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Volume1, Minus, Plus, Music, Bell, Sparkles } from 'lucide-react';
import { useGlobalVolume } from '../../lib/globalVolumeManager';
import { soundEngine, SOUNDPACKS, SoundpackId } from '../../lib/soundEngine';
import { useSmartDismiss } from '../../lib/useSmartDismiss';
import { useTranslation } from '../../lib/i18n';

interface GlobalVolumePopoverProps {
  className?: string;
}

export function GlobalVolumePopover({ className = '' }: GlobalVolumePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<SoundpackId>(() => soundEngine.getSoundpack());
  const t = useTranslation();

  const {
    masterVolume,
    isMuted,
    effectiveVolume,
    musicVolume,
    sfxVolume,
    setMasterVolume,
    adjustMasterVolume,
    toggleMute,
    setMusicVolume,
    setSfxVolume
  } = useGlobalVolume();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Smart Dismiss hook: Handles Click-Outside, Touch-Outside, and Escape key
  useSmartDismiss({
    isOpen,
    onDismiss: () => setIsOpen(false),
    targetRef: popoverRef,
    triggerRef: triggerRef,
    closeOnEscape: true,
    closeOnClickOutside: true
  });

  const VolumeIcon = isMuted || effectiveVolume === 0 
    ? VolumeX 
    : (effectiveVolume < 50 ? Volume1 : Volume2);

  const handleSelectSoundpack = (pack: SoundpackId) => {
    setSelectedPack(pack);
    soundEngine.setSoundpack(pack);
    soundEngine.playPop();
  };

  return (
    <div className={`relative ${className}`}>
      {/* 1. Header Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={t('Điều khiển âm lượng toàn hệ thống')}
        title={isMuted ? t('Âm lượng: Đang tắt tiếng (Muted)') : `${t('Âm lượng')}: ${effectiveVolume}%`}
        className={`h-9 px-2.5 flex items-center gap-1.5 rounded-full border transition-all cursor-pointer shadow-2xs select-none ${
          isMuted || effectiveVolume === 0
            ? 'text-rose-500 border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30'
            : isOpen
            ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40'
            : 'text-slate-600 dark:text-slate-300 border-[#E2E8F0] dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.08]'
        }`}
      >
        <VolumeIcon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold tabular-nums">
          {isMuted ? 'Mute' : `${effectiveVolume}%`}
        </span>
      </button>

      {/* 2. Interactive Volume Popover Panel */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={t('Bảng điều khiển âm lượng')}
          className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none text-slate-800 dark:text-slate-100"
          onClick={(e) => e.stopPropagation()} // Prevent click inside from dismissing
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isMuted ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <VolumeIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {t('Âm lượng hệ thống')}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isMuted ? t('Đang tắt tiếng toàn bộ') : `${t('Đang phát ở')} ${effectiveVolume}%`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                toggleMute();
                soundEngine.playPop();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                isMuted
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isMuted ? t('Bật tiếng') : t('Tắt tiếng')}
            </button>
          </div>

          {/* Master Volume Slider with +/- Steppers */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                {t('Tổng thể (Master)')}
              </span>
              <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {effectiveVolume}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  adjustMasterVolume(-5);
                  soundEngine.playPop();
                }}
                disabled={effectiveVolume <= 0}
                aria-label={t('Giảm âm lượng 5%')}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer shrink-0 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={effectiveVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                aria-label={t('Thanh trượt âm lượng tổng')}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />

              <button
                type="button"
                onClick={() => {
                  adjustMasterVolume(5);
                  soundEngine.playPop();
                }}
                disabled={effectiveVolume >= 100}
                aria-label={t('Tăng âm lượng 5%')}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-channel Controls (Music & Sound Effects) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            {/* Music & Ambience Channel */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Music className="w-3 h-3 text-cyan-500" />
                  {t('Âm nhạc Focus & Môi trường')}
                </span>
                <span className="font-semibold tabular-nums text-cyan-600 dark:text-cyan-400">
                  {isMuted ? '0%' : `${musicVolume}%`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={isMuted ? 0 : musicVolume}
                disabled={isMuted}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                aria-label={t('Âm lượng Focus Music')}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-40"
              />
            </div>

            {/* Sound FX & Notification Channel */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Bell className="w-3 h-3 text-amber-500" />
                  {t('Hiệu ứng nút & Phát âm từ')}
                </span>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {isMuted ? '0%' : `${sfxVolume}%`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={isMuted ? 0 : sfxVolume}
                disabled={isMuted}
                onChange={(e) => setSfxVolume(Number(e.target.value))}
                aria-label={t('Âm lượng Hiệu ứng & Phát âm')}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Soundpack Selector (Dopamine Switch) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              {t('Gói âm thanh Dopamine (Soundpack)')}:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(SOUNDPACKS) as SoundpackId[]).map((packId) => {
                const pack = SOUNDPACKS[packId];
                const isSelected = selectedPack === packId;
                return (
                  <button
                    key={packId}
                    type="button"
                    onClick={() => handleSelectSoundpack(packId)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer border text-left ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{pack.emoji}</span>
                    <span className="truncate">{pack.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
