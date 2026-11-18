import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Video, Clock, Check, Play, Pause, RotateCcw, 
  Award, CheckCircle2, AlertCircle, ExternalLink, Copy, CheckSquare, 
  Sparkles, BookOpen, FileText, Users, Globe, Settings, Flame, 
  Shield, ShieldCheck, Volume2, Maximize2, Headphones, Minimize2, Edit3
} from 'lucide-react';
import { OnlineClassItem, classroomApi } from '../../lib/classroomApiClient';
import { toast } from '../../lib/toast';
import { soundEngine } from '../../lib/soundEngine';
import { ambientSoundMixer } from '../../lib/ambientSoundMixer';
import { StoryShareModal } from '../sharing/StoryShareModal';
import { FocusPetWidget } from '../pet/FocusPetWidget';

interface ClassroomSessionStageProps {
  onlineClass: OnlineClassItem;
  onBack: () => void;
  onUpdateClass?: () => void;
}

type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

interface PersistedTimerState {
  classId: string;
  status: TimerStatus;
  targetEndTime: number | null; // Date.now() timestamp
  pausedRemainingSeconds: number;
  durationSeconds: number;
  totalElapsedSeconds: number;
  lastUpdatedAt: number;
}

const PRESET_DURATIONS = [
  { label: '15p', minutes: 15, desc: 'Khởi động nhanh' },
  { label: '25p', minutes: 25, desc: 'Pomodoro chuẩn' },
  { label: '30p', minutes: 30, desc: 'Tập trung cơ bản' },
  { label: '45p', minutes: 45, desc: 'Tiết học 45 phút' },
  { label: '60p', minutes: 60, desc: '1 Tiếng trọn vẹn' },
  { label: '90p', minutes: 90, desc: 'Deep Work sâu' },
];

