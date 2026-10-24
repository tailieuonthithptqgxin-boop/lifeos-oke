import React, { useEffect } from 'react';
import { Sparkles, Trophy, Flame, CheckCircle2, X, ArrowRight } from 'lucide-react';

interface CelebrationModalProps {
  title: string;
  subtitle: string;
  xpAwarded?: number;
  streakCount?: number;
  badgeName?: string;
  badgeIcon?: string;
  onClose: () => void;
}

export function CelebrationModal({
  title,
  subtitle,
  xpAwarded,
  streakCount,
  badgeName,
  badgeIcon = '🏆',
  onClose
}: CelebrationModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200 cursor-default"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-sm w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xl text-center overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Ambient colored background lights */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Floating Celebratory Icon */}
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 text-3xl select-none animate-bounce">
          {badgeIcon || (streakCount ? '🔥' : '🎉')}
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
          {title}
        </h3>

        {/* Subtitle */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          {subtitle}
        </p>

        {/* Reward Pills */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {xpAwarded !== undefined && xpAwarded > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 fill-indigo-600" />
              <span>+{xpAwarded} XP</span>
            </div>
          )}

          {streakCount !== undefined && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{streakCount} Ngày liên tiếp</span>
            </div>
          )}

          {badgeName && (
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-extrabold text-xs flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>{badgeName}</span>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <span>Tuyệt vời! Tiếp tục phát triển</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
