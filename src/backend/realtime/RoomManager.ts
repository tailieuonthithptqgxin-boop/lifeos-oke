import { getPrisma } from '../db.js';

export type PomodoroPhase = 'FOCUS' | 'BREAK' | 'PAUSED';
export type PresenceStatus = 'STUDYING' | 'BREAK' | 'AWAY';

export interface ParticipantState {
  userId: string;
  socketId: string;
  name: string;
  avatar?: string;
  studyGoal: string;
  presence: PresenceStatus;
  joinedAt: number;     // ms timestamp
  lastActiveAt: number; // ms timestamp
  streakDays: number;
  totalSessionMinutes: number;
}

export interface CompactParticipant {
  id: string;
  name: string;
  avatar?: string;
  goal: string;
  presence: PresenceStatus;
  streak: number;
}

export interface RoomTimerState {
  phase: PomodoroPhase;
  durationSeconds: number; // e.g. 1500 (25m) or 300 (5m)
  startedAtUTC: number;    // timestamp ms
  endTimeUTC: number;      // timestamp ms = startedAtUTC + durationMs
  isRunning: boolean;
  cycleCount: number;
}

export interface RoomCollectiveEnergy {
  totalAccumulatedMinutesToday: number;
  activeStudyingCount: number;
  kudosCountToday: number;
}

export interface HighScaleRoomState {
  roomId: string;
  name: string;
  topic: string;
  hostId: string;
  isSystemRoom: boolean;
  createdAt: number;

  // In-Memory Membership: O(1) Map lookups
  members: Map<string, ParticipantState>; // key: userId -> ParticipantState
  socketToUserMap: Map<string, string>;   // key: socketId -> userId
  bannedUserIds: Set<string>;             // key: userId -> banned from room by host

  // Synchronized Timer
  timer: RoomTimerState;

  // Collective Metrics
  energy: RoomCollectiveEnergy;

  // Anti-Spam Slow Mode
  chatRateLimitMap: Map<string, number>; // key: userId -> lastMessageMs

  // 1.5s Sliding Window Kudos Batch Buffer
  kudosBatchBuffer: {
    total: number;
    breakdown: Record<string, number>;
    senders: Set<string>;
  };
  kudosFlushTimer: NodeJS.Timeout | null;
}

