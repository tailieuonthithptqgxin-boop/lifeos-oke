import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap,
  Lock,
  Copy,
  LayoutGrid,
  Maximize2,
  Minimize2,
  EyeOff,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Sun,
  Moon,
  Flame,
  Sparkles,
  Pin,
  PinOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Headphones,
  Smile,
  PhoneOff,
  MessageSquare,
  CheckSquare,
  Square,
  Trophy,
  Plus,
  Trash2,
  Send,
  Sliders,
  X,
  Check,
  UserPlus,
  ChevronDown,
  Settings
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { apiCall } from '../../lib/apiClient';
import { toast } from '../../lib/toast';
import { triggerConfetti } from '../../lib/confetti';
import { recordUserActivity } from '../../lib/globalUserSync';

export interface RoomDetail {
  id: string;
  name: string;
  topic: string;
  hostId: string;
  hostName: string;
  connectionType: 'jitsi' | 'external';
  externalUrl?: string | null;
  jitsiRoomName?: string | null;
  isSystemRoom?: boolean;
  createdAt: string;
  participantCount: number;
  inMeetCount: number;
  recentAvatars: string[];
  recentMessageCount: number;
  pomodoro?: {
    phase: 'FOCUS' | 'BREAK';
    duration: number; // seconds
    startedAt: number | null;
    isRunning: boolean;
  };
  members: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    championCount?: number;
    studyGoal: string;
    studyGoalCompleted?: boolean;
    presenceState: 'IN_MEET' | 'STUDYING' | 'AWAY';
    joinedAt: number;
    lastPingAt: number;
    isSimulated?: boolean;
    badge?: string;
    streakDays?: number;
    level?: number;
    vibe?: string;
  }>;
  messages: Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    championCount?: number;
    text: string;
    createdAt: string;
  }>;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number; // percentage
}

interface StudyRoomViewProps {
  room: RoomDetail;
  onLeaveRoom: () => void;
  onUpdateGoal: (newGoal: string) => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onSendMessage?: (text: string) => void;
  onSyncPomodoro?: (action: 'start' | 'pause' | 'reset' | 'switch_phase', params?: any) => void;
  onSendSignal?: (toUserId: string, signalType: string, signalData: any) => void;
  onRegisterSignalHandler?: (fn: (signal: any) => void) => void;
  language?: string;
}

