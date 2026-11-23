import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Award,
  Users,
  Video,
  GraduationCap,
  HelpCircle,
  ChevronRight,
  Info
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
  const [initialMediaSettings, setInitialMediaSettings] = useState<{ micOn: boolean; camOn: boolean }>({
    micOn: false,
    camOn: true
  });

  // Rule 3: Session summary celebratory modal state when user leaves room
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryData | null>(null);

  // Smart Mode Guide State (Expandable/Collapsible)
  const [showModeGuide, setShowModeGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lifeos_study_guide_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const toggleModeGuide = () => {
    setShowModeGuide((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lifeos_study_guide_dismissed', next ? 'false' : 'true');
      } catch {}
      return next;
    });
  };

  const totalOnline = rooms.reduce((sum, r) => sum + (r.participantCount || 0), 0);
  const streakDays = currentUser?.streakDays ?? 0;

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

  // 5. User clicks room in Lobby -> Open Google Meet Pre-join Check-in Modal ("Giao diện đầu")
  const handleSelectRoom = (room: StudyRoomSummary) => {
    setPendingCheckInRoom(room);
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

  // 6. User confirms Check-in & enters room
  const handleConfirmCheckIn = async (goal: string, options?: { micOn: boolean; camOn: boolean }) => {
    if (!pendingCheckInRoom) return;
    setIsCheckingIn(true);
    const targetRoom = pendingCheckInRoom;
    const roomId = targetRoom.id;
    const roomName = targetRoom.name;

    const micOn = options?.micOn ?? false;
    const camOn = options?.camOn ?? true;
    setInitialMediaSettings({ micOn, camOn });

    // Attempt Fullscreen immersion automatically to isolate the study space
    try {
      if (typeof document !== 'undefined' && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8 overflow-x-hidden">
      {/* Unified Learning Academy Hub Header */}
      {!activeRoomId && (
        <div className="space-y-4">
          {/* Top Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-indigo-500/20 p-6 sm:p-7 shadow-xl text-white">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>TRUNG TÂM HỌC TRỰC TUYẾN TOÀN DIỆN</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                  MeetStudy Space
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                    All-in-One
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Hợp nhất trọn vẹn <strong>Bàn tự học Pomodoro 24/7</strong> và <strong>Lớp học theo lịch Google Meet</strong> trong một không gian duy nhất. Không còn phân tán, tập trung 100%.
                </p>
              </div>

              {/* Quick Stat Badges */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Tự học Live</div>
                    <div className="text-sm font-extrabold text-white">{totalOnline} đang học</div>
                  </div>
                </div>

                <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Chuỗi ngày</div>
                    <div className="text-sm font-extrabold text-amber-300">{streakDays} ngày</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleModeGuide}
                  className="px-3 py-2 min-h-[40px] sm:min-h-0 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                  title="Xem phân biệt 2 chế độ"
                >
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Phân biệt 2 chế độ</span>
                </button>
              </div>
            </div>

            {/* Smart Mode Comparison Guide (Expandable) */}
            {showModeGuide && (
              <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3.5 rounded-2xl bg-indigo-900/40 border border-indigo-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wide">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>1. Bàn Tự Học 24/7 (Co-Study Space)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Dành cho lúc bạn muốn <strong>tự học cá nhân</strong>, tự cày đề, đọc sách một mình trong không gian có người cùng học để chống lười. Có sẵn âm thanh Lo-Fi/tiếng mưa, đồng hồ Pomodoro và đua top bảng xếp hạng tuần. Không cần hẹn giờ hay giáo viên.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-900/40 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wide">
                    <Video className="w-4 h-4 text-emerald-400" />
                    <span>2. Lớp Học & Google Meet (Scheduled Classroom)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Dành cho các buổi học <strong>có lịch trình cố định</strong>, có giáo viên, gia sư hoặc họp nhóm thảo luận dự án. Tự động đồng bộ Google Calendar, tạo link Google Meet tức thì, có danh sách email học viên và tài liệu buổi học.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 rounded-3xl bg-white/70 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={() => setCurrentTab('rooms')}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer ${
                currentTab === 'rooms'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md border border-indigo-500/40 ring-1 ring-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  currentTab === 'rooms'
                    ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base">Bàn Tự Học 24/7</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    Tự học Pomodoro, âm thanh Lo-Fi & đua top tuần
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 transition-transform ${currentTab === 'rooms' ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-400 opacity-40'}`} />
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('classroom')}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer ${
                currentTab === 'classroom'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md border border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  currentTab === 'classroom'
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base">Lớp Học & Google Meet</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      MEET
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    Lên lịch ca học, phòng Google Meet & tài liệu
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 transition-transform ${currentTab === 'classroom' ? 'text-emerald-600 dark:text-emerald-400 translate-x-0.5' : 'text-slate-400 opacity-40'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeRoomId && activeRoomDetail ? (
        <StudyRoomView
          room={activeRoomDetail}
          currentUserId={currentUser?.id || ''}
          currentUserName={currentUser?.name || 'Bạn'}
          currentUserAvatar={currentUser?.avatar}
          initialMicOn={initialMediaSettings.micOn}
          initialCamOn={initialMediaSettings.camOn}
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
          userName={currentUser?.name || 'Bạn'}
          userAvatar={currentUser?.avatar}
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
      {sessionSummary && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-center space-y-5 animate-in zoom-in-95 duration-200 max-h-[88vh] overflow-y-auto"
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
                  className="w-full py-3 min-h-[44px] rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                  className="w-full py-3 min-h-[44px] rounded-2xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Đã hiểu</span>
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
