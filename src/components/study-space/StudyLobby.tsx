import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Award,
  HelpCircle,
  Shuffle,
  Volume2,
  CheckCircle2,
  Calendar,
  Zap,
  TrendingUp
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';
import { toast } from '../../lib/toast';
import {
  StudyPersonalStatsCard,
  UserStudyStats,
  formatStudyHoursMinutes,
  getStudyRank
} from './StudyPersonalStatsCard';
import { StudyLeaderboardCard, LeaderboardUser } from './StudyLeaderboardCard';
import { WeeklyChampionBanner, WeeklyChampionData } from './WeeklyChampionBanner';
import {
  StudyOnboardingModal,
  STUDY_ONBOARDING_STORAGE_KEY
} from './StudyOnboardingModal';

export interface StudyRoomSummary {
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
  status: 'ACTIVE' | 'IDLE';
  participantCount: number;
  inMeetCount: number;
  recentAvatars: string[];
  recentMessageCount: number;
  pomodoro?: {
    phase: 'FOCUS' | 'BREAK';
    duration: number;
    startedAt: number | null;
    isRunning: boolean;
  };
}

interface StudyLobbyProps {
  rooms: StudyRoomSummary[];
  onSelectRoom: (room: StudyRoomSummary) => void;
  onCreateRoomClick: () => void;
  isLoading?: boolean;
  language?: string;
}

const FILTER_TOPICS = [
  'Tất cả',
  'Cú Đêm & Kỷ Luật',
  'Chill & Lo-Fi',
  'Luyện Thi Nước Rút',
  'Đọc Sách & Chữa Lành'
];

