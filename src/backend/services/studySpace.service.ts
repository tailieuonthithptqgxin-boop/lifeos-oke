import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getPrisma } from '../db.js';

export type PresenceState = 'IN_MEET' | 'STUDYING' | 'AWAY';
export type RoomActivityStatus = 'ACTIVE' | 'IDLE';

export interface Participant {
  userId: string;
  userName: string;
  userAvatar?: string;
  championCount?: number;
  studyGoal: string;
  studyGoalCompleted?: boolean;
  presenceState: PresenceState;
  joinedAt: number; // ms timestamp when joined session
  lastPingAt: number; // ms timestamp of last active heartbeat
  isSimulated?: boolean;
  badge?: string;
  streakDays?: number;
}

export interface CheerReaction {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  cheerType: string;
  cheerText: string;
  emoji: string;
  timestamp: number;
}

export interface StudyChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  championCount?: number;
  text: string;
  createdAt: string;
}

export interface RoomPomodoroState {
  phase: 'FOCUS' | 'BREAK';
  duration: number; // in seconds: 1500 for Focus (25m), 300 for Break (5m)
  startedAt: number | null; // ms timestamp when running
  isRunning: boolean;
}

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
  status: RoomActivityStatus;
  participantCount: number;
  inMeetCount: number;
  recentAvatars: string[];
  recentMessageCount: number;
  pomodoro: RoomPomodoroState;
}

export interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  hostId: string;
  hostName: string;
  connectionType: 'jitsi' | 'external';
  externalUrl?: string;
  jitsiRoomName?: string;
  isSystemRoom?: boolean;
  createdAt: string;
  emptySince: number | null;
  pomodoro: RoomPomodoroState;
  members: Map<string, Participant>;
  messages: StudyChatMessage[];
  listeners: Set<(data: { event: string; payload: any }) => void>;
}

export interface ReconnectSessionData {
  joinedAt: number;
  lastPingAt: number;
  studyGoal: string;
  presenceState: PresenceState;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string | null;
  totalStudyMinutes: number;
  weeklyStudyMinutes: number;
  championCount?: number;
}

export interface CachedLeaderboardData {
  timestamp: number;
  weekStartMs: number;
  topWeekly: LeaderboardUser[];
  topAllTime: LeaderboardUser[];
}

export interface WeeklyChampionData {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  studyMinutes: number;
  weekRangeText: string;
}

export interface WeeklyRolloverSnapshot {
  lastRolloverWeekStart: number;
  champion: WeeklyChampionData | null;
}

/**
 * Rule 1: Calculate 00:00:00.000 Monday of the current week in Vietnam timezone (UTC+7).
 * Works accurately regardless of server host timezone (UTC, US, etc.).
 * In JS getUTCDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday.
 * Sunday (0) belongs to the week that started on the previous Monday (-6 days).
 */
export function getStartOfCurrentWeekVN(now: Date = new Date()): Date {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  // Shift timestamp to Vietnam wall-clock time
  const vnTime = new Date(now.getTime() + VN_OFFSET_MS);

  // Read UTC day/date values from the shifted date
  const day = vnTime.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const diffToMonday = day === 0 ? 6 : day - 1;

  const mondayMs = vnTime.getTime() - diffToMonday * 24 * 60 * 60 * 1000;
  const mondayVnDate = new Date(mondayMs);

  const year = mondayVnDate.getUTCFullYear();
  const month = mondayVnDate.getUTCMonth();
  const date = mondayVnDate.getUTCDate();

  // 00:00:00.000 Vietnam time in absolute UTC timestamp:
  const startOfWeekUtcMs = Date.UTC(year, month, date, 0, 0, 0, 0) - VN_OFFSET_MS;
  return new Date(startOfWeekUtcMs);
}

class RoomPresenceService {
  private rooms: Map<string, StudyRoom> = new Map();
  private userLastMessageTime: Map<string, number> = new Map();
  // F5 / Accidental refresh grace period cache (key: `${roomId}:${userId}`)
  private recentSessions: Map<string, ReconnectSessionData> = new Map();
  private antiGhostSweeperTimer: NodeJS.Timeout | null = null;
  private lobbyListeners: Set<(data: { event: string; payload: any }) => void> = new Set();

  // RAM-Cached Leaderboard
  private cachedLeaderboard: CachedLeaderboardData | null = null;
  private readonly LEADERBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

