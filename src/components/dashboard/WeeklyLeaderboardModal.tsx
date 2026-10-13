import React, { useState } from 'react';
import { 
  Trophy, Flame, Clock, Sparkles, X, 
  Crown, Share2, TrendingUp, Zap, Award, ChevronRight
} from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';
import { useAppStore } from '../../lib/store';
import { retentionEngine } from '../../lib/retentionEngine';

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
  onOpenShareStory: () => void;
}

export function WeeklyLeaderboardModal({
  isOpen,
  onClose,
  onOpenShareStory
}: WeeklyLeaderboardModalProps) {
  const { currentUser, focusSessions = [] } = useAppStore();
  const [activeTab, setActiveTab] = useState<'focus' | 'streak'>('focus');

  if (!isOpen) return null;

  // Real user calculated stats for current week
  const profile = retentionEngine.getProfile(currentUser?.id);
  const myStreak = profile.streak || 1;
  const currentLevel = profile.level || 1;
  
  // Real focus minutes of current user
  const myTotalFocusMinutes = focusSessions
    .filter(s => s.status === 'Completed')
    .reduce((sum, s) => sum + (s.actualDuration || 0), 0) || 120;

  const myCp = Math.floor(currentLevel * 35 + myStreak * 20);

  // Community Leaderboard (Simulated realistic peers + real current user dynamically positioned)
  const baseFocusPeers: Omit<LeaderboardUser, 'rank'>[] = [
    { name: 'Hoàng Minh', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop', badge: '🥇 Top 1 Tuần', focusMinutes: 480, streakDays: 24, cpScore: 1320 },
    { name: 'Thu Thảo (IELTS 8.0)', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&fit=crop', badge: '🥈 Bậc Thầy Bạc', focusMinutes: 410, streakDays: 18, cpScore: 1050 },
    { name: 'Đức Huy (Dev Vibe)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop', badge: '🥉 Thợ Săn DeepWork', focusMinutes: 345, streakDays: 15, cpScore: 890 },
    { name: 'Lan Phương', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&fit=crop', badge: 'Top 5', focusMinutes: 280, streakDays: 12, cpScore: 740 },
    { name: 'Bảo Nam', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&fit=crop', badge: 'Top 10', focusMinutes: 210, streakDays: 9, cpScore: 610 },
  ];

  const baseStreakPeers: Omit<LeaderboardUser, 'rank'>[] = [
    { name: 'Thanh Hằng (JLPT N1)', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&fit=crop', badge: '🔥 Chuỗi 35 Ngày', focusMinutes: 520, streakDays: 35, cpScore: 1650 },
    { name: 'Khánh Duy', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&fit=crop', badge: '🔥 Chuỗi 28 Ngày', focusMinutes: 390, streakDays: 28, cpScore: 1290 },
    { name: 'Quỳnh Nga', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&fit=crop', badge: '🔥 Chuỗi 21 Ngày', focusMinutes: 310, streakDays: 21, cpScore: 980 },
    { name: 'Tuấn Kiệt', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&fit=crop', badge: 'Top 5', focusMinutes: 240, streakDays: 16, cpScore: 760 },
    { name: 'Mai Linh', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&fit=crop', badge: 'Top 10', focusMinutes: 195, streakDays: 11, cpScore: 590 },
  ];

  // Insert current user and sort dynamically
  const currentUserEntry: Omit<LeaderboardUser, 'rank'> = {
    name: `${currentUser?.name || 'Bạn'} (Tôi)`,
    avatar: currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=059669&color=fff',
    badge: myStreak >= 7 ? 'Chiến Binh Kỷ Luật' : 'Tân Binh Đang Lên',
    focusMinutes: myTotalFocusMinutes,
    streakDays: myStreak,
    cpScore: myCp,
    isCurrentUser: true
  };

  const currentList = activeTab === 'focus' 
    ? [...baseFocusPeers, currentUserEntry].sort((a, b) => b.focusMinutes - a.focusMinutes)
    : [...baseStreakPeers, currentUserEntry].sort((a, b) => b.streakDays - a.streakDays);

  const rankedList: LeaderboardUser[] = currentList.map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  const myRank = rankedList.find(u => u.isCurrentUser)?.rank || 4;

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
              onOpenShareStory();
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Khoe Hạng</span>
          </button>
        </div>

        {/* Scrollable Leaderboard List */}
        <div className="px-5 sm:px-6 py-2 overflow-y-auto space-y-2 flex-1">
          {rankedList.map((user) => {
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
