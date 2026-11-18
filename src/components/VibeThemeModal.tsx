import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Check, Palette, Volume2 } from 'lucide-react';
import { VIBE_THEMES, VibeThemeId, vibeThemeEngine } from '../lib/vibeThemeEngine';
import { soundEngine, SOUNDPACKS, SoundpackId } from '../lib/soundEngine';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface VibeThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VibeThemeModal({ isOpen, onClose }: VibeThemeModalProps) {
  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<VibeThemeId>(() => vibeThemeEngine.getTheme());
  const [selectedSoundpack, setSelectedSoundpack] = useState<SoundpackId>(() => soundEngine.getSoundpack());

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (id: VibeThemeId) => {
    setSelectedTheme(id);
    vibeThemeEngine.setTheme(id);
    soundEngine.playPop();
  };

  const handleSelectSoundpack = (pack: SoundpackId) => {
    setSelectedSoundpack(pack);
    soundEngine.setSoundpack(pack);
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 cursor-default"
    >
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white p-5 sm:p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Aesthetic Visuals</span>
              <h3 className="text-base font-black text-white">Vibe & Theme Studio</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Themes List */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Giao diện cảm hứng (Vibe Theme)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.values(VIBE_THEMES).map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => handleSelect(theme.id)}
                  className={`p-3 min-h-[48px] rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xl">{theme.emoji || (theme as any).icon || '✨'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate">{theme.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{theme.vibe || (theme as any).description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Soundpack Selector */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Gói âm thanh xúc giác (Tactile Soundpack)</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(SOUNDPACKS).map((sp) => {
              const isSelected = selectedSoundpack === sp.id;
              return (
                <button
                  type="button"
                  key={sp.id}
                  onClick={() => handleSelectSoundpack(sp.id)}
                  className={`p-2.5 min-h-[44px] rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/15 text-white'
                      : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate">{sp.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{sp.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
