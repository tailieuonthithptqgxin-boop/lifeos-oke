import React from 'react';
import { Crown, Sparkles, Trophy, Clock, Flame } from 'lucide-react';
import { formatStudyHoursMinutes } from './StudyPersonalStatsCard';

export interface WeeklyChampionData {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  studyMinutes: number;
  weekRangeText: string;
}

interface WeeklyChampionBannerProps {
  champion: WeeklyChampionData | null;
}

export function WeeklyChampionBanner({ champion }: WeeklyChampionBannerProps) {
  if (!champion) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-300/40 dark:border-amber-700/30 p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold">
          <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span>Chưa có Quán Quân tuần trước. Hãy là người đầu tiên bứt phá tuần này!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/10 dark:from-amber-950/50 dark:via-yellow-950/30 dark:to-slate-900 border-2 border-amber-400/60 dark:border-amber-500/40 p-4 sm:p-5 shadow-lg shadow-amber-500/10">
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-3">
        {/* Left: Avatar with golden crown */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            {champion.userAvatar ? (
              <img
                src={champion.userAvatar}
                alt={champion.userName}
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-amber-400 shadow-md shadow-amber-500/20"
              />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-linear-to-tr from-amber-500 to-yellow-400 text-amber-950 font-black text-lg flex items-center justify-center ring-2 ring-amber-400 shadow-md shadow-amber-500/20">
                {champion.userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-linear-to-tr from-amber-500 to-yellow-300 text-amber-950 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900"
              title="Quán Quân Tuần Trước"
            >
              <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-950" />
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Quán Quân Tuần Trước</span>
            </div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {champion.userName}
            </h4>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium truncate">
              Tuần {champion.weekRangeText}
            </p>
          </div>
        </div>

        {/* Right: Record study time */}
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Kỷ lục tuần trước
          </div>
          <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1 mt-0.5">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{formatStudyHoursMinutes(champion.studyMinutes)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
