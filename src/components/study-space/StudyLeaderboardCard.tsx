import React, { useState } from 'react';
import { Trophy, Medal, Award, Flame, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { formatStudyHoursMinutes, getStudyRank } from './StudyPersonalStatsCard';
import { ChampionBadge } from './ChampionBadge';

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string | null;
  totalStudyMinutes: number;
  weeklyStudyMinutes: number;
  championCount?: number;
}

interface StudyLeaderboardCardProps {
  topWeekly: LeaderboardUser[];
  topAllTime: LeaderboardUser[];
  currentUserId?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function StudyLeaderboardCard({
  topWeekly,
  topAllTime,
  currentUserId,
  isLoading = false,
  onRefresh
}: StudyLeaderboardCardProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'allTime'>('weekly');

  const users = activeTab === 'weekly' ? topWeekly : topAllTime;

  const renderRankBadge = (rankIndex: number) => {
    if (rankIndex === 0) {
      return (
        <span
          className="w-7 h-7 rounded-xl bg-linear-to-tr from-amber-400 to-yellow-300 text-amber-950 font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/20"
          title="Hạng 1 - Quán Quân"
        >
          🥇
        </span>
      );
    }
    if (rankIndex === 1) {
      return (
        <span
          className="w-7 h-7 rounded-xl bg-linear-to-tr from-slate-300 to-slate-200 text-slate-800 font-black text-sm flex items-center justify-center shadow-md shadow-slate-400/20"
          title="Hạng 2 - Á Quân"
        >
          🥈
        </span>
      );
    }
    if (rankIndex === 2) {
      return (
        <span
          className="w-7 h-7 rounded-xl bg-linear-to-tr from-amber-700 to-amber-600 text-amber-100 font-black text-sm flex items-center justify-center shadow-md shadow-amber-800/20"
          title="Hạng 3 - Quý Quân"
        >
          🥉
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-center">
        #{rankIndex + 1}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-4">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Bảng Xếp Hạng Chăm Chỉ</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Vinh danh những thành viên có thời gian học tập cao nhất
            </p>
          </div>
        </div>

        {/* Tab Controls + Refresh */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Top Tuần Này
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('allTime')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'allTime'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Top Toàn Thời Gian
            </button>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Làm mới bảng xếp hạng"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard Listing */}
      {isLoading ? (
        <div className="space-y-2 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200/50 dark:border-slate-800"
            />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Chưa có dữ liệu học tập nào được ghi nhận. Hãy là người đầu tiên vào phòng học!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u, index) => {
            const isCurrentUser = Boolean(currentUserId && u.id === currentUserId);
            const userMinutes = activeTab === 'weekly' ? u.weeklyStudyMinutes : u.totalStudyMinutes;
            const rank = getStudyRank(u.totalStudyMinutes);

            return (
              <div
                key={u.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-2xl transition-all border ${
                  isCurrentUser
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 shadow-xs ring-1 ring-indigo-500/20'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/70'
                }`}
              >
                {/* Left: Medal/Rank + Avatar + Name + Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">{renderRankBadge(index)}</div>

                  <div className="relative shrink-0">
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {u.name}
                      </span>
                      <ChampionBadge count={u.championCount} size="xs" />
                      {isCurrentUser && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-white font-extrabold text-[9px] uppercase tracking-wider">
                          Bạn
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{rank.icon}</span>
                      <span className="truncate">{rank.title}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Study duration */}
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    <span>{formatStudyHoursMinutes(userMinutes)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {activeTab === 'weekly' ? 'tuần này' : 'tích lũy'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
