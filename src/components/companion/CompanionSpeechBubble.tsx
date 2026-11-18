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
      className={`relative w-auto max-w-[260px] sm:max-w-xs p-3 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 text-xs sm:text-[13px] font-normal animate-in fade-in zoom-in-95 duration-200 z-50 ${className}`}
    >
      {/* Speech tail pointer */}
      <div 
        className="absolute w-2.5 h-2.5 bg-white/95 dark:bg-slate-900/95 border-b border-r border-slate-200/90 dark:border-slate-800 transform rotate-45"
        style={{
          bottom: position === 'top' ? '-5px' : undefined,
          right: position === 'top' ? '24px' : undefined
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider mb-1" style={{ color: profile.themeColor }}>
          <span>{profile.name}</span>
          <span className="text-[10px] text-slate-400 font-normal">({profile.title})</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Đóng lời thoại"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="leading-relaxed text-slate-700 dark:text-slate-200 text-xs sm:text-[13px] break-words">
        {message}
      </p>
    </div>
  );
};
