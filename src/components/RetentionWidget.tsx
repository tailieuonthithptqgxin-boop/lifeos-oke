import React, { useState, useEffect } from 'react';
import {
  Flame,
  Zap,
  Sparkles,
  Trophy,
  CheckCircle2,
  Circle,
  ChevronRight,
  Coins,
  ArrowRight,
  Target
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';

interface RetentionWidgetProps {
  onQuestClick?: (category: string) => void;
  compact?: boolean;
}

export function RetentionWidget({ onQuestClick, compact = false }: RetentionWidgetProps) {
  const { currentUser, setCurrentView } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    level: number;
    levelTitle: string;
    totalXp: number;
    xpNeededForNextLevel: number;
    levelProgressPercent: number;
    coins: number;
    currentStreak: number;
    dailyQuests: Array<{
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
    }>;
  } | null>(null);

  const fetchProgression = async () => {
    try {
      const res = await apiCall('/api/progression');
      if (res && res.data) {
        setData(res.data);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lifeos-progression-updated', { detail: res.data }));
        }
      }
    } catch (e) {
      console.warn('RetentionWidget: could not load progression', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgression();
  }, [currentUser]);

  const handleClaim = async (questKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiCall('/api/progression/quest/claim', 'POST', { questKey });
      if (res && res.success) {
        soundEngine.playSuccess();
        triggerConfetti();
        await fetchProgression();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nhận thưởng');
    }
  };

  if (compact) {
    if (!data) return null;
    return (
      <div 
        onClick={() => setCurrentView('journey')}
        className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-xs shadow-xs">
          <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
          <span>{data.currentStreak} ngày</span>
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Lv.{data.level}</span>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 text-white min-w-[280px] animate-pulse">
        <div className="h-4 bg-white/20 rounded w-1/2 mb-3" />
        <div className="h-2 bg-white/20 rounded w-full" />
      </div>
    );
  }

  const completedCount = data.dailyQuests.filter(q => q.isCompleted).length;

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 p-4 sm:p-5 shadow-xl space-y-3.5 relative overflow-hidden text-white min-w-[280px]">
      
      {/* Top Streak & Level Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 text-lg">
            🔥
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-sm">
                Chuỗi {data.currentStreak} Ngày
              </span>
            </div>
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Coins className="w-3 h-3" />
              <span>{data.coins} Coins</span>
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            {data.levelTitle.split(' · ')[0]}
          </span>
          <span className="font-black text-white text-sm">
            Level {data.level}
          </span>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-semibold text-slate-300">
          <span>Tiến độ cấp độ ({data.totalXp} XP)</span>
          <span className="text-emerald-400 font-bold">Còn {data.xpNeededForNextLevel} XP</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(4, data.levelProgressPercent)}%` }}
          />
        </div>
      </div>

      {/* Daily Quests List (First 3) */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Target className="w-3 h-3 text-emerald-400" />
            <span>Nhiệm vụ hôm nay</span>
          </span>
          <span className="text-[10px] font-bold text-slate-300">
            {completedCount}/{data.dailyQuests.length}
          </span>
        </div>

        <div className="space-y-1.5">
          {data.dailyQuests.slice(0, 3).map((quest) => (
            <div
              key={quest.id}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                quest.isClaimed
                  ? 'bg-slate-800/40 text-slate-400'
                  : quest.isCompleted
                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200'
                  : 'bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                {quest.isClaimed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : quest.isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span className={`text-xs truncate ${quest.isClaimed ? 'line-through opacity-70' : 'font-medium'}`}>
                  {quest.title} ({quest.current}/{quest.target})
                </span>
              </div>

              {quest.isCompleted && !quest.isClaimed ? (
                <button
                  type="button"
                  onClick={(e) => handleClaim(quest.key, e)}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] shadow-xs active:scale-95 transition shrink-0 cursor-pointer"
                >
                  Nhận 🪙
                </button>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  +{quest.rewardXp} XP
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA: Jump to Journey */}
      <button
        type="button"
        onClick={() => setCurrentView('journey')}
        className="w-full pt-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 transition cursor-pointer"
      >
        <span>Mở Hành Trình Của Tôi (Bản đồ 5 Chương)</span>
        <ArrowRight className="w-3 h-3" />
      </button>

    </div>
  );
}
