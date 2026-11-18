import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  AlertTriangle, 
  Flame, 
  Sparkles, 
  X, 
  CalendarDays, 
  CalendarRange, 
  ListOrdered, 
  ListFilter,
  ArrowRight,
  Sun,
  LayoutGrid,
  Filter,
  RotateCcw,
  Zap
} from 'lucide-react';
import { Task, Priority } from '../lib/types';
import { TasksView, TaskModal, normalizeTaskStatus, getLocalDateString, isTaskForToday, isTaskOverdue } from './TasksView';
import { SpatialTaskCard } from './spatial/functional/SpatialTaskCard';
import { SpatialTimelineBlock } from './spatial/functional/SpatialTimelineBlock';
import { triggerDelightCelebration } from '../lib/celebrationEngine';
import { soundEngine } from '../lib/soundEngine';
import { retentionEngine } from '../lib/retentionEngine';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export interface ScheduleAndTasksViewProps {
  initialTab?: 'today' | 'calendar' | 'tasks';
  initialCalendarMode?: 'day' | 'week' | 'month';
}

const HOURS_TIMELINE = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

const WEEK_HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00'
];

const QUICK_SLOT_PRESETS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

// Helper: Parse YYYY-MM-DD to local Date
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date();
}

// Helper: Format date to YYYY-MM-DD
function formatDateToStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get task time slot
function getTaskTime(task: any): string | null {
  if (task.timeSlot && typeof task.timeSlot === 'string') {
    return task.timeSlot.slice(0, 5);
  }
  if (task.startDate && typeof task.startDate === 'string') {
    if (/^\d{2}:\d{2}$/.test(task.startDate)) {
      return task.startDate;
    }
    if (task.startDate.includes('T')) {
      return task.startDate.split('T')[1].slice(0, 5);
    }
  }
  return null;
}

// Helper: Priority color classes
function getPriorityColor(priority?: string) {
  const p = String(priority || '').toLowerCase();
  if (p === 'khẩn cấp' || p === 'nghiêm trọng' || p === 'critical' || p === 'urgent') {
    return {
      border: 'border-l-rose-500',
      badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
      dot: 'bg-rose-500'
    };
  }
  if (p === 'cao' || p === 'high') {
    return {
      border: 'border-l-amber-500',
      badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
      dot: 'bg-amber-500'
    };
  }
  if (p === 'thấp' || p === 'low') {
    return {
      border: 'border-l-slate-400',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-400'
    };
  }
  return {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    dot: 'bg-emerald-500'
  };
}

