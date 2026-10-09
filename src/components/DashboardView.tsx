import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { 
  CheckSquare, Calendar, Wallet, Target, Activity, Clock, 
  Zap, ArrowRight, BookOpen, Flame, X, Check, Play, Pause, Square, AlertTriangle, Plus,
  FolderKanban, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ChevronRight, ChevronLeft,
  PieChart, Building, MoreHorizontal, FileEdit, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { ResponsiveContainer, RadialBarChart, RadialBar, Cell } from 'recharts';

export function DashboardView() {
  const { 
    tasks, events, transactions, goals, habits, habitRecords, subjects,
    focusSessions, focusGoals, studyAssignments, projects = [], financeAccounts = [],
    addTask, updateTask, addTransaction, updateHabit, addHabitRecord, lifeScore, dailyCapacity,
    setCurrentView, clearWorkspace, workspaceMode, onboardingPreferences, language
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
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<any>('Trung bình');
  const [quickTaskHours, setQuickTaskHours] = useState<number>(1);
  
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
  const todayTasks = (tasks || []).filter(t => t.dueDate && t.dueDate.startsWith(dateStr) && t.status !== 'Hủy');
  const pendingTasks = todayTasks.filter(t => t.status !== 'Hoàn thành');
  const completedTasks = todayTasks.filter(t => t.status === 'Hoàn thành');
  
  const todayEvents = (events || []).filter(e => e.date && e.date.startsWith(dateStr));
  
  const todayExpenses = (transactions || [])
    .filter(t => t.type === 'Chi tiêu' && t.date && t.date.startsWith(dateStr))
    .reduce((sum, t) => sum + t.amount, 0);

  const todayIncome = (transactions || [])
    .filter(t => t.type === 'Thu nhập' && t.date && t.date.startsWith(dateStr))
    .reduce((sum, t) => sum + t.amount, 0);

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
  const goalsSubtext = activeGoals.length > 0 ? `${completedGoalsCount}/${activeGoals.length} hoàn thành` : 'Chưa có mục tiêu';

  // Habits completed for selected date
  const completedHabitsToday = (habits || []).filter(h => 
    h.completedDates?.includes(dateStr) || 
    (habitRecords || []).some(r => r.habitId === h.id && r.date === dateStr && r.status === 'Completed')
  );

  // Daily Score Calculation (0 - 100 points)
  // Tasks: 30 pts max
  const taskScore = todayTasks.length > 0 
    ? (completedTasks.length / todayTasks.length) * 30 
    : (tasks.length > 0 ? (tasks.filter(t => t.status === 'Hoàn thành').length / tasks.length) * 20 : 20);
  // Habits: 25 pts max
  const habitScore = habits.length > 0 
    ? (completedHabitsToday.length / habits.length) * 25 
    : 20;
  // Study/Focus: 25 pts max
  const focusScore = targetStudyMinutes > 0 
    ? Math.min(25, (todayFocusMinutes / targetStudyMinutes) * 25) 
    : 15;
  // Goals progress: 20 pts max
  const goalScore = activeGoals.length > 0 
    ? (avgGoalProgress / 100) * 20 
    : 15;
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
  const monthlyIncome = monthlyTx.filter(t => t.type === 'Thu nhập').reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = monthlyTx.filter(t => t.type === 'Chi tiêu').reduce((sum, t) => sum + t.amount, 0);
  const netMonthly = monthlyIncome - monthlyExpense;
  const recentTransactions = [...(transactions || [])]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 3);

  // Projects Summary Calculations
  const activeProjects = (projects || []).filter(p => p.status !== 'Hoàn thành' && p.status !== 'Tạm dừng');
  const recentProjects = [...(projects || [])]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 3);
  const totalProjectsCount = (projects || []).length;

  // Risk Detection
  const risks = [];
  if (isOverload) risks.push({ type: 'Capacity Risk', message: `Quá tải: Kế hoạch (${plannedTaskHours}h) vượt Capacity (${dailyCapacity}h)` });
  if (pendingTasks.some(t => t.priority === 'Cao' || t.priority === 'Nghiêm trọng')) risks.push({ type: 'Deadline Risk', message: 'Có công việc ưu tiên cao chưa hoàn thành' });
  if (todayExpenses > 500000) risks.push({ type: 'Finance Risk', message: `Chi tiêu hôm nay (${formatCurrency(todayExpenses)}) cao hơn định mức thông thường` });

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

  const scoreData = [
    { name: 'Score', value: dailyScore, fill: dailyScore >= 75 ? '#10b981' : dailyScore >= 40 ? '#f59e0b' : '#ef4444' },
    { name: 'Remaining', value: 100 - dailyScore, fill: '#f1f5f9' }
  ];

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* 1. Simplified, Clear Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('Tổng quan hôm nay')}
          </h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <span>{formatDate(selectedDate)}</span>
            <span>·</span>
            <span className="font-mono font-medium">
              {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Action Bar: Grouped Date Controls + Primary Action + More Options */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Date Selector Segmented Control */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              type="button"
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
              aria-label={t('Ngày trước')}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t('Hôm nay')}
            </button>
            <button 
              type="button"
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
              aria-label={t('Ngày sau')}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Button: + Thêm việc */}
          <button 
            type="button"
            onClick={() => setShowQuickTaskModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Thêm việc')}</span>
          </button>

          {/* More Options Menu */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
              title={t('Tùy chọn khác')}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('notes');
                      setShowMoreActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <FileEdit className="w-4 h-4 text-blue-500" />
                    <span>{t('Viết nhật ký / Đánh giá ngày')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('goals');
                      setShowMoreActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <Target className="w-4 h-4 text-rose-500" />
                    <span>{t('Xem tất cả mục tiêu')}</span>
                  </button>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowClearConfirm(true);
                        setShowMoreActions(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{t('Làm sạch dữ liệu hôm nay')}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
              <div className="p-8 text-center text-slate-500 space-y-3">
                <p className="text-sm">{t('Chưa có công việc nào được lên lịch cho ngày này.')}</p>
                <button
                  onClick={() => setShowQuickTaskModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> {t('Thêm công việc thực tế')}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayTasks.map(task => {
                  const isTimerActive = activeTimerTask === task.id;
                  const isCompleted = task.status === 'Hoàn thành';
                  return (
                    <div key={task.id} className={`p-4 flex items-center gap-4 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors ${isCompleted ? 'bg-slate-50 dark:bg-slate-800/50/50' : ''}`}>
                      <button 
                        onClick={() => updateTask(task.id, { status: isCompleted ? 'Chưa làm' : 'Hoàn thành' })}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0
                          ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-transparent hover:border-blue-500'}`}
                      >
                        <Check className="w-3.5 h-3.5" />
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
                  {dailyScore >= 90 ? 'Excellent' : dailyScore >= 75 ? 'Good' : dailyScore >= 40 ? 'Normal' : 'Poor'}
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
                            streak: isCompleted ? Math.max(0, (habit.streak || 1) - 1) : (habit.streak || 0) + 1
                          });
                          addHabitRecord({
                            habitId: habit.id,
                            date: dateStr,
                            status: isCompleted ? 'Missed' : 'Completed',
                            actualValue: isCompleted ? 0 : (habit.target || 1)
                          });
                        }}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors
                          ${isCompleted ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 hover:border-amber-400'}`}
                      >
                        {isCompleted && <Check className="w-4 h-4" />}
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
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value, subtext, color, bg }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${bg} ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h4>
      </div>
      <div>
        <div className="text-xl font-black text-slate-900 dark:text-white">{value}</div>
        {subtext && <div className="text-xs text-slate-500 mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}
