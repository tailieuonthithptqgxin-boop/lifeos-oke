import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { 
  CheckSquare, Calendar, Wallet, Target, Activity, Clock, 
  Zap, ArrowRight, BookOpen, Flame, X, Check, Play, Pause, Square, AlertTriangle, Plus,
  FolderKanban, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ChevronRight, ChevronLeft,
  PieChart, Building, MoreHorizontal, FileEdit, RotateCcw, ChevronDown, ChevronUp, Sparkles, Award,
  Trophy, CheckCircle2, Circle, Coins, Star, Layers, Info, ExternalLink, RefreshCw, Smartphone, Search, Users, Globe
} from 'lucide-react';
import { webNotification } from '../lib/webNotification';
import { formatCurrency, formatDate, formatLocalDateKey } from '../lib/utils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
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
import { TrifectaDetailModal } from './dashboard/TrifectaDetailModal';
import { TodayHabitsModal } from './dashboard/TodayHabitsModal';
import { TodayTasksModal } from './dashboard/TodayTasksModal';
import { TodayFinanceModal } from './dashboard/TodayFinanceModal';
import { LumiQuestsModal } from './dashboard/LumiQuestsModal';
import { LifeHarmonyDetailModal } from './dashboard/LifeHarmonyDetailModal';
import { SpatialBentoCard } from './spatial/SpatialBentoCard';

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
    focusSessions = [], focusGoals = [], projects = [], financeAccounts = [], budgets = [], notes = [],
    addTask, updateTask, updateHabit, addHabitRecord, dailyCapacity = 8,
    setCurrentView, clearWorkspace, language, currentUser, addEvent, toggleCommand
  } = useAppStore();

  const isVi = language === 'vi';
  const t = useTranslation(language);

  // Time & Date states
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = formatLocalDateKey(selectedDate);
  const todayStr = formatLocalDateKey(new Date());

  // Modals & Interactivity states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
  const [showTrifectaModal, setShowTrifectaModal] = useState(false);
  const [showHabitsModal, setShowHabitsModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showLumiModal, setShowLumiModal] = useState(false);
  const [showHarmonyModal, setShowHarmonyModal] = useState(false);
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
  const [isSubmittingQuickTask, setIsSubmittingQuickTask] = useState(false);
  const [isQuickTaskShaking, setIsQuickTaskShaking] = useState(false);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const isAnyModalOpen = Boolean(
    showQuickTaskModal || 
    showClearConfirm || 
    showTrifectaModal || 
    showHabitsModal || 
    showTasksModal || 
    showFinanceModal || 
    showLumiModal || 
    showHarmonyModal || 
    showMoodPicker || 
    showShareStory || 
    showSundayReset || 
    showVibeThemeModal || 
    showWrappedModal || 
    showAiBuddyModal || 
    showPersonaQuizModal || 
    showLeaderboard || 
    showResurrectionModal || 
    showZeroEffortVocab || 
    showSpeedMatch || 
    showGenZVocabStudy || 
    showEconomyShop || 
    celebration
  );
  useBodyScrollLock(isAnyModalOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showQuickTaskModal) {
          if (quickTaskTitle.trim()) {
            setIsQuickTaskShaking(true);
            setTimeout(() => setIsQuickTaskShaking(false), 500);
          } else if (!isSubmittingQuickTask) {
            setShowQuickTaskModal(false);
          }
          return;
        }
        if (showMoodPicker) setShowMoodPicker(false);
        if (showClearConfirm) setShowClearConfirm(false);
        if (showTrifectaModal) setShowTrifectaModal(false);
        if (showHabitsModal) setShowHabitsModal(false);
        if (showTasksModal) setShowTasksModal(false);
        if (showFinanceModal) setShowFinanceModal(false);
        if (showLumiModal) setShowLumiModal(false);
        if (showHarmonyModal) setShowHarmonyModal(false);
        if (showShareStory) setShowShareStory(false);
        if (showSundayReset) setShowSundayReset(false);
        if (showVibeThemeModal) setShowVibeThemeModal(false);
        if (showWrappedModal) setShowWrappedModal(false);
        if (showAiBuddyModal) setShowAiBuddyModal(false);
        if (showPersonaQuizModal) setShowPersonaQuizModal(false);
        if (showLeaderboard) setShowLeaderboard(false);
        if (showResurrectionModal) setShowResurrectionModal(false);
        if (showZeroEffortVocab) setShowZeroEffortVocab(false);
        if (showSpeedMatch) setShowSpeedMatch(false);
        if (showGenZVocabStudy) setShowGenZVocabStudy(false);
        if (showEconomyShop) setShowEconomyShop(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showQuickTaskModal, showMoodPicker, quickTaskTitle, isSubmittingQuickTask,
    showClearConfirm, showTrifectaModal, showHabitsModal, showTasksModal,
    showFinanceModal, showLumiModal, showHarmonyModal, showShareStory,
    showSundayReset, showVibeThemeModal, showWrappedModal, showAiBuddyModal,
    showPersonaQuizModal, showLeaderboard, showResurrectionModal,
    showZeroEffortVocab, showSpeedMatch, showGenZVocabStudy, showEconomyShop
  ]);

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
  const [isPinningWidget, setIsPinningWidget] = useState(false);
  const [widgetPinnedSuccess, setWidgetPinnedSuccess] = useState(false);

  const handlePinLockScreenWidget = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundEngine.playPop();
    setIsPinningWidget(true);
    try {
      const ok = await webNotification.syncLockScreenLiveCard();
      if (ok) {
        setWidgetPinnedSuccess(true);
        setTimeout(() => setWidgetPinnedSuccess(false), 3500);
      }
    } catch (err) {
      console.error('Failed to pin lock screen card:', err);
    } finally {
      setIsPinningWidget(false);
    }
  };

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
  }, [userId, currentUser?.id, currentUser?.plan, currentUser?.role]);

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

    const handleWidgetTaskDone = () => {
      fetchProgression();
    };
    window.addEventListener('lifeos:task-completed-from-widget', handleWidgetTaskDone);

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
      window.removeEventListener('lifeos:task-completed-from-widget', handleWidgetTaskDone);
    };
  }, []);

  // Technique 5: Optimized Tasks Filtering (useMemo)
  const todayTasks = useMemo(() => (tasks || []).filter(t => t.dueDate && t.dueDate.startsWith(dateStr) && t.status !== 'Hủy' && t.status !== 'Cancelled'), [tasks, dateStr]);
  const pendingTasks = useMemo(() => todayTasks.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Completed'), [todayTasks]);
  const completedTasks = useMemo(() => todayTasks.filter(t => t.status === 'Hoàn thành' || t.status === 'Completed'), [todayTasks]);

  // Overdue Tasks from previous days
  const overdueTasks = useMemo(() => {
    return (tasks || []).filter(t => {
      const isDone = t.status === 'Hoàn thành' || t.status === 'Completed' || t.status === 'Done' || t.status === 'Hủy' || t.status === 'Cancelled';
      return t.dueDate && t.dueDate < dateStr && !isDone;
    });
  }, [tasks, dateStr]);

  const handleRescheduleOverdue = useCallback((taskId: string) => {
    if (updateTask) {
      updateTask(taskId, { dueDate: dateStr });
      soundEngine.playPop();
    }
  }, [updateTask, dateStr]);

  const handleRescheduleAllOverdue = useCallback(() => {
    if (!updateTask) return;
    overdueTasks.forEach(t => {
      updateTask(t.id, { dueDate: dateStr });
    });
    soundEngine.playSuccess();
  }, [updateTask, overdueTasks, dateStr]);

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

  // Auto-fill empty slots for Rule of 3 if available (Optimized: No useless re-renders)
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    setSlotTaskIds(prev => {
      let hasChange = false;
      const current = [...prev] as [string, string, string];
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

      if (!hasChange) {
        return prev;
      }

      try {
        localStorage.setItem(`lifeos_trifecta_${todayStr}`, JSON.stringify(current));
      } catch {}
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

  // Technique 5: Optimized Financial Metrics Calculations (useMemo)
  const {
    todayExpenses,
    todayIncome,
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    netMonthly,
    hasBudgetBaseline,
    dailySafeToSpendBudget,
    safeToSpendTodayRemaining
  } = useMemo(() => {
    const tExp = (transactions || [])
      .filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && t.date && t.date.startsWith(dateStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const tInc = (transactions || [])
      .filter(t => (t.type === 'Thu nhập' || t.type === 'Income') && t.date && t.date.startsWith(dateStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const bal = (financeAccounts || []).reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
    const nowObj = new Date();
    const curMonth = nowObj.getMonth();
    const curYear = nowObj.getFullYear();
    const daysInM = new Date(curYear, curMonth + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInM - nowObj.getDate() + 1);

    const mTx = (transactions || []).filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });
    const mInc = mTx.filter(t => t.type === 'Thu nhập' || t.type === 'Income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const mExp = mTx.filter(t => t.type === 'Chi tiêu' || t.type === 'Expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const netM = mInc - mExp;

    const totalConfigBudget = (budgets || []).reduce((sum: number, b: any) => sum + (Number(b.limit) || Number(b.amount) || 0), 0);
    const hasBaseline = totalConfigBudget > 0 || mInc > 0;
    const userMBudget = totalConfigBudget > 0 ? totalConfigBudget : (mInc > 0 ? mInc : 0);
    const remainingMonth = Math.max(0, userMBudget - mExp);
    const dailySafe = hasBaseline ? Math.round(remainingMonth / daysRemaining) : 0;
    const safeRemaining = hasBaseline ? (dailySafe - tExp) : -tExp;

    return {
      todayExpenses: tExp,
      todayIncome: tInc,
      totalBalance: bal,
      monthlyIncome: mInc,
      monthlyExpense: mExp,
      netMonthly: netM,
      hasBudgetBaseline: hasBaseline,
      dailySafeToSpendBudget: dailySafe,
      safeToSpendTodayRemaining: safeRemaining
    };
  }, [transactions, financeAccounts, budgets, dateStr]);

  // Technique 5: Optimized Focus & Study Metrics (useMemo)
  const {
    todayFocusMinutes,
    studyDisplayValue,
    studySubtext,
    focusProgressPercent,
    targetStudyHours
  } = useMemo(() => {
    const todaySessions = (focusSessions || []).filter(s => 
      s.status === 'Completed' && (s.createdAt?.startsWith(dateStr) || s.startTime?.startsWith(dateStr))
    );
    const mins = todaySessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
    const dailyGoal = (focusGoals || []).find(g => g.type === 'daily');
    const targetHours = dailyGoal?.targetHours || 3;
    const targetMins = targetHours * 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    const displayVal = mins > 0 
      ? (hrs > 0 ? `${hrs}h ${remMins > 0 ? `${remMins}m` : ''}` : `${remMins} phút`) 
      : '0 phút';
    const subtext = `/ ${targetHours} giờ mục tiêu`;
    const progressPct = Math.min(100, Math.round((mins / (targetMins || 180)) * 100));

    return {
      todayFocusMinutes: mins,
      studyDisplayValue: displayVal,
      studySubtext: subtext,
      focusProgressPercent: progressPct,
      targetStudyHours: targetHours
    };
  }, [focusSessions, focusGoals, dateStr]);

  // Technique 5: Optimized Habits Metrics (useMemo)
  const completedHabitsToday = useMemo(() => (habits || []).filter(h => 
    h.completedDates?.includes(dateStr) || 
    (habitRecords || []).some(r => r.habitId === h.id && r.date === dateStr && r.status === 'Completed')
  ), [habits, habitRecords, dateStr]);

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

  // Technique 5: Optimized Projects Summary (useMemo)
  const recentProjects = useMemo(() => [...(projects || [])]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 3), [projects]);

  // Technique 5: Optimized 5D Harmony Calculation (useMemo)
  const harmonyOverview = useMemo(() => compute5DHarmony({
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
  }), [tasks, habits, habitRecords, focusSessions, focusGoals, transactions, budgets, financeAccounts, goals, dateStr]);

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
  const currentLevel = currentUser?.level ?? progressionData?.level ?? profile.level ?? 1;
  const evolution = getEvolutionStage(currentLevel);
  const currentXp = currentUser?.xp ?? progressionData?.totalXp ?? profile.totalXp ?? 0;
  const xpNeeded = progressionData?.xpNeededForNextLevel ?? 100;
  const currentStreak = currentUser?.streakDays ?? progressionData?.currentStreak ?? profile.streak ?? 0;

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

    // Computed helpers for redesigned Super-app UI
  const hasCompletedTaskToday = completedTasks.length > 0;

  const trifectaTasks = useMemo(() => {
    return slotTaskIds.map(id => tasks.find(t => t.id === id)).filter(Boolean);
  }, [slotTaskIds, tasks]);

  const completedTrifectaCount = useMemo(() => {
    return trifectaTasks.filter(t => t?.status === 'Hoàn thành' || t?.status === 'Completed').length;
  }, [trifectaTasks]);

  const handleToggleHabitModal = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const isCompleted = habit.completedDates?.includes(dateStr) || 
      (habitRecords || []).some(r => r.habitId === habit.id && r.date === dateStr && r.status === 'Completed');
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
  };

  const handleToggleTaskModal = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const isDone = task.status === 'Hoàn thành' || task.status === 'Completed';
    updateTask(taskId, { status: isDone ? 'Chưa làm' : 'Hoàn thành' });
    if (!isDone) {
      soundEngine.playSuccess();
      triggerConfetti();
      retentionEngine.addXp(20, `Hoàn thành việc: ${task.title}`, userId);
    }
  };

  const handleSelectSlotTask = (slotIdx: number, taskId: string) => {
    setSlotTaskIds(prev => {
      const next: [string, string, string] = [prev[0] || '', prev[1] || '', prev[2] || ''];
      next[slotIdx] = taskId;
      try {
        localStorage.setItem(`lifeos_trifecta_${todayStr}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-4 sm:p-6 lg:p-8 space-y-4 md:space-y-6 pb-28 md:pb-12 overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* 1. COMPACT SUPER-APP HEADER BANNER (MB BANK / XANH SM STYLE)             */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-slate-900 dark:via-emerald-950/70 dark:to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-emerald-900/10 border border-emerald-500/20 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Date/Time + Mood Selector + Daily Quote */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
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
                    <div 
                      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
                      onClick={() => setShowMoodPicker(false)} 
                    />
                    <div 
                      className="fixed inset-x-3 bottom-6 z-50 md:absolute md:inset-auto md:top-full md:left-0 md:mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl md:rounded-2xl p-3 md:p-2 w-auto md:w-72 space-y-1 text-xs text-slate-800 dark:text-slate-200 animate-in slide-in-from-bottom-5 md:slide-in-from-top-2 duration-150"
                    >
                      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Tâm trạng hôm nay
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setShowMoodPicker(false)} 
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-[60vh] md:max-h-72 overflow-y-auto space-y-1 pr-0.5">
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
                              className={`w-full flex items-center gap-2.5 p-2.5 md:p-2 rounded-xl text-left transition-colors cursor-pointer ${
                                isSelected 
                                  ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="text-xl md:text-base shrink-0">{m.emoji}</span>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs">{t(m.label)}</div>
                                <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                  {m.vibe || m.quote}
                                </div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Daily Slogan / Inspirational Quote */}
            <p className="text-xs sm:text-sm font-medium text-emerald-50/95 dark:text-emerald-200/90 flex items-center gap-1.5 italic">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 fill-amber-300" />
              <span>"Một phiên làm việc sâu giá trị hơn 10 tiếng ngồi lướt mạng."</span>
            </p>
          </div>

          {/* Right: Quick Gamification Badges */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white font-black text-xs">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-pulse" />
              <span>{currentStreak} ngày</span>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playPop();
                setShowEconomyShop(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-slate-900 font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Mở Cửa hàng Đổi Thưởng Xu"
            >
              <span>🪙</span>
              <span>{progressionData?.coins ?? profile.coins ?? 0} xu</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.1 HERO QUICK OMNIBAR LAUNCHER (SPOTLIGHT 1-CHẠM)                         */}
      {/* ========================================================================= */}
      <div 
        onClick={() => {
          soundEngine.playPop();
          toggleCommand();
        }}
        className="w-full bg-white dark:bg-[#141E30] hover:bg-slate-50 dark:hover:bg-[#19243C] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-emerald-500/50 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {t("Gõ nhanh việc cần làm, chi tiêu, hoặc tìm kiếm...")}
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                ⚡ 0ms Quick-Add
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {t("VD: 'Cafe 45k', '+15m Lương', 'Họp mai !gap', '#note Ý tưởng'...")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Ctrl + K
          </kbd>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("Mở nhanh")}</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC BÉ LUMI BAR (DUOLINGO / TIKTOK STREAK MOOD LOGIC)              */}
      {/* ========================================================================= */}
      <div 
        onClick={() => {
          soundEngine.playPop();
          setShowLumiModal(true);
        }}
        className={`w-full rounded-2xl p-3 sm:p-4 border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between gap-3 shadow-xs ${
          hasCompletedTaskToday
            ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/90 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-emerald-300 dark:border-emerald-700/60 shadow-emerald-500/10'
            : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Dynamic Mood Avatar */}
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-transform ${
            hasCompletedTaskToday
              ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/30 animate-pulse'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 grayscale'
          }`}>
            {hasCompletedTaskToday ? '😄' : '😢'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                {mascotSettings.customName || 'Bé Lumi'}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                hasCompletedTaskToday
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                Cấp {currentLevel}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
              {hasCompletedTaskToday
                ? 'Bé Lumi đang cười tươi: Đã xong việc hôm nay! Nhận thưởng XP ngay ✨'
                : 'Bé Lumi đang buồn rơm rớm: Bạn chưa xong việc nào hôm nay, cố lên nhé! 🥺'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handlePinLockScreenWidget}
            title="Ghim thời gian biểu & linh vật ra màn hình khóa điện thoại (Duolingo PWA Live Widget)"
            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all inline-flex items-center gap-1 border ${
              widgetPinnedSuccess
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>
              {widgetPinnedSuccess
                ? 'Đã ghim!'
                : isPinningWidget
                ? 'Đang ghim...'
                : 'Ghim thẻ khóa'}
            </span>
          </button>

          <span className={`text-[11px] font-bold px-3 py-1 rounded-xl transition-all hidden sm:inline-flex items-center gap-1 ${
            hasCompletedTaskToday
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nhiệm vụ +XP</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* 🌟 BANNER ĐẶC BIỆT: KHÔNG GIAN HỌC TẬP & CO-WORKING TRỰC TUYẾN */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900/90 via-indigo-900/90 to-purple-950/90 border border-violet-500/30 p-4 sm:p-5 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/30 text-violet-200 border border-violet-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Phòng Học Online & Co-working
              </span>
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                👑 Google Meet & Bảng Xếp Hạng Tuần
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Không Gian Học Tập & Co-working Trực Tuyến
            </h3>
            <p className="text-xs text-violet-200/90 max-w-xl">
              Cùng học qua Google Meet / Jitsi, kết nối phòng học ảo, tích lũy giờ học tự động và vinh danh Quán Quân tuần mới!
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSuccess();
                setCurrentView('connect');
              }}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-black text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Bảng Tin Cộng Đồng</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playSuccess();
                setCurrentView('study-space');
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Vào Sảnh Học Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LƯỚI TIỆN ÍCH Ô VUÔNG ĐA SẮC MÀU (SUPER-APP ICON GRID)                 */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Tiện Ích & Dịch Vụ Nhanh</span>
          </h2>
          <span className="text-[11px] font-bold text-slate-400">Chạm để mở chi tiết</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2.5 sm:gap-3.5">
          {/* 1. Tam Hợp (Rule of 3) */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowTrifectaModal(true);
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-rose-300 dark:hover:border-rose-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 mb-2 group-hover:rotate-6 transition-transform">
              <Target className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              Tam Hợp
            </span>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full mt-1">
              {completedTrifectaCount}/3 việc
            </span>
          </button>

          {/* 2. Công Việc Hôm Nay */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowTasksModal(true);
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            {overdueTasks.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black shadow-xs animate-pulse">
                {overdueTasks.length} trễ
              </span>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 mb-2 group-hover:rotate-6 transition-transform">
              <CheckSquare className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Công Việc
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full mt-1">
              {completedTasks.length}/{todayTasks.length} việc
            </span>
          </button>

          {/* 3. Phòng Tập Trung */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setCurrentView('focus');
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-violet-500/25 mb-2 group-hover:rotate-6 transition-transform">
              <Zap className="w-6 h-6 fill-white stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              Tập Trung
            </span>
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-1.5 py-0.5 rounded-full mt-1">
              {studyDisplayValue}
            </span>
          </button>

          {/* 4. Thói Quen */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowHabitsModal(true);
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 mb-2 group-hover:rotate-6 transition-transform">
              <Flame className="w-6 h-6 fill-white stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Thói Quen
            </span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-full mt-1">
              {completedHabitsToday.length}/{habits.length}
            </span>
          </button>

          {/* 5. Sổ Chi Tiêu */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowFinanceModal(true);
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/25 mb-2 group-hover:rotate-6 transition-transform">
              <Wallet className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              Chi Tiêu
            </span>
            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded-full mt-1 truncate max-w-full">
              {todayExpenses > 0 ? formatCurrency(todayExpenses) : '0đ'}
            </span>
          </button>

          {/* 6. Cân Bằng 5D */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowHarmonyModal(true);
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-pink-300 dark:hover:border-pink-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-pink-500/25 mb-2 group-hover:rotate-6 transition-transform">
              <Star className="w-6 h-6 fill-white stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              Cân Bằng 5D
            </span>
            <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-1.5 py-0.5 rounded-full mt-1">
              {Math.round(harmonyOverview?.overallScore ?? 0)} điểm
            </span>
          </button>

          {/* 7. Học Tập (Study OS) */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setCurrentView('study');
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 mb-2 group-hover:rotate-6 transition-transform">
              <BookOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Học Tập
            </span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full mt-1">
              Study OS
            </span>
          </button>

          {/* 8. Ghi Chú & Dự Án */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setCurrentView('notes');
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-sky-300 dark:hover:border-sky-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 mb-2 group-hover:rotate-6 transition-transform">
              <FileEdit className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Ghi Chú
            </span>
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-full mt-1">
              {notes.length || 0} mục
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BẢN ĐỒ KỶ LUẬT 365 NGÀY (365-DAY CONTRIBUTION HEATMAP)                 */}
      {/* ========================================================================= */}
      <div className="w-full pt-1">
        <ContributionHeatmap365 />
      </div>

      {/* Quick Gen Z Action Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
        <button
          type="button"
          onClick={() => {
            soundEngine.playPop();
            setShowZeroEffortVocab(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all shadow-2xs shrink-0 cursor-pointer"
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
          className="flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-amber-500/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all shadow-2xs shrink-0 cursor-pointer"
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
          className="flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all shadow-2xs shrink-0 cursor-pointer"
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
          className="flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-2xl bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-pink-500/50 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 transition-all shadow-2xs shrink-0 cursor-pointer"
        >
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span>Đổi thưởng Coin Shop</span>
        </button>
      </div>
    {/* ========================================================================= */}
      {/* MODALS & OVERLAYS                                                         */}
      {/* ========================================================================= */}

      {/* Quick Task Creation Modal with Anti-Spam & Scroll Lock */}
      {showQuickTaskModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onMouseDown={(e) => { mouseDownTargetRef.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget && !isSubmittingQuickTask) {
              if (quickTaskTitle.trim()) {
                setIsQuickTaskShaking(true);
                setTimeout(() => setIsQuickTaskShaking(false), 500);
              } else {
                setShowQuickTaskModal(false);
              }
            }
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-[#141E30] rounded-3xl shadow-2xl w-full max-w-md p-6 border border-[#E2E8F0] dark:border-white/[0.08] animate-in zoom-in-95 duration-150 ${
              isQuickTaskShaking ? 'animate-shake' : ''
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Thêm Công việc mới</span>
              </h3>
              <button 
                type="button" 
                disabled={isSubmittingQuickTask}
                onClick={() => setShowQuickTaskModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmedTitle = quickTaskTitle.trim();
                if (!trimmedTitle || isSubmittingQuickTask) return;
                
                try {
                  setIsSubmittingQuickTask(true);
                  await Promise.resolve(addTask({
                    title: trimmedTitle,
                    priority: quickTaskPriority,
                    estimatedHours: Number(quickTaskHours) || 1,
                    dueDate: dateStr,
                    status: 'Chưa làm',
                    actualHours: 0
                  }));
                  setQuickTaskTitle('');
                  setQuickTaskHours(1);
                  setShowQuickTaskModal(false);
                  soundEngine.playPop();
                } finally {
                  setIsSubmittingQuickTask(false);
                }
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
                  maxLength={255}
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="VD: Soạn tài liệu tuần, gọi điện đối tác..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
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
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
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
                    max="24"
                    step="0.25"
                    value={quickTaskHours}
                    onChange={(e) => setQuickTaskHours(Math.max(0.25, Number(e.target.value) || 1))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingQuickTask}
                  onClick={() => setShowQuickTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!quickTaskTitle.trim() || isSubmittingQuickTask}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingQuickTask && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingQuickTask ? 'Đang tạo...' : 'Tạo công việc ngay'}</span>
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

      {/* Trifecta Detail Modal */}
      <TrifectaDetailModal
        isOpen={showTrifectaModal}
        onClose={() => setShowTrifectaModal(false)}
        tasks={todayTasks}
        slotTaskIds={slotTaskIds}
        onToggleComplete={handleToggleTaskModal}
        onSelectTaskForSlot={handleSelectSlotTask}
        onAddTask={(title, priority) => {
          addTask({
            title,
            priority: priority || 'Cao',
            dueDate: dateStr,
            status: 'Chưa làm',
            estimatedHours: 1,
            actualHours: 0
          });
          soundEngine.playPop();
        }}
        onGoToTasks={() => {
          setShowTrifectaModal(false);
          setCurrentView('tasks');
        }}
      />

      {/* Today Tasks Modal */}
      <TodayTasksModal
        isOpen={showTasksModal}
        onClose={() => setShowTasksModal(false)}
        tasks={todayTasks}
        overdueTasks={overdueTasks}
        onRescheduleOverdue={handleRescheduleOverdue}
        onRescheduleAllOverdue={handleRescheduleAllOverdue}
        onToggleComplete={handleToggleTaskModal}
        onAddTask={(title, priority) => {
          addTask({
            title,
            priority: priority || 'Trung bình',
            dueDate: dateStr,
            status: 'Chưa làm',
            estimatedHours: 1,
            actualHours: 0
          });
          soundEngine.playPop();
        }}
        onGoToTasks={() => {
          setShowTasksModal(false);
          setCurrentView('tasks');
        }}
      />

      {/* Today Habits Modal */}
      <TodayHabitsModal
        isOpen={showHabitsModal}
        onClose={() => setShowHabitsModal(false)}
        habits={habits}
        completedHabitIds={completedHabitsToday.map(h => h.id)}
        onToggleHabit={handleToggleHabitModal}
        onGoToHabits={() => {
          setShowHabitsModal(false);
          setCurrentView('habits');
        }}
      />

      {/* Today Finance Modal */}
      <TodayFinanceModal
        isOpen={showFinanceModal}
        onClose={() => setShowFinanceModal(false)}
        transactions={transactions}
        accounts={financeAccounts}
        todayStr={dateStr}
        language={language}
        onGoToFinance={() => {
          setShowFinanceModal(false);
          setCurrentView('finance');
        }}
      />

      {/* Lumi Quests Modal */}
      <LumiQuestsModal
        isOpen={showLumiModal}
        onClose={() => setShowLumiModal(false)}
        progressionData={progressionData}
        hasCompletedTaskToday={hasCompletedTaskToday}
        onClaimQuest={handleClaimQuest}
        onOpenShop={() => {
          setShowLumiModal(false);
          setShowEconomyShop(true);
        }}
      />

      {/* Life Harmony 5D Modal */}
      <LifeHarmonyDetailModal
        isOpen={showHarmonyModal}
        onClose={() => setShowHarmonyModal(false)}
        harmony={harmonyOverview}
        onExploreGoals={() => {
          setShowHarmonyModal(false);
          setCurrentView('goals');
        }}
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
    <div className="bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
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
