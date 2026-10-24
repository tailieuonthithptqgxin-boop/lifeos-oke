import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { 
  CheckSquare, Calendar, Wallet, Target, Activity, Clock, 
  Zap, ArrowRight, BookOpen, Flame, X, Check, Play, Pause, Square, AlertTriangle, Plus,
  FolderKanban, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ChevronRight, ChevronLeft,
  PieChart, Building, MoreHorizontal, FileEdit, RotateCcw, ChevronDown, ChevronUp, Sparkles, Award,
  Trophy, CheckCircle2, Circle, Coins, Star, Layers, Info, ExternalLink, RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { retentionEngine, RetentionProfile } from '../lib/retentionEngine';
import { CelebrationModal } from './CelebrationModal';
import { EmptyState } from './EmptyState';
import { soundEngine } from '../lib/soundEngine';
import { GenZMood, MOOD_PRESETS, getTodayMood, setTodayMood } from '../lib/moodEngine';
import { ShareStoryModal } from './ShareStoryModal';
import { compute5DHarmony } from '../lib/lifeHarmonyEngine';
import { LifeHarmonyRadarWidget } from './LifeHarmonyRadarWidget';
import { loadVocabData, buildTodayStudyPlan } from '../lib/vocabEngine';
import { ZenFocusOverlay } from './focus/ZenFocusOverlay';
import { SundayWeeklyResetModal } from './dashboard/SundayWeeklyResetModal';
import { streakFreezeEngine } from '../lib/streakFreezeEngine';
import { vibeThemeEngine } from '../lib/vibeThemeEngine';
import { VibeThemeModal } from './VibeThemeModal';
import { LifeOsWrappedModal } from './dashboard/LifeOsWrappedModal';
import { AiLifeBuddyCopilotModal } from './companion/AiLifeBuddyCopilotModal';
import { QuickPersonaQuizModal } from './onboarding/QuickPersonaQuizModal';
import { StreakResurrectionModal } from './dashboard/StreakResurrectionModal';
import { WeeklyLeaderboardModal } from './dashboard/WeeklyLeaderboardModal';
import { WordOfTheHourWidget } from './dashboard/WordOfTheHourWidget';
import { ContributionHeatmap365 } from './dashboard/ContributionHeatmap365';
import { ZeroEffortIngestionModal } from './vocab/ZeroEffortIngestionModal';
import { SpeedMatchGameModal } from './vocab/SpeedMatchGameModal';
import { GenZVocabStudyModal } from './vocab/GenZVocabStudyModal';
import { FocusEconomyShopModal } from './dashboard/FocusEconomyShopModal';
import { apiCall } from '../lib/apiClient';
import { triggerConfetti } from '../lib/confetti';
import { LiveMascotCharacter } from './companion/LiveMascotCharacter';
import { companionEngine, CompanionMood } from '../lib/companionEngine';
import { getEvolutionStage } from './companion/DopaminePetWidget';

const GENZ_PET_QUOTES = [
  "Cố lên bạn ơi, bạn đang gánh cả ngày hôm nay đấy! ✨",
  "Một việc nữa thôi là thăng hạng rồi, chiến thôi! 🔥",
  "Hôm nay bạn siêu ngầu! 10 điểm không có nhưng! 💯",
  "Uống một ngụm nước rồi tiếp tục bứt phá nhé! 🥤",
  "Chuỗi kỉ luật cháy rực rỡ! Giữ vững phong độ nha! 🚀",
  "Tập trung sâu một chút, tối nay thảnh thơi ngủ ngon! 🌙"
];

export function DashboardView() {
  const { 
    tasks = [], events = [], transactions = [], goals = [], habits = [], habitRecords = [],
    focusSessions = [], focusGoals = [], projects = [], financeAccounts = [], budgets = [],
    addTask, updateTask, updateHabit, addHabitRecord, dailyCapacity = 8,
    setCurrentView, clearWorkspace, language, currentUser
  } = useAppStore();

  const isVi = language === 'vi';
  const t = useTranslation(language);

  // Time & Date states
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = selectedDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  // Modals & Interactivity states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
  const [todayMood, setTodayMoodState] = useState<GenZMood>(() => getTodayMood());
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showShareStory, setShowShareStory] = useState(false);
  const [showSundayReset, setShowSundayReset] = useState(false);
  const [showVibeThemeModal, setShowVibeThemeModal] = useState(false);
  const [showWrappedModal, setShowWrappedModal] = useState(false);
  const [showAiBuddyModal, setShowAiBuddyModal] = useState(false);
  const [showPersonaQuizModal, setShowPersonaQuizModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showResurrectionModal, setShowResurrectionModal] = useState(false);
  const [zenFocusOpen, setZenFocusOpen] = useState(false);
  const [zenFocusTaskId, setZenFocusTaskId] = useState<string | undefined>(undefined);

  // Next-Gen Gen Z Modals State
  const [showZeroEffortVocab, setShowZeroEffortVocab] = useState(false);
  const [zeroEffortInitialWord, setZeroEffortInitialWord] = useState('');
  const [showSpeedMatch, setShowSpeedMatch] = useState(false);
  const [showGenZVocabStudy, setShowGenZVocabStudy] = useState(false);
  const [showEconomyShop, setShowEconomyShop] = useState(false);
  const [celebration, setCelebration] = useState<{
    title: string;
    subtitle: string;
    xpAwarded?: number;
    streakCount?: number;
    badgeName?: string;
  } | null>(null);

  // Quick Task Form
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<string>('Trung bình');
  const [quickTaskHours, setQuickTaskHours] = useState<number>(1);

  // Timer state for in-line task deep work
  const [activeTimerTask, setActiveTimerTask] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Dismissed Smart Action Pills (by id: 'sunday_reset', 'ebbinghaus', 'resurrection')
  const [dismissedPills, setDismissedPills] = useState<Record<string, boolean>>({});

  // Mobile Insights Tab state ('harmony' | 'finance')
  const [mobileInsightsTab, setMobileInsightsTab] = useState<'harmony' | 'finance'>('harmony');

  // Mascot Lumi state
  const userId = currentUser?.id;
  const [profile, setProfile] = useState<RetentionProfile>(() => retentionEngine.getProfile(userId));
  const [mascotSettings, setMascotSettings] = useState(() => companionEngine.getSettings(userId));
  const [petMood, setPetMood] = useState<CompanionMood>('idle');
  const [speechBubble, setSpeechBubble] = useState<string>('');
  const [isPoking, setIsPoking] = useState(false);

  // Gamification progression data (Level, XP, Quests)
  const [progressionData, setProgressionData] = useState<{
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

  // The Rule of 3 (Tam Hợp) Slots persistent state
  const [slotTaskIds, setSlotTaskIds] = useState<[string, string, string]>(() => {
    try {
      const saved = localStorage.getItem(`lifeos_trifecta_${todayStr}`);
      return saved ? JSON.parse(saved) : ['', '', ''];
    } catch {
      return ['', '', ''];
    }
  });
  const [pickingSlotIndex, setPickingSlotIndex] = useState<number | null>(null);
  const [inlineSlotTitle, setInlineSlotTitle] = useState('');

  // Streak Shield & Resurrection
  const [streakShield, setStreakShield] = useState(() => streakFreezeEngine.getStatus(userId));
  const [resurrectionStatus, setResurrectionStatus] = useState(() => streakFreezeEngine.getResurrectionStatus(userId));

  // Sync profile & progression
  const fetchProgression = async () => {
    try {
      const res = await apiCall('/api/progression');
      if (res && res.data) {
        setProgressionData(res.data);
      }
    } catch {
      // Fallback to local retentionEngine
    }
  };

  useEffect(() => {
    setProfile(retentionEngine.getProfile(userId));
    setMascotSettings(companionEngine.getSettings(userId));
    setStreakShield(streakFreezeEngine.getStatus(userId));
    setResurrectionStatus(streakFreezeEngine.getResurrectionStatus(userId));
    fetchProgression();
  }, [userId, currentUser]);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Timer loop for active deep work task
  useEffect(() => {
    let interval: any = null;
    if (activeTimerTask) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimerTask]);

  // Global event listeners (Spotlight, shortcuts)
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

    window.addEventListener('lifeos:open-zen-focus', handleOpenZen);
    window.addEventListener('lifeos:open-sunday-reset', handleOpenReset);
    window.addEventListener('lifeos:open-share-story', handleOpenStory);
    window.addEventListener('lifeos:open-mood-picker', handleOpenMood);
    window.addEventListener('lifeos:open-theme-modal', handleOpenTheme);
    window.addEventListener('lifeos:open-wrapped-modal', handleOpenWrapped);
    window.addEventListener('lifeos:open-ai-buddy', handleOpenAi);
    window.addEventListener('lifeos:open-persona-quiz', handleOpenQuiz);
    window.addEventListener('lifeos:open-leaderboard', handleOpenLeaderboard);

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
    };
  }, []);

  // Filter Tasks for Selected Date
  const todayTasks = (tasks || []).filter(t => t.dueDate && t.dueDate.startsWith(dateStr) && t.status !== 'Hủy' && t.status !== 'Cancelled');
  const pendingTasks = todayTasks.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Completed');
  const completedTasks = todayTasks.filter(t => t.status === 'Hoàn thành' || t.status === 'Completed');

  // Cognitive Load: count unfinished deep work tasks
  const deepWorkTasksCount = useMemo(() => {
    return (tasks || []).filter(t => {
      const isDone = t.status === 'Hoàn thành' || t.status === 'Completed' || t.status === 'Done';
      return !isDone && (t.energy === 'deep_work' || t.priority === 'Cao' || t.priority === 'High');
    }).length;
  }, [tasks]);

  // Global events for Next-Gen Gen Z modals
  useEffect(() => {
    const handleQuickAddVocab = (e: any) => {
      const word = e?.detail?.word || '';
      setZeroEffortInitialWord(word);
      setShowZeroEffortVocab(true);
    };
    const handleOpenSpeedMatch = () => setShowSpeedMatch(true);
    const handleOpenGenZStudy = () => setShowGenZVocabStudy(true);
    const handleOpenEconomyShop = () => setShowEconomyShop(true);

    window.addEventListener('lifeos:quick-add-vocab', handleQuickAddVocab);
    window.addEventListener('lifeos:open-speed-match', handleOpenSpeedMatch);
    window.addEventListener('lifeos:open-genz-vocab-study', handleOpenGenZStudy);
    window.addEventListener('lifeos:open-economy-shop', handleOpenEconomyShop);

    return () => {
      window.removeEventListener('lifeos:quick-add-vocab', handleQuickAddVocab);
      window.removeEventListener('lifeos:open-speed-match', handleOpenSpeedMatch);
      window.removeEventListener('lifeos:open-genz-vocab-study', handleOpenGenZStudy);
      window.removeEventListener('lifeos:open-economy-shop', handleOpenEconomyShop);
    };
  }, []);

  // Auto-fill empty slots for Rule of 3 if available
  useEffect(() => {
    if (tasks.length === 0) return;
    setSlotTaskIds(prev => {
      const current = [...prev] as [string, string, string];
      let hasChange = false;
      const available = tasks.filter(t => 
        t.status !== 'Hoàn thành' && 
        t.status !== 'Completed' && 
        t.status !== 'Hủy' && 
        !current.includes(t.id)
      );

      for (let i = 0; i < 3; i++) {
        if (current[i] && !tasks.some(t => t.id === current[i])) {
          current[i] = '';
          hasChange = true;
        }
        if (!current[i] && available.length > 0) {
          const next = available.shift();
          if (next) {
            current[i] = next.id;
            hasChange = true;
          }
        }
      }
      if (hasChange) {
        try {
          localStorage.setItem(`lifeos_trifecta_${todayStr}`, JSON.stringify(current));
        } catch {}
      }
      return current;
    });
  }, [tasks, todayStr]);

  const updateSlotTask = (index: number, taskId: string) => {
    const next = [...slotTaskIds] as [string, string, string];
    next[index] = taskId;
    setSlotTaskIds(next);
    try {
      localStorage.setItem(`lifeos_trifecta_${todayStr}`, JSON.stringify(next));
    } catch {}
  };

  const handleCreateInlineSlotTask = async (slotIdx: number) => {
    if (!inlineSlotTitle.trim()) {
      setPickingSlotIndex(null);
      return;
    }
    try {
      const created = await addTask({
        title: inlineSlotTitle.trim(),
        priority: slotIdx === 0 ? 'Cao' : slotIdx === 1 ? 'Trung bình' : 'Thấp',
        dueDate: dateStr,
        status: 'Chưa làm',
        estimatedHours: 1,
        actualHours: 0
      });
      if (created && created.id) {
        updateSlotTask(slotIdx, created.id);
      }
    } catch (e) {
      console.warn('Failed to add inline task:', e);
    }
    setInlineSlotTitle('');
    setPickingSlotIndex(null);
  };

  // Finance metrics for selected date
  const todayExpenses = (transactions || [])
    .filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && t.date && t.date.startsWith(dateStr))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const todayIncome = (transactions || [])
    .filter(t => (t.type === 'Thu nhập' || t.type === 'Income') && t.date && t.date.startsWith(dateStr))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalBalance = (financeAccounts || []).reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - now.getDate() + 1);

  const monthlyTx = (transactions || []).filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyIncome = monthlyTx.filter(t => t.type === 'Thu nhập' || t.type === 'Income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const monthlyExpense = monthlyTx.filter(t => t.type === 'Chi tiêu' || t.type === 'Expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const netMonthly = monthlyIncome - monthlyExpense;

  const totalConfiguredBudget = (budgets || []).reduce((sum: number, b: any) => sum + (Number(b.limit) || Number(b.amount) || 0), 0);
  const hasBudgetBaseline = totalConfiguredBudget > 0 || monthlyIncome > 0;
  const userMonthlyBudget = totalConfiguredBudget > 0 ? totalConfiguredBudget : (monthlyIncome > 0 ? monthlyIncome : 0);
  const remainingBudgetMonth = Math.max(0, userMonthlyBudget - monthlyExpense);
  const dailySafeToSpendBudget = hasBudgetBaseline ? Math.round(remainingBudgetMonth / daysRemainingInMonth) : 0;
  const safeToSpendTodayRemaining = hasBudgetBaseline ? (dailySafeToSpendBudget - todayExpenses) : -todayExpenses;

  // Focus & Study metrics
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
    ? (studyHours > 0 ? `${studyHours}h ${studyMinutes > 0 ? `${studyMinutes}m` : ''}` : `${studyMinutes} phút`) 
    : '0 phút';
  const studySubtext = `/ ${targetStudyHours} giờ mục tiêu`;
  const focusProgressPercent = Math.min(100, Math.round((todayFocusMinutes / (targetStudyMinutes || 180)) * 100));

  // Habits metrics
  const completedHabitsToday = (habits || []).filter(h => 
    h.completedDates?.includes(dateStr) || 
    (habitRecords || []).some(r => r.habitId === h.id && r.date === dateStr && r.status === 'Completed')
  );

  // Spaced Repetition Due Vocab
  const dueVocabCount = useMemo(() => {
    try {
      const vocab = loadVocabData(userId || 'current_user');
      const activeLang = (vocab?.languages || []).find(l => l.id === vocab?.activeLanguageId) || vocab?.languages?.[0];
      const langId = activeLang?.id || 'en';
      const words = (vocab?.words && vocab.words[langId]) || [];
      const plan = buildTodayStudyPlan(words, activeLang?.dailyNewWordTarget || 10, activeLang?.dailyReviewTarget || 30);
      return plan.totalToStudy || 0;
    } catch {
      return 0;
    }
  }, [userId]);

  // Projects summary
  const recentProjects = [...(projects || [])]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 3);

  // 5D Harmony calculation
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

  // Dynamic Greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) {
      return { 
        text: 'Chào buổi sáng', 
        sub: 'Chúc bạn một ngày mới ngập tràn năng lượng và tập trung cao độ!' 
      };
    }
    if (hour >= 12 && hour < 18) {
      return { 
        text: 'Chào buổi chiều', 
        sub: 'Giữ vững nhịp độ làm việc và chinh phục trọn vẹn mục tiêu hôm nay nhé!' 
      };
    }
    if (hour >= 18 && hour < 22) {
      return { 
        text: 'Chào buổi tối', 
        sub: 'Điểm lại các thành tựu trong ngày và thư giãn tinh thần nhé.' 
      };
    }
    return { 
      text: 'Đêm muộn', 
      sub: 'Nghỉ ngơi sớm để hồi phục thể lực và trí lực cho ngày mai.' 
    };
  };
  const greeting = getGreeting();

  // Evolution & Level details
  const currentLevel = progressionData?.level ?? profile.level ?? 1;
  const evolution = getEvolutionStage(currentLevel);
  const currentXp = progressionData?.totalXp ?? profile.totalXp ?? 0;
  const xpNeeded = progressionData?.xpNeededForNextLevel ?? 100;
  const currentStreak = progressionData?.currentStreak ?? profile.streak ?? 0;

  // Mascot poke interaction
  const handlePokeMascot = () => {
    soundEngine.playPop();
    setIsPoking(true);
    setPetMood('happy');
    const randomQuote = GENZ_PET_QUOTES[Math.floor(Math.random() * GENZ_PET_QUOTES.length)];
    setSpeechBubble(randomQuote);
    setTimeout(() => setIsPoking(false), 800);
    setTimeout(() => {
      setSpeechBubble('');
      setPetMood('idle');
    }, 4500);
  };

  // Toggle timer helper
  const toggleTimer = (taskId: string) => {
    if (activeTimerTask === taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const hoursToAdd = Number((timerSeconds / 3600).toFixed(2));
        updateTask(taskId, { actualHours: (task.actualHours || 0) + hoursToAdd });
      }
      setActiveTimerTask(null);
      setTimerSeconds(0);
    } else {
      if (activeTimerTask) {
        const prevTask = tasks.find(t => t.id === activeTimerTask);
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
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Claim Daily Quest
  const handleClaimQuest = async (questKey: string) => {
    try {
      const res = await apiCall('/api/progression/quest/claim', 'POST', { questKey });
      if (res && res.success) {
        soundEngine.playSuccess();
        triggerConfetti();
        await fetchProgression();
      }
    } catch {
      retentionEngine.addXp(20, 'Hoàn thành nhiệm vụ ngày', userId);
      soundEngine.playSuccess();
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-4 sm:p-6 lg:p-8 space-y-4 md:space-y-6 pb-28 md:pb-12 overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* TẦNG 2: COMPACT HERO & GAMIFICATION HUB (GRID 12 CỘT)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* CỘT TRÁI (8/12 CỘT): GREETING & SMART NUDGE CARD */}
        <div className="lg:col-span-8 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border border-emerald-200/70 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-visible">
          {/* Subtle ambient blur */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Top row: Date & Time, Mood Selector, Date Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{formatDate(selectedDate, language)} · {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Gen Z Mood of the day button */}
                <div className={`relative inline-block ${showMoodPicker ? 'z-50' : 'z-20'}`}>
                  <button
                    type="button"
                    onClick={() => setShowMoodPicker(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs ${MOOD_PRESETS[todayMood].badgeBg}`}
                  >
                    <span>{MOOD_PRESETS[todayMood].emoji}</span>
                    <span className="hidden sm:inline">{t(MOOD_PRESETS[todayMood].label)}</span>
                    <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                  </button>

                  {showMoodPicker && (
                    <>
                      {/* Backdrop for Mobile and Desktop */}
                      <div className="fixed inset-0 z-40 bg-slate-900/40 md:bg-transparent" onClick={() => setShowMoodPicker(false)} />

                      {/* Desktop Popover: exactly absolute top-full left-0 mt-2 z-50 w-72 */}
                      <div className="hidden md:block absolute top-full left-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2 w-72 space-y-1 text-xs opacity-100">
                        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Tâm trạng hôm nay</span>
                          <button 
                            type="button" 
                            onClick={() => setShowMoodPicker(false)} 
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {(Object.keys(MOOD_PRESETS) as GenZMood[]).map(key => {
                          const m = MOOD_PRESETS[key];
                          const isSelected = todayMood === key;
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
                              className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${isSelected ? 'bg-emerald-600 text-white font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                              <span className="text-base">{m.emoji}</span>
                              <div className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{t(m.label)}</span>
                                <span className={`text-[10px] block truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>{t(m.vibe)}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Mobile Bottom Sheet (Thumb-friendly & No overflow) */}
                      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-3 max-h-[80vh] overflow-y-auto animate-slide-up pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">✨</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">Tâm trạng hôm nay của bạn</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowMoodPicker(false)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {(Object.keys(MOOD_PRESETS) as GenZMood[]).map(key => {
                            const m = MOOD_PRESETS[key];
                            const isSelected = todayMood === key;
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
                                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-xs' 
                                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className="text-2xl">{m.emoji}</span>
                                <div className="min-w-0">
                                  <span className="block text-xs font-bold truncate">{t(m.label)}</span>
                                  <span className={`text-[10px] block truncate ${isSelected ? 'text-slate-900/80 font-medium' : 'text-slate-400'}`}>{t(m.vibe)}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Date Switcher */}
              <div className="flex items-center bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 text-xs shadow-2xs">
                <button 
                  type="button"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                  aria-label="Ngày trước"
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedDate(new Date())}
                  className="px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  Hôm nay
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                  aria-label="Ngày sau"
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Greeting Headline & Inspiring Subtitle */}
            <div className="pt-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>{greeting.text}, {currentUser?.name || 'Bạn'}!</span>
                <span className="inline-block animate-wave text-2xl">{MOOD_PRESETS[todayMood].emoji}</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1 font-medium">
                "{MOOD_PRESETS[todayMood].quote}"
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {pendingTasks.length > 0 
                  ? `Bạn có ${pendingTasks.length} công việc cần hoàn thành hôm nay. ${greeting.sub}`
                  : `Tất cả công việc hôm nay đã hoàn thành! ${greeting.sub}`}
              </p>
            </div>
          </div>

          {/* NHẮC NHỞ THÔNG MINH (SMART ACTION PILLS) - Swipeable on mobile */}
          {(!dismissedPills['sunday_reset'] || (dueVocabCount > 0 && !dismissedPills['ebbinghaus']) || (resurrectionStatus.isPending && !dismissedPills['resurrection'])) && (
            <div className="relative z-0 pt-4 md:pt-5 flex md:flex-col overflow-x-auto no-scrollbar gap-2 py-1 pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
              {/* Pill 1: Sunday Weekly Reset */}
              {!dismissedPills['sunday_reset'] && (
                <div className="min-w-[85vw] sm:min-w-0 shrink-0 md:shrink p-2.5 sm:px-3 sm:py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-xs transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">🌿</span>
                    <div className="min-w-0">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200 truncate block">
                        Nghi thức tuần · Tái thiết lập Chủ nhật (+100 XP)
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate block">
                        Tổng kết tuần qua và căn chỉnh mục tiêu tuần mới để tâm trí thảnh thơi.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        setShowSundayReset(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[36px]"
                    >
                      Bắt đầu
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedPills(prev => ({ ...prev, sunday_reset: true }))}
                      title="Ẩn thông báo này"
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Pill 2: Spaced Repetition Due Vocab */}
              {dueVocabCount > 0 && !dismissedPills['ebbinghaus'] && (
                <div className="min-w-[85vw] sm:min-w-0 shrink-0 md:shrink p-2.5 sm:px-3 sm:py-2 rounded-xl bg-teal-500/10 dark:bg-teal-950/40 border border-teal-300/80 dark:border-teal-800/60 flex items-center justify-between gap-3 text-xs transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">📚</span>
                    <div className="min-w-0">
                      <span className="font-bold text-teal-900 dark:text-teal-200 truncate block">
                        Đến hạn ôn tập Ebbinghaus ({dueVocabCount} từ vựng)
                      </span>
                      <span className="text-[11px] text-teal-700 dark:text-teal-400 truncate block">
                        Từ vựng đã chạm điểm rơi trí nhớ, hãy củng cố để nhớ bền vững.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentView('study')}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[36px]"
                    >
                      Ôn tập ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedPills(prev => ({ ...prev, ebbinghaus: true }))}
                      title="Ẩn thông báo này"
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Pill 3: Streak Resurrection Challenge */}
              {resurrectionStatus.isPending && !dismissedPills['resurrection'] && (
                <div className="min-w-[85vw] sm:min-w-0 shrink-0 md:shrink p-2.5 sm:px-3 sm:py-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">🔥</span>
                    <div className="min-w-0">
                      <span className="font-bold text-amber-900 dark:text-amber-200 truncate block">
                        Cứu chuỗi kỉ luật ({resurrectionStatus.lostStreak} ngày bị đứt)
                      </span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 truncate block">
                        Hoàn thành thử thách tập trung trong 24h để hồi sinh toàn bộ chuỗi.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowResurrectionModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[36px]"
                    >
                      Hồi sinh ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedPills(prev => ({ ...prev, resurrection: true }))}
                      title="Ẩn thông báo này"
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CỘT PHẢI (4/12 CỘT): LUMI & LEVEL PROGRESS CARD (GỘP CHUNG 1 CARD) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4">
          {/* Header: Mascot Character & Level info */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div 
                onClick={handlePokeMascot}
                className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs relative"
                title="Bấm để tương tác cùng bé Lumi!"
              >
                <LiveMascotCharacter mascotId={mascotSettings.mascotId} mood={petMood} size="compact" isPoking={isPoking} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">
                    {mascotSettings.customName || 'Bé Lumi'}
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Cấp {currentLevel}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                  {evolution.badge}
                </span>
              </div>
            </div>

            {/* Streak & Coin Pill */}
            <div className="flex flex-col items-end gap-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-black text-xs">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
                <span>{currentStreak} ngày</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                🪙 {progressionData?.coins ?? profile.coins ?? 0} xu
              </span>
            </div>
          </div>

          {/* Interactive Speech Bubble */}
          <div 
            onClick={handlePokeMascot}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:bg-slate-100/80 transition-colors leading-relaxed"
          >
            {speechBubble || GENZ_PET_QUOTES[0]}
          </div>

          {/* Level XP Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Tiến trình Level {currentLevel}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {currentXp} XP / Còn {xpNeeded} XP
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(10, ((currentXp % 200) / 200) * 100))}%` }}
              />
            </div>
          </div>

          {/* 3 Daily Quests (+XP) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Nhiệm vụ ngày nhận thưởng
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${completedTasks.length > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={`font-medium ${completedTasks.length > 0 ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                    Hoàn thành 1 việc hôm nay
                  </span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  +20 XP
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${todayFocusMinutes >= 25 ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={`font-medium ${todayFocusMinutes >= 25 ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                    Tập trung sâu 25 phút
                  </span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                  +25 XP
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${completedHabitsToday.length > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={`font-medium ${completedHabitsToday.length > 0 ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                    Duy trì 1 thói quen tốt
                  </span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  +15 XP
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* TẦNG 3: KHU VỰC THỰC THI TRỌNG TÂM - CORE EXECUTION (GRID 12 CỘT)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* CỘT TRÁI (8/12 CỘT): QUY TẮC TAM HỢP (THE RULE OF 3) & CÔNG VIỆC HÔM NAY  */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  Quy Tắc Tam Hợp & Công việc hôm nay
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Rule of 3
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tập trung giải quyết 3 nhiệm vụ quan trọng nhất để làm chủ hoàn toàn ngày hôm nay.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playPop();
                setShowQuickTaskModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl px-4 py-2 text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm công việc</span>
            </button>
          </div>

          {/* 3 SLOTS QUAN TRỌNG NHẤT (THE RULE OF 3 - KHÔNG CẮT CHỮ) */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <span>🎯 3 Việc Quan Trọng Nhất (Daily Trifecta)</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                1-chạm hoàn tất
              </span>
            </div>

            <div className="flex md:grid overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar md:grid-cols-3">
              {[0, 1, 2].map((slotIdx) => {
                const taskId = slotTaskIds[slotIdx];
                const task = tasks.find(t => t.id === taskId);
                const isCompleted = task?.status === 'Hoàn thành' || task?.status === 'Completed';
                const slotTitles = [
                  'Việc #1 · Quan trọng nhất',
                  'Việc #2 · Đòi hỏi tập trung',
                  'Việc #3 · Giải quyết dứt điểm'
                ];

                return (
                  <div
                    key={slotIdx}
                    className={`min-w-[85vw] sm:min-w-[280px] md:min-w-0 snap-center shrink-0 md:shrink rounded-xl border p-4 flex flex-col justify-between min-h-[140px] transition-all relative ${
                      task
                        ? isCompleted
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-400'
                        : 'bg-slate-50/40 dark:bg-slate-800/20 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <div>
                      {/* Slot Label */}
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-2">
                        {slotTitles[slotIdx]}
                      </span>

                      {task ? (
                        <div className="space-y-2">
                          <p className={`font-bold text-sm text-slate-900 dark:text-white leading-snug break-words ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              task.priority === 'Cao' || task.priority === 'Nghiêm trọng'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {task.priority || 'Trung bình'}
                            </span>
                          </div>
                        </div>
                      ) : pickingSlotIndex === slotIdx ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            autoFocus
                            value={inlineSlotTitle}
                            onChange={(e) => setInlineSlotTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateInlineSlotTask(slotIdx);
                              if (e.key === 'Escape') setPickingSlotIndex(null);
                            }}
                            placeholder="Nhập tên việc..."
                            className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg outline-none text-slate-900 dark:text-white"
                          />
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => setPickingSlotIndex(null)}
                              className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 rounded"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCreateInlineSlotTask(slotIdx)}
                              className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white rounded font-bold"
                            >
                              Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPickingSlotIndex(slotIdx)}
                          className="w-full text-left py-4 text-xs text-slate-400 hover:text-emerald-600 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-5 h-5 text-slate-300 hover:text-emerald-500" />
                          <span>+ Gán việc vào ô này</span>
                        </button>
                      )}
                    </div>

                    {/* Slot Actions */}
                    {task && (
                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                        <button
                          type="button"
                          onClick={() => {
                            const next = isCompleted ? 'Chưa làm' : 'Hoàn thành';
                            updateTask(task.id, { status: next });
                            if (!isCompleted) {
                              soundEngine.playSuccess();
                              retentionEngine.addXp(30, 'Hoàn thành việc cốt lõi', userId);
                              setCelebration({
                                title: 'Tuyệt vời!',
                                subtitle: `Đã hoàn thành việc quan trọng: "${task.title}"`,
                                xpAwarded: 30
                              });
                            }
                          }}
                          className={`text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${isCompleted ? 'stroke-[3]' : ''}`} />
                          <span>{isCompleted ? 'Đã xong' : 'Hoàn tất'}</span>
                        </button>

                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => {
                              setZenFocusTaskId(task.id);
                              setZenFocusOpen(true);
                            }}
                            title="Bắt đầu phiên tập trung Zen cho công việc này"
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Tập trung</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DANH SÁCH CÔNG VIỆC PHỤ TRONG NGÀY (TO-DO LIST) */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>📋 Danh sách công việc hôm nay ({pendingTasks.length} chưa xong)</span>
              <button
                type="button"
                onClick={() => setCurrentView('tasks')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 lowercase"
              >
                <span>mở bảng kanban</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 text-center py-8">
                <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Chưa có công việc nào hôm nay</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bấm nút "Thêm công việc" phía trên để lên kế hoạch.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayTasks.map(task => {
                  const isCompleted = task.status === 'Hoàn thành' || task.status === 'Completed';
                  const isTimerActive = activeTimerTask === task.id;

                  return (
                    <div 
                      key={task.id} 
                      className={`py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-colors ${isCompleted ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            const next = isCompleted ? 'Chưa làm' : 'Hoàn thành';
                            updateTask(task.id, { status: next });
                            if (!isCompleted) {
                              soundEngine.playPop();
                              retentionEngine.addXp(20, 'Hoàn thành công việc', userId);
                            }
                          }}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 cursor-pointer ${
                            isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                          }`}
                        >
                          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="min-w-0">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                              task.priority === 'Cao' || task.priority === 'Nghiêm trọng'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {task.priority || 'Trung bình'}
                            </span>
                            {task.estimatedHours && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" /> {task.estimatedHours}h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right timer / action */}
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => toggleTimer(task.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            isTimerActive
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isTimerActive ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>{formatTimer(timerSeconds)}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Tập trung</span>
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
        </div>

        {/* CỘT PHẢI (4/12 CỘT): TRẠM TẬP TRUNG (FOCUS STATION) + THÓI QUEN              */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Trạm Tập Trung (Focus & Pomodoro Station) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5 sm:pb-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Trạm Tập Trung (Zen / Pomodoro)
                </h3>
                <p className="text-xs text-slate-500">Làm việc sâu, không xao nhãng</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('focus')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Mở Pomodoro <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Focus Big Metric / Mini-player on mobile */}
            <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex sm:flex-col items-center sm:items-stretch justify-between gap-3">
              <div className="text-left sm:text-center space-y-0.5 sm:space-y-2 min-w-0 flex-1">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block truncate">
                  Thời gian tập trung hôm nay
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {studyDisplayValue}
                </div>
                <span className="text-[11px] sm:text-xs text-slate-500 block truncate">
                  {studySubtext}
                </span>
                <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/60 h-2 rounded-full overflow-hidden mt-2 hidden sm:block">
                  <div 
                    className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${focusProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Mobile Start Button in Mini-player row */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setZenFocusTaskId(slotTaskIds[0] || pendingTasks[0]?.id);
                  setZenFocusOpen(true);
                }}
                className="sm:hidden px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 shrink-0 cursor-pointer active:scale-95 min-h-[44px]"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Bắt đầu</span>
              </button>
            </div>

            {/* Big Launch Button in Emerald (desktop / tablet) */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playPop();
                setZenFocusTaskId(slotTaskIds[0] || pendingTasks[0]?.id);
                setZenFocusOpen(true);
              }}
              className="hidden sm:flex w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[44px]"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>⚡ Bắt đầu Tập trung 25p</span>
            </button>
          </div>

          {/* Card 2: Thói quen hôm nay (Daily Habits) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Thói quen hôm nay ({completedHabitsToday.length}/{habits.length})
                </h3>
                <p className="text-xs text-slate-500">Giữ chuỗi kỉ luật mỗi ngày</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('habits')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Quản lý <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {habits.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Chưa có thói quen nào. Bấm Quản lý để thêm.</p>
              ) : (
                habits.map(habit => {
                  const isCompleted = habit.completedDates?.includes(dateStr) || 
                    (habitRecords || []).some(r => r.habitId === habit.id && r.date === dateStr && r.status === 'Completed');

                  return (
                    <div 
                      key={habit.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
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
                              soundEngine.playPop();
                              retentionEngine.addXp(15, `Duy trì thói quen: ${habit.name}`, userId);
                            }
                          }}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 cursor-pointer ${
                            isCompleted ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-amber-400'
                          }`}
                        >
                          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <span className={`text-xs font-semibold truncate ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {habit.name}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono shrink-0">
                        <Flame className="w-3 h-3 fill-current" /> {habit.streak || 0}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* TẦNG 4: CHỈ SỐ ĐỜI SỐNG & TÀI CHÍNH - INSIGHTS & METRICS (GRID 12 CỘT)     */}
      {/* ========================================================================= */}
      
      {/* 4 THẺ QUICK STATS (MỖI THẺ 3/12 CỘT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          icon={CheckSquare} 
          title="Công việc" 
          value={`${completedTasks.length}/${todayTasks.length}`} 
          subtext={todayTasks.length > 0 ? `${Math.round((completedTasks.length / todayTasks.length) * 100)}% hoàn thành` : '0 việc hôm nay'}
          color="text-emerald-600 dark:text-emerald-400" 
          bg="bg-emerald-50 dark:bg-emerald-950/50" 
        />
        <SummaryCard 
          icon={Wallet} 
          title="Chi tiêu hôm nay" 
          value={formatCurrency(todayExpenses)} 
          subtext={hasBudgetBaseline ? `Hạn mức: ${formatCurrency(dailySafeToSpendBudget)}/ngày` : 'Chưa đặt ngân sách'} 
          color="text-teal-600 dark:text-teal-400" 
          bg="bg-teal-50 dark:bg-teal-950/50" 
        />
        <SummaryCard 
          icon={Clock} 
          title="Thời gian tập trung" 
          value={studyDisplayValue} 
          subtext={studySubtext} 
          color="text-violet-600 dark:text-violet-400" 
          bg="bg-violet-50 dark:bg-violet-950/50" 
        />
        <SummaryCard 
          icon={Flame} 
          title="Thói quen" 
          value={`${completedHabitsToday.length}/${habits.length}`} 
          subtext={habits.length > 0 ? `${Math.round((completedHabitsToday.length / habits.length) * 100)}% kỷ luật` : '0 thói quen'}
          color="text-amber-600 dark:text-amber-400" 
          bg="bg-amber-50 dark:bg-amber-950/50" 
        />
      </div>

      {/* Mobile Segmented Control Tab for 5D Harmony vs. Finance (< lg) */}
      <div className="flex lg:hidden items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => {
            soundEngine.playPop();
            setMobileInsightsTab('harmony');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
            mobileInsightsTab === 'harmony'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Cân bằng 5D</span>
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playPop();
            setMobileInsightsTab('finance');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
            mobileInsightsTab === 'finance'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Tài chính & Dự án</span>
        </button>
      </div>

      {/* MOBILE DISPLAY (< lg): Render either Harmony or Finance based on tab */}
      <div className="block lg:hidden">
        {mobileInsightsTab === 'harmony' ? (
          <LifeHarmonyRadarWidget 
            harmony={harmonyOverview} 
            onExploreGoals={() => setCurrentView('goals')}
            className="w-full"
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            {/* PHẦN 1: TÓM TẮT TÀI CHÍNH */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Tài chính & Hạn mức
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('finance')}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Sổ thu chi <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Total Balance Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 dark:from-slate-800/80 dark:to-slate-800/40 border border-emerald-200/60 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Số dư khả dụng</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {formatCurrency(totalBalance)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Dòng tiền tháng</span>
                  <span className={`text-xs font-bold font-mono ${netMonthly >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {netMonthly >= 0 ? '+' : ''}{formatCurrency(netMonthly)}
                  </span>
                </div>
              </div>

              {/* Daily Safe-to-Spend Status */}
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Hạn mức an toàn hôm nay:</span>
                <span className={`font-mono font-bold ${safeToSpendTodayRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {safeToSpendTodayRemaining >= 0 ? formatCurrency(safeToSpendTodayRemaining) : `-${formatCurrency(Math.abs(safeToSpendTodayRemaining))}`}
                </span>
              </div>
            </div>

            {/* PHẦN 2: TIẾN ĐỘ DỰ ÁN P.A.R.A */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Tiến độ Dự án (P.A.R.A)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('projects')}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  Tất cả ({projects.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {recentProjects.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">Chưa có dự án nào được khởi tạo.</p>
                ) : (
                  recentProjects.map(proj => (
                    <div 
                      key={proj.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {proj.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 font-mono shrink-0">
                          {proj.progress || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-teal-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, proj.progress || 0)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP DISPLAY (>= lg): 5D HARMONY RADAR (7 COLS) & TÀI CHÍNH + TIẾN ĐỘ DỰ ÁN (5 COLS) */}
      <div className="hidden lg:grid grid-cols-12 gap-6 items-stretch">
        
        {/* CỘT TRÁI (7/12 CỘT): CHỈ SỐ CÂN BẰNG CUỘC SỐNG (5D HARMONY RADAR CHART) */}
        <div className="col-span-7 flex flex-col">
          <LifeHarmonyRadarWidget 
            harmony={harmonyOverview} 
            onExploreGoals={() => setCurrentView('goals')}
            className="flex-1"
          />
        </div>

        {/* CỘT PHẢI (5/12 CỘT): TÓM TẮT TÀI CHÍNH & TIẾN ĐỘ DỰ ÁN P.A.R.A */}
        <div className="col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5">
          
          {/* PHẦN 1: TÓM TẮT TÀI CHÍNH */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Tài chính & Hạn mức
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('finance')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Sổ thu chi <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Total Balance Card (Light mode gradient, no hardcoded black!) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 dark:from-slate-800/80 dark:to-slate-800/40 border border-emerald-200/60 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Số dư khả dụng</span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {formatCurrency(totalBalance)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Dòng tiền tháng</span>
                <span className={`text-xs font-bold font-mono ${netMonthly >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {netMonthly >= 0 ? '+' : ''}{formatCurrency(netMonthly)}
                </span>
              </div>
            </div>

            {/* Daily Safe-to-Spend Status */}
            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Hạn mức an toàn hôm nay:</span>
              <span className={`font-mono font-bold ${safeToSpendTodayRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {safeToSpendTodayRemaining >= 0 ? formatCurrency(safeToSpendTodayRemaining) : `-${formatCurrency(Math.abs(safeToSpendTodayRemaining))}`}
              </span>
            </div>
          </div>

          {/* PHẦN 2: TIẾN ĐỘ DỰ ÁN P.A.R.A */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Tiến độ Dự án (P.A.R.A)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('projects')}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                Tất cả ({projects.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {recentProjects.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">Chưa có dự án nào được khởi tạo.</p>
              ) : (
                recentProjects.map(proj => (
                  <div 
                    key={proj.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {proj.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono shrink-0">
                        {proj.progress || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, proj.progress || 0)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* NEXT-GEN BENTO GRID: WORD OF THE HOUR + 365 CONTRIBUTION HEATMAP           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 pt-2">
          {/* Word of the Hour (4 cols) */}
          <div className="lg:col-span-4 flex flex-col">
            <WordOfTheHourWidget
              deepWorkTaskCount={deepWorkTasksCount}
              onOpenStudy={() => setShowGenZVocabStudy(true)}
            />
          </div>

          {/* 365-Day Contribution Heatmap (8 cols) */}
          <div className="lg:col-span-8 flex flex-col">
            <ContributionHeatmap365 />
          </div>
        </div>

        {/* Quick Gen Z Action Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowZeroEffortVocab(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Nạp từ tự động (0ms)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowSpeedMatch(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-amber-500/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>Speed Match 60s</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowGenZVocabStudy(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Phòng luyện FSRS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowEconomyShop(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-pink-500/50 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Đổi thưởng Coin Shop</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODALS & OVERLAYS                                                         */}
      {/* ========================================================================= */}

      {/* Quick Task Creation Modal */}
      {showQuickTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Thêm Công việc mới</span>
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
                soundEngine.playPop();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên công việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="VD: Soạn tài liệu tuần, gọi điện đối tác..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={quickTaskPriority}
                    onChange={(e) => setQuickTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Nghiêm trọng">Khẩn cấp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thời lượng dự kiến (Giờ)
                  </label>
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={quickTaskHours}
                    onChange={(e) => setQuickTaskHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                >
                  Tạo công việc ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Celebration Modal for Level up / Quests */}
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

      {/* Zen Focus Mode Overlay */}
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

      {/* Share Story Modal */}
      <ShareStoryModal
        isOpen={showShareStory}
        onClose={() => setShowShareStory(false)}
        profile={profile}
        userName={currentUser?.name || 'LifeOS Member'}
        todayCompletedTasks={completedTasks.length}
        moodEmoji={MOOD_PRESETS[todayMood].emoji}
        moodLabel={MOOD_PRESETS[todayMood].label}
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
        userId={userId}
        isOpen={showResurrectionModal}
        onClose={() => setShowResurrectionModal(false)}
        onResurrected={() => {
          setStreakShield(streakFreezeEngine.getStatus(userId));
          setResurrectionStatus(streakFreezeEngine.getResurrectionStatus(userId));
          soundEngine.playSuccess();
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

      {/* Next-Gen Zero-Effort Vocab Ingestion Modal */}
      <ZeroEffortIngestionModal
        isOpen={showZeroEffortVocab}
        initialWord={zeroEffortInitialWord}
        onClose={() => {
          setShowZeroEffortVocab(false);
          setZeroEffortInitialWord('');
        }}
      />

      {/* Next-Gen Speed Match 60s Game Modal */}
      <SpeedMatchGameModal
        isOpen={showSpeedMatch}
        onClose={() => setShowSpeedMatch(false)}
      />

      {/* Next-Gen Vocab Study Hub (4 Gamified Modes) */}
      <GenZVocabStudyModal
        isOpen={showGenZVocabStudy}
        onClose={() => setShowGenZVocabStudy(false)}
      />

      {/* Focus Economy Reward Shop Modal */}
      <FocusEconomyShopModal
        isOpen={showEconomyShop}
        onClose={() => setShowEconomyShop(false)}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value, subtext, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtext?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`p-2 rounded-xl ${bg} ${color}`}>
          <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </div>
        <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h4>
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{value}</div>
        {subtext && <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">{subtext}</div>}
      </div>
    </div>
  );
}
