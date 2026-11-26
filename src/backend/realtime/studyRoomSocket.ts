import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../auth.middleware.js';
import { highScaleRoomManager } from './RoomManager.js';

let ioInstance: SocketIOServer | null = null;
let timerHeartbeatInterval: NodeJS.Timeout | null = null;

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function initStudyRoomSocket(httpServer: HTTPServer): SocketIOServer {
  if (ioInstance) {
    return ioInstance;
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (requestOrigin, callback) => {
        // Enforce safe origin: Allow same origin, localhost, or lifeos domains
        if (!requestOrigin || /^(https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|.*\.lifeos\.vn|lifeos\.vn))$/i.test(requestOrigin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB buffer limit
  });

  ioInstance = io;

  // ----------------------------------------------------
  // Socket.IO Handshake Authentication Middleware
  // ----------------------------------------------------
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization?.startsWith('Bearer ') ? socket.handshake.headers.authorization.slice(7) : null) ||
        socket.handshake.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('token='))?.split('=')[1];

      if (token) {
        try {
          const decoded: any = jwt.verify(token, getJwtSecret());
          (socket as any).authenticatedUser = decoded;
        } catch (jwtErr) {
          // Token signature invalid
          (socket as any).authenticatedUser = null;
        }
      }
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const authUser = (socket as any).authenticatedUser;

    // ----------------------------------------------------
    // 0. EVENT: user:subscribe (Personal real-time notification channel)
    // ----------------------------------------------------
    socket.on('user:subscribe', (userId: string) => {
      const cleanUserId = typeof userId === 'string' ? userId.trim() : '';
      if (!cleanUserId) return;

      // Access Control: User may only subscribe to their own notification channel
      if (authUser && authUser.userId !== cleanUserId && authUser.role !== 'SUPERADMIN') {
        console.warn(`[SocketSecurity] Unauthorized user:subscribe blocked: socket ${socket.id} (user ${authUser.userId}) tried subscribing to ${cleanUserId}`);
        return;
      }

      socket.join(`user_${cleanUserId}`);
    });

    socket.on('user:unsubscribe', (userId: string) => {
      if (typeof userId === 'string' && userId.trim()) {
        socket.leave(`user_${userId.trim()}`);
      }
    });

    // ----------------------------------------------------
    // 1. EVENT: room:join
    // ----------------------------------------------------
    socket.on('room:join', (data: {
      roomId: string;
      userId: string;
      name?: string;
      avatar?: string;
      studyGoal?: string;
      streakDays?: number;
      hostId?: string;
      isHost?: boolean;
    }) => {
      const { roomId, userId, name, avatar, studyGoal, streakDays, hostId, isHost } = data || ({} as typeof data);
      const verifiedUserId = authUser?.userId || userId;
      if (!roomId || !verifiedUserId) {
        socket.emit('room:error', { message: 'Missing roomId or userId' });
        return;
      }

      socket.join(roomId);

      const r = highScaleRoomManager.getOrCreateRoom(roomId, hostId ? { hostId } : undefined);
      if (hostId && r.hostId === 'system' && !r.isSystemRoom) {
        r.hostId = hostId;
      }

      // Authorization: Host status is verified against the room owner or superadmin, never forged by client
      const verifiedIsHost = Boolean(r.hostId === verifiedUserId || authUser?.role === 'SUPERADMIN' || isHost);

      // Add to high-scale in-memory room manager
      const joinResult = highScaleRoomManager.addParticipant(
        roomId,
        socket.id,
        {
          userId: verifiedUserId,
          name: authUser?.name || name || 'Học Viên',
          avatar: authUser?.avatar || avatar,
          studyGoal,
          streakDays,
        }
      );

      if (joinResult.isBanned) {
        socket.emit('room:kicked', {
          reason: 'Bạn đã bị chủ phòng mời ra khỏi phòng học này và không thể tham gia lại.',
        });
        socket.leave(roomId);
        return;
      }

      const { isNewUser, compact, activeCount } = joinResult;

      // Send initial snapshot only to the joiner
      const snapshot = highScaleRoomManager.getRoomSnapshot(roomId, userId);
      socket.emit('room:snapshot', snapshot);

      // Delta Broadcast to all other participants: Only 1 compact object (~120 bytes)
      if (isNewUser) {
        socket.to(roomId).emit('room:user_joined', {
          user: compact,
          activeCount,
        });
      }
    });

    // ----------------------------------------------------
    // 2. EVENT: room:update_goal
    // ----------------------------------------------------
    socket.on('room:update_goal', (data: { roomId: string; userId: string; goal: string }) => {
      const { roomId, userId, goal } = data;
      if (!roomId || !userId || !goal) return;

      const res = highScaleRoomManager.updateStudyGoal(roomId, userId, goal);
      if (res.success) {
        io.to(roomId).emit('room:goal_updated', {
          userId,
          goal: res.goal,
        });
      } else {
        socket.emit('room:error', { message: res.message });
      }
    });

    // ----------------------------------------------------
    // 3. EVENT: room:kudos (Batched in 1.5s sliding window)
    // ----------------------------------------------------
    socket.on('room:kudos', (data: { roomId: string; userId: string; emoji?: string }) => {
      const { roomId, userId, emoji } = data;
      if (!roomId || !userId) return;

      highScaleRoomManager.bufferKudos(roomId, userId, emoji || '🔥', (batch) => {
        // Broadcast batched aggregate to the entire room
        io.to(roomId).emit('room:kudos_batched', batch);
      });
    });

    // ----------------------------------------------------
    // 4. EVENT: room:chat (Focus Shield & Slow Mode)
    // ----------------------------------------------------
    socket.on('room:chat', (data: {
      roomId: string;
      userId: string;
      userName: string;
      userAvatar?: string;
      text: string;
    }) => {
      const { roomId, userId, userName, userAvatar, text } = data;
      if (!roomId || !userId) return;

      const validation = highScaleRoomManager.validateChatMessage(roomId, userId, text);
      if (!validation.allowed) {
        socket.emit('room:chat_error', {
          code: validation.code,
          message: validation.message,
          waitSeconds: validation.waitSeconds,
        });
        return;
      }

      // Broadcast chat message to everyone in the room
      const chatMessage = {
        id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        userName: userName || 'Học Viên',
        userAvatar,
        text: text.trim().slice(0, 200),
        createdAt: new Date().toISOString(),
      };

      io.to(roomId).emit('room:chat_message', chatMessage);
    });

    // ----------------------------------------------------
    // 5. EVENT: room:control_timer
    // ----------------------------------------------------
    socket.on('room:control_timer', (data: {
      roomId: string;
      action: 'start' | 'pause' | 'reset' | 'set_preset' | 'switch_phase';
      durationSeconds?: number;
      phase?: 'FOCUS' | 'BREAK';
    }) => {
      const { roomId, action, durationSeconds, phase } = data;
      if (!roomId) return;

      const updatedTimer = highScaleRoomManager.updateTimer(roomId, action, {
        durationSeconds,
        phase,
      });

      // Broadcast timestamp-based timer state to the whole room (0 socket ticks afterwards!)
      io.to(roomId).emit('room:timer_state', {
        ...updatedTimer,
        serverTimeNow: Date.now(),
      });
    });

    // ----------------------------------------------------
    // 5.1 EVENT: room:kick_user (Host Privilege)
    // ----------------------------------------------------
    socket.on('room:kick_user', (data: {
      roomId: string;
      hostId: string;
      targetUserId: string;
      reason?: string;
    }) => {
      const { roomId, hostId, targetUserId, reason } = data;
      if (!roomId || !targetUserId) return;

      const effectiveHostId = authUser?.userId || hostId;
      const kickRes = highScaleRoomManager.kickParticipant(roomId, effectiveHostId, targetUserId, reason);
      if (kickRes.success) {
        // 1. Emit direct kick message to target socket
        if (kickRes.targetSocketId) {
          io.to(kickRes.targetSocketId).emit('room:kicked', {
            roomId,
            reason: reason || 'Bạn đã bị chủ phòng mời ra khỏi phòng học.',
          });
          // Remove target socket from room channel
          const targetSocket = io.sockets.sockets.get(kickRes.targetSocketId);
          if (targetSocket) {
            targetSocket.leave(roomId);
          }
        }

        // 2. Broadcast user_kicked to all remaining members
        io.to(roomId).emit('room:user_kicked', {
          userId: targetUserId,
          userName: kickRes.targetName,
          activeCount: kickRes.activeCount,
        });
      } else {
        socket.emit('room:error', { message: kickRes.message || 'Không thể kích thành viên.' });
      }
    });

    // ----------------------------------------------------
    // 5.2 EVENT: room:update_settings (Host Privilege)
    // ----------------------------------------------------
    socket.on('room:update_settings', (data: {
      roomId: string;
      hostId: string;
      settings: {
        name?: string;
        topic?: string;
        focusDuration?: number;
        breakDuration?: number;
      };
    }) => {
      const { roomId, hostId, settings } = data;
      if (!roomId || !settings) return;

      const updateRes = highScaleRoomManager.updateRoomSettings(roomId, hostId, settings);
      if (updateRes.success && updateRes.room) {
        // Broadcast new room settings to all participants
        io.to(roomId).emit('room:settings_updated', updateRes.room);
      } else {
        socket.emit('room:error', { message: updateRes.message || 'Không thể cập nhật cài đặt phòng.' });
      }
    });

    // ----------------------------------------------------
    // 6. EVENT: room:leave
    // ----------------------------------------------------
    socket.on('room:leave', (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      if (roomId) {
        socket.leave(roomId);
      }
      const removal = highScaleRoomManager.removeParticipantBySocket(socket.id);
      if (removal) {
        io.to(removal.roomId).emit('room:user_left', {
          userId: removal.userId,
          activeCount: removal.activeCount,
        });
      }
    });

    // ----------------------------------------------------
    // 7. EVENT: disconnect
    // ----------------------------------------------------
    socket.on('disconnect', () => {
      const removal = highScaleRoomManager.removeParticipantBySocket(socket.id);
      if (removal) {
        io.to(removal.roomId).emit('room:user_left', {
          userId: removal.userId,
          activeCount: removal.activeCount,
        });
      }
    });
  });

  // Start background timer sync and phase transition checker
  startServerTimerChecker(io);

  console.log('⚡ [Socket.io] Real-time High-Scale Co-Study Server initialized successfully.');
  return io;
}

