import React from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { CompanionProfile } from '../../lib/companionEngine';

interface CompanionSpeechBubbleProps {
  message: string;
  profile: CompanionProfile;
  onDismiss: () => void;
  position?: 'top' | 'left' | 'right' | 'bottom';
  className?: string;
}

export const CompanionSpeechBubble: React.FC<CompanionSpeechBubbleProps> = ({
  message,
  profile,
  onDismiss,
  position = 'top',
  className = ''
}) => {
  if (!message) return null;

  return (
    <div 
      className={`relative max-w-xs sm:max-w-sm p-3.5 rounded-2xl shadow-xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-medium animate-in fade-in zoom-in-95 duration-200 z-50 ${className}`}
      style={{
        borderColor: `${profile.themeColor}33`,
        boxShadow: `0 10px 25px -5px ${profile.glowColor}`
      }}
    >
      {/* Speech tail pointer */}
      <div 
        className="absolute w-3 h-3 bg-white dark:bg-slate-900 border-b border-r transform rotate-45"
        style={{
          borderColor: `${profile.themeColor}33`,
          bottom: position === 'top' ? '-6px' : undefined,
          right: position === 'top' ? '28px' : undefined
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider mb-1" style={{ color: profile.themeColor }}>
          <span>{profile.name}</span>
          <span className="text-[10px] text-slate-400 font-normal">({profile.title})</span>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Đóng lời thoại"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="leading-relaxed text-slate-700 dark:text-slate-200 text-xs sm:text-[13px]">
        {message}
      </p>
    </div>
  );
};