// Natural language quick task parser
function parseQuickTaskInput(input: string, defaultDate: string) {
  let title = input.trim();
  let timeSlot: string | null = null;
  let priority: Priority = 'Medium';
  const tags: string[] = [];

  // 1. Detect tags (#work, #thethao, etc.)
  const tagMatches = title.match(/#([\p{L}\w-]+)/gu);
  if (tagMatches) {
    tagMatches.forEach(t => tags.push(t.replace('#', '')));
    title = title.replace(/#([\p{L}\w-]+)/gu, '').trim();
  }

  // 2. Detect priority (!cao, !high, !gap, !urgent, !thap, !low)
  if (/!(cao|high|gap|urgent|khẩn)/i.test(title)) {
    priority = 'High';
    title = title.replace(/!(cao|high|gap|urgent|khẩn)/gi, '').trim();
  } else if (/!(thap|low)/i.test(title)) {
    priority = 'Low';
    title = title.replace(/!(thap|low)/gi, '').trim();
  }

  // 3. Detect time (@14:00, 14:00, 14h00, 9h30, 9h)
  const timeRegex = /(?:@|at\s+)?\b([01]?\d|2[0-3])(?::|h)(\d{2})?\b/i;
  const timeMatch = title.match(timeRegex);
  if (timeMatch) {
    const rawHour = parseInt(timeMatch[1], 10);
    const rawMin = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (rawHour >= 0 && rawHour <= 23 && rawMin >= 0 && rawMin <= 59) {
      timeSlot = `${String(rawHour).padStart(2, '0')}:${String(rawMin).padStart(2, '0')}`;
      title = title.replace(timeRegex, '').trim();
    }
  }

  return {
    title: title || input.trim(),
    timeSlot,
    startDate: timeSlot,
    dueDate: defaultDate,
    priority,
    tags,
    status: 'Chưa làm' as const
  };
}

export function ScheduleAndTasksView({ 
  initialTab = 'today', 
  initialCalendarMode = 'week' 
}: ScheduleAndTasksViewProps) {
  const { tasks = [], addTask, updateTask, deleteTask, projects = [], goals = [], language } = useAppStore();
  const isVi = language === 'vi';
  const t = useTranslation(language);

  // Main navigation tab: 'today' | 'calendar' | 'tasks' with F5 Reload Persistence
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'tasks'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_schedule_active_tab') as any;
        if (saved && ['today', 'calendar', 'tasks'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return initialTab;
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_schedule_active_tab', activeTab);
    } catch {}
  }, [activeTab]);
  
  // Calendar sub-mode: 'day' | 'week' | 'month' with F5 Persistence
  const [calendarMode, setCalendarMode] = useState<'day' | 'week' | 'month'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_schedule_calendar_mode') as any;
        if (saved && ['day', 'week', 'month'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return initialCalendarMode;
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_schedule_calendar_mode', calendarMode);
    } catch {}
  }, [calendarMode]);

  // Timezone-safe local today
  const localToday = useMemo(() => getLocalDateString(new Date()), []);
  const utcToday = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Selected date for calendar navigation
  const [selectedDate, setSelectedDate] = useState<string>(localToday);

  // Today view sub-filters: 'all' | 'todo' | 'in_progress' | 'done' with F5 Persistence
  const [todayFilter, setTodayFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_schedule_today_filter') as any;
        if (saved && ['all', 'todo', 'in_progress', 'done'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'all';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_schedule_today_filter', todayFilter);
    } catch {}
  }, [todayFilter]);

  // Shared Task Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string>('');
  const [modalInitialTime, setModalInitialTime] = useState<string>('');

  // Quick In-line Add Input State
  const [quickInputText, setQuickInputText] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Quick Slot Assignment Modal State (for unscheduled tasks)
  const [quickSlotTask, setQuickSlotTask] = useState<Task | null>(null);
  const quickSlotMouseDownRef = useRef<EventTarget | null>(null);
  useBodyScrollLock(Boolean(quickSlotTask));

  useEffect(() => {
    if (!quickSlotTask) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setQuickSlotTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSlotTask]);

  // Floating Undo Toast State
  const [undoToast, setUndoToast] = useState<{
    type: 'delete' | 'status';
    task: Task;
    previousStatus?: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  const handleUndo = async () => {
    if (!undoToast) return;
    try {
      if (undoToast.type === 'delete') {
        await addTask(undoToast.task);
        soundEngine.playPop();
      } else if (undoToast.type === 'status' && undoToast.previousStatus) {
        await updateTask(undoToast.task.id, { status: undoToast.previousStatus });
        soundEngine.playPop();
      }
    } catch (err) {
      console.error('Failed to undo action:', err);
    } finally {
      setUndoToast(null);
    }
  };

  // Live indicator: current time in minutes from 00:00
  const [nowMinute, setNowMinute] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setNowMinute(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Jump to today cleanly without UTC timezone skew
  const handleJumpToToday = () => {
    const realToday = getLocalDateString(new Date());
    setSelectedDate(realToday);
    soundEngine.playPop();
  };

  // Open task modal for new task with optional pre-filled date & time
  const handleOpenCreateModal = (dateStr?: string, timeStr?: string) => {
    setEditingTask(null);
    setModalInitialDate(dateStr || (activeTab === 'today' ? localToday : selectedDate));
    setModalInitialTime(timeStr || '');
    setModalOpen(true);
  };

  // Open task modal for editing
  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setModalInitialDate(task.dueDate || '');
    setModalInitialTime(getTaskTime(task) || '');
    setModalOpen(true);
  };

  // Quick toggle task completion status with Undo toast
  const handleToggleTaskStatus = async (task: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const current = normalizeTaskStatus(task.status);
    const nextStatus = current === 'Hoàn thành' ? 'Chưa làm' : 'Hoàn thành';
    soundEngine.playPop();
    await updateTask(task.id, { status: nextStatus });
    
    if (nextStatus === 'Hoàn thành') {
      try {
        triggerDelightCelebration(e?.clientX, e?.clientY);
        retentionEngine.addXp(20, `Hoàn thành việc: ${task.title}`);
      } catch (e) {
        console.warn('XP add failed gracefully:', e);
      }
      window.dispatchEvent(new CustomEvent('lifeos:task-completed', { detail: { taskId: task.id, title: task.title } }));
      setUndoToast({
        type: 'status',
        task,
        previousStatus: task.status,
        message: isVi ? `Đã hoàn thành "${task.title}"` : `Completed "${task.title}"`
      });
    }
  };

  // Quick reschedule task to today
  const handleRescheduleToToday = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundEngine.playPop();
    await updateTask(taskId, { dueDate: localToday });
  };

  // Delete task with 5s Undo
  const handleDeleteTaskWithUndo = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = (tasks || []).find(t => t.id === taskId);
    if (!target) return;
    soundEngine.playPop();
    await deleteTask(taskId);
    setUndoToast({
      type: 'delete',
      task: target,
      message: isVi ? `Đã xóa "${target.title}"` : `Deleted "${target.title}"`
    });
  };

  // Quick inline add submit handler
  const handleQuickCreateTodayTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickInputText.trim();
    if (!trimmed || isSubmittingQuick) return;

    try {
      setIsSubmittingQuick(true);
      const parsed = parseQuickTaskInput(trimmed, localToday);
      await addTask(parsed);
      soundEngine.playPop();
      setQuickInputText('');
    } catch (err) {
      console.error('Failed to quick add task:', err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // -------------------------------------------------------------
  // Data Filtering for "Hôm nay" Mode
  // -------------------------------------------------------------
  const todayTasks = useMemo(() => {
    return (tasks || []).filter(t => isTaskForToday(t, localToday, utcToday));
  }, [tasks, localToday, utcToday]);

  const overdueTasks = useMemo(() => {
    return (tasks || []).filter(t => isTaskOverdue(t, localToday, utcToday));
  }, [tasks, localToday, utcToday]);

  const todayCompletedCount = useMemo(() => {
    return todayTasks.filter(t => normalizeTaskStatus(t.status) === 'Hoàn thành').length;
  }, [todayTasks]);

  const todayProgressPercent = useMemo(() => {
    if (todayTasks.length === 0) return 0;
    return Math.round((todayCompletedCount / todayTasks.length) * 100);
  }, [todayTasks, todayCompletedCount]);

  // Tasks for today with specific time slot
  const todayScheduledTasks = useMemo(() => {
    return todayTasks.filter(t => getTaskTime(t) !== null);
  }, [todayTasks]);

  // Tasks for today WITHOUT specific time slot (Unscheduled tray)
  const todayUnscheduledTasks = useMemo(() => {
    return todayTasks.filter(t => getTaskTime(t) === null);
  }, [todayTasks]);

  // Filtered today unscheduled tasks by status pill
  const filteredTodayUnscheduled = useMemo(() => {
    if (todayFilter === 'todo') {
      return todayUnscheduledTasks.filter(t => normalizeTaskStatus(t.status) === 'Chưa làm');
    }
    if (todayFilter === 'in_progress') {
      return todayUnscheduledTasks.filter(t => normalizeTaskStatus(t.status) === 'Đang làm');
    }
    if (todayFilter === 'done') {
      return todayUnscheduledTasks.filter(t => normalizeTaskStatus(t.status) === 'Hoàn thành');
    }
    return todayUnscheduledTasks;
  }, [todayUnscheduledTasks, todayFilter]);

  // -------------------------------------------------------------
  // Calendar Navigation Helpers
  // -------------------------------------------------------------
  const handlePrevDate = () => {
    const cur = parseLocalDate(selectedDate);
    if (calendarMode === 'day') {
      cur.setDate(cur.getDate() - 1);
    } else if (calendarMode === 'week') {
      cur.setDate(cur.getDate() - 7);
    } else {
      cur.setMonth(cur.getMonth() - 1);
    }
    setSelectedDate(formatDateToStr(cur));
  };

  const handleNextDate = () => {
    const cur = parseLocalDate(selectedDate);
    if (calendarMode === 'day') {
      cur.setDate(cur.getDate() + 1);
    } else if (calendarMode === 'week') {
      cur.setDate(cur.getDate() + 7);
    } else {
      cur.setMonth(cur.getMonth() + 1);
    }
    setSelectedDate(formatDateToStr(cur));
  };

  // Week days calculation (Monday to Sunday)
  const weekDays = useMemo(() => {
    const cur = parseLocalDate(selectedDate);
    const dayOfWeek = cur.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(cur);
    monday.setDate(cur.getDate() + distanceToMonday);

    const days: Array<{ dateStr: string; dateObj: Date; dayName: string; isToday: boolean }> = [];
    const dayNamesVi = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const dayNamesEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = formatDateToStr(d);
      days.push({
        dateStr: str,
        dateObj: d,
        dayName: isVi ? dayNamesVi[i] : dayNamesEn[i],
        isToday: str === localToday
      });
    }
    return days;
  }, [selectedDate, localToday, isVi]);

  // Month grid calculation (42 cells: 6 weeks x 7 days)
  const monthGridDays = useMemo(() => {
    const cur = parseLocalDate(selectedDate);
    const year = cur.getFullYear();
    const month = cur.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based index (0 = Monday, 6 = Sunday)
    const firstDayIndex = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      tasks: any[];
    }> = [];

    // Leading days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const str = formatDateToStr(d);
      days.push({
        dateStr: str,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: str === localToday,
        tasks: (tasks || []).filter(t => t.dueDate === str)
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(year, month, d);
      const str = formatDateToStr(dt);
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: str === localToday,
        tasks: (tasks || []).filter(t => t.dueDate === str)
      });
    }

    // Trailing days from next month
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(year, month + 1, d);
      const str = formatDateToStr(dt);
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: str === localToday,
        tasks: (tasks || []).filter(t => t.dueDate === str)
      });
    }

    return days;
  }, [selectedDate, tasks, localToday]);

  // Calendar Period Title Header string
  const calendarPeriodTitle = useMemo(() => {
    const cur = parseLocalDate(selectedDate);
    if (calendarMode === 'day') {
      const weekday = cur.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { weekday: 'long' });
      const day = cur.getDate();
      const month = cur.getMonth() + 1;
      const year = cur.getFullYear();
      return `${weekday}, ${day}/${month}/${year}`;
    }
    if (calendarMode === 'week') {
      if (weekDays.length >= 7) {
        const start = weekDays[0].dateObj;
        const end = weekDays[6].dateObj;
        return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
      }
      return selectedDate;
    }
    return cur.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' });
  }, [selectedDate, calendarMode, weekDays, isVi]);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* ========================================================= */}
      {/* UNIFIED HEADER BAR                                        */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs shrink-0 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CalendarDays className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {isVi ? 'Lịch & Công việc' : 'Schedule & Tasks'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi ? 'Quản lý công việc và thời gian biểu thống nhất, kéo thả 2 chiều trực quan.' : 'Unified task management and two-way synced time schedule.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Main Mode Segmented Control: Hôm nay | Lịch | Công việc */}
          <div className="flex bg-[#F1F5F9] dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shrink-0 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('today');
                soundEngine.playPop();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>{isVi ? 'Hôm nay' : 'Today'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('calendar');
                soundEngine.playPop();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>{isVi ? 'Lịch' : 'Calendar'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('tasks');
                soundEngine.playPop();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isVi ? 'Công việc' : 'Tasks'}</span>
            </button>
          </div>

          {/* Unified "Hôm nay" Jump Button */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700/50 active:scale-95"
            title={isVi ? 'Quay về ngày hôm nay' : 'Go to today'}
          >
            <span>{isVi ? 'Hôm nay' : 'Today'}</span>
          </button>

          {/* "+ Thêm công việc" Global Modal Button */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="flex items-center justify-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isVi ? 'Thêm công việc' : 'Add Task'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: HÔM NAY (TODAY)                                   */}
      {/* ========================================================= */}
      {activeTab === 'today' && (
        <div className="space-y-5">
          {/* Bento Summary Bar - Interactive Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Progress & Done */}
            <div 
              onClick={() => {
                setTodayFilter(todayFilter === 'done' ? 'all' : 'done');
                soundEngine.playPop();
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
                todayFilter === 'done'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isVi ? 'Tiến độ hoàn thành' : 'Progress'}</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{todayProgressPercent}%</span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {todayCompletedCount}/{todayTasks.length}
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${todayProgressPercent}%` }}
                />
              </div>
            </div>

            {/* 2. In progress */}
            <div 
              onClick={() => {
                setTodayFilter(todayFilter === 'in_progress' ? 'all' : 'in_progress');
                soundEngine.playPop();
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
                todayFilter === 'in_progress'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isVi ? 'Đang thực hiện' : 'In Progress'}</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
                {todayTasks.filter(t => normalizeTaskStatus(t.status) === 'Đang làm').length}
              </div>
              <span className="text-[11px] text-slate-400 mt-1">{isVi ? 'Chạm để lọc nhanh' : 'Tap to filter'}</span>
            </div>

            {/* 3. Unscheduled Count */}
            <div 
              onClick={() => {
                setTodayFilter('all');
                soundEngine.playPop();
              }}
              className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-slate-700 shadow-xs flex flex-col justify-between cursor-pointer transition-all"
            >
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isVi ? 'Chưa xếp khung giờ' : 'Unscheduled'}</span>
              <div className="text-2xl font-black text-amber-500 mt-2">
                {todayUnscheduledTasks.length}
              </div>
              <span className="text-[11px] text-slate-400 mt-1">{isVi ? 'Xếp giờ hoặc kéo thả' : 'Tap slot or drag'}</span>
            </div>

            {/* 4. Overdue Alert */}
            <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
              overdueTasks.length > 0
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/60'
                : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${overdueTasks.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isVi ? 'Quá hạn chót' : 'Overdue'}
                </span>
                {overdueTasks.length > 0 && <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />}
              </div>
              <div className={`text-2xl font-black mt-2 ${overdueTasks.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {overdueTasks.length}
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                {overdueTasks.length > 0 ? (isVi ? 'Cần xử lý hoặc dời lịch' : 'Needs attention') : (isVi ? 'Không có việc trễ hạn' : 'All on track')}
              </span>
            </div>
          </div>

          {/* Today View 2-Column Layout */}
          <div className="flex flex-col lg:flex-row gap-5 min-h-[580px]">
            {/* LEFT COLUMN: Overdue Alert & Unscheduled Tasks Tray */}
            <div className="lg:w-84 xl:w-96 flex flex-col gap-4 shrink-0">
              {/* Overdue Card if any */}
              {overdueTasks.length > 0 && (
                <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-rose-200/60 dark:border-rose-900/40">
                    <h3 className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Công việc quá hạn' : 'Overdue Tasks'} ({overdueTasks.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {overdueTasks.map(task => (
                      <div 
                        key={task.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 flex items-start justify-between gap-2 text-xs shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-slate-900 dark:text-white truncate">{task.title}</h4>
                          <span className="text-[10px] text-rose-500 font-medium">{isVi ? 'Hạn:' : 'Due:'} {task.dueDate}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleRescheduleToToday(task.id, e)}
                            className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] transition-colors cursor-pointer"
                            title={isVi ? 'Dời sang hôm nay' : 'Reschedule to today'}
                          >
                            {isVi ? 'Dời hôm nay' : 'Today'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleToggleTaskStatus(task, e)}
                            className="p-1 rounded-lg border border-slate-300 hover:border-emerald-500 hover:text-emerald-500 transition-colors cursor-pointer"
                            title={isVi ? 'Đánh dấu hoàn thành' : 'Mark done'}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unscheduled Tasks Card (Công việc chưa có giờ cụ thể) */}
              <div className="bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-xs flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isVi ? 'Chưa có giờ cụ thể' : 'Unscheduled Tasks'} ({todayUnscheduledTasks.length})</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isVi ? 'Kéo thả vào timeline hoặc bấm biểu tượng giờ để gán nhanh' : 'Drag into timeline or tap clock to set hour'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(localToday)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isVi ? 'Thêm công việc' : 'Add task'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Ultra-Fast Quick Task Input */}
                <form onSubmit={handleQuickCreateTodayTask} className="relative flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={quickInputText}
                      onChange={(e) => setQuickInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickCreateTodayTask(e);
                        }
                      }}
                      placeholder={isVi ? "Thêm việc hôm nay... (vd: Họp 14:00 !cao #work)" : "Quick add task... (e.g. Meeting 14:00 !high)"}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pr-7"
                    />
                    {quickInputText && (
                      <button
                        type="button"
                        onClick={() => setQuickInputText('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    id="btn-quick-add-today"
                    type="submit"
                    disabled={!quickInputText.trim() || isSubmittingQuick}
                    className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1 shadow-xs"
                    title={isVi ? "Lưu nhanh [Enter]" : "Quick add [Enter]"}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">{isVi ? 'Thêm' : 'Add'}</span>
                  </button>
                </form>

                {/* Sub-filter tabs inside Unscheduled Tray */}
                <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setTodayFilter('all');
                      soundEngine.playPop();
                    }}
                    className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                      todayFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isVi ? 'Tất cả' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTodayFilter('todo');
                      soundEngine.playPop();
                    }}
                    className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                      todayFilter === 'todo'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isVi ? 'Chưa làm' : 'To Do'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTodayFilter('in_progress');
                      soundEngine.playPop();
                    }}
                    className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                      todayFilter === 'in_progress'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isVi ? 'Đang làm' : 'Doing'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTodayFilter('done');
                      soundEngine.playPop();
                    }}
                    className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                      todayFilter === 'done'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isVi ? 'Xong' : 'Done'}
                  </button>
                </div>

                {/* Unscheduled Tasks List */}
                <div className="space-y-2 overflow-y-auto flex-1 max-h-[460px] pr-1">
                  {filteredTodayUnscheduled.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-medium">
                      {isVi ? '🎉 Không có công việc nào trong danh mục này' : 'No unscheduled tasks in this category'}
                    </div>
                  ) : (
                    filteredTodayUnscheduled.map(task => (
                      <div key={task.id} className="relative group/unscheduled">
                        <SpatialTaskCard
                          task={task}
                          onToggleStatus={handleToggleTaskStatus}
                          onClick={handleOpenEditModal}
                          onDelete={(id, e) => handleDeleteTaskWithUndo(id, e)}
                        />
                        {/* Quick Slot Button on mobile/desktop */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.playPop();
                            setQuickSlotTask(task);
                          }}
                          className="absolute right-9 top-3.5 z-20 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/20 transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/unscheduled:opacity-100"
                          title={isVi ? 'Xếp khung giờ nhanh' : 'Set time slot'}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{isVi ? 'Xếp giờ' : 'Slot'}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Hourly Timeline */}
            <div className="flex-1 bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CalendarIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {isVi ? 'Dòng thời gian hôm nay (Timeline 24h)' : "Today's Timeline"}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {isVi ? 'Thả việc vào khung giờ hoặc nhấp vào giờ trống để tạo' : 'Drop tasks or click empty slot to schedule'}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  {localToday}
                </span>
              </div>

              {/* Timeline Grid */}
              <div className="flex-1 overflow-y-auto max-h-[640px] space-y-2.5 pr-1 relative">
                {HOURS_TIMELINE.map(hour => {
                  const hourNum = parseInt(hour.split(':')[0], 10);
                  const isCurrentHour = Math.floor(nowMinute / 60) === hourNum;
                  const slotTasks = todayScheduledTasks.filter(t => {
                    const time = getTaskTime(t);
                    return time && time.startsWith(hour.slice(0, 2));
                  });

                  return (
                    <SpatialTimelineBlock
                      key={hour}
                      hour={hour}
                      isCurrentHour={isCurrentHour}
                      tasks={slotTasks}
                      onDropTask={async (taskId, targetHour) => {
                        await updateTask(taskId, {
                          timeSlot: targetHour,
                          startDate: targetHour,
                          dueDate: localToday
                        });
                        soundEngine.playPop();
                      }}
                      onSlotClick={(targetHour) => handleOpenCreateModal(localToday, targetHour)}
                      onTaskClick={handleOpenEditModal}
                      onToggleStatus={handleToggleTaskStatus}
                      onRemoveFromSlot={async (taskId, e) => {
                        e.stopPropagation();
                        soundEngine.playPop();
                        await updateTask(taskId, { timeSlot: null, startDate: null });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: LỊCH (CALENDAR)                                   */}
      {/* ========================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Sub-toolbar: Sub-mode Selector (Ngày | Tuần | Tháng) + Date Navigator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#141E30] p-3 sm:p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs">
            {/* View Mode Buttons */}
            <div className="flex bg-[#F1F5F9] dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shrink-0 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setCalendarMode('day');
                  soundEngine.playPop();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  calendarMode === 'day'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVi ? 'Ngày' : 'Day'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalendarMode('week');
                  soundEngine.playPop();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  calendarMode === 'week'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVi ? 'Tuần' : 'Week'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalendarMode('month');
                  soundEngine.playPop();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  calendarMode === 'month'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVi ? 'Tháng' : 'Month'}
              </button>
            </div>

            {/* Date Navigator: < | [Period Title] | > */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevDate}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white px-2">
                {calendarPeriodTitle}
              </span>

              <button
                type="button"
                onClick={handleNextDate}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* 2.1 CALENDAR: DAY VIEW                                  */}
          {/* ------------------------------------------------------- */}
          {calendarMode === 'day' && (
            <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] p-4 sm:p-6 shadow-xs space-y-4">
              {/* All-Day / Unscheduled on this day */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    {isVi ? 'Cả ngày / Chưa có giờ cụ thể:' : 'All-day / Unscheduled:'}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(tasks || []).filter(t => t.dueDate === selectedDate && !getTaskTime(t)).map(t => {
                      const isDone = normalizeTaskStatus(t.status) === 'Hoàn thành';
                      return (
                        <span 
                          key={t.id}
                          onClick={() => handleOpenEditModal(t)}
                          className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer ${
                            isDone ? 'bg-slate-200/70 text-slate-500 line-through' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                          }`}
                        >
                          {t.title}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(selectedDate)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Thêm việc trong ngày' : 'Add task for day'}</span>
                </button>
              </div>

              {/* 24-hour Day Timeline */}
              <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {HOURS_TIMELINE.map(hour => {
                  const hourTasks = (tasks || []).filter(t => {
                    if (t.dueDate !== selectedDate) return false;
                    const time = getTaskTime(t);
                    return time && time.startsWith(hour.slice(0, 2));
                  });

                  return (
                    <div 
                      key={hour}
                      onClick={() => handleOpenCreateModal(selectedDate, hour)}
                      className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-850/40 transition-colors cursor-pointer"
                    >
                      <span className="w-14 text-xs font-mono font-bold text-slate-400 pt-1 shrink-0 select-none">
                        {hour}
                      </span>
                      <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[36px]">
                        {hourTasks.map(t => {
                          const isDone = normalizeTaskStatus(t.status) === 'Hoàn thành';
                          const pCol = getPriorityColor(t.priority);
                          return (
                            <div
                              key={t.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(t);
                              }}
                              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 cursor-pointer border-l-[3.5px] ${pCol.border} ${
                                isDone 
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through' 
                                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(e) => handleToggleTaskStatus(t, e)}
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer ${
                                  isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-400'
                                }`}
                              >
                                {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>
                              <span className="text-xs font-semibold">{t.title}</span>
                            </div>
                          );
                        })}
                        {hourTasks.length === 0 && (
                          <span className="text-[11px] text-slate-300 dark:text-slate-600 italic select-none">
                            {isVi ? 'Nhấp để tạo việc vào giờ này' : 'Click to add task'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* 2.2 CALENDAR: WEEK VIEW                                 */}
          {/* ------------------------------------------------------- */}
          {calendarMode === 'week' && (
            <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] p-3 sm:p-5 shadow-xs overflow-x-auto">
              <div className="min-w-[700px]">
                {/* 7-Day Header */}
                <div className="grid grid-cols-7 gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  {weekDays.map(day => (
                    <div 
                      key={day.dateStr}
                      onClick={() => {
                        setSelectedDate(day.dateStr);
                        setCalendarMode('day');
                        soundEngine.playPop();
                      }}
                      className={`p-2.5 rounded-xl text-center transition-all cursor-pointer ${
                        day.isToday
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-[11px] block uppercase tracking-wider">{day.dayName}</span>
                      <span className="text-base font-black">{day.dateObj.getDate()}</span>
                    </div>
                  ))}
                </div>

                {/* All-Day Rows for the 7 days */}
                <div className="grid grid-cols-7 gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  {weekDays.map(day => {
                    const unscheduledDayTasks = (tasks || []).filter(t => t.dueDate === day.dateStr && !getTaskTime(t));
                    return (
                      <div 
                        key={`allday-${day.dateStr}`}
                        onClick={() => handleOpenCreateModal(day.dateStr)}
                        className="min-h-[50px] p-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 transition-colors cursor-pointer space-y-1"
                      >
                        <span className="text-[9px] font-bold uppercase text-slate-400 block px-1">
                          {isVi ? 'Cả ngày' : 'All-day'}
                        </span>
                        {unscheduledDayTasks.slice(0, 2).map(t => {
                          const isDone = normalizeTaskStatus(t.status) === 'Hoàn thành';
                          return (
                            <div
                              key={t.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(t);
                              }}
                              className={`p-1 rounded text-[10px] font-semibold truncate border ${
                                isDone 
                                  ? 'bg-slate-200 text-slate-400 line-through' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {t.title}
                            </div>
                          );
                        })}
                        {unscheduledDayTasks.length > 2 && (
                          <span className="text-[9px] text-slate-400 px-1 font-bold">
                            +{unscheduledDayTasks.length - 2} {isVi ? 'khác' : 'more'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Hourly Rows for 7 days */}
                <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
                  {WEEK_HOURS.map(hour => (
                    <div key={hour} className="grid grid-cols-7 gap-2 items-stretch min-h-[54px]">
                      {weekDays.map(day => {
                        const cellTasks = (tasks || []).filter(t => {
                          if (t.dueDate !== day.dateStr) return false;
                          const time = getTaskTime(t);
                          return time && time.startsWith(hour.slice(0, 2));
                        });

                        return (
                          <div
                            key={`${day.dateStr}-${hour}`}
                            onClick={() => handleOpenCreateModal(day.dateStr, hour)}
                            className="p-1 rounded-xl border border-slate-100 dark:border-slate-800/70 bg-slate-50/30 dark:bg-slate-850/30 hover:border-emerald-500/40 hover:bg-emerald-50/10 transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <span className="text-[9px] font-mono text-slate-400 select-none">
                              {hour}
                            </span>

                            <div className="space-y-1">
                              {cellTasks.map(t => {
                                const isDone = normalizeTaskStatus(t.status) === 'Hoàn thành';
                                const pCol = getPriorityColor(t.priority);

                                return (
                                  <div
                                    key={t.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(t);
                                    }}
                                    className={`p-1 rounded-lg text-[10px] font-semibold border border-l-2 ${pCol.border} flex items-center justify-between gap-1 shadow-2xs ${
                                      isDone 
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through' 
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                                    }`}
                                  >
                                    <span className="truncate flex-1">{t.title}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleTaskStatus(t, e)}
                                      className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                        isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-400'
                                      }`}
                                    >
                                      {isDone && <Check className="w-2 h-2 stroke-[3]" />}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* 2.3 CALENDAR: MONTH VIEW                                */}
          {/* ------------------------------------------------------- */}
          {calendarMode === 'month' && (
            <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] p-3 sm:p-5 shadow-xs">
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase py-1">
                <span>{isVi ? 'T2' : 'Mon'}</span>
                <span>{isVi ? 'T3' : 'Tue'}</span>
                <span>{isVi ? 'T4' : 'Wed'}</span>
                <span>{isVi ? 'T5' : 'Thu'}</span>
                <span>{isVi ? 'T6' : 'Fri'}</span>
                <span>{isVi ? 'T7' : 'Sat'}</span>
                <span>{isVi ? 'CN' : 'Sun'}</span>
              </div>

              {/* 42 Month Grid Cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {monthGridDays.map((cell, idx) => (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => handleOpenCreateModal(cell.dateStr)}
                    className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      cell.isToday
                        ? 'border-emerald-500/80 bg-emerald-50/15 dark:bg-emerald-950/20 ring-1 ring-emerald-500/40'
                        : cell.isCurrentMonth
                        ? 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/30 hover:border-slate-300 dark:hover:border-slate-700'
                        : 'border-slate-100 dark:border-slate-900 bg-slate-50/10 dark:bg-slate-900/40 opacity-40 hover:opacity-80'
                    }`}
                  >
                    {/* Top Row: Date Number + Drill-down + Quick Add */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(cell.dateStr);
                          setCalendarMode('day');
                          soundEngine.playPop();
                        }}
                        className={`text-xs font-bold px-1 rounded transition-colors cursor-pointer ${
                          cell.isToday 
                            ? 'w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black' 
                            : 'text-slate-700 dark:text-slate-300 hover:text-emerald-500 hover:underline'
                        }`}
                        title={isVi ? 'Xem chi tiết ngày này' : 'View day schedule'}
                      >
                        {cell.dayNumber}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCreateModal(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-emerald-500 transition-opacity cursor-pointer"
                        title={isVi ? 'Thêm việc ngày này' : 'Add task'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Task Chips inside cell */}
                    <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                      {cell.tasks.slice(0, 3).map(task => {
                        const isDone = normalizeTaskStatus(task.status) === 'Hoàn thành';
                        const pCol = getPriorityColor(task.priority);

                        return (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(task);
                            }}
                            className={`p-1 rounded-md text-[10px] font-semibold truncate border border-l-2 ${pCol.border} flex items-center gap-1 ${
                              isDone
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-emerald-500/50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pCol.dot}`} />
                            <span className="truncate">{task.title}</span>
                          </div>
                        );
                      })}
                      {cell.tasks.length > 3 && (
                        <span className="text-[9px] font-bold text-slate-400 px-1 block">
                          +{cell.tasks.length - 3} {isVi ? 'việc khác' : 'more'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: CÔNG VIỆC (TASKS LIST & KANBAN)                    */}
      {/* ========================================================= */}
      {activeTab === 'tasks' && (
        <TasksView />
      )}

      {/* ========================================================= */}
      {/* UNIFIED TASK MODAL                                        */}
      {/* ========================================================= */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          initialDate={modalInitialDate}
          initialTimeSlot={modalInitialTime}
          onClose={() => setModalOpen(false)}
          onSave={async (taskData: any) => {
            if (editingTask) {
              await updateTask(editingTask.id, taskData);
            } else {
              await addTask(taskData);
            }
            soundEngine.playPop();
            setModalOpen(false);
          }}
          onDelete={async (id: string) => {
            const target = (tasks || []).find(t => t.id === id);
            await deleteTask(id);
            soundEngine.playPop();
            setModalOpen(false);
            if (target) {
              setUndoToast({
                type: 'delete',
                task: target,
                message: isVi ? `Đã xóa "${target.title}"` : `Deleted "${target.title}"`
              });
            }
          }}
          projects={projects}
          goals={goals}
        />
      )}

      {/* ========================================================= */}
      {/* QUICK TIME SLOT SELECTOR BOTTOM SHEET / MODAL             */}
      {/* ========================================================= */}
      {quickSlotTask && (
        <div 
          onMouseDown={(e) => {
            quickSlotMouseDownRef.current = e.target;
          }}
          onClick={(e) => {
            if (quickSlotMouseDownRef.current === e.currentTarget && e.target === e.currentTarget) {
              setQuickSlotTask(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-backdrop-fade cursor-default"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md p-5 border-t sm:border border-slate-200 dark:border-slate-800 space-y-4 animate-modal-enter"
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>{isVi ? 'Xếp khung giờ cho công việc' : 'Schedule time slot'}</span>
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-[280px] mt-0.5">
                  {quickSlotTask.title}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setQuickSlotTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {QUICK_SLOT_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={async () => {
                    await updateTask(quickSlotTask.id, {
                      timeSlot: preset,
                      startDate: preset,
                      dueDate: localToday
                    });
                    soundEngine.playPop();
                    setQuickSlotTask(null);
                  }}
                  className="py-2 px-1 text-center font-mono text-xs font-bold rounded-xl bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-500 text-slate-800 dark:text-slate-200 transition-all cursor-pointer active:scale-95"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Unassign button if task already had a timeSlot */}
            {getTaskTime(quickSlotTask) && (
              <button
                type="button"
                onClick={async () => {
                  await updateTask(quickSlotTask.id, {
                    timeSlot: null,
                    startDate: null
                  });
                  soundEngine.playPop();
                  setQuickSlotTask(null);
                }}
                className="w-full py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
              >
                {isVi ? 'Gỡ khỏi timeline (Chuyển về chưa có giờ)' : 'Unschedule (Move back to tray)'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5-SECOND FLOATING UNDO NOTIFICATION                       */}
      {/* ========================================================= */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-300 text-xs font-semibold backdrop-blur-md animate-slide-up">
          <span className="truncate max-w-[200px] sm:max-w-[280px]">{undoToast.message}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Hoàn tác' : 'Undo'}</span>
          </button>
          <button
            type="button"
            onClick={() => setUndoToast(null)}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 transition-opacity cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ScheduleAndTasksView;
