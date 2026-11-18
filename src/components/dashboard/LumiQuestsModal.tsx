import React from 'react';
import { X, Sparkles, Trophy, Award, Coins, Flame, Check, ArrowRight, ShoppingBag } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface DailyQuest {
  id: string;
  key: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  rewardXp: number;
  rewardCoins: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

interface LumiQuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressionData: {
    level: number;
    levelTitle: string;
    totalXp: number;
    xpNeededForNextLevel: number;
    levelProgressPercent: number;
    coins: number;
    currentStreak: number;
    dailyQuests: DailyQuest[];
  } | null;
  hasCompletedTaskToday: boolean;
  onClaimQuest: (questId: string) => void;
  onOpenShop?: () => void;
}

export function LumiQuestsModal({
  isOpen,
  onClose,
  progressionData,
  hasCompletedTaskToday,
  onClaimQuest,
  onOpenShop
}: LumiQuestsModalProps) {
  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = React.useRef<EventTarget | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const level = progressionData?.level || 1;
  const levelTitle = progressionData?.levelTitle || (level === 1 ? 'Tân Binh (Novice)' : 'Chiến Binh Kỷ Luật');
  const streak = progressionData?.currentStreak || 0;
  const coins = progressionData?.coins || 0;
  const progressPercent = typeof progressionData?.levelProgressPercent === 'number' ? progressionData.levelProgressPercent : 0;
  const quests = progressionData?.dailyQuests && progressionData.dailyQuests.length > 0 ? progressionData.dailyQuests : [
    {
      id: 'quest_1',
      key: 'tasks_done',
      title: 'Hoàn thành 3 công việc trong ngày',
      current: hasCompletedTaskToday ? 1 : 0,
      target: 3,
      unit: 'việc',
      rewardXp: 50,
      rewardCoins: 20,
      isCompleted: false,
      isClaimed: false
    },
    {
      id: 'quest_2',
      key: 'focus_time',
      title: 'Tập trung sâu 25 phút Pomodoro',
      current: 0,
      target: 25,
      unit: 'phút',
      rewardXp: 30,
      rewardCoins: 15,
      isCompleted: false,
      isClaimed: false
    },
    {
      id: 'quest_3',
      key: 'habit_done',
      title: 'Duy trì ít nhất 1 thói quen tốt',
      current: 0,
      target: 1,
      unit: 'thói quen',
      rewardXp: 20,
      rewardCoins: 10,
      isCompleted: false,
      isClaimed: false
    }
  ];

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto animate-modal-enter transition-transform"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0 ${
              hasCompletedTaskToday
                ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-amber-500/25'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              {hasCompletedTaskToday ? '😄' : '😢'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Bé Lumi & Thăng Hạng XP</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  Cấp {level}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {levelTitle} · {hasCompletedTaskToday ? 'Đang hưng phấn! 🔥' : 'Cần hoàn thành việc hôm nay 😢'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Pill Badges */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Chuỗi Kỷ Luật</span>
            </div>
            <span className="font-black text-sm text-amber-900 dark:text-amber-200 font-mono">
              {streak} ngày
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-800 dark:text-yellow-300">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span>Kho Báu Xu</span>
            </div>
            <span className="font-black text-sm text-yellow-900 dark:text-yellow-200 font-mono">
              {coins} 🪙
            </span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Tiến Trình Cấp Độ
            </span>
            <span className="text-purple-700 dark:text-purple-400 font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-white dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
            />
          </div>
        </div>

        {/* 3 Daily Quests */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Nhiệm Vụ Ngày Nhận Thưởng (+XP)
          </div>

          {quests.map(q => (
            <div
              key={q.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                q.isClaimed
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                  : q.isCompleted
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-400/30'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {q.title}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">+{q.rewardXp} XP</span>
                  <span>·</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">+{q.rewardCoins} xu</span>
                </div>
              </div>

              <div>
                {q.isClaimed ? (
                  <span className="px-2.5 py-1 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    Đã nhận
                  </span>
                ) : q.isCompleted ? (
                  <button
                    type="button"
                    onClick={() => onClaimQuest(q.id)}
                    className="px-3.5 py-2 min-h-[44px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1 animate-bounce-short"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Nhận</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">
                    {q.current}/{q.target}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {onOpenShop && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenShop();
              }}
              className="w-full py-2.5 px-4 min-h-[44px] rounded-2xl text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 transition border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-purple-600" />
              <span>Mở Cửa Hàng Đổi Thưởng (Shop Xu)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
