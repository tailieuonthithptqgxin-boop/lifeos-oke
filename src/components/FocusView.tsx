import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../lib/store';
import { 
  Play, Square, Pause, RotateCcw, 
  Target, Zap, Clock, ShieldAlert, CheckCircle2,
  ListTodo, FolderKanban, Briefcase, FileText,
  Maximize2, Minimize2, Sparkles, Volume2, Music
} from 'lucide-react';
import { FocusSession, FocusMode, FocusStatus, Task, Project } from '../lib/types';
import { YouTubeFocusPlayer } from './YouTubeFocusPlayer';
import { FocusVolumeControl } from './focus/FocusVolumeControl';
import { CompanionMood } from '../lib/companionEngine';
import { companionEventBus } from '../lib/companion/companionEventBus';
import { retentionEngine } from '../lib/retentionEngine';
import { analytics } from '../lib/analytics';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';
import { webNotification } from '../lib/webNotification';
import { WeeklyLeaderboardModal } from './dashboard/WeeklyLeaderboardModal';
import { ShareStoryModal } from './ShareStoryModal';

export function FocusView() {
  const { 
    focusSessions, focusGoals, tasks, projects, 
    addFocusSession, updateFocusSession, updateTask,
    dailyCapacity, currentUser, language, theme
  } = useAppStore();
  const isVi = language === 'vi';

  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionStartTsRef = useRef<number | null>(null);
  const accumulatedSecsRef = useRef<number>(0);
  
  const [selectedMode, setSelectedMode] = useState<FocusMode>('Pomodoro');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isZenMode, setIsZenMode] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShareStory, setShowShareStory] = useState(false);

  // True Fullscreen & Zen Mode API handlers
  const toggleZenMode = async () => {
    const nextZen = !isZenMode;
    setIsZenMode(nextZen);
    try {
      if (nextZen) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Ignore user gesture limitations if triggered without direct interaction
    }
  };

  // Synchronize Zen Mode with dark class so all UI elements, tooltips and child players render high-contrast dark theme
  useEffect(() => {
    if (isZenMode) {
      document.documentElement.classList.add('dark');
      return () => {
        if (theme !== 'dark') {
          document.documentElement.classList.remove('dark');
        }
      };
    }
  }, [isZenMode, theme]);

  // Handle escape key and browser fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isZenMode) {
        setIsZenMode(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        toggleZenMode();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZenMode]);

  // Companion Dynamic Mood & Dialogue State
  const [companionMood, setCompanionMood] = useState<CompanionMood>('idle');
  const [companionDialogueKey, setCompanionDialogueKey] = useState<any>('greeting');
  
  // Emit events to global companion overlay
  useEffect(() => {
    if (companionMood) {
      companionEventBus.emit({
        type: 'mood_change',
        mood: companionMood,
        category: companionDialogueKey
      });
    }
  }, [companionMood, companionDialogueKey]);
  
  // Note/Reflection state for when finishing
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [reflection, setReflection] = useState('');
  
  // Interruption
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [interruptionReason, setInterruptionReason] = useState('');
  const [interruptionStart, setInterruptionStart] = useState<number>(0);

  // Real dynamic focus streak calculation
  const focusStreak = React.useMemo(() => {
    if (!focusSessions || focusSessions.length === 0) return 0;
    const completedDates = Array.from(new Set(
      focusSessions
        .filter(s => s.status === 'Completed' && (s.createdAt || s.startTime))
        .map(s => (s.createdAt || s.startTime || '').split('T')[0])
    )).filter(Boolean).sort().reverse();

    if (completedDates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];

    const startDate = completedDates.includes(todayStr) 
      ? todayStr 
      : (completedDates.includes(yestStr) ? yestStr : null);

    if (!startDate) return 0;

    let streak = 0;
    const d = new Date(startDate);
    while (true) {
      const dStr = d.toISOString().split('T')[0];
      if (completedDates.includes(dStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [focusSessions]);

  // Timestamp-based drift-resistant timer logic (resilient against tab inactive sleep)
  useEffect(() => {
    let interval: any = null;
    if (activeSession && activeSession.status === 'Running') {
      if (!sessionStartTsRef.current) {
        sessionStartTsRef.current = Date.now();
      }

      interval = setInterval(() => {
        if (sessionStartTsRef.current) {
          const deltaSecs = Math.floor((Date.now() - sessionStartTsRef.current) / 1000);
          setElapsedSeconds(accumulatedSecsRef.current + deltaSecs);
        }
      }, 1000);
    } else {
      if (sessionStartTsRef.current) {
        accumulatedSecsRef.current += Math.floor((Date.now() - sessionStartTsRef.current) / 1000);
        sessionStartTsRef.current = null;
      }
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const getDurationForMode = (mode: FocusMode) => {
    switch (mode) {
      case 'Pomodoro': return 25;
      case 'Quick': return 5;
      case 'Standard': return 50;
      case 'Deep': return 90;
      case 'Custom': return 60;
      default: return 25;
    }
  };

  // Switch focus mode and sync timer duration instantly
  const handleSelectMode = (newMode: FocusMode) => {
    try { soundEngine.playPop(); } catch {}
    setSelectedMode(newMode);
    const newDuration = getDurationForMode(newMode);

    if (activeSession) {
      if (activeSession.status === 'Running') {
        const confirmSwitch = window.confirm(
          isVi 
            ? `Bạn đang trong phiên tập trung. Chuyển sang chế độ ${newMode} (${newDuration} phút) và đặt lại đồng hồ?` 
            : `You have an active session. Switch to ${newMode} (${newDuration} mins) and reset timer?`
        );
        if (!confirmSwitch) return;
        
        try {
          updateFocusSession(activeSession.id, { 
            status: 'Cancelled',
            actualDuration: Math.floor(elapsedSeconds / 60)
          });
        } catch {}
      }
      
      setActiveSession(null);
      setElapsedSeconds(0);
      accumulatedSecsRef.current = 0;
      sessionStartTsRef.current = null;
    } else {
      setElapsedSeconds(0);
      accumulatedSecsRef.current = 0;
      sessionStartTsRef.current = null;
    }
  };

  // Restore active running/paused session on mount if one is already recorded (within 24h)
  useEffect(() => {
    if (!activeSession && focusSessions && focusSessions.length > 0) {
      const ongoing = focusSessions.find(s => s.status === 'Running' || s.status === 'Paused');
      if (ongoing) {
        const sessionDate = ongoing.createdAt || ongoing.startTime;
        const isRecent = sessionDate && (Date.now() - new Date(sessionDate).getTime() < 24 * 60 * 60 * 1000);
        if (isRecent) {
          setActiveSession(ongoing);
          if (ongoing.mode) {
            setSelectedMode(ongoing.mode);
          }
          if (ongoing.status === 'Running') {
            sessionStartTsRef.current = Date.now();
          }
          accumulatedSecsRef.current = (ongoing.actualDuration || 0) * 60;
          setElapsedSeconds(accumulatedSecsRef.current);
        }
      }
    }
  }, [focusSessions]);

  const startFocus = () => {
    const duration = getDurationForMode(selectedMode);
    const sessionId = `foc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSession: FocusSession = {
      id: sessionId,
      title: selectedTaskId ? (tasks || []).find(t => t.id === selectedTaskId)?.title || 'Không tên' : 'Phiên tự do',
      mode: selectedMode,
      status: 'Running',
      plannedDuration: duration,
      actualDuration: 0,
      startTime: new Date().toISOString(),
      taskId: selectedTaskId || null,
      interruptions: [],
      createdAt: new Date().toISOString()
    };
    addFocusSession(newSession);
    setActiveSession(newSession);
    setElapsedSeconds(0);
    accumulatedSecsRef.current = 0;
    sessionStartTsRef.current = Date.now();
    try { soundEngine.playPop(); } catch {}
    analytics.track('first_meaningful_action', { action: 'focus_session_started', mode: selectedMode, plannedMinutes: duration });

    // Companion reaction
    setCompanionMood('focus');
    setCompanionDialogueKey('focusStart');
  };

  const pauseFocus = () => {
    if (!activeSession) return;
    const currentId = activeSession.id || (focusSessions[focusSessions.length - 1]?.id) || `foc_${Date.now()}`;
    
    // Stop drift timestamp
    if (sessionStartTsRef.current) {
      accumulatedSecsRef.current += Math.floor((Date.now() - sessionStartTsRef.current) / 1000);
      sessionStartTsRef.current = null;
    }
    
    try {
      updateFocusSession(currentId, { status: 'Paused' });
    } catch (e) {
      console.warn('Failed to update focus session to Paused:', e);
    }
    
    setActiveSession(prev => prev ? { ...prev, id: currentId, status: 'Paused' } : null);
    setInterruptionStart(Date.now());
    try { soundEngine.playPop(); } catch {}

    // Companion reaction
    setCompanionMood('resting');
    setCompanionDialogueKey('focusPaused');
  };

  const resumeFocus = () => {
    if (!activeSession) return;
    const currentId = activeSession.id || (focusSessions[focusSessions.length - 1]?.id) || `foc_${Date.now()}`;
    const durationSecs = interruptionStart ? Math.floor((Date.now() - interruptionStart) / 1000) : 0;
    
    const newInterruption = interruptionReason ? {
      timestamp: new Date().toISOString(),
      reason: interruptionReason,
      duration: durationSecs
    } : null;
    
    const updatedInterruptions = newInterruption 
      ? [...(activeSession.interruptions || []), newInterruption]
      : (activeSession.interruptions || []);
    
    try {
      updateFocusSession(currentId, { 
        status: 'Running',
        interruptions: updatedInterruptions
      });
    } catch (e) {
      console.warn('Failed to resume focus session:', e);
    }
    
    sessionStartTsRef.current = Date.now();
    setActiveSession(prev => prev ? { 
      ...prev, 
      id: currentId,
      status: 'Running',
      interruptions: updatedInterruptions
    } : null);
    
    setShowInterruptionModal(false);
    setInterruptionReason('');
    try { soundEngine.playPop(); } catch {}

    // Companion reaction
    setCompanionMood('focus');
    setCompanionDialogueKey('focusMaintain');
  };

  const finishFocus = () => {
    if (!activeSession) return;
    const currentId = activeSession.id || (focusSessions[focusSessions.length - 1]?.id) || `foc_${Date.now()}`;
    if (sessionStartTsRef.current) {
      accumulatedSecsRef.current += Math.floor((Date.now() - sessionStartTsRef.current) / 1000);
      sessionStartTsRef.current = null;
    }
    try {
      updateFocusSession(currentId, { status: 'Paused' });
    } catch {}
    setActiveSession(prev => prev ? { ...prev, id: currentId, status: 'Paused' } : null);
    setShowFinishModal(true);
    try { soundEngine.playPop(); } catch {}

    // Companion reaction
    setCompanionMood('celebrate');
    setCompanionDialogueKey('focusCompleted');
  };

  const saveFinishedSession = () => {
    if (!activeSession) return;
    const currentId = activeSession.id || (focusSessions[focusSessions.length - 1]?.id) || `foc_${Date.now()}`;
    const actualMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));
    
    try {
      updateFocusSession(currentId, {
        status: 'Completed',
        actualDuration: actualMinutes,
        endTime: new Date().toISOString(),
        reflection: reflection
      });
    } catch (e) {
      console.warn('Failed to save finished session:', e);
    }

    if (activeSession.taskId) {
      const task = (tasks || []).find(t => t.id === activeSession.taskId);
      if (task) {
        updateTask(task.id, {
          actualHours: (task.actualHours || 0) + Number((actualMinutes / 60).toFixed(2))
        });
      }
    }

    // Award XP & Complete Retention Quest
    try {
      soundEngine.playBell();
      triggerConfetti();
      webNotification.send('🎉 Hoàn thành phiên Tập trung!', {
        body: `Bạn vừa hoàn thành xuất sắc ${actualMinutes} phút ${activeSession.mode}. Hãy nghỉ ngơi một chút nhé!`
      });
      retentionEngine.addXp(35, `Hoàn thành phiên ${activeSession.mode} Focus (${actualMinutes} phút)`);
      retentionEngine.completeQuest('focus');
      analytics.track('focus_session_completed', {
        mode: activeSession.mode,
        actualMinutes,
        plannedMinutes: activeSession.plannedDuration,
        hasTask: Boolean(activeSession.taskId)
      });
    } catch {}

    setActiveSession(null);
    setCompanionMood('achievement');
    setElapsedSeconds(0);
    accumulatedSecsRef.current = 0;
    sessionStartTsRef.current = null;
    setReflection('');
    setShowFinishModal(false);
  };

  const cancelFocus = () => {
    if (!activeSession) return;
    const currentId = activeSession.id || (focusSessions[focusSessions.length - 1]?.id) || `foc_${Date.now()}`;
    const confirmed = window.confirm(
      isVi 
        ? 'Bạn có chắc chắn muốn hủy phiên tập trung này không?' 
        : 'Are you sure you want to cancel this focus session?'
    );
    if (!confirmed) return;

    try {
      updateFocusSession(currentId, {
        status: 'Cancelled',
        actualDuration: Math.floor(elapsedSeconds / 60),
        endTime: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Failed to cancel focus session:', e);
    }

    setActiveSession(null);
    setElapsedSeconds(0);
    accumulatedSecsRef.current = 0;
    sessionStartTsRef.current = null;
    setShowInterruptionModal(false);
    setShowFinishModal(false);
    try { soundEngine.playPop(); } catch {}
  };

  // Stats
  const todayDate = new Date().toISOString().split('T')[0];
  const todaySessions = (focusSessions || []).filter(s => s.createdAt?.startsWith(todayDate));
  
  const completedToday = todaySessions.filter(s => s.status === 'Completed');
  const totalMinutesToday = completedToday.reduce((acc, curr) => acc + (curr.actualDuration || 0), 0);
  
  const todayGoal = (focusGoals || []).find(g => g.type === 'daily' && g.startDate === todayDate);
  const targetMinutes = todayGoal ? todayGoal.targetHours * 60 : 120; // default 2h
  const progressPercent = Math.min(100, Math.round((totalMinutesToday / targetMinutes) * 100));

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const FOCUS_MODES: { mode: FocusMode; label: string; duration: number }[] = [
    { mode: 'Pomodoro', label: '🍅 Pomodoro 25p', duration: 25 },
    { mode: 'Standard', label: '⚡ Deep Work 50p', duration: 50 },
    { mode: 'Quick', label: '☕ Nghỉ ngắn 5p', duration: 5 },
    { mode: 'Deep', label: '🚀 Siêu tập trung 90p', duration: 90 },
  ];

  const currentPlannedMinutes = activeSession ? activeSession.plannedDuration : getDurationForMode(selectedMode);
  const remainingSeconds = activeSession ? Math.max(0, activeSession.plannedDuration * 60 - elapsedSeconds) : currentPlannedMinutes * 60;
  const progressFraction = activeSession ? Math.min(1, elapsedSeconds / (activeSession.plannedDuration * 60)) : 0;

  // 4 Reusable Compact Metrics Cards (Minimalist Linear / Notion styling)
  const renderStatsCards = (extraClass = "") => (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 ${extraClass}`}>
      {/* 1. Thời gian Focus */}
      <div className="py-2.5 px-3.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
              {isVi ? 'Thời gian Focus' : 'Focus Time'}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              {progressPercent}%
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono tracking-tight leading-none mt-1">
            {Math.floor(totalMinutesToday / 60)}h {totalMinutesToday % 60}m
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Phiên hoàn thành */}
      <div className="py-2.5 px-3.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
            {isVi ? 'Phiên hoàn thành' : 'Completed Sessions'}
          </span>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono tracking-tight leading-none mt-1">
            {completedToday.length} <span className="text-xs font-normal text-slate-400 font-sans">/{todaySessions.length}</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
          <Target className="w-4 h-4" />
        </div>
      </div>

      {/* 3. Gián đoạn */}
      <div className="py-2.5 px-3.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
            {isVi ? 'Gián đoạn' : 'Interruptions'}
          </span>
          <div className="text-lg font-bold text-amber-500 font-mono tracking-tight leading-none mt-1">
            {todaySessions.reduce((acc, curr) => acc + (curr.interruptions?.length || 0), 0)} <span className="text-[10px] font-normal text-slate-400 font-sans">{isVi ? 'lần' : 'times'}</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/50">
          <ShieldAlert className="w-4 h-4" />
        </div>
      </div>

      {/* 4. Focus Streak */}
      <div className="py-2.5 px-3.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
            Focus Streak
          </span>
          <div className="text-lg font-bold text-amber-500 dark:text-amber-400 font-mono tracking-tight leading-none mt-1">
            {focusStreak} <span className="text-[10px] font-normal text-slate-400 font-sans">{isVi ? 'ngày' : 'days'}</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <span className="text-xs">🔥</span>
        </div>
      </div>
    </div>
  );

  const focusContent = (
    <div className={`w-full min-w-0 max-w-7xl mx-auto flex flex-col space-y-3.5 sm:space-y-4 overflow-x-hidden ${
      isZenMode ? 'dark fixed inset-0 z-[99999] w-screen h-screen bg-slate-950 text-slate-100 max-w-none p-4 sm:p-12 overflow-y-auto' : 'px-4 sm:px-6 py-3 sm:py-4 pb-24 md:pb-3'
    }`}>
      
      {/* ========================================================================= */}
      {/* 1. RESPONSIVE HEADER ROW & ACTION BAR (CHỐNG TRÀN LỀ)                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={`text-lg sm:text-2xl font-black tracking-tight truncate ${
                isZenMode ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}>
                {isVi ? 'Không gian Tập trung' : 'Focus Mode & Ambient Sound'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Pomodoro
              </span>
            </div>
            <p className={`text-xs font-medium truncate ${
              isZenMode ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
            }`}>
              {isVi ? 'Không gian làm việc sâu kết hợp âm thanh ambient & theo dõi thời gian thực tế' : 'Deep work workspace with ambient soundscapes and real-time tracking'}
            </p>
          </div>
        </div>

        {/* Action Bar: Responsive Wrap & Clean Light/Dark pill buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
          {/* Live Co-working Presence */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>🟢 {135 + (new Date().getHours() % 12) * 5} {isVi ? 'người đang Deep Work' : 'peers in Deep Work'}</span>
          </div>

          {/* Weekly Hall of Fame Leaderboard Trigger */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowLeaderboard(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
            title={isVi ? "Bảng Phong Thần Kỷ Luật Tuần" : "Weekly Discipline Hall of Fame"}
          >
            <span>🏆</span>
            <span>{isVi ? 'Bảng Phong Thần' : 'Leaderboard'}</span>
          </button>

          {/* Ambient Music Volume Control Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <FocusVolumeControl sliderWidthClass="w-14 sm:w-20 md:w-24" />
          </div>

          {/* Music Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMusicPanel(!showMusicPanel)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
              showMusicPanel 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-700'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>{showMusicPanel ? (isVi ? 'Ẩn nhạc' : 'Hide Music') : (isVi ? 'Hiện nhạc' : 'Show Music')}</span>
          </button>

          {/* Zen Fullscreen Button (Sáng sủa ở Light Mode, không hardcode bg-slate-900!) */}
          <button
            type="button"
            onClick={toggleZenMode}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isZenMode ? (isVi ? 'Thoát toàn màn hình' : 'Exit') : (isVi ? 'Toàn màn hình (Zen)' : 'Zen Fullscreen')}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THANH CHỈ SỐ THU GỌN TRÊN DESKTOP (>= lg)                              */}
      {/* ========================================================================= */}
      {!isZenMode && renderStatsCards("hidden lg:grid")}

      {/* ========================================================================= */}
      {/* 3. KHU VỰC CHÍNH 2 CỘT (GRID 12 CỘT - CÂN ĐỐI CHIỀU CAO)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1 min-h-0">
        
        {/* CỘT TRÁI (7/12 CỘT TRÊN DESKTOP) - TRẠM ĐỒNG HỒ POMODORO (LINEAR / NOTION MINIMALIST) */}
        <div className="order-1 lg:order-none lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between items-center text-center space-y-5 relative">
          
          {/* Mode Switcher Tabs */}
          <div className="w-full flex items-center justify-center">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-full overflow-x-auto no-scrollbar gap-1 text-xs">
              {FOCUS_MODES.map((m) => {
                const isSelected = selectedMode === m.mode;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => handleSelectMode(m.mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LARGE TYPOGRAPHIC POMODORO TIMER (Geometric Monospaced, without heavy enclosing cards) */}
          <div className="py-6 sm:py-8 flex flex-col items-center justify-center">
            <div className={`text-6xl sm:text-7xl md:text-8xl font-light font-mono tracking-tighter tabular-nums select-none ${
              !activeSession 
                ? 'text-slate-900 dark:text-white' 
                : activeSession.status === 'Paused' 
                  ? 'text-amber-500' 
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {formatTime(remainingSeconds)}
            </div>

            <p className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 tracking-wide mt-2">
              {!activeSession 
                ? (isVi ? `${currentPlannedMinutes} phút mục tiêu` : `${currentPlannedMinutes} min target`)
                : activeSession.status === 'Running'
                  ? (isVi ? 'Đang tập trung sâu' : 'Deep Focus Session')
                  : (isVi ? 'Tạm dừng phiên' : 'Session Paused')
              }
            </p>

            {/* Task Goal Selector (Subtle inline text) */}
            <div className="mt-3">
              {!activeSession ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <Target className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-medium shrink-0">{isVi ? 'Mục tiêu:' : 'Goal:'}</span>
                  <select 
                    value={selectedTaskId} 
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="bg-transparent border-0 outline-none text-xs font-normal text-slate-700 dark:text-slate-300 cursor-pointer max-w-[200px] truncate"
                  >
                    <option value="" className="dark:bg-slate-900">{isVi ? 'Chọn công việc cần tập trung...' : 'Pick a task...'}</option>
                    {tasks.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Hủy').map(t => (
                      <option key={t.id} value={t.id} className="dark:bg-slate-900">{t.title}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Target className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{activeSession.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Minimalist Controls */}
          <div className="w-full flex items-center justify-center pt-1">
            {!activeSession ? (
              <button 
                type="button" 
                onClick={startFocus}
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isVi ? 'Bắt đầu phiên tập trung' : 'Start Focus Session'}</span>
              </button>
            ) : (
              <div className="w-full space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {activeSession.status === 'Running' ? (
                    <button 
                      type="button" 
                      onClick={pauseFocus}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      title={isVi ? "Tạm dừng phiên" : "Pause session"}
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>{isVi ? 'Tạm dừng' : 'Pause'}</span>
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={resumeFocus}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      title={isVi ? "Tiếp tục phiên" : "Resume session"}
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>{isVi ? 'Tiếp tục' : 'Resume'}</span>
                    </button>
                  )}

                  <button 
                    type="button" 
                    onClick={finishFocus}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title={isVi ? "Hoàn thành sớm phiên này" : "Finish early"}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isVi ? 'Hoàn thành sớm' : 'Finish early'}</span>
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={cancelFocus}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title={isVi ? "Hủy phiên này" : "Cancel session"}
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{isVi ? 'Hủy' : 'Cancel'}</span>
                  </button>
                </div>

                {activeSession.status === 'Paused' && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowInterruptionModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-normal transition-colors cursor-pointer"
                    >
                      <span>💬</span>
                      <span>{isVi ? 'Ghi nhận lý do gián đoạn' : 'Log interruption reason'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* THẺ THỐNG KÊ THU GỌN TRÊN MOBILE (< lg) - NẰM NGAY DƯỚI ĐỒNG HỒ */}
        {!isZenMode && (
          <div className="order-2 lg:hidden w-full">
            {renderStatsCards()}
          </div>
        )}

        {/* CỘT PHẢI (5/12 CỘT TRÊN DESKTOP) - AMBIENT AUDIO & LỊCH SỬ */}
        <div className="order-3 lg:order-none lg:col-span-5 space-y-4 flex flex-col">
          {/* YouTube Focus Music Player */}
          {showMusicPanel && (
            <YouTubeFocusPlayer />
          )}

          {/* History Card (Chiều cao thu gọn khi chưa có dữ liệu) */}
          {!isZenMode && (
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-emerald-500" /> {isVi ? 'Lịch sử hôm nay' : "Today's History"}
                </h3>
                <span className="text-[11px] font-medium text-slate-400">
                  {todaySessions.length} {isVi ? 'phiên' : 'sessions'}
                </span>
              </div>
              <div className="p-3 sm:p-4 space-y-2.5 max-h-56 overflow-y-auto">
                {todaySessions.length === 0 ? (
                  <div className="text-center py-5 text-xs text-slate-400 font-normal">
                    {isVi ? 'Chưa có phiên nào hôm nay. Hãy bắt đầu ngay! ✨' : 'No focus sessions yet today. Start right now! ✨'}
                  </div>
                ) : (
                  todaySessions.map(session => (
                    <div key={session.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">{session.title}</h4>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                          session.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60' : 
                          session.status === 'Cancelled' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                        }`}>
                          {isVi ? (session.status === 'Completed' ? 'Hoàn thành' : session.status === 'Cancelled' ? 'Đã hủy' : session.status) : (session.status === 'Completed' ? 'Completed' : session.status === 'Cancelled' ? 'Cancelled' : session.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Target className="w-3 h-3 text-emerald-500" /> {session.mode} ({session.plannedDuration}m)</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {isVi ? 'Thực:' : 'Actual:'} {session.actualDuration}m</span>
                        {session.interruptions && session.interruptions.length > 0 && (
                          <span className="flex items-center gap-1 text-amber-500"><ShieldAlert className="w-3 h-3" /> {session.interruptions.length} {isVi ? 'gián đoạn' : 'interruptions'}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      
      {/* Interruption Modal */}
      {showInterruptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{isVi ? 'Ghi nhận Gián đoạn' : 'Log Interruption'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-normal">{isVi ? 'Lý do bạn tạm dừng phiên này là gì?' : 'What caused you to pause this session?'}</p>
            
            <div className="space-y-2 mb-6">
              {(isVi ? ['Điện thoại/Mạng xã hội', 'Có người gọi/Họp đột xuất', 'Nhu cầu cá nhân', 'Nghỉ giải lao', 'Khác'] : ['Phone/Social media', 'Incoming call/Urgent meeting', 'Personal needs', 'Break', 'Other']).map(reason => (
                <button type="button"
                  key={reason}
                  onClick={() => setInterruptionReason(reason)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer
                    ${interruptionReason === reason ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <button type="button" 
                onClick={() => setShowInterruptionModal(false)}
                className="flex-1 py-2.5 text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer text-xs"
              >
                {isVi ? 'Để sau (Giữ tạm dừng)' : 'Dismiss (Keep Paused)'}
              </button>
              <button type="button" 
                onClick={resumeFocus}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-xs cursor-pointer text-xs"
              >
                {isVi ? 'Tiếp tục Focus' : 'Resume Focus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish Session Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 text-center">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{isVi ? 'Hoàn thành phiên làm việc' : 'Session Completed'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isVi ? <>Bạn đã focus được <strong className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{Math.floor(elapsedSeconds / 60)} phút</strong>.</> : <>You focused for <strong className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{Math.floor(elapsedSeconds / 60)} minutes</strong>.</>}</p>
            </div>
            
            <div className="p-6">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">{isVi ? 'Ghi chú / Kết quả đạt được (Tùy chọn)' : 'Reflection / Key Outcomes (Optional)'}</label>
              <textarea 
                value={reflection} onChange={e => setReflection(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[100px] text-slate-800 dark:text-slate-100"
                placeholder={isVi ? "Tôi đã hoàn thành phần 1, phát hiện thêm lỗi ở module user..." : "Completed section 1, discovered edge case in user module..."}
              ></textarea>
            </div>

            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button type="button" 
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-2 text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer text-xs"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button type="button" 
                onClick={saveFinishedSession}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-xs cursor-pointer text-xs"
              >
                {isVi ? 'Lưu kết quả' : 'Save Results'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Hall of Fame Leaderboard Modal */}
      <WeeklyLeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        onShare={() => {
          setShowLeaderboard(false);
          setShowShareStory(true);
        }}
      />

      {/* Aesthetic Story Share Modal */}
      <ShareStoryModal
        isOpen={showShareStory}
        onClose={() => setShowShareStory(false)}
      />

    </div>
  );

  return focusContent;
}
