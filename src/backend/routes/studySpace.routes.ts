import { Router, Response } from 'express';
import { studySpaceService } from '../services/studySpace.service.js';
import { requireAuth, AuthRequest } from '../auth.middleware.js';

export const studySpaceRouter = Router();

// 1. Get study rooms list for Lobby
studySpaceRouter.get('/rooms', (req, res: Response) => {
  try {
    const rooms = studySpaceService.getRoomsList();
    res.json({ success: true, rooms });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi lấy danh sách phòng' });
  }
});

// 2. Real-time Lobby SSE Stream
studySpaceRouter.get('/lobby/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Send initial rooms payload
  res.write(`event: lobby_update\ndata: ${JSON.stringify(studySpaceService.getRoomsList())}\n\n`);

  const listener = (data: { event: string; payload: any }) => {
    try {
      res.write(`event: ${data.event}\ndata: ${JSON.stringify(data.payload)}\n\n`);
    } catch {
      // client disconnected
    }
  };

  studySpaceService.subscribeLobby(listener);

  req.on('close', () => {
    try {
      studySpaceService.lobbyListeners.delete(listener);
      res.end();
    } catch {}
  });
});

// 3. Leaderboard & Champion
studySpaceRouter.get(['/leaderboard', '/top'], async (req: any, res: Response) => {
  try {
    const lb = await studySpaceService.getLeaderboard(req.userId);
    res.json({ success: true, ...lb });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi bảng xếp hạng' });
  }
});

studySpaceRouter.get('/champion', (req, res: Response) => {
  try {
    const champion = studySpaceService.getWeeklyChampion();
    res.json({ success: true, champion });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi thông tin quán quân' });
  }
});

// 4. Room details
studySpaceRouter.get('/rooms/:roomId', (req, res: Response) => {
  try {
    const r = studySpaceService.getRoom(req.params.roomId);
    if (!r) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại hoặc đã kết thúc' });
    }
    res.json({ success: true, room: r });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi chi tiết phòng' });
  }
});

// 5. Room Real-time SSE Stream (Presence, Chat, Pomodoro, WebRTC signals)
studySpaceRouter.get('/rooms/:roomId/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const roomId = req.params.roomId;
  const listener = (data: { event: string; payload: any }) => {
    try {
      res.write(`event: ${data.event}\ndata: ${JSON.stringify(data.payload)}\n\n`);
    } catch {
      // client disconnected
    }
  };

  studySpaceService.subscribe(roomId, listener);

  req.on('close', () => {
    try {
      const r = studySpaceService.rooms.get(roomId);
      if (r) r.listeners.delete(listener);
      res.end();
    } catch {}
  });
});

// 6. Create Room
studySpaceRouter.post('/rooms', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { name, topic, connectionType, externalUrl } = req.body;
    const user = (req as any).user;
    const hostId = req.userId || user?.id || 'guest';
    const hostName = user?.name || 'Chủ phòng';
    const room = studySpaceService.createRoom(
      {
        name: (name || '').trim() || 'Phòng học mới',
        topic: (topic || '').trim() || 'Tập trung sâu',
        hostId,
        hostName,
        connectionType: connectionType === 'external' ? 'external' : 'jitsi',
        externalUrl: externalUrl || null
      },
      {
        id: hostId,
        name: hostName
      }
    );
    res.json({ success: true, room });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || 'Không thể tạo phòng học' });
  }
});

// 7. Check-in Room
studySpaceRouter.post('/rooms/:roomId/checkin', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { goal, connectionType } = req.body;
    const participant = studySpaceService.checkinRoom(
      req.params.roomId,
      {
        id: req.userId!,
        name: user?.name || 'Thành viên',
        avatar: user?.avatar,
        championCount: user?.championCount || 0
      },
      goal || 'Đang tập trung...',
      connectionType
    );
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại hoặc đã giải tán' });
    }
    res.json({ success: true, participant });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi điểm danh phòng học' });
  }
});

// 8. Leave Room
studySpaceRouter.post('/rooms/:roomId/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await studySpaceService.leaveRoom(req.params.roomId, req.userId!);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi rời phòng' });
  }
});

// 9. Heartbeat Ping
studySpaceRouter.post('/rooms/:roomId/ping', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const ok = studySpaceService.heartbeatPing(req.params.roomId, req.userId!);
    res.json({ success: ok });
  } catch {
    res.json({ success: false });
  }
});

// 10. Update Meet Status
studySpaceRouter.post('/rooms/:roomId/meet-status', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { inMeet } = req.body;
    const ok = studySpaceService.updateMeetStatus(req.params.roomId, req.userId!, Boolean(inMeet));
    res.json({ success: ok });
  } catch {
    res.json({ success: false });
  }
});

// 11. Update Goal
studySpaceRouter.post('/rooms/:roomId/goal', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { goal } = req.body;
    const ok = studySpaceService.updateGoal(req.params.roomId, req.userId!, String(goal || ''));
    res.json({ success: ok });
  } catch {
    res.json({ success: false });
  }
});

// 12. Pomodoro Sync
studySpaceRouter.post('/rooms/:roomId/pomodoro', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { duration, phase, isRunning } = req.body;
    const ok = studySpaceService.syncPomodoro(req.params.roomId, Number(duration) || 1500, phase || 'FOCUS', Boolean(isRunning));
    res.json({ success: ok });
  } catch {
    res.json({ success: false });
  }
});

// 13. Room Messages
studySpaceRouter.post(['/rooms/:roomId/messages', '/rooms/:roomId/message'], requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { text } = req.body;
    const message = studySpaceService.postMessage(
      req.params.roomId,
      {
        id: req.userId!,
        name: user?.name || 'Thành viên',
        avatar: user?.avatar,
        championCount: user?.championCount || 0
      },
      String(text || '').trim()
    );
    if (!message) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại' });
    }
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi gửi tin nhắn' });
  }
});

// 14. WebRTC Signal Exchange
studySpaceRouter.post('/rooms/:roomId/signal', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { toUserId, signalType, signalData } = req.body;
    studySpaceService.handleWebRTCSignal(
      req.params.roomId,
      req.userId!,
      String(toUserId || ''),
      { signalType, signalData }
    );
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// 15. Cheer Reaction (Non-intrusive encouragement)
studySpaceRouter.post('/rooms/:roomId/cheer', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { cheerType, cheerText } = req.body;
    const ok = studySpaceService.cheerRoom(
      req.params.roomId,
      {
        id: req.userId!,
        name: user?.name || 'Thành viên',
        avatar: user?.avatar
      },
      cheerType || 'fire',
      cheerText || 'Cố lên bạn ơi! 🔥'
    );
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi gửi lời cổ vũ' });
  }
});

// 16. Complete Study Goal
studySpaceRouter.post('/rooms/:roomId/complete-goal', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const ok = studySpaceService.completeGoal(req.params.roomId, req.userId!);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi hoàn thành mục tiêu' });
  }
});

// 17. Admin Analytics for Study Rooms
studySpaceRouter.get('/admin/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await studySpaceService.getStudyRoomsAnalytics();
    res.json({ success: true, analytics });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Lỗi lấy thống kê phòng học' });
  }
});
