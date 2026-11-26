import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../lib/store';
import { 
  Play, Square, Pause, RotateCcw, 
  Target, Zap, Clock, ShieldAlert, CheckCircle2,
  ListTodo, FolderKanban, Briefcase, FileText,
  Maximize2, Minimize2, Sparkles, Volume2, Music,
  X, Check, Coffee, Plus, Trash2, Flame, Bell,
  Sliders, SkipForward, Award, ChevronDown, ChevronUp,
  VolumeX, AlertCircle, Activity
} from 'lucide-react';
import { FocusSession, FocusMode, FocusStatus, Task, Project } from '../lib/types';
import { YouTubeFocusPlayer } from './YouTubeFocusPlayer';
import { FocusVolumeControl } from './focus/FocusVolumeControl';
import { CompanionMood } from '../lib/companionEngine';
import { companionEventBus } from '../lib/companion/companionEventBus';
import { retentionEngine } from '../lib/retentionEngine';
import { analytics } from '../lib/analytics';
import { soundEngine } from '../lib/soundEngine';
import { toast } from '../lib/toast';
import { triggerConfetti } from '../lib/confetti';
import { webNotification } from '../lib/webNotification';
import { notifyStudyCommunity } from '../lib/unifiedNotificationEngine';
import { WeeklyLeaderboardModal } from './dashboard/WeeklyLeaderboardModal';
import { ShareStoryModal } from './ShareStoryModal';
import { AestheticStudyReceiptModal, StudyReceiptData } from './sharing/AestheticStudyReceiptModal';
import { AmbientMixerWidget } from './focus/AmbientMixerWidget';
import { SpeedMatchGameModal } from './vocab/SpeedMatchGameModal';
import { recordUserActivity } from '../lib/globalUserSync';
import { formatLocalDateKey } from '../lib/utils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { FocusPetWidget } from './pet/FocusPetWidget';
import { 
  playPomodoroAlarm, 
  unlockAudioContext, 
  PomodoroSoundType 
} from '../lib/pomodoroSoundSynthesizer';

// --------------------------------------------------------------------------
// Custom Pomodoro Settings & Runtime Types
// --------------------------------------------------------------------------
export interface PomodoroCustomSettings {
  focusMinutes: number;   // 1 to 180 min
  breakMinutes: number;   // 1 to 60 min
  targetRounds: number;   // 1 to 10 rounds
  soundType: PomodoroSoundType; // 'zen' | 'energetic' | 'bell'
  volume: number;         // 0.05 to 1.0
}

export type PomodoroPhase = 'FOCUS' | 'CHIME_TRANSITION' | 'BREAK' | 'IDLE' | 'COMPLETED';

const SETTINGS_STORAGE_KEY = 'lifeos_pomodoro_custom_settings';
const RUNTIME_STORAGE_KEY = 'lifeos_pomodoro_runtime_v3';

const DEFAULT_SETTINGS: PomodoroCustomSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  targetRounds: 4,
  soundType: 'zen',
  volume: 0.85
};

