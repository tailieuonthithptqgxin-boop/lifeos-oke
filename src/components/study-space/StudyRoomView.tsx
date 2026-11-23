import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronLeft,
  Settings,
  Users,
  Search,
  Crown,
  UserX
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { StudyTimerDisplay } from './StudyTimerDisplay';
import { CollectiveEnergyBar } from './CollectiveEnergyBar';
import { PinnedFriendsRow } from './PinnedFriendsRow';
import { StudyHallVirtualGrid } from './StudyHallVirtualGrid';
import { SmartBreakChat, ChatMessageItem } from './SmartBreakChat';
import type { CompactParticipant } from '../../backend/realtime/RoomManager';
import { useMeetGridLayout, MeetLayoutMode } from './useMeetGridLayout';
import { useSortedParticipants, MeetParticipant } from './useSortedParticipants';
import { ParticipantTile } from './ParticipantTile';
import { OverflowTile } from './OverflowTile';
import { LayoutSettingsModal, LayoutSettings, loadSavedLayoutSettings } from './LayoutSettingsModal';
import { BottomControlBar } from './BottomControlBar';
import { RoomSettingsModal, RoomSettingsData } from './RoomSettingsModal';
import { YouTubeStudyPlayer } from './YouTubeStudyPlayer';
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
  initialMicOn?: boolean;
  initialCamOn?: boolean;
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
  initialMicOn = false,
  initialCamOn = true,
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

  // Gamification State (Real Zero-Start Data from currentUser - 100% Real from DB)
  const [userXP, setUserXP] = useState<number>(() => {
    // Purge any legacy stale mock localStorage
    try { localStorage.removeItem('lifeos_study_user_xp'); } catch {}
    return currentUser?.xp ?? 0;
  });

  useEffect(() => {
    if (currentUser?.xp !== undefined) {
      setUserXP(currentUser.xp);
    }
  }, [currentUser?.xp]);

  const userStreak = currentUser?.streakDays ?? 0;
  const userLevel = currentUser?.level ?? (Math.floor(userXP / 100) + 1);
  const xpInLevel = userXP % 100;

  const levelTitle = useMemo(() => {
    if (userLevel === 1) return 'Lv.01 Tân Binh';
    if (userLevel === 2) return 'Lv.02 Tập Sự';
    if (userLevel < 6) return `Lv.0${userLevel} Người Kiên Trì`;
    if (userLevel < 10) return `Lv.0${userLevel} Chiến Thần`;
    return `Lv.${userLevel} Học Bá`;
  }, [userLevel]);

  // Host & Room Settings State
  const isHost = Boolean(
    (room.hostId && (room.hostId === myId || room.hostId === currentUser?.id)) ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'SuperAdmin' ||
    room.isSystemRoom === false
  );
  const [localRoomName, setLocalRoomName] = useState(room.name || 'Phòng Học Chung');
  const [localRoomTopic, setLocalRoomTopic] = useState(room.topic || 'Tập trung sâu');
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);

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
  const [isMicOn, setIsMicOn] = useState(initialMicOn);
  const [isWebcamOn, setIsWebcamOn] = useState(initialCamOn);
  const [isYouTubePlayerOpen, setIsYouTubePlayerOpen] = useState(false);
  const [isYouTubePlaying, setIsYouTubePlaying] = useState(false);
  const [youTubeTrackTitle, setYouTubeTrackTitle] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [tileLayout, setTileLayout] = useState<'grid' | 'spotlight'>('grid');
  const [pinnedTileKey, setPinnedTileKey] = useState<string>('user');
  const [zenMode, setZenMode] = useState(false);

  // Right Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'members' | 'chat' | 'tasks' | 'rank'>('members');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Google Meet Layout Engine & Sorting State
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(loadSavedLayoutSettings);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const friendIds = useMemo<string[]>(() => [], []);
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

  // High-Scale Virtual Hall State (Real Co-Studying Peers - Zero Fake Bots)
  const initialPeers = useMemo<CompactParticipant[]>(() => {
    return [
      {
        id: myId,
        name: myName,
        avatar: currentUserAvatar,
        goal: userTask,
        presence: 'STUDYING',
        streak: userStreak,
        isCameraOn: initialCamOn,
        isMicOn: initialMicOn,
      },
    ];
  }, [myId, myName, currentUserAvatar, userTask, userStreak, initialCamOn, initialMicOn]);

  const [viewMode, setViewMode] = useState<'hall' | 'desk'>('hall');
  const [pinnedFriends, setPinnedFriends] = useState<CompactParticipant[]>(() => []);
  const [highScaleMembers, setHighScaleMembers] = useState<CompactParticipant[]>(() => initialPeers);

  // Google Meet Auto-Sorting Hook (5 Priority Tiers)
  const {
    visibleParticipants,
    overflowParticipants,
    overflowCount,
    hasOverflow,
    overflowPreviewAvatars,
    allSortedParticipants,
    pinnedIds,
    togglePin,
    isPinned,
  } = useSortedParticipants(
    highScaleMembers as MeetParticipant[],
    [],
    friendIds,
    layoutSettings.maxTiles,
    {
      selfId: myId,
      hideSelf: layoutSettings.hideSelf,
    }
  );

  // Google Meet Layout Engine Hook (Auto 16:9 Grid calculation)
  const meetTileCount = visibleParticipants.length + (hasOverflow ? 1 : 0);
  const {
    columns: meetColumns,
    rows: meetRows,
    tileWidth: meetTileWidth,
    tileHeight: meetTileHeight,
    isCompact: isMeetCompact,
    gridStyle: meetGridStyle,
  } = useMeetGridLayout(stageContainerRef, meetTileCount, layoutSettings.mode, {
    aspectRatio: 16 / 9,
    gap: 10,
    maxColumns: 7,
  });

  const formatPomodoroTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }, []);

  const triggerBatchKudos = useCallback((emoji = '🔥') => {
    shootFloatingEmoji(emoji);
    if (socketRef.current) {
      socketRef.current.emit('room:kudos', {
        roomId: room.id,
        userId: myId,
        emoji,
      });
    }
    setCollectiveEnergy((prev) => ({
      ...prev,
      kudosCount: prev.kudosCount + 1,
    }));
    toast.success(`Bạn đã tiếp lửa ${emoji} cho cả phòng!`);
  }, [room.id, myId]);

  // Real Collective Energy: 100% Real Activity
  const [collectiveEnergy, setCollectiveEnergy] = useState({
    activeCount: Math.max(1, room.participantCount || 1),
    totalAccumulatedMinutes: 0,
    kudosCount: 0,
  });
  const [realtimeChatMessages, setRealtimeChatMessages] = useState<ChatMessageItem[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Host Action: Kick User from Room
  const handleKickUser = useCallback((targetUser: MeetParticipant) => {
    if (!isHost || targetUser.id === myId) return;

    const confirmed = window.confirm(
      `⚠️ BẠN CÓ CHẮC CHẮN MUỐN MỜI HỌC VIÊN NÀY RA KHỎI PHÒNG?\n\n- Học viên: "${targetUser.name}"\n- Quyền hạn: Chủ phòng (${myName})\n\nSau khi kích, học viên sẽ bị ngắt kết nối ngay lập tức và không thể vào lại phòng này.`
    );
    if (!confirmed) return;

    if (socketRef.current) {
      socketRef.current.emit('room:kick_user', {
        roomId: room.id,
        hostId: myId,
        targetUserId: targetUser.id,
        reason: 'Chủ phòng đã mời bạn rời khỏi phòng học do vi phạm quy định.',
      });
    }

    setHighScaleMembers((prev) => prev.filter((m) => m.id !== targetUser.id));
    setPinnedFriends((prev) => prev.filter((m) => m.id !== targetUser.id));
    setCollectiveEnergy((prev) => ({
      ...prev,
      activeCount: Math.max(1, prev.activeCount - 1),
    }));
    toast.success(`Đã mời "${targetUser.name}" ra khỏi phòng học.`);
  }, [isHost, myId, myName, room.id]);

  // Host Action: Save Room Settings
  const handleSaveRoomSettings = useCallback((newSettings: RoomSettingsData) => {
    setLocalRoomName(newSettings.name);
    setLocalRoomTopic(newSettings.topic);
    setPomodoroDuration(newSettings.focusDuration);

    if (socketRef.current) {
      socketRef.current.emit('room:update_settings', {
        roomId: room.id,
        hostId: myId,
        settings: newSettings,
      });
    }

    apiCall(`/api/study-space/rooms/${room.id}/pomodoro`, 'POST', {
      duration: newSettings.focusDuration,
      phase: pomodoroPhase,
      isRunning: isPomodoroRunning,
    }).catch(() => {});

    toast.success('Đã lưu thiết lập phòng học thành công! ⚡');
  }, [room.id, myId, pomodoroPhase, isPomodoroRunning]);

  // Trigger floating batch kudos
  const triggerFloatingBatchKudos = (breakdown: Record<string, number> = {}) => {
    const emojis = Object.keys(breakdown);
    if (emojis.length === 0) emojis.push('🔥');

    for (let i = 0; i < Math.min(8, emojis.length * 3); i++) {
      const randomEmoji = emojis[i % emojis.length];
      setTimeout(() => {
        setFloatingEmojis((prev) => [
          ...prev.slice(-20),
          {
            id: `kudos_${Date.now()}_${Math.random()}`,
            emoji: randomEmoji,
            x: Math.random() * 80 + 10,
          },
        ]);
      }, i * 120);
    }
  };

  // High-Scale Realtime Socket.io Connection Loop (Real Users Only)
  useEffect(() => {
    let socket: Socket | null = null;
    try {
      socket = io({
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
      });
      socketRef.current = socket;

      socket.emit('room:join', {
        roomId: room.id,
        userId: myId,
        name: myName,
        avatar: currentUserAvatar,
        studyGoal: userTask,
        streakDays: userStreak,
        hostId: room.hostId,
        isHost,
      });

      socket.on('room:snapshot', (snapshot: any) => {
        const remoteMembers = snapshot.members || [];
        const hasSelf = remoteMembers.some((r: any) => r.id === myId);
        const selfMember: CompactParticipant = {
          id: myId,
          name: myName,
          avatar: currentUserAvatar,
          goal: userTask,
          presence: 'STUDYING',
          streak: userStreak,
          isCameraOn: isWebcamOn,
          isMicOn: isMicOn,
        };
        const allRealMembers = hasSelf ? remoteMembers : [selfMember, ...remoteMembers];
        setHighScaleMembers(allRealMembers);

        if (snapshot.pinnedFriends && snapshot.pinnedFriends.length > 0) {
          setPinnedFriends(snapshot.pinnedFriends);
        } else {
          setPinnedFriends(allRealMembers.filter((m) => m.id !== myId).slice(0, 6));
        }

        if (snapshot.energy) {
          setCollectiveEnergy({
            activeCount: snapshot.energy.activeStudyingCount || allRealMembers.length,
            totalAccumulatedMinutes: snapshot.energy.totalAccumulatedMinutesToday || 0,
            kudosCount: snapshot.energy.kudosCountToday || 0,
          });
        }

        if (snapshot.timer) {
          setPomodoroPhase(snapshot.timer.phase);
          setPomodoroDuration(snapshot.timer.durationSeconds);
          setIsPomodoroRunning(snapshot.timer.isRunning);
        }

        if (snapshot.room) {
          if (snapshot.room.name) setLocalRoomName(snapshot.room.name);
          if (snapshot.room.topic) setLocalRoomTopic(snapshot.room.topic);
        }
      });

      socket.on('room:user_joined', ({ user, activeCount }: any) => {
        setHighScaleMembers((prev) => {
          if (prev.some((m) => m.id === user.id)) return prev;
          return [user, ...prev];
        });
        setCollectiveEnergy((prev) => ({ ...prev, activeCount }));
      });

      socket.on('room:user_left', ({ userId, activeCount }: any) => {
        setHighScaleMembers((prev) => prev.filter((m) => m.id !== userId));
        setPinnedFriends((prev) => prev.filter((m) => m.id !== userId));
        setCollectiveEnergy((prev) => ({ ...prev, activeCount }));
      });

      socket.on('room:kicked', (data: { reason?: string }) => {
        toast.error(data.reason || 'Bạn đã bị chủ phòng mời ra khỏi phòng học.', { duration: 5000 });
        onLeaveRoom();
      });

      socket.on('room:user_kicked', (data: { userId: string; userName?: string; activeCount: number }) => {
        setHighScaleMembers((prev) => prev.filter((m) => m.id !== data.userId));
        setPinnedFriends((prev) => prev.filter((m) => m.id !== data.userId));
        setCollectiveEnergy((prev) => ({
          ...prev,
          activeCount: data.activeCount || Math.max(1, prev.activeCount - 1),
        }));
        toast.info(`${data.userName || 'Một thành viên'} đã bị chủ phòng mời ra khỏi phòng.`);
      });

      socket.on('room:settings_updated', (data: any) => {
        if (data.name) setLocalRoomName(data.name);
        if (data.topic) setLocalRoomTopic(data.topic);
        if (data.focusDuration) setPomodoroDuration(data.focusDuration);
        toast.info('Chủ phòng vừa cập nhật thiết lập phòng học.');
      });

      socket.on('room:goal_updated', ({ userId, goal }: any) => {
        setHighScaleMembers((prev) =>
          prev.map((m) => (m.id === userId ? { ...m, goal } : m))
        );
        setPinnedFriends((prev) =>
          prev.map((m) => (m.id === userId ? { ...m, goal } : m))
        );
      });

      socket.on('room:kudos_batched', (batch: any) => {
        triggerFloatingBatchKudos(batch.breakdown);
        setCollectiveEnergy((prev) => ({
          ...prev,
          kudosCount: prev.kudosCount + (batch.total || 1),
        }));
      });

      socket.on('room:chat_message', (msg: any) => {
        setRealtimeChatMessages((prev) => [...prev.slice(-100), msg]);
      });

      socket.on('room:chat_error', ({ message }: any) => {
        toast.error(message);
      });

      socket.on('room:timer_state', (timer: any) => {
        setPomodoroPhase(timer.phase);
        setPomodoroDuration(timer.durationSeconds);
        setIsPomodoroRunning(timer.isRunning);
      });

      socket.on('room:session_completed', (summary: any) => {
        triggerConfetti();
        toast.success(`🎉 Hoàn thành phiên Focus ${summary.focusMinutes} phút! +${summary.awardedXp || 25} XP`);
      });
    } catch (err) {
      console.warn('Socket connection fallback to local:', err);
      setPinnedFriends([]);
      setHighScaleMembers(initialPeers);
    }

    return () => {
      if (socket) {
        socket.emit('room:leave', { roomId: room.id, userId: myId });
        socket.disconnect();
      }
    };
  }, [room.id, myId]);

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
  const initAudioContext = async () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }
  };

  const toggleSoundSynth = async (type: 'rain' | 'keyboard' | 'cafe' | 'lofi') => {
    await initAudioContext();
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
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

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

  // Auto-start webcam if requested from pre-join lobby
  useEffect(() => {
    let active = true;
    if (initialCamOn && !webcamStreamRef.current) {
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          webcamStreamRef.current = stream;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = stream;
          }
          setIsWebcamOn(true);
          setHighScaleMembers((prev) =>
            prev.map((m) => (m.id === myId ? { ...m, isCameraOn: true } : m))
          );
        })
        .catch(() => {
          if (active) {
            setIsWebcamOn(false);
            setHighScaleMembers((prev) =>
              prev.map((m) => (m.id === myId ? { ...m, isCameraOn: false } : m))
            );
          }
        });
    }
    return () => {
      active = false;
    };
  }, [initialCamOn, myId]);

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
        setHighScaleMembers((prev) =>
          prev.map((m) => (m.id === myId ? { ...m, isCameraOn: true } : m))
        );
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
      setHighScaleMembers((prev) =>
        prev.map((m) => (m.id === myId ? { ...m, isCameraOn: false } : m))
      );
      toast.info('Đã tắt Webcam.');
    }
  };

  const toggleDockMic = () => {
    setIsMicOn((prev) => {
      const next = !prev;
      setHighScaleMembers((members) =>
        members.map((m) => (m.id === myId ? { ...m, isMicOn: next } : m))
      );
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

  const addXP = async (amount: number) => {
    setUserXP((prev) => prev + amount);
    try {
      await apiCall('/api/progression/study-xp', 'POST', { amount, reason: 'Hoàn thành mục tiêu học tập phòng Meet' });
      window.dispatchEvent(new CustomEvent('lifeos-progression-updated'));
    } catch {}
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

  const roomContent = (
    <div
      className={`fixed inset-0 z-[99999] w-screen h-screen overflow-hidden flex flex-col select-none font-sans transition-colors duration-300 ${
        isLight ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#202124] text-slate-100'
      }`}
    >
      {/* ========================================================= */}
      {/* 1. TOP HUD BAR: TỐI GIẢN CHUẨN GOOGLE MEET (h-14)         */}
      {/* ========================================================= */}
      <header
        className={`h-14 px-3 sm:px-5 flex items-center justify-between border-b backdrop-blur-xl z-30 shrink-0 transition-all duration-300 select-none ${
          isLight ? 'bg-white/95 border-slate-200 shadow-xs text-slate-800' : 'bg-[#202124]/95 border-white/10 text-white shadow-md'
        } ${zenMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      >
        {/* KHỐI TRÁI: TÊN PHÒNG & MÃ PHÒNG (COPY LINK MỜI BẠN) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              isLight
                ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border-slate-200 hover:border-red-200'
                : 'bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border-white/10 hover:border-red-500/30'
            }`}
            title="Rời phòng học"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Rời</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
            <h2 className="text-sm font-bold truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {localRoomName}
            </h2>
          </div>

          <button
            onClick={copyRoomLink}
            type="button"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition cursor-pointer border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Sao chép liên kết mời bạn bè"
          >
            <span className="text-emerald-400 font-bold">#</span>
            <span className="max-w-[80px] truncate">{room.id.replace('room-', '').slice(0, 8)}</span>
            <Copy className="w-3 h-3 text-slate-400" />
          </button>

          {/* Chủ phòng Badge */}
          {isHost && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                isLight
                  ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-xs'
                  : 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-xs'
              }`}
              title="Bạn là Chủ phòng: có quyền quản trị, đổi thiết lập và kích thành viên vi phạm"
            >
              <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Chủ phòng</span>
            </div>
          )}
        </div>

        {/* KHỐI GIỮA: STREAK & LEVEL XP TINH TẾ (TỐI GIẢN, KHÔNG RƯỜM RÀ) */}
        <div className="hidden md:flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
          }`}>
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
            <span>{userStreak} Ngày</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
          }`}>
            <span>{levelTitle}</span>
            <span className="text-[10px] text-slate-400 font-mono font-normal">({xpInLevel}/100 XP)</span>
          </div>
        </div>

        {/* KHỐI PHẢI: KHUNG AVATAR, SÁNG/TỐI, TOÀN MÀN HÌNH, ZEN MODE */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowFrameShopModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isLight
                ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300'
                : 'bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border-purple-500/40 shadow-xs'
            }`}
            title="Đổi Khung Avatar"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">Khung</span>
          </button>

          <button
            type="button"
            onClick={toggleThemeMode}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer border ${
              isLight
                ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700 shadow-xs'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-400'
            }`}
            title={isLight ? 'Chuyển sang Chế độ Tối (Dark Mode)' : 'Chuyển sang Chế độ Sáng (Light Mode)'}
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-xs'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Mở toàn màn hình (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setZenMode(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
            title="Zen Mode: Ẩn mọi thanh công cụ để tập trung tuyệt đối"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Zen Mode</span>
          </button>
        </div>
      </header>

      {/* Zen Mode Exit Floating Pill */}
      {zenMode && (
        <button
          type="button"
          onClick={() => setZenMode(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-[#202124]/90 text-white px-4 py-2 rounded-full border border-white/20 shadow-2xl hover:scale-105 transition-all text-xs font-bold cursor-pointer"
        >
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Thoát Zen Mode</span>
        </button>
      )}

      {/* ========================================================= */}
      {/* 2. MIDDLE MAIN STAGE: ĐẠI SẢNH 100+ & BÀN HỌC (flex-1)    */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col overflow-hidden p-3 gap-3 relative">
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

        {/* 1. Focus Header & Collective Energy Bar (100+ Học Viên Đồng Thời) */}
        <CollectiveEnergyBar
          activeCount={collectiveEnergy.activeCount}
          totalAccumulatedMinutes={collectiveEnergy.totalAccumulatedMinutes}
          kudosCount={collectiveEnergy.kudosCount}
          isLight={isLight}
        />

        {/* 2. HORIZONTAL BODY CONTAINER: STAGE (LEFT) + DRAWER (RIGHT) SIDE-BY-SIDE */}
        <div className="flex-1 flex flex-row overflow-hidden gap-3 relative pb-20">
          {/* LEFT: Video Stage (Always visible, smoothly adapts when drawer opens) */}
          <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden relative">
            {layoutSettings.mode === 'spotlight' ? (
              /* VIEW: SPOTLIGHT MODE */
              <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden relative">
                {(() => {
                  const fallbackSelf: MeetParticipant = {
                    id: myId,
                    name: myName,
                    avatar: currentUserAvatar,
                    goal: userTask,
                    presence: 'STUDYING',
                    streak: userStreak,
                    isCameraOn: isWebcamOn,
                    isMicOn: isMicOn,
                    isSelf: true,
                  };
                  const spotlightTarget =
                    allSortedParticipants.find((p) => p.id === (spotlightUserId || pinnedIds[0])) ||
                    allSortedParticipants[0] ||
                    fallbackSelf;

                  const isTargetSelf = spotlightTarget.id === myId;

                  return (
                    <div className="w-full max-w-4xl h-full max-h-[75vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 group">
                      <ParticipantTile
                        participant={spotlightTarget}
                        isSelf={isTargetSelf}
                        isPinned={true}
                        isCompact={false}
                        isHost={isHost}
                        roomHostId={room.hostId}
                        stream={isTargetSelf ? webcamStreamRef.current : null}
                        onTogglePin={(id) => togglePin(id)}
                        onSendKudos={(id, emoji) => sendTileFire(spotlightTarget.name, id)}
                        onKick={handleKickUser}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLayoutSettings((prev) => ({ ...prev, mode: 'auto' }));
                        }}
                        className="absolute top-4 right-4 z-30 bg-[#202124]/90 hover:bg-[#3c4043] text-white border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-xl cursor-pointer"
                      >
                        <PinOff className="w-3.5 h-3.5" />
                        <span>Thoát Tiêu Điểm</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : layoutSettings.mode === 'sidebar' ? (
              /* VIEW: SIDEBAR MODE (75% Spotlight Left + 25% Filmstrip Right) */
              <div className="flex-1 flex overflow-hidden p-2 sm:p-3 gap-3">
                {/* Left Main Spotlight (75%) */}
                <div className="flex-1 h-full flex items-center justify-center rounded-2xl overflow-hidden relative shadow-lg">
                  {(() => {
                    const fallbackSelf: MeetParticipant = {
                      id: myId,
                      name: myName,
                      avatar: currentUserAvatar,
                      goal: userTask,
                      presence: 'STUDYING',
                      streak: userStreak,
                      isCameraOn: isWebcamOn,
                      isMicOn: isMicOn,
                      isSelf: true,
                    };
                    const spotlightTarget =
                      allSortedParticipants.find((p) => p.id === (spotlightUserId || pinnedIds[0])) ||
                      allSortedParticipants[0] ||
                      fallbackSelf;

                    return (
                      <div className="w-full h-full max-h-[75vh] relative rounded-2xl overflow-hidden shadow-xl">
                        <ParticipantTile
                          participant={spotlightTarget}
                          isSelf={spotlightTarget.id === myId}
                          isPinned={isPinned(spotlightTarget.id)}
                          isCompact={false}
                          isHost={isHost}
                          roomHostId={room.hostId}
                          stream={spotlightTarget.id === myId ? webcamStreamRef.current : null}
                          onTogglePin={(id) => togglePin(id)}
                          onSendKudos={(id, emoji) => sendTileFire(spotlightTarget.name, id)}
                          onKick={handleKickUser}
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Right Vertical Filmstrip (25%) */}
                <div className="w-56 sm:w-64 md:w-72 h-full flex flex-col gap-2 overflow-y-auto pr-1">
                  {allSortedParticipants
                    .filter((p) => p.id !== (spotlightUserId || pinnedIds[0] || allSortedParticipants[0]?.id))
                    .slice(0, 15)
                    .map((p) => (
                      <div
                        key={`filmstrip-${p.id}`}
                        className="h-36 shrink-0 relative cursor-pointer"
                        onClick={() => setSpotlightUserId(p.id)}
                      >
                        <ParticipantTile
                          participant={p}
                          isSelf={p.id === myId}
                          isPinned={isPinned(p.id)}
                          isCompact={true}
                          isHost={isHost}
                          roomHostId={room.hostId}
                          stream={p.id === myId ? webcamStreamRef.current : null}
                          onTogglePin={(id) => togglePin(id)}
                          onSendKudos={(id, emoji) => sendTileFire(p.name, id)}
                          onTileClick={() => setSpotlightUserId(p.id)}
                          onKick={handleKickUser}
                        />
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* VIEW: AUTO / TILED 16:9 GRID WITH OVERFLOW TILE */
              <div
                ref={stageContainerRef}
                className="flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden"
              >
                <div
                  style={meetGridStyle}
                  className="transition-all duration-300 w-full h-full"
                >
                  {(() => {
                    const fallbackSelf: MeetParticipant = {
                      id: myId,
                      name: myName,
                      avatar: currentUserAvatar,
                      goal: userTask,
                      presence: 'STUDYING',
                      streak: userStreak,
                      isCameraOn: isWebcamOn,
                      isMicOn: isMicOn,
                      isSelf: true,
                    };
                    const displayList = visibleParticipants.length > 0 ? visibleParticipants : [fallbackSelf];

                    return displayList.map((participant) => (
                      <ParticipantTile
                        key={participant.id}
                        participant={participant}
                        isSelf={participant.id === myId}
                        isPinned={isPinned(participant.id)}
                        isCompact={isMeetCompact || layoutSettings.maxTiles >= 30}
                        isHost={isHost}
                        roomHostId={room.hostId}
                        stream={participant.id === myId ? webcamStreamRef.current : null}
                        onTogglePin={(id) => togglePin(id)}
                        onSendKudos={(id, emoji) => sendTileFire(participant.name, id)}
                        onTileClick={(p) => {
                          setSpotlightUserId(p.id);
                        }}
                        onKick={handleKickUser}
                      />
                    ));
                  })()}

                  {hasOverflow && (
                    <OverflowTile
                      count={overflowCount}
                      previewAvatars={overflowPreviewAvatars}
                      isCompact={isMeetCompact || layoutSettings.maxTiles >= 30}
                      onClick={() => {
                        setIsDrawerOpen(true);
                        setActiveDrawerTab('members');
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Side-by-Side Drawer (Chat, Members, Tasks, Rank) */}
          {isDrawerOpen && (
            <aside className={`w-80 sm:w-88 md:w-96 h-full border-l rounded-2xl flex flex-col overflow-hidden transition-all duration-300 z-20 shrink-0 shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#181a1d] border-white/10 text-white'
            }`}>
            {/* Header Tabs */}
            <div className={`flex items-center justify-between border-b p-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1e2023] border-white/10'}`}>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('members')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                    activeDrawerTab === 'members'
                      ? (isLight ? 'text-emerald-700 bg-white shadow-xs' : 'text-emerald-400 bg-white/10')
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Thành viên ({allSortedParticipants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('chat')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                    activeDrawerTab === 'chat'
                      ? (isLight ? 'text-emerald-700 bg-white shadow-xs' : 'text-emerald-400 bg-white/10')
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('tasks')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                    activeDrawerTab === 'tasks'
                      ? (isLight ? 'text-emerald-700 bg-white shadow-xs' : 'text-emerald-400 bg-white/10')
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Mục tiêu
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:bg-white/10 cursor-pointer"
                title="Đóng bảng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: MEMBERS ROSTER (WITH SEARCH) */}
            {activeDrawerTab === 'members' && (
              <div className="flex-1 flex flex-col p-3 overflow-hidden">
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên học viên..."
                    className={`w-full text-xs pl-8 pr-3 py-2 rounded-xl border focus:outline-none transition ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                        : 'bg-white/5 border-white/10 text-white focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {allSortedParticipants
                    .filter((p) =>
                      !memberSearchQuery ||
                      p.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      (p.goal && p.goal.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                    )
                    .map((p) => {
                      const isSelf = p.id === myId;
                      const pinned = isPinned(p.id);
                      return (
                        <div
                          key={`member-${p.id}`}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                              : 'bg-white/5 hover:bg-white/10 border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`}
                              alt={p.name}
                              className="w-8 h-8 rounded-full bg-slate-800 shrink-0 object-cover ring-1 ring-white/10"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold truncate">
                                  {p.name} {isSelf && '(Bạn)'}
                                </span>
                                {(p.streak || p.streakDays) && (
                                  <span className="text-[10px] text-amber-500 font-bold shrink-0">
                                    🔥{p.streak || p.streakDays}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                {p.goal || p.studyGoal || 'Đang tập trung học...'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => sendTileFire(p.name, p.id)}
                              className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-500 text-xs transition cursor-pointer"
                              title="Tiếp lửa"
                            >
                              🔥
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePin(p.id)}
                              className={`p-1 rounded-lg text-xs transition cursor-pointer ${
                                pinned
                                  ? 'text-cyan-400 bg-cyan-500/20'
                                  : 'text-slate-400 hover:text-white hover:bg-white/10'
                              }`}
                              title={pinned ? 'Bỏ ghim' : 'Ghim'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            {isHost && !isSelf && (
                              <button
                                type="button"
                                onClick={() => handleKickUser(p)}
                                className="p-1 rounded-lg text-xs transition cursor-pointer text-red-400 hover:text-white hover:bg-red-500/30"
                                title="Kích học viên này ra khỏi phòng (Quyền Chủ phòng)"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 2: SMART BREAK CHAT */}
            {activeDrawerTab === 'chat' && (
              <div className="flex-1 overflow-hidden p-2">
                <SmartBreakChat
                  phase={pomodoroPhase}
                  messages={realtimeChatMessages}
                  currentUserId={myId}
                  onSendMessage={(text) => {
                    if (socketRef.current) {
                      socketRef.current.emit('room:chat', {
                        roomId: room.id,
                        userId: myId,
                        userName: myName,
                        userAvatar: currentUserAvatar,
                        text,
                      });
                    }
                    setRealtimeChatMessages((prev) => [
                      ...prev,
                      {
                        id: `local_${Date.now()}`,
                        userId: myId,
                        userName: myName,
                        userAvatar: currentUserAvatar,
                        text,
                        createdAt: new Date().toISOString(),
                      },
                    ]);
                  }}
                  onSendKudos={(emoji) => triggerBatchKudos(emoji)}
                  isLight={isLight}
                />
              </div>
            )}

            {/* TAB 3: TASKS (RULE OF 3) */}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRealTask()}
                    placeholder="Thêm mục tiêu mới..."
                    className={`flex-1 text-xs px-3 py-1.5 rounded-xl border focus:outline-none transition ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddRealTask}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {roomTasks.map((task) => {
                    const isDone = task.status === 'Hoàn thành' || task.status === 'Done';
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleRealTask(task)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isDone
                            ? (isLight ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-emerald-950/20 border-emerald-500/20 opacity-60')
                            : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10')
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isDone ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-slate-400" />}
                          <span className={`text-xs ${isDone ? 'line-through text-slate-400' : ''}`}>{task.title}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}
        </div>
      </main>

      {/* ========================================================= */}
      {/* 4. BOTTOM DOCK: GOOGLE MEET CONTROL BAR (#202124 h-76px)   */}
      {/* ========================================================= */}
      {!zenMode && (
        <BottomControlBar
          roomName={localRoomName || room.name || 'Phòng Học Chung'}
          onlineCount={highScaleMembers.length || collectiveEnergy.activeCount || 1}
          userGoal={userTask}
          pomodoro={{
            phase: pomodoroPhase,
            timeFormatted: formatPomodoroTime(pomodoroLeft),
            isRunning: isPomodoroRunning,
          }}
          unreadChatCount={realtimeChatMessages.length}
          isDrawerOpen={isDrawerOpen}
          activeDrawerTab={activeDrawerTab === 'chat' ? 'chat' : 'members'}
          isLight={isLight}
          isFullscreen={isFullscreen}
          isHost={isHost}
          isMicOn={isMicOn}
          isCameraOn={isWebcamOn}
          isScreenSharing={isScreenSharing}
          isYouTubePlaying={isYouTubePlaying}
          youTubeTrackTitle={youTubeTrackTitle}
          onToggleMic={toggleDockMic}
          onToggleCamera={toggleDockCam}
          onToggleScreenShare={toggleScreenShare}
          onOpenYouTubePlayer={() => setIsYouTubePlayerOpen(true)}
          onOpenRoomSettings={() => setIsRoomSettingsOpen(true)}
          onTogglePlayPomodoro={togglePomoTimer}
          onResetPomodoro={resetPomoTimer}
          onEditGoalClick={editUserTask}
          onOpenAmbientMusic={() => {
            initAudioContext();
            setIsSoundPopoverOpen((prev) => !prev);
          }}
          onSendKudosClick={() => triggerBatchKudos('🔥')}
          onOpenLayoutSettings={() => setIsLayoutModalOpen(true)}
          onLeaveRoomClick={() => setShowSummaryModal(true)}
          onToggleDrawer={(tab) => {
            if (isDrawerOpen && activeDrawerTab === tab) {
              setIsDrawerOpen(false);
            } else {
              setIsDrawerOpen(true);
              setActiveDrawerTab(tab);
            }
          }}
          onToggleTheme={toggleThemeMode}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* YOUTUBE STUDY MUSIC PLAYER */}
      <YouTubeStudyPlayer
        isOpen={isYouTubePlayerOpen}
        onClose={() => setIsYouTubePlayerOpen(false)}
        isLight={isLight}
        onPlayStateChange={(playing, title) => {
          setIsYouTubePlaying(playing);
          setYouTubeTrackTitle(title);
        }}
      />

      {/* AMBIENT SOUND POPOVER */}
      {isSoundPopoverOpen && (
        <div className={`fixed bottom-22 left-1/2 -translate-x-1/2 w-88 rounded-3xl p-5 border shadow-2xl z-50 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${
          isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-[#181a1d]/95 border-white/10 text-white backdrop-blur-xl'
        }`}>
          <div className={`flex justify-between items-center border-b pb-2.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <span className="text-xs font-bold flex items-center gap-2 text-cyan-400">
              <Sliders className="w-4 h-4" /> ÂM THANH NỀN TẬP TRUNG
            </span>
            <button
              type="button"
              onClick={() => setIsSoundPopoverOpen(false)}
              className="opacity-50 hover:opacity-100 cursor-pointer p-1 rounded-full hover:bg-white/10 transition"
              title="Đóng bảng âm thanh"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sound 1: Rain */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-200">🌧️ Tiếng mưa rơi</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  synthStates.rain.active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-400'
                }`}>
                  {synthStates.rain.active ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Đang phát</span>
                    </>
                  ) : (
                    <span>Tắt</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSoundSynth('rain')}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 cursor-pointer focus:outline-none ${
                    synthStates.rain.active ? 'bg-emerald-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                  }`}
                  title={synthStates.rain.active ? 'Nhấn để tắt tiếng mưa' : 'Nhấn để bật tiếng mưa'}
                >
                  <span
                    className={`inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out ${
                      synthStates.rain.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={synthStates.rain.vol}
              onChange={(e) => updateSoundVol('rain', parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 rounded-lg cursor-pointer bg-slate-700/50"
            />
          </div>

          {/* Sound 2: Keyboard */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-200">⌨️ Phím cơ gõ lách cách</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  synthStates.keyboard.active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-400'
                }`}>
                  {synthStates.keyboard.active ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Đang phát</span>
                    </>
                  ) : (
                    <span>Tắt</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSoundSynth('keyboard')}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 cursor-pointer focus:outline-none ${
                    synthStates.keyboard.active ? 'bg-emerald-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                  }`}
                  title={synthStates.keyboard.active ? 'Nhấn để tắt tiếng phím cơ' : 'Nhấn để bật tiếng phím cơ'}
                >
                  <span
                    className={`inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out ${
                      synthStates.keyboard.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={synthStates.keyboard.vol}
              onChange={(e) => updateSoundVol('keyboard', parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 rounded-lg cursor-pointer bg-slate-700/50"
            />
          </div>

          {/* Sound 3: Cafe */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-200">☕ Không gian quán Cafe</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  synthStates.cafe.active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-400'
                }`}>
                  {synthStates.cafe.active ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Đang phát</span>
                    </>
                  ) : (
                    <span>Tắt</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSoundSynth('cafe')}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 cursor-pointer focus:outline-none ${
                    synthStates.cafe.active ? 'bg-emerald-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                  }`}
                  title={synthStates.cafe.active ? 'Nhấn để tắt không gian cafe' : 'Nhấn để bật không gian cafe'}
                >
                  <span
                    className={`inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out ${
                      synthStates.cafe.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={synthStates.cafe.vol}
              onChange={(e) => updateSoundVol('cafe', parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 rounded-lg cursor-pointer bg-slate-700/50"
            />
          </div>

          {/* Sound 4: Lofi */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-200">🎵 Giai điệu Lo-Fi sâu lắng</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  synthStates.lofi.active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-400'
                }`}>
                  {synthStates.lofi.active ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Đang phát</span>
                    </>
                  ) : (
                    <span>Tắt</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSoundSynth('lofi')}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 cursor-pointer focus:outline-none ${
                    synthStates.lofi.active ? 'bg-emerald-500' : isLight ? 'bg-slate-300' : 'bg-slate-700'
                  }`}
                  title={synthStates.lofi.active ? 'Nhấn để tắt lofi' : 'Nhấn để bật lofi'}
                >
                  <span
                    className={`inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out ${
                      synthStates.lofi.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={synthStates.lofi.vol}
              onChange={(e) => updateSoundVol('lofi', parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 rounded-lg cursor-pointer bg-slate-700/50"
            />
          </div>
        </div>
      )}

      {/* MODAL: GOOGLE MEET LAYOUT SETTINGS */}
      <LayoutSettingsModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        currentSettings={layoutSettings}
        onSaveSettings={(settings) => setLayoutSettings(settings)}
      />

      {/* MODAL: HOST ROOM SETTINGS */}
      {isHost && (
        <RoomSettingsModal
          isOpen={isRoomSettingsOpen}
          onClose={() => setIsRoomSettingsOpen(false)}
          currentSettings={{
            name: localRoomName,
            topic: localRoomTopic,
            focusDuration: pomodoroDuration,
            breakDuration: 5 * 60,
            chatMode: 'break_only',
          }}
          onSave={handleSaveRoomSettings}
          isLight={isLight}
        />
      )}
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

  if (typeof document !== 'undefined') {
    return createPortal(roomContent, document.body);
  }
  return roomContent;
}