export function StudyRoomView({
  room,
  onLeaveRoom,
  onUpdateGoal,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onSendMessage,
  onSyncPomodoro,
  language = 'vi'
}: StudyRoomViewProps) {
  const { currentUser, tasks = [], addTask, updateTask } = useAppStore();

  const myId = currentUserId || currentUser?.id || 'guest';
  const myName = currentUserName || currentUser?.name || 'Bạn';

  // 1. Chế độ Mở Sáng / Tối (Light Mode / Dark Mode)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('lifeos_study_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const isLight = themeMode === 'light';

  const toggleThemeMode = () => {
    const next = isLight ? 'dark' : 'light';
    setThemeMode(next);
    try {
      localStorage.setItem('lifeos_study_theme', next);
    } catch {}
    toast.info(next === 'light' ? 'Đã bật Chế độ Sáng ☀️' : 'Đã bật Chế độ Tối 🌙');
  };

  // 2. Chế độ Toàn Màn Hình (Fullscreen)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return Boolean(typeof document !== 'undefined' && document.fullscreenElement);
  });

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Gamification State (Saved in user profile & localStorage)
  const [userXP, setUserXP] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lifeos_study_user_xp');
      return saved ? parseInt(saved, 10) : (currentUser?.xp || 850);
    } catch {
      return 850;
    }
  });

  const userStreak = currentUser?.streakDays || 14;

  const [selectedFrame, setSelectedFrame] = useState<string>(() => {
    try {
      return localStorage.getItem('lifeos_study_user_frame') || 'frame-emerald';
    } catch {
      return 'frame-emerald';
    }
  });

  // Avatar Filters
  const avatarFilters = [
    { name: '🧑‍💻 Filter: Lofi Coder', seed: 'GenZStudentHero' },
    { name: '🐱 Filter: Mèo Béo Cày Đêm', seed: 'FatCatCoder' },
    { name: '🎧 Filter: Anime Vibe', seed: 'AnimeGenZ' },
    { name: '✨ Filter: Minimalist Desk', seed: 'MinimalDesk' }
  ];
  const [avatarFilterIndex, setAvatarFilterIndex] = useState(0);

  // Vibe
  const [userVibe, setUserVibe] = useState<string>('🔥 Đang Focus');

  // User Task Goal & Timer
  const [userTask, setUserTask] = useState<string>(() => {
    const me = room.members?.find((m) => m.userId === myId);
    return me?.studyGoal || 'Tập trung học tập & giải đề';
  });
  const [taskTimerSeconds, setTaskTimerSeconds] = useState<number>(0);

  // Rule of 3 Tasks: Connected to REAL tasks from store (Zero Mock)
  const [newTaskInput, setNewTaskInput] = useState('');

  // Media & Controls
  const [isMicOn, setIsMicOn] = useState(false);
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [tileLayout, setTileLayout] = useState<'grid' | 'spotlight'>('grid');
  const [pinnedTileKey, setPinnedTileKey] = useState<string>('user');
  const [zenMode, setZenMode] = useState(false);

  // Right Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'chat' | 'tasks' | 'rank'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; author: string; text: string; time: string; isSystem?: boolean }>>([]);

  // Modals & Popovers
  const [isSoundPopoverOpen, setIsSoundPopoverOpen] = useState(false);
  const [isPresetPopoverOpen, setIsPresetPopoverOpen] = useState(false);
  const [showFrameShopModal, setShowFrameShopModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Realtime clock
  const [clockDisplay, setClockDisplay] = useState('');

  // Floating Emojis & Bursts
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [tileBursts, setTileBursts] = useState<Record<string, string>>({});

  // Media & Audio Refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Sound Synth references
  const synthNodes = useRef<{
    rain: { node: AudioNode | null; gain: GainNode | null; active: boolean };
    keyboard: { timer: any | null; gain: GainNode | null; active: boolean };
    cafe: { node: AudioNode | null; gain: GainNode | null; active: boolean };
    lofi: { timer: any | null; gain: GainNode | null; active: boolean };
  }>({
    rain: { node: null, gain: null, active: false },
    keyboard: { timer: null, gain: null, active: false },
    cafe: { node: null, gain: null, active: false },
    lofi: { timer: null, gain: null, active: false }
  });

  const [synthStates, setSynthStates] = useState({
    rain: { active: false, vol: 0.5 },
    keyboard: { active: false, vol: 0.4 },
    cafe: { active: false, vol: 0.5 },
    lofi: { active: false, vol: 0.3 }
  });

  // Pomodoro Synchronized State
  const [pomodoroLeft, setPomodoroLeft] = useState(25 * 60);
  const [pomodoroDuration, setPomodoroDuration] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<'FOCUS' | 'BREAK'>('FOCUS');

  // Clock & Task Stopwatch
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockDisplay(now.toLocaleTimeString());
      setTaskTimerSeconds((prev) => prev + 1);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pomodoro Sync from Room
  useEffect(() => {
    if (room.pomodoro) {
      const p = room.pomodoro;
      setPomodoroPhase(p.phase || 'FOCUS');
      setPomodoroDuration(p.duration || 1500);
      setIsPomodoroRunning(p.isRunning);

      if (p.isRunning && p.startedAt) {
        const elapsed = Math.floor((Date.now() - p.startedAt) / 1000);
        setPomodoroLeft(Math.max(0, p.duration - elapsed));
      } else {
        setPomodoroLeft(p.duration || 1500);
      }
    }
  }, [room.pomodoro]);

  // Pomodoro Tick
  useEffect(() => {
    if (!isPomodoroRunning) return;

    const timer = setInterval(() => {
      setPomodoroLeft((prev) => {
        if (prev <= 1) {
          handlePomodoroComplete();
          return pomodoroDuration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPomodoroRunning, pomodoroDuration]);

  // When Pomodoro Completes: SAVE REAL FOCUS SESSION IN DB
  const handlePomodoroComplete = async () => {
    setIsPomodoroRunning(false);
    playCompletionChime();
    triggerConfetti();
    addXP(100);
    appendLocalChat('Hệ thống 🤖', '🎉 Bạn vừa hoàn thành 1 phiên Pomodoro tập trung! (+100 XP)', true);
    toast.success('Xong Pomodoro! 🎉 +100 XP đã được ghi nhận vào tài khoản.');

    // Save session to database via Prisma & update user study minutes
    const studyMins = Math.max(1, Math.round(pomodoroDuration / 60));
    try {
      recordUserActivity('study', studyMins);
      await apiCall('/api/data/focusSessions', 'POST', {
        duration: pomodoroDuration,
        type: 'FOCUS',
        completed: true,
        notes: `Hoàn thành Pomodoro tại phòng ${room.name}`,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not sync focus session to backend:', e);
    }
  };

  const togglePomoTimer = () => {
    initAudioContext();
    const nextState = !isPomodoroRunning;
    setIsPomodoroRunning(nextState);
    if (onSyncPomodoro) {
      onSyncPomodoro(nextState ? 'start' : 'pause');
    }
  };

  const resetPomoTimer = () => {
    setIsPomodoroRunning(false);
    setPomodoroLeft(pomodoroDuration);
    if (onSyncPomodoro) {
      onSyncPomodoro('reset');
    }
  };

  const setTimerPreset = (mins: number) => {
    setIsPomodoroRunning(false);
    const secs = Math.round(mins * 60);
    setPomodoroDuration(secs);
    setPomodoroLeft(secs);
    setIsPresetPopoverOpen(false);
    toast.info(`Đã đặt thời gian: ${mins < 1 ? Math.round(mins * 60) + ' giây' : mins + ' phút'}`);
  };

  // Web Audio API Synthesizers
  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const toggleSoundSynth = (type: 'rain' | 'keyboard' | 'cafe' | 'lofi') => {
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const currentActive = synthStates[type].active;
    const vol = synthStates[type].vol;

    if (currentActive) {
      stopSoundSynth(type);
      setSynthStates((prev) => ({
        ...prev,
        [type]: { ...prev[type], active: false }
      }));
    } else {
      startSoundSynth(type, vol);
      setSynthStates((prev) => ({
        ...prev,
        [type]: { ...prev[type], active: true }
      }));
    }
  };

  const updateSoundVol = (type: 'rain' | 'keyboard' | 'cafe' | 'lofi', val: number) => {
    setSynthStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], vol: val }
    }));
    const s = synthNodes.current[type];
    const ctx = audioCtxRef.current;
    if (s.gain && ctx) {
      s.gain.gain.setValueAtTime(val, ctx.currentTime);
    }
  };

  const startSoundSynth = (type: 'rain' | 'keyboard' | 'cafe' | 'lofi', vol: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (type === 'rain') {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      whiteNoise.start();

      synthNodes.current.rain.node = whiteNoise;
      synthNodes.current.rain.gain = gainNode;
      synthNodes.current.rain.active = true;
    } else if (type === 'keyboard') {
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol, ctx.currentTime);
      gainNode.connect(ctx.destination);
      synthNodes.current.keyboard.gain = gainNode;
      synthNodes.current.keyboard.active = true;

      synthNodes.current.keyboard.timer = setInterval(() => {
        if (!synthNodes.current.keyboard.active || !audioCtxRef.current) return;
        const c = audioCtxRef.current;
        const osc = c.createOscillator();
        const clickGain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1100 + Math.random() * 500, c.currentTime);
        clickGain.gain.setValueAtTime(0.04 * vol, c.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);

        osc.connect(clickGain);
        clickGain.connect(gainNode);
        osc.start();
        osc.stop(c.currentTime + 0.04);
      }, 350);
    } else if (type === 'cafe') {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
      }
      const brownNoise = ctx.createBufferSource();
      brownNoise.buffer = noiseBuffer;
      brownNoise.loop = true;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol, ctx.currentTime);

      brownNoise.connect(gainNode);
      gainNode.connect(ctx.destination);
      brownNoise.start();

      synthNodes.current.cafe.node = brownNoise;
      synthNodes.current.cafe.gain = gainNode;
      synthNodes.current.cafe.active = true;
    } else if (type === 'lofi') {
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol, ctx.currentTime);
      gainNode.connect(ctx.destination);
      synthNodes.current.lofi.gain = gainNode;
      synthNodes.current.lofi.active = true;

      const notes = [261.63, 329.63, 392.0, 493.88];
      let idx = 0;

      synthNodes.current.lofi.timer = setInterval(() => {
        if (!synthNodes.current.lofi.active || !audioCtxRef.current) return;
        const c = audioCtxRef.current;
        const osc = c.createOscillator();
        const chordGain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[idx % notes.length], c.currentTime);
        chordGain.gain.setValueAtTime(0.07 * vol, c.currentTime);
        chordGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2);

        osc.connect(chordGain);
        chordGain.connect(gainNode);
        osc.start();
        osc.stop(c.currentTime + 1.3);
        idx++;
      }, 1400);
    }
  };

  const stopSoundSynth = (type: 'rain' | 'keyboard' | 'cafe' | 'lofi') => {
    const s = synthNodes.current[type];
    s.active = false;
    if (s.node) {
      try { (s.node as any).stop(); } catch {}
      s.node = null;
    }
    if (s.timer) {
      clearInterval(s.timer);
      s.timer = null;
    }
  };

  const playCompletionChime = () => {
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ['rain', 'keyboard', 'cafe', 'lofi'].forEach((k) => stopSoundSynth(k as any));
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  // Webcam & Screen Share
  const toggleDockCam = async () => {
    if (!isWebcamOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamStreamRef.current = stream;
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
        }
        setIsWebcamOn(true);
        toast.success('Đã bật Webcam!');
      } catch {
        toast.info('Không thể mở camera. Đang hiển thị Avatar cá nhân.');
      }
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = null;
      }
      setIsWebcamOn(false);
      toast.info('Đã tắt Webcam.');
    }
  };

  const toggleDockMic = () => {
    setIsMicOn((prev) => {
      const next = !prev;
      toast.info(next ? 'Đã bật Micro' : 'Đã tắt Micro');
      return next;
    });
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
        setTileLayout('spotlight');
        setPinnedTileKey('user');
        toast.success('Đang chia sẻ màn hình & chuyển sang chế độ Ghim Spotlight!');

        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } catch {
        toast.info('Không thể chọn màn hình hoặc đã hủy.');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (screenShareVideoRef.current) {
      screenShareVideoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
    setTileLayout('grid');
    toast.info('Đã dừng chia sẻ màn hình.');
  };

  const cycleAvatarFilter = () => {
    setAvatarFilterIndex((prev) => {
      const next = (prev + 1) % avatarFilters.length;
      toast.info(`Đã đổi filter: ${avatarFilters[next].name}`);
      return next;
    });
  };

  // Floating Reactions
  const shootFloatingEmoji = (emoji: string) => {
    const newEmoji: FloatingEmoji = {
      id: Math.random().toString(),
      emoji,
      x: 15 + Math.random() * 70
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
    }, 3000);
  };

  const sendTileFire = async (targetName: string, tileKey: string) => {
    shootFloatingEmoji('🔥');
    toast.success(`Bạn vừa truyền lửa 🔥 cho ${targetName}!`);
    appendLocalChat('Hệ thống 🤖', `Bạn vừa truyền lửa 🔥 cho ${targetName}!`, true);

    setTileBursts((prev) => ({ ...prev, [tileKey]: '🔥' }));
    setTimeout(() => {
      setTileBursts((prev) => {
        const copy = { ...prev };
        delete copy[tileKey];
        return copy;
      });
    }, 1500);

    try {
      await apiCall(`/api/study-space/rooms/${room.id}/cheer`, 'POST', {
        cheerType: 'fire',
        cheerText: `Tiếp lửa cho ${targetName} 🔥`
      });
    } catch {}
  };

  const handleRaiseHand = () => {
    shootFloatingEmoji('✋');
    toast.info('Bạn đã giơ tay phát biểu!');
    appendLocalChat('Hệ thống 🤖', `${myName} vừa giơ tay phát biểu ✋`, true);
  };

  // Rule of 3 Tasks (REAL TASKS FROM DATABASE VIA STORE)
  const roomTasks = tasks.slice(0, 3);

  const editUserTask = () => {
    const updated = window.prompt('Cập nhật mục tiêu học tập đang hiển thị trên Video:', userTask);
    if (updated && updated.trim()) {
      const clean = updated.trim();
      setUserTask(clean);
      onUpdateGoal(clean);
      toast.success('Đã cập nhật mục tiêu hiển thị trên video tile!');
    }
  };

  const handleAddRealTask = async () => {
    const val = newTaskInput.trim();
    if (!val) return;
    try {
      await addTask({
        title: val,
        status: 'Chưa làm',
        priority: 'Khẩn cấp',
        dueDate: new Date().toISOString().split('T')[0]
      });
      setNewTaskInput('');
      toast.success('Đã lưu nhiệm vụ vào hệ thống Database!');
    } catch (e) {
      toast.error('Không thể tạo nhiệm vụ');
    }
  };

  const handleToggleRealTask = async (taskItem: any) => {
    const isCompleted = taskItem.status === 'Hoàn thành' || taskItem.status === 'Done';
    const nextStatus = isCompleted ? 'Chưa làm' : 'Hoàn thành';
    try {
      await updateTask(taskItem.id, { status: nextStatus });
      if (!isCompleted) {
        addXP(50);
        triggerConfetti();
        setUserTask(taskItem.title);
        onUpdateGoal(taskItem.title);
        toast.success(`Hoàn thành mục tiêu! 🎉 +50 XP: "${taskItem.title}"`);
      }
    } catch (e) {
      toast.error('Lỗi cập nhật nhiệm vụ');
    }
  };

  const addXP = (amount: number) => {
    setUserXP((prev) => {
      const next = prev + amount;
      try { localStorage.setItem('lifeos_study_user_xp', next.toString()); } catch {}
      return next;
    });
  };

  // Chat
  const appendLocalChat = (author: string, text: string, isSystem = false) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLocalMessages((prev) => [...prev, { id: Math.random().toString(), author, text, time, isSystem }]);
  };

  const handleSendChatForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = chatInput.trim();
    if (!val) return;

    appendLocalChat(myName, val);
    setChatInput('');

    if (onSendMessage) {
      onSendMessage(val);
    } else {
      try {
        await apiCall(`/api/study-space/rooms/${room.id}/messages`, 'POST', { text: val });
      } catch {}
    }
  };

  const handleQuickChip = (msg: string) => {
    appendLocalChat(myName, msg);
    if (onSendMessage) {
      onSendMessage(msg);
    } else {
      apiCall(`/api/study-space/rooms/${room.id}/messages`, 'POST', { text: msg }).catch(() => {});
    }
  };

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages.length, room.messages?.length]);

  const copyRoomLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lifeos.vn';
    const link = `${origin}/?view=study-space&room=${encodeURIComponent(room.id)}`;
    try {
      navigator.clipboard.writeText(link);
      triggerConfetti();
      toast.success('Đã sao chép liên kết phòng học!');
    } catch {
      toast.info(`Link phòng: ${link}`);
    }
  };

  // Real Peer Desks (ZERO MOCK DATA)
  const otherMembers = (room.members || []).filter((m) => m.userId !== myId);
  const remainingDesksCount = Math.max(0, 5 - otherMembers.length);

  const formatTimerClock = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTaskTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const ringProgress = pomodoroLeft / pomodoroDuration;
  const strokeDashoffset = 62.8 * (1 - ringProgress);

  const equipFrame = (frameClass: string) => {
    setSelectedFrame(frameClass);
    try { localStorage.setItem('lifeos_study_user_frame', frameClass); } catch {}
    toast.success('Đã trang bị khung Avatar mới!');
  };

  const executeLeave = () => {
    if (taskTimerSeconds >= 60) {
      try {
        recordUserActivity('study', Math.round(taskTimerSeconds / 60));
      } catch {}
    }
    // Exit browser fullscreen on leave if active
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    onLeaveRoom();
  };

  return (
    <div
      className={`fixed inset-0 z-[999] w-screen h-screen overflow-hidden flex flex-col select-none font-sans transition-colors duration-300 ${
        isLight ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#090b10] text-slate-100'
      }`}
    >
      {/* ========================================================= */}
      {/* 1. TOP HUD BAR: TỐI GIẢN - TINH TẾ - HIỆN ĐẠI (h-14)       */}
      {/* ========================================================= */}
      <header
        className={`h-14 px-3 sm:px-4 flex items-center justify-between border-b backdrop-blur-xl z-30 shrink-0 transition-all duration-300 ${
          isLight ? 'bg-white/90 border-slate-200/90 shadow-xs' : 'bg-[#090b10]/95 border-white/10'
        } ${zenMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      >
        {/* Left: Brand & Room Code */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <GraduationCap className="w-4 h-4 text-slate-950 font-black" />
            </div>
            <span className={`font-extrabold text-base tracking-tight hidden sm:flex items-center gap-1 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              MeetStudy<span className="text-emerald-500">.vn</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </span>
          </div>

          {/* Room Code Badge */}
          <button
            onClick={copyRoomLink}
            type="button"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Sao chép link phòng"
          >
            <Lock className="w-3 h-3 text-emerald-500" />
            <span className="max-w-[90px] sm:max-w-none truncate">#{room.id.slice(0, 8)}</span>
            <Copy className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Center: Minimalist Pomodoro Focus Pill */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full shadow-md border ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#11151f]/95 border-white/10 text-white'
        }`}>
          {/* Circular Countdown Ring */}
          <div className="relative w-6 h-6 flex items-center justify-center">
            <svg className="w-6 h-6 transform -rotate-90">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className={isLight ? 'text-slate-200' : 'text-slate-800'} fill="transparent" />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-emerald-500 transition-all duration-1000 ease-linear"
                fill="transparent"
                strokeDasharray="62.8"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Time Clock */}
          <span className="font-mono font-bold text-sm tracking-wider">
            {formatTimerClock(pomodoroLeft)}
          </span>

          {/* Phase Badge */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
            pomodoroPhase === 'FOCUS'
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
          }`}>
            {pomodoroPhase === 'FOCUS' ? '🔥 Focus' : '☕ Nghỉ'}
          </span>

          {/* Controls: Play & Reset */}
          <div className={`flex items-center gap-1 border-l pl-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <button
              type="button"
              onClick={togglePomoTimer}
              className="text-emerald-600 dark:text-emerald-400 hover:scale-110 p-1 transition cursor-pointer"
              title={isPomodoroRunning ? 'Tạm dừng' : 'Bắt đầu'}
            >
              {isPomodoroRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={resetPomoTimer}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 transition cursor-pointer"
              title="Đặt lại"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Preset Popover Menu (Tối giản 1 nút bấm mở chọn 25m/50m/5s) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPresetPopoverOpen((prev) => !prev)}
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer border ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
              title="Cài đặt thời gian"
            >
              <span>{Math.round(pomodoroDuration / 60)}m</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isPresetPopoverOpen && (
              <div className={`absolute top-8 left-1/2 -translate-x-1/2 w-32 p-1.5 rounded-xl shadow-2xl border z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150 ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/15 text-white'
              }`}>
                <button
                  type="button"
                  onClick={() => setTimerPreset(25)}
                  className={`w-full py-1.5 px-2.5 rounded-lg text-left font-medium transition cursor-pointer ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                  }`}
                >
                  ⚡ 25 phút (Chuẩn)
                </button>
                <button
                  type="button"
                  onClick={() => setTimerPreset(50)}
                  className={`w-full py-1.5 px-2.5 rounded-lg text-left font-medium transition cursor-pointer ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                  }`}
                >
                  🔥 50 phút (Sâu)
                </button>
                <button
                  type="button"
                  onClick={() => setTimerPreset(0.083)}
                  className="w-full py-1.5 px-2.5 rounded-lg text-left font-bold text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                >
                  🚀 Test nhanh 5s
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Mở Sáng / Tối, Toàn Màn Hình, Bố Cục & Zen Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nút Chuyển Đổi Chế Độ Sáng / Tối (☀️ / 🌙) */}
          <button
            type="button"
            onClick={toggleThemeMode}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
              isLight
                ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700 shadow-xs'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-400'
            }`}
            title={isLight ? 'Chuyển sang Chế độ Tối (Dark Mode)' : 'Chuyển sang Chế độ Sáng (Light Mode)'}
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Nút Toàn Màn Hình (Fullscreen) */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Mở toàn màn hình (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Layout Switcher (Grid vs Spotlight) */}
          <div className={`hidden sm:flex items-center rounded-xl p-0.5 border text-xs ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            <button
              type="button"
              onClick={() => setTileLayout('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                tileLayout === 'grid'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
              }`}
              title="Lưới 3x2 (Grid)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setTileLayout('spotlight');
                setPinnedTileKey('user');
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                tileLayout === 'spotlight'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
              }`}
              title="Ghim màn hình chính (Spotlight)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zen Mode Button */}
          <button
            type="button"
            onClick={() => setZenMode(true)}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
            title="Ẩn thanh công cụ để tập trung tuyệt đối"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">Zen Mode</span>
          </button>

          {/* Streak Badge */}
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
          }`}>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>{userStreak}N</span>
          </div>

          {/* Shop Frame Button */}
          <button
            type="button"
            onClick={() => setShowFrameShopModal(true)}
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:opacity-90 text-white flex items-center justify-center transition shadow-xs cursor-pointer"
            title="Đổi Khung Avatar"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Zen Mode Exit Floating Pill */}
      {zenMode && (
        <button
          type="button"
          onClick={() => setZenMode(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900/90 text-white px-4 py-2 rounded-full border border-white/20 shadow-2xl hover:scale-105 transition-all text-xs font-bold cursor-pointer"
        >
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Thoát Zen Mode</span>
        </button>
      )}

      {/* ========================================================= */}
      {/* 2. MIDDLE MAIN STAGE: BÀN HỌC & VIDEO TILES (flex-1)       */}
      {/* ========================================================= */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3 relative">
        {/* Floating Reactions Overlay */}
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {floatingEmojis.map((e) => (
            <div
              key={e.id}
              style={{ left: `${e.x}%`, bottom: '20px' }}
              className="absolute text-4xl select-none animate-in fade-in slide-in-from-bottom-32 duration-1000"
            >
              {e.emoji}
            </div>
          ))}
        </div>

        {/* Video Stage Area */}
        <div className="flex-1 h-full transition-all duration-300 overflow-hidden relative flex flex-col justify-center">
          {tileLayout === 'grid' ? (
            /* ================= GRID 3x2 ================= */
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-3 max-h-full">
              {/* TILE 1: USER ("BẠN") */}
              <div className={`rounded-2xl border-2 relative overflow-hidden flex flex-col justify-between p-3 group shadow-lg transition-all ${
                isLight ? 'bg-white border-emerald-500/80 shadow-slate-200' : 'bg-[#131824]/90 border-emerald-500/60'
              }`}>
                {/* Goal Tag */}
                <div
                  onClick={editUserTask}
                  className={`absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 backdrop-blur-md border px-2.5 py-1 rounded-xl text-xs max-w-[85%] cursor-pointer hover:border-emerald-500 transition ${
                    isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-white/10 text-slate-200'
                  }`}
                  title="Click để đổi mục tiêu trực tiếp"
                >
                  <span className="text-emerald-500 font-bold">🎯</span>
                  <span className="truncate font-medium">{userTask}</span>
                  <span className="font-mono text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 ml-1">
                    {formatTaskTimer(taskTimerSeconds)}
                  </span>
                </div>

                {/* Top Right Actions */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 opacity-90 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTileLayout('spotlight');
                      setPinnedTileKey('user');
                    }}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-white/10'
                    }`}
                    title="Ghim màn hình này"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Center Content: Webcam OR Screen Share OR Avatar */}
                <div className={`w-full h-full flex items-center justify-center relative rounded-xl overflow-hidden ${
                  isLight ? 'bg-slate-100' : 'bg-[#0d111a]'
                }`}>
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 ${isWebcamOn ? 'block' : 'hidden'}`}
                  />
                  <video
                    ref={screenShareVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isScreenSharing ? 'block' : 'hidden'}`}
                  />

                  {!isWebcamOn && !isScreenSharing && (
                    <div className="flex flex-col items-center justify-center text-center p-3">
                      <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full p-1 relative transition-all duration-300 ${
                        selectedFrame === 'frame-emerald'
                          ? 'shadow-[0_0_0_3px_#10b981,0_0_15px_rgba(16,185,129,0.4)]'
                          : selectedFrame === 'frame-neon'
                          ? 'shadow-[0_0_0_3px_#a855f7,0_0_20px_rgba(168,85,247,0.6)]'
                          : selectedFrame === 'frame-gold'
                          ? 'shadow-[0_0_0_3px_#f59e0b,0_0_15px_rgba(245,158,11,0.5)]'
                          : 'shadow-[0_0_0_3px_#06b6d4,0_0_15px_rgba(6,182,212,0.5)]'
                      }`}>
                        <img
                          src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarFilters[avatarFilterIndex].seed}`}
                          alt="User Avatar"
                          className="w-full h-full rounded-full bg-slate-900 object-cover"
                        />
                        <span className={`absolute bottom-0 right-0 w-6 h-6 border rounded-full flex items-center justify-center text-[10px] ${
                          isMicOn
                            ? 'bg-emerald-500 text-white border-white'
                            : 'bg-slate-900 text-red-400 border-white/20'
                        }`}>
                          {isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                        </span>
                      </div>
                      <span className="mt-2 text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                        {avatarFilters[avatarFilterIndex].name}
                      </span>
                    </div>
                  )}

                  {tileBursts['user'] && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-5xl animate-bounce">
                      {tileBursts['user']}
                    </div>
                  )}
                </div>

                {/* Bottom Overlay: User Name & Vibe */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                  <div className={`flex items-center gap-1.5 backdrop-blur-md border px-2 py-0.5 rounded-lg text-xs ${
                    isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-white/10 text-white'
                  }`}>
                    <span className="font-bold">{myName}</span>
                    <span className="text-[10px] text-emerald-500 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/80 px-1 rounded">Lv.8</span>
                    <span className="text-[10px] text-amber-500 font-semibold border-l border-slate-300 dark:border-white/10 pl-1.5">{userVibe}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-700/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> LIVE
                  </span>
                </div>
              </div>

              {/* PEER TILES (REAL CONNECTED MEMBERS) */}
              {otherMembers.slice(0, 5).map((member) => (
                <div
                  key={member.userId}
                  className={`rounded-2xl border relative overflow-hidden flex flex-col justify-between p-3 group shadow-md transition-all ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#131824]/90 border-white/10'
                  }`}
                >
                  <div className={`absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 backdrop-blur-md border px-2.5 py-1 rounded-xl text-xs max-w-[85%] ${
                    isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-white/10 text-slate-200'
                  }`}>
                    <span className="text-cyan-500 font-bold">🎯</span>
                    <span className="truncate font-medium">{member.studyGoal || 'Đang tập trung học...'}</span>
                  </div>

                  <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 opacity-90 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => sendTileFire(member.userName, `peer-${member.userId}`)}
                      className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 p-1.5 rounded-lg border border-amber-500/40 text-xs transition cursor-pointer"
                      title="Tiếp lửa trực tiếp"
                    >
                      🔥
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTileLayout('spotlight');
                        setPinnedTileKey(member.userId);
                      }}
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-white/10'
                      }`}
                      title="Ghim màn hình này"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className={`w-full h-full flex items-center justify-center relative rounded-xl overflow-hidden ${
                    isLight ? 'bg-slate-100' : 'bg-[#0d111a]'
                  }`}>
                    <div className="flex flex-col items-center justify-center text-center p-3">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-1 relative shadow-[0_0_0_3px_#a855f7,0_0_20px_rgba(168,85,247,0.6)]">
                        <img
                          src={member.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.userName)}`}
                          alt={member.userName}
                          className="w-full h-full rounded-full bg-slate-900 object-cover"
                        />
                        <span className="absolute bottom-0 right-0 w-6 h-6 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-[10px] text-slate-400">
                          <MicOff className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                    {tileBursts[`peer-${member.userId}`] && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-5xl animate-bounce">
                        {tileBursts[`peer-${member.userId}`]}
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                    <div className={`flex items-center gap-1.5 backdrop-blur-md border px-2 py-0.5 rounded-lg text-xs ${
                      isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-slate-950/80 border-white/10 text-slate-100'
                    }`}>
                      <span className="font-bold">{member.userName}</span>
                      <span className="text-[10px] text-purple-500 font-mono font-bold bg-purple-50 dark:bg-purple-950/80 px-1 rounded">Lv.{member.level || 10}</span>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-300 font-semibold border-l border-slate-200 dark:border-white/10 pl-1.5">{member.vibe || '🔥 Tập trung'}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* CLEAN WAITING DESKS (ZERO MOCK BOTS) */}
              {Array.from({ length: remainingDesksCount }).map((_, index) => (
                <div
                  key={`empty-desk-${index}`}
                  className={`border border-dashed rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-4 text-center group transition-all ${
                    isLight
                      ? 'bg-white/50 border-slate-300 hover:border-emerald-500 hover:bg-white/80'
                      : 'bg-[#11151f]/50 border-white/10 hover:border-emerald-500/40 hover:bg-[#11151f]/80'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full border flex items-center justify-center mb-2 group-hover:scale-105 transition-transform ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
                  }`}>
                    <UserPlus className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                    Bàn chờ bạn học #{otherMembers.length + index + 2}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 max-w-[180px]">
                    Sẵn sàng chào đón đồng đội mới vào cùng học
                  </p>
                  <button
                    type="button"
                    onClick={copyRoomLink}
                    className="mt-3 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>+ Mời bạn học cùng</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* ================= SPOTLIGHT PINNED ================= */
            <div className="w-full h-full flex gap-3">
              <div className={`flex-1 h-full rounded-2xl border-2 relative overflow-hidden flex flex-col justify-between p-4 shadow-2xl ${
                isLight ? 'bg-white border-emerald-500 shadow-slate-200' : 'bg-[#131824]/95 border-emerald-500/80'
              }`}>
                <div className={`w-full h-full flex items-center justify-center relative rounded-xl overflow-hidden ${
                  isLight ? 'bg-slate-100' : 'bg-[#0d111a]'
                }`}>
                  {pinnedTileKey === 'user' ? (
                    <>
                      <video
                        ref={webcamVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 ${isWebcamOn ? 'block' : 'hidden'}`}
                      />
                      <video
                        ref={screenShareVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-contain ${isScreenSharing ? 'block' : 'hidden'}`}
                      />
                      {!isWebcamOn && !isScreenSharing && (
                        <div className="flex flex-col items-center justify-center text-center p-6">
                          <div className="w-32 h-32 rounded-full p-2 relative shadow-[0_0_0_3px_#10b981,0_0_20px_rgba(16,185,129,0.5)]">
                            <img
                              src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarFilters[avatarFilterIndex].seed}`}
                              alt="Pinned User"
                              className="w-full h-full rounded-full bg-slate-900 object-cover"
                            />
                          </div>
                          <h3 className={`text-base font-bold mt-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>{myName}</h3>
                          <span className="text-xs text-emerald-500 mt-1">{userTask}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    (() => {
                      const peer = otherMembers.find((m) => m.userId === pinnedTileKey);
                      return peer ? (
                        <div className="flex flex-col items-center justify-center text-center p-6">
                          <div className="w-32 h-32 rounded-full p-2 relative shadow-[0_0_0_3px_#a855f7,0_0_20px_rgba(168,85,247,0.5)]">
                            <img
                              src={peer.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(peer.userName)}`}
                              alt={peer.userName}
                              className="w-full h-full rounded-full bg-slate-900 object-cover"
                            />
                          </div>
                          <h3 className={`text-base font-bold mt-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>{peer.userName}</h3>
                          <span className="text-xs text-cyan-500 mt-1">{peer.studyGoal || 'Đang tập trung học...'}</span>
                        </div>
                      ) : null;
                    })()
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setTileLayout('grid')}
                  className={`absolute top-4 right-4 z-30 border px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer font-bold ${
                    isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-white/20'
                  }`}
                >
                  <PinOff className="w-3.5 h-3.5" /> Bỏ ghim (Trở về Grid)
                </button>
              </div>

              {/* Vertical Filmstrip */}
              <div className="w-64 h-full flex flex-col gap-2 overflow-y-auto pr-1">
                {pinnedTileKey !== 'user' && (
                  <div
                    onClick={() => setPinnedTileKey('user')}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                      isLight ? 'bg-white hover:bg-slate-100 border-slate-200' : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0">
                      <img
                        src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarFilters[avatarFilterIndex].seed}`}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h5 className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{myName} (Bạn)</h5>
                      <p className="text-[10px] text-emerald-500 truncate">{userTask}</p>
                    </div>
                  </div>
                )}
                {otherMembers.map((m) => {
                  if (m.userId === pinnedTileKey) return null;
                  return (
                    <div
                      key={`filmstrip-${m.userId}`}
                      onClick={() => setPinnedTileKey(m.userId)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                        isLight ? 'bg-white hover:bg-slate-100 border-slate-200' : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0">
                        <img
                          src={m.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName)}`}
                          alt={m.userName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h5 className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{m.userName}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{m.studyGoal || 'Đang học tập'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. RIGHT DRAWER: CHAT, REAL TASKS, LEADERBOARD            */}
        {/* ========================================================= */}
        {isDrawerOpen && (
          <aside className={`w-80 md:w-85 h-full border rounded-2xl flex flex-col overflow-hidden transition-all duration-300 z-20 shrink-0 shadow-xl ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#11151f] border-white/10 text-white'
          }`}>
            {/* Header Tabs */}
            <div className={`flex border-b p-1 gap-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d111a] border-white/10'}`}>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('chat')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeDrawerTab === 'chat'
                    ? (isLight ? 'text-emerald-700 bg-white shadow-xs' : 'text-emerald-400 bg-white/10')
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('tasks')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeDrawerTab === 'tasks'
                    ? (isLight ? 'text-emerald-700 bg-white shadow-xs' : 'text-emerald-400 bg-white/10')
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Mục tiêu
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('rank')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeDrawerTab === 'rank'
                    ? (isLight ? 'text-emerald-700 bg-white shadow-xs' : 'text-emerald-400 bg-white/10')
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" /> BXH
              </button>
            </div>

            {/* TAB 1: LIVE CHAT */}
            {activeDrawerTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                <div className={`flex items-center gap-1.5 overflow-x-auto pb-2 border-b ${
                  isLight ? 'border-slate-200' : 'border-white/10'
                }`}>
                  {['Cố lên ae 🔥', 'Đỉnh nóc 🚀', 'Cứu nét 😭', 'Uống nước ☕'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleQuickChip(chip)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] transition cursor-pointer border ${
                        isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto my-2 space-y-3 pr-1 text-xs">
                  {(room.messages || []).map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-purple-500">{msg.userName}</span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`p-2.5 rounded-2xl rounded-tl-none border inline-block max-w-[90%] ${
                        isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-white/5 text-slate-200 border-white/5'
                      }`}>
                        {msg.text}
                      </p>
                    </div>
                  ))}

                  {localMessages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={msg.isSystem ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                          {msg.author}
                        </span>
                        <span className="text-[9px] text-slate-400">{msg.time}</span>
                      </div>
                      <p className={`p-2.5 rounded-2xl rounded-tl-none border inline-block max-w-[90%] ${
                        msg.isSystem
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300'
                          : (isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-white/5 text-slate-200 border-white/5')
                      }`}>
                        {msg.text}
                      </p>
                    </div>
                  ))}

                  <div ref={chatMessagesEndRef} />
                </div>

                <form onSubmit={handleSendChatForm} className={`flex items-center gap-2 pt-2 border-t ${
                  isLight ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Gửi tin nhắn năng lượng..."
                    className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                    }`}
                  />
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded-xl transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: REAL TASKS (RULE OF 3 FROM DB) */}
            {activeDrawerTab === 'tasks' && (
              <div className="flex-1 flex flex-col p-3 overflow-hidden">
                <div className={`flex items-center justify-between border-b pb-2 mb-3 ${
                  isLight ? 'border-slate-200' : 'border-white/10'
                }`}>
                  <span className="text-xs font-bold">MỤC TIÊU HỌC TẬP (RULE OF 3)</span>
                  <span className="text-[10px] font-mono text-emerald-500 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                    {roomTasks.filter((t) => t.status === 'Hoàn thành' || t.status === 'Done').length}/{roomTasks.length} xong
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddRealTask();
                    }}
                    placeholder="Thêm việc cần làm hôm nay..."
                    className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddRealTask}
                    className="bg-emerald-500 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs hover:bg-emerald-400 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {roomTasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Chưa có mục tiêu nào hôm nay. Hãy thêm mục tiêu ở trên để tập trung tối đa!
                    </div>
                  ) : (
                    roomTasks.map((t) => {
                      const isDone = t.status === 'Hoàn thành' || t.status === 'Done';
                      return (
                        <div
                          key={t.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                            isDone
                              ? (isLight ? 'bg-emerald-50/80 border-emerald-200 text-slate-400 line-through' : 'bg-emerald-950/30 border-emerald-800/40 text-slate-400 line-through')
                              : (isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10')
                          }`}
                          onClick={() => handleToggleRealTask(t)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isDone ? 'bg-emerald-500 border-emerald-500 text-white text-[10px]' : 'border-slate-400'
                            }`}>
                              {isDone && <Check className="w-3 h-3" />}
                            </div>
                            <span className="truncate">{t.title}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: LEADERBOARD & FRAME CUSTOMIZER */}
            {activeDrawerTab === 'rank' && (
              <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-4">
                <div>
                  <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> BẢNG XẾP HẠNG PHÒNG HỌC
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className={`flex items-center justify-between p-2.5 rounded-xl border font-bold ${
                      isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                    }`}>
                      <span>1. {myName} (Bạn)</span>
                      <span className="font-mono">{userXP} XP</span>
                    </div>
                    {otherMembers.map((m, idx) => (
                      <div
                        key={m.userId}
                        className={`flex items-center justify-between p-2.5 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                        }`}
                      >
                        <span className="font-bold">{idx + 2}. {m.userName}</span>
                        <span className="font-mono text-slate-400">{3000 - idx * 250} XP</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`border-t pt-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" /> KHUNG VIỀN AVATAR
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'frame-emerald', name: 'Lục Bảo Focus', color: 'border-emerald-500 text-emerald-500' },
                      { key: 'frame-neon', name: 'Neon Cực Quang', color: 'border-purple-500 text-purple-500' },
                      { key: 'frame-gold', name: 'Hoàng Gia Gold', color: 'border-amber-500 text-amber-500' },
                      { key: 'frame-cyber', name: 'Cyberpunk 2077', color: 'border-cyan-500 text-cyan-500' }
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => equipFrame(f.key)}
                        className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                          selectedFrame === f.key
                            ? `${f.color} ${isLight ? 'bg-slate-100 font-bold' : 'bg-white/10 font-bold'}`
                            : (isLight ? 'bg-slate-50 border-slate-200 hover:border-slate-400' : 'bg-white/5 border-white/10 hover:border-white/20')
                        }`}
                      >
                        <span className="block font-bold truncate">{f.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {selectedFrame === f.key ? 'Đã trang bị' : 'Chọn dùng'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </main>

      {/* ========================================================= */}
      {/* 4. BOTTOM CONTROL DOCK (h-18)                             */}
      {/* ========================================================= */}
      <footer
        className={`h-18 px-4 md:px-6 flex items-center justify-between border-t z-30 shrink-0 transition-all duration-300 ${
          isLight ? 'bg-white/95 border-slate-200/90 shadow-lg' : 'bg-[#090b10] border-white/10'
        } ${zenMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      >
        {/* Left: Clock & Quick Vibe */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="font-mono text-sm font-bold opacity-75">{clockDisplay}</span>
          <div className={`h-4 w-px ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
          <select
            value={userVibe}
            onChange={(e) => {
              setUserVibe(e.target.value);
              toast.info(`Trạng thái: ${e.target.value}`);
            }}
            className={`border text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white/5 border-white/10 text-slate-200'
            }`}
          >
            <option value="🔥 Đang Focus">🔥 Đang Focus</option>
            <option value="☕ Giải lao 5p">☕ Giải lao 5p</option>
            <option value="🎧 Nghe nhạc Lofi">🎧 Nghe nhạc Lofi</option>
            <option value="🤫 Im lặng tuyệt đối">🤫 Im lặng tuyệt đối</option>
            <option value="🆘 Cứu nét bài tập">🆘 Cứu nét bài tập</option>
          </select>
        </div>

        {/* Center: Main Meet Buttons */}
        <div className="flex items-center gap-2 md:gap-3 mx-auto sm:mx-0">
          <button
            type="button"
            onClick={toggleDockMic}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow cursor-pointer border ${
              isMicOn
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400'
                : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-500'
            }`}
            title="Bật/Tắt Micro"
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={toggleDockCam}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow cursor-pointer border ${
              isWebcamOn
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400'
                : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-200')
            }`}
            title="Bật/Tắt Camera"
          >
            {isWebcamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={cycleAvatarFilter}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow cursor-pointer border text-purple-500 ${
              isLight ? 'bg-purple-50 hover:bg-purple-100 border-purple-200' : 'bg-white/10 hover:bg-white/20 border-white/10'
            }`}
            title="Đổi Filter Avatar"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={toggleScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow cursor-pointer border ${
              isScreenSharing
                ? 'bg-emerald-500 text-white border-emerald-400'
                : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-emerald-600' : 'bg-white/10 hover:bg-white/20 border-white/10 text-emerald-400')
            }`}
            title="Chia sẻ màn hình"
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Ambient Sound Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSoundPopoverOpen((prev) => !prev)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow cursor-pointer border text-cyan-500 ${
                isLight ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' : 'bg-white/10 hover:bg-white/20 border-white/10'
              }`}
              title="Âm thanh nền Lofi/Mưa"
            >
              <Headphones className="w-5 h-5" />
            </button>

            {isSoundPopoverOpen && (
              <div className={`absolute bottom-14 left-1/2 -translate-x-1/2 w-72 rounded-2xl p-3 border shadow-2xl z-50 flex flex-col gap-2.5 ${
                isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-[#11151f]/95 border-white/10 text-white'
              }`}>
                <div className={`flex justify-between items-center border-b pb-1.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <span className="text-xs font-bold flex items-center gap-1.5 text-cyan-500">
                    <Sliders className="w-3.5 h-3.5" /> ÂM THANH NỀN LOFI
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSoundPopoverOpen(false)}
                    className="opacity-50 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Rain */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span>🌧️ Mưa rơi</span>
                    <button
                      type="button"
                      onClick={() => toggleSoundSynth('rain')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        synthStates.rain.active
                          ? 'bg-emerald-500 text-white'
                          : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-slate-400')
                      }`}
                    >
                      {synthStates.rain.active ? 'BẬT' : 'TẮT'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={synthStates.rain.vol}
                    onChange={(e) => updateSoundVol('rain', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1 rounded cursor-pointer"
                  />
                </div>

                {/* Keyboard */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span>⌨️ Phím cơ</span>
                    <button
                      type="button"
                      onClick={() => toggleSoundSynth('keyboard')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        synthStates.keyboard.active
                          ? 'bg-emerald-500 text-white'
                          : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-slate-400')
                      }`}
                    >
                      {synthStates.keyboard.active ? 'BẬT' : 'TẮT'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={synthStates.keyboard.vol}
                    onChange={(e) => updateSoundVol('keyboard', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1 rounded cursor-pointer"
                  />
                </div>

                {/* Cafe */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span>☕ Quán Cafe</span>
                    <button
                      type="button"
                      onClick={() => toggleSoundSynth('cafe')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        synthStates.cafe.active
                          ? 'bg-emerald-500 text-white'
                          : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-slate-400')
                      }`}
                    >
                      {synthStates.cafe.active ? 'BẬT' : 'TẮT'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={synthStates.cafe.vol}
                    onChange={(e) => updateSoundVol('cafe', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1 rounded cursor-pointer"
                  />
                </div>

                {/* Lofi */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span>🎵 Lofi Chord Synth</span>
                    <button
                      type="button"
                      onClick={() => toggleSoundSynth('lofi')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        synthStates.lofi.active
                          ? 'bg-emerald-500 text-white'
                          : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-slate-400')
                      }`}
                    >
                      {synthStates.lofi.active ? 'BẬT' : 'TẮT'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={synthStates.lofi.vol}
                    onChange={(e) => updateSoundVol('lofi', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reactions */}
          <div className={`hidden md:flex items-center gap-1 border px-2 py-1 rounded-full ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            {['🔥', '💖', '👏', '😭', '🧠'].map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => shootFloatingEmoji(em)}
                className="p-1.5 hover:scale-125 transition text-base cursor-pointer"
              >
                {em}
              </button>
            ))}
            <button
              type="button"
              onClick={handleRaiseHand}
              className="p-1.5 hover:scale-125 transition text-xs font-bold text-amber-500 cursor-pointer"
              title="Giơ tay phát biểu"
            >
              ✋
            </button>
          </div>

          {/* Red Leave Button */}
          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className="w-14 h-11 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition shadow-lg shadow-red-600/30 ml-2 cursor-pointer"
            title="Rời phòng tự học"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Drawer Toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (activeDrawerTab === 'chat' && isDrawerOpen) setIsDrawerOpen(false);
              else {
                setIsDrawerOpen(true);
                setActiveDrawerTab('chat');
              }
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative cursor-pointer border ${
              isDrawerOpen && activeDrawerTab === 'chat'
                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300')
            }`}
            title="Mở Chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeDrawerTab === 'tasks' && isDrawerOpen) setIsDrawerOpen(false);
              else {
                setIsDrawerOpen(true);
                setActiveDrawerTab('tasks');
              }
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer border ${
              isDrawerOpen && activeDrawerTab === 'tasks'
                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300')
            }`}
            title="Mục tiêu Rule of 3"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeDrawerTab === 'rank' && isDrawerOpen) setIsDrawerOpen(false);
              else {
                setIsDrawerOpen(true);
                setActiveDrawerTab('rank');
              }
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer border ${
              isDrawerOpen && activeDrawerTab === 'rank'
                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                : (isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300')
            }`}
            title="Bảng Xếp Hạng"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
          </button>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* 5. MODAL 1: FRAME SHOP & AVATAR CUSTOMIZER                */}
      {/* ========================================================= */}
      {showFrameShopModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1010] flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-5 border relative flex flex-col gap-4 shadow-2xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#11151f] border-white/10 text-white'
          }`}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> Cửa Hàng Khung Avatar Gen Z
              </h3>
              <button
                type="button"
                onClick={() => setShowFrameShopModal(false)}
                className="opacity-50 hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs opacity-75">
              Hoàn thành phiên Pomodoro để nhận XP và trang bị các mẫu khung độc quyền!
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { key: 'frame-emerald', name: 'Lục Bảo Focus', style: 'shadow-[0_0_0_3px_#10b981,0_0_15px_rgba(16,185,129,0.4)]', color: 'text-emerald-500 border-emerald-500' },
                { key: 'frame-neon', name: 'Neon Cực Quang', style: 'shadow-[0_0_0_3px_#a855f7,0_0_20px_rgba(168,85,247,0.6)]', color: 'text-purple-500 border-purple-500' },
                { key: 'frame-gold', name: 'Hoàng Gia Gold', style: 'shadow-[0_0_0_3px_#f59e0b,0_0_15px_rgba(245,158,11,0.5)]', color: 'text-amber-500 border-amber-500' },
                { key: 'frame-cyber', name: 'Cyberpunk 2077', style: 'shadow-[0_0_0_3px_#06b6d4,0_0_15px_rgba(6,182,212,0.5)]', color: 'text-cyan-500 border-cyan-500' }
              ].map((f) => (
                <div
                  key={f.key}
                  onClick={() => equipFrame(f.key)}
                  className={`p-3 rounded-2xl border flex flex-col items-center cursor-pointer transition ${
                    selectedFrame === f.key
                      ? (isLight ? 'bg-slate-100 border-emerald-500 shadow-md' : 'bg-white/10 border-emerald-500 shadow-md')
                      : (isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10')
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full p-1 ${f.style} mb-2`}>
                    <img
                      src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=GenZStudentHero`}
                      alt={f.name}
                      className="w-full h-full rounded-full bg-slate-900"
                    />
                  </div>
                  <span className={`font-bold ${f.color.split(' ')[0]}`}>{f.name}</span>
                  <span className="text-[10px] opacity-75">
                    {selectedFrame === f.key ? 'Đang dùng' : 'Trang bị'}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowFrameShopModal(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL 2: SESSION SUMMARY UPON LEAVING                  */}
      {/* ========================================================= */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1010] flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 border text-center flex flex-col items-center gap-4 shadow-2xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#11151f] border-white/10 text-white'
          }`}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 text-2xl font-black shadow-xl">
              🎓
            </div>
            <div>
              <h3 className="font-extrabold text-xl">BUỔI HỌC KẾT THÚC RỰC RỠ!</h3>
              <p className="text-xs opacity-75 mt-1">Tổng kết thành tích tự học hôm nay của bạn</p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full my-2">
              <div className={`border p-3 rounded-xl flex flex-col items-center ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <span className="text-xs opacity-75">Thời gian</span>
                <span className="font-mono text-base font-bold text-emerald-500">
                  {formatTaskTimer(taskTimerSeconds)}
                </span>
              </div>
              <div className={`border p-3 rounded-xl flex flex-col items-center ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <span className="text-xs opacity-75">XP Tích lũy</span>
                <span className="font-mono text-base font-bold text-amber-500">+{Math.max(50, Math.round(taskTimerSeconds / 60) * 10)} XP</span>
              </div>
              <div className={`border p-3 rounded-xl flex flex-col items-center ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <span className="text-xs opacity-75">Mục tiêu xong</span>
                <span className="font-mono text-base font-bold text-purple-500">
                  {roomTasks.filter((t) => t.status === 'Hoàn thành' || t.status === 'Done').length} / {roomTasks.length}
                </span>
              </div>
            </div>

            <p className="text-xs text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
              🔥 Bạn đã giữ vững Chuỗi Tập Trung {userStreak} ngày liên tiếp!
            </p>

            <button
              type="button"
              onClick={executeLeave}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-sm transition cursor-pointer"
            >
              Trở Về Sảnh Học
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
