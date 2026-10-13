import React, { useState, useMemo } from 'react';
import { 
  X, Calendar, Sparkles, CheckSquare, Clock, Wallet, 
  Flame, Trophy, ArrowRight, ArrowLeft, Check, Heart, 
  Share2, Award, Zap
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { formatCurrency } from '../../lib/utils';
import { apiCall } from '../../lib/apiClient';

interface SundayWeeklyResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStoryShare?: () => void;
}

export function SundayWeeklyResetModal({
  isOpen,
  onClose,
  onOpenStoryShare
}: SundayWeeklyResetModalProps) {
  const { 
    tasks = [], 
    focusSessions = [], 
    transactions = [], 
    currentUser, 
    addTask 
  } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states for Reflection & Next Week's Big 3
  const [winReflection, setWinReflection] = useState('');
  const [letGoReflection, setLetGoReflection] = useState('');
  const [goal1, setGoal1] = useState('');
  const [goal2, setGoal2] = useState('');
  const [goal3, setGoal3] = useState('');
  const [isClaimed, setIsClaimed] = useState(false);

  // Compute 7-day stats
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    // Deep work in past 7 days
    const recentFocus = focusSessions.filter(s => {
      const sessionDate = new Date(s.startTime || s.createdAt || now);
      return sessionDate >= sevenDaysAgo;
    });
    const totalFocusMinutes = recentFocus.reduce((sum, s) => sum + (s.duration || s.minutes || 0), 0);

    // Tasks completed in past 7 days
    const completedTasks = tasks.filter(t => t.status === 'Đã xong' || t.status === 'Hoàn thành');

    // Total expenses in past 7 days
    const recentExpenses = transactions.filter(tx => {
      if (tx.type !== 'Chi tiêu') return false;
      const txDate = new Date(tx.date || now);
      return txDate >= sevenDaysAgo;
    });
    const totalExpense = recentExpenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return {
      focusHours: (totalFocusMinutes / 60).toFixed(1),
      focusMinutes: totalFocusMinutes,
      completedTaskCount: completedTasks.length,
      totalExpense,
      sessionCount: recentFocus.length
    };
  }, [focusSessions, tasks, transactions]);

  if (!isOpen) return null;

  // Complete Sunday Reset
  const handleFinishReset = async () => {
    soundEngine.playSuccess();
    triggerConfetti();
    setIsClaimed(true);

    // Auto-create next week's 3 big goals as priority tasks
    const goalsToAdd = [goal1.trim(), goal2.trim(), goal3.trim()].filter(Boolean);
    for (const g of goalsToAdd) {
      try {
        addTask({
          title: `[Tuần Mới] ${g}`,
          status: 'Chưa làm',
          priority: 'Cao',
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          projectId: null,
          notes: 'Mục tiêu thiết lập từ Sunday Weekly Reset'
        });
      } catch (err) {
        console.error('Error adding weekly goal task:', err);
      }
    }

    // Award +100 XP and +50 Coins via API
    try {
      await apiCall('/api/gamification/action', 'POST', {
        actionType: 'SUNDAY_WEEKLY_RESET',
        xp: 100,
        coins: 50,
        details: { winReflection, goalCount: goalsToAdd.length }
      });
    } catch {
      // Local fallback
    }

    const currentWeekYear = `${new Date().getFullYear()}_W${Math.ceil(new Date().getDate() / 7)}`;
    localStorage.setItem(`lifeos_sunday_reset_${currentUser?.id}_${currentWeekYear}`, 'true');

    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col my-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 p-5 sm:p-6 pb-3 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Weekly Ritual
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                  Bước {step}/4
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Sunday Weekly Reset 🌿
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="w-full h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* STEP 1: Weekly Recap */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-black text-white">
                  Nhìn lại tuần vừa qua của bạn 📊
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mỗi nỗ lực nhỏ của bạn trong 7 ngày qua đều đã tạo nên sự khác biệt.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* Deep work card */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <Clock className="w-4 h-4" />
                    <span>Deep Work</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">
                      {weeklyStats.focusHours}h
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {weeklyStats.sessionCount} phiên tập trung
                    </span>
                  </div>
                </div>

                {/* Tasks completed card */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                    <CheckSquare className="w-4 h-4" />
                    <span>Nhiệm vụ xong</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">
                      {weeklyStats.completedTaskCount}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Task hoàn thành
                    </span>
                  </div>
                </div>

                {/* Spending card */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <Wallet className="w-4 h-4" />
                    <span>Chi tiêu 7 ngày</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg sm:text-xl font-black text-white font-mono truncate block">
                      {formatCurrency(weeklyStats.totalExpense)}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Đã ghi nhận vào ví
                    </span>
                  </div>
                </div>

                {/* Streak card */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <Flame className="w-4 h-4" />
                    <span>Kỷ luật Streak</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xl sm:text-2xl font-black text-white font-mono flex items-center gap-1">
                      7/7d <Sparkles className="w-4 h-4 text-amber-400" />
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Duy trì đều đặn
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  "Dù kết quả thế nào, việc bạn đã kiên trì có mặt ở đây mỗi ngày đã là một chiến thắng lớn!"
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Micro-Reflection */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div>
                <h3 className="text-lg font-black text-white">
                  Đúc kết & Chữa lành tâm trí 🧘
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Viết nhanh 2 dòng ngắn để đóng lại tuần cũ với sự bình an.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>✨ 1 điều bạn cảm thấy tự hào nhất tuần này?</span>
                  </label>
                  <textarea
                    rows={2}
                    value={winReflection}
                    onChange={(e) => setWinReflection(e.target.value)}
                    placeholder="VD: Đã hoàn thành bài thuyết trình, dậy sớm 5/7 ngày..."
                    className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>🍃 1 điều tuần sau bạn muốn buông bỏ hoặc làm tốt hơn?</span>
                  </label>
                  <textarea
                    rows={2}
                    value={letGoReflection}
                    onChange={(e) => setLetGoReflection(e.target.value)}
                    placeholder="VD: Bớt lướt TikTok sau 11h đêm, bớt overthinking..."
                    className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Next Week's 3 Big Wins */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div>
                <h3 className="text-lg font-black text-white">
                  Top 3 Mục Tiêu Tuần Mới 🎯
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Chỉ cần 3 việc trọng tâm để định hình cả tuần thành công rực rỡ.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
                    1
                  </span>
                  <input
                    type="text"
                    value={goal1}
                    onChange={(e) => setGoal1(e.target.value)}
                    placeholder="Mục tiêu cốt lõi số 1 (Quan trọng nhất)"
                    className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-xs shrink-0">
                    2
                  </span>
                  <input
                    type="text"
                    value={goal2}
                    onChange={(e) => setGoal2(e.target.value)}
                    placeholder="Mục tiêu quan trọng số 2"
                    className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                    3
                  </span>
                  <input
                    type="text"
                    value={goal3}
                    onChange={(e) => setGoal3(e.target.value)}
                    placeholder="Mục tiêu hỗ trợ số 3"
                    className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Reset Victory & Rewards */}
          {step === 4 && (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  Reset Thành Công!
                </span>
                <h3 className="text-xl font-black text-white mt-2">
                  Bạn đã sẵn sàng chinh phục tuần mới 🚀
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  3 mục tiêu lớn đã được chuyển thẳng vào danh sách nhiệm vụ ưu tiên.
                </p>
              </div>

              {/* Reward Pills */}
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 font-black text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>+100 XP Thưởng</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 font-black text-xs flex items-center gap-1.5">
                  <span>🪙 +50 Coins</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                {onOpenStoryShare && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStoryShare();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Flex Thành Tích Tuần (9:16) 📸</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
                >
                  Bắt đầu tuần mới ngay ✨
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {step < 4 && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => {
                soundEngine.playPop();
                setStep((s) => Math.max(1, s - 1) as any);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${step === 1 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setStep((s) => Math.min(3, s + 1) as any);
                }}
                className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishReset}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Hoàn tất & Nhận 100 XP 🎁</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
