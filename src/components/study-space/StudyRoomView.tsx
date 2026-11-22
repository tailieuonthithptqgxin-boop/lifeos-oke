import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Volume2,
  VolumeX,
  Target,
  Coffee,
  MessageSquare,
  Share2,
  CheckCircle2,
  Flame,
  Award,
  Users,
  LogOut,
  Send,
  X,
  Sparkles,
  ChevronDown,
  Smile,
  Shield,
  Zap,
  Play,
  Pause,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { apiCall } from '../../lib/apiClient';
import { toast } from '../../lib/toast';
import { triggerConfetti } from '../../lib/confetti';
import { soundEngine } from '../../lib/soundEngine';
import { ambientSoundMixer, AmbientTrackId } from '../../lib/ambientSoundMixer';
import { recordUserActivity } from '../../lib/globalUserSync';
import { notifyStudyCommunity } from '../../lib/unifiedNotificationEngine';

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
  pomodoro: {
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

interface FloatingCheer {
  id: string;
  emoji: string;
  text: string;
  senderName: string;
  x: number; // percentage across screen
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
  language = 'vi'
}: StudyRoomViewProps) {
  const { currentUser } = useAppStore();

  // Local state
  const [currentGoal, setCurrentGoal] = useState<string>(() => {
    const me = room.members?.find((m) => m.userId === currentUser?.id);
    return me?.studyGoal || 'Đang tập trung học tập...';
  });
  const [isGoalCompleted, setIsGoalCompleted] = useState<boolean>(() => {
    const me = room.members?.find((m) => m.userId === currentUser?.id);
    return Boolean(me?.studyGoalCompleted);
  });

  // Focus time counter (seconds spent in session)
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [joinedTimestamp, setJoinedTimestamp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lifeos_active_study_desk_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.roomId === room.id && parsed?.joinedAt) {
          return parsed.joinedAt;
        }
      }
    } catch {}
    return Date.now();
  });

  // Active Ambient Sound Tracks
  const [activeSound, setActiveSound] = useState<AmbientTrackId | null>('rain');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals & Bottom Drawers
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState(currentGoal);
  const [showCheerSheet, setShowCheerSheet] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Floating cheers animations array
  const [floatingCheers, setFloatingCheers] = useState<FloatingCheer[]>([]);

  // Visible desks limit (for 60fps mobile pagination)
  const [visibleDeskLimit, setVisibleDeskLimit] = useState(24);

  // Pomodoro countdown timer calculation
  const [pomodoroLeftSeconds, setPomodoroLeftSeconds] = useState<number>(1500);
  const [pomodoroPhase, setPomodoroPhase] = useState<'FOCUS' | 'BREAK'>('FOCUS');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioInitializedRef = useRef(false);

  // -------------------------------------------------------------
  // 1. Pomodoro Synchronization (Sync with Server Timestamps)
  // -------------------------------------------------------------
  useEffect(() => {
    const updatePomo = () => {
      const p = room.pomodoro;
      if (!p) {
        setPomodoroLeftSeconds(1500);
        setPomodoroPhase('FOCUS');
        return;
      }

      setPomodoroPhase(p.phase || 'FOCUS');

      if (p.isRunning && p.startedAt) {
        const elapsedSec = Math.floor((Date.now() - p.startedAt) / 1000);
        const remaining = Math.max(0, p.duration - elapsedSec);
        setPomodoroLeftSeconds(remaining);
      } else {
        setPomodoroLeftSeconds(p.duration || 1500);
      }
    };

    updatePomo();
    const timer = setInterval(updatePomo, 1000);
    return () => clearInterval(timer);
  }, [room.pomodoro]);

  // -------------------------------------------------------------
  // 2. Personal Focus Stopwatch & localStorage Persistence (F5 Resilience)
  // -------------------------------------------------------------
  useEffect(() => {
    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - joinedTimestamp) / 1000);
      setSessionSeconds(elapsed);

      // Persist state for F5 reload resilience
      try {
        localStorage.setItem(
          'lifeos_active_study_desk_v2',
          JSON.stringify({
            roomId: room.id,
            roomName: room.name,
            goal: currentGoal,
            joinedAt: joinedTimestamp,
            lastPing: Date.now()
          })
        );
      } catch {}
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [joinedTimestamp, room.id, room.name, currentGoal]);

  // -------------------------------------------------------------
  // 3. Heartbeat Ping (60s Batching - Zero Server Overload)
  // -------------------------------------------------------------
  useEffect(() => {
    const pingServer = async () => {
      try {
        await apiCall(`/api/study-space/rooms/${room.id}/ping`, 'POST');
      } catch {
        // silent fail on network jitter
      }
    };

    const pingInterval = setInterval(pingServer, 60000);
    return () => clearInterval(pingInterval);
  }, [room.id]);

  const handleLeaveRoom = () => {
    if (sessionSeconds >= 60) {
      try {
        recordUserActivity('study', Math.round(sessionSeconds / 60));
      } catch {}
    }
    onLeaveRoom();
  };

  // -------------------------------------------------------------
  // 4. Ambient Sound Initializer
  // -------------------------------------------------------------
  useEffect(() => {
    // Start ambient rain by default if not yet started
    if (!audioInitializedRef.current) {
      audioInitializedRef.current = true;
      try {
        ambientSoundMixer.toggleTrack('rain');
        ambientSoundMixer.setTrackVolume('rain', 0.45);
      } catch {}
    }

    return () => {
      // Pause ambient audio when leaving room
      try {
        ambientSoundMixer.stopAll();
      } catch {}
    };
  }, []);

  const handleToggleSound = (trackId: AmbientTrackId) => {
    try {
      soundEngine.play('click');
      if (activeSound === trackId) {
        // Toggle off
        ambientSoundMixer.toggleTrack(trackId);
        setActiveSound(null);
      } else {
        // Switch to new track
        if (activeSound) {
          ambientSoundMixer.toggleTrack(activeSound);
        }
        ambientSoundMixer.toggleTrack(trackId);
        ambientSoundMixer.setTrackVolume(trackId, ambientVolume);
        setActiveSound(trackId);
      }
    } catch (e) {
      console.warn('Ambient mixer audio context error:', e);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setAmbientVolume(newVol);
    if (activeSound) {
      ambientSoundMixer.setTrackVolume(activeSound, newVol);
    }
  };

  // -------------------------------------------------------------
  // 5. Goal Completion
  // -------------------------------------------------------------
  const handleCompleteGoal = async () => {
    if (isGoalCompleted) return;
    setIsGoalCompleted(true);
    triggerConfetti();
    soundEngine.play('celebration');
    toast.success('🎉 Xuất sắc! Bạn đã hoàn thành mục tiêu ca học này!');

    const studyMinutes = Math.max(1, Math.round(sessionSeconds / 60));
    try {
      recordUserActivity('study', studyMinutes);
    } catch {}

    try {
      await apiCall(`/api/study-space/rooms/${room.id}/complete-goal`, 'POST');
    } catch {}
  };

  // -------------------------------------------------------------
  // 6. Update Goal Modal
  // -------------------------------------------------------------
  const handleSaveGoal = async () => {
    const clean = goalInput.trim();
    if (!clean) {
      toast.error('Vui lòng nhập mục tiêu cần làm');
      return;
    }
    setCurrentGoal(clean);
    setIsGoalCompleted(false);
    setShowGoalModal(false);
    onUpdateGoal(clean);
    toast.success('Đã cập nhật mục tiêu mới! Hãy cùng tập trung nhé 🎯');
  };

  // -------------------------------------------------------------
  // 7. Cheer Reaction (Floating Emojis)
  // -------------------------------------------------------------
  const triggerCheer = async (type: string, text: string) => {
    setShowCheerSheet(false);
    soundEngine.play('badge');

    const emojiMap: Record<string, string> = {
      fire: '🔥',
      coffee: '☕',
      zap: '⚡',
      clap: '👏',
      heart: '❤️'
    };

    const newCheer: FloatingCheer = {
      id: Math.random().toString(),
      emoji: emojiMap[type] || '🔥',
      text,
      senderName: currentUser?.name || 'Bạn',
      x: 20 + Math.random() * 60 // 20% to 80% screen width
    };

    setFloatingCheers((prev) => [...prev, newCheer]);
    setTimeout(() => {
      setFloatingCheers((prev) => prev.filter((c) => c.id !== newCheer.id));
    }, 3500);

    try {
      await apiCall(`/api/study-space/rooms/${room.id}/cheer`, 'POST', {
        cheerType: type,
        cheerText: text
      });
    } catch {}

    toast.success(`Đã gửi lời cổ vũ: "${text}" ✨`);
  };

  // -------------------------------------------------------------
  // 8. Share Room Link with Affiliate Code (?ref=...)
  // -------------------------------------------------------------
  const handleShareWithRef = () => {
    soundEngine.play('click');
    const refCode = currentUser?.referralCode || (currentUser as any)?.referral_code || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lifeos.vn';
    const refParam = refCode ? `&ref=${encodeURIComponent(refCode)}` : '';
    const shareUrl = `${origin}/?view=study-space&room=${encodeURIComponent(room.id)}${refParam}`;

    try {
      navigator.clipboard.writeText(shareUrl);
      triggerConfetti();
      toast.success(
        '🤝 Đã sao chép link bàn học! Bạn bè vào cùng bàn sẽ tự động được ghi nhận vào đội nhóm Cộng tác viên của bạn 🎁'
      );
      // Luồng 5: Thông báo rủ bạn bè vào bàn học
      notifyStudyCommunity(
        'FRIEND_INVITE',
        `Bạn vừa tạo lời mời vào bàn học live "${room.name || 'Phòng học ảo'}". Link mời đã kèm mã CTV của bạn!`
      ).catch(() => {});
    } catch {
      toast.info(`Link phòng học: ${shareUrl}`);
    }
  };

  // -------------------------------------------------------------
  // 9. Send Chat Message
  // -------------------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatMessageInput.trim();
    if (!text || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      await apiCall(`/api/study-space/rooms/${room.id}/messages`, 'POST', { text });
      setChatMessageInput('');
      soundEngine.play('send');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gửi tin nhắn');
    } finally {
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    if (showChatDrawer) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room.messages?.length, showChatDrawer]);

  // Format Helpers
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHoursMins = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} phút`;
    return `${h}g ${m}p`;
  };

  // Filter members list: remove current user from others list
  const otherMembers = (room.members || []).filter((m) => m.userId !== currentUser?.id);
  const visibleMembers = otherMembers.slice(0, visibleDeskLimit);
  const totalDesksCount = (room.members?.length || 0);

  return (
    <div className="relative min-h-[92vh] flex flex-col justify-between font-sans pb-28 select-none">
      {/* Floating Cheers Animations Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingCheers.map((cheer) => (
          <div
            key={cheer.id}
            style={{ left: `${cheer.x}%` }}
            className="absolute bottom-24 animate-in fade-in slide-in-from-bottom-20 duration-1000 flex flex-col items-center gap-1 transition-all"
          >
            <span className="text-4xl sm:text-5xl animate-bounce drop-shadow-md">{cheer.emoji}</span>
            <div className="bg-black/80 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
              <span>{cheer.senderName}: </span>
              <span className="text-amber-300">{cheer.text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* TẦNG 1: THANH ĐỒNG HỒ & ÂM THANH NỀN (TOP BAR)            */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3.5 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
          {/* Top row: Room title + Live counter + Leave button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                  {room.name}
                </h1>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{room.topic}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <Users className="w-3 h-3" />
                    <span>
                      {totalDesksCount === 0
                        ? 'Bàn đang trống'
                        : totalDesksCount === 1
                        ? '1 bạn đang ngồi học (Bàn của bạn)'
                        : `${totalDesksCount} bạn đang ngồi học`}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Leave Room Button */}
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:text-slate-300 dark:hover:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Rời bàn</span>
            </button>
          </div>

          {/* Bottom row: Pomodoro clock badge + Ambient sound selector pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
            {/* Pomodoro Live Clock */}
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                  pomodoroPhase === 'FOCUS'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>{formatTime(pomodoroLeftSeconds)}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider ml-1">
                  {pomodoroPhase === 'FOCUS' ? '🔥 Giờ Tập Trung' : '☕ Giờ Giải Lao'}
                </span>
              </div>
            </div>

            {/* Ambient Sound 1-Tap Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 hidden sm:inline">Âm thanh:</span>
              {[
                { id: 'rain', label: '🌧️ Mưa', name: 'Tiếng mưa' },
                { id: 'cafe', label: '☕ Cafe', name: 'Quán cafe' },
                { id: 'campfire', label: '🔥 Lửa trại', name: 'Lửa trại' },
                { id: 'lofi', label: '🎧 Lo-Fi', name: 'Nhạc chill' }
              ].map((s) => {
                const isActive = activeSound === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleToggleSound(s.id as AmbientTrackId)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs scale-102 ring-1 ring-indigo-400 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={s.name}
                  >
                    <span>{s.label}</span>
                  </button>
                );
              })}

              {/* Mute button */}
              {activeSound && (
                <button
                  type="button"
                  onClick={() => handleToggleSound(activeSound)}
                  className="p-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-500 cursor-pointer text-xs"
                  title="Tắt âm thanh nền"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* TẦNG 2: KHU VỰC BÀN HỌC CHUNG (LƯỚI 2 CỘT TRÊN MOBILE)     */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 space-y-4">
        {/* Banner Vibe Reminder */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-3 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Không video call nặng máy • Mọi người cùng hiện diện và tích lũy từng phút tập trung!
            </span>
          </div>
          <button
            type="button"
            onClick={handleShareWithRef}
            className="text-indigo-600 dark:text-indigo-400 font-black hover:underline shrink-0 flex items-center gap-1"
          >
            <span>Rủ bạn (?ref)</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Desks Grid (2 columns on mobile, 3 columns sm, 4 columns lg) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* ----------------------------------------------------- */}
          {/* Ô 1: BÀN CỦA BẠN (Nổi bật nhất)                        */}
          {/* ----------------------------------------------------- */}
          <div className="relative rounded-3xl p-4 bg-linear-to-b from-indigo-500/15 via-purple-500/10 to-white dark:to-slate-900 border-2 border-indigo-500 shadow-lg shadow-indigo-500/15 flex flex-col justify-between space-y-3 transition-transform hover:scale-101">
            {/* Header: User avatar + Your Badge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider shadow-xs">
                  Bàn của bạn 🌟
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-500">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{Math.floor(sessionSeconds / 60)}p</span>
                </span>
              </div>

              {/* User profile row */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img
                    src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'You')}&background=6366f1&color=fff`}
                    alt="Avatar của bạn"
                    className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500 shadow-xs"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {currentUser?.name || 'Bạn'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <span>🔥 {currentUser?.streakDays ?? 0} ngày</span>
                    <span>•</span>
                    <span className="text-purple-600 dark:text-purple-400 truncate">{currentUser?.badgeLevel || (currentUser?.isAffiliate ? '⭐ CTV LifeOS' : 'Tân Binh')}</span>
                  </div>
                </div>
              </div>

              {/* Current Goal Box */}
              <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/40 text-left space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>Mục tiêu hiện tại:</span>
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(true)}
                    className="text-indigo-600 hover:underline cursor-pointer"
                  >
                    Đổi
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 break-words">
                  {currentGoal}
                </p>
              </div>
            </div>

            {/* Complete Goal Button (1-Tap) */}
            <div className="pt-2">
              {isGoalCompleted ? (
                <div className="w-full py-2 px-3 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã xong mục tiêu! 🎉</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteGoal}
                  className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hoàn thành (✅)</span>
                </button>
              )}
            </div>
          </div>

          {/* ----------------------------------------------------- */}
          {/* CÁC BÀN HỌC KHÁC TRONG PHÒNG                          */}
          {/* ----------------------------------------------------- */}
          {otherMembers.length === 0 ? (
            <div className="col-span-1 rounded-3xl p-4 bg-slate-50/70 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2 py-6">
              <span className="text-2xl">🌱</span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Không gian học yên tĩnh
              </p>
              <p className="text-[11px] text-slate-400 max-w-[180px] leading-relaxed">
                Chưa có bạn học khác trong phòng. Hãy rủ bạn bè vào học cùng hoặc tận hưởng sự tập trung của riêng bạn!
              </p>
              <button
                type="button"
                onClick={handleShareWithRef}
                className="mt-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
              >
                <span>Rủ bạn học cùng</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : (
            visibleMembers.map((member, index) => {
            const minutesStudied = Math.floor((Date.now() - member.joinedAt) / 60000);
            const badgeTitle = member.badge || (member.championCount && member.championCount > 0 ? 'Quán Quân' : 'Chiến Binh');

            return (
              <div
                key={member.userId || index}
                className="relative rounded-3xl p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between space-y-3 transition-all"
              >
                <div className="space-y-2">
                  {/* Top status */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[85px]">
                      {badgeTitle}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-amber-500 shrink-0">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{minutesStudied}p</span>
                    </span>
                  </div>

                  {/* Member info */}
                  <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      <img
                        src={member.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.userName)}&background=10b981&color=fff`}
                        alt={member.userName}
                        className="w-9 h-9 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {member.userName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Đang ngồi học
                      </div>
                    </div>
                  </div>

                  {/* Member goal */}
                  <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left min-h-[46px] flex items-center">
                    <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                      {member.studyGoalCompleted ? '✅ ' : '🎯 '}
                      {member.studyGoal || 'Đang tập trung...'}
                    </p>
                  </div>
                </div>

                {/* Desk bottom status */}
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {member.studyGoalCompleted ? 'Đã xong' : 'Tập trung'}
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerCheer('fire', `Gửi năng lượng tới ${member.userName} 🔥`)}
                    className="text-slate-400 hover:text-amber-500 cursor-pointer"
                    title="Gửi tim / cổ vũ"
                  >
                    ☕ Cổ vũ
                  </button>
                </div>
              </div>
            );
          })
        )}
        </div>

        {/* Show more desks button for 60fps mobile pagination */}
        {otherMembers.length > visibleDeskLimit && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleDeskLimit((prev) => prev + 20)}
              className="px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              Xem thêm {otherMembers.length - visibleDeskLimit} bàn học khác ⬇
            </button>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* TẦNG 3: THANH CÔNG CỤ 4 NÚT DƯỚI ĐÁY MÀN HÌNH (>= 44PX)   */}
      {/* ========================================================= */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xl safe-area-pb">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-2">
          {/* Nút 1: Đặt mục tiêu */}
          <button
            type="button"
            onClick={() => {
              setGoalInput(currentGoal);
              setShowGoalModal(true);
            }}
            className="min-h-[44px] h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-95 text-slate-700 dark:text-slate-200 hover:text-indigo-600 font-extrabold text-[11px] sm:text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700/60"
          >
            <Target className="w-4 h-4 text-indigo-500" />
            <span>Mục tiêu</span>
          </button>

          {/* Nút 2: Cổ vũ */}
          <button
            type="button"
            onClick={() => setShowCheerSheet(true)}
            className="min-h-[44px] h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95 text-amber-900 dark:text-amber-200 font-extrabold text-[11px] sm:text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border border-amber-200 dark:border-amber-800/60 shadow-xs"
          >
            <Coffee className="w-4 h-4 text-amber-500" />
            <span>Cổ vũ</span>
          </button>

          {/* Nút 3: Trò chuyện */}
          <button
            type="button"
            onClick={() => setShowChatDrawer(true)}
            className="min-h-[44px] h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 active:scale-95 text-slate-700 dark:text-slate-200 hover:text-purple-600 font-extrabold text-[11px] sm:text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700/60 relative"
          >
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span>Trò chuyện</span>
            {room.messages && room.messages.length > 0 && (
              <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-purple-500" />
            )}
          </button>

          {/* Nút 4: Rủ bạn ngồi cạnh (+ Mã giới thiệu CTV) */}
          <button
            type="button"
            onClick={handleShareWithRef}
            className="min-h-[44px] h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white font-extrabold text-[11px] sm:text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
          >
            <Share2 className="w-4 h-4 text-amber-300" />
            <span>Rủ bạn</span>
          </button>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* MODAL 1: ĐẶT MỤC TIÊU CA HỌC                              */}
      {/* ========================================================= */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Mục Tiêu Ca Học Này
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Nhập việc cụ thể bạn sẽ hoàn thành trong 25 phút Pomodoro tiếp theo:
            </p>

            <textarea
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Ôn 30 từ vựng Oxford, Giải 5 bài tập Toán..."
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveGoal}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Lưu mục tiêu 🎯
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CỔ VŨ BẠN CÙNG PHÒNG (CHEER SHEET)              */}
      {/* ========================================================= */}
      {showCheerSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Cổ Vũ Bạn Cùng Phòng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheerSheet(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Gửi một lời động viên nhanh để tiếp thêm năng lượng mà không làm phiền người khác:
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {[
                { type: 'fire', text: 'Cố lên bạn ơi! 🔥', desc: 'Tiếp thêm lửa tập trung' },
                { type: 'coffee', text: 'Tặng bạn 1 ly cafe! ☕', desc: 'Thư giãn & tỉnh táo' },
                { type: 'zap', text: 'Tập trung nào, không lướt top top! ⚡', desc: 'Nhắc nhở kỷ luật' },
                { type: 'clap', text: 'Sắp xong rồi, tuyệt vời! 👏', desc: 'Khen ngợi nỗ lực' }
              ].map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => triggerCheer(c.type, c.text)}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 hover:border-amber-300 text-left flex items-center justify-between transition-all cursor-pointer group active:scale-98"
                >
                  <div>
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white block group-hover:text-amber-700 dark:group-hover:text-amber-300">
                      {c.text}
                    </span>
                    <span className="text-[10px] text-slate-400">{c.desc}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DRAWER 3: TRÒ CHUYỆN GỌN NHẸ (VỚI BANNER KỶ LUẬT GEN Z)   */}
      {/* ========================================================= */}
      {showChatDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full h-[80vh] max-h-[600px] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    Trò Chuyện Bàn Học
                  </h3>
                  <p className="text-[10px] text-slate-400">{room.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatDrawer(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Focus Reminder Banner */}
            <div className="px-4 py-2 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/40 text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
              {pomodoroPhase === 'FOCUS' ? (
                <>
                  <span className="text-base">🤫</span>
                  <span>Đang trong giờ tập trung sâu (25 phút), hạn chế nhắn tin để mọi người cùng cày deadline nhé!</span>
                </>
              ) : (
                <>
                  <span className="text-base">☕</span>
                  <span>Đang trong giờ giải lao (5 phút), hãy thoải mái giao lưu và nghỉ ngơi một chút nào!</span>
                </>
              )}
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(room.messages || []).map((msg) => {
                const isMe = msg.userId === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                      {isMe ? 'Bạn' : msg.userName}
                    </span>
                    <div
                      className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input form */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-900"
            >
              <input
                type="text"
                value={chatMessageInput}
                onChange={(e) => setChatMessageInput(e.target.value)}
                placeholder="Nhắn tin với bàn học..."
                maxLength={300}
                className="flex-1 min-h-[44px] px-3.5 py-2 text-base sm:text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
              />
              <button
                type="submit"
                disabled={!chatMessageInput.trim() || isSendingMessage}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
