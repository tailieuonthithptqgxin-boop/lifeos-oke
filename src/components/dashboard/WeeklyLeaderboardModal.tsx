import React, { useState, useEffect } from 'react';
import { 
  Trophy, Flame, Clock, Sparkles, X, 
  Crown, Share2, TrendingUp, Zap, Award, ChevronRight, Loader2
} from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';
import { useAppStore } from '../../lib/store';
import { retentionEngine } from '../../lib/retentionEngine';
import { apiCall } from '../../lib/apiClient';

interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  badge: string;
  focusMinutes: number;
  streakDays: number;
  cpScore: number;
  isCurrentUser?: boolean;
}

interface WeeklyLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShareStory?: () => void;
  onShare?: () => void;
}

export function WeeklyLeaderboardModal({
  isOpen,
  onClose,
  onOpenShareStory,
  onShare
}: WeeklyLeaderboardModalProps) {
  const { currentUser, focusSessions = [] } = useAppStore();
  const [activeTab, setActiveTab] = useState<'focus' | 'streak'>('focus');
  const [isLoading, setIsLoading] = useState(false);
  const [apiFocusList, setApiFocusList] = useState<LeaderboardUser[]>([]);
  const [apiStreakList, setApiStreakList] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);

    apiCall('/leaderboard')
      .then(res => {
        if (isMounted && res?.data) {
          setApiFocusList(res.data.focusLeaderboard || []);
          setApiStreakList(res.data.streakLeaderboard || []);
        }
      })
      .catch(err => {
        console.warn('Leaderboard fetch error, fallback to local user data:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Real user calculated stats for current week
  const profile = retentionEngine.getProfile(currentUser?.id);
  const myStreak = profile.streak || 0;
  const currentLevel = profile.level || 1;
  
  // Real focus minutes of current user
  const myTotalFocusMinutes = focusSessions
    .filter(s => s.status === 'Completed')
    .reduce((sum, s) => sum + (s.actualDuration || 0), 0);

  const myCp = Math.floor(currentLevel * 35 + myStreak * 20);

  // Current user entry
  const currentUserEntry: LeaderboardUser = {
    rank: 1,
    name: `${currentUser?.name || 'Bạn'} (Tôi)`,
    avatar: currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=059669&color=fff',
    badge: myStreak >= 14 ? '🔥 Kỷ Luật Thép' : (myStreak >= 7 ? 'Chiến Binh Kỷ Luật' : 'Tân Binh Đang Lên'),
    focusMinutes: myTotalFocusMinutes,
    streakDays: myStreak,
    cpScore: myCp,
    isCurrentUser: true
  };

  const baseList = activeTab === 'focus' ? apiFocusList : apiStreakList;

  let combinedList: LeaderboardUser[] = [];
  if (baseList.length > 0) {
    const hasMe = baseList.some(u => u.isCurrentUser || (currentUser && u.name.includes(currentUser.name)));
    if (hasMe) {
      combinedList = baseList.map(u => {
        if (u.isCurrentUser || (currentUser && u.name.includes(currentUser.name))) {
          return {
            ...u,
            focusMinutes: Math.max(u.focusMinutes, myTotalFocusMinutes),
            streakDays: Math.max(u.streakDays, myStreak),
            isCurrentUser: true
          };
        }
        return u;
      });
    } else {
      combinedList = [...baseList, currentUserEntry];
    }
  } else {
    combinedList = [currentUserEntry];
  }

  const rankedList: LeaderboardUser[] = (activeTab === 'focus'
    ? [...combinedList].sort((a, b) => b.focusMinutes - a.focusMinutes || b.cpScore - a.cpScore)
    : [...combinedList].sort((a, b) => b.streakDays - a.streakDays || b.cpScore - a.cpScore)
  ).map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  const myRank = rankedList.find(u => u.isCurrentUser)?.rank || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow orb */}
        <div className="absolute top-0 right-1/4 w-72 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white">Bảng Phong Thần Kỷ Luật</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Tuần Này ⚡
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Top đồng môn kiên trì nhất · Reset vào 23:59 Chủ Nhật hàng tuần
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls: Chiến Thần Focus vs Bậc Thầy Streak */}
        <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center gap-2 border-b border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setActiveTab('focus');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'focus'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Chiến Thần Focus (Phút)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setActiveTab('streak');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'streak'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bậc Thầy Chuỗi (Ngày)</span>
          </button>
        </div>

        {/* User Rank Highlight Banner */}
        <div className="mx-5 sm:mx-6 my-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-800/80 border border-emerald-500/40 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
              #{myRank}
            </div>
            <div>
              <span className="text-xs font-black text-white block">Vị Trí Của Bạn Hiện Tại</span>
              <span className="text-[11px] text-emerald-400">
                {activeTab === 'focus' 
                  ? `Đã tập trung: ${Math.floor(myTotalFocusMinutes / 60)}h ${myTotalFocusMinutes % 60}m · ${myCp} CP`
                  : `Chuỗi kỷ luật: ${myStreak} ngày liên tiếp · ${myCp} CP`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              onClose();
              (onShare || onOpenShareStory)?.();
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Khoe Hạng</span>
          </button>
        </div>

        {/* Scrollable Leaderboard List */}
        <div className="px-5 sm:px-6 py-2 overflow-y-auto space-y-2 flex-1">
          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              <span className="text-xs">Đang đồng bộ dữ liệu bảng xếp hạng...</span>
            </div>
          )}
          {!isLoading && rankedList.map((user) => {
            const isTop1 = user.rank === 1;
            const isTop2 = user.rank === 2;
            const isTop3 = user.rank === 3;

            return (
              <div
                key={user.rank + user.name}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  user.isCurrentUser
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                    : isTop1
                    ? 'bg-gradient-to-r from-amber-950/40 to-slate-800/80 border-amber-500/50 shadow-md'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank Badge */}
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    {isTop1 ? (
                      <span className="text-xl">🥇</span>
                    ) : isTop2 ? (
                      <span className="text-xl">🥈</span>
                    ) : isTop3 ? (
                      <span className="text-xl">🥉</span>
                    ) : (
                      <span className="text-xs font-black text-slate-400">#{user.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className={`w-9 h-9 rounded-xl object-cover shrink-0 ${
                      isTop1 ? 'ring-2 ring-amber-400' : 'ring-1 ring-slate-700'
                    }`}
                  />

                  {/* User info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${user.isCurrentUser ? 'text-emerald-300' : 'text-white'}`}>
                        {user.name}
                      </span>
                      {user.isCurrentUser && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black">
                          Tôi
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">{user.badge}</span>
                  </div>
                </div>

                {/* Score value */}
                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-black text-white block">
                    {activeTab === 'focus' 
                      ? `${user.focusMinutes}p` 
                      : `${user.streakDays} ngày 🔥`}
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-bold">
                    +{user.cpScore} CP
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1 text-[11px]">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Top 3 nhận danh hiệu vinh danh độc quyền
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
