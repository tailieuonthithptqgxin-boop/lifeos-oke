import React, { useState } from 'react';
import { X, Sparkles, Check, Palette, Volume2 } from 'lucide-react';
import { VIBE_THEMES, VibeThemeId, vibeThemeEngine } from '../lib/vibeThemeEngine';
import { soundEngine, SOUNDPACKS, SoundpackId } from '../lib/soundEngine';

interface VibeThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VibeThemeModal({ isOpen, onClose }: VibeThemeModalProps) {
  const [selectedTheme, setSelectedTheme] = useState<VibeThemeId>(() => vibeThemeEngine.getTheme());
  const [selectedSoundpack, setSelectedSoundpack] = useState<SoundpackId>(() => soundEngine.getSoundpack());

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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Aesthetic Visuals</span>
              <h2 className="text-base font-black text-white">Chọn Vibe Thẩm Mỹ Cho LifeOS 🎨</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(VIBE_THEMES) as VibeThemeId[]).map((id) => {
            const theme = VIBE_THEMES[id];
            const isSelected = selectedTheme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden group ${
                  isSelected
                    ? `${theme.cardBorder} bg-slate-800/90 ring-2 ring-emerald-400/50 shadow-lg`
                    : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{theme.emoji}</span>
                    <span className="font-black text-xs text-white">{theme.name}</span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {theme.description}
                </p>

                {/* Accent Color Dot & Vibe Tag */}
                <div className="flex items-center justify-between w-full pt-1">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                    {theme.vibe}
                  </span>
                  <div 
                    className="w-3 h-3 rounded-full shadow-md"
                    style={{ backgroundColor: theme.accentColor }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* ASMR Soundpack Selection Section */}
        <div className="pt-2 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-white">Bộ Âm Thanh ASMR Khi Bấm (Soundpack)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(SOUNDPACKS) as SoundpackId[]).map((pId) => {
              const pack = SOUNDPACKS[pId];
              const isPackSelected = selectedSoundpack === pId;
              return (
                <button
                  key={pId}
                  type="button"
                  onClick={() => handleSelectSoundpack(pId)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isPackSelected
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-black ring-1 ring-emerald-500/40'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xl">{pack.emoji}</span>
                  <span className="text-[10px] font-bold truncate w-full">{pack.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
          >
            Áp dụng Thiết lập này ✨
          </button>
        </div>
      </div>
    </div>
  );
}
