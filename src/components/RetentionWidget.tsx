import React, { useState, useEffect } from 'react';
import {
  Flame,
  Zap,
  Sparkles,
  Trophy,
  CheckCircle2,
  Circle,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { retentionEngine, RetentionProfile } from '../lib/retentionEngine';
import { useAppStore } from '../lib/store';
import { CelebrationModal } from './CelebrationModal';

interface RetentionWidgetProps {
  onQuestClick?: (category: string) => void;
  compact?: boolean;
}

export function RetentionWidget({ onQuestClick, compact = false }: RetentionWidgetProps) {
  const { currentUser } = useAppStore();
  const [profile, setProfile] = useState<RetentionProfile>(() =>
    retentionEngine.getProfile(currentUser?.id)
  );

  const [celebration, setCelebration] = useState<{
    title: string;
    subtitle: string;
    xpAwarded?: number;
    streakCount?: number;
    badgeName?: string;
  } | null>(null);

  useEffect(() => {
    setProfile(retentionEngine.getProfile(currentUser?.id));
  }, [currentUser]);

  const handleCompleteQuest = (category: any) => {
    const success = retentionEngine.completeQuest(category, currentUser?.id);
    if (success) {
      const updated = retentionEngine.getProfile(currentUser?.id);
      setProfile(updated);
      setCelebration({
        title: 'Nhiệm Vụ Hàng Ngày Hoàn Thành!',
        subtitle: 'Bạn đã nhận thêm điểm kinh nghiệm để nâng cấp danh hiệu cá nhân.',
        xpAwarded: 25
      });
    }
    if (onQuestClick) onQuestClick(category);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Streak Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 font-extrabold text-xs shadow-2xs">
          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
          <span>{profile.streak} ngày</span>
        </div>

        {/* Level Pill */}
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Lv.{profile.level}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 relative overflow-hidden">
        {/* Top Streak & Level Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 text-lg">
              🔥
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 dark:text-white text-base">
                  Chuỗi {profile.streak} Ngày
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Đang giữ phong độ
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Kỷ lục tốt nhất: {profile.bestStreak} ngày liên tục
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              {profile.levelTitle}
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white text-xs">
              Level {profile.level}
            </span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Tiến độ cấp độ</span>
            <span>{profile.progressToNextLevel}/100 XP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(profile.progressToNextLevel, 100)}%` }}
            />
          </div>
        </div>

        {/* Daily Quests List */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Nhiệm vụ năng suất hôm nay
          </span>
          <div className="space-y-1.5">
            {profile.dailyQuests.map(quest => (
              <button
                key={quest.id}
                type="button"
                onClick={() => handleCompleteQuest(quest.category)}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                  quest.completed
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {quest.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                  <span className={`text-xs truncate ${quest.completed ? 'line-through opacity-70' : 'font-medium'}`}>
                    {quest.title}
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0 ml-2">
                  +{quest.rewardXp} XP
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {celebration && (
        <CelebrationModal
          title={celebration.title}
          subtitle={celebration.subtitle}
          xpAwarded={celebration.xpAwarded}
          streakCount={celebration.streakCount}
          badgeName={celebration.badgeName}
          onClose={() => setCelebration(null)}
        />
      )}
    </>
  );
}
