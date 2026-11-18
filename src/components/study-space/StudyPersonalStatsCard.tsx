import React from 'react';
import { Clock, Trophy, Flame, Zap, Crown, Award, Sparkles, TrendingUp } from 'lucide-react';
import { ChampionBadge } from './ChampionBadge';

export interface UserStudyStats {
  totalStudyMinutes: number;
  weeklyStudyMinutes: number;
  lastStudyDate?: string | Date | null;
  championCount?: number;
}

export function getStudyRank(minutes: number) {
  if (minutes >= 1000) {
    return {
      title: 'Học bá đại thần',
      icon: '👑',
      tag: 'BẬC THẦY',
      bgGradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      borderColor: 'border-amber-400/40',
      badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
      nextTier: null,
      needed: 0
    };
  }
  if (minutes >= 300) {
    return {
      title: 'Chiến thần tập trung',
      icon: '🔥',
      tag: 'CHUYÊN GIA',
      bgGradient: 'from-orange-500/20 via-red-500/10 to-transparent',
      borderColor: 'border-orange-400/40',
      badgeClass: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40',
      nextTier: 'Học bá đại thần (1000p)',
      needed: 1000 - minutes
    };
  }
  if (minutes >= 60) {
    return {
      title: 'Người kiên trì',
      icon: '⚡',
      tag: 'TIẾN BỘ',
      bgGradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
      borderColor: 'border-blue-400/40',
      badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40',
      nextTier: 'Chiến thần tập trung (300p)',
      needed: 300 - minutes
    };
  }
  return {
    title: 'Tân binh tập trung',
    icon: '🌱',
    tag: 'KHỞI ĐỘNG',
    bgGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderColor: 'border-emerald-400/40',
    badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    nextTier: 'Người kiên trì (60p)',
    needed: 60 - minutes
  };
}

export function formatStudyHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

interface StudyPersonalStatsCardProps {
  stats: UserStudyStats | null;
  userName?: string;
  userAvatar?: string;
  streakDays?: number;
}

export function StudyPersonalStatsCard({
  stats,
  userName = 'Bạn',
  userAvatar,
  streakDays = 0
}: StudyPersonalStatsCardProps) {
  const totalMinutes = stats?.totalStudyMinutes || 0;
  const weeklyMinutes = stats?.weeklyStudyMinutes || 0;
  const rank = getStudyRank(totalMinutes);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-linear-to-br ${rank.bgGradient} bg-white dark:bg-slate-900 border ${rank.borderColor} p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: User Avatar + Rank info */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-indigo-500/30"
              />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center ring-2 ring-indigo-500/30">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className="absolute -bottom-1 -right-1 text-base select-none"
              title={rank.title}
            >
              {rank.icon}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {userName}
              </span>
              <ChampionBadge count={stats?.championCount} size="sm" />
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${rank.badgeClass}`}
              >
                <span>{rank.icon}</span>
                <span>{rank.title}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rank.needed > 0
                ? `Cần thêm ${rank.needed} phút học để đạt danh hiệu ${rank.nextTier}`
                : 'Bạn đã đạt cấp độ danh hiệu cao nhất! Giữ vững phong độ nhé!'}
            </p>
          </div>
        </div>

        {/* Right: Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
          {/* Streak Days */}
          <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 text-left col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Chuỗi học</span>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-500 dark:text-amber-400 mt-0.5">
              {streakDays} ngày 🔥
            </div>
          </div>

          {/* Total Focus Time */}
          <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tổng tích lũy</span>
            </div>
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {formatStudyHoursMinutes(totalMinutes)}
            </div>
          </div>

          {/* Weekly Time */}
          <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tuần này</span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {weeklyMinutes} phút
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
