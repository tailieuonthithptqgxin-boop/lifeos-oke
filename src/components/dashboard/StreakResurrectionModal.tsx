import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, Zap, BookOpen, Diamond, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';
import { streakFreezeEngine } from '../../lib/streakFreezeEngine';
import { retentionEngine } from '../../lib/retentionEngine';
import { confetti } from '../../lib/confetti';

interface StreakResurrectionModalProps {
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  onResurrected: (restoredStreak: number) => void;
  onStartFocus: () => void;
}

export function StreakResurrectionModal({
  userId,
  isOpen,
  onClose,
  onResurrected,
  onStartFocus
}: StreakResurrectionModalProps) {
  const [status, setStatus] = useState(() => streakFreezeEngine.getResurrectionStatus(userId));
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStatus(streakFreezeEngine.getResurrectionStatus(userId));

    const updateTimer = () => {
      const res = streakFreezeEngine.getResurrectionStatus(userId);
      if (!res.isPending) {
        setTimeLeft('00:00:00');
        return;
      }
      const ms = new Date(res.deadline).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft('Hết giờ');
        streakFreezeEngine.dismissResurrection(userId);
        onClose();
        return;
      }
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((ms % (1000 * 60)) / 1000);
      setTimeLeft(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [isOpen, userId]);

  if (!isOpen || !status.isPending) return null;

  const profile = retentionEngine.getProfile(userId);
  const canAffordXp = profile.xp >= 100;

  const handleSacrificeXp = () => {
    if (!canAffordXp) return;
    soundEngine.playSuccess();
    confetti();
    profile.xp -= 100;
    retentionEngine.saveProfile(profile, userId);
    const restored = streakFreezeEngine.completeResurrection(userId);
    onResurrected(restored);
    onClose();
  };

  const handleDismiss = () => {
    soundEngine.playPop();
    streakFreezeEngine.dismissResurrection(userId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Thử thách 24h Chuộc Lỗi 🛡️
                </span>
                <span className="text-xs font-mono font-bold text-rose-400 animate-pulse">
                  ⏳ {timeLeft}
                </span>
              </div>
              <h3 className="font-black text-lg sm:text-xl text-white mt-1">
                Cứu Lấy Chuỗi {status.lostStreak} Ngày Của Bạn!
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 relative z-10">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Hôm qua bạn chưa hoàn thành mục tiêu kỉ luật, nhưng LifeOS luôn trao cho bạn cơ hội thứ hai. 
            Hoàn thành <span className="text-amber-400 font-bold">1 trong 3 thử thách</span> sau trước khi đồng hồ đếm ngược kết thúc để hồi sinh chuỗi kỉ luật:
          </p>

          <div className="space-y-2.5">
            {/* Quest Option 1: Focus 25m */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">1 Phiên Deep Work 25 phút</span>
                  <span className="text-[11px] text-slate-400 block truncate">Tập trung làm việc hoặc học tập không xao nhãng</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  onClose();
                  onStartFocus();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
              >
                Vào Việc Ngay
              </button>
            </div>

            {/* Quest Option 2: Vocab Study / 3 Tasks */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-teal-500/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">Ôn 15 Từ Vựng hoặc Xong 3 Task</span>
                  <span className="text-[11px] text-slate-400 block truncate">Củng cố trí nhớ với Spaced Repetition</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-700/60 text-slate-300 font-bold shrink-0">
                Làm trong app
              </span>
            </div>

            {/* Quest Option 3: Sacrifice 100 XP */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
              canAffordXp 
                ? 'bg-slate-800/80 border-slate-700 hover:border-amber-500/40' 
                : 'bg-slate-900/60 border-slate-800/80 opacity-60'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                  <Diamond className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">Dùng 100 XP Đổi Bùa Hồi Sinh</span>
                  <span className="text-[11px] text-slate-400 block truncate">
                    Bạn hiện có: <strong className="text-amber-300">{profile.xp} XP</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={!canAffordXp}
                onClick={handleSacrificeXp}
                className={`px-3.5 py-2 rounded-xl font-black text-xs shrink-0 transition-all cursor-pointer ${
                  canAffordXp
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Hồi Sinh Ngay
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between relative z-10">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-bold text-slate-400 hover:text-slate-300 cursor-pointer"
          >
            Bỏ qua & bắt đầu lại từ ngày 1
          </button>
          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Chuỗi sẽ nối tiếp {status.lostStreak + 1} ngày
          </span>
        </div>
      </div>
    </div>
  );
}