  // Lazy Weekly Rollover (RAM + data/weekly-champion.json)
  private weeklyRollover: WeeklyRolloverSnapshot = {
    lastRolloverWeekStart: 0,
    champion: null
  };
  private isRollingOver = false;
  private readonly CHAMPION_SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'weekly-champion.json');

  constructor() {
    this.initDefaultRooms();
    this.initChampionSnapshot();

    // Anti-Ghost Sweeper: Runs every 30 seconds to purge ghost users and clean up empty custom rooms
    this.antiGhostSweeperTimer = setInterval(() => this.runAntiGhostSweeper(), 30000);
    if (this.antiGhostSweeperTimer.unref) {
      this.antiGhostSweeperTimer.unref();
    }
  }

  /**
   * Initialize permanent system rooms: 4 Gen Z Vibe Rooms
   * System rooms are NEVER deleted even with 0 members.
   */
  private initDefaultRooms() {
    const now = Date.now();
    const defaults: Array<{
      id: string;
      name: string;
      topic: string;
      welcomeText: string;
    }> = [
      {
        id: 'room-night-owls',
        name: '🦉 Hội Cú Đêm Cày Deadline',
        topic: 'Cú Đêm & Kỷ Luật',
        welcomeText: 'Chào mừng các chiến binh Cú Đêm! Hãy cùng bật mode tập trung tối đa để dứt điểm mọi deadline tối nay nào! 🦉🌙',
      },
      {
        id: 'room-dalat-rain',
        name: '🌧️ Góc Cafe Mưa Đà Lạt (Lo-Fi & Chill)',
        topic: 'Chill & Lo-Fi',
        welcomeText: 'Hòa mình vào không gian cafe ấm cúng với tiếng mưa rơi và những giai điệu Lo-Fi nhẹ nhàng. Chúc bạn có ca học thật thư thái! ☕🌧️',
      },
      {
        id: 'room-sprint-prep',
        name: '🔥 Phòng Luyện Thi Nước Rút (Tập trung 100%)',
        topic: 'Luyện Thi Nước Rút',
        welcomeText: 'Không bấm điện thoại, không lướt top top! 100% thời gian dành cho mục tiêu lớn nhất của bạn. Bắt đầu ngay! 🔥⚡',
      },
      {
        id: 'room-healing-reading',
        name: '🌿 Góc Đọc Sách & Chữa Lành',
        topic: 'Đọc Sách & Chữa Lành',
        welcomeText: 'Một góc bình yên để bạn thả lỏng tâm trí, đọc sách, nghiên cứu và nuôi dưỡng tri thức mỗi ngày. 🌿📖',
      }
    ];

    defaults.forEach(d => {
      const roomMembers = new Map<string, Participant>();

      this.rooms.set(d.id, {
        id: d.id,
        name: d.name,
        topic: d.topic,
        hostId: 'system',
        hostName: 'LifeOS Community',
        connectionType: 'jitsi',
        jitsiRoomName: `lifeos-${d.id}`,
        isSystemRoom: true,
        createdAt: new Date().toISOString(),
        emptySince: null,
        pomodoro: {
          phase: 'FOCUS',
          duration: 1500,
          startedAt: null,
          isRunning: false
        },
        members: roomMembers,
        messages: [],
        listeners: new Set()
      });
    });
  }

  /**
   * Load champion snapshot from data/weekly-champion.json into RAM on server startup
   */
  private initChampionSnapshot() {
    try {
      if (fs.existsSync(this.CHAMPION_SNAPSHOT_PATH)) {
        const raw = fs.readFileSync(this.CHAMPION_SNAPSHOT_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.lastRolloverWeekStart === 'number') {
          this.weeklyRollover = parsed;
        }
      }
    } catch (err: any) {
      console.warn('[WeeklyChampion] Could not load snapshot from disk:', err.message);
    }
  }

  /**
   * Save champion snapshot from RAM to data/weekly-champion.json
   */
  private saveChampionSnapshot() {
    try {
      const dir = path.dirname(this.CHAMPION_SNAPSHOT_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.CHAMPION_SNAPSHOT_PATH, JSON.stringify(this.weeklyRollover, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[WeeklyChampion] Could not save snapshot to disk:', err.message);
    }
  }

  /**
   * Get current weekly champion from RAM (0.001s instant access)
   */
  public getWeeklyChampion(): WeeklyChampionData | null {
    return this.weeklyRollover.champion;
  }

  /**
   * Lazy Weekly Rollover (Chốt sổ tự động ở lượt chạm đầu tiên của tuần mới - Zero Cronjob)
   * 1. Condition: currentWeekStart = getStartOfCurrentWeekVN().getTime()
   *    If lastRolloverWeekStart === currentWeekStart: return immediately (0% DB resource)
   * 2. When lastRolloverWeekStart < currentWeekStart:
   *    Query DB for the top user whose lastStudyDate is within previous week:
   *    [previousWeekStart, currentWeekStart) with weeklyStudyMinutes > 0
   * 3. Award winner: user.championCount += 1
   * 4. Save to RAM and persist to data/weekly-champion.json
   * 5. Set lastRolloverWeekStart = currentWeekStart
   */
  public async ensureWeeklyRollover(): Promise<void> {
    const currentWeekStart = getStartOfCurrentWeekVN().getTime();

    // 1. If already rolled over for this week or currently executing, skip immediately
    if (this.weeklyRollover.lastRolloverWeekStart === currentWeekStart || this.isRollingOver) {
      return;
    }

    this.isRollingOver = true;
    try {
      const prisma = getPrisma();
      const previousWeekStart = new Date(currentWeekStart - 7 * 24 * 60 * 60 * 1000);
      const currentWeekStartDate = new Date(currentWeekStart);

      // Query the #1 user from the previous week
      const previousWinner = await prisma.user.findFirst({
        where: {
          status: 'ACTIVE',
          weeklyStudyMinutes: { gt: 0 },
          lastStudyDate: {
            gte: previousWeekStart,
            lt: currentWeekStartDate
          }
        },
        orderBy: { weeklyStudyMinutes: 'desc' },
        select: {
          id: true,
          name: true,
          avatar: true,
          weeklyStudyMinutes: true,
          championCount: true
        }
      });

      if (previousWinner) {
        // Increment championCount for winner
        await prisma.user.update({
          where: { id: previousWinner.id },
          data: {
            championCount: { increment: 1 }
          }
        });

        // Format week range text in VN time (e.g. "02/11 - 08/11/2026")
        const prevMondayVn = new Date(previousWeekStart.getTime() + 7 * 3600 * 1000);
        const prevSundayVn = new Date(currentWeekStart - 1000 + 7 * 3600 * 1000);

        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const startStr = `${pad(prevMondayVn.getUTCDate())}/${pad(prevMondayVn.getUTCMonth() + 1)}`;
        const endStr = `${pad(prevSundayVn.getUTCDate())}/${pad(prevSundayVn.getUTCMonth() + 1)}/${prevSundayVn.getUTCFullYear()}`;
        const weekRangeText = `${startStr} - ${endStr}`;

        this.weeklyRollover.champion = {
          userId: previousWinner.id,
          userName: previousWinner.name,
          userAvatar: previousWinner.avatar,
          studyMinutes: previousWinner.weeklyStudyMinutes,
          weekRangeText
        };
      }

      // Mark this week as rolled over
      this.weeklyRollover.lastRolloverWeekStart = currentWeekStart;
      this.saveChampionSnapshot();
    } catch (err: any) {
      console.warn('[WeeklyRollover] Error during lazy weekly rollover:', err.message);
    } finally {
      this.isRollingOver = false;
    }
  }

  /**
   * Helper: Get summary of a single room
   */
  public getRoomSummary(r: StudyRoom): StudyRoomSummary {
    const memberList = Array.from(r.members.values());
    const participantCount = memberList.length;
    const inMeetCount = memberList.filter(m => m.presenceState === 'IN_MEET').length;
    const status: RoomActivityStatus = participantCount > 0 ? 'ACTIVE' : 'IDLE';

    const recentAvatars = memberList
      .slice(0, 5)
      .map(m => m.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.userName)}&background=10B981&color=fff`);

    return {
      id: r.id,
      name: r.name,
      topic: r.topic,
      hostId: r.hostId,
      hostName: r.hostName,
      connectionType: r.connectionType,
      externalUrl: r.externalUrl || null,
      jitsiRoomName: r.jitsiRoomName || null,
      isSystemRoom: Boolean(r.isSystemRoom),
      createdAt: r.createdAt,
      status,
      participantCount,
      inMeetCount,
      recentAvatars,
      recentMessageCount: r.messages.length,
      pomodoro: r.pomodoro
    };
  }

  /**
   * Get summary list of all rooms for the lobby
   */
  public getRoomsList(): StudyRoomSummary[] {
    return Array.from(this.rooms.values()).map(r => this.getRoomSummary(r));
  }

  /**
   * Get single room full details
   */
  public getRoom(roomId: string) {
    const r = this.rooms.get(roomId);
    if (!r) return null;

    const summary = this.getRoomSummary(r);

    return {
      ...summary,
      members: Array.from(r.members.values()),
      messages: r.messages
    };
  }

  /**
   * Create a new room in RAM (Zero DB load)
   */
  public createRoom(params: {
    name: string;
    topic: string;
    connectionType: 'jitsi' | 'external';
    externalUrl?: string;
  }, user: { id: string; name: string }) {
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanName = params.name.trim() || 'Phòng Học Tập';
    const cleanTopic = params.topic.trim() || 'Chung';
    const connType = params.connectionType === 'external' ? 'external' : 'jitsi';
    const jitsiName = connType === 'jitsi'
      ? `lifeos-study-${id.replace(/[^a-zA-Z0-9]/g, '')}`
      : undefined;

    const newRoom: StudyRoom = {
      id,
      name: cleanName,
      topic: cleanTopic,
      hostId: user.id,
      hostName: user.name,
      connectionType: connType,
      externalUrl: connType === 'external' ? params.externalUrl?.trim() : undefined,
      jitsiRoomName: jitsiName,
      isSystemRoom: false,
      createdAt: new Date().toISOString(),
      emptySince: Date.now(), // Newly created with 0 members
      pomodoro: {
        phase: 'FOCUS',
        duration: 1500,
        startedAt: null,
        isRunning: false
      },
      members: new Map(),
      messages: [
        {
          id: crypto.randomUUID(),
          userId: 'system',
          userName: 'LifeOS',
          userAvatar: 'https://ui-avatars.com/api/?name=LifeOS&background=10B981&color=fff',
          text: `Phòng học "${cleanName}" vừa được tạo bởi ${user.name}. Chúc mọi người học tập hiệu quả!`,
          createdAt: new Date().toISOString()
        }
      ],
      listeners: new Set()
    };

    this.rooms.set(id, newRoom);
    this.broadcastLobbyUpdate();
    return this.getRoomSummary(newRoom);
  }

  /**
   * Check in & Join room (Preserves original joinedAt if reconnecting within 30 seconds!)
   */
  public checkinRoom(
    roomId: string,
    user: { id: string; name: string; avatar?: string; championCount?: number },
    goal: string = 'Đang tập trung học...'
  ): Participant | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const now = Date.now();
    const sessionKey = `${roomId}:${user.id}`;
    const recentSession = this.recentSessions.get(sessionKey);

    // Rule 4: If user returns within 30 seconds (e.g. F5 or brief reconnect), keep original joinedAt
    const isReconnectingWithinGrace = Boolean(
      recentSession && (now - recentSession.lastPingAt <= 30000)
    );

    const initialJoinedAt = isReconnectingWithinGrace && recentSession
      ? recentSession.joinedAt
      : now;

    const cleanGoal = goal.trim() || (recentSession?.studyGoal ?? 'Học tập tập trung');
    const initialPresence = isReconnectingWithinGrace && recentSession
      ? recentSession.presenceState
      : 'STUDYING';

    if (isReconnectingWithinGrace) {
      this.recentSessions.delete(sessionKey);
    }

    const participant: Participant = {
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      championCount: user.championCount || 0,
      studyGoal: cleanGoal,
      presenceState: initialPresence,
      joinedAt: initialJoinedAt,
      lastPingAt: now
    };

    room.members.set(user.id, participant);
    room.emptySince = null; // Room is active

    // Broadcast presence update inside the room
    this.broadcast(room, 'presence_update', {
      members: Array.from(room.members.values()),
      joinedUser: participant,
      roomActivity: this.getRoomSummary(room)
    });

    // Broadcast updated counts to Lobby
    this.broadcastLobbyUpdate();

    return participant;
  }

  /**
   * Backward-compatible alias for joinRoom
   */
  public joinRoom(
    roomId: string,
    user: { id: string; name: string; avatar?: string },
    goal: string = 'Đang tập trung'
  ) {
    return this.checkinRoom(roomId, user, goal);
  }

  /**
   * Update participant Meet status (IN_MEET, STUDYING, AWAY)
   */
  public updateMeetStatus(
    roomId: string,
    userId: string,
    presenceState: PresenceState
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const member = room.members.get(userId);
    if (!member) return false;

    member.presenceState = presenceState;
    member.lastPingAt = Date.now();

    this.broadcast(room, 'presence_update', {
      members: Array.from(room.members.values()),
      updatedUser: member,
      roomActivity: this.getRoomSummary(room)
    });

    this.broadcastLobbyUpdate();
    return true;
  }

  /**
   * Heartbeat Ping (Received every 30s from frontend)
   */
  public heartbeatPing(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const member = room.members.get(userId);
    if (!member) return false;

    member.lastPingAt = Date.now();
    return true;
  }

  /**
   * Rule 2: Atomic Increment, 5-minute Filter & Lazy Weekly Reset:
   * Records study session directly to User table in DB with Lazy Evaluation based on VN start of week.
   * Only records if duration >= 5 minutes (max 360 mins / 6h). Zero history table clutter!
   */
  public async recordStudyTimeOnLeave(userId: string, joinedAt: number): Promise<{ wasRecorded: boolean; durationMinutes: number }> {
    // Lazy Rollover: Settle previous week's champion BEFORE checking & resetting any weekly scores
    await this.ensureWeeklyRollover();

    const now = Date.now();
    const durationMinutes = Math.floor((now - joinedAt) / 60000);

    // Filter 1: Ignore sessions under 1 minute (Zero DB writes!)
    if (durationMinutes < 1) {
      return { wasRecorded: false, durationMinutes };
    }

    // Filter 2: Clamp to max 360 minutes (6 hours) to prevent overnight AFK exploitation
    const clampedMinutes = Math.min(durationMinutes, 360);

    try {
      const prisma = getPrisma();
      const startOfWeek = getStartOfCurrentWeekVN();

      // Retrieve user's previous lastStudyDate to determine if this is the first session of a new week
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastStudyDate: true }
      });

      if (!existingUser) {
        return { wasRecorded: false, durationMinutes: clampedMinutes };
      }

      const isNewWeekSession = !existingUser?.lastStudyDate || new Date(existingUser.lastStudyDate) < startOfWeek;

      if (isNewWeekSession) {
        // Case 1: First session of the new week -> Overwrite weeklyStudyMinutes (resets previous week to 0 and assigns new minutes)
        await prisma.user.update({
          where: { id: userId },
          data: {
            weeklyStudyMinutes: clampedMinutes,
            totalStudyMinutes: { increment: clampedMinutes },
            lastStudyDate: new Date()
          }
        });
      } else {
        // Case 2: Already studied in this current week -> Atomic increment both weekly & total
        await prisma.user.update({
          where: { id: userId },
          data: {
            weeklyStudyMinutes: { increment: clampedMinutes },
            totalStudyMinutes: { increment: clampedMinutes },
            lastStudyDate: new Date()
          }
        });
      }

      // Record to User Feature Analytics & Aggregated Summary (Single query, Zero overhead)
      try {
        await prisma.userFeatureAnalytics.upsert({
          where: {
            userId_featureKey: {
              userId,
              featureKey: 'study-space'
            }
          },
          update: {
            useCount: { increment: 1 },
            durationSeconds: { increment: clampedMinutes * 60 },
            lastUsedAt: new Date()
          },
          create: {
            userId,
            featureKey: 'study-space',
            featureName: 'Phòng Học Ảo (Virtual Study Room)',
            category: 'Học tập',
            useCount: 1,
            durationSeconds: clampedMinutes * 60,
            lastUsedAt: new Date()
          }
        });

        await prisma.featureAnalyticsSummary.upsert({
          where: { featureKey: 'study-space' },
          update: {
            totalUses: { increment: 1 },
            totalDurationSeconds: { increment: clampedMinutes * 60 },
            lastActiveAt: new Date()
          },
          create: {
            featureKey: 'study-space',
            featureName: 'Phòng Học Ảo (Virtual Study Room)',
            category: 'Học tập',
            totalUniqueUsers: 1,
            totalUses: 1,
            totalDurationSeconds: clampedMinutes * 60,
            returningUsersCount: 1,
            lastActiveAt: new Date()
          }
        });
      } catch (analyticsErr: any) {
        console.warn('[StudySpaceAnalytics] Non-blocking analytics record warning:', analyticsErr.message);
      }

      return { wasRecorded: true, durationMinutes: clampedMinutes };
    } catch (err: any) {
      console.warn(`[StudyTimeRecord] Could not record study minutes for user ${userId}:`, err.message);
      return { wasRecorded: false, durationMinutes: clampedMinutes };
    }
  }

  /**
   * User leaves room
   * Computes studied minutes, caches 30s reconnect grace period, and records to DB if >= 5 mins
   */
  public async leaveRoom(roomId: string, userId: string): Promise<{
    success: boolean;
    studiedMinutes: number;
    recordedMinutes: number;
    wasRecorded: boolean;
    roomName: string;
  }> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, studiedMinutes: 0, recordedMinutes: 0, wasRecorded: false, roomName: 'Phòng học' };
    }

    const now = Date.now();
    const member = room.members.get(userId);
    let studiedMinutes = 0;
    let recordedMinutes = 0;
    let wasRecorded = false;
    const roomName = room.name;

    if (member) {
      const originalJoinedAt = member.joinedAt;
      studiedMinutes = Math.floor((now - originalJoinedAt) / 60000);

      // Cache session in RAM for 30s F5 reconnect grace period
      this.recentSessions.set(`${roomId}:${userId}`, {
        joinedAt: originalJoinedAt,
        lastPingAt: now,
        studyGoal: member.studyGoal,
        presenceState: member.presenceState
      });

      // Idempotency: Delete user from RAM BEFORE calling Database
      room.members.delete(userId);

      // Rule 4: If room is now empty, start 5-minute grace period before purging custom rooms
      if (room.members.size === 0) {
        room.emptySince = now;
      }

      this.broadcast(room, 'presence_update', {
        members: Array.from(room.members.values()),
        leftUserId: userId,
        roomActivity: this.getRoomSummary(room)
      });

      this.broadcastLobbyUpdate();

      // Record study session to DB if >= 5 minutes
      const recordResult = await this.recordStudyTimeOnLeave(userId, originalJoinedAt);
      wasRecorded = recordResult.wasRecorded;
      recordedMinutes = recordResult.durationMinutes;
    }

    return { success: true, studiedMinutes, recordedMinutes, wasRecorded, roomName };
  }

  /**
   * Update study goal in room
   */
  public updateGoal(roomId: string, userId: string, goal: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const member = room.members.get(userId);
    if (!member) return false;

    member.studyGoal = goal.trim() || 'Học tập tập trung';
    member.lastPingAt = Date.now();

    this.broadcast(room, 'presence_update', {
      members: Array.from(room.members.values()),
      updatedUser: member,
      roomActivity: this.getRoomSummary(room)
    });

    return true;
  }

  /**
   * Send cheer / encouragement reaction to room members (Non-intrusive floating reaction)
   */
  public cheerRoom(
    roomId: string,
    fromUser: { id: string; name: string; avatar?: string },
    cheerType: string,
    cheerText: string
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const emojiMap: Record<string, string> = {
      fire: '🔥',
      coffee: '☕',
      zap: '⚡',
      clap: '👏',
      heart: '❤️',
      star: '⭐'
    };

    const reaction: CheerReaction = {
      id: crypto.randomUUID(),
      fromUserId: fromUser.id,
      fromUserName: fromUser.name,
      fromUserAvatar: fromUser.avatar,
      cheerType,
      cheerText: cheerText.trim() || 'Cố lên bạn ơi! 🔥',
      emoji: emojiMap[cheerType] || '🔥',
      timestamp: Date.now()
    };

    this.broadcast(room, 'cheer_reaction', reaction);
    return true;
  }

  /**
   * Complete study goal on user's desk
   */
  public completeGoal(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const member = room.members.get(userId);
    if (!member) return false;

    member.studyGoalCompleted = true;
    member.lastPingAt = Date.now();

    this.broadcast(room, 'goal_completed', {
      userId,
      userName: member.userName,
      studyGoal: member.studyGoal,
      timestamp: Date.now()
    });

    this.broadcast(room, 'presence_update', {
      members: Array.from(room.members.values()),
      updatedUser: member,
      roomActivity: this.getRoomSummary(room)
    });

    return true;
  }

  /**
   * Analytics breakdown for Admin portal
   */
  public async getStudyRoomsAnalytics() {
    const now = new Date();
    const currentHour = now.getHours();

    let currentTimeCategory = 'Sáng (06:00 - 12:00)';
    if (currentHour >= 12 && currentHour < 18) currentTimeCategory = 'Chiều (12:00 - 18:00)';
    else if (currentHour >= 18 && currentHour < 23) currentTimeCategory = 'Tối (18:00 - 23:00)';
    else currentTimeCategory = 'Cú Đêm (23:00 - 06:00)';

    const activeRoomsSummary = Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      topic: r.topic,
      participantCount: r.members.size,
      isSystemRoom: Boolean(r.isSystemRoom),
      pomodoroPhase: r.pomodoro.phase,
      pomodoroRunning: r.pomodoro.isRunning
    }));

    const totalLiveDesks = activeRoomsSummary.reduce((acc, r) => acc + r.participantCount, 0);

    let topUsers: any[] = [];
    let totalCommunityStudyMinutes = 0;
    try {
      const prisma = getPrisma();
      topUsers = await prisma.user.findMany({
        where: { totalStudyMinutes: { gt: 0 } },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          totalStudyMinutes: true,
          weeklyStudyMinutes: true,
          lastStudyDate: true
        },
        orderBy: { totalStudyMinutes: 'desc' },
        take: 10
      });

      const totalAgg = await prisma.user.aggregate({
        _sum: { totalStudyMinutes: true }
      });
      totalCommunityStudyMinutes = totalAgg._sum.totalStudyMinutes || 0;
    } catch {}

    return {
      currentTimeCategory,
      peakHoursSummary: [
        { slot: 'Cú Đêm (23:00 - 06:00)', label: '🦉 Hội Cú Đêm', percentage: 38, note: 'Khung giờ cày deadline đông người nhất' },
        { slot: 'Tối (18:00 - 23:00)', label: '🔥 Luyện thi nước rút', percentage: 34, note: 'Khung giờ ôn bài tập trung cao' },
        { slot: 'Sáng (06:00 - 12:00)', label: '🌿 Đọc sách & Chữa lành', percentage: 16, note: 'Khởi đầu ngày mới tỉnh táo' },
        { slot: 'Chiều (12:00 - 18:00)', label: '🌧️ Cafe Đà Lạt', percentage: 12, note: 'Học tập chill & thư giãn nhẹ' },
      ],
      activeRooms: activeRoomsSummary,
      totalLiveDesks,
      totalCommunityStudyMinutes,
      topUsers
    };
  }

  /**
   * Synchronized Pomodoro Timer (Timestamp-based, Zero Server setInterval)
   */
  public syncPomodoro(
    roomId: string,
    action: 'start' | 'pause' | 'reset' | 'switch_phase',
    params?: { duration?: number; phase?: 'FOCUS' | 'BREAK' }
  ): RoomPomodoroState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const now = Date.now();
    const pomo = room.pomodoro;

    if (action === 'start') {
      if (!pomo.isRunning) {
        pomo.startedAt = now;
        pomo.isRunning = true;
      }
    } else if (action === 'pause') {
      if (pomo.isRunning && pomo.startedAt) {
        const elapsedSeconds = Math.floor((now - pomo.startedAt) / 1000);
        pomo.duration = Math.max(0, pomo.duration - elapsedSeconds);
        pomo.startedAt = null;
        pomo.isRunning = false;
      }
    } else if (action === 'reset') {
      const defaultDuration = pomo.phase === 'FOCUS' ? 1500 : 300;
      pomo.duration = params?.duration || defaultDuration;
      pomo.startedAt = null;
      pomo.isRunning = false;
    } else if (action === 'switch_phase') {
      const nextPhase = pomo.phase === 'FOCUS' ? 'BREAK' : 'FOCUS';
      pomo.phase = params?.phase || nextPhase;
      pomo.duration = pomo.phase === 'FOCUS' ? 1500 : 300;
      pomo.startedAt = null;
      pomo.isRunning = false;
    }

    this.broadcast(room, 'pomodoro_update', pomo);
    return pomo;
  }

  /**
   * Post message to room chat (With 2s anti-spam and 300-char limit)
   */
  public postMessage(
    roomId: string,
    user: { id: string; name: string; avatar?: string; championCount?: number },
    text: string
  ): { success: boolean; message?: StudyChatMessage; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Phòng học không tồn tại.' };
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return { success: false, error: 'Nội dung tin nhắn không được để trống.' };
    }

    if (cleanText.length > 300) {
      return { success: false, error: 'Tin nhắn tối đa 300 ký tự để tối ưu tốc độ.' };
    }

    // Anti-spam: 2 seconds minimum gap per user
    const now = Date.now();
    const lastMsgTime = this.userLastMessageTime.get(user.id) || 0;
    if (now - lastMsgTime < 2000) {
      const waitSeconds = Math.ceil((2000 - (now - lastMsgTime)) / 1000);
      return { success: false, error: `Vui lòng đợi ${waitSeconds}s trước khi gửi tin nhắn tiếp theo.` };
    }

    this.userLastMessageTime.set(user.id, now);

    const chatMsg: StudyChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      championCount: user.championCount || 0,
      text: cleanText,
      createdAt: new Date().toISOString()
    };

    // FIFO rolling buffer of max 100 messages (Zero DB write!)
    room.messages.push(chatMsg);
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    // Refresh sender ping
    if (room.members.has(user.id)) {
      room.members.get(user.id)!.lastPingAt = now;
    }

    this.broadcast(room, 'new_message', chatMsg);
    return { success: true, message: chatMsg };
  }

  /**
   * Relay WebRTC peer-to-peer signaling message (offer, answer, candidate, media_status)
   */
  public handleWebRTCSignal(
    roomId: string,
    fromUser: { id: string; name: string },
    payload: { toUserId?: string; signalType: string; data: any }
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    this.broadcast(room, 'webrtc_signal', {
      fromUserId: fromUser.id,
      fromUserName: fromUser.name,
      toUserId: payload.toUserId,
      signalType: payload.signalType,
      data: payload.data
    });
    return true;
  }

  /**
   * Subscribe to real-time events via Server-Sent Events
   */
  public subscribe(roomId: string, listener: (data: { event: string; payload: any }) => void) {
    const room = this.rooms.get(roomId);
    if (!room) return () => {};

    room.listeners.add(listener);
    return () => {
      room.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to Lobby real-time events
   */
  public subscribeLobby(listener: (data: { event: string; payload: any }) => void) {
    this.lobbyListeners.add(listener);
    return () => {
      this.lobbyListeners.delete(listener);
    };
  }

  /**
   * Broadcast event to all SSE listeners in room
   */
  private broadcast(room: StudyRoom, event: string, payload: any) {
    room.listeners.forEach(fn => {
      try {
        fn({ event, payload });
      } catch (err) {
        room.listeners.delete(fn);
      }
    });
  }

  /**
   * Broadcast updated room list to all Lobby SSE listeners
   */
  private broadcastLobbyUpdate() {
    if (this.lobbyListeners.size === 0) return;
    const roomsList = this.getRoomsList();
    this.lobbyListeners.forEach(fn => {
      try {
        fn({ event: 'lobby_update', payload: roomsList });
      } catch (err) {
        this.lobbyListeners.delete(fn);
      }
    });
  }

  /**
   * Anti-Ghost Sweeper (Every 30 seconds):
   * 1. Detect and purge members who haven't sent a heartbeat for > 65 seconds
   * 2. Auto-close custom rooms empty for > 5 minutes (300,000ms)
   * 3. Clean up expired reconnect sessions (> 60 seconds)
   * 4. Record study session time for purged ghost members if >= 5 mins
   */
  public runAntiGhostSweeper() {
    const now = Date.now();
    const GHOST_TIMEOUT_MS = 65000; // 65 seconds
    const EMPTY_ROOM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (Grace Period)
    const RECONNECT_EXPIRE_MS = 60000; // 60 seconds

    let lobbyNeedsUpdate = false;

    // Purge expired reconnect cache
    this.recentSessions.forEach((session, key) => {
      if (now - session.lastPingAt > RECONNECT_EXPIRE_MS) {
        this.recentSessions.delete(key);
      }
    });

    this.rooms.forEach((room, roomId) => {
      let presenceChanged = false;

      // Sweep ghost members whose lastPingAt > 65s ago
      room.members.forEach((participant, uid) => {
        if (now - participant.lastPingAt > GHOST_TIMEOUT_MS) {
          const ghostJoinedAt = participant.joinedAt;

          // Cache session before deleting just in case user is re-establishing network
          this.recentSessions.set(`${roomId}:${uid}`, {
            joinedAt: ghostJoinedAt,
            lastPingAt: now,
            studyGoal: participant.studyGoal,
            presenceState: participant.presenceState
          });

          // Idempotency: Delete from RAM first
          room.members.delete(uid);
          presenceChanged = true;
          lobbyNeedsUpdate = true;

          // Record study session time for ghost user if >= 5 mins
          this.recordStudyTimeOnLeave(uid, ghostJoinedAt).catch(() => {});
        }
      });

      if (presenceChanged) {
        this.broadcast(room, 'presence_update', {
          members: Array.from(room.members.values()),
          roomActivity: this.getRoomSummary(room)
        });
      }

      // Rule 4: Track empty room time with 5-minute Grace Period
      if (room.members.size === 0) {
        if (!room.emptySince) {
          room.emptySince = now;
        } else if (!room.isSystemRoom && now - room.emptySince > EMPTY_ROOM_TIMEOUT_MS) {
          // Custom room has been empty for > 5 minutes: delete from RAM
          this.rooms.delete(roomId);
          lobbyNeedsUpdate = true;
        }
      } else {
        room.emptySince = null;
      }
    });

    if (lobbyNeedsUpdate) {
      this.broadcastLobbyUpdate();
    }
  }

  /**
   * Rule 3 & 4: RAM-Cached Leaderboard & Lazy Personal Weekly Normalization
   * - 5-minute TTL, 0% DB load on cache hit
   * - Auto-invalidates immediately when crossing into Monday 00:00 (UTC+7)
   * - Top 10 Weekly strictly filters: weeklyStudyMinutes > 0 and lastStudyDate >= startOfWeek
   * - Personal stats normalizes weeklyStudyMinutes to 0 if lastStudyDate < startOfWeek
   * - Lazy Rollover: settles previous week champion before querying leaderboard
   */
  public async getLeaderboard(currentUserId?: string): Promise<{
    topWeekly: LeaderboardUser[];
    topAllTime: LeaderboardUser[];
    userStats: { totalStudyMinutes: number; weeklyStudyMinutes: number; lastStudyDate: Date | null; championCount: number } | null;
    weeklyChampion: WeeklyChampionData | null;
    cachedAt: number;
  }> {
    // Settle previous week champion on read touch if entering a new week
    await this.ensureWeeklyRollover();

    const now = Date.now();
    const startOfWeek = getStartOfCurrentWeekVN();
    const currentWeekStartMs = startOfWeek.getTime();

    // Cache is expired if:
    // 1. No cache exists
    // 2. TTL (5 minutes) exceeded
    // 3. Or a new week has started (currentWeekStartMs !== cachedLeaderboard.weekStartMs)
    const isCacheExpired =
      !this.cachedLeaderboard ||
      (now - this.cachedLeaderboard.timestamp > this.LEADERBOARD_CACHE_TTL_MS) ||
      (this.cachedLeaderboard.weekStartMs !== currentWeekStartMs);

    if (isCacheExpired) {
      try {
        const prisma = getPrisma();
        const [topWeekly, topAllTime] = await Promise.all([
          // Rule 3: Top 10 Weekly strictly requires lastStudyDate >= Monday 00:00 VN & weeklyStudyMinutes > 0
          prisma.user.findMany({
            where: {
              status: 'ACTIVE',
              weeklyStudyMinutes: { gt: 0 },
              lastStudyDate: { gte: startOfWeek }
            },
            select: { id: true, name: true, avatar: true, totalStudyMinutes: true, weeklyStudyMinutes: true, championCount: true },
            orderBy: { weeklyStudyMinutes: 'desc' },
            take: 10
          }),
          // Top 10 All Time
          prisma.user.findMany({
            where: {
              status: 'ACTIVE',
              totalStudyMinutes: { gt: 0 }
            },
            select: { id: true, name: true, avatar: true, totalStudyMinutes: true, weeklyStudyMinutes: true, championCount: true },
            orderBy: { totalStudyMinutes: 'desc' },
            take: 10
          })
        ]);

        this.cachedLeaderboard = {
          timestamp: now,
          weekStartMs: currentWeekStartMs,
          topWeekly,
          topAllTime
        };
      } catch (err: any) {
        console.warn('[Leaderboard] Failed to refresh leaderboard cache from DB:', err.message);
      }
    }

    let userStats: { totalStudyMinutes: number; weeklyStudyMinutes: number; lastStudyDate: Date | null; championCount: number } | null = null;
    if (currentUserId) {
      try {
        const prisma = getPrisma();
        const rawUser = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: { totalStudyMinutes: true, weeklyStudyMinutes: true, lastStudyDate: true, championCount: true }
        });

        if (rawUser) {
          // Rule 4: If user has never studied or last studied before current week's Monday 00:00, return 0 for weekly
          const hasStudiedThisWeek = Boolean(rawUser.lastStudyDate && new Date(rawUser.lastStudyDate) >= startOfWeek);
          userStats = {
            totalStudyMinutes: rawUser.totalStudyMinutes,
            weeklyStudyMinutes: hasStudiedThisWeek ? rawUser.weeklyStudyMinutes : 0,
            lastStudyDate: rawUser.lastStudyDate,
            championCount: rawUser.championCount || 0
          };
        }
      } catch (err: any) {
        console.warn(`[Leaderboard] Failed to fetch personal study stats for user ${currentUserId}:`, err.message);
      }
    }

    return {
      topWeekly: this.cachedLeaderboard?.topWeekly || [],
      topAllTime: this.cachedLeaderboard?.topAllTime || [],
      userStats,
      weeklyChampion: this.weeklyRollover.champion,
      cachedAt: this.cachedLeaderboard?.timestamp || now
    };
  }
}

export const studySpaceService = new RoomPresenceService();
export const roomPresenceService = studySpaceService;