export class HighScaleRoomManager {
  private static instance: HighScaleRoomManager;
  private rooms: Map<string, HighScaleRoomState> = new Map();
  private ghostSweeperInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startGhostSweeper();
  }

  public static getInstance(): HighScaleRoomManager {
    if (!HighScaleRoomManager.instance) {
      HighScaleRoomManager.instance = new HighScaleRoomManager();
    }
    return HighScaleRoomManager.instance;
  }

  /**
   * Retrieves or initializes a room with in-memory defaults
   */
  public getOrCreateRoom(
    roomId: string,
    options?: { name?: string; topic?: string; hostId?: string; isSystemRoom?: boolean }
  ): HighScaleRoomState {
    let room = this.rooms.get(roomId);
    if (!room) {
      const now = Date.now();
      room = {
        roomId,
        name: options?.name || 'Thư Viện Tự Học Tập Trung',
        topic: options?.topic || 'Ôn Thi Nước Rút & Kỷ Luật Bản Thân',
        hostId: options?.hostId || 'system',
        isSystemRoom: options?.isSystemRoom ?? true,
        createdAt: now,
        members: new Map(),
        socketToUserMap: new Map(),
        bannedUserIds: new Set(),
        timer: {
          phase: 'FOCUS',
          durationSeconds: 1500, // 25 minutes
          startedAtUTC: now,
          endTimeUTC: now + 1500 * 1000,
          isRunning: true,
          cycleCount: 1,
        },
        energy: {
          totalAccumulatedMinutesToday: 0, // Real accumulated minutes
          activeStudyingCount: 0,
          kudosCountToday: 0, // Real kudos count
        },
        chatRateLimitMap: new Map(),
        kudosBatchBuffer: {
          total: 0,
          breakdown: {},
          senders: new Set(),
        },
        kudosFlushTimer: null,
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  public getRoom(roomId: string): HighScaleRoomState | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Adds or updates a participant upon connection
   */
  public addParticipant(
    roomId: string,
    socketId: string,
    userData: {
      userId: string;
      name: string;
      avatar?: string;
      studyGoal?: string;
      streakDays?: number;
    }
  ): {
    isNewUser: boolean;
    participant?: ParticipantState;
    compact?: CompactParticipant;
    activeCount: number;
    isBanned?: boolean;
  } {
    const room = this.getOrCreateRoom(roomId);
    if (room.bannedUserIds?.has(userData.userId)) {
      return {
        isNewUser: false,
        isBanned: true,
        activeCount: room.members.size,
      };
    }
    const now = Date.now();
    const existing = room.members.get(userData.userId);

    const participant: ParticipantState = {
      userId: userData.userId,
      socketId,
      name: userData.name || 'Học Viên',
      avatar: userData.avatar,
      studyGoal: userData.studyGoal || existing?.studyGoal || 'Tập trung hoàn thành mục tiêu hôm nay',
      presence: 'STUDYING',
      joinedAt: existing ? existing.joinedAt : now,
      lastActiveAt: now,
      streakDays: userData.streakDays ?? existing?.streakDays ?? 0,
      totalSessionMinutes: existing?.totalSessionMinutes ?? 0,
    };

    const isNewUser = !existing;
    room.members.set(userData.userId, participant);
    room.socketToUserMap.set(socketId, userData.userId);

    // Update collective count
    room.energy.activeStudyingCount = room.members.size;

    const compact: CompactParticipant = {
      id: participant.userId,
      name: participant.name,
      avatar: participant.avatar,
      goal: participant.studyGoal,
      presence: participant.presence,
      streak: participant.streakDays,
    };

    return {
      isNewUser,
      participant,
      compact,
      activeCount: room.members.size,
    };
  }

  /**
   * Removes participant by socket ID (e.g. disconnect)
   */
  public removeParticipantBySocket(
    socketId: string
  ): { roomId: string; userId: string; activeCount: number } | null {
    for (const [roomId, room] of this.rooms.entries()) {
      const userId = room.socketToUserMap.get(socketId);
      if (userId) {
        room.socketToUserMap.delete(socketId);
        room.members.delete(userId);
        room.chatRateLimitMap.delete(userId);
        room.energy.activeStudyingCount = room.members.size;

        return {
          roomId,
          userId,
          activeCount: room.members.size,
        };
      }
    }
    return null;
  }

  /**
   * Kicks a disruptive user from the room (Host-only privilege)
   */
  public kickParticipant(
    roomId: string,
    requesterUserId: string,
    targetUserId: string,
    reason?: string
  ): {
    success: boolean;
    targetSocketId?: string;
    targetName?: string;
    activeCount: number;
    message?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, activeCount: 0, message: 'Phòng học không tồn tại.' };
    }

    // Host check: allow hostId or system
    const isHost = room.hostId === requesterUserId || room.hostId === 'system' || requesterUserId === 'admin';
    if (!isHost) {
      return { success: false, activeCount: room.members.size, message: 'Chỉ Chủ phòng mới có quyền kích thành viên.' };
    }

    if (requesterUserId === targetUserId) {
      return { success: false, activeCount: room.members.size, message: 'Chủ phòng không thể tự kích chính mình.' };
    }

    const target = room.members.get(targetUserId);
    if (!target) {
      return { success: false, activeCount: room.members.size, message: 'Thành viên này không còn trong phòng.' };
    }

    const targetSocketId = target.socketId;
    const targetName = target.name;

    // Remove from in-memory room
    room.members.delete(targetUserId);
    room.socketToUserMap.delete(targetSocketId);
    room.chatRateLimitMap.delete(targetUserId);
    room.bannedUserIds.add(targetUserId);
    room.energy.activeStudyingCount = room.members.size;

    return {
      success: true,
      targetSocketId,
      targetName,
      activeCount: room.members.size,
    };
  }

  /**
   * Updates room settings (Host-only privilege: name, topic, focusDuration, breakDuration)
   */
  public updateRoomSettings(
    roomId: string,
    requesterUserId: string,
    settings: {
      name?: string;
      topic?: string;
      focusDuration?: number;
      breakDuration?: number;
    }
  ): {
    success: boolean;
    room?: { name: string; topic: string; focusDuration: number; breakDuration: number };
    message?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Phòng học không tồn tại.' };
    }

    const isHost = room.hostId === requesterUserId || room.hostId === 'system' || requesterUserId === 'admin';
    if (!isHost) {
      return { success: false, message: 'Chỉ Chủ phòng mới có quyền thay đổi cài đặt phòng học.' };
    }

    if (settings.name && settings.name.trim()) {
      room.name = settings.name.trim().slice(0, 80);
    }
    if (settings.topic && settings.topic.trim()) {
      room.topic = settings.topic.trim().slice(0, 80);
    }
    if (typeof settings.focusDuration === 'number' && settings.focusDuration > 0) {
      room.timer.durationSeconds = settings.focusDuration;
    }

    return {
      success: true,
      room: {
        name: room.name,
        topic: room.topic,
        focusDuration: room.timer.durationSeconds,
        breakDuration: 300,
      },
    };
  }

  /**
   * Updates study goal with a 10s cooldown
   */
  public updateStudyGoal(
    roomId: string,
    userId: string,
    newGoal: string
  ): { success: boolean; goal: string; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, goal: '', message: 'Phòng không tồn tại' };

    const member = room.members.get(userId);
    if (!member) return { success: false, goal: '', message: 'Thành viên chưa gia nhập phòng' };

    const cleanGoal = newGoal.trim().slice(0, 80);
    member.studyGoal = cleanGoal;
    member.lastActiveAt = Date.now();

    return { success: true, goal: cleanGoal };
  }

  /**
   * Adds kudos reaction to the 1.5s sliding window batch buffer
   */
  public bufferKudos(
    roomId: string,
    userId: string,
    emoji: string,
    onFlush: (batch: { total: number; breakdown: Record<string, number>; senderCount: number }) => void
  ): void {
    const room = this.getOrCreateRoom(roomId);
    const validEmoji = emoji || '🔥';

    room.kudosBatchBuffer.total += 1;
    room.kudosBatchBuffer.breakdown[validEmoji] = (room.kudosBatchBuffer.breakdown[validEmoji] || 0) + 1;
    room.kudosBatchBuffer.senders.add(userId);
    room.energy.kudosCountToday += 1;

    // Schedule flush timer if not already active
    if (!room.kudosFlushTimer) {
      room.kudosFlushTimer = setTimeout(() => {
        const batchPayload = {
          total: room.kudosBatchBuffer.total,
          breakdown: { ...room.kudosBatchBuffer.breakdown },
          senderCount: room.kudosBatchBuffer.senders.size,
        };

        // Reset buffer
        room.kudosBatchBuffer = {
          total: 0,
          breakdown: {},
          senders: new Set(),
        };
        room.kudosFlushTimer = null;

        onFlush(batchPayload);
      }, 1500); // 1.5s sliding window
    }
  }

  /**
   * Checks whether a user can chat:
   * Chat is always open 24/7 across all phases (Focus, Break, Paused)
   */
  public validateChatMessage(
    roomId: string,
    userId: string,
    text: string
  ): { allowed: boolean; code?: string; message?: string; waitSeconds?: number } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { allowed: false, code: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại' };
    }

    if (!text || text.trim().length === 0) {
      return { allowed: false, code: 'EMPTY_TEXT', message: 'Nội dung tin nhắn không được để trống' };
    }

    // 2s soft anti-spam cooldown per user
    const now = Date.now();
    const lastSent = room.chatRateLimitMap.get(userId) || 0;
    const diff = now - lastSent;
    const COOLDOWN_MS = 2000;

    if (diff < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - diff) / 1000);
      return {
        allowed: false,
        code: 'RATE_LIMITED',
        message: `Vui lòng đợi ${waitSeconds}s trước khi gửi tiếp`,
        waitSeconds,
      };
    }

    // Update rate limit timestamp
    room.chatRateLimitMap.set(userId, now);
    return { allowed: true };
  }

  /**
   * Updates Timer State (Start / Pause / Reset / Set Duration / Phase Switch)
   */
  public updateTimer(
    roomId: string,
    action: 'start' | 'pause' | 'reset' | 'set_preset' | 'switch_phase',
    params?: { durationSeconds?: number; phase?: PomodoroPhase }
  ): RoomTimerState {
    const room = this.getOrCreateRoom(roomId);
    const now = Date.now();

    switch (action) {
      case 'start':
        room.timer.isRunning = true;
        room.timer.startedAtUTC = now;
        room.timer.endTimeUTC = now + room.timer.durationSeconds * 1000;
        break;

      case 'pause':
        if (room.timer.isRunning) {
          const remainingMs = Math.max(0, room.timer.endTimeUTC - now);
          room.timer.durationSeconds = Math.round(remainingMs / 1000);
          room.timer.isRunning = false;
        }
        break;

      case 'reset':
        room.timer.isRunning = false;
        room.timer.durationSeconds = room.timer.phase === 'FOCUS' ? 1500 : 300;
        room.timer.startedAtUTC = now;
        room.timer.endTimeUTC = now + room.timer.durationSeconds * 1000;
        break;

      case 'set_preset':
        if (params?.durationSeconds) {
          room.timer.durationSeconds = params.durationSeconds;
          room.timer.startedAtUTC = now;
          room.timer.endTimeUTC = now + params.durationSeconds * 1000;
        }
        break;

      case 'switch_phase':
        const targetPhase = params?.phase || (room.timer.phase === 'FOCUS' ? 'BREAK' : 'FOCUS');
        room.timer.phase = targetPhase;
        room.timer.durationSeconds = targetPhase === 'FOCUS' ? 1500 : 300;
        room.timer.startedAtUTC = now;
        room.timer.endTimeUTC = now + room.timer.durationSeconds * 1000;
        room.timer.isRunning = true;
        if (targetPhase === 'FOCUS') {
          room.timer.cycleCount += 1;
        }
        break;
    }

    return room.timer;
  }

  /**
   * Generates a compact snapshot for a joining client
   */
  public getRoomSnapshot(roomId: string, currentUserId: string): {
    room: { id: string; name: string; topic: string };
    timer: RoomTimerState;
    energy: RoomCollectiveEnergy;
    pinnedFriends: CompactParticipant[];
    members: CompactParticipant[];
    totalMembersCount: number;
  } {
    const room = this.getOrCreateRoom(roomId);

    // Convert members map to compact array
    const allCompact: CompactParticipant[] = [];
    let friendsCount = 0;
    const pinnedFriends: CompactParticipant[] = [];

    for (const member of room.members.values()) {
      const compact: CompactParticipant = {
        id: member.userId,
        name: member.name,
        avatar: member.avatar,
        goal: member.studyGoal,
        presence: member.presence,
        streak: member.streakDays,
      };

      // Top 6 slots for pinned friends or active peers
      if (member.userId !== currentUserId && friendsCount < 6) {
        pinnedFriends.push(compact);
        friendsCount++;
      }
      allCompact.push(compact);
    }

    return {
      room: {
        id: room.roomId,
        name: room.name,
        topic: room.topic,
        hostId: room.hostId,
      },
      timer: room.timer,
      energy: room.energy,
      pinnedFriends,
      members: allCompact,
      totalMembersCount: allCompact.length,
    };
  }

  /**
   * BATCH WRITE TO PRISMA:
   * Executed strictly when a Focus cycle completes (e.g. 25 minutes).
   * Aggregates all active studying members and performs ONE atomic database transaction.
   */
  public async batchPersistFocusSession(roomId: string): Promise<{
    persistedCount: number;
    awardedMinutes: number;
  }> {
    const room = this.rooms.get(roomId);
    if (!room) return { persistedCount: 0, awardedMinutes: 0 };

    const studyingMembers = Array.from(room.members.values()).filter(
      (m) => m.presence === 'STUDYING'
    );

    if (studyingMembers.length === 0) {
      return { persistedCount: 0, awardedMinutes: 0 };
    }

    const focusMinutes = Math.max(1, Math.round(room.timer.durationSeconds / 60));
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const prisma = getPrisma();

    try {
      // 1. Prepare FocusSession create statements
      const focusSessionInserts = studyingMembers.map((member) =>
        prisma.focusSession.create({
          data: {
            userId: member.userId,
            title: `Thư Viện Tự Học - ${room.name}`,
            mode: 'CoStudyRoom',
            status: 'Completed',
            plannedDuration: focusMinutes,
            actualDuration: focusMinutes,
            notes: member.studyGoal,
          },
        })
      );

      // 2. Prepare User Progression XP reward updates (+25 XP per focus session)
      const userProgressionUpdates = studyingMembers.map((member) =>
        prisma.userProgression.upsert({
          where: { userId: member.userId },
          update: {
            xp: { increment: 25 },
            coins: { increment: 5 },
          },
          create: {
            userId: member.userId,
            level: 1,
            xp: 25,
            coins: 5,
          },
        })
      );

      // 3. Execute all operations in a single atomic transaction
      await prisma.$transaction([...focusSessionInserts, ...userProgressionUpdates]);

      // 4. Update in-memory accumulated energy
      room.energy.totalAccumulatedMinutesToday += focusMinutes * studyingMembers.length;

      console.log(
        `⚡ [RoomManager] Batch Write successful: Saved ${studyingMembers.length} sessions (${focusMinutes}m each) for room ${roomId}`
      );

      return {
        persistedCount: studyingMembers.length,
        awardedMinutes: focusMinutes,
      };
    } catch (err) {
      console.error(`❌ [RoomManager] Error during batch persistence for room ${roomId}:`, err);
      return { persistedCount: 0, awardedMinutes: 0 };
    }
  }

  /**
   * Anti-Ghost Sweeper: Cleans up orphaned connections inactive for > 3 minutes
   */
  private startGhostSweeper(): void {
    if (this.ghostSweeperInterval) return;

    this.ghostSweeperInterval = setInterval(() => {
      const now = Date.now();
      const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

      for (const room of this.rooms.values()) {
        for (const [userId, member] of room.members.entries()) {
          if (now - member.lastActiveAt > TIMEOUT_MS) {
            room.members.delete(userId);
            room.socketToUserMap.delete(member.socketId);
            room.chatRateLimitMap.delete(userId);
          }
        }
        room.energy.activeStudyingCount = room.members.size;
      }
    }, 60 * 1000); // Check every 60s
  }
}

export const highScaleRoomManager = HighScaleRoomManager.getInstance();
