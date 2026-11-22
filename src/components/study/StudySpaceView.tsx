import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Award,
  Users,
  Video
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { apiCall } from '../../lib/apiClient';
import { StudyLobby, StudyRoomSummary } from '../study-space/StudyLobby';
import { StudyRoomView, RoomDetail } from '../study-space/StudyRoomView';
import { StudyCreateRoomModal } from '../study-space/StudyCreateRoomModal';
import { RoomCheckInModal } from '../study-space/RoomCheckInModal';
import { OnlineClassroomView } from '../classroom/OnlineClassroomView';

import { analyticsTracker } from '../../lib/analyticsTracker';

interface SessionSummaryData {
  roomName: string;
  minutes: number;
  recordedMinutes: number;
  wasRecorded: boolean;
}

const DEFAULT_STUDY_ROOMS: StudyRoomSummary[] = [
  {
    id: 'room-night-owls',
    name: '🦉 Hội Cú Đêm Cày Deadline',
    topic: 'Cú Đêm & Kỷ Luật',
    hostId: 'system',
    hostName: 'LifeOS System',
    connectionType: 'jitsi',
    jitsiRoomName: 'lifeos-study-night-owls',
    isSystemRoom: true,
    createdAt: new Date().toISOString(),
    status: 'IDLE',
    participantCount: 0,
    inMeetCount: 0,
    recentAvatars: [],
    recentMessageCount: 0,
    pomodoro: { phase: 'FOCUS', duration: 1500, startedAt: null, isRunning: false },
  },
  {
    id: 'room-dalat-rain',
    name: '🌧️ Góc Cafe Mưa Đà Lạt (Lo-Fi & Chill)',
    topic: 'Chill & Lo-Fi',
    hostId: 'system',
    hostName: 'LifeOS System',
    connectionType: 'jitsi',
    jitsiRoomName: 'lifeos-study-dalat-rain',
    isSystemRoom: true,
    createdAt: new Date().toISOString(),
    status: 'IDLE',
    participantCount: 0,
    inMeetCount: 0,
    recentAvatars: [],
    recentMessageCount: 0,
    pomodoro: { phase: 'FOCUS', duration: 1500, startedAt: null, isRunning: false },
  },
  {
    id: 'room-sprint-prep',
    name: '🔥 Phòng Luyện Thi Nước Rút (Tập trung 100%)',
    topic: 'Luyện Thi Nước Rút',
    hostId: 'system',
    hostName: 'LifeOS System',
    connectionType: 'jitsi',
    jitsiRoomName: 'lifeos-study-sprint-prep',
    isSystemRoom: true,
    createdAt: new Date().toISOString(),
    status: 'IDLE',
    participantCount: 0,
    inMeetCount: 0,
    recentAvatars: [],
    recentMessageCount: 0,
    pomodoro: { phase: 'FOCUS', duration: 1500, startedAt: null, isRunning: false },
  },
  {
    id: 'room-healing-reading',
    name: '🌿 Góc Đọc Sách & Chữa Lành',
    topic: 'Đọc Sách & Chữa Lành',
    hostId: 'system',
    hostName: 'LifeOS System',
    connectionType: 'jitsi',
    jitsiRoomName: 'lifeos-study-healing-reading',
    isSystemRoom: true,
    createdAt: new Date().toISOString(),
    status: 'IDLE',
    participantCount: 0,
    inMeetCount: 0,
    recentAvatars: [],
    recentMessageCount: 0,
    pomodoro: { phase: 'FOCUS', duration: 1500, startedAt: null, isRunning: false },
  },
];

interface StudySpaceViewProps {
  initialTab?: 'rooms' | 'classroom';
}