export function FocusView() {
  const { 
    focusSessions, focusGoals, tasks, projects, 
    addFocusSession, updateFocusSession, deleteFocusSession, addTask, updateTask,
    dailyCapacity, currentUser, language, theme
  } = useAppStore();
  const isVi = language === 'vi';

  // -------------------------------------------------------------------------
  // 1. CUSTOM SETTINGS STATE (Persisted to localStorage)
  // -------------------------------------------------------------------------
  const [settings, setSettings] = useState<PomodoroCustomSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            focusMinutes: Math.max(1, Math.min(180, Number(parsed.focusMinutes) || 25)),
            breakMinutes: Math.max(1, Math.min(60, Number(parsed.breakMinutes) || 5)),
            targetRounds: Math.max(1, Math.min(10, Number(parsed.targetRounds) || 4)),
            soundType: (['zen', 'energetic', 'bell'].includes(parsed.soundType) ? parsed.soundType : 'zen') as PomodoroSoundType,
            volume: typeof parsed.volume === 'number' ? Math.max(0.1, Math.min(1, parsed.volume)) : 0.85
          };
        }
      } catch {}
    }
    return DEFAULT_SETTINGS;
  });

  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // -------------------------------------------------------------------------
  // 2. RUNTIME ENGINE (Timestamp-Based, F5 & Screen Sleep Proof)
  // -------------------------------------------------------------------------
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<PomodoroPhase>('IDLE');
  const [currentRound, setCurrentRound] = useState(1);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(settings.focusMinutes * 60);
  const [totalPhaseSeconds, setTotalPhaseSeconds] = useState(settings.focusMinutes * 60);
  const [isQuickTest, setIsQuickTest] = useState(false);

  // Selected task to tie real work to focus
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lifeos_focus_selected_task_id') || '';
      } catch {}
    }
    return '';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_focus_selected_task_id', selectedTaskId);
    } catch {}
  }, [selectedTaskId]);

  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [studyReceipt, setStudyReceipt] = useState<StudyReceiptData | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const chimeTimeoutRef = useRef<any>(null);

  // -------------------------------------------------------------------------
  // Restore runtime state from localStorage on load / mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedRuntime = localStorage.getItem(RUNTIME_STORAGE_KEY);
      if (savedRuntime) {
        const parsed = JSON.parse(savedRuntime);
        if (parsed.isRunning && parsed.targetEndTime) {
          const now = Date.now();
          const secsLeft = Math.max(0, Math.ceil((parsed.targetEndTime - now) / 1000));
          setIsRunning(true);
          setIsPaused(Boolean(parsed.isPaused));
          setPhase(parsed.phase || 'FOCUS');
          setCurrentRound(parsed.currentRound || 1);
          setTargetEndTime(parsed.targetEndTime);
          setRemainingSeconds(secsLeft);
          setTotalPhaseSeconds(parsed.totalPhaseSeconds || (parsed.phase === 'BREAK' ? settings.breakMinutes * 60 : settings.focusMinutes * 60));
          setIsQuickTest(Boolean(parsed.isQuickTest));
          if (parsed.sessionId) {
            currentSessionIdRef.current = parsed.sessionId;
            const existing = (focusSessions || []).find(s => s.id === parsed.sessionId);
            if (existing) setActiveSession(existing);
          }
        }
      }
    } catch {}
  }, []);

  // Persist active runtime state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (isRunning && targetEndTime) {
        localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify({
          isRunning,
          isPaused,
          phase,
          currentRound,
          targetEndTime,
          totalPhaseSeconds,
          isQuickTest,
          sessionId: currentSessionIdRef.current
        }));
      } else {
        localStorage.removeItem(RUNTIME_STORAGE_KEY);
      }
    } catch {}
  }, [isRunning, isPaused, phase, currentRound, targetEndTime, totalPhaseSeconds, isQuickTest]);

  // If idle, update remainingSeconds whenever settings change
  useEffect(() => {
    if (!isRunning && phase === 'IDLE') {
      setRemainingSeconds(settings.focusMinutes * 60);
      setTotalPhaseSeconds(settings.focusMinutes * 60);
    }
  }, [settings.focusMinutes, isRunning, phase]);

  // -------------------------------------------------------------------------
  // 3. PRECISION 250ms TICK LOOP & PHASE TRANSITION CONTROLLER
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isRunning || isPaused || !targetEndTime || phase === 'CHIME_TRANSITION') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const secs = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
      setRemainingSeconds(secs);

      if (secs === 0) {
        handlePhaseZeroReached();
      }
    }, 250);

    return () => clearInterval(timer);
  }, [isRunning, isPaused, targetEndTime, phase, currentRound, isQuickTest, settings]);

  /**
   * Automatic Phase Zero Transition:
   * When Focus hits 0:
   * 1. Plays audible chime & phone haptic vibration
   * 2. Sets Phase to CHIME_TRANSITION (~2.8s celebratory pause)
   * 3. Syncs real study minutes to User Stats & Emits Bell Notification
   * 4. Automatically switches to BREAK without user pressing anything!
   *
   * When Break hits 0:
   * 1. Plays break-end reminder chime
   * 2. Automatically advances to next Focus Round!
   */
  const handlePhaseZeroReached = async () => {
    if (phase === 'FOCUS') {
      // 1. Enter Chime Transition
      setPhase('CHIME_TRANSITION');
      triggerConfetti();

      // Synthesize chime alarm
      playPomodoroAlarm(settings.soundType, 'FOCUS_END', settings.volume).catch(() => {});

      // Calculate completed study minutes
      const completedMins = isQuickTest ? 1 : settings.focusMinutes;
      const targetTask = (tasks || []).find(t => t.id === selectedTaskId);
      const taskTitle = targetTask ? targetTask.title : 'Phiên tập trung';

      // 2. Real System Data Integration: Increment study minutes & fire sync
      try {
        recordUserActivity('focus', completedMins);
        notifyStudyCommunity('POMODORO_FINISHED', {
          durationMinutes: completedMins,
          title: taskTitle
        }).catch(() => {});
        retentionEngine.addXp(35, `Hoàn thành hiệp học Pomodoro (${completedMins} phút)`);
      } catch (e) {
        console.warn('Real study record sync notice:', e);
      }

      // Update current focus session record in DB / store
      if (currentSessionIdRef.current) {
        try {
          updateFocusSession(currentSessionIdRef.current, {
            actualDuration: completedMins,
            status: 'Completed',
            endTime: new Date().toISOString()
          });
        } catch {}
      }

      // 3. Automatic transition into BREAK after 2.8 seconds of chime
      if (chimeTimeoutRef.current) clearTimeout(chimeTimeoutRef.current);
      chimeTimeoutRef.current = setTimeout(() => {
        const breakSecs = isQuickTest ? 5 : settings.breakMinutes * 60;
        const newEndTime = Date.now() + breakSecs * 1000;
        setPhase('BREAK');
        setTotalPhaseSeconds(breakSecs);
        setRemainingSeconds(breakSecs);
        setTargetEndTime(newEndTime);
        toast.info(
          isVi ? 'Đang nghỉ giải lao. Hãy đứng dậy vươn vai và uống nước nhé!' : 'Break time started. Take a stretch and drink water!',
          '☕ Giờ Giải Lao'
        );
      }, 2800);

    } else if (phase === 'BREAK') {
      // End of Break reached!
      playPomodoroAlarm(settings.soundType, 'BREAK_END', settings.volume).catch(() => {});

      if (currentRound < settings.targetRounds) {
        // Automatically start next Focus round
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);
        const focusSecs = isQuickTest ? 5 : settings.focusMinutes * 60;
        const newEndTime = Date.now() + focusSecs * 1000;
        setPhase('FOCUS');
        setTotalPhaseSeconds(focusSecs);
        setRemainingSeconds(focusSecs);
        setTargetEndTime(newEndTime);

        toast.success(
          isVi ? `Bắt đầu Hiệp ${nextRound}/${settings.targetRounds}! Cố gắng nhé.` : `Starting Round ${nextRound}/${settings.targetRounds}!`,
          '🔥 Vào Bàn Học'
        );
      } else {
        // All target rounds completed!
        setIsRunning(false);
        setPhase('COMPLETED');
        setTargetEndTime(null);
        triggerConfetti();
        soundEngine.playSuccess();
        const finishedTask = (tasks || []).find(t => t.id === selectedTaskId);
        const totalMins = Math.max(1, (isQuickTest ? 1 : settings.focusMinutes) * settings.targetRounds);
        setStudyReceipt({
          title: finishedTask ? finishedTask.title : 'Phiên Tập Trung Pomodoro',
          minutes: totalMins,
          xpEarned: 35 * settings.targetRounds,
          streakDays: currentUser?.streakDays || 1,
          userName: currentUser?.name,
          modeLabel: `Pomodoro (${settings.targetRounds} hiệp)`,
        });
        toast.success(
          isVi ? `Xuất sắc! Bạn đã hoàn thành trọn vẹn ${settings.targetRounds} hiệp học hôm nay!` : 'Congratulations on finishing all focus rounds!',
          '🏆 Mục Tiêu Hoàn Thành'
        );
      }
    }
  };

  // -------------------------------------------------------------------------
  // 4. CONTROL HANDLERS
  // -------------------------------------------------------------------------

  /**
   * Start or resume Focus Pomodoro
   */
  const handleStartFocus = () => {
    unlockAudioContext();
    soundEngine.playPop();

    const focusSecs = settings.focusMinutes * 60;
    const endTime = Date.now() + focusSecs * 1000;

    const sessionId = `foc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    currentSessionIdRef.current = sessionId;

    const targetTask = (tasks || []).find(t => t.id === selectedTaskId);
    const newSession: FocusSession = {
      id: sessionId,
      title: targetTask ? targetTask.title : (isVi ? 'Phiên tập trung' : 'Deep Focus'),
      mode: 'Pomodoro',
      status: 'Running',
      plannedDuration: settings.focusMinutes,
      actualDuration: 0,
      startTime: new Date().toISOString(),
      taskId: selectedTaskId || null,
      interruptions: [],
      createdAt: new Date().toISOString()
    };

    try {
      addFocusSession(newSession);
    } catch {}
    setActiveSession(newSession);

    setIsRunning(true);
    setIsPaused(false);
    setIsQuickTest(false);
    setPhase('FOCUS');
    setCurrentRound(1);
    setTotalPhaseSeconds(focusSecs);
    setRemainingSeconds(focusSecs);
    setTargetEndTime(endTime);

    // Companion reaction
    setCompanionMood('focus');
    setCompanionDialogueKey('focusStart');
  };

  /**
   * Quick 5-Second Test Mode (5s Focus -> Chime -> 5s Break -> Chime -> Finish)
   */
  const handleStartQuickTest = () => {
    unlockAudioContext();
    soundEngine.playPop();

    const testSecs = 5;
    const endTime = Date.now() + testSecs * 1000;

    setIsRunning(true);
    setIsPaused(false);
    setIsQuickTest(true);
    setPhase('FOCUS');
    setCurrentRound(1);
    setTotalPhaseSeconds(testSecs);
    setRemainingSeconds(testSecs);
    setTargetEndTime(endTime);

    toast.info('⚡ Bắt đầu chạy thử: 5 giây Học -> Tự kêu chuông -> 5 giây Nghỉ -> Kêu chuông hết giờ.', 'Chạy Thử Nghiệm Thu');
  };

  const handlePause = () => {
    if (!isRunning || isPaused) return;
    soundEngine.playPop();
    setIsPaused(true);
    // Freeze remaining seconds
    setTargetEndTime(null);
  };

  const handleResume = () => {
    if (!isRunning || !isPaused) return;
    unlockAudioContext();
    soundEngine.playPop();
    const newEndTime = Date.now() + remainingSeconds * 1000;
    setTargetEndTime(newEndTime);
    setIsPaused(false);
  };

  const handleSkipBreak = () => {
    soundEngine.playPop();
    if (chimeTimeoutRef.current) clearTimeout(chimeTimeoutRef.current);

    if (currentRound < settings.targetRounds) {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      const focusSecs = isQuickTest ? 5 : settings.focusMinutes * 60;
      setPhase('FOCUS');
      setTotalPhaseSeconds(focusSecs);
      setRemainingSeconds(focusSecs);
      setTargetEndTime(Date.now() + focusSecs * 1000);
      toast.success(isVi ? `Đã bỏ qua giờ nghỉ. Bắt đầu Hiệp ${nextRound}!` : 'Skipped break!');
    } else {
      setIsRunning(false);
      setPhase('COMPLETED');
      setTargetEndTime(null);
    }
  };

  const handleCancelSession = () => {
    soundEngine.playPop();
    if (chimeTimeoutRef.current) clearTimeout(chimeTimeoutRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setIsQuickTest(false);
    setPhase('IDLE');
    setTargetEndTime(null);
    setRemainingSeconds(settings.focusMinutes * 60);
    setTotalPhaseSeconds(settings.focusMinutes * 60);
    setCurrentRound(1);
    setActiveSession(null);
    try {
      localStorage.removeItem(RUNTIME_STORAGE_KEY);
    } catch {}
    toast.info(isVi ? 'Đã dừng phiên tập trung.' : 'Session stopped.');
  };

  const handlePreviewAlarm = async (sound: PomodoroSoundType) => {
    unlockAudioContext();
    setIsPlayingPreview(true);
    try {
      await playPomodoroAlarm(sound, 'PREVIEW', settings.volume);
    } finally {
      setIsPlayingPreview(false);
    }
  };

  // -------------------------------------------------------------------------
  // 5. PROGRESS CALCULATION & HIGH-PRECISION CLOCK TICKS
  // -------------------------------------------------------------------------
  const ringRadius = 96;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~603.185
  const progressRatio = totalPhaseSeconds > 0 
    ? Math.min(1, Math.max(0, (totalPhaseSeconds - remainingSeconds) / totalPhaseSeconds)) 
    : 0;
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  const progressAngle = progressRatio * 2 * Math.PI;
  const headX = 120 + ringRadius * Math.cos(progressAngle);
  const headY = 120 + ringRadius * Math.sin(progressAngle);

  // 60-Tick Precision Dial (12 Major Ticks, 48 Minor Ticks)
  const clockTicks = useMemo(() => {
    const ticks = [];
    const cx = 120;
    const cy = 120;
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * 2 * Math.PI;
      const isMajor = i % 5 === 0;
      const innerR = isMajor ? 76 : 80;
      const outerR = 86;
      const x1 = cx + innerR * Math.cos(angle);
      const y1 = cy + innerR * Math.sin(angle);
      const x2 = cx + outerR * Math.cos(angle);
      const y2 = cy + outerR * Math.sin(angle);
      ticks.push({ i, x1, y1, x2, y2, isMajor, threshold: i / 60 });
    }
    return ticks;
  }, []);

  const formatDisplayTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Quick Minute Tweaks (-5m, +5m)
  const handleAdjustMinutes = (deltaMinutes: number) => {
    soundEngine.playPop();
    const deltaSeconds = deltaMinutes * 60;
    const newTotal = Math.max(60, totalPhaseSeconds + deltaSeconds);
    const newRemaining = Math.max(0, remainingSeconds + deltaSeconds);
    setTotalPhaseSeconds(newTotal);
    setRemainingSeconds(newRemaining);
    if (!isRunning) {
      setSettings(s => ({
        ...s,
        [phase === 'BREAK' ? 'breakMinutes' : 'focusMinutes']: Math.max(1, Math.round(newTotal / 60))
      }));
    }
  };

  // Emergency +5 Minutes when in the middle of deep work
  const handleAddEmergencyMinutes = (minutes = 5) => {
    soundEngine.playPop();
    const deltaSeconds = minutes * 60;
    setRemainingSeconds(prev => prev + deltaSeconds);
    setTotalPhaseSeconds(prev => prev + deltaSeconds);
    toast.success(isVi ? `+${minutes} phút tập trung đã được cộng thêm!` : `+${minutes}m focus added!`);
  };

  // Global Keyboard Shortcuts (Space: Start/Pause, R: Reset, F: Zen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isRunning) {
          handleStartFocus();
        } else if (isPaused) {
          handleResume();
        } else {
          handlePause();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (!isRunning || isPaused) {
          e.preventDefault();
          handleCancelSession();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleZenMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isPaused, settings, remainingSeconds, totalPhaseSeconds]);

  // -------------------------------------------------------------------------
  // 6. SECONDARY STATE & MODALS (Leaderboard, Stories, Ambient, Pet)
  // -------------------------------------------------------------------------
  const [isZenMode, setIsZenMode] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_focus_show_music');
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_focus_show_music', String(showMusicPanel));
    } catch {}
  }, [showMusicPanel]);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShareStory, setShowShareStory] = useState(false);
  const [showSpeedMatchBreak, setShowSpeedMatchBreak] = useState(false);

  // Quick Task Creation
  const [isQuickCreatingTask, setIsQuickCreatingTask] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  const handleQuickCreateAndSelectTask = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const trimmed = quickTaskTitle.trim();
    if (!trimmed) return;
    try {
      const created = await addTask({
        title: trimmed,
        priority: 'Cao',
        status: 'Chưa làm',
        dueDate: new Date().toISOString().split('T')[0]
      });
      const assignedId = (created as any)?.id;
      if (assignedId) setSelectedTaskId(assignedId);
      setQuickTaskTitle('');
      setIsQuickCreatingTask(false);
      soundEngine.playPop();
    } catch (err) {
      console.error(err);
    }
  };

  // Undo delete session
  const [undoDeletedSession, setUndoDeletedSession] = useState<FocusSession | null>(null);
  const undoDeleteTimerRef = useRef<any>(null);

  const handleDeleteSessionWithUndo = (sessionId: string) => {
    const target = focusSessions.find(s => s.id === sessionId);
    if (!target) return;
    deleteFocusSession(sessionId);
    soundEngine.playPop();

    if (undoDeleteTimerRef.current) clearTimeout(undoDeleteTimerRef.current);
    setUndoDeletedSession(target);
    undoDeleteTimerRef.current = setTimeout(() => {
      setUndoDeletedSession(null);
    }, 5000);
  };

  const handleRestoreDeletedSession = () => {
    if (!undoDeletedSession) return;
    if (undoDeleteTimerRef.current) clearTimeout(undoDeleteTimerRef.current);
    addFocusSession(undoDeletedSession);
    soundEngine.playSuccess();
    setUndoDeletedSession(null);
  };

  // Zen Mode toggle
  const toggleZenMode = async () => {
    const nextZen = !isZenMode;
    setIsZenMode(nextZen);
    soundEngine.playPop();
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
    } catch {}
  };

  useEffect(() => {
    if (isZenMode) {
      document.documentElement.classList.add('dark');
      return () => {
        if (theme !== 'dark') document.documentElement.classList.remove('dark');
      };
    }
  }, [isZenMode, theme]);

  // Companion
  const [companionMood, setCompanionMood] = useState<CompanionMood>('idle');
  const [companionDialogueKey, setCompanionDialogueKey] = useState<any>('greeting');
  
  useEffect(() => {
    if (companionMood) {
      companionEventBus.emit({
        type: 'mood_change',
        mood: companionMood,
        category: companionDialogueKey
      });
    }
  }, [companionMood, companionDialogueKey]);

  // Stats
  const todayDate = formatLocalDateKey(new Date());
  const todaySessions = (focusSessions || []).filter(s => {
    const d = s.createdAt || s.startTime;
    return d ? formatLocalDateKey(new Date(d)) === todayDate : false;
  });
  const completedToday = todaySessions.filter(s => s.status === 'Completed');
  const totalMinutesToday = completedToday.reduce((acc, curr) => acc + (curr.actualDuration || 0), 0);

  // 24-Hour Focus Distribution for Today's Visual Analytics
  const hourlyFocusData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      minutes: 0,
      sessionCount: 0
    }));

    todaySessions.forEach(s => {
      if (s.status !== 'Cancelled') {
        const d = s.startTime || s.createdAt || s.startedAt;
        if (d) {
          const dateObj = new Date(d);
          const h = dateObj.getHours();
          if (h >= 0 && h < 24) {
            hours[h].minutes += (s.actualDuration || s.plannedDuration || 0);
            hours[h].sessionCount += 1;
          }
        }
      }
    });

    const maxMinutes = Math.max(1, ...hours.map(h => h.minutes));
    let peakHour = -1;
    let peakMinutes = 0;
    hours.forEach(h => {
      if (h.minutes > peakMinutes) {
        peakMinutes = h.minutes;
        peakHour = h.hour;
      }
    });

    return { hours, maxMinutes, peakHour, peakMinutes };
  }, [todaySessions]);

  const isAnyFocusModalOpen = showLeaderboard || showShareStory || showSpeedMatchBreak;
  useBodyScrollLock(isAnyFocusModalOpen);

  // -------------------------------------------------------------------------
  // RENDER STATS CARDS
  // -------------------------------------------------------------------------
  const renderStatsCards = (extraClass = '') => (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 ${extraClass}`}>
      {/* 1. Thời gian Focus */}
      <div className="py-2.5 px-3.5 bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate block">
            {isVi ? 'Thời gian Focus Hôm Nay' : 'Today Focus Time'}
          </span>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none mt-1">
            {Math.floor(totalMinutesToday / 60)}h {totalMinutesToday % 60}m
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Phiên hoàn thành */}
      <div className="py-2.5 px-3.5 bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
            {isVi ? 'Phiên Hoàn Thành' : 'Completed Sessions'}
          </span>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none mt-1">
            {completedToday.length} <span className="text-xs font-normal text-slate-400 font-sans">/{todaySessions.length}</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
          <Target className="w-4 h-4" />
        </div>
      </div>

      {/* 3. Hiệp mục tiêu */}
      <div className="py-2.5 px-3.5 bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
            {isVi ? 'Tiến Độ Hiệp' : 'Target Rounds'}
          </span>
          <div className="text-lg font-black text-orange-500 font-mono tracking-tight leading-none mt-1">
            {isRunning ? currentRound : 0} <span className="text-xs font-normal text-slate-400 font-sans">/{settings.targetRounds}</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/50 dark:border-orange-800/50">
          <Flame className="w-4 h-4" />
        </div>
      </div>

      {/* 4. Focus Streak */}
      <div 
        onClick={() => {
          soundEngine.playPop();
          setShowLeaderboard(true);
        }}
        className="py-2.5 px-3.5 bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-xs cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
        title={isVi ? "Xem Bảng Phong Thần Kỷ Luật" : "Open Leaderboard"}
      >
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
            Focus Streak
          </span>
          <div className="text-lg font-black text-amber-500 dark:text-amber-400 font-mono tracking-tight leading-none mt-1">
            {currentUser?.streakDays ?? 0} <span className="text-[10px] font-normal text-slate-400 font-sans">{isVi ? 'ngày' : 'days'}</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <span className="text-xs">🔥</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full min-w-0 max-w-7xl mx-auto flex flex-col space-y-3.5 sm:space-y-4 pb-[max(7rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8 lg:pb-8 overflow-x-hidden ${
      isZenMode ? 'dark fixed inset-0 z-[99999] w-screen h-screen bg-slate-950 text-slate-100 max-w-none p-4 sm:p-12 overflow-y-auto' : 'p-3 sm:p-6 lg:p-8'
    }`}>
      
      {/* ========================================================================= */}
      {/* 1. HEADER ROW & ACTION BAR                                                */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Flame className="w-5 h-5 fill-white text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate text-slate-900 dark:text-white">
                {isVi ? 'Đồng Hồ Tập Trung (Pomodoro Timer)' : 'Smart Pomodoro Timer Station'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
                <Sparkles className="w-3 h-3 text-orange-500" /> Tự Động Chuyển Giờ Nghỉ
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {isVi ? 'Tùy chỉnh thời gian Học & Nghỉ • Chuông báo Web Audio không cần MP3 ngoài' : 'Custom focus & break intervals • Native AudioContext alarms'}
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-start lg:self-auto shrink-0">
          {/* Quick Test 5-Second Button */}
          <button
            type="button"
            onClick={handleStartQuickTest}
            className="flex-1 sm:flex-none justify-center px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Kiểm tra chuông kêu & tự nhảy sang giờ nghỉ trong 10 giây (5s Học -> 5s Nghỉ)"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
            <span>⚡ Chạy thử (5s)</span>
          </button>

          {/* Music Toggle Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowMusicPanel(!showMusicPanel);
            }}
            className={`flex-1 sm:flex-none justify-center px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
              showMusicPanel 
                ? 'bg-purple-600 text-white shadow-purple-500/25' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-700'
            }`}
          >
            <Music className={`w-3.5 h-3.5 shrink-0 ${showMusicPanel ? 'text-white' : 'text-purple-500'}`} />
            <span>{showMusicPanel ? (isVi ? 'Ẩn nhạc' : 'Hide Music') : (isVi ? 'Hiện nhạc' : 'Show Music')}</span>
          </button>

          {/* Zen Fullscreen Button */}
          <button
            type="button"
            onClick={toggleZenMode}
            className={`flex-1 sm:flex-none justify-center px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
              isZenMode 
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
            }`}
          >
            {isZenMode ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize2 className="w-3.5 h-3.5 shrink-0" />}
            <span>{isZenMode ? (isVi ? 'Thoát' : 'Exit') : (isVi ? 'Toàn màn hình' : 'Zen')}</span>
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      {!isZenMode && renderStatsCards("hidden lg:grid")}

      {/* ========================================================================= */}
      {/* 3. MAIN 2-COLUMN GRID                                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1 min-h-0">
        
        {/* LEFT COLUMN (7/12) - THE NEW POMODORO TIMER STATION (ZERO 3D) */}
        <div id="pomodoro-timer-station" className="order-1 lg:order-none lg:col-span-7 w-full min-w-0 space-y-4">
          <div className="w-full flex flex-col items-center text-center p-5 sm:p-7 relative overflow-hidden rounded-3xl bg-white dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs">
            
            {/* 1-Tap Quick Presets Segmented Selector */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>Gợi ý chế độ:</span>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
                {[
                  { label: '🔥 25p / 5p', name: 'Tiêu chuẩn', f: 25, b: 5, r: 4 },
                  { label: '⚡ 45p / 10p', name: 'Chuyên sâu', f: 45, b: 10, r: 3 },
                  { label: '🚀 60p / 15p', name: 'Chiến binh', f: 60, b: 15, r: 2 },
                  { label: '🧠 90p / 20p', name: 'Ultradian', f: 90, b: 20, r: 2 }
                ].map((preset, idx) => {
                  const isCur = settings.focusMinutes === preset.f && settings.breakMinutes === preset.b;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isRunning}
                      onClick={() => {
                        soundEngine.playPop();
                        setSettings(s => ({ ...s, focusMinutes: preset.f, breakMinutes: preset.b, targetRounds: preset.r }));
                        if (!isRunning) {
                          setRemainingSeconds(preset.f * 60);
                          setTotalPhaseSeconds(preset.f * 60);
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] justify-center active:scale-95 disabled:opacity-50 flex items-center gap-1 ${
                        isCur
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs shadow-orange-500/30'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      title={`${preset.name}: ${preset.f}p Học • ${preset.b}p Nghỉ • ${preset.r} Hiệp`}
                    >
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRECISION DIAL & RADIAL PROGRESS CLOCK */}
            <div className="relative my-5 sm:my-7 flex items-center justify-center">
              {/* Calming Breathing Aura */}
              <div 
                className={`absolute inset-0 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                  phase === 'BREAK'
                    ? 'bg-emerald-500/20'
                    : phase === 'CHIME_TRANSITION'
                      ? 'bg-amber-400/30 animate-pulse'
                      : isRunning && !isPaused
                        ? 'bg-orange-500/25 animate-pulse'
                        : 'bg-orange-500/10'
                }`} 
              />

              <svg 
                className="w-64 h-64 xs:w-72 xs:h-72 sm:w-80 sm:h-80 max-w-[76vw] max-h-[76vw] select-none overflow-visible transform -rotate-90 origin-center shrink-0" 
                viewBox="0 0 240 240"
              >
                {/* Gradient Definitions */}
                <defs>
                  <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="60%" stopColor="#FB923C" />
                    <stop offset="100%" stopColor="#EA580C" />
                  </linearGradient>
                  <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="60%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="chimeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                  <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Outer Bezel Rim */}
                <circle
                  cx="120"
                  cy="120"
                  r="114"
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="transparent"
                  className="text-slate-200/60 dark:text-white/[0.06]"
                />

                {/* Background Ring Track */}
                <circle
                  cx="120"
                  cy="120"
                  r={ringRadius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-800/80"
                />

                {/* 60 Precision Clock Ticks */}
                <g className="transition-opacity duration-300">
                  {clockTicks.map((tick) => {
                    const isPassed = progressRatio >= tick.threshold;
                    return (
                      <line
                        key={tick.i}
                        x1={tick.x1}
                        y1={tick.y1}
                        x2={tick.x2}
                        y2={tick.y2}
                        strokeLinecap="round"
                        strokeWidth={tick.isMajor ? 2.4 : 1.2}
                        stroke={
                          isPassed
                            ? (phase === 'BREAK' ? '#10B981' : '#F97316')
                            : 'currentColor'
                        }
                        className={
                          isPassed
                            ? 'opacity-90 transition-colors duration-200'
                            : tick.isMajor
                              ? 'text-slate-300 dark:text-slate-700 opacity-60'
                              : 'text-slate-200 dark:text-slate-800 opacity-40'
                        }
                      />
                    );
                  })}
                </g>

                {/* Animated Dynamic Progress Ring */}
                <circle
                  cx="120"
                  cy="120"
                  r={ringRadius}
                  stroke={
                    phase === 'BREAK' 
                      ? 'url(#breakGradient)' 
                      : phase === 'CHIME_TRANSITION'
                        ? 'url(#chimeGradient)'
                        : 'url(#focusGradient)'
                  }
                  strokeWidth="9"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-[stroke-dashoffset] duration-300 ease-linear"
                />

                {/* Glowing Progress Needle Head Marker */}
                {isRunning && (
                  <g filter="url(#needleGlow)">
                    <circle
                      cx={headX}
                      cy={headY}
                      r="7.5"
                      fill={phase === 'BREAK' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(249, 115, 22, 0.45)'}
                    />
                    <circle
                      cx={headX}
                      cy={headY}
                      r="4.5"
                      fill="#FFFFFF"
                      stroke={phase === 'BREAK' ? '#10B981' : '#F97316'}
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>

              {/* Inside Clock Center Information */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 select-none">
                
                {/* Round Progress Beads Chain */}
                <div 
                  className="flex items-center gap-1.5 mb-2 pointer-events-auto" 
                  title={`Tiến độ hiệp: ${currentRound}/${settings.targetRounds}`}
                >
                  {Array.from({ length: settings.targetRounds }, (_, i) => {
                    const roundNum = i + 1;
                    const isDone = roundNum < currentRound;
                    const isCurrent = roundNum === currentRound && isRunning;
                    return (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isDone
                            ? 'w-5 bg-emerald-500 shadow-xs shadow-emerald-500/50'
                            : isCurrent
                              ? 'w-6 bg-orange-500 shadow-xs shadow-orange-500/50 animate-pulse'
                              : 'w-2 bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Dynamic Phase Status Badge */}
                <div className="mb-1 pointer-events-auto">
                  {phase === 'BREAK' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs animate-pulse">
                      ☕ NGHỈ GIẢI LAO • HIỆP {currentRound}/{settings.targetRounds}
                    </span>
                  ) : phase === 'CHIME_TRANSITION' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs animate-bounce">
                      🔔 HẾT GIỜ • CHUÔNG BÁO!
                    </span>
                  ) : isRunning ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700 shadow-xs">
                      🔥 TẬP TRUNG SÂU • HIỆP {currentRound}/{settings.targetRounds}
                    </span>
                  ) : phase === 'COMPLETED' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 shadow-xs">
                      🏆 HOÀN THÀNH MỤC TIÊU!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      🍅 SẴN SÀNG TẬP TRUNG
                    </span>
                  )}
                </div>

                {/* Big Monospace Numbers */}
                <div className={`text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-light font-mono tracking-tight tabular-nums transition-colors duration-200 ${
                  phase === 'BREAK'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isPaused
                      ? 'text-amber-500'
                      : phase === 'CHIME_TRANSITION'
                        ? 'text-amber-500'
                        : 'text-slate-900 dark:text-white'
                }`}>
                  {formatDisplayTime(remainingSeconds)}
                </div>

                {/* Quick Minute Adjustment Pills (-5m, +5m) */}
                {(!isRunning || isPaused) ? (
                  <div className="flex items-center gap-2 mt-2 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => handleAdjustMinutes(-5)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
                      title="Giảm 5 phút"
                    >
                      −5m
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium px-1">chỉnh nhanh</span>
                    <button
                      type="button"
                      onClick={() => handleAdjustMinutes(5)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
                      title="Tăng 5 phút"
                    >
                      +5m
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-[210px] text-center mt-1">
                    {phase === 'BREAK' 
                      ? 'Hãy đứng dậy vươn vai, uống nước và thư giãn mắt nhé!' 
                      : phase === 'CHIME_TRANSITION'
                        ? 'Chuẩn bị chuyển sang giờ giải lao tự động...'
                        : `Mục tiêu: ${settings.focusMinutes} phút • Hiệp ${currentRound}/${settings.targetRounds}`
                    }
                  </p>
                )}

                {/* Quick Task Goal inside Circle */}
                <div className="mt-2 pointer-events-auto">
                  {selectedTaskId ? (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 max-w-[190px] truncate">
                      <Target className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{(tasks || []).find(t => t.id === selectedTaskId)?.title || 'Mục tiêu'}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* MAIN PLAYBACK CONTROL BUTTONS */}
            <div className="w-full flex flex-col items-center justify-center gap-3 pt-1">
              {!isRunning ? (
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleStartFocus}
                    className="min-h-[48px] px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-slate-950 font-black text-sm rounded-2xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Bắt đầu phiên học ({settings.focusMinutes} phút)</span>
                    <span className="hidden sm:inline text-[10px] font-mono font-normal opacity-70 px-1.5 py-0.5 rounded bg-black/10">Space</span>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                      className="flex-1 sm:flex-none min-h-[48px] px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Sliders className="w-4 h-4 text-slate-500" />
                      <span>{showSettingsDrawer ? 'Đóng Cài Đặt' : 'Tùy Chỉnh Giờ'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelSession}
                      title="Đặt lại đồng hồ về ban đầu (R)"
                      className="min-h-[48px] px-3.5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-2xl transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={handleResume}
                      className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Tiếp tục (Space)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Tạm dừng (Space)</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Emergency +5m extension during focus */}
                    {phase !== 'BREAK' && (
                      <button
                        type="button"
                        onClick={() => handleAddEmergencyMinutes(5)}
                        className="flex-1 sm:flex-none min-h-[48px] px-3.5 py-2.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                        title="Cộng thêm 5 phút nếu bạn đang tập trung dở"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+5 phút</span>
                      </button>
                    )}

                    {/* Skip Break Button during Break Phase */}
                    {phase === 'BREAK' && (
                      <button
                        type="button"
                        onClick={handleSkipBreak}
                        className="flex-1 sm:flex-none min-h-[48px] px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        title="Bỏ qua giờ nghỉ và bắt đầu hiệp học tiếp theo ngay"
                      >
                        <SkipForward className="w-4 h-4" />
                        <span>Bỏ qua nghỉ</span>
                      </button>
                    )}

                    {/* Cancel / Stop session */}
                    <button
                      type="button"
                      onClick={handleCancelSession}
                      className="flex-1 sm:flex-none min-h-[48px] px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      title="Dừng phiên học hiện tại"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Hủy phiên</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Task Selector Dropdown / Quick Create */}
              {!isRunning && (
                <div className="w-full max-w-md pt-2 flex items-center justify-center">
                  {isQuickCreatingTask ? (
                    <div className="w-full flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-orange-500/50">
                      <Target className="w-4 h-4 text-orange-500 shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        value={quickTaskTitle}
                        onChange={e => setQuickTaskTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleQuickCreateAndSelectTask();
                          if (e.key === 'Escape') setIsQuickCreatingTask(false);
                        }}
                        placeholder="Nhập tên việc cần tập trung... (Enter để tạo)"
                        className="flex-1 bg-transparent border-none outline-none text-base sm:text-xs font-semibold text-slate-800 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={handleQuickCreateAndSelectTask}
                        disabled={!quickTaskTitle.trim()}
                        className="px-2.5 py-1 rounded-lg bg-orange-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                      >
                        Tạo
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsQuickCreatingTask(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Target className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="font-bold text-slate-600 dark:text-slate-400 shrink-0">Mục tiêu:</span>
                        <select
                          value={selectedTaskId}
                          onChange={e => setSelectedTaskId(e.target.value)}
                          className="bg-transparent border-0 outline-none text-base sm:text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer truncate flex-1 min-w-0"
                        >
                          <option value="" className="dark:bg-slate-900">-- Chọn bài tập / việc cần làm --</option>
                          {tasks.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Hủy').map(t => (
                            <option key={t.id} value={t.id} className="dark:bg-slate-900">{t.title}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setIsQuickCreatingTask(true);
                        }}
                        className="px-2 py-1 rounded-lg text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-xs font-bold transition-colors cursor-pointer shrink-0"
                        title="Tạo nhanh bài mới"
                      >
                        + Tạo việc
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* COLLAPSIBLE CUSTOM POMODORO SETTINGS PANEL (MOBILE-FIRST)     */}
            {/* ============================================================= */}
            {showSettingsDrawer && !isRunning && (
              <div className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-orange-500" />
                    <span>Cài Đặt Thời Gian & Chuông Báo Pomodoro</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSettings(DEFAULT_SETTINGS)}
                    className="text-[11px] text-slate-400 hover:text-orange-500 font-bold underline cursor-pointer"
                  >
                    Khôi phục mặc định
                  </button>
                </div>

                {/* 3 Steppers: Focus, Break, Rounds (Height >= 44px, Font >= 16px) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Stepper 1: Focus Minutes */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      ⏱️ Thời gian Học (phút)
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setSettings(s => ({ ...s, focusMinutes: Math.max(1, s.focusMinutes - 5) }));
                        }}
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-lg font-black text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <div className="text-xl font-black font-mono text-orange-600 dark:text-orange-400 tabular-nums">
                        {settings.focusMinutes} <span className="text-xs font-normal text-slate-400">phút</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setSettings(s => ({ ...s, focusMinutes: Math.min(180, s.focusMinutes + 5) }));
                        }}
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-lg font-black text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Stepper 2: Break Minutes */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      ☕ Thời gian Nghỉ (phút)
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setSettings(s => ({ ...s, breakMinutes: Math.max(1, s.breakMinutes - 1) }));
                        }}
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-lg font-black text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {settings.breakMinutes} <span className="text-xs font-normal text-slate-400">phút</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setSettings(s => ({ ...s, breakMinutes: Math.min(60, s.breakMinutes + 1) }));
                        }}
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-lg font-black text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Stepper 3: Target Rounds */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      🎯 Số hiệp mục tiêu (Rounds)
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setSettings(s => ({ ...s, targetRounds: Math.max(1, s.targetRounds - 1) }));
                        }}
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-lg font-black text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {settings.targetRounds} <span className="text-xs font-normal text-slate-400">hiệp</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setSettings(s => ({ ...s, targetRounds: Math.min(10, s.targetRounds + 1) }));
                        }}
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-lg font-black text-slate-800 dark:text-white flex items-center justify-center hover:bg-slate-100 active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alarm Sound Picker with Preview Button */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-orange-500" />
                      <span>Âm thanh chuông báo khi hết giờ:</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Chuông Web Audio trong trẻo, không phụ thuộc file MP3 ngoài
                    </span>
                  </div>

                  {/* 3 Sound Choices */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'zen', label: '🔔 Chuông Thiền êm dịu' },
                      { id: 'energetic', label: '✨ Tiếng Tinh Tinh năng lượng' },
                      { id: 'bell', label: '⏰ Chuông báo rõ ràng' }
                    ].map(snd => {
                      const isSel = settings.soundType === snd.id;
                      return (
                        <div
                          key={snd.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            isSel 
                              ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 shadow-2xs font-bold'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <label className="flex items-center gap-2 flex-1 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name="sound_picker"
                              checked={isSel}
                              onChange={() => {
                                soundEngine.playPop();
                                setSettings(s => ({ ...s, soundType: snd.id as PomodoroSoundType }));
                              }}
                              className="text-orange-600 focus:ring-orange-500"
                            />
                            <span>{snd.label}</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handlePreviewAlarm(snd.id as PomodoroSoundType)}
                            disabled={isPlayingPreview}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                            title="Nghe thử âm thanh chuông"
                          >
                            <Volume2 className={`w-3 h-3 ${isPlayingPreview && isSel ? 'animate-bounce text-orange-500' : ''}`} />
                            <span>Nghe thử</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Volume Slider */}
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                      Âm lượng chuông:
                    </span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={settings.volume}
                      onChange={e => setSettings(s => ({ ...s, volume: parseFloat(e.target.value) }))}
                      className="flex-1 accent-orange-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsDrawer(false);
                      toast.success('Đã lưu cấu hình Pomodoro thành công!', 'Cài Đặt');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] justify-center rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 flex items-center"
                  >
                    Hoàn tất cài đặt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE METRICS */}
        {!isZenMode && (
          <div className="order-2 lg:hidden w-full">
            {renderStatsCards()}
          </div>
        )}

        {/* RIGHT COLUMN (5/12) - AMBIENT AUDIO, PET COMPANION & SESSIONS HISTORY */}
        <div className="order-3 lg:order-none lg:col-span-5 space-y-4 flex flex-col w-full min-w-0">
          {/* Mascot Cheer & Motivation Buddy */}
          <FocusPetWidget
            embedded={true}
            studyContext={{
              isRunning,
              timerStatus: isRunning ? (isPaused ? 'PAUSED' : 'RUNNING') : 'IDLE',
              title: (tasks || []).find(t => t.id === selectedTaskId)?.title || 'Tập trung Pomodoro'
            }}
          />

          {/* YouTube Focus Music Player */}
          {showMusicPanel && (
            <YouTubeFocusPlayer />
          )}

          {/* Procedural Web Audio Ambient Sound Mixer */}
          <AmbientMixerWidget />

          {/* Today History Card */}
          {!isZenMode && (
            <div id="today-history-card" className="bg-white dark:bg-[#141E30] rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] overflow-hidden flex flex-col shadow-xs">
              <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-orange-500" /> {isVi ? 'Lịch sử & Biểu đồ hôm nay' : "Today's History & Analytics"}
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  {todaySessions.length} {isVi ? 'phiên' : 'sessions'}
                </span>
              </div>

              {/* Today Hourly Focus Distribution Chart */}
              <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-orange-500" />
                    <span>Biểu đồ nhịp độ 24h</span>
                  </span>
                  {hourlyFocusData.peakMinutes > 0 ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                      🔥 Đỉnh: {hourlyFocusData.peakHour}h00 ({hourlyFocusData.peakMinutes}p)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Hôm nay</span>
                  )}
                </div>

                {/* 24-Hour Bar Chart Columns */}
                <div className="h-16 flex items-end gap-1 pt-1.5 pb-1">
                  {hourlyFocusData.hours.map((h) => {
                    const heightPct = h.minutes > 0 
                      ? Math.max(16, Math.min(100, Math.round((h.minutes / hourlyFocusData.maxMinutes) * 100)))
                      : 6;
                    const isCurrentHour = new Date().getHours() === h.hour;
                    const hasData = h.minutes > 0;

                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                        title={`${h.hour}:00 - ${h.hour + 1}:00 • ${h.minutes} phút tập trung`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-mono whitespace-nowrap shadow-md">
                            {h.hour}h: {h.minutes}p
                          </span>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-t-[3px] transition-all duration-300 ${
                            hasData
                              ? 'bg-gradient-to-t from-orange-600 to-amber-400 shadow-xs'
                              : isCurrentHour
                                ? 'bg-orange-300/40 dark:bg-orange-500/30 animate-pulse'
                                : 'bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Time Axis Labels */}
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-1">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:59</span>
                </div>
              </div>
              <div className="p-3 sm:p-4 space-y-2.5 max-h-56 overflow-y-auto">
                {todaySessions.length === 0 ? (
                  <div className="text-center py-5 text-xs text-slate-400 font-medium">
                    {isVi ? 'Chưa có phiên nào hôm nay. Hãy bắt đầu ngay! ✨' : 'No focus sessions yet today. Start right now! ✨'}
                  </div>
                ) : (
                  todaySessions.map(session => (
                    <div key={session.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{session.title}</h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            session.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60' : 
                            session.status === 'Cancelled' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                          }`}>
                            {isVi ? (session.status === 'Completed' ? 'Hoàn thành' : session.status === 'Cancelled' ? 'Đã hủy' : session.status) : (session.status === 'Completed' ? 'Completed' : session.status === 'Cancelled' ? 'Cancelled' : session.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSessionWithUndo(session.id)}
                            className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title={isVi ? "Xóa phiên này (Hoàn tác 5s)" : "Delete session (5s undo)"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Target className="w-3 h-3 text-orange-500" /> {session.plannedDuration}m</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {isVi ? 'Thực:' : 'Actual:'} {session.actualDuration}m</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODALS & UNDO FLOATING TOASTS                                             */}
      {/* ========================================================================= */}

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
        userName={currentUser?.name}
      />

      {/* Aesthetic Study Receipt ("Strava / Receiptify for Study") */}
      <AestheticStudyReceiptModal
        receipt={studyReceipt}
        onClose={() => setStudyReceipt(null)}
        onOpenStoryModal={() => setShowShareStory(true)}
      />

      {/* Product Synergy: Pomodoro 5m Break Speed Match Mini-Game */}
      <SpeedMatchGameModal
        isOpen={showSpeedMatchBreak}
        onClose={() => setShowSpeedMatchBreak(false)}
      />

      {/* 5-Second Floating Undo Toast for Deleted Sessions */}
      {undoDeletedSession && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-md animate-slide-up text-xs font-semibold">
          <span>{isVi ? `Đã xóa phiên "${undoDeletedSession.title}"` : 'Focus session deleted'}</span>
          <button
            type="button"
            onClick={handleRestoreDeletedSession}
            className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Hoàn tác (5s)' : 'Undo (5s)'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (undoDeleteTimerRef.current) clearTimeout(undoDeleteTimerRef.current);
              setUndoDeletedSession(null);
            }}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}

export default FocusView;