export function StudyLobby({
  rooms,
  onSelectRoom,
  onCreateRoomClick,
  isLoading = false,
  language = 'vi'
}: StudyLobbyProps) {
  const { currentUser } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('Tất cả');

  // Leaderboard & Personal stats state
  const [topWeekly, setTopWeekly] = useState<LeaderboardUser[]>([]);
  const [topAllTime, setTopAllTime] = useState<LeaderboardUser[]>([]);
  const [userStats, setUserStats] = useState<UserStudyStats | null>(null);
  const [weeklyChampion, setWeeklyChampion] = useState<WeeklyChampionData | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Single Source of Truth Streak & Stats
  const streakDays = currentUser?.streakDays ?? 0;

  // Zero-DB LocalStorage Onboarding state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Auto-display onboarding on first visit (Zero-DB)
  useEffect(() => {
    try {
      const seen = localStorage.getItem(STUDY_ONBOARDING_STORAGE_KEY);
      if (!seen) {
        setIsOnboardingOpen(true);
      }
    } catch {}
  }, []);

  // Fetch RAM-Cached Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    try {
      const res = await apiCall<{
        success: boolean;
        topWeekly: LeaderboardUser[];
        topAllTime: LeaderboardUser[];
        userStats: UserStudyStats | null;
        weeklyChampion: WeeklyChampionData | null;
      }>('/api/study/leaderboard');

      if (res && res.success) {
        setTopWeekly(Array.isArray(res.topWeekly) ? res.topWeekly : []);
        setTopAllTime(Array.isArray(res.topAllTime) ? res.topAllTime : []);
        setUserStats(res.userStats || null);
        setWeeklyChampion(res.weeklyChampion || null);
      }
    } catch (err) {
      console.warn('Failed to load study leaderboard:', err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Filter rooms by topic and search query
  const filteredRooms = rooms.filter((r) => {
    const matchTopic = selectedTopic === 'Tất cả' || r.topic === selectedTopic;
    const matchQuery =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.hostName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTopic && matchQuery;
  });

  const totalMembersOnline = rooms.reduce((sum, r) => sum + (r.participantCount || 0), 0);

const FALLBACK_ROOMS: StudyRoomSummary[] = [
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

  // 1-Tap "Tìm bàn ngẫu nhiên" (Random match for lazy users)
  const handleRandomJoin = () => {
    try {
      soundEngine.playPop();
    } catch {}

    const availableRooms = rooms && rooms.length > 0 ? rooms : FALLBACK_ROOMS;
    if (!availableRooms || availableRooms.length === 0) {
      toast.info('Đang kết nối danh sách bàn học...');
      return;
    }

    // Prefer rooms with active members for real motivation
    const activeRooms = availableRooms.filter((r) => (r.participantCount || 0) > 0);
    const candidateList = activeRooms.length > 0 ? activeRooms : availableRooms;
    const randomIndex = Math.floor(Math.random() * candidateList.length);
    const selected = candidateList[randomIndex];

    toast.success(`🎲 Đã ghép bàn ngẫu nhiên: "${selected.name}"!`);
    onSelectRoom(selected);
  };

  // Helper: map room topic/id to ambient sound badge
  const getRoomSoundBadge = (topic: string, name: string) => {
    if (name.includes('Đà Lạt') || topic.includes('Chill')) return '🌧️ Mưa & Lo-Fi';
    if (name.includes('Cú Đêm') || topic.includes('Kỷ Luật')) return '🌧️ Mưa rơi đêm';
    if (name.includes('Nước Rút') || topic.includes('Luyện Thi')) return '🔥 Lửa trại tập trung';
    if (name.includes('Chữa Lành') || topic.includes('Đọc Sách')) return '🎧 Nhạc Lo-Fi';
    return '☕ Quán Cafe';
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-150 font-sans">
      {/* 1. TOP HERO: SẢNH VIBE GEN Z VỚI NÚT VÀO HỌC 1-CHẠM */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-950 via-slate-900 to-purple-950 p-5 sm:p-7 text-white border border-indigo-500/20 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-52 h-52 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Phòng Học Ảo Gen Z • Bàn Học Trạng Thái Động</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
              Ngồi Học Cùng Nhau, Giữ Kỷ Luật & Cày Deadline 🦉
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed">
              Mô hình bàn học live siêu nhẹ kết hợp âm thanh trắng và nhạc Lo-Fi chill, không video call nặng máy, chống xao nhãng 100%!
            </p>

            {/* Quick Streaks & Community Stats */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-amber-300">
                <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Chuỗi học: {streakDays} ngày liên tiếp 🔥</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-emerald-400">
                <Users className="w-4 h-4" />
                <span>🟢 {totalMembersOnline} bạn đang ngồi học live</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: 1-Tap Random Match & Create Room */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* Nút 1: Tìm bàn ngẫu nhiên (Dành cho người lười chọn) */}
            <button
              type="button"
              onClick={handleRandomJoin}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>🎲 Tìm bàn ngẫu nhiên</span>
            </button>

            {/* Nút 2: Tự tạo phòng riêng */}
            <button
              type="button"
              onClick={onCreateRoomClick}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tạo phòng riêng</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Thẻ Thành Tích Cá Nhân */}
      <StudyPersonalStatsCard
        stats={userStats}
        userName={currentUser?.name || 'Bạn'}
        userAvatar={currentUser?.avatar}
        streakDays={streakDays}
      />

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Filter Pills & Rooms Cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {FILTER_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                    selectedTopic === topic
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm chủ đề phòng..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Rooms Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-800"
                />
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <span className="text-4xl">🦉</span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Không tìm thấy phòng phù hợp
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy thử chọn chủ đề khác hoặc tự tạo một phòng học nhóm riêng cho bạn bè nhé!
              </p>
              <button
                type="button"
                onClick={onCreateRoomClick}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo phòng ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRooms.map((room) => {
                const isActive = (room.participantCount || 0) > 0;
                const soundTag = getRoomSoundBadge(room.topic, room.name);
                const pomoPhase = room.pomodoro?.phase === 'BREAK' ? '☕ Giải lao' : '🔥 Đang tập trung';

                return (
                  <div
                    key={room.id}
                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600/60 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-3.5"
                  >
                    {/* Top Row: Sound tag + Live Members Count */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 text-[10px] font-extrabold">
                        <Volume2 className="w-3 h-3 text-indigo-500" />
                        <span>{soundTag}</span>
                      </span>

                      {/* Live Counter Badge */}
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-extrabold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>🟢 {room.participantCount} bạn đang học</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                          <span>⚪ Bàn đang trống</span>
                        </span>
                      )}
                    </div>

                    {/* Room Info */}
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {room.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        Chủ đề: <span className="font-bold text-slate-700 dark:text-slate-300">{room.topic}</span>
                      </p>
                    </div>

                    {/* Middle Card: Pomodoro Phase + Avatar Previews */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{pomoPhase}</span>
                      </div>

                      {/* Avatar Stack */}
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {room.recentAvatars && room.recentAvatars.length > 0 ? (
                          room.recentAvatars.slice(0, 4).map((av, idx) => (
                            <img
                              key={idx}
                              src={av}
                              alt="Bạn học"
                              className="inline-block w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                            />
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Bàn đang trống</span>
                        )}
                        {room.participantCount > 4 && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-600 dark:text-slate-300">
                            +{room.participantCount - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom CTA: 1-Tap "Vào học ngay" */}
                    <button
                      type="button"
                      onClick={() => onSelectRoom(room)}
                      className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Vào học ngay ⚡</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Bảng Xếp Hạng Top Chăm Chỉ Hôm Nay */}
        <div className="lg:col-span-1 sticky top-6 space-y-4">
          <WeeklyChampionBanner champion={weeklyChampion} />
          <StudyLeaderboardCard
            topWeekly={topWeekly}
            topAllTime={topAllTime}
            currentUserId={currentUser?.id}
            isLoading={isLoadingLeaderboard}
            onRefresh={fetchLeaderboard}
          />
        </div>
      </div>

      {/* Study Onboarding & Rules Modal */}
      <StudyOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