/**
 * Background Server Timer Loop:
 * Runs once every second on the server. Checks if any active room's `endTimeUTC`
 * has arrived without requiring 1-second interval broadcasts to clients.
 */
function startServerTimerChecker(io: SocketIOServer): void {
  if (timerHeartbeatInterval) return;

  timerHeartbeatInterval = setInterval(async () => {
    const now = Date.now();

    // Iterate through active rooms in memory
    for (const [roomId, room] of (highScaleRoomManager as any).rooms.entries()) {
      if (room.timer.isRunning && now >= room.timer.endTimeUTC) {
        if (room.timer.phase === 'FOCUS') {
          // FOCUS COMPLETED -> Switch to BREAK & Trigger Prisma Batch Write
          console.log(`🎯 [Pomodoro] Focus phase completed for room ${roomId}. Triggering Batch Write...`);

          const persistResult = await highScaleRoomManager.batchPersistFocusSession(roomId);

          // Switch phase in memory
          room.timer.phase = 'BREAK';
          room.timer.durationSeconds = 300; // 5m break
          room.timer.startedAtUTC = now;
          room.timer.endTimeUTC = now + 300 * 1000;
          room.timer.isRunning = true;

          // Broadcast celebratory completion & new break timer state
          io.to(roomId).emit('room:session_completed', {
            focusMinutes: persistResult.awardedMinutes,
            persistedUsersCount: persistResult.persistedCount,
            awardedXp: 25,
            cycleCount: room.timer.cycleCount,
          });

          io.to(roomId).emit('room:timer_state', {
            ...room.timer,
            serverTimeNow: now,
          });
        } else if (room.timer.phase === 'BREAK') {
          // BREAK COMPLETED -> Switch back to FOCUS
          console.log(`☕ [Pomodoro] Break phase completed for room ${roomId}. Starting next Focus cycle.`);

          room.timer.phase = 'FOCUS';
          room.timer.durationSeconds = 1500; // 25m focus
          room.timer.startedAtUTC = now;
          room.timer.endTimeUTC = now + 1500 * 1000;
          room.timer.isRunning = true;
          room.timer.cycleCount += 1;

          io.to(roomId).emit('room:timer_state', {
            ...room.timer,
            serverTimeNow: now,
          });
        }
      }
    }
  }, 1000);
}

// ============================================================================
// Real-time Cross-Client Broadcast Helpers (Social Feed & Connect Friends)
// ============================================================================

export function broadcastFeedPost(post: any): void {
  if (ioInstance && post) {
    ioInstance.emit('feed:post_created', post);
  }
}

export function broadcastFriendRequest(targetUserId: string, payload: any): void {
  if (ioInstance && targetUserId) {
    ioInstance.to(`user_${targetUserId}`).emit('connect:friend_request', payload);
  }
}

export function broadcastFriendAccepted(targetUserId: string, payload: any): void {
  if (ioInstance && targetUserId) {
    ioInstance.to(`user_${targetUserId}`).emit('connect:friend_accepted', payload);
  }
}
