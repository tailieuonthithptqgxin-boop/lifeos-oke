import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap,
  Lock,
  Copy,
  LayoutGrid,
  Maximize2,
  EyeOff,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Flame,
  Award,
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
  Volume2,
  VolumeX,
  Sliders,
  X,
  ExternalLink,
  Share2,
  Coffee,
  Check,
  CheckCircle2,
  Wand2,
  UserPlus
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
  const { currentUser } = useAppStore();

  const myId = currentUserId || currentUser?.id || 'guest';
  const myName = currentUserName || currentUser?.name || 'Bạn';

  // State: Gamification
  const [userXP, setUserXP] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lifeos_study_user_xp');
      return saved ? parseInt(saved, 10) : 850;
    } catch {
      return 850;
    }
  });

  const [userStreak] = useState<number>(() => {
    return currentUser?.streakDays || 14;
  });

  const [selectedFrame, setSelectedFrame] = useState<string>(() => {
    try {
      return localStorage.getItem('lifeos_study_user_frame') || 'frame-emerald';
    } catch {
      return 'frame-emerald';
    }
  });

  // State: Avatar Filters
  const avatarFilters = [
    { name: '🧑‍💻 Filter: Lofi Coder', seed: 'GenZStudentHero' },
    { name: '🐱 Filter: Mèo Béo Cày Đêm', seed: 'FatCatCoder' },
    { name: '🎧 Filter: Anime Vibe', seed: 'AnimeGenZ' },
    { name: '✨ Filter: Minimalist Desk', seed: 'MinimalDesk' }
  ];
  const [avatarFilterIndex, setAvatarFilterIndex] = useState(0);

  // State: Vibe
  const [userVibe, setUserVibe] = useState<string>('🔥 Đang Focus');

  // State: User Task & Timer
  const [userTask, setUserTask] = useState<string>(() => {
    const me = room.members?.find((m) => m.userId === myId);
    return me?.studyGoal || 'Giải đề IELTS Reading Cam 18';
  });
  const [taskTimerSeconds, setTaskTimerSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lifeos_active_study_desk_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.roomId === room.id && parsed?.joinedAt) {
          return Math.floor((Date.now() - parsed.joinedAt) / 1000);
        }
      }
    } catch {}
    return 5050;
  });

  // State: Rule of 3 Tasks
  const [tasks, setTasks] = useState<Array<{ id: number; text: string; completed: boolean }>>(() => {
    try {
      const saved = localStorage.getItem('lifeos_study_rule_of_3');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, text: 'Giải đề IELTS Reading Cam 18', completed: false },
      { id: 2, text: 'Xem xong Video React Hooks', completed: true }
    ];
  });
  const [newTaskInput, setNewTaskInput] = useState('');

  // State: Media & Dock controls
  const [isMicOn, setIsMicOn] = useState(false);
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [tileLayout, setTileLayout] = useState<'grid' | 'spotlight'>('grid');
  const [pinnedTileKey, setPinnedTileKey] = useState<string>('user');
  const [zenMode, setZenMode] = useState(false);

  // State: Right Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'chat' | 'tasks' | 'rank'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; author: string; text: string; time: string; isSystem?: boolean }>>([]);

  // State: Modals & Popovers
  const [isSoundPopoverOpen, setIsSoundPopoverOpen] = useState(false);
  const [showFrameShopModal, setShowFrameShopModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // State: Realtime clock
  const [clockDisplay, setClockDisplay] = useState('');

  // State: Floating Emojis & Bursts
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [tileBursts, setTileBursts] = useState<Record<string, string>>({});

  // Refs for Web Media & Audio Context
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

  // -------------------------------------------------------------
  // 1. Clock & Task Stopwatch
  // -------------------------------------------------------------
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

  // Save tasks and XP to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lifeos_study_rule_of_3', JSON.stringify(tasks));
      localStorage.setItem('lifeos_study_user_xp', userXP.toString());
      localStorage.setItem('lifeos_study_user_frame', selectedFrame);
    } catch {}
  }, [tasks, userXP, selectedFrame]);

  // -------------------------------------------------------------
  // 2. Pomodoro Sync
  // -------------------------------------------------------------
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

  // Local Pomodoro Tick
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

  const handlePomodoroComplete = () => {
    setIsPomodoroRunning(false);
    playCompletionChime();
    triggerConfetti();
    addXP(100);
    appendLocalChat('Hệ thống 🤖', '🎉 Bạn vừa hoàn thành 1 phiên Pomodoro cùng cả phòng! (+100 XP)', true);
    toast.success('Xong Pomodoro! 🎉 +100 XP tích lũy vào tài khoản.');
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
    toast.info(`Đã đổi thời gian Pomodoro: ${mins < 1 ? Math.round(mins * 60) + ' giây' : mins + ' phút'}`);
  };

  // -------------------------------------------------------------
  // 3. Web Audio API Synthesizers
  // -------------------------------------------------------------
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

    const s = synthNodes.current[type];
    const currentActive = synthStates[type].active;
    const vol = synthStates[type].vol;

    if (currentActive) {
      // Stop synth
      stopSoundSynth(type);
      setSynthStates((prev) => ({
        ...prev,
        [type]: { ...prev[type], active: false }
      }));
    } else {
      // Start synth
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
      try {
        (s.node as any).stop();
      } catch {}
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

  // Cleanup media & audio on unmount
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
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  // -------------------------------------------------------------
  // 4. Webcam & Screen Share Controls
  // -------------------------------------------------------------
  const toggleDockCam = async () => {
    if (!isWebcamOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamStreamRef.current = stream;
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
        }
        setIsWebcamOn(true);
        toast.success('Đã bật Webcam trực tiếp!');
      } catch {
        toast.info('Không thể bật camera thực tế. Đang hiển thị Avatar Gen Z.');
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
        toast.success('Đã chia sẻ màn hình & chuyển sang chế độ Ghim Spotlight!');

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

  // -------------------------------------------------------------
  // 5. Floating Reactions & Tile Fire Cheering
  // -------------------------------------------------------------
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
        cheerText: `Tiếp lửa trực tiếp cho ${targetName} 🔥`
      });
    } catch {}
  };

  const handleRaiseHand = () => {
    shootFloatingEmoji('✋');
    toast.info('Bạn đã giơ tay phát biểu!');
    appendLocalChat('Hệ thống 🤖', `${myName} vừa giơ tay phát biểu ✋`, true);
  };

  // -------------------------------------------------------------
  // 6. User Tasks (Rule of 3)
  // -------------------------------------------------------------
  const editUserTask = () => {
    const updated = window.prompt('Cập nhật mục tiêu học tập đang hiển thị trên Video:', userTask);
    if (updated && updated.trim()) {
      const clean = updated.trim();
      setUserTask(clean);
      onUpdateGoal(clean);
      toast.success('Đã cập nhật mục tiêu hiển thị trên video tile!');
    }
  };

  const addRuleOfThreeTask = () => {
    const val = newTaskInput.trim();
    if (!val) return;
    if (tasks.length >= 3) {
      toast.info('Rule of 3: Chỉ nên đặt tối đa 3 nhiệm vụ để duy trì tập trung cao độ!');
      return;
    }
    setTasks((prev) => [...prev, { id: Date.now(), text: val, completed: false }]);
    setNewTaskInput('');
    toast.success('Đã thêm mục tiêu mới!');
  };

  const toggleRuleOfThreeTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = !t.completed;
          if (next) {
            addXP(50);
            triggerConfetti();
            setUserTask(t.text);
            onUpdateGoal(t.text);
            toast.success(`Mục tiêu xong! 🎉 +50 XP: "${t.text}"`);
          }
          return { ...t, completed: next };
        }
        return t;
      })
    );
  };

  const deleteRuleOfThreeTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addXP = (amount: number) => {
    setUserXP((prev) => prev + amount);
  };

  // -------------------------------------------------------------
  // 7. Chat System
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 8. Sharing Room Link
  // -------------------------------------------------------------
  const copyRoomLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lifeos.vn';
    const link = `${origin}/?view=study-space&room=${encodeURIComponent(room.id)}`;
    try {
      navigator.clipboard.writeText(link);
      triggerConfetti();
      toast.success('Đã chép link phòng học vào khay nhớ tạm!');
    } catch {
      toast.info(`Link phòng: ${link}`);
    }
  };

  // -------------------------------------------------------------
  // 9. Real Peer Desks Setup (ZERO MOCK DATA)
  // -------------------------------------------------------------
  const otherMembers = (room.members || []).filter((m) => m.userId !== myId);
  const remainingDesksCount = Math.max(0, 5 - otherMembers.length);

  // Time formatters
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

  // Calculate Pomodoro ring strokeDashoffset (circumference = 62.8)
  const ringProgress = pomodoroLeft / pomodoroDuration;
  const strokeDashoffset = 62.8 * (1 - ringProgress);

  // Frame equip
  const equipFrame = (frameClass: string) => {
    setSelectedFrame(frameClass);
    toast.success('Đã trang bị khung Avatar mới!');
  };

  // Leave room execution
  const executeLeave = () => {
    if (taskTimerSeconds >= 60) {
      try {
        recordUserActivity('study', Math.round(taskTimerSeconds / 60));
      } catch {}
    }
    onLeaveRoom();
  };

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-hidden flex flex-col bg-[#090b10] text-slate-100 select-none font-sans">
      {/* ========================================================= */}
      {/* 1. TOP GOOGLE MEET HUD BAR (h-14)                         */}
      {/* ========================================================= */}
      <header
        className={`h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#090b10]/95 backdrop-blur-md z-30 shrink-0 transition-all duration-300 ${
          zenMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Left: Brand & Room Code & View Switcher */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <GraduationCap className="w-4 h-4 text-slate-950 font-black" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
              MeetStudy<span className="text-emerald-400">.vn</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </span>
          </div>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* Room Code Badge */}
          <button
            onClick={copyRoomLink}
            type="button"
            className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 transition cursor-pointer"
            title="Sao chép link phòng"
          >
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>#{room.id.slice(0, 12)}</span>
            <Copy className="w-3 h-3 text-slate-400" />
          </button>

          {/* Layout View Mode Switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTileLayout('grid')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer font-bold ${
                tileLayout === 'grid'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grid (3x2)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTileLayout('spotlight');
                setPinnedTileKey('user');
              }}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 cursor-pointer font-bold ${
                tileLayout === 'spotlight'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ghim Màn Hình</span>
            </button>
          </div>

          {/* Zen Mode Toggle */}
          <button
            type="button"
            onClick={() => setZenMode(true)}
            className="hidden xl:flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-slate-300 transition cursor-pointer"
            title="Ẩn HUD để tập trung tuyệt đối"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            <span>Zen Mode</span>
          </button>
        </div>

        {/* Center: Synchronized Group Pomodoro Timer Pill */}
        <div className="flex items-center gap-2 bg-[#11151f]/90 border border-white/10 px-3 py-1 rounded-full shadow-lg">
          <div className="relative w-6 h-6 flex items-center justify-center">
            <svg className="w-6 h-6 transform -rotate-90">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className="text-slate-800" fill="transparent" />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-emerald-400 transition-all duration-1000 ease-linear"
                fill="transparent"
                strokeDasharray="62.8"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Clock Display */}
          <span className="font-mono font-bold text-sm text-white tracking-wider">
            {formatTimerClock(pomodoroLeft)}
          </span>

          {/* Phase Tag */}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase">
            {pomodoroPhase === 'FOCUS' ? '🔥 DEEP FOCUS' : '☕ NGHỈ NGƠI'}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1 ml-1 border-l border-white/10 pl-2">
            <button
              type="button"
              onClick={togglePomoTimer}
              className="text-slate-300 hover:text-emerald-400 text-xs px-1.5 py-0.5 transition cursor-pointer"
              title={isPomodoroRunning ? 'Tạm dừng' : 'Bắt đầu'}
            >
              {isPomodoroRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={resetPomoTimer}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 transition cursor-pointer"
              title="Đặt lại"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="hidden lg:flex items-center gap-1 border-l border-white/10 pl-2 text-[10px]">
            <button
              type="button"
              onClick={() => setTimerPreset(25)}
              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              25m
            </button>
            <button
              type="button"
              onClick={() => setTimerPreset(50)}
              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              50m
            </button>
            <button
              type="button"
              onClick={() => setTimerPreset(0.083)}
              className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-bold transition cursor-pointer"
              title="Chạy thử 5 giây"
            >
              ⚡ Test 5s
            </button>
          </div>

          <span className="text-[10px] text-slate-400 hidden xl:inline ml-1 font-medium">
            {otherMembers.length > 0 ? `Đang học cùng ${otherMembers.length} bạn` : 'Bạn đang tập trung 1 mình'}
          </span>
        </div>

        {/* Right: Gamification Stats & Frame Shop */}
        <div className="flex items-center gap-3">
          {/* Streak Badge */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/60 to-[#11151f] border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-400 shadow-sm">
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>🔥 <strong className="text-white">{userStreak}</strong> Ngày</span>
          </div>

          {/* Level & XP Bar */}
          <div className="hidden md:flex flex-col gap-0.5 bg-white/5 border border-white/10 px-3 py-1 rounded-xl min-w-[150px]">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-emerald-400">Lv.08 Học Bá</span>
              <span className="text-slate-400 font-mono">{userXP}/1000 XP</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.floor((userXP / 1000) * 100))}%` }}
              />
            </div>
          </div>

          {/* Shop Frame Button */}
          <button
            type="button"
            onClick={() => setShowFrameShopModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-900/40 to-slate-900 hover:from-purple-800/60 border border-purple-500/40 text-purple-300 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition shadow cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">Đổi Khung Avatar</span>
          </button>
        </div>
      </header>

      {/* Zen Mode Exit Floating Pill (Visible only when in Zen Mode) */}
      {zenMode && (
        <button
          type="button"
          onClick={() => setZenMode(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900/90 text-white px-3.5 py-2 rounded-full border border-white/20 shadow-2xl hover:scale-105 transition-all text-xs font-bold cursor-pointer"
        >
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Hiện thanh công cụ (Thoát Zen)</span>
        </button>
      )}

      {/* ========================================================= */}
      {/* 2. MIDDLE MAIN STAGE (flex-1 flex overflow-hidden)        */}
      {/* ========================================================= */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3 relative">
        {/* Floating Emoji Reactions Overlay */}
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
            /* ================= GRID 3x2 MODE ================= */
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-3 max-h-full">
              {/* TILE 1: USER ("BẠN (YOU)") */}
              <div className="bg-[#131824]/90 backdrop-blur-md rounded-2xl border-2 border-emerald-500/60 relative overflow-hidden flex flex-col justify-between p-3 group shadow-xl">
                {/* Top Left: Live Goal & Task Timer Pill */}
                <div
                  onClick={editUserTask}
                  className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-xl text-xs max-w-[85%] cursor-pointer hover:border-emerald-500 transition"
                  title="Click để đổi mục tiêu trực tiếp"
                >
                  <span className="text-emerald-400 font-bold">🎯</span>
                  <span className="truncate text-slate-200 font-medium">{userTask}</span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60 ml-1">
                    {formatTaskTimer(taskTimerSeconds)}
                  </span>
                </div>

                {/* Top Right: Actions */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 opacity-90 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTileLayout('spotlight');
                      setPinnedTileKey('user');
                    }}
                    className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 p-1.5 rounded-lg border border-white/10 text-xs cursor-pointer"
                    title="Ghim màn hình này"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Center Tile Content: Webcam OR ScreenShare OR Gen Z Avatar */}
                <div className="w-full h-full flex items-center justify-center relative rounded-xl overflow-hidden bg-[#0d111a]">
                  {/* Real Webcam Element */}
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 ${isWebcamOn ? 'block' : 'hidden'}`}
                  />

                  {/* Real Screen Share Element */}
                  <video
                    ref={screenShareVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isScreenSharing ? 'block' : 'hidden'}`}
                  />

                  {/* Virtual Gen Z Avatar Filter Box */}
                  {!isWebcamOn && !isScreenSharing && (
                    <div className="flex flex-col items-center justify-center text-center p-3 animate-pulse">
                      {/* Avatar Frame Overlay Container */}
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
                        <span className={`absolute bottom-0 right-0 w-6 h-6 border border-white/20 rounded-full flex items-center justify-center text-[10px] ${
                          isMicOn ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-red-400'
                        }`}>
                          {isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                        </span>
                      </div>
                      <span className="mt-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                        {avatarFilters[avatarFilterIndex].name}
                      </span>
                    </div>
                  )}

                  {/* Tile Burst Container */}
                  {tileBursts['user'] && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-5xl animate-bounce">
                      {tileBursts['user']}
                    </div>
                  )}
                </div>

                {/* Bottom Overlay: Name & Level & Vibe Tag */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-lg text-xs">
                    <span className="font-bold text-white">{myName}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-1 rounded">Lv.8</span>
                    <span className="text-[10px] text-amber-400 font-semibold border-l border-white/10 pl-1.5">{userVibe}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/90 border border-emerald-700/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE
                  </span>
                </div>
              </div>

              {/* PEER TILES (REAL MEMBERS) */}
              {otherMembers.slice(0, 5).map((member, idx) => (
                <div
                  key={member.userId}
                  className="bg-[#131824]/90 backdrop-blur-md rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between p-3 group hover:border-slate-600 transition-all shadow-xl"
                >
                  {/* Top Left: Goal */}
                  <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-xl text-xs max-w-[85%]">
                    <span className="text-cyan-400 font-bold">🎯</span>
                    <span className="truncate text-slate-200 font-medium">{member.studyGoal || 'Đang cày cuốc chăm chỉ...'}</span>
                  </div>

                  {/* Top Right: Fire Cheer Button & Pin */}
                  <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 opacity-90 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => sendTileFire(member.userName, `peer-${member.userId}`)}
                      className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 p-1.5 rounded-lg border border-amber-500/40 text-xs transition cursor-pointer"
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
                      className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 p-1.5 rounded-lg border border-white/10 text-xs cursor-pointer"
                      title="Ghim màn hình này"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Center: Avatar */}
                  <div className="w-full h-full flex items-center justify-center relative rounded-xl overflow-hidden bg-[#0d111a]">
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

                  {/* Bottom: Name & Vibe */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-lg text-xs">
                      <span className="font-bold text-slate-100">{member.userName}</span>
                      <span className="text-[10px] text-purple-400 font-mono font-bold bg-purple-950/80 px-1 rounded">Lv.{member.level || 10}</span>
                      <span className="text-[10px] text-cyan-300 font-semibold border-l border-white/10 pl-1.5">{member.vibe || '🔥 Tập trung'}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* REMAINING EMPTY STUDY DESKS (CLEAN - ZERO MOCK DATA) */}
              {Array.from({ length: remainingDesksCount }).map((_, index) => (
                <div
                  key={`empty-desk-${index}`}
                  className="bg-[#11151f]/50 border border-dashed border-white/10 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-4 text-center group hover:border-emerald-500/40 hover:bg-[#11151f]/80 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <UserPlus className="w-7 h-7 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                    Bàn chờ bạn học #{otherMembers.length + index + 2}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 max-w-[180px]">
                    Sẵn sàng chào đón đồng đội mới vào cùng học
                  </p>
                  <button
                    type="button"
                    onClick={copyRoomLink}
                    className="mt-3 px-3 py-1 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/40 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>+ Mời bạn học cùng</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* ================= SPOTLIGHT / PINNED MODE ================= */
            <div className="w-full h-full flex gap-3">
              {/* Pinned Large Tile (75% Width) */}
              <div className="flex-1 h-full bg-[#131824]/95 rounded-2xl border-2 border-emerald-500/80 relative overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
                {/* Large Video Area */}
                <div className="w-full h-full flex items-center justify-center relative rounded-xl overflow-hidden bg-[#0d111a]">
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
                          <div className={`w-32 h-32 rounded-full p-2 relative shadow-[0_0_0_3px_#10b981,0_0_20px_rgba(16,185,129,0.5)]`}>
                            <img
                              src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarFilters[avatarFilterIndex].seed}`}
                              alt="Pinned User"
                              className="w-full h-full rounded-full bg-slate-900 object-cover"
                            />
                          </div>
                          <h3 className="text-base font-bold text-white mt-3">{myName}</h3>
                          <span className="text-xs text-emerald-400 mt-1">{userTask}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Pinned Peer */
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
                          <h3 className="text-base font-bold text-white mt-3">{peer.userName}</h3>
                          <span className="text-xs text-cyan-400 mt-1">{peer.studyGoal || 'Đang tập trung học...'}</span>
                        </div>
                      ) : null;
                    })()
                  )}
                </div>

                {/* Unpin Floating Button */}
                <button
                  type="button"
                  onClick={() => setTileLayout('grid')}
                  className="absolute top-4 right-4 z-30 bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-slate-200 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer font-bold"
                >
                  <PinOff className="w-3.5 h-3.5" /> Bỏ ghim (Trở về Grid)
                </button>
              </div>

              {/* Vertical Filmstrip Sidebar for Other Desks (25% Width) */}
              <div className="w-64 h-full flex flex-col gap-2 overflow-y-auto pr-1">
                {pinnedTileKey !== 'user' && (
                  <div
                    onClick={() => setPinnedTileKey('user')}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition flex items-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0">
                      <img
                        src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarFilters[avatarFilterIndex].seed}`}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">{myName} (Bạn)</h5>
                      <p className="text-[10px] text-emerald-400 truncate">{userTask}</p>
                    </div>
                  </div>
                )}
                {otherMembers.map((m) => {
                  if (m.userId === pinnedTileKey) return null;
                  return (
                    <div
                      key={`filmstrip-${m.userId}`}
                      onClick={() => setPinnedTileKey(m.userId)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition flex items-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0">
                        <img
                          src={m.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName)}`}
                          alt={m.userName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-200 truncate">{m.userName}</h5>
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
        {/* 3. RIGHT COLLAPSIBLE GOOGLE MEET DRAWER (w-80 md:w-85)    */}
        {/* ========================================================= */}
        {isDrawerOpen && (
          <aside className="w-80 md:w-85 h-full bg-[#11151f] border border-white/10 rounded-2xl flex flex-col overflow-hidden transition-all duration-300 z-20 shrink-0">
            {/* Drawer Header Tabs */}
            <div className="flex border-b border-white/10 bg-[#0d111a] p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveDrawerTab('chat')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeDrawerTab === 'chat'
                    ? 'text-emerald-400 bg-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('tasks')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeDrawerTab === 'tasks'
                    ? 'text-emerald-400 bg-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Mục tiêu
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('rank')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeDrawerTab === 'rank'
                    ? 'text-emerald-400 bg-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" /> BXH
              </button>
            </div>

            {/* TAB 1: LIVE CHAT & SLANG CHIPS */}
            {activeDrawerTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                {/* Quick Slang Chips Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => handleQuickChip('Cố lên ae 🔥')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition cursor-pointer"
                  >
                    Cố lên ae 🔥
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickChip('Đỉnh nóc 🚀')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition cursor-pointer"
                  >
                    Đỉnh nóc 🚀
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickChip('Cứu nét 😭')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition cursor-pointer"
                  >
                    Cứu nét 😭
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickChip('Uống nước ☕')}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 transition cursor-pointer"
                  >
                    Uống nước ☕
                  </button>
                </div>

                {/* Chat Stream */}
                <div className="flex-1 overflow-y-auto my-2 space-y-3 pr-1 text-xs">
                  {/* Real Server Messages */}
                  {(room.messages || []).map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-purple-400">{msg.userName}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="bg-white/5 text-slate-200 p-2.5 rounded-2xl rounded-tl-none border border-white/5 inline-block max-w-[90%]">
                        {msg.text}
                      </p>
                    </div>
                  ))}

                  {/* Local Messages */}
                  {localMessages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={msg.isSystem ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {msg.author}
                        </span>
                        <span className="text-[9px] text-slate-500">{msg.time}</span>
                      </div>
                      <p className={`p-2.5 rounded-2xl rounded-tl-none border inline-block max-w-[90%] ${
                        msg.isSystem
                          ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                          : 'bg-white/5 text-slate-200 border-white/5'
                      }`}>
                        {msg.text}
                      </p>
                    </div>
                  ))}

                  <div className="bg-emerald-950/50 border border-emerald-800/50 p-2.5 rounded-xl text-emerald-300 text-[11px] text-center font-medium">
                    💡 Mẹo: Nhấn nút ⚡ Test 5s trên thanh HUD để trải nghiệm nhận thưởng +100 XP!
                  </div>

                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Send Form */}
                <form onSubmit={handleSendChatForm} className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Gửi tin nhắn năng lượng..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
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

            {/* TAB 2: ACTIVE TASKS (RULE OF 3) */}
            {activeDrawerTab === 'tasks' && (
              <div className="flex-1 flex flex-col p-3 overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="text-xs font-bold text-slate-200">CHỜ HOÀN THÀNH (RULE OF 3)</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {tasks.filter((t) => t.completed).length}/{tasks.length} xong
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addRuleOfThreeTask();
                    }}
                    placeholder="VD: Đọc 20 trang sách..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={addRuleOfThreeTask}
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold px-3 py-2 rounded-xl text-xs border border-emerald-500/40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                        t.completed
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-slate-400 line-through'
                          : 'bg-white/5 border-white/10 text-slate-200'
                      }`}
                    >
                      <div
                        onClick={() => toggleRuleOfThreeTask(t.id)}
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            t.completed
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold text-[10px]'
                              : 'border-slate-600'
                          }`}
                        >
                          {t.completed && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{t.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteRuleOfThreeTask(t.id)}
                        className="text-slate-500 hover:text-red-400 text-xs px-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: LEADERBOARD & VIBE FRAME SHOP */}
            {activeDrawerTab === 'rank' && (
              <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-4">
                {/* Room Leaderboard */}
                <div>
                  <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> BẢNG XẾP HẠNG PHÒNG HỌC
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 font-bold">
                      <span className="text-emerald-400">1. {myName} (Bạn)</span>
                      <span className="font-mono text-emerald-400">{userXP} XP</span>
                    </div>
                    {otherMembers.map((m, idx) => (
                      <div key={m.userId} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                        <span className="font-bold text-slate-200">{idx + 2}. {m.userName}</span>
                        <span className="font-mono text-slate-400">{3000 - idx * 250} XP</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Frame Customizer Mini Panel */}
                <div className="border-t border-white/10 pt-3">
                  <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-purple-400" /> NÂNG CẤP KHUNG AVATAR
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => equipFrame('frame-emerald')}
                      className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                        selectedFrame === 'frame-emerald'
                          ? 'bg-emerald-950/50 border-emerald-500'
                          : 'bg-white/5 border-white/10 hover:border-emerald-500/50'
                      }`}
                    >
                      <span className="font-bold text-emerald-400 block">Khung Lục Bảo</span>
                      <span className="text-[10px] text-slate-400">
                        {selectedFrame === 'frame-emerald' ? 'Đã trang bị' : 'Chọn dùng'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => equipFrame('frame-neon')}
                      className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                        selectedFrame === 'frame-neon'
                          ? 'bg-purple-950/50 border-purple-500'
                          : 'bg-white/5 border-white/10 hover:border-purple-500/50'
                      }`}
                    >
                      <span className="font-bold text-purple-400 block">Neon Cực Quang</span>
                      <span className="text-[10px] text-slate-400">
                        {selectedFrame === 'frame-neon' ? 'Đã trang bị' : 'Chọn dùng'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => equipFrame('frame-gold')}
                      className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                        selectedFrame === 'frame-gold'
                          ? 'bg-amber-950/50 border-amber-500'
                          : 'bg-white/5 border-white/10 hover:border-amber-500/50'
                      }`}
                    >
                      <span className="font-bold text-amber-400 block">Học Bá Hoàng Gia</span>
                      <span className="text-[10px] text-slate-400">
                        {selectedFrame === 'frame-gold' ? 'Đã trang bị' : 'Chọn dùng'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => equipFrame('frame-cyber')}
                      className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                        selectedFrame === 'frame-cyber'
                          ? 'bg-cyan-950/50 border-cyan-500'
                          : 'bg-white/5 border-white/10 hover:border-cyan-500/50'
                      }`}
                    >
                      <span className="font-bold text-cyan-400 block">Cyberpunk 2077</span>
                      <span className="text-[10px] text-slate-400">
                        {selectedFrame === 'frame-cyber' ? 'Đã trang bị' : 'Chọn dùng'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </main>

      {/* ========================================================= */}
      {/* 4. BOTTOM GOOGLE MEET CONTROL DOCK (h-18)                 */}
      {/* ========================================================= */}
      <footer
        className={`h-18 px-4 md:px-6 flex items-center justify-between bg-[#090b10] border-t border-white/10 z-30 shrink-0 transition-all duration-300 ${
          zenMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Left: Time & Quick Vibe Status Switcher */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-slate-300">{clockDisplay}</span>
          <div className="h-4 w-px bg-white/10" />
          <select
            value={userVibe}
            onChange={(e) => {
              setUserVibe(e.target.value);
              toast.info(`Trạng thái: ${e.target.value}`);
            }}
            className="bg-white/5 border border-white/10 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="🔥 Đang Focus" className="bg-slate-900 text-white">🔥 Đang Focus</option>
            <option value="☕ Giải lao 5p" className="bg-slate-900 text-white">☕ Giải lao 5p</option>
            <option value="🎧 Nghe nhạc Lofi" className="bg-slate-900 text-white">🎧 Nghe nhạc Lofi</option>
            <option value="🤫 Im lặng tuyệt đối" className="bg-slate-900 text-white">🤫 Im lặng tuyệt đối</option>
            <option value="🆘 Cứu nét bài tập" className="bg-slate-900 text-white">🆘 Cứu nét bài tập</option>
          </select>
        </div>

        {/* Center: Main Google Meet Buttons */}
        <div className="flex items-center gap-2 md:gap-3 mx-auto sm:mx-0">
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleDockMic}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow cursor-pointer border ${
              isMicOn
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-400'
            }`}
            title="Bật/Tắt Micro"
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Cam Button */}
          <button
            type="button"
            onClick={toggleDockCam}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow cursor-pointer border ${
              isWebcamOn
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-200'
            }`}
            title="Bật/Tắt Camera"
          >
            {isWebcamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Cycle Avatar Filter Button */}
          <button
            type="button"
            onClick={cycleAvatarFilter}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-purple-400 flex items-center justify-center transition shadow cursor-pointer"
            title="Đổi Filter Avatar Gen Z"
          >
            <Wand2 className="w-5 h-5" />
          </button>

          {/* Screen Share Button */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow cursor-pointer border ${
              isScreenSharing
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-emerald-400'
            }`}
            title="Chia sẻ màn hình"
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Ambient Sound Popover Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSoundPopoverOpen((prev) => !prev)}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-cyan-400 flex items-center justify-center transition shadow cursor-pointer"
              title="Âm thanh nền Lofi/Mưa"
            >
              <Headphones className="w-5 h-5" />
            </button>

            {/* FLOATING AMBIENT SOUND POPOVER */}
            {isSoundPopoverOpen && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-72 bg-[#11151f]/95 backdrop-blur-xl rounded-2xl p-3 border border-white/10 shadow-2xl z-50 flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" /> ÂM THANH NỀN LOFI
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSoundPopoverOpen(false)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Rain */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">🌧️ Mưa rơi</span>
                    <button
                      type="button"
                      onClick={() => toggleSoundSynth('rain')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        synthStates.rain.active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-white/10 text-slate-400'
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
                    className="w-full accent-emerald-500 bg-slate-800 h-1 rounded cursor-pointer"
                  />
                </div>

                {/* Keyboard */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">⌨️ Phím cơ</span>
                    <button
                      type="button"
                      onClick={() => toggleSoundSynth('keyboard')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        synthStates.keyboard.active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-white/10 text-slate-400'
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
                    className="w-full accent-emerald-500 bg-slate-800 h-1 rounded cursor-pointer"
                  />
                </div>

                {/* Cafe */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">☕ Quán Cafe</span>
                    <button
                      type="button"
                      onClick={() => toggleSoundSynth('cafe')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        synthStates.cafe.active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-white/10 text-slate-400'
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
                    className="w-full accent-emerald-500 bg-slate-800 h-1 rounded cursor-pointer"
                  />
                </div>

                {/* Lofi */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">🎵 Lofi Chord Synth</span>
                    <button
                      type="button"
                      onClick={() => toggleSoundSynth('lofi')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                        synthStates.lofi.active
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-white/10 text-slate-400'
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
                    className="w-full accent-emerald-500 bg-slate-800 h-1 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Emoji Reactions Bar */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-full">
            <button
              type="button"
              onClick={() => shootFloatingEmoji('🔥')}
              className="p-1.5 hover:scale-125 transition text-base cursor-pointer"
              title="Rực cháy"
            >
              🔥
            </button>
            <button
              type="button"
              onClick={() => shootFloatingEmoji('💖')}
              className="p-1.5 hover:scale-125 transition text-base cursor-pointer"
              title="Yêu thích"
            >
              💖
            </button>
            <button
              type="button"
              onClick={() => shootFloatingEmoji('👏')}
              className="p-1.5 hover:scale-125 transition text-base cursor-pointer"
              title="Vỗ tay"
            >
              👏
            </button>
            <button
              type="button"
              onClick={() => shootFloatingEmoji('😭')}
              className="p-1.5 hover:scale-125 transition text-base cursor-pointer"
              title="Khóc thét"
            >
              😭
            </button>
            <button
              type="button"
              onClick={() => shootFloatingEmoji('🧠')}
              className="p-1.5 hover:scale-125 transition text-base cursor-pointer"
              title="Tập trung"
            >
              🧠
            </button>
            <button
              type="button"
              onClick={handleRaiseHand}
              className="p-1.5 hover:scale-125 transition text-xs font-bold text-amber-400 cursor-pointer"
              title="Giơ tay phát biểu"
            >
              ✋
            </button>
          </div>

          {/* Red Hang Up Button (Rời Phòng) */}
          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className="w-14 h-11 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition shadow-lg shadow-red-600/30 ml-2 cursor-pointer"
            title="Rời phòng tự học"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Drawer Toggle Controls */}
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
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative cursor-pointer ${
              isDrawerOpen && activeDrawerTab === 'chat'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Mở Chat"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
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
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
              isDrawerOpen && activeDrawerTab === 'tasks'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Mở Mục tiêu"
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
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
              isDrawerOpen && activeDrawerTab === 'rank'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Bảng Xếp Hạng"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* 5. MODAL 1: FRAME SHOP & AVATAR CUSTOMIZER                */}
      {/* ========================================================= */}
      {showFrameShopModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-[#11151f] w-full max-w-md rounded-2xl p-5 border border-white/10 relative flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> Cửa Hàng Khung Avatar Gen Z
              </h3>
              <button
                type="button"
                onClick={() => setShowFrameShopModal(false)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Tích lũy XP bằng cách hoàn thành Pomodoro để trang bị khung viền siêu ngầu trên màn hình học!
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div
                onClick={() => equipFrame('frame-emerald')}
                className={`p-3 rounded-2xl bg-white/5 border flex flex-col items-center cursor-pointer transition ${
                  selectedFrame === 'frame-emerald'
                    ? 'border-emerald-500 bg-emerald-950/40'
                    : 'border-white/10 hover:border-emerald-500/50'
                }`}
              >
                <div className="w-14 h-14 rounded-full p-1 shadow-[0_0_0_3px_#10b981,0_0_15px_rgba(16,185,129,0.4)] mb-2">
                  <img
                    src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=GenZStudentHero`}
                    alt="Frame Emerald"
                    className="w-full h-full rounded-full bg-slate-900"
                  />
                </div>
                <span className="font-bold text-emerald-400">Lục Bảo Focus</span>
                <span className="text-[10px] text-emerald-300">
                  {selectedFrame === 'frame-emerald' ? 'Đang dùng' : 'Trang bị ngay'}
                </span>
              </div>

              <div
                onClick={() => equipFrame('frame-neon')}
                className={`p-3 rounded-2xl bg-white/5 border flex flex-col items-center cursor-pointer transition ${
                  selectedFrame === 'frame-neon'
                    ? 'border-purple-500 bg-purple-950/40'
                    : 'border-white/10 hover:border-purple-500/50'
                }`}
              >
                <div className="w-14 h-14 rounded-full p-1 shadow-[0_0_0_3px_#a855f7,0_0_20px_rgba(168,85,247,0.6)] mb-2">
                  <img
                    src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=GenZStudentHero`}
                    alt="Frame Neon"
                    className="w-full h-full rounded-full bg-slate-900"
                  />
                </div>
                <span className="font-bold text-purple-400">Neon Cực Quang</span>
                <span className="text-[10px] text-purple-300">
                  {selectedFrame === 'frame-neon' ? 'Đang dùng' : 'Trang bị ngay'}
                </span>
              </div>

              <div
                onClick={() => equipFrame('frame-gold')}
                className={`p-3 rounded-2xl bg-white/5 border flex flex-col items-center cursor-pointer transition ${
                  selectedFrame === 'frame-gold'
                    ? 'border-amber-500 bg-amber-950/40'
                    : 'border-white/10 hover:border-amber-500/50'
                }`}
              >
                <div className="w-14 h-14 rounded-full p-1 shadow-[0_0_0_3px_#f59e0b,0_0_15px_rgba(245,158,11,0.5)] mb-2">
                  <img
                    src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=GenZStudentHero`}
                    alt="Frame Gold"
                    className="w-full h-full rounded-full bg-slate-900"
                  />
                </div>
                <span className="font-bold text-amber-400">Hoàng Gia Gold</span>
                <span className="text-[10px] text-amber-300">
                  {selectedFrame === 'frame-gold' ? 'Đang dùng' : 'Trang bị ngay'}
                </span>
              </div>

              <div
                onClick={() => equipFrame('frame-cyber')}
                className={`p-3 rounded-2xl bg-white/5 border flex flex-col items-center cursor-pointer transition ${
                  selectedFrame === 'frame-cyber'
                    ? 'border-cyan-500 bg-cyan-950/40'
                    : 'border-white/10 hover:border-cyan-500/50'
                }`}
              >
                <div className="w-14 h-14 rounded-full p-1 shadow-[0_0_0_3px_#06b6d4,0_0_15px_rgba(6,182,212,0.5)] mb-2">
                  <img
                    src={currentUserAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=GenZStudentHero`}
                    alt="Frame Cyber"
                    className="w-full h-full rounded-full bg-slate-900"
                  />
                </div>
                <span className="font-bold text-cyan-400">Cyberpunk 2077</span>
                <span className="text-[10px] text-cyan-300">
                  {selectedFrame === 'frame-cyber' ? 'Đang dùng' : 'Trang bị ngay'}
                </span>
              </div>
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
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-[#11151f] w-full max-w-md rounded-2xl p-6 border border-white/10 text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 text-2xl font-black shadow-xl">
              🎓
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white">BUỔI HỌC KẾT THÚC RỰC RỠ!</h3>
              <p className="text-xs text-slate-400 mt-1">Tổng kết thành tích tự học hôm nay của bạn</p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full my-2">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col items-center">
                <span className="text-xs text-slate-400">Thời gian</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {formatTaskTimer(taskTimerSeconds)}
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col items-center">
                <span className="text-xs text-slate-400">XP Nhận được</span>
                <span className="font-mono text-base font-bold text-amber-400">+250 XP</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col items-center">
                <span className="text-xs text-slate-400">Mục tiêu xong</span>
                <span className="font-mono text-base font-bold text-purple-400">
                  {tasks.filter((t) => t.completed).length} / {tasks.length}
                </span>
              </div>
            </div>

            <p className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 p-2.5 rounded-xl">
              🔥 Bạn đã giữ vững Chuỗi Tập Trung {userStreak} ngày liên tiếp! Hẹn gặp lại bạn tối nay.
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