export function StudySpaceView({ initialTab = 'rooms' }: StudySpaceViewProps = {}) {
  const { currentUser, language } = useAppStore();

  const [currentTab, setCurrentTab] = useState<'rooms' | 'classroom'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('tab') === 'classroom' || p.get('google') || p.get('google_error')) return 'classroom';
    }
    return initialTab;
  });

  const [rooms, setRooms] = useState<StudyRoomSummary[]>(DEFAULT_STUDY_ROOMS);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomDetail, setActiveRoomDetail] = useState<RoomDetail | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  // Check-In Modal state
  const [pendingCheckInRoom, setPendingCheckInRoom] = useState<StudyRoomSummary | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Rule 3: Session summary celebratory modal state when user leaves room
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryData | null>(null);

  const roomEventSourceRef = useRef<EventSource | null>(null);
  const lobbyEventSourceRef = useRef<EventSource | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  activeRoomIdRef.current = activeRoomId;

  // 1. Fetch rooms list for Lobby
  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const res = await apiCall<{ success: boolean; rooms: StudyRoomSummary[] }>('/api/study-space/rooms');
      if (res && res.success && Array.isArray(res.rooms) && res.rooms.length > 0) {
        setRooms(res.rooms);
      }
    } catch (err) {
      console.warn('Failed to fetch study rooms:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // 2. Real-time Lobby SSE Stream
  useEffect(() => {
    if (activeRoomId) {
      if (lobbyEventSourceRef.current) {
        lobbyEventSourceRef.current.close();
        lobbyEventSourceRef.current = null;
      }
      return;
    }

    const es = new EventSource('/api/study-space/lobby/stream');
    lobbyEventSourceRef.current = es;

    es.addEventListener('lobby_update', (e: MessageEvent) => {
      try {
        const updatedRooms = JSON.parse(e.data);
        if (Array.isArray(updatedRooms)) {
          setRooms(updatedRooms);
        }
      } catch (err) {
        console.warn('Lobby SSE parse error:', err);
      }
    });

    es.onerror = () => {
      // Handled automatically by browser EventSource reconnect
    };

    return () => {
      es.close();
      if (lobbyEventSourceRef.current === es) {
        lobbyEventSourceRef.current = null;
      }
    };
  }, [activeRoomId]);

  // 3. Fetch single room details
  const loadRoomDetail = useCallback(async (roomId: string) => {
    try {
      const res = await apiCall<{ success: boolean; room: RoomDetail }>(`/api/study-space/rooms/${roomId}`);
      if (res && res.success && res.room) {
        setActiveRoomDetail(res.room);
        return;
      }
    } catch (err) {
      console.warn(`Failed to fetch details for room ${roomId}:`, err);
    }

    // Defensive fallback: find room in default rooms
    const matched = DEFAULT_STUDY_ROOMS.find(r => r.id === roomId);
    if (matched) {
      setActiveRoomDetail(prev => prev || {
        ...matched,
        participantCount: Math.max(1, matched.participantCount || 1),
        members: [
          {
            userId: currentUser?.id || 'guest',
            userName: currentUser?.name || 'Bạn (Học viên)',
            userAvatar: currentUser?.avatar,
            studyGoal: 'Đang tập trung học tập...',
            presenceState: 'STUDYING',
            joinedAt: Date.now(),
            lastPingAt: Date.now(),
            badge: 'Chiến Binh',
          }
        ],
        messages: [],
      });
    }
  }, [currentUser]);

  // 4. F5 Auto-Reconnect & URL Deep Link (?room=...) Resilience
  useEffect(() => {
    // Check URL deep link parameter (?room=...) from affiliate / share links
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRoomId = urlParams.get('room');
      if (urlRoomId && !activeRoomId) {
        const autoJoinUrlRoom = async () => {
          try {
            await apiCall(`/api/study-space/rooms/${urlRoomId}/checkin`, 'POST', {
              goal: 'Gia nhập bàn học cùng bạn bè'
            });
            setActiveRoomId(urlRoomId);
            await loadRoomDetail(urlRoomId);
            analyticsTracker.trackFeatureUsage('study-space', 'Phòng Học Ảo (Virtual Study Room)', 'Học tập');
            return;
          } catch {
            // fallback to normal
          }
        };
        autoJoinUrlRoom();
      }
    }

    // Check localStorage desk persistence first (15-minute grace period)
    let savedData: any = null;
    try {
      const localSaved = localStorage.getItem('lifeos_active_study_desk_v2');
      if (localSaved) savedData = JSON.parse(localSaved);
    } catch {}

    if (!savedData) {
      try {
        const sessionSaved = sessionStorage.getItem('lifeos_active_study_room');
        if (sessionSaved) savedData = JSON.parse(sessionSaved);
      } catch {}
    }

    if (savedData && savedData.roomId) {
      const elapsedSincePing = Date.now() - (savedData.lastPing || savedData.timestamp || savedData.joinedAt || 0);
      // 15-minute grace period for reconnecting
      if (elapsedSincePing <= 15 * 60 * 1000) {
        const autoReconnect = async () => {
          try {
            await apiCall(`/api/study-space/rooms/${savedData.roomId}/checkin`, 'POST', {
              goal: savedData.goal || 'Đang tiếp tục ca học...'
            });
            setActiveRoomId(savedData.roomId);
            await loadRoomDetail(savedData.roomId);
            analyticsTracker.trackFeatureUsage('study-space', 'Phòng Học Ảo (Virtual Study Room)', 'Học tập');
          } catch (err) {
            console.warn('Auto-reconnect failed:', err);
            localStorage.removeItem('lifeos_active_study_desk_v2');
            sessionStorage.removeItem('lifeos_active_study_room');
          }
        };
        autoReconnect();
      } else {
        localStorage.removeItem('lifeos_active_study_desk_v2');
        sessionStorage.removeItem('lifeos_active_study_room');
      }
    }
  }, [loadRoomDetail]);

  // 5. User clicks room in Lobby -> Direct 1-tap entry into dedicated fullscreen study space
  const handleSelectRoom = (room: StudyRoomSummary) => {
    // Attempt Fullscreen immersion automatically to isolate the study space
    try {
      if (typeof document !== 'undefined' && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}

    const defaultGoal = room.topic ? `Tập trung: ${room.topic}` : 'Tập trung học tập & hoàn thành mục tiêu';
    handleDirectRoomEntry(room, defaultGoal);
  };

  const handleDirectRoomEntry = async (targetRoom: StudyRoomSummary, goal: string) => {
    const roomId = targetRoom.id;
    const roomName = targetRoom.name;

    const optimisticDetail: RoomDetail = {
      id: roomId,
      name: roomName,
      topic: targetRoom.topic || 'Tự học tập trung',
      hostId: targetRoom.hostId || 'system',
      hostName: targetRoom.hostName || 'LifeOS System',
      connectionType: targetRoom.connectionType || 'jitsi',
      externalUrl: targetRoom.externalUrl,
      jitsiRoomName: targetRoom.jitsiRoomName || `lifeos-study-${roomId}`,
      isSystemRoom: targetRoom.isSystemRoom ?? true,
      createdAt: targetRoom.createdAt || new Date().toISOString(),
      participantCount: Math.max(1, (targetRoom.participantCount || 0) + 1),
      inMeetCount: targetRoom.inMeetCount || 0,
      recentAvatars: targetRoom.recentAvatars || [],
      recentMessageCount: targetRoom.recentMessageCount || 0,
      pomodoro: targetRoom.pomodoro || {
        phase: 'FOCUS',
        duration: 1500,
        startedAt: Date.now(),
        isRunning: true,
      },
      members: [
        {
          userId: currentUser?.id || 'guest',
          userName: currentUser?.name || 'Bạn',
          userAvatar: currentUser?.avatar,
          studyGoal: goal,
          presenceState: 'STUDYING',
          joinedAt: Date.now(),
          lastPingAt: Date.now(),
          badge: 'Chiến Binh',
        },
      ],
      messages: [],
    };

    setActiveRoomDetail(optimisticDetail);
    setActiveRoomId(roomId);
    setPendingCheckInRoom(null);

    try {
      analyticsTracker.trackFeatureUsage('study-space', 'Phòng Học Ảo (Virtual Study Room)', 'Học tập');

      try {
        const deskData = {
          roomId,
          roomName,
          goal,
          joinedAt: Date.now(),
          lastPing: Date.now()
        };
        localStorage.setItem('lifeos_active_study_desk_v2', JSON.stringify(deskData));
        sessionStorage.setItem('lifeos_active_study_room', JSON.stringify(deskData));
      } catch {}

      const res = await apiCall<any>(`/api/study-space/rooms/${roomId}/checkin`, 'POST', {
        goal
      });
      if (res && res.success && res.room) {
        setActiveRoomDetail(res.room);
      } else {
        await loadRoomDetail(roomId);
      }
    } catch (err) {
      console.warn('Background checkin sync warning:', err);
    }
  };

  // 6. User confirms Check-in & enters room (fallback for room creator)
  const handleConfirmCheckIn = async (goal: string) => {
    if (!pendingCheckInRoom) return;
    setIsCheckingIn(true);
    const targetRoom = pendingCheckInRoom;
    const roomId = targetRoom.id;
    const roomName = targetRoom.name;

    const optimisticDetail: RoomDetail = {
      id: roomId,
      name: roomName,
      topic: targetRoom.topic || 'Tự học tập trung',
      hostId: targetRoom.hostId || 'system',
      hostName: targetRoom.hostName || 'LifeOS System',
      connectionType: targetRoom.connectionType || 'jitsi',
      externalUrl: targetRoom.externalUrl,
      jitsiRoomName: targetRoom.jitsiRoomName || `lifeos-study-${roomId}`,
      isSystemRoom: targetRoom.isSystemRoom ?? true,
      createdAt: targetRoom.createdAt || new Date().toISOString(),
      participantCount: Math.max(1, (targetRoom.participantCount || 0) + 1),
      inMeetCount: targetRoom.inMeetCount || 0,
      recentAvatars: targetRoom.recentAvatars || [],
      recentMessageCount: targetRoom.recentMessageCount || 0,
      pomodoro: targetRoom.pomodoro || {
        phase: 'FOCUS',
        duration: 1500,
        startedAt: Date.now(),
        isRunning: true,
      },
      members: [
        {
          userId: currentUser?.id || 'guest',
          userName: currentUser?.name || 'Bạn (Học viên)',
          userAvatar: currentUser?.avatar,
          studyGoal: goal,
          presenceState: 'STUDYING',
          joinedAt: Date.now(),
          lastPingAt: Date.now(),
          badge: 'Chiến Binh',
        },
      ],
      messages: [],
    };

    setActiveRoomDetail(optimisticDetail);
    setActiveRoomId(roomId);
    setPendingCheckInRoom(null);

    try {

      // Track into Smart Analytics Batcher
      analyticsTracker.trackFeatureUsage('study-space', 'Phòng Học Ảo (Virtual Study Room)', 'Học tập');

      // Save to localStorage & sessionStorage for F5 resilience
      try {
        const deskData = {
          roomId,
          roomName,
          goal,
          joinedAt: Date.now(),
          lastPing: Date.now()
        };
        localStorage.setItem('lifeos_active_study_desk_v2', JSON.stringify(deskData));
        sessionStorage.setItem('lifeos_active_study_room', JSON.stringify(deskData));
      } catch {}

      const res = await apiCall<any>(`/api/study-space/rooms/${roomId}/checkin`, 'POST', {
        goal
      });
      if (res && res.success && res.room) {
        setActiveRoomDetail(res.room);
      } else {
        await loadRoomDetail(roomId);
      }
    } catch (err) {
      console.warn('Background checkin sync warning (kept optimistic room detail):', err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // 7. User leaves room (Handles summary computation & cleanup)
  const handleLeaveRoom = useCallback(async () => {
    const currentId = activeRoomIdRef.current;
    if (!currentId) return;

    if (roomEventSourceRef.current) {
      roomEventSourceRef.current.close();
      roomEventSourceRef.current = null;
    }

    // Clear F5 session storage upon explicit leave
    try {
      localStorage.removeItem('lifeos_active_study_desk_v2');
      sessionStorage.removeItem('lifeos_active_study_room');
    } catch {}

    try {
      const res = await apiCall<{
        success: boolean;
        studiedMinutes?: number;
        recordedMinutes?: number;
        wasRecorded?: boolean;
        roomName?: string;
      }>(`/api/study-space/rooms/${currentId}/leave`, 'POST');

      // Rule 3: Session summary with 1-minute filter feedback
      if (res && typeof res.studiedMinutes === 'number') {
        const studiedMinutes = res.studiedMinutes;
        const wasRecorded = Boolean(res.wasRecorded && (res.recordedMinutes || 0) >= 1);
        const recordedMinutes = res.recordedMinutes || (wasRecorded ? studiedMinutes : 0);

        setSessionSummary({
          roomName: res.roomName || 'Phòng học',
          minutes: studiedMinutes,
          recordedMinutes,
          wasRecorded
        });
      }
    } catch (err) {
      console.warn('Failed to leave study room cleanly:', err);
    }

    setActiveRoomId(null);
    setActiveRoomDetail(null);
    loadRooms();
  }, [loadRooms]);

  // 8. Cleanup when unmounting or switching views
  useEffect(() => {
    return () => {
      if (roomEventSourceRef.current) {
        roomEventSourceRef.current.close();
        roomEventSourceRef.current = null;
      }
      if (lobbyEventSourceRef.current) {
        lobbyEventSourceRef.current.close();
        lobbyEventSourceRef.current = null;
      }
      if (activeRoomIdRef.current) {
        try {
          navigator.sendBeacon(`/api/study-space/rooms/${activeRoomIdRef.current}/leave`);
        } catch {}
      }
    };
  }, []);

  // 9. Setup SSE Stream for active room
  useEffect(() => {
    if (!activeRoomId) {
      if (roomEventSourceRef.current) {
        roomEventSourceRef.current.close();
        roomEventSourceRef.current = null;
      }
      return;
    }

    const sseUrl = `/api/study-space/rooms/${activeRoomId}/stream`;
    const es = new EventSource(sseUrl);
    roomEventSourceRef.current = es;

    es.addEventListener('new_message', (e: MessageEvent) => {
      try {
        const newMsg = JSON.parse(e.data);
        setActiveRoomDetail((prev) => {
          if (!prev) return null;
          const nextMessages = [...prev.messages, newMsg];
          if (nextMessages.length > 100) nextMessages.shift();
          return { ...prev, messages: nextMessages };
        });
      } catch (err) {
        console.warn('SSE new_message parse error:', err);
      }
    });

    es.addEventListener('presence_update', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload && Array.isArray(payload.members)) {
          setActiveRoomDetail((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              members: payload.members,
              participantCount: payload.members.length,
              inMeetCount: payload.members.filter((m: any) => m.presenceState === 'IN_MEET').length
            };
          });
        }
      } catch (err) {
        console.warn('SSE presence_update parse error:', err);
      }
    });

    es.addEventListener('pomodoro_update', (e: MessageEvent) => {
      try {
        const updatedPomodoro = JSON.parse(e.data);
        if (updatedPomodoro) {
          setActiveRoomDetail((prev) => {
            if (!prev) return null;
            return { ...prev, pomodoro: updatedPomodoro };
          });
        }
      } catch (err) {
        console.warn('SSE pomodoro_update parse error:', err);
      }
    });

    es.addEventListener('webrtc_signal', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload && signalHandlerRef.current) {
          signalHandlerRef.current(payload);
        }
      } catch (err) {
        console.warn('SSE webrtc_signal parse error:', err);
      }
    });

    es.onerror = () => {
      // Reconnect handled automatically by EventSource
    };

    return () => {
      es.close();
      if (roomEventSourceRef.current === es) {
        roomEventSourceRef.current = null;
      }
    };
  }, [activeRoomId]);

  // 10. Update User Goal
  const handleUpdateGoal = async (goal: string) => {
    if (!activeRoomId) return;
    await apiCall(`/api/study-space/rooms/${activeRoomId}/goal`, 'POST', { goal });
  };

  // 11. Send Chat Message
  const handleSendMessage = async (text: string): Promise<boolean> => {
    if (!activeRoomId) return false;
    try {
      const res = await apiCall<{ success: boolean; message: any }>(
        `/api/study-space/rooms/${activeRoomId}/messages`,
        'POST',
        { text }
      );
      return Boolean(res && res.success);
    } catch (err) {
      console.warn('Error sending study chat message:', err);
      return false;
    }
  };

  // 12. Sync Pomodoro
  const handleSyncPomodoro = async (
    action: 'start' | 'pause' | 'reset' | 'switch_phase',
    params?: { duration?: number; phase?: 'FOCUS' | 'BREAK' }
  ) => {
    if (!activeRoomId) return;
    try {
      await apiCall(`/api/study-space/rooms/${activeRoomId}/pomodoro`, 'POST', {
        action,
        ...params
      });
    } catch (err) {
      console.warn('Error syncing Pomodoro:', err);
    }
  };

  // 12b. WebRTC Signaling Relay
  const signalHandlerRef = useRef<((signal: any) => void) | null>(null);

  const handleSendSignal = useCallback(async (toUserId: string | undefined, signalType: string, data: any) => {
    if (!activeRoomId) return false;
    try {
      await apiCall(`/api/study-space/rooms/${activeRoomId}/signal`, 'POST', {
        toUserId,
        signalType,
        data
      });
      return true;
    } catch (err) {
      console.warn('Failed to send WebRTC signal:', err);
      return false;
    }
  }, [activeRoomId]);

  // 13. Create Room
  const handleCreateRoom = async (roomData: {
    name: string;
    topic: string;
    connectionType: 'jitsi' | 'external';
    externalUrl?: string;
  }) => {
    setIsSubmittingRoom(true);
    try {
      const res = await apiCall<{ success: boolean; room: StudyRoomSummary }>(
        '/api/study-space/rooms',
        'POST',
        roomData
      );
      if (res && res.success && res.room) {
        await loadRooms();
        // Prompt check-in modal for creator
        setPendingCheckInRoom(res.room);
      }
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Unified Tab Switcher: Sảnh Phòng Học Live vs Lớp Học Đặt Lịch Google Meet */}
      {!activeRoomId && (
        <div className="flex items-center gap-2 p-1.5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xs max-w-fit">
          <button
            type="button"
            onClick={() => setCurrentTab('rooms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'rooms'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Sảnh Học Live & Co-working</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              currentTab === 'rooms' ? 'bg-white/20 text-white' : 'bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300'
            }`}>
              LIVE
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('classroom')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentTab === 'classroom'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Lớp Học Đặt Lịch (Google Meet)</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              currentTab === 'classroom' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
            }`}>
              MEET
            </span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeRoomId && activeRoomDetail ? (
        <StudyRoomView
          room={activeRoomDetail}
          currentUserId={currentUser?.id || ''}
          currentUserName={currentUser?.name || 'Bạn'}
          currentUserAvatar={currentUser?.avatar}
          onLeaveRoom={handleLeaveRoom}
          onUpdateGoal={handleUpdateGoal}
          onSendMessage={handleSendMessage}
          onSyncPomodoro={handleSyncPomodoro}
          onSendSignal={handleSendSignal}
          onRegisterSignalHandler={(fn) => { signalHandlerRef.current = fn; }}
        />
      ) : currentTab === 'rooms' ? (
        <StudyLobby
          rooms={rooms}
          onSelectRoom={handleSelectRoom}
          onCreateRoomClick={() => setIsCreatingModalOpen(true)}
          isLoading={isLoadingRooms}
          language={language}
        />
      ) : (
        <OnlineClassroomView embedded={true} />
      )}

      {/* Check-In Modal Before Entering Room */}
      {pendingCheckInRoom && (
        <RoomCheckInModal
          isOpen={Boolean(pendingCheckInRoom)}
          roomName={pendingCheckInRoom.name}
          roomTopic={pendingCheckInRoom.topic}
          onClose={() => setPendingCheckInRoom(null)}
          onCheckIn={handleConfirmCheckIn}
          isSubmitting={isCheckingIn}
        />
      )}

      {/* Create Room Modal */}
      <StudyCreateRoomModal
        isOpen={isCreatingModalOpen}
        onClose={() => setIsCreatingModalOpen(false)}
        onSubmit={handleCreateRoom}
        isSubmitting={isSubmittingRoom}
      />

      {/* Rule 3: Session Completion Celebratory / Feedback Modal */}
      {sessionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-center space-y-5 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {sessionSummary.wasRecorded ? (
              <>
                {/* Trophy Icon Badge for Recorded Sessions */}
                <div className="w-16 h-16 rounded-3xl bg-linear-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
                  <Trophy className="w-8 h-8" />
                </div>

                {/* Title & Stats */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+{sessionSummary.recordedMinutes} Phút Tích Lũy</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                    Tuyệt vời! Bạn vừa được cộng thêm +{sessionSummary.recordedMinutes} phút vào hồ sơ học tập!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Bạn vừa hoàn thành{' '}
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {sessionSummary.minutes} phút
                    </span>{' '}
                    học tập tập trung trong phòng{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      "{sessionSummary.roomName}"
                    </span>
                    .
                  </p>
                </div>

                {/* Motivational Quote Banner */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left flex items-start gap-3">
                  <Award className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Mỗi phút nỗ lực hôm nay là một bước tiến vững chắc hướng đến mục tiêu của bạn. Hãy tự thưởng cho mình vài phút nghỉ ngơi nhé!
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => setSessionSummary(null)}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tiếp tục ngày mới</span>
                </button>
              </>
            ) : (
              <>
                {/* Clock Icon for Sessions Under 5 Minutes */}
                <div className="w-16 h-16 rounded-3xl bg-linear-to-tr from-slate-400 to-slate-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Clock className="w-8 h-8" />
                </div>

                {/* Notice Body */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    <span>Phiên Học Ngắn</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Phiên học kết thúc ({sessionSummary.minutes} phút)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Phiên học dưới 1 phút sẽ không được tính vào tổng giờ tích lũy nhé! Hãy duy trì tập trung từ 1 phút trở lên ở phiên tiếp theo để được ghi danh vào Bảng Xếp Hạng.
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => setSessionSummary(null)}
                  className="w-full py-3 rounded-2xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Đã hiểu</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
