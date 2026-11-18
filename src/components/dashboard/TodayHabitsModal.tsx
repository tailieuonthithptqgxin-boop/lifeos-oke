import React, { useEffect, useRef } from 'react';
import { Flame, X, Check, ArrowRight, Plus } from 'lucide-react';
import { Habit } from '../../lib/types';
import { soundEngine } from '../../lib/soundEngine';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface TodayHabitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  completedHabitIds: string[];
  onToggleHabit: (habitId: string) => void;
  onGoToHabits: () => void;
}

export function TodayHabitsModal({
  isOpen,
  onClose,
  habits,
  completedHabitIds,
  onToggleHabit,
  onGoToHabits
}: TodayHabitsModalProps) {
  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in cursor-default"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[88dvh] sm:max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate">Thói Quen Hôm Nay</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đã hoàn thành {completedHabitIds.length} / {habits.length} thói quen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Habits List */}
        <div className="space-y-2">
          {habits.length > 0 ? (
            habits.map(h => {
              const isDone = completedHabitIds.includes(h.id);
              return (
                <div
                  key={h.id}
                  onClick={() => {
                    soundEngine.playPop();
                    onToggleHabit(h.id);
                  }}
                  className={`p-3.5 sm:p-3 min-h-[48px] rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{(h as any).icon || '🔥'}</span>
                    <div className="min-w-0">
                      <div className={`text-xs sm:text-sm font-bold truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {h.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Chuỗi: {h.streak || 0} ngày liên tiếp
                      </div>
                    </div>
                  </div>

                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isDone 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-transparent'
                  }`}>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Chưa có thói quen nào. Hãy vào trang Thói Quen để tạo thói quen đầu tiên!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px]">+15 XP mỗi thói quen</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToHabits();
            }}
            className="min-h-[44px] px-2 font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Quản lý Thói Quen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
