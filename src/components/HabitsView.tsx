import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, Plus, Flame, Check, Trash2, X, Loader2, Sparkles, AlertCircle, RotateCcw, 
  Filter, Award, Target, Zap, Clock, Edit2, Calendar, TrendingUp, BarChart2, ShieldCheck,
  ChevronRight, ArrowRight, Star, Search
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Habit } from '../lib/types';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';
import { formatLocalDateKey } from '../lib/utils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { StateHandler } from './common/StateHandler';

export function HabitsView() {
  const { habits = [], addHabit, updateHabit, toggleHabit, deleteHabit, language } = useAppStore();
  const isVi = language === 'vi';
  
  // F5 Reload Persistence for active tab
  const [activeTab, setActiveTab] = useState<'tracker' | 'matrix' | 'analytics'>(() => {
    try {
      const saved = localStorage.getItem('lifeos_habits_active_tab');
      if (saved === 'tracker' || saved === 'matrix' || saved === 'analytics') return saved;
    } catch (e) {}
    return 'tracker';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_habits_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  // F5 Reload Persistence for category filter
  const [activeFilter, setActiveFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('lifeos_habits_filter');
      if (saved) return saved;
    } catch (e) {}
    return 'All';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_habits_filter', activeFilter);
    } catch (e) {}
  }, [activeFilter]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Omnibar state
  const [quickHabitText, setQuickHabitText] = useState('');

  // Undo Toast state for habit toggle check-in
  const [undoToast, setUndoToast] = useState<{ habitId: string; habitName: string; completedBefore: boolean } | null>(null);
  const undoTimeoutRef = useRef<any>(null);

  // Deleted Habit Undo state
  const [deletedHabitUndo, setDeletedHabitUndo] = useState<Habit | null>(null);
  const deleteTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  const handleDeleteHabit = (habit: Habit) => {
    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    setDeletedHabitUndo(habit);
    deleteHabit && deleteHabit(habit.id);
    soundEngine.playPop();
    deleteTimeoutRef.current = setTimeout(() => {
      setDeletedHabitUndo(null);
    }, 5000);
  };

  const handleUndoDeleteHabit = () => {
    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    if (deletedHabitUndo) {
      addHabit && addHabit(deletedHabitUndo);
      setDeletedHabitUndo(null);
      soundEngine.playCelebration();
    }
  };

  const today = formatLocalDateKey(new Date());

  // Generate last 7 days window (oldest to today)
  const last7Days = useMemo(() => {
    const days: { dateKey: string; label: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = formatLocalDateKey(d);
      const dayOfWeek = d.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { weekday: 'short' });
      days.push({
        dateKey,
        label: i === 0 ? (isVi ? 'Hôm nay' : 'Today') : dayOfWeek,
        isToday: i === 0
      });
    }
    return days;
  }, [today, isVi]);

  const parseCompletedDates = (habit: Habit): string[] => {
    if (Array.isArray(habit.completedDates)) return habit.completedDates;
    if (typeof habit.completedDates === 'string') {
      try {
        return JSON.parse(habit.completedDates);
      } catch {
        return [];
      }
    }
    return [];
  };

  const isCompletedOnDate = (habit: Habit, dateKey: string) => {
    const dates = parseCompletedDates(habit);
    return dates.includes(dateKey);
  };

  const isCompletedToday = (habit: Habit) => {
    return isCompletedOnDate(habit, today);
  };

  // Toggle check-in for any date (today or past 6 days)
  const handleToggleDate = async (habit: Habit, dateKey: string) => {
    if (dateKey === today) {
      handleToggleToday(habit);
      return;
    }

    const currentDates = parseCompletedDates(habit);
    const wasCompleted = currentDates.includes(dateKey);
    const nextDates = wasCompleted 
      ? currentDates.filter(d => d !== dateKey) 
      : [...currentDates, dateKey];

    // Recalculate streak
    let streak = 0;
    const checkD = new Date();
    while (true) {
      const k = formatLocalDateKey(checkD);
      if (nextDates.includes(k)) {
        streak++;
        checkD.setDate(checkD.getDate() - 1);
      } else {
        break;
      }
    }

    const bestStreak = Math.max(habit.bestStreak || 0, streak);

    if (!wasCompleted) {
      soundEngine.playSuccess();
    } else {
      soundEngine.playPop();
    }

    if (updateHabit) {
      await updateHabit(habit.id, {
        completedDates: nextDates,
        streak,
        bestStreak
      });
    }
  };

  const handleToggleToday = (habit: Habit) => {
    const wasCompleted = isCompletedToday(habit);
    if (toggleHabit) toggleHabit(habit.id);

    if (!wasCompleted) {
      soundEngine.playPop();
      const otherIncomplete = habits.filter(h => h.id !== habit.id && !isCompletedToday(h));
      if (otherIncomplete.length === 0) {
        triggerConfetti();
        soundEngine.playCelebration();
        soundEngine.speak(isVi ? 'Tuyệt vời! Bạn đã hoàn thành 100% thói quen hôm nay!' : 'Amazing! 100% habits completed today!');
      }
    }

    // Trigger 5-second Undo floating banner
    setUndoToast({ habitId: habit.id, habitName: habit.name, completedBefore: wasCompleted });
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (undoToast && toggleHabit) {
      toggleHabit(undoToast.habitId);
      soundEngine.playPop();
      setUndoToast(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  // 1-Second Quick Habit Omnibar
  const handleQuickHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickHabitText.trim();
    if (!text) return;

    soundEngine.playSuccess();
    triggerConfetti();

    // Infer category
    let category = isVi ? 'Cá nhân' : 'Personal';
    const lower = text.toLowerCase();
    if (lower.includes('nước') || lower.includes('gym') || lower.includes('chạy') || lower.includes('ngủ') || lower.includes('thiền') || lower.includes('thể dục') || lower.includes('ăn')) {
      category = isVi ? 'Sức khỏe' : 'Health';
    } else if (lower.includes('sách') || lower.includes('học') || lower.includes('từ vựng') || lower.includes('code') || lower.includes('bài tập') || lower.includes('đọc')) {
      category = isVi ? 'Học tập' : 'Study';
    } else if (lower.includes('việc') || lower.includes('email') || lower.includes('kế hoạch') || lower.includes('review') || lower.includes('họp')) {
      category = isVi ? 'Công việc' : 'Work';
    }

    await addHabit({
      name: text,
      category: category,
      target: 1,
      streak: 0,
      bestStreak: 0,
      status: 'Active',
      completedDates: []
    });

    setQuickHabitText('');
  };

  // Popular Starter Habit Templates
  const habitTemplates = [
    { name: isVi ? 'Uống 2 lít nước mỗi ngày' : 'Drink 2L of water', category: isVi ? 'Sức khỏe' : 'Health' },
    { name: isVi ? 'Đọc 15 trang sách' : 'Read 15 pages', category: isVi ? 'Học tập' : 'Study' },
    { name: isVi ? 'Ngồi thiền 10 phút' : 'Meditate 10 mins', category: isVi ? 'Sức khỏe' : 'Health' },
    { name: isVi ? 'Chạy bộ / Vận động 20 phút' : '20 min workout / jog', category: isVi ? 'Sức khỏe' : 'Health' },
    { name: isVi ? 'Lập kế hoạch 3 việc quan trọng nhất' : 'Plan top 3 priorities', category: isVi ? 'Công việc' : 'Work' }
  ];

  const handleApplyTemplate = async (tpl: typeof habitTemplates[0]) => {
    soundEngine.playSuccess();
    triggerConfetti();
    await addHabit({
      name: tpl.name,
      category: tpl.category,
      target: 1,
      streak: 0,
      bestStreak: 0,
      status: 'Active',
      completedDates: []
    });
  };

  // Metrics
  const completedTodayCount = habits.filter(h => isCompletedToday(h)).length;
  const maxStreak = habits.length ? Math.max(...habits.map(h => h.streak || 0)) : 0;
  const bestAllTimeStreak = habits.length ? Math.max(...habits.map(h => h.bestStreak || h.streak || 0)) : 0;
  const completionRate = habits.length ? Math.round((completedTodayCount / habits.length) * 100) : 0;

  // Filtered Habits
  const filteredHabits = useMemo(() => {
    return habits.filter(h => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!h.name.toLowerCase().includes(q)) return false;
      }
      const completed = isCompletedToday(h);
      if (activeFilter === 'pending' && completed) return false;
      if (activeFilter === 'completed' && !completed) return false;
      if (activeFilter !== 'All' && activeFilter !== 'pending' && activeFilter !== 'completed') {
        if (h.category !== activeFilter) return false;
      }
      return true;
    });
  }, [habits, activeFilter, searchQuery, today]);

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0 bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {isVi ? 'Theo dõi Thói quen & Chuỗi Kỷ luật' : 'Habits & Discipline Tracker'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal break-words">
                {isVi 
                  ? `Xây dựng chuỗi kỷ luật liên tục (${completedTodayCount}/${habits.length} hoàn thành hôm nay)` 
                  : `Build lasting discipline (${completedTodayCount}/${habits.length} completed today)`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-add-habit"
            onClick={() => {
              soundEngine.playPop();
              setShowAddModal(true);
            }}
            className="min-h-[44px] px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isVi ? 'Thêm thói quen' : 'Add Habit'}</span>
          </button>
        </div>
      </div>

      {/* NATURAL LANGUAGE IN-LINE OMNIBAR: 1-SECOND HABIT CREATION */}
      <form 
        onSubmit={handleQuickHabitSubmit}
        className="p-3 bg-linear-to-r from-emerald-50/70 via-teal-50/40 to-indigo-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-indigo-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
      >
        <div className="relative flex-1">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 pointer-events-none">
            <Flame className="w-4 h-4 fill-current" />
          </div>
          <input
            type="text"
            placeholder={isVi ? "🔥 Nhập nhanh thói quen mới (VD: Uống 2L nước, Đọc 20 trang sách, Chạy bộ 30p)... [Enter]" : "🔥 Quick add habit (e.g. Drink 2L water, Read 20 pages)... [Enter]"}
            value={quickHabitText}
            onChange={e => setQuickHabitText(e.target.value)}
            className="w-full h-11 pl-10 pr-9 text-base sm:text-sm bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
          />
          {quickHabitText && (
            <button
              type="button"
              onClick={() => setQuickHabitText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              title={isVi ? 'Xóa nội dung' : 'Clear text'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!quickHabitText.trim()}
          className="h-11 min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isVi ? 'Thêm Thói Quen' : 'Add Habit'}</span>
        </button>
      </form>

      {/* 4 Interactive Bento KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full min-w-0">
        <div 
          onClick={() => {
            soundEngine.playPop();
            setActiveFilter('All');
            setActiveTab('tracker');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs active:scale-95 ${
            activeFilter === 'All' && activeTab === 'tracker'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng thói quen</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{habits.length}</div>
          <span className="text-[10px] text-slate-400 font-normal mt-1 block">Chạm để xem tất cả</span>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            setActiveFilter(activeFilter === 'pending' ? 'All' : 'pending');
            setActiveTab('tracker');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs active:scale-95 ${
            activeFilter === 'pending' && activeTab === 'tracker'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cần làm hôm nay</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">{Math.max(0, habits.length - completedTodayCount)}</div>
          <span className="text-[10px] text-slate-400 font-normal mt-1 block">Chưa check-in</span>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            setActiveFilter(activeFilter === 'completed' ? 'All' : 'completed');
            setActiveTab('tracker');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs active:scale-95 ${
            activeFilter === 'completed' && activeTab === 'tracker'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đã xong hôm nay</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{completedTodayCount}</div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
          </div>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            setActiveTab('analytics');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs active:scale-95 ${
            activeTab === 'analytics'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kỷ lục Chuỗi</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{maxStreak} <span className="text-xs font-normal text-slate-400">ngày</span></div>
          <span className="text-[10px] text-slate-400 font-normal mt-1 block">Best: {bestAllTimeStreak} ngày</span>
        </div>
      </div>

      {/* Sub-Tabs & Category / Search Filters */}
      <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain py-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:py-2 min-h-[40px] sm:min-h-0 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeTab === 'tracker'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{isVi ? 'Danh sách Hôm nay' : 'Today Tracker'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:py-2 min-h-[40px] sm:min-h-0 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeTab === 'matrix'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{isVi ? 'Ma trận 7 Ngày' : '7-Day Matrix'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:py-2 min-h-[40px] sm:min-h-0 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>{isVi ? 'Thống kê & Kỷ lục' : 'Streaks & Insights'}</span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isVi ? 'Tìm kiếm thói quen...' : 'Search habits...'}
              className="w-full pl-8 pr-7 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-base sm:text-xs bg-white dark:bg-[#141E30] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs font-normal"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                title={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filters Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain py-1">
          {[
            { id: 'All', label: isVi ? 'Tất cả' : 'All' },
            { id: 'pending', label: isVi ? '⏳ Chưa làm' : '⏳ Pending' },
            { id: 'completed', label: isVi ? '✓ Đã xong' : '✓ Done' },
            { id: isVi ? 'Sức khỏe' : 'Health', label: isVi ? 'Sức khỏe' : 'Health' },
            { id: isVi ? 'Học tập' : 'Study', label: isVi ? 'Học tập' : 'Study' },
            { id: isVi ? 'Công việc' : 'Work', label: isVi ? 'Công việc' : 'Work' },
            { id: isVi ? 'Cá nhân' : 'Personal', label: isVi ? 'Cá nhân' : 'Personal' }
          ].map(chip => (
            <button
              type="button"
              key={chip.id}
              onClick={() => {
                soundEngine.playPop();
                setActiveFilter(chip.id);
              }}
              className={`px-3 py-2 sm:py-1.5 min-h-[38px] sm:min-h-0 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                activeFilter === chip.id
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: TODAY TRACKER */}
      {activeTab === 'tracker' && (
        <StateHandler
          isEmpty={filteredHabits.length === 0}
          type="list"
          skeletonCount={3}
          emptyTitle={isVi ? 'Không tìm thấy thói quen nào phù hợp' : 'No matching habits found'}
          emptyDescription={isVi ? 'Hãy chọn bộ lọc khác hoặc thêm thói quen mới để duy trì kỷ luật!' : 'Try another filter or create a new habit!'}
          onEmptyAction={() => {
            soundEngine.playPop();
            setShowAddModal(true);
          }}
          emptyActionLabel={isVi ? 'Thêm thói quen ngay' : 'Add Habit Now'}
        >
          <div className="space-y-3 animate-page-enter w-full min-w-0">
            {filteredHabits.map((habit: Habit) => {
              const completed = isCompletedToday(habit);
              return (
                <div
                  key={habit.id}
                  className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all gap-3 w-full min-w-0 shadow-xs ${
                    completed
                      ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800'
                      : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Touch Target Check-in >= 44x44px */}
                    <button
                      type="button"
                      onClick={() => handleToggleToday(habit)}
                      className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl transition-all cursor-pointer shrink-0 active:scale-95"
                      title={completed ? (isVi ? 'Đánh dấu chưa hoàn thành' : 'Mark incomplete') : (isVi ? 'Hoàn thành hôm nay' : 'Check in today')}
                      aria-label={`Toggle habit ${habit.name}`}
                    >
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        completed
                          ? 'bg-emerald-500 border border-emerald-500 text-white shadow-xs scale-105'
                          : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-500'
                      }`}>
                        {completed && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </button>

                    <div className="min-w-0 flex-1 py-0.5">
                      <h4
                        className={`font-semibold text-sm sm:text-base leading-snug break-words transition-colors ${
                          completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {habit.name}
                      </h4>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
                          {habit.category || (isVi ? 'Cá nhân' : 'Personal')}
                        </span>
                        {habit.target > 1 && (
                          <span className="text-[10px] text-slate-400">
                            {habit.target} {habit.unitLabel || (isVi ? 'lần/ngày' : 'times/day')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Quick Micro-Matrix on Habit Card */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {last7Days.map((day) => {
                        const isDone = isCompletedOnDate(habit, day.dateKey);
                        return (
                          <button
                            type="button"
                            key={day.dateKey}
                            onClick={() => handleToggleDate(habit, day.dateKey)}
                            title={`${day.label}: ${isDone ? (isVi ? 'Đã hoàn thành' : 'Done') : (isVi ? 'Chưa hoàn thành' : 'Incomplete')}`}
                            className={`w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[10px] sm:text-[9px] font-bold transition-all cursor-pointer active:scale-90 ${
                              isDone
                                ? 'bg-emerald-500 text-white shadow-2xs'
                                : day.isToday
                                ? 'border-2 border-emerald-400 dark:border-emerald-500/70 text-slate-600 dark:text-slate-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {isDone ? '✓' : day.label.charAt(0)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                      {/* Streak Count */}
                      <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/60 shadow-2xs shrink-0">
                        <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        <span className="font-mono tabular-nums">{habit.streak || 0}</span>
                        <span className="text-[10px] sm:text-[11px]">{isVi ? 'ngày' : 'd'}</span>
                      </div>

                      {/* Edit & Delete Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingHabit(habit)}
                          className="w-10 h-10 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={isVi ? 'Sửa thói quen' : 'Edit habit'}
                          aria-label={`Edit habit ${habit.name}`}
                        >
                          <Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteHabit(habit)}
                          className="w-10 h-10 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={isVi ? 'Xóa thói quen' : 'Delete habit'}
                          aria-label={`Delete habit ${habit.name}`}
                        >
                          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </StateHandler>
      )}

      {/* TAB 2: 7-DAY MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-[#141E30] p-4 sm:p-6 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs space-y-4 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <span>{isVi ? 'Ma trận Tính nhất quán 7 Ngày' : '7-Day Consistency Matrix'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVi ? 'Bấm vào từng ô để đánh dấu hoàn thành nhanh hoặc bù ngày bị sót' : 'Tap any cell to mark complete or catch up on missed days'}
              </p>
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">{isVi ? 'Thói quen' : 'Habit'}</th>
                {last7Days.map(d => (
                  <th key={d.dateKey} className="py-2.5 px-2 text-center">
                    <span className={d.isToday ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''}>
                      {d.label}
                    </span>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHabits.length === 0 ? (
                <tr>
                  <td colSpan={last7Days.length + 2} className="py-8 text-center text-slate-400 italic text-xs">
                    {isVi ? 'Không có thói quen nào phù hợp bộ lọc.' : 'No habits match the current filter.'}
                  </td>
                </tr>
              ) : (
                filteredHabits.map((habit: Habit) => (
                <tr key={habit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    <div className="truncate max-w-[180px] sm:max-w-xs">{habit.name}</div>
                    <span className="text-[10px] text-slate-400">{habit.category}</span>
                  </td>
                  {last7Days.map(day => {
                    const isDone = isCompletedOnDate(habit, day.dateKey);
                    return (
                      <td key={day.dateKey} className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleDate(habit, day.dateKey)}
                          className={`w-7 h-7 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                            isDone
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : day.isToday
                              ? 'border-2 border-emerald-500/60 bg-white dark:bg-slate-800 text-slate-400 hover:border-emerald-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : '·'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                    {habit.streak || 0}d
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ANALYTICS & INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs text-center space-y-2">
              <Award className="w-10 h-10 text-amber-500 mx-auto" />
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{bestAllTimeStreak} ngày</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kỷ lục Chuỗi dài nhất từng đạt</p>
            </div>

            <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs text-center space-y-2">
              <Zap className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{completionRate}%</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ hoàn thành mục tiêu hôm nay</p>
            </div>

            <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-blue-500 mx-auto" />
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {habits.reduce((acc, h) => acc + parseCompletedDates(h).length, 0)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tổng số lượt check-in thói quen</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141E30] p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Bảng vàng Thói quen xuất sắc nhất</span>
            </h4>
            <div className="space-y-2">
              {[...habits]
                .sort((a, b) => (b.streak || 0) - (a.streak || 0))
                .slice(0, 5)
                .map((h, idx) => (
                  <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">{h.name}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {h.streak || 0} ngày liên tục
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick 1-Click Habit Templates Strip */}
      {habits.length < 5 && (
        <div className="p-4 bg-white dark:bg-[#141E30] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isVi ? 'Gợi ý thói quen phổ biến (Thêm 1 chạm):' : 'Popular habits (1-click add):'}</span>
          </span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {habitTemplates.map((tpl, i) => (
              <button
                type="button"
                key={i}
                onClick={() => handleApplyTemplate(tpl)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3 h-3 text-emerald-500" />
                <span>{tpl.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Undo Toast for Deleted Habit (5 Seconds) */}
      {deletedHabitUndo && (
        <div className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-xl border border-slate-700/50 dark:border-slate-200 animate-slide-up backdrop-blur-md max-w-sm sm:max-w-md">
          <span className="text-xs sm:text-sm font-medium truncate flex-1">
            {isVi ? `Đã xóa thói quen: "${deletedHabitUndo.name}"` : `Deleted habit: "${deletedHabitUndo.name}"`}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndoDeleteHabit}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1 min-h-[38px] sm:min-h-0 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isVi ? 'Hoàn tác (5s)' : 'Undo (5s)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
                setDeletedHabitUndo(null);
              }}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
              title={isVi ? 'Đóng' : 'Close'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Undo Toast for Check-in (5 Seconds) */}
      {undoToast && (
        <div className={`fixed left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-xl border border-slate-700/50 dark:border-slate-200 animate-slide-up backdrop-blur-md max-w-sm sm:max-w-md ${
          deletedHabitUndo 
            ? 'bottom-[max(8.5rem,calc(env(safe-area-inset-bottom)+8rem))] sm:bottom-20' 
            : 'bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-6'
        }`}>
          <span className="text-xs sm:text-sm font-medium truncate flex-1">
            {undoToast.completedBefore 
              ? (isVi ? `Đã hủy hoàn thành: "${undoToast.habitName}"` : `Marked incomplete: "${undoToast.habitName}"`)
              : (isVi ? `Đã hoàn thành: "${undoToast.habitName}"` : `Checked in: "${undoToast.habitName}"`)}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-2 sm:py-1 min-h-[38px] sm:min-h-0 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isVi ? 'Hoàn tác' : 'Undo'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                setUndoToast(null);
              }}
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
              title={isVi ? 'Đóng' : 'Close'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Add Habit Modal */}
      {showAddModal && (
        <HabitModal
          habit={null}
          onClose={() => setShowAddModal(false)}
          onSave={async (h: any) => {
            soundEngine.playSuccess();
            triggerConfetti();
            await addHabit({
              name: h.name,
              category: h.category,
              target: h.target || 1,
              streak: 0,
              bestStreak: 0,
              status: 'Active',
              completedDates: []
            });
            setShowAddModal(false);
          }}
          isVi={isVi}
        />
      )}

      {/* Edit Habit Modal */}
      {editingHabit && (
        <HabitModal
          habit={editingHabit}
          onClose={() => setEditingHabit(null)}
          onSave={async (h: any) => {
            soundEngine.playSuccess();
            if (updateHabit) {
              await updateHabit(editingHabit.id, {
                name: h.name,
                category: h.category,
                target: h.target
              });
            }
            setEditingHabit(null);
          }}
          isVi={isVi}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// REUSABLE SMART DISMISS HABIT MODAL
// ----------------------------------------------------------------------
function HabitModal({ habit, onClose, onSave, isVi }: any) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const initialName = habit?.name || '';
  const initialCategory = habit?.category || (isVi ? 'Cá nhân' : 'Personal');
  const initialTarget = habit?.target || 1;

  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [target, setTarget] = useState(initialTarget);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormDirty = name.trim() !== initialName || category !== initialCategory || Number(target) !== Number(initialTarget);

  const triggerShake = () => {
    setIsShaking(true);
    soundEngine.playPop();
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSafeDismiss = () => {
    if (isSubmitting) return;
    if (isFormDirty) {
      triggerShake();
      return;
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        if (isFormDirty) triggerShake();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting, isFormDirty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage(isVi ? 'Vui lòng nhập tên thói quen' : 'Please enter habit name');
      return;
    }

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSave({ name: trimmed, category, target: Math.max(1, Number(target) || 1) }));
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Lỗi khi lưu thói quen' : 'Failed to save habit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget && !isSubmitting) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-[80] bg-slate-900/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-backdrop-fade cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#141E30] rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-4 animate-modal-enter my-auto transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {habit ? (isVi ? 'Chỉnh Sửa Thói Quen' : 'Edit Habit') : (isVi ? 'Thói Quen Mới' : 'New Habit')}
          </h3>
          <button
            type="button"
            onClick={handleSafeDismiss}
            disabled={isSubmitting}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Tên thói quen' : 'Habit Name'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                placeholder={isVi ? 'VD: Đọc 20 trang sách, Chạy bộ 30p...' : 'e.g. Read 20 pages, 30m Run...'}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-8 min-h-[44px] text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title={isVi ? 'Xóa tên' : 'Clear name'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Danh mục' : 'Category'}
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value={isVi ? 'Cá nhân' : 'Personal'}>{isVi ? 'Cá nhân' : 'Personal'}</option>
              <option value={isVi ? 'Công việc' : 'Work'}>{isVi ? 'Công việc' : 'Work'}</option>
              <option value={isVi ? 'Sức khỏe' : 'Health'}>{isVi ? 'Sức khỏe' : 'Health'}</option>
              <option value={isVi ? 'Học tập' : 'Study'}>{isVi ? 'Học tập' : 'Study'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isVi ? 'Mục tiêu (lần/ngày)' : 'Daily Target (times/day)'}
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={target}
              onChange={e => setTarget(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleSafeDismiss}
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-2 active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isVi ? 'Đang lưu...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{habit ? (isVi ? 'Lưu Thay Đổi' : 'Save Changes') : (isVi ? 'Tạo Thói Quen' : 'Create Habit')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HabitsView;
