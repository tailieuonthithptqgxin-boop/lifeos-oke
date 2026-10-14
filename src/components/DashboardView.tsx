import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { 
  CheckSquare, Calendar, Wallet, Target, Activity, Clock, 
  Zap, ArrowRight, BookOpen, Flame, X, Check, Play, Pause, Square, AlertTriangle, Plus,
  FolderKanban, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ChevronRight, ChevronLeft,
  PieChart, Building, MoreHorizontal, FileEdit, RotateCcw, ChevronDown, ChevronUp, Sparkles, Award
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { ResponsiveContainer, RadialBarChart, RadialBar, Cell } from 'recharts';
import { retentionEngine } from '../lib/retentionEngine';
import { RetentionWidget } from './RetentionWidget';
import { CelebrationModal } from './CelebrationModal';
import { EmptyState } from './EmptyState';
import { soundEngine } from '../lib/soundEngine';
import { GenZMood, MOOD_PRESETS, getTodayMood, setTodayMood } from '../lib/moodEngine';
import { ShareStoryModal } from './ShareStoryModal';
import { compute5DHarmony } from '../lib/lifeHarmonyEngine';
import { LifeHarmonyRadarWidget } from './LifeHarmonyRadarWidget';
import { loadVocabData, buildTodayStudyPlan } from '../lib/vocabEngine';
import { DailyTrifectaWidget } from './dashboard/DailyTrifectaWidget';
import { ZenFocusOverlay } from './focus/ZenFocusOverlay';
import { DopaminePetWidget } from './companion/DopaminePetWidget';
import { SundayWeeklyResetModal } from './dashboard/SundayWeeklyResetModal';
import { streakFreezeEngine } from '../lib/streakFreezeEngine';
import { vibeThemeEngine } from '../lib/vibeThemeEngine';
import { VibeThemeModal } from './VibeThemeModal';
import { LifeOsWrappedModal } from './dashboard/LifeOsWrappedModal';
import { AiLifeBuddyCopilotModal } from './companion/AiLifeBuddyCopilotModal';
import { QuickPersonaQuizModal } from './onboarding/QuickPersonaQuizModal';
import { StreakResurrectionModal } from './dashboard/StreakResurrectionModal';
import { WeeklyLeaderboardModal } from './dashboard/WeeklyLeaderboardModal';

export function DashboardView() {
  const { 
    tasks, events, transactions, goals, habits, habitRecords, subjects,
    focusSessions, focusGoals, studyAssignments, projects = [], financeAccounts = [],
    budgets = [],
    addTask, updateTask, addTransaction, updateHabit, addHabitRecord, lifeScore, dailyCapacity,
    setCurrentView, clearWorkspace, workspaceMode, onboardingPreferences, language, currentUser,
    subscriptionStatus
  } = useAppStore();

  const t = useTranslation(language);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = selectedDate.toISOString().split('T')[0];

  // Modals & Menu States
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showExtendedMetrics, setShowExtendedMetrics] = useState(false);
  const [celebration, setCelebration] = useState<{
    title: string;
    subtitle: string;
    xpAwarded?: number;
    streakCount?: number;
    badgeName?: string;
  } | null>(null);
  const [todayMood, setTodayMoodState] = useState<GenZMood>(() => getTodayMood());
  const [showShareStory, setShowShareStory] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showSundayReset, setShowSundayReset] = useState(false);
  const [showVibeThemeModal, setShowVibeThemeModal] = useState(false);
  const [showWrappedModal, setShowWrappedModal] = useState(false);
  const [showAiBuddyModal, setShowAiBuddyModal] = useState(false);
  const [showPersonaQuizModal, setShowPersonaQuizModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [streakShield, setStreakShield] = useState(() => streakFreezeEngine.getStatus(currentUser?.id));
  const [resurrectionStatus, setResurrectionStatus] = useState(() => streakFreezeEngine.getResurrectionStatus(currentUser?.id));
  const [showResurrectionModal, setShowResurrectionModal] = useState(false);
  const [zenFocusOpen, setZenFocusOpen] = useState(false);
  const [zenFocusTaskId, setZenFocusTaskId] = useState<string | undefined>(undefined);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<any>('Trung bình');
  const [quickTaskHours, setQuickTaskHours] = useState<number>(1);

  // Sync streak shield & resurrection when user changes
  useEffect(() => {
    setStreakShield(streakFreezeEngine.getStatus(currentUser?.id));
    setResurrectionStatus(streakFreezeEngine.getResurrectionStatus(currentUser?.id));
  }, [currentUser]);

  // Global lifeos event triggers from Spotlight / Command palette
  useEffect(() => {
    const handleOpenZen = () => setZenFocusOpen(true);
    const handleOpenReset = () => setShowSundayReset(true);
    const handleOpenStory = () => setShowShareStory(true);
    const handleOpenMood = () => setShowMoodPicker(true);
    const handleOpenTheme = () => setShowVibeThemeModal(true);
    const handleOpenWrapped = () => setShowWrappedModal(true);
    const handleOpenAi = () => setShowAiBuddyModal(true);
    const handleOpenQuiz = () => setShowPersonaQuizModal(true);
    const handleOpenLeaderboard = () => setShowLeaderboard(true);
    const handleToggleRestDay = () => {
      streakFreezeEngine.toggleRestDay(currentUser?.id);
      setStreakShield(streakFreezeEngine.getStatus(currentUser?.id));
    };

    window.addEventListener('lifeos:open-zen-focus', handleOpenZen);
    window.addEventListener('lifeos:open-sunday-reset', handleOpenReset);
    window.addEventListener('lifeos:open-share-story', handleOpenStory);
    window.addEventListener('lifeos:open-mood-picker', handleOpenMood);
    window.addEventListener('lifeos:open-theme-modal', handleOpenTheme);
    window.addEventListener('lifeos:open-wrapped-modal', handleOpenWrapped);
    window.addEventListener('lifeos:open-ai-buddy', handleOpenAi);
    window.addEventListener('lifeos:open-persona-quiz', handleOpenQuiz);
    window.addEventListener('lifeos:open-leaderboard', handleOpenLeaderboard);
    window.addEventListener('lifeos:toggle-rest-day', handleToggleRestDay);

    return () => {
      window.removeEventListener('lifeos:open-zen-focus', handleOpenZen);
      window.removeEventListener('lifeos:open-sunday-reset', handleOpenReset);
      window.removeEventListener('lifeos:open-share-story', handleOpenStory);
      window.removeEventListener('lifeos:open-mood-picker', handleOpenMood);
      window.removeEventListener('lifeos:open-theme-modal', handleOpenTheme);
      window.removeEventListener('lifeos:open-wrapped-modal', handleOpenWrapped);
      window.removeEventListener('lifeos:open-ai-buddy', handleOpenAi);
      window.removeEventListener('lifeos:open-persona-quiz', handleOpenQuiz);
      window.removeEventListener('lifeos:open-leaderboard', handleOpenLeaderboard);
      window.removeEventListener('lifeos:toggle-rest-day', handleToggleRestDay);
    };
  }, [currentUser]);
  
  // Routine persistence by date
  const [routineState, setRoutineState] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`lifeos_routine_${dateStr}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`lifeos_routine_${dateStr}`);
      setRoutineState(saved ? JSON.parse(saved) : {});
    } catch {
      setRoutineState({});
    }
  }, [dateStr]);

  const toggleRoutine = (index: number, val: boolean) => {
    setRoutineState(prev => {
      const updated = { ...prev, [index]: val };
      try {
        localStorage.setItem(`lifeos_routine_${dateStr}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Data Filters for Selected Date
  const todayTasks = (tasks || []).filter(t => t.dueDate && t.dueDate.startsWith(dateStr) && t.status !== 'Hủy' && t.status !== 'Cancelled');
  const pendingTasks = todayTasks.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Completed');
  const completedTasks = todayTasks.filter(t => t.status === 'Hoàn thành' || t.status === 'Completed');
  
  const todayEvents = (events || []).filter(e => e.date && e.date.startsWith(dateStr));
  
  const todayExpenses = (transactions || [])
    .filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && t.date && t.date.startsWith(dateStr))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const todayIncome = (transactions || [])
    .filter(t => (t.type === 'Thu nhập' || t.type === 'Income') && t.date && t.date.startsWith(dateStr))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Time & Capacity
  const plannedTaskHours = todayTasks.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);
  const actualTaskHours = todayTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
  const utilization = dailyCapacity > 0 ? Math.min((plannedTaskHours / dailyCapacity) * 100, 100) : 0;
  const isOverload = plannedTaskHours > dailyCapacity;

  // Study & Focus Metrics for Selected Date
  const todayFocusSessions = (focusSessions || []).filter(s => 
    s.status === 'Completed' && (s.createdAt?.startsWith(dateStr) || s.startTime?.startsWith(dateStr))
  );
  const todayFocusMinutes = todayFocusSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
  const dailyFocusGoal = (focusGoals || []).find(g => g.type === 'daily');
  const targetStudyHours = dailyFocusGoal?.targetHours || 3;
  const targetStudyMinutes = targetStudyHours * 60;
  const studyHours = Math.floor(todayFocusMinutes / 60);
  const studyMinutes = todayFocusMinutes % 60;
  const studyDisplayValue = todayFocusMinutes > 0 
    ? (studyHours > 0 ? `${studyHours}h ${studyMinutes > 0 ? `${studyMinutes}m` : ''}` : `${studyMinutes}m`) 
    : '0m';
  const studySubtext = `/ ${targetStudyHours}h target`;

  // Goals Metrics (Dynamic average progress of active goals)
  const activeGoals = (goals || []).filter(g => g.status !== 'Archived');
  const avgGoalProgress = activeGoals.length > 0 
    ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length)
    : 0;
  const completedGoalsCount = activeGoals.filter(g => g.status === 'Completed' || g.progress >= 100).length;
  const goalsDisplayValue = `${avgGoalProgress}%`;
  const goalsSubtext = activeGoals.length > 0 ? `${completedGoalsCount}/${activeGoals.length} completed` : 'No goals yet';

  // Habits completed for selected date
  const completedHabitsToday = (habits || []).filter(h => 
    h.completedDates?.includes(dateStr) || 
    (habitRecords || []).some(r => r.habitId === h.id && r.date === dateStr && r.status === 'Completed')
  );

  // Due Vocabulary Words count based on Spaced Repetition (Real Data)
  const dueVocabCount = React.useMemo(() => {
    try {
      const vocab = loadVocabData(currentUser?.id || 'current_user');
      const activeLang = (vocab?.languages || []).find(l => l.id === vocab?.activeLanguageId) || vocab?.languages?.[0];
      const langId = activeLang?.id || 'en';
      const words = (vocab?.words && vocab.words[langId]) || [];
      const plan = buildTodayStudyPlan(words, activeLang?.dailyNewWordTarget || 10, activeLang?.dailyReviewTarget || 30);
      return plan.totalToStudy || 0;
    } catch {
      return 0;
    }
  }, [currentUser?.id]);

  // Daily Score Calculation (0 - 100 points) - STRICT REAL DATA ONLY
  // Tasks: 30 pts max
  const taskScore = todayTasks.length > 0 
    ? (completedTasks.length / todayTasks.length) * 30 
    : (tasks.length > 0 ? (tasks.filter(t => t.status === 'Hoàn thành' || t.status === 'Completed').length / tasks.length) * 20 : 0);
  // Habits: 25 pts max
  const habitScore = habits.length > 0 
    ? (completedHabitsToday.length / habits.length) * 25 
    : 0;
  // Study/Focus: 25 pts max
  const focusScore = targetStudyMinutes > 0 && todayFocusMinutes > 0
    ? Math.min(25, (todayFocusMinutes / targetStudyMinutes) * 25) 
    : 0;
  // Goals progress: 20 pts max
  const goalScore = activeGoals.length > 0 
    ? (avgGoalProgress / 100) * 20 
    : 0;
  const dailyScore = Math.min(100, Math.round(taskScore + habitScore + focusScore + goalScore));

  // Finance Summary Calculations
  const totalBalance = (financeAccounts || []).reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTx = (transactions || []).filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyIncome = monthlyTx.filter(t => t.type === 'Thu nhập' || t.type === 'Income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const monthlyExpense = monthlyTx.filter(t => t.type === 'Chi tiêu' || t.type === 'Expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const netMonthly = monthlyIncome - monthlyExpense;
  const recentTransactions = [...(transactions || [])]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 3);

  // 3-Second Rule Cockpit Calculations
  const now = new Date();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - now.getDate() + 1);
  
  // Real budget calculation - support limit or amount properties, no fake 10M fallback
  const totalConfiguredBudget = (budgets || []).reduce((sum: number, b: any) => sum + (Number(b.limit) || Number(b.amount) || 0), 0);
  const hasBudgetBaseline = totalConfiguredBudget > 0 || monthlyIncome > 0;
  const userMonthlyBudget = totalConfiguredBudget > 0 ? totalConfiguredBudget : (monthlyIncome > 0 ? monthlyIncome : 0);
  const remainingBudgetMonth = Math.max(0, userMonthlyBudget - monthlyExpense);
  const dailySafeToSpendBudget = hasBudgetBaseline ? Math.round(remainingBudgetMonth / daysRemainingInMonth) : 0;
  const safeToSpendTodayRemaining = hasBudgetBaseline ? (dailySafeToSpendBudget - todayExpenses) : -todayExpenses;
  
  // Real discipline streak calculation
  const maxHabitStreak = (habits || []).length > 0 
    ? Math.max(0, ...(habits || []).map((h: any) => Number(h.streak) || 0)) 
    : 0;

  // Cockpit 3-Second Priority Tasks
  const cockpitTrifectaTasks = [...pendingTasks]
    .sort((a, b) => {
      const prioOrder: Record<string, number> = { 'Nghiêm trọng': 0, 'Cao': 1, 'Trung bình': 2, 'Thấp': 3 };
      return (prioOrder[a.priority || 'Trung bình'] ?? 2) - (prioOrder[b.priority || 'Trung bình'] ?? 2);
    })
    .slice(0, 3);

  // Projects Summary Calculations
  const activeProjects = (projects || []).filter(p => p.status !== 'Hoàn thành' && p.status !== 'Tạm dừng');
  const recentProjects = [...(projects || [])]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 3);
  const totalProjectsCount = (projects || []).length;

  // Risk Detection
  const risks = [];
  if (isOverload) risks.push({ type: 'Capacity Risk', message: `Capacity overload: Planned (${plannedTaskHours}h) exceeds daily capacity (${dailyCapacity}h)` });
  if (pendingTasks.some(t => t.priority === 'Cao' || t.priority === 'Nghiêm trọng' || t.priority === 'High' || t.priority === 'Critical')) risks.push({ type: 'Deadline Risk', message: 'High-priority pending tasks require attention' });
  if (todayExpenses > 500000) risks.push({ type: 'Finance Risk', message: `Spending today (${formatCurrency(todayExpenses)}) is higher than daily baseline` });

  // Timer State
  const [activeTimerTask, setActiveTimerTask] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (activeTimerTask) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimerTask]);

  const toggleTimer = (taskId: string) => {
    if (activeTimerTask === taskId) {
      // Stop timer and save
      const task = (tasks || []).find(t => t.id === taskId);
      if (task) {
        const hoursToAdd = Number((timerSeconds / 3600).toFixed(2));
        updateTask(taskId, { actualHours: (task.actualHours || 0) + hoursToAdd });
      }
      setActiveTimerTask(null);
      setTimerSeconds(0);
    } else {
      if (activeTimerTask) {
        // Save previous timer before starting new
        const prevTask = (tasks || []).find(t => t.id === activeTimerTask);
        if (prevTask) {
          const hoursToAdd = Number((timerSeconds / 3600).toFixed(2));
          updateTask(activeTimerTask, { actualHours: (prevTask.actualHours || 0) + hoursToAdd });
        }
      }
      setActiveTimerTask(taskId);
      setTimerSeconds(0);
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return { text: t('Good morning'), sub: t('Ready to kickstart an energetic new day!') };
    if (hour >= 12 && hour < 18) return { text: t('Good afternoon'), sub: t('Maintain momentum and conquer your goals today!') };
    if (hour >= 18 && hour < 22) return { text: t('Good evening'), sub: t('Review your progress and wind down smoothly.') };
    return { text: t('Late night'), sub: t('Wrap up your focus and get some restful sleep.') };
  };
  const greeting = getGreeting();

  const scoreData = [
    { name: 'Score', value: dailyScore, fill: dailyScore >= 75 ? '#10b981' : dailyScore >= 40 ? '#f59e0b' : '#ef4444' },
    { name: 'Remaining', value: 100 - dailyScore, fill: '#f1f5f9' }
  ];

  const harmonyOverview = compute5DHarmony({
    tasks: tasks || [],
    habits: habits || [],
    habitRecords: habitRecords || [],
    focusSessions: focusSessions || [],
    focusGoals: focusGoals || [],
    transactions: transactions || [],
    budgets: budgets || [],
    financeAccounts: financeAccounts || [],
    goals: goals || [],
    selectedDate: dateStr
  });

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* Streak Resurrection 24h Second Chance Alert Banner */}
      {resurrectionStatus.isPending && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/70 via-rose-950/50 to-amber-950/70 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  {t("24h Streak Rescue Challenge")} 🛡️
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold animate-pulse">
                  {t("Counting down")}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                {t(`Your ${resurrectionStatus.lostStreak}-day streak was broken! Complete 1 challenge to resurrect it now.`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowResurrectionModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            {t("Rescue Streak Now")}
          </button>
        </div>
      )}

      {/* 1. Bento Hero Banner with Dynamic Greeting, Streak & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/95 dark:bg-slate-950/95 p-5 sm:p-7 text-white shadow-xl border border-slate-800/80">
        {/* Ambient mesh background effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col xl:flex-row items-stretch xl:items-start justify-between gap-6">
          <div className="space-y-4 flex-1 min-w-0">
            {/* Top Badge Cluster */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{formatDate(selectedDate)} · {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Gen Z Mood of the Day Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoodPicker(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 ${MOOD_PRESETS[todayMood].badgeBg}`}
                >
                  <span>{MOOD_PRESETS[todayMood].emoji}</span>
                  <span>{t(MOOD_PRESETS[todayMood].label)}</span>
                </button>

                {showMoodPicker && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMoodPicker(false)} />
                    <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-40 space-y-1 text-xs animate-in fade-in zoom-in-95">
                      <span className="text-[10px] uppercase font-black text-slate-400 px-2 tracking-wider block">{t("Choose Today's Vibe")}</span>
                      {(Object.keys(MOOD_PRESETS) as GenZMood[]).map(key => {
                        const m = MOOD_PRESETS[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              soundEngine.playPop();
                              setTodayMood(key);
                              setTodayMoodState(key);
                              setShowMoodPicker(false);
                            }}
                            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${todayMood === key ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
                          >
                            <span className="text-base">{m.emoji}</span>
                            <div className="min-w-0">
                              <span className="block truncate">{t(m.label)}</span>
                              <span className="text-[10px] text-slate-400 block truncate">{t(m.vibe)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Flex Story Modal Trigger */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setShowShareStory(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                <span>📸</span>
                <span>{t("Share Story")}</span>
              </button>

              {/* Rest Day / Streak Freeze Shield Button */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  streakFreezeEngine.toggleRestDay(currentUser?.id);
                  setStreakShield(streakFreezeEngine.getStatus(currentUser?.id));
                }}
                title={streakShield.isRestDayActive 
                  ? t("Rest Day active · Your streak is 100% protected") 
                  : t(`You have ${streakShield.freezeCount} Streak Freezes ❄️. Click to activate Rest Day mode`)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                  streakShield.isRestDayActive
                    ? 'bg-lime-500/20 text-lime-300 border-lime-500/50 shadow-xs'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-lime-500/40'
                }`}
              >
                <span>{streakShield.isRestDayActive ? '🍵' : '❄️'}</span>
                <span>{streakShield.isRestDayActive ? t('Rest Day') : `${streakShield.freezeCount} ${t('Freezes')}`}</span>
              </button>

              {/* Vibe Theme Switcher */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setShowVibeThemeModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-purple-300 hover:text-white hover:border-purple-400/50 text-xs font-bold transition-all cursor-pointer"
              >
                <span>🎨</span>
                <span className="hidden sm:inline">{t("Vibe Theme")}</span>
              </button>

              {/* Monthly Wrapped Trigger */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setShowWrappedModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-amber-300 hover:text-white hover:border-amber-400/50 text-xs font-bold transition-all cursor-pointer"
              >
                <span>🎉</span>
                <span>{t("Wrapped")}</span>
              </button>

              {/* AI Life Buddy Copilot Trigger */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setShowAiBuddyModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs shadow-emerald-500/10"
              >
                <span>🤖</span>
                <span>{t("AI Buddy")}</span>
              </button>

              {/* Persona Quiz Trigger */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setShowPersonaQuizModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-teal-300 hover:text-white hover:border-teal-400/50 text-xs font-bold transition-all cursor-pointer"
              >
                <span>🎯</span>
                <span>{t("Persona")}</span>
              </button>

              {/* Weekly Hall of Fame Leaderboard Trigger */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setShowLeaderboard(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/20 border border-amber-400/40 text-amber-300 hover:text-white hover:border-amber-300 text-xs font-black transition-all cursor-pointer shadow-xs shadow-amber-500/10 hover:scale-105 active:scale-95"
              >
                <span>🏆</span>
                <span>{t("Leaderboard")}</span>
              </button>
            </div>

            {/* Greeting */}
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>{greeting.text}, {currentUser?.name || 'Friend'}!</span>
                <span className="inline-block animate-wave text-2xl">{MOOD_PRESETS[todayMood].emoji}</span>
              </h1>
              <p className="text-xs text-slate-400 italic mt-0.5">
                {t(MOOD_PRESETS[todayMood].quote)}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {pendingTasks.length > 0 
                  ? t(`You have ${pendingTasks.length} tasks remaining today. ${greeting.sub}`)
                  : t(`All tasks for today are completed! ${greeting.sub}`)}
              </p>
            </div>

            {/* THE 3-SECOND RULE COCKPIT: TRẠM CHỈ HUY 3 GIÂY CHO GEN Z */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 py-1">
              {/* Pillar 1: 3 Việc Quyết Định Hôm Nay (Daily Trifecta 1-Touch Complete) */}
              <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex flex-col justify-between shadow-xs min-h-[160px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/50 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider truncate">🎯 {t("Today's Big 3")}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold shrink-0">{t("1-Tap")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickTaskModal(true)}
                    className="text-xs font-bold text-slate-300 hover:text-white px-2 py-0.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                  >
                    + {t("Add")}
                  </button>
                </div>

                <div className="my-2.5 space-y-2 flex-1 flex flex-col justify-center">
                  {cockpitTrifectaTasks.length > 0 ? (
                    cockpitTrifectaTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-700/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playSuccess();
                              updateTask(task.id, { status: 'Completed' });
                              setCelebration({
                                title: t('Awesome!'),
                                subtitle: `${t('Completed')}: "${task.title}"`,
                                xpAwarded: 30
                              });
                            }}
                            title={t("Mark completed")}
                            className="w-4 h-4 rounded-full border-2 border-emerald-500/60 hover:bg-emerald-500 hover:border-emerald-500 transition-all shrink-0 cursor-pointer flex items-center justify-center text-slate-950 font-black text-[9px]"
                          />
                          <span className="text-xs font-bold text-slate-200 truncate group-hover:text-white">
                            {task.title}
                          </span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                          task.priority === 'Cao' || task.priority === 'High' || task.priority === 'Nghiêm trọng' || task.priority === 'Urgent'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {t(task.priority || 'Medium')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2.5 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <span className="text-base">🏆</span>
                      <span className="font-bold text-emerald-400">{t("All daily priorities done!")}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentView('tasks')}
                  className="text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer self-start pt-1"
                >
                  {t("View all")} ({pendingTasks.length} {t("tasks")}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Pillar 2: Hạn Mức An Toàn Hôm Nay (Daily Safe-to-Spend) */}
              <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex flex-col justify-between shadow-xs min-h-[160px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/50 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black text-teal-400 uppercase tracking-wider truncate">💳 {t("Safe-to-Spend")}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 font-bold shrink-0">Auto</span>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{daysRemainingInMonth} {t("days left")}</span>
                </div>

                <div className="my-2.5 flex-1 flex flex-col justify-center">
                  {hasBudgetBaseline ? (
                    <>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-xl sm:text-2xl font-black tracking-tight ${
                          safeToSpendTodayRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {safeToSpendTodayRemaining >= 0 
                            ? formatCurrency(safeToSpendTodayRemaining)
                            : `-${formatCurrency(Math.abs(safeToSpendTodayRemaining))}`}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          safeToSpendTodayRemaining >= 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300 animate-pulse'
                        }`}>
                          {safeToSpendTodayRemaining >= 0 ? t('Safe') : t('Over Limit')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {t("Limit")}: {formatCurrency(dailySafeToSpendBudget)}/{t("day")} · {t("Spent")}: {formatCurrency(todayExpenses)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-300">
                          {todayExpenses > 0 ? `-${formatCurrency(todayExpenses)}` : '0 ₫'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300">
                          {t("No Budget Set")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {todayExpenses > 0 ? `${t("Spent today")}: ${formatCurrency(todayExpenses)}` : t("No monthly budget configured or no income yet")}
                      </p>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentView('finance')}
                  className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors cursor-pointer self-start pt-1"
                >
                  {hasBudgetBaseline ? t('Finance ledger & wallets') : `+ ${t('Set up budget now')}`} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Pillar 3: Kỷ Luật & Nút Vào Việc Siêu Tốc (Focus Launcher) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex flex-col justify-between shadow-xs min-h-[160px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider truncate">🔥 {t("Discipline Streak")}</span>
                    <span className="text-[11px] font-black text-amber-300 px-1.5 py-0.2 rounded-md bg-amber-500/20 shrink-0">
                      {maxHabitStreak} {t("days")}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                    {streakShield.isRestDayActive ? t('Rest Day') : `${streakShield.freezeCount} ${t('Freeze')} ❄️`}
                  </span>
                </div>

                <div className="my-2 flex-1 flex flex-col justify-center">
                  <p className="text-xs text-slate-300 leading-snug">
                    {todayFocusMinutes > 0 
                      ? `${t("Focused for")} ${todayFocusMinutes} ${t("mins of deep work today.")}`
                      : t("No focus sessions yet today. Start right now!")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setZenFocusTaskId(cockpitTrifectaTasks[0]?.id);
                      setZenFocusOpen(true);
                    }}
                    className="w-full mt-2.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{t("Start Focus 25m (Zen)")}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentView('focus')}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer self-start pt-1"
                >
                  {t("Open Pomodoro")} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Actions Cluster (1-click workflows) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setShowQuickTaskModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ {t("Add Task")}</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('finance')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("Log Expense")}</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('focus')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("Focus")}</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('study')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>{dueVocabCount > 0 ? `${t("Review Vocab")} (${dueVocabCount})` : t("Study Vocab")}</span>
              </button>
            </div>
          </div>

          {/* Right Hero Cluster: Date Switcher & Embedded Retention Widget */}
          <div className="flex flex-col sm:flex-row xl:flex-col items-start xl:items-end justify-between gap-4 border-t xl:border-t-0 border-white/10 pt-4 xl:pt-0 shrink-0">
            {/* Date Selector Segmented Control */}
            <div className="flex items-center bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/15 text-xs">
              <button 
                type="button"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                aria-label={t('Ngày trước')}
                className="p-1.5 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 font-bold text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              >
                {t('Hôm nay')}
              </button>
              <button 
                type="button"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                aria-label={t('Ngày sau')}
                className="p-1.5 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Retention Widget: Streak & Daily Quests */}
            <div className="w-full sm:w-auto xl:w-[280px]">
              <RetentionWidget onQuestClick={(cat) => {
                if (cat === 'task') setShowQuickTaskModal(true);
                else if (cat === 'vocab') setCurrentView('study');
                else if (cat === 'finance') setCurrentView('finance');
                else if (cat === 'focus') setCurrentView('focus');
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 1.05 Sunday Weekly Reset Ritual Trigger Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                {t("Weekly Ritual · Sunday Weekly Reset")} 🌿
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> +100 XP {t("Bonus")}
              </span>
            </div>
            <h3 className="font-bold text-sm text-white mt-0.5">
              {t("Reflect on the past 7 days, clear your mental load & align top 3 weekly goals.")}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playPop();
            setShowSundayReset(true);
          }}
          className="relative z-10 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0 self-end sm:self-center hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
          <span>{t("Start Reset")}</span>
        </button>
      </div>

      {/* 1.1 The Daily Trifecta Widget & Dopamine Pet Evolution Widget (Bento Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div className="lg:col-span-2">
          <DailyTrifectaWidget
            onStartZenFocus={(taskId) => {
              setZenFocusTaskId(taskId);
              setZenFocusOpen(true);
            }}
            onOpenQuickTask={() => setShowQuickTaskModal(true)}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col">
          <DopaminePetWidget />
        </div>
      </div>

      {/* 1.4. Due Vocabulary High Priority Alert Card (Spaced Repetition) */}
      {dueVocabCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-300 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {t("Due for Review · Spaced Repetition (Ebbinghaus)")}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 animate-pulse">
                  {dueVocabCount} {t("cards due")}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
                {t("Vocabulary words reached memory decay point. Reinforce now for long-term retention.")}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setCurrentView('study')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t("Review Now")} ({dueVocabCount}) 🚀</span>
            </button>
          </div>
        </div>
      )}

      {/* 1.5. Continue Where You Left Off / Recommended Next Action */}
      {pendingTasks.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Tiếp tục việc quan trọng nhất (Next Focus)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  pendingTasks[0].priority === 'Cao' || pendingTasks[0].priority === 'Nghiêm trọng'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                }`}>
                  {pendingTasks[0].priority || 'Trung bình'}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
                {pendingTasks[0].title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => toggleTimer(pendingTasks[0].id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTimerTask === pendingTasks[0].id
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {activeTimerTask === pendingTasks[0].id ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Dừng ({formatTimer(timerSeconds)})</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Bắt đầu Deep Work</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                updateTask(pendingTasks[0].id, { status: 'Hoàn thành' });
                retentionEngine.addXp(20, 'Hoàn thành công việc', currentUser?.id);
                retentionEngine.completeQuest('task', currentUser?.id);
                if (pendingTasks.length <= 1) {
                  setCelebration({
                    title: 'Đỉnh cao kỷ luật! Bạn đã hoàn thành hết mục tiêu!',
                    subtitle: 'Tất cả công việc đã xong xuôi. Giờ hãy nghỉ ngơi hoặc ôn một chút từ vựng nhé.',
                    xpAwarded: 50
                  });
                }
              }}
              className="p-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Đánh dấu hoàn thành"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Core 4 Key Metrics Grid */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard 
            icon={CheckSquare} 
            title={t('Công việc')} 
            value={`${completedTasks.length}/${todayTasks.length}`} 
            subtext={todayTasks.length > 0 ? `${Math.round((completedTasks.length / todayTasks.length) * 100)}% ${t('hoàn thành')}` : t('0 việc hôm nay')}
            color="text-blue-600" 
            bg="bg-blue-50" 
          />
          <SummaryCard 
            icon={Wallet} 
            title={t('Tài chính')} 
            value={formatCurrency(todayExpenses)} 
            subtext={todayIncome > 0 ? `${t('Thu:')} ${formatCurrency(todayIncome)}` : t('Chi tiêu hôm nay')} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
          />
          <SummaryCard 
            icon={Clock} 
            title={t('Tập trung')} 
            value={studyDisplayValue} 
            subtext={studySubtext} 
            color="text-violet-600" 
            bg="bg-violet-50" 
          />
          <SummaryCard 
            icon={Flame} 
            title={t('Thói quen')} 
            value={`${completedHabitsToday.length}/${habits.length}`} 
            subtext={habits.length > 0 ? `${Math.round((completedHabitsToday.length / habits.length) * 100)}% ${t('kỷ luật')}` : t('0 thói quen')}
            color="text-amber-600" 
            bg="bg-amber-50" 
          />
        </div>

        {/* Secondary Extended Metrics (Collapsible Toggle) */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setShowExtendedMetrics(!showExtendedMetrics)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <span>{showExtendedMetrics ? 'Thu gọn chỉ số phụ' : 'Xem thêm chỉ số (Sự kiện, Mục tiêu, Kế hoạch giờ)'}</span>
            {showExtendedMetrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showExtendedMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
            <SummaryCard 
              icon={Calendar} 
              title="Sự kiện lịch" 
              value={`${todayEvents.length}`} 
              subtext={todayEvents.length > 0 ? `${todayEvents.filter(e => e.status === 'Hoàn thành').length} đã hoàn tất` : 'Không có sự kiện'}
              color="text-indigo-600" 
              bg="bg-indigo-50" 
            />
            <SummaryCard 
              icon={Target} 
              title="Tiến độ mục tiêu" 
              value={goalsDisplayValue} 
              subtext={goalsSubtext} 
              color="text-rose-600" 
              bg="bg-rose-50" 
            />
            <SummaryCard 
              icon={Activity} 
              title="Kế hoạch thời gian" 
              value={`${actualTaskHours.toFixed(1)}h`} 
              subtext={`/ ${plannedTaskHours.toFixed(1)}h dự kiến`} 
              color="text-cyan-600" 
              bg="bg-cyan-50" 
            />
          </div>
        )}
      </div>

      {/* 5-Dimension Life Harmony Radar Widget */}
      <LifeHarmonyRadarWidget 
        harmony={harmonyOverview} 
        onExploreGoals={() => setCurrentView('goals')}
      />

      {/* Financial Summary & Latest Projects Progress Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Widget 1: Tóm tắt Tài chính (Financial Summary Widget) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Tóm tắt Tài chính</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Thu nhập, chi tiêu & số dư tổng quan</p>
                </div>
              </div>
              <button 
                onClick={() => setCurrentView('finance')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors shrink-0"
              >
                Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Total Balance Card */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-slate-300">Tổng số dư khả dụng</span>
                <div className="text-xl sm:text-2xl font-black tracking-tight mt-0.5 font-mono tabular-nums">
                  {formatCurrency(totalBalance)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-400 block">Tài khoản</span>
                <span className="text-xs font-bold text-emerald-400">
                  {(financeAccounts || []).length} tài khoản
                </span>
              </div>
            </div>

            {/* Income / Expense Stats */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Thu tháng này</span>
                </div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  +{formatCurrency(monthlyIncome)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  <span>Chi tháng này</span>
                </div>
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                  -{formatCurrency(monthlyExpense)}
                </div>
              </div>
            </div>

            {/* Net Cashflow Progress Bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Dòng tiền ròng (Net Cashflow)</span>
                <span className={`font-bold font-mono tabular-nums ${netMonthly >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {netMonthly >= 0 ? '+' : ''}{formatCurrency(netMonthly)}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all rounded-full ${netMonthly >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ 
                    width: monthlyIncome > 0 
                      ? `${Math.min(100, Math.max(8, (monthlyExpense / monthlyIncome) * 100))}%` 
                      : '50%' 
                  }}
                ></div>
              </div>
            </div>

            {/* Recent Transactions preview */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Giao dịch gần đây</span>
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">Chưa có giao dịch nào được ghi nhận tháng này.</p>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${tx.type === 'Thu nhập' ? 'bg-emerald-500' : tx.type === 'Chi tiêu' ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{tx.category || 'Khác'}</span>
                          <span className="text-[10px] text-slate-400">{tx.date}</span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold shrink-0 ml-2 ${tx.type === 'Thu nhập' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {tx.type === 'Thu nhập' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => setCurrentView('finance')}
            className="w-full mt-2 py-2 px-3 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            Quản lý Tài chính & Ví <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Widget 2: Tiến độ Dự án Mới nhất (Latest Project Progress Widget) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 shrink-0">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Tiến độ Dự án Mới nhất</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Các mục tiêu & dự án trọng điểm đang thực hiện</p>
                </div>
              </div>
              <button 
                onClick={() => setCurrentView('projects')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors shrink-0"
              >
                Xem tất cả ({totalProjectsCount}) <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Active Projects List */}
            <div className="mt-4 space-y-3">
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs text-slate-500">Chưa có dự án nào được tạo.</p>
                  <button 
                    onClick={() => setCurrentView('projects')}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo dự án đầu tiên
                  </button>
                </div>
              ) : (
                recentProjects.map((p) => {
                  const healthColor = p.health === 'Tốt' 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                    : p.health === 'Cảnh báo' 
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800';

                  return (
                    <div 
                      key={p.id}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {p.name}
                          </h4>
                          {p.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {p.description}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${healthColor}`}>
                          {p.health || 'Tốt'}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 text-[11px]">Tiến độ thực hiện</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">{p.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, p.progress || 0)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Footer metadata */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span>Hạn chót: {p.deadline ? p.deadline : 'Không hạn'}</span>
                        {p.budget > 0 && (
                          <span className="font-mono font-medium">Ngân sách: {formatCurrency(p.budget)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button 
            onClick={() => setCurrentView('projects')}
            className="w-full mt-2 py-2 px-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            Quản trị & Lên kế hoạch Dự án <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tasks & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Risks Banner */}
          {risks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-800 text-sm mb-1">Daily Risks Detected ({risks.length})</h4>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  {risks.map((r, i) => (
                    <li key={i}><span className="font-medium">{r.type}:</span> {r.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Today's Tasks */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{t("Today's Tasks")}</h3>
              <button 
                onClick={() => setShowQuickTaskModal(true)}
                className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> {t('Thêm việc')}
              </button>
            </div>
            
            {todayTasks.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={CheckSquare}
                  title="Chưa có công việc nào hôm nay"
                  description="Hãy lên kế hoạch cho 3 nhiệm vụ quan trọng nhất (Top 3 Priority) để giữ vững hiệu suất làm việc đỉnh cao."
                  actionLabel="Thêm việc mới"
                  onAction={() => setShowQuickTaskModal(true)}
                  secondaryActionLabel="Mở To-do List"
                  onSecondaryAction={() => setCurrentView('tasks')}
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayTasks.map(task => {
                  const isTimerActive = activeTimerTask === task.id;
                  const isCompleted = task.status === 'Hoàn thành';
                  return (
                    <div key={task.id} className={`p-4 flex items-center gap-4 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors ${isCompleted ? 'bg-slate-50 dark:bg-slate-800/50/50' : ''}`}>
                      <button 
                        onClick={() => {
                          const nextStatus = isCompleted ? 'Chưa làm' : 'Hoàn thành';
                          updateTask(task.id, { status: nextStatus });
                          if (!isCompleted) {
                            soundEngine.playPop();
                            retentionEngine.addXp(20, 'Hoàn thành công việc', currentUser?.id);
                            retentionEngine.completeQuest('task', currentUser?.id);
                            
                            // Check if this was the last pending task
                            if (pendingTasks.length <= 1) {
                              soundEngine.playSuccess();
                              setCelebration({
                                title: 'Tuyệt vời! Hoàn thành toàn bộ mục tiêu hôm nay!',
                                subtitle: 'Bạn đã hoàn tất tất cả các công việc dự kiến trong ngày. Đỉnh cao của sự kỷ luật!',
                                xpAwarded: 50,
                                streakCount: retentionEngine.getProfile(currentUser?.id)?.streak ?? 0
                              });
                            }
                          }
                        }}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 cursor-pointer
                          ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-500'}`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                          {t(task.title)}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                            ${task.priority === 'Cao' || task.priority === 'Nghiêm trọng' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 dark:text-slate-400'}`}>
                            {t(task.priority || 'Trung bình')}
                          </span>
                          {(task.estimatedHours || task.actualHours) && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.actualHours || 0}h / {task.estimatedHours || 1}h
                            </span>
                          )}
                        </div>
                      </div>

                      {!isCompleted && (
                        <button 
                          onClick={() => toggleTimer(task.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all w-24 justify-center
                            ${isTimerActive 
                              ? 'bg-red-100 text-red-700 ring-2 ring-red-100 animate-pulse' 
                              : 'bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                        >
                          {isTimerActive ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              {formatTimer(timerSeconds)}
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" /> {t('Bắt đầu')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline View */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4">{t('Daily Timeline')}</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {todayEvents.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">{t('Không có sự kiện lịch nào hôm nay.')}</p>
              )}
              {todayEvents.map(event => (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{event.title}</h4>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{event.startTime} - {event.endTime}</span>
                    </div>
                    <p className="text-xs text-slate-500">{event.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Score, Habits, Notes */}
        <div className="space-y-6">
          
          {/* Daily Score */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 -z-10"></div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Daily Score</h3>
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  innerRadius="70%" 
                  outerRadius="100%" 
                  data={scoreData} 
                  startAngle={90} 
                  endAngle={-270}
                  barSize={12}
                >
                  <RadialBar dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900 dark:text-white">{dailyScore}</span>
                <span className="text-xs font-medium text-slate-500">
                  {dailyScore >= 90 ? 'Xuất sắc' : dailyScore >= 75 ? 'Tốt' : dailyScore >= 40 ? 'Bình thường' : dailyScore > 0 ? 'Cần cố gắng' : 'Chưa có hoạt động'}
                </span>
              </div>
            </div>
            
            <div className="w-full mt-6 space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400">Capacity Utilization</span>
                <span className={isOverload ? 'text-red-600' : 'text-slate-900 dark:text-white'}>{utilization.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${isOverload ? 'bg-red-500' : 'bg-blue-500'}`} 
                  style={{ width: `${utilization}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Today's Habits */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4">Today's Habits</h3>
            <div className="space-y-3">
              {(habits || []).map(habit => {
                const isCompleted = habit.completedDates?.includes(dateStr) || 
                  (habitRecords || []).some(r => r.habitId === habit.id && r.date === dateStr && r.status === 'Completed');
                return (
                  <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const dates = isCompleted 
                            ? (habit.completedDates || []).filter(d => d !== dateStr)
                            : [...(habit.completedDates || []), dateStr];
                          updateHabit(habit.id, { 
                            completedDates: dates,
                            streak: isCompleted ? Math.max(0, (habit.streak ?? 0) - 1) : (habit.streak ?? 0) + 1
                          });
                          addHabitRecord({
                            habitId: habit.id,
                            date: dateStr,
                            status: isCompleted ? 'Missed' : 'Completed',
                            actualValue: isCompleted ? 0 : (habit.target || 1)
                          });

                          if (!isCompleted) {
                            retentionEngine.addXp(15, `Duy trì thói quen: ${habit.name}`, currentUser?.id);
                            retentionEngine.completeQuest('habit', currentUser?.id);
                          }
                        }}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors cursor-pointer
                          ${isCompleted ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-amber-400'}`}
                      >
                        {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                      <span className={`text-sm font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                        {habit.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {habit.streak || 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Checklist (Quick) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4">Evening Routine</h3>
            <div className="space-y-2">
              {['Review goals', 'Plan tomorrow', 'Record expenses', 'Read 10 pages'].map((item, i) => (
                <label key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:bg-slate-800/50 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={!!routineState[i]}
                    onChange={(e) => toggleRoutine(i, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                  />
                  <span className={`text-sm ${routineState[i] ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Confirmation Modal for Clearing Workspace */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Làm sạch dữ liệu</h3>
                <p className="text-xs text-slate-500">Khởi tạo trang trắng cho số liệu thực tế</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Thao tác này sẽ làm sạch các bản ghi trong không gian làm việc của bạn để bắt đầu chu kỳ ghi nhận mới từ đầu. Các cấu hình tài khoản và phân quyền sẽ được giữ nguyên. Bạn có chắc chắn muốn tiếp tục không?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  clearWorkspace();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
              >
                Xác nhận làm sạch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Task Creation Modal */}
      {showQuickTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                {t('Thêm Công việc Thực tế')}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowQuickTaskModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickTaskTitle.trim()) return;
                addTask({
                  title: quickTaskTitle.trim(),
                  priority: quickTaskPriority,
                  estimatedHours: Number(quickTaskHours) || 1,
                  dueDate: dateStr,
                  status: 'Chưa làm',
                  actualHours: 0
                });
                setQuickTaskTitle('');
                setQuickTaskHours(1);
                setShowQuickTaskModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('Tên công việc')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder={t('VD: Soạn tài liệu tuần, gọi điện đối tác...')}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Mức độ ưu tiên')}
                  </label>
                  <select
                    value={quickTaskPriority}
                    onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  >
                    <option value="Thấp">{t('Thấp')}</option>
                    <option value="Trung bình">{t('Trung bình')}</option>
                    <option value="Cao">{t('Cao')}</option>
                    <option value="Nghiêm trọng">{t('Khẩn cấp')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Thời lượng dự kiến (Giờ)')}
                  </label>
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={quickTaskHours}
                    onChange={(e) => setQuickTaskHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('Hủy')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                >
                  {t('Tạo công việc ngay')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Celebration Modal for Wow moments */}
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

      {/* Gen Z Viral Share Story Modal */}
      <ShareStoryModal
        isOpen={showShareStory}
        onClose={() => setShowShareStory(false)}
        profile={retentionEngine.getProfile(currentUser?.id)}
        userName={currentUser?.name || 'Life OS Member'}
        todayCompletedTasks={completedTasks.length}
        moodEmoji={MOOD_PRESETS[todayMood].emoji}
        moodLabel={MOOD_PRESETS[todayMood].label}
      />

      {/* Zen Focus Mode Overlay launched from Trifecta */}
      <ZenFocusOverlay
        isOpen={zenFocusOpen}
        onClose={() => setZenFocusOpen(false)}
        defaultTaskId={zenFocusTaskId}
      />

      {/* Sunday Weekly Reset Ritual Modal */}
      <SundayWeeklyResetModal
        isOpen={showSundayReset}
        onClose={() => setShowSundayReset(false)}
        onOpenStoryShare={() => setShowShareStory(true)}
      />

      {/* Aesthetic Vibe Theme Selector Modal */}
      <VibeThemeModal
        isOpen={showVibeThemeModal}
        onClose={() => setShowVibeThemeModal(false)}
      />

      {/* Monthly Spotify-Style LifeOS Wrapped Modal */}
      <LifeOsWrappedModal
        isOpen={showWrappedModal}
        onClose={() => setShowWrappedModal(false)}
        onOpenStoryShare={() => setShowShareStory(true)}
      />

      {/* AI Life Buddy Copilot Modal */}
      <AiLifeBuddyCopilotModal
        isOpen={showAiBuddyModal}
        onClose={() => setShowAiBuddyModal(false)}
      />

      {/* 15-Second Quick Persona Quiz Modal */}
      <QuickPersonaQuizModal
        isOpen={showPersonaQuizModal}
        onClose={() => setShowPersonaQuizModal(false)}
      />

      {/* Streak Resurrection 24h Challenge Modal */}
      <StreakResurrectionModal
        userId={currentUser?.id}
        isOpen={showResurrectionModal}
        onClose={() => setShowResurrectionModal(false)}
        onResurrected={(restored) => {
          setStreakShield(streakFreezeEngine.getStatus(currentUser?.id));
          setResurrectionStatus(streakFreezeEngine.getResurrectionStatus(currentUser?.id));
          setCelebration({
            title: 'Hồi Sinh Thành Công!',
            subtitle: `Chuỗi kỉ luật của bạn đã được nối tiếp ${restored} ngày! 🔥`,
            xpAwarded: 50
          });
        }}
        onStartFocus={() => setZenFocusOpen(true)}
      />

      {/* Weekly Hall of Fame Leaderboard Modal */}
      <WeeklyLeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        onShare={() => {
          setShowLeaderboard(false);
          setShowShareStory(true);
        }}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value, subtext, color, bg }: any) {
  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-purple-100/60 dark:border-purple-900/40 shadow-xs hover:shadow-xl hover:shadow-purple-500/10 flex flex-col justify-between card-cute transition-all">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`p-2 rounded-2xl ${bg} ${color} shadow-2xs`}>
          <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </div>
        <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h4>
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
        {subtext && <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">{subtext}</div>}
      </div>
    </div>
  );
}