export function ClassroomSessionStage({
  onlineClass,
  onBack,
  onUpdateClass
}: ClassroomSessionStageProps) {
  const classId = onlineClass.id;
  const storageKey = `lifeos_classroom_timer_${classId}`;
  const notesStorageKey = `lifeos_classroom_notes_${classId}`;
  const goalsStorageKey = `lifeos_classroom_goals_${classId}`;

  // -------------------------------------------------------------
  // 1. Timer State & Engine
  // -------------------------------------------------------------
  const [durationSeconds, setDurationSeconds] = useState<number>(() => {
    return Math.max(15, (onlineClass.durationMinutes || 60)) * 60;
  });
  const [remainingSeconds, setRemainingSeconds] = useState<number>(durationSeconds);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('IDLE');
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);

  // Custom Duration Modal / Input State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customHours, setCustomHours] = useState('0');
  const [customMinutes, setCustomMinutes] = useState('45');
  const [customSeconds, setCustomSeconds] = useState('0');

  // -------------------------------------------------------------
  // 2. Google Meet & Study Stage State
  // -------------------------------------------------------------
  const [activeStageMode, setActiveStageMode] = useState<'lofi_lounge' | 'pip_companion' | 'direct_iframe'>('lofi_lounge');
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [ambientTracks, setAmbientTracks] = useState(() => ambientSoundMixer.getTracks());
  const [isUserInMeet, setIsUserInMeet] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [hasCreatedTask, setHasCreatedTask] = useState(false);

  const toggleAmbientTrack = (id: 'rain' | 'cafe' | 'keyboard' | 'binaural') => {
    soundEngine.playPop();
    ambientSoundMixer.toggleTrack(id);
    setAmbientTracks(ambientSoundMixer.getTracks());
  };

  const handleVolumeChange = (id: 'rain' | 'cafe' | 'keyboard' | 'binaural', vol: number) => {
    ambientSoundMixer.setTrackVolume(id, vol);
    setAmbientTracks(ambientSoundMixer.getTracks());
  };

  // -------------------------------------------------------------
  // 3. Companion Notes & Goals State
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'timer' | 'notes' | 'goals' | 'participants'>('timer');
  const [sessionNotes, setSessionNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(notesStorageKey) || '';
    } catch {
      return '';
    }
  });
  const [studyGoals, setStudyGoals] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(goalsStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return ['Hoàn thành bài tập & thảo luận', 'Ghi chú các điểm quan trọng'];
  });
  const [newGoalInput, setNewGoalInput] = useState('');

  // Saving session indicator
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 4. Restore Timer on Mount (Resilient Timestamp-based Sync)
  // -------------------------------------------------------------
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: PersistedTimerState = JSON.parse(saved);
        if (parsed.classId === classId) {
          setDurationSeconds(parsed.durationSeconds);
          setTotalElapsedSeconds(parsed.totalElapsedSeconds || 0);

          if (parsed.status === 'RUNNING' && parsed.targetEndTime) {
            const now = Date.now();
            const diff = Math.round((parsed.targetEndTime - now) / 1000);
            if (diff > 0) {
              setRemainingSeconds(diff);
              setTargetEndTime(parsed.targetEndTime);
              setTimerStatus('RUNNING');
            } else {
              // Completed while user was away
              setRemainingSeconds(0);
              setTargetEndTime(null);
              setTimerStatus('COMPLETED');
            }
          } else if (parsed.status === 'PAUSED') {
            setRemainingSeconds(parsed.pausedRemainingSeconds);
            setTimerStatus('PAUSED');
            setTargetEndTime(null);
          } else if (parsed.status === 'COMPLETED') {
            setRemainingSeconds(0);
            setTimerStatus('COMPLETED');
          }
        }
      }
    } catch (e) {
      console.warn('Could not restore classroom timer:', e);
    }
  }, [classId, storageKey]);

  // -------------------------------------------------------------
  // 5. High-Precision Interval Loop (Ticks every 500ms, uses Date.now())
  // -------------------------------------------------------------
  useEffect(() => {
    if (timerStatus !== 'RUNNING' || !targetEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((targetEndTime - now) / 1000));
      setRemainingSeconds(diff);

      // Persist state periodically
      const elapsed = Math.max(0, durationSeconds - diff);
      setTotalElapsedSeconds(elapsed);

      const state: PersistedTimerState = {
        classId,
        status: diff === 0 ? 'COMPLETED' : 'RUNNING',
        targetEndTime,
        pausedRemainingSeconds: diff,
        durationSeconds,
        totalElapsedSeconds: elapsed,
        lastUpdatedAt: now
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {}

      if (diff === 0) {
        clearInterval(interval);
        handleTimerCompleted(elapsed);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [timerStatus, targetEndTime, durationSeconds, classId, storageKey]);

  // Handle Timer Completed
  const handleTimerCompleted = async (elapsed: number) => {
    setTimerStatus('COMPLETED');
    setTargetEndTime(null);
    soundEngine.playLevelUpFanfare();
    toast.show('🎉 Chúc mừng bạn đã hoàn thành phiên học!', 'success');

    // Automatically record studied minutes to database
    const minutesToRecord = Math.max(1, Math.round(elapsed / 60));
    await recordSessionToDatabase(minutesToRecord);
  };

  // Record session to database
  const recordSessionToDatabase = async (minutes: number) => {
    if (minutes < 1 || isSavingSession) return;
    try {
      setIsSavingSession(true);
      const res = await classroomApi.recordStudySession(classId, {
        durationMinutes: minutes,
        notes: sessionNotes || `Hoàn thành phiên học trực tuyến: ${onlineClass.title}`
      });
      if (res.success) {
        setSavedSuccessMessage(`Đã ghi nhận ${res.recordedMinutes} phút học (+${res.xpEarned} XP) vào hồ sơ!`);
        toast.show(`Đã cộng dồn ${res.recordedMinutes} phút học vào bảng xếp hạng!`, 'success');
        if (onUpdateClass) onUpdateClass();
      }
    } catch (err: any) {
      console.warn('Record session issue:', err);
    } finally {
      setIsSavingSession(false);
    }
  };

  // -------------------------------------------------------------
  // 6. Timer Control Handlers
  // -------------------------------------------------------------
  const handleStartTimer = () => {
    soundEngine.playPop();
    const now = Date.now();
    const target = now + remainingSeconds * 1000;
    setTargetEndTime(target);
    setTimerStatus('RUNNING');

    const state: PersistedTimerState = {
      classId,
      status: 'RUNNING',
      targetEndTime: target,
      pausedRemainingSeconds: remainingSeconds,
      durationSeconds,
      totalElapsedSeconds,
      lastUpdatedAt: now
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  };

  const handlePauseTimer = () => {
    soundEngine.playPop();
    setTimerStatus('PAUSED');
    setTargetEndTime(null);

    const state: PersistedTimerState = {
      classId,
      status: 'PAUSED',
      targetEndTime: null,
      pausedRemainingSeconds: remainingSeconds,
      durationSeconds,
      totalElapsedSeconds,
      lastUpdatedAt: Date.now()
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  };

  const handleResetTimer = () => {
    soundEngine.playPop();
    setTimerStatus('IDLE');
    setTargetEndTime(null);
    setRemainingSeconds(durationSeconds);
    setTotalElapsedSeconds(0);
    setSavedSuccessMessage(null);

    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const handleSelectPreset = (minutes: number) => {
    soundEngine.playPop();
    const secs = minutes * 60;
    setDurationSeconds(secs);
    setRemainingSeconds(secs);
    setTimerStatus('IDLE');
    setTargetEndTime(null);
    setTotalElapsedSeconds(0);
    setSavedSuccessMessage(null);

    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const handleApplyCustomDuration = () => {
    const h = Math.max(0, parseInt(customHours, 10) || 0);
    const m = Math.max(0, parseInt(customMinutes, 10) || 0);
    const s = Math.max(0, parseInt(customSeconds, 10) || 0);
    const totalSecs = h * 3600 + m * 60 + s;

    if (totalSecs < 10) {
      toast.show('Thời lượng tối thiểu là 10 giây', 'error');
      return;
    }
    if (totalSecs > 480 * 60) {
      toast.show('Thời lượng tối đa là 8 tiếng', 'error');
      return;
    }

    soundEngine.playPop();
    setDurationSeconds(totalSecs);
    setRemainingSeconds(totalSecs);
    setTimerStatus('IDLE');
    setTargetEndTime(null);
    setTotalElapsedSeconds(0);
    setShowCustomModal(false);
    setSavedSuccessMessage(null);

    try {
      localStorage.removeItem(storageKey);
    } catch {}
    toast.show(`Đã đặt thời lượng học: ${Math.floor(totalSecs / 60)} phút`, 'success');
  };

  const handleEndSessionEarly = async () => {
    soundEngine.playPop();
    const elapsedMinutes = Math.round(totalElapsedSeconds / 60);
    if (elapsedMinutes < 1) {
      toast.show('Bạn đã học dưới 1 phút. Chưa đủ điều kiện cộng dồn vào hồ sơ.', 'info');
      handleResetTimer();
      return;
    }

    if (window.confirm(`Bạn muốn kết thúc buổi học và lưu ${elapsedMinutes} phút học vào hồ sơ?`)) {
      setTimerStatus('COMPLETED');
      setTargetEndTime(null);
      await recordSessionToDatabase(elapsedMinutes);
    }
  };

  // -------------------------------------------------------------
  // 7. Google Meet Pop-up Window Launcher
  // -------------------------------------------------------------
  const openMeetPopup = () => {
    if (!onlineClass.meetUrl) {
      toast.show('Chưa có liên kết Google Meet cho lớp học này', 'error');
      return;
    }
    soundEngine.playPop();
    const width = 960;
    const height = 640;
    const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.height - height) / 2));

    window.open(
      onlineClass.meetUrl,
      `lifeos_meet_${classId}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );
    setIsUserInMeet(true);
    toast.show('Đã mở cửa sổ Google Meet nổi! Bạn có thể vừa học vừa ghi chú tại đây.', 'success');
  };

  const handleCopyMeetLink = () => {
    if (!onlineClass.meetUrl) return;
    navigator.clipboard.writeText(onlineClass.meetUrl);
    soundEngine.playPop();
    setHasCopiedLink(true);
    toast.show('Đã sao chép liên kết Google Meet!', 'success');
    setTimeout(() => setHasCopiedLink(false), 2500);
  };

  const handleCreatePrepTask = async () => {
    try {
      setIsCreatingTask(true);
      const res = await classroomApi.createPrepTask(classId);
      if (res.success) {
        soundEngine.playPop();
        setHasCreatedTask(true);
        toast.show(res.message, 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể tạo nhiệm vụ chuẩn bị', 'error');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // -------------------------------------------------------------
  // 8. Notes & Goals Handlers
  // -------------------------------------------------------------
  const handleSaveNotes = (val: string) => {
    setSessionNotes(val);
    try {
      localStorage.setItem(notesStorageKey, val);
    } catch {}
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;
    const next = [...studyGoals, newGoalInput.trim()];
    setStudyGoals(next);
    setNewGoalInput('');
    try {
      localStorage.setItem(goalsStorageKey, JSON.stringify(next));
    } catch {}
  };

  const handleRemoveGoal = (idx: number) => {
    const next = studyGoals.filter((_, i) => i !== idx);
    setStudyGoals(next);
    try {
      localStorage.setItem(goalsStorageKey, JSON.stringify(next));
    } catch {}
  };

  // -------------------------------------------------------------
  // Formatting Helpers
  // -------------------------------------------------------------
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = durationSeconds > 0 
    ? Math.min(100, Math.max(0, Math.round(((durationSeconds - remainingSeconds) / durationSeconds) * 100)))
    : 0;

  // SVG Circular progress params
  const circleRadius = 88;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (progressPercent / 100) * circleCircumference;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Navigation & Action Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Trở về danh sách lớp học"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                <Video className="w-3 h-3" />
                <span>Phòng Học Trực Tuyến</span>
              </span>
              {onlineClass.googleEventLink && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[11px] flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>Google Calendar</span>
                </span>
              )}
            </div>
            <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight mt-1">
              {onlineClass.title}
            </h2>
            {onlineClass.description && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {onlineClass.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Header Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowStoryModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Xuất thẻ ảnh thành tích Story chuẩn Instagram / Threads"
          >
            <span>📱 Khoe Story (9:16)</span>
          </button>

          {onlineClass.meetUrl && (
            <>
              <button
                type="button"
                onClick={openMeetPopup}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Mở Cửa Sổ Nổi Google Meet</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleCopyMeetLink}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sao chép link Google Meet"
              >
                {hasCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{hasCopiedLink ? 'Đã chép' : 'Chép link'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleCreatePrepTask}
            disabled={isCreatingTask || hasCreatedTask}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              hasCreatedTask
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>{hasCreatedTask ? 'Đã tạo task' : 'Tạo task chuẩn bị'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Meet Experience Stage (Left) & Custom Study Timer Hub (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ======================================================== */}
        {/* LEFT / CENTER: Interactive Meeting Stage (7 Cols) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
            {/* Header Stage Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Không Gian Phòng Học Trực Tuyến
                </span>
              </div>

              {/* Mode Toggle */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveStageMode('lofi_lounge')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeStageMode === 'lofi_lounge'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>☕ Lofi Cafe Chill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStageMode('pip_companion')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeStageMode === 'pip_companion'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Cửa sổ nổi Meet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStageMode('direct_iframe')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeStageMode === 'direct_iframe'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Thử nhúng Iframe
                </button>
              </div>
            </div>

            {/* STAGE MODE A: Cozy Lofi Cafe & Silent Companion */}
            {activeStageMode === 'lofi_lounge' ? (
              <div className="space-y-4">
                {/* Atmospheric Cozy Room Canvas */}
                <div className="relative h-64 sm:h-72 rounded-2xl bg-gradient-to-br from-[#121826] via-[#1A1F2C] to-[#0D1117] p-5 overflow-hidden border border-slate-800 flex flex-col justify-between shadow-inner">
                  {/* Window with Raindrops */}
                  <div className="absolute top-4 right-5 w-28 h-36 rounded-xl border border-blue-400/20 bg-blue-950/20 backdrop-blur-xs flex flex-col justify-around p-2 overflow-hidden opacity-60">
                    <div className="text-[10px] text-blue-300/60 font-mono text-center">🌧️ Bên ngoài</div>
                    <div className="flex justify-around animate-pulse">
                      <span className="w-0.5 h-4 bg-blue-400/40 rounded-full" />
                      <span className="w-0.5 h-6 bg-blue-400/60 rounded-full mt-2" />
                      <span className="w-0.5 h-3 bg-blue-400/30 rounded-full" />
                    </div>
                  </div>

                  {/* Top Status */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Không Gian Học Tập Cozy Lofi
                      </span>
                    </div>
                    {onlineClass.meetUrl && (
                      <button
                        type="button"
                        onClick={openMeetPopup}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Bật Meet Cửa Sổ Nổi</span>
                      </button>
                    )}
                  </div>

                  {/* Cozy Desk Scene Graphic */}
                  <div className="flex items-end justify-between px-4 z-10">
                    {/* Steaming Coffee & Cat */}
                    <div className="flex items-end gap-4">
                      {/* Coffee Mug */}
                      <div className="relative flex flex-col items-center">
                        <span className="text-xs text-amber-200/60 animate-bounce -mb-1">♨️</span>
                        <div className="w-9 h-8 rounded-b-xl rounded-t-sm bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/40 shadow-md flex items-center justify-center text-[10px]">
                          ☕
                        </div>
                      </div>

                      {/* Sleeping Cat */}
                      <div className="flex flex-col items-center select-none group cursor-pointer" onClick={() => soundEngine.playPop()}>
                        <span className="text-3xl filter drop-shadow animate-pulse">🐱</span>
                        <span className="text-[9px] text-slate-400 font-medium">Bé Mèo ngủ ngày</span>
                      </div>
                    </div>

                    {/* Warm Desk Lamp Light */}
                    <div className="flex flex-col items-end">
                      <div className="w-14 h-14 rounded-full bg-amber-400/15 blur-lg animate-pulse" />
                      <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                        💡 Ánh đèn ấm cúng
                      </div>
                    </div>
                  </div>

                  {/* Inspiring Bottom Banner */}
                  <div className="z-10 p-2.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate">🎯 Đang tập trung: <strong>{onlineClass.title}</strong></span>
                    <span className="text-emerald-400 font-bold shrink-0 ml-2">Zero Distraction</span>
                  </div>
                </div>

                {/* Built-in Multi-Track Soundscape Mixer */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-emerald-500" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                        Bộ Hòa Âm Thư Giãn (Ambient Soundscape)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Chạy offline 100% bằng Web Audio
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ambientTracks.map(track => (
                      <div 
                        key={track.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          track.active
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <button
                            type="button"
                            onClick={() => toggleAmbientTrack(track.id)}
                            className="flex items-center gap-2 font-bold text-xs cursor-pointer"
                          >
                            <span>{track.icon}</span>
                            <span>{track.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAmbientTrack(track.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              track.active
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {track.active ? 'Đang bật' : 'Bật'}
                          </button>
                        </div>

                        {track.active && (
                          <div className="flex items-center gap-2 pt-1">
                            <Volume2 className="w-3 h-3 text-slate-400" />
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={track.volume}
                              onChange={e => handleVolumeChange(track.id, parseFloat(e.target.value))}
                              className="w-full accent-emerald-500 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                              {Math.round(track.volume * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeStageMode === 'pip_companion' ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0B1120] to-slate-900 text-white space-y-5 border border-slate-800 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Trải nghiệm học tập tập trung không phân tâm
                    </span>
                    <h3 className="font-bold text-base sm:text-lg">
                      Google Meet Companion Hub
                    </h3>
                  </div>

                  {/* Meeting Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      isUserInMeet 
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 animate-pulse'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      <Video className="w-3.5 h-3.5" />
                      <span>{isUserInMeet ? 'Đang trong cuộc họp Meet' : 'Chưa kết nối thoại'}</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Chính sách bảo mật Google:</strong> Google Meet chặn nhúng iframe tùy tiện (qua chỉ thị <code className="text-emerald-300">X-Frame-Options: SAMEORIGIN</code>) để bảo vệ tài khoản của bạn. LifeOS tối ưu bằng cách mở cuộc gọi trong <strong>Cửa sổ nổi độc lập</strong> để bạn vừa bật cam/mic vừa dùng đồng hồ bấm giờ và ghi chú ở đây.
                    </p>
                  </div>
                </div>

                {/* Primary Meet Triggers */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {onlineClass.meetUrl ? (
                    <>
                      <button
                        type="button"
                        onClick={openMeetPopup}
                        className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                        <span>Mở Cửa Sổ Nổi Google Meet</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={onlineClass.meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsUserInMeet(true)}
                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Mở Tab Mới</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setIsUserInMeet(!isUserInMeet)}
                        className="px-3 py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {isUserInMeet ? '✓ Bấm nếu đã rời Meet' : 'Đánh dấu: Đang trong Meet'}
                      </button>
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs w-full">
                      ⚠️ Buổi học này chưa có liên kết Google Meet. Bạn hãy bấm vào nút Chỉnh sửa ở danh sách để thêm đường dẫn.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* STAGE MODE B: Direct Iframe Attempt with Fallback */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Giao diện Đồng bộ Google Meet:</span>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                        Google Meet chặn nhúng iframe tùy tiện (bảo vệ tài khoản qua chính sách SameOrigin). LifeOS đồng bộ cuộc họp qua Cửa Sổ Nổi kết hợp Đồng Hồ Đếm Giờ và Ghi Chú trực tiếp tại đây!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openMeetPopup}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                  >
                    <span>Mở Meet ↗</span>
                  </button>
                </div>

                <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0d111a] relative flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl shadow-lg">
                    🎥
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="text-base font-bold text-white">
                      {onlineClass.title}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {onlineClass.meetUrl || 'Đang chuẩn bị phòng học...'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={openMeetPopup}
                      className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Tham gia Google Meet ngay</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Companion Workspace Tabs (Notes, Goals, Participants) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'notes'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Sổ tay ghi chú bài học</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('goals')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'goals'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mục tiêu buổi học ({studyGoals.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('participants')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'participants'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Học viên ({onlineClass.participants?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Notes Scratchpad */}
              {activeTab === 'notes' && (
                <div className="space-y-2 animate-in fade-in duration-100">
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => handleSaveNotes(e.target.value)}
                    placeholder="Ghi nhanh ý chính của buổi học tại đây... (Tự động lưu vào trình duyệt của bạn)"
                    rows={4}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>Nội dung ghi chú này sẽ được lưu kèm vào lịch sử buổi học khi bạn kết thúc timer.</span>
                    <span className="font-mono">{sessionNotes.length} ký tự</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Study Goals */}
              {activeTab === 'goals' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <form onSubmit={handleAddGoal} className="flex gap-2">
                    <input
                      type="text"
                      value={newGoalInput}
                      onChange={(e) => setNewGoalInput(e.target.value)}
                      placeholder="Thêm mục tiêu bạn muốn đạt được trong buổi học này..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Thêm
                    </button>
                  </form>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {studyGoals.map((g, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                      >
                        <span className="text-slate-800 dark:text-slate-200 font-medium">🎯 {g}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveGoal(idx)}
                          className="text-slate-400 hover:text-rose-500 text-[11px] ml-2"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Participants */}
              {activeTab === 'participants' && (
                <div className="space-y-2 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                    <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        👑
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {onlineClass.hostName || 'Chủ phòng (Host)'}
                        </p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Tổ chức lớp học</p>
                      </div>
                    </div>

                    {onlineClass.participants?.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                          {p.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{p.email}</p>
                          <p className="text-[10px] text-slate-400">{p.registered ? 'Thành viên LifeOS' : 'Được mời qua email'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT: Custom Study Timer Hub (5 Cols) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-5">
            {/* Timer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Đồng Hồ Học Tập (Custom Timer)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Tùy chỉnh giờ</span>
              </button>
            </div>

            {/* Quick Presets Carousel */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Chọn nhanh thời lượng:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_DURATIONS.map((preset) => {
                  const isSelected = durationSeconds === preset.minutes * 60;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => handleSelectPreset(preset.minutes)}
                      className={`p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <div className="text-sm font-bold">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Circular Progress & Clock Visualizer */}
            <div className="py-2 flex flex-col items-center justify-center relative">
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="104"
                    cy="104"
                    r={circleRadius}
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Dynamic Progress Stroke */}
                  <circle
                    cx="104"
                    cy="104"
                    r={circleRadius}
                    className={`transition-all duration-500 ease-out ${
                      timerStatus === 'COMPLETED'
                        ? 'stroke-emerald-400'
                        : timerStatus === 'PAUSED'
                        ? 'stroke-amber-400'
                        : 'stroke-emerald-500'
                    }`}
                    strokeWidth="10"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Inner Digital Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  {/* Status Pill */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 ${
                    timerStatus === 'RUNNING'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-pulse'
                      : timerStatus === 'PAUSED'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : timerStatus === 'COMPLETED'
                      ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {timerStatus === 'RUNNING' && 'ĐANG TẬP TRUNG'}
                    {timerStatus === 'PAUSED' && 'ĐANG TẠM DỪNG'}
                    {timerStatus === 'COMPLETED' && 'HOÀN THÀNH'}
                    {timerStatus === 'IDLE' && 'SẴN SÀNG'}
                  </span>

                  {/* Big Digital Clock */}
                  <div className="font-black text-3xl sm:text-4xl text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
                    {formatTime(remainingSeconds)}
                  </div>

                  {/* Progress ratio */}
                  <div className="text-[11px] text-slate-400 font-medium mt-1">
                    Đã học {Math.floor(totalElapsedSeconds / 60)} / {Math.floor(durationSeconds / 60)}p ({progressPercent}%)
                  </div>
                </div>
              </div>

              {/* Saved Success Toast Notification */}
              {savedSuccessMessage && (
                <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-xs animate-in fade-in">
                  <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{savedSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* Timer Primary Action Controls */}
            <div className="space-y-2 pt-1">
              {timerStatus === 'IDLE' && (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Bắt Đầu Phiên Học</span>
                </button>
              )}

              {timerStatus === 'RUNNING' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePauseTimer}
                    className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Tạm Dừng</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Đặt Lại</span>
                  </button>
                </div>
              )}

              {timerStatus === 'PAUSED' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Tiếp Tục Học</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Đặt Lại</span>
                  </button>
                </div>
              )}

              {timerStatus === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Bắt Đầu Phiên Học Mới</span>
                </button>
              )}

              {/* End session early button */}
              {(timerStatus === 'RUNNING' || timerStatus === 'PAUSED') && totalElapsedSeconds >= 60 && (
                <button
                  type="button"
                  onClick={handleEndSessionEarly}
                  disabled={isSavingSession}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors text-center cursor-pointer"
                >
                  {isSavingSession ? 'Đang lưu vào hồ sơ...' : `Kết thúc sớm & Lưu ${Math.round(totalElapsedSeconds / 60)} phút vào hồ sơ`}
                </button>
              )}
            </div>

            {/* Resilient Timing Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Đồng bộ thời gian chuẩn xác:</strong> Bộ đếm sử dụng timestamp thực từ máy chủ và lưu liên tục vào session. Dù bạn chuyển tab, gập máy laptop hay bấm F5, đồng hồ vẫn chạy đúng từng giây và không bao giờ bị lệch.
              </span>
            </div>

            {/* Embedded Study Cheer Mascot & Pet */}
            <FocusPetWidget
              embedded={true}
              studyContext={{
                isRunning: timerStatus === 'RUNNING',
                timerStatus,
                title: onlineClass.title
              }}
            />
          </div>
        </div>
      </div>

      {/* Custom Duration Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>Tùy Chỉnh Thời Lượng Học</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Nhập chính xác thời gian bạn muốn dành cho buổi học này:
            </p>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Giờ</label>
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  className="w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Phút</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Giây</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(e.target.value)}
                  className="w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDuration}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Áp Dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Viral 1-Click Story Share Modal */}
      <StoryShareModal
        isOpen={showStoryModal}
        onClose={() => setShowStoryModal(false)}
        overrideStudyMinutes={Math.max(1, Math.round(totalElapsedSeconds / 60))}
      />
    </div>
  );
}
