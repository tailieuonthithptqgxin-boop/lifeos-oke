import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../db.js';
import { getJwtSecret } from '../auth.middleware.js';
import { progressionService } from '../services/progression.service.js';

export const widgetRouter = Router();

// Helper to authenticate user from Bearer header, Cookie, or query token
async function authenticateWidgetUser(req: Request): Promise<{ id: string; name: string; email: string } | null> {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const cookieToken = req.cookies?.token;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token = bearerToken || cookieToken || queryToken;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; email: string };
    if (!decoded || !decoded.userId) return null;

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, status: true }
    });

    if (!user || user.status === 'DISABLED') return null;
    return user;
  } catch (err) {
    return null;
  }
}

function getPriorityScore(priority?: string): number {
  if (!priority) return 1;
  const p = priority.toLowerCase().trim();
  if (p === 'nghiêm trọng' || p === 'critical') return 4;
  if (p === 'cao' || p === 'high') return 3;
  if (p === 'trung bình' || p === 'medium') return 2;
  return 1;
}

/**
 * GET /api/widget/summary
 * Returns lightweight, Duolingo-like JSON for Widget and Lock Screen Schedule Card:
 * - Current streak
 * - Top 3 priority tasks for today with time slot
 * - Today's completion percentage
 * - Short motivational / reminder quote
 * - Mascot mood, avatar, and image URL
 */
widgetRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const user = await authenticateWidgetUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập để truy cập Widget.' },
        message: 'Yêu cầu đăng nhập để truy cập Widget.'
      });
      return;
    }

    const prisma = getPrisma();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Fetch user progression for Streak and RPG Level
    const prog = await progressionService.getOrCreateProgression(user.id);
    const streak = prog.currentStreak || 0;
    const mascotLevel = prog.level || 1;

    // 2. Fetch today's tasks
    const allUserTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        deletedAt: null
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // Filter tasks that belong to today (or currently in-progress/uncompleted today)
    const todayTasks = allUserTasks.filter(t => {
      if (t.dueDate && t.dueDate.startsWith(todayStr)) return true;
      if (t.startDate && t.startDate.startsWith(todayStr)) return true;
      const statusLower = (t.status || '').toLowerCase();
      // If task is not done and created today or earlier without due date, count as active today
      if (['chưa làm', 'đang làm', 'đang chờ'].includes(statusLower) && (!t.dueDate || t.dueDate.startsWith(todayStr))) {
        return true;
      }
      return false;
    });

    const isTaskDone = (s?: string) => {
      const lower = (s || '').toLowerCase().trim();
      return ['hoàn thành', 'completed', 'done', 'đã xong'].includes(lower);
    };

    const completedTasks = todayTasks.filter(t => isTaskDone(t.status));
    const pendingTasks = todayTasks.filter(t => !isTaskDone(t.status));

    // Sort pending tasks by priority descending (Critical -> High -> Medium -> Low)
    pendingTasks.sort((a, b) => getPriorityScore(b.priority) - getPriorityScore(a.priority));

    // Top 3 tasks for the lock screen schedule card
    const top3TasksRaw = [
      ...pendingTasks,
      ...completedTasks
    ].slice(0, 3);

    const topTasks = top3TasksRaw.map(t => {
      let timeSlot = 'Trong ngày';
      if ((t as any).timeSlot) {
        timeSlot = (t as any).timeSlot;
      } else if (t.dueDate && t.dueDate.includes('T')) {
        timeSlot = t.dueDate.split('T')[1].slice(0, 5);
      }

      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: isTaskDone(t.status) ? 'Hoàn thành' : t.status,
        completed: isTaskDone(t.status),
        timeSlot
      };
    });

    const totalTasksToday = todayTasks.length;
    const completedTasksCount = completedTasks.length;
    const completionPercent = totalTasksToday === 0 ? 100 : Math.round((completedTasksCount / totalTasksToday) * 100);

    // 3. Determine Mascot state and Duolingo-like reminder
    let mascotMood: 'happy' | 'cheering' | 'nudging' | 'resting' = 'cheering';
    let mascotAvatar = '⭐';
    let reminder = '';

    const currentHour = new Date().getHours();
    const isNight = currentHour >= 22 || currentHour < 5;

    if (totalTasksToday === 0) {
      mascotMood = isNight ? 'resting' : 'cheering';
      mascotAvatar = isNight ? '🌙' : '⭐';
      reminder = 'Hôm nay thảnh thơi! Mở ứng dụng để lên lịch trình mới nhé.';
    } else if (completionPercent === 100) {
      mascotMood = 'happy';
      mascotAvatar = '😄';
      reminder = `🎉 10 điểm! Bạn đã hoàn thành 100% mục tiêu ngày (${completedTasksCount}/${totalTasksToday} việc)!`;
    } else if (pendingTasks.length > 0) {
      const nextTask = pendingTasks[0];
      const nextTime = (nextTask as any).timeSlot ? ` [${(nextTask as any).timeSlot}]` : '';
      if (completedTasksCount === 0) {
        mascotMood = 'nudging';
        mascotAvatar = '🥺';
        reminder = `⚡ Cố lên bạn ơi! Việc tiếp theo: "${nextTask.title}"${nextTime}.`;
      } else {
        mascotMood = 'cheering';
        mascotAvatar = '🔥';
        reminder = `🔥 Đã xong ${completionPercent}%! Tiếp tục bứt phá: "${nextTask.title}"${nextTime}.`;
      }
    } else {
      mascotMood = 'cheering';
      mascotAvatar = '⭐';
      reminder = `Đã xong ${completedTasksCount}/${totalTasksToday} việc hôm nay. Giữ vững phong độ nha!`;
    }

    const host = req.get('host') || 'localhost:3000';
    const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const mascotImageUrl = `${proto}://${host}/assets/mascot/lumi_reference.png`;
    const appIconUrl = `${proto}://${host}/icons/icon-192x192.png`;

    res.json({
      success: true,
      data: {
        streak,
        streakLabel: `${streak} ngày liên tục 🔥`,
        totalTasksToday,
        completedTasksCount,
        pendingTasksCount: pendingTasks.length,
        completionPercent,
        topTasks,
        reminder,
        mascot: {
          name: 'Bé Lumi',
          level: mascotLevel,
          mood: mascotMood,
          avatar: mascotAvatar,
          quote: reminder,
          imageUrl: mascotImageUrl,
          iconUrl: appIconUrl
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error generating widget summary:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
      message: error.message
    });
  }
});

/**
 * POST /api/widget/complete-top-task
 * Marks the user's top pending task as completed directly from Lock Screen Notification Action
 */
widgetRouter.post('/complete-top-task', async (req: Request, res: Response) => {
  try {
    const user = await authenticateWidgetUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập để hoàn thành công việc.' },
        message: 'Yêu cầu đăng nhập để hoàn thành công việc.'
      });
      return;
    }

    const prisma = getPrisma();
    const explicitTaskId = req.body?.taskId;

    let targetTask = null;

    if (explicitTaskId) {
      targetTask = await prisma.task.findFirst({
        where: { id: explicitTaskId, userId: user.id, deletedAt: null }
      });
    }

    // If no explicit taskId, find the highest priority uncompleted task of today
    if (!targetTask) {
      const todayStr = new Date().toISOString().split('T')[0];
      const activeTasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { notIn: ['Hoàn thành', 'Completed', 'Done', 'Hủy', 'Cancelled'] }
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      });

      if (activeTasks.length > 0) {
        // Sort by priority
        activeTasks.sort((a, b) => getPriorityScore(b.priority) - getPriorityScore(a.priority));
        targetTask = activeTasks[0];
      }
    }

    if (!targetTask) {
      res.json({
        success: false,
        message: 'Không có công việc nào đang chờ để hoàn thành hôm nay.'
      });
      return;
    }

    // Update task status to Hoàn thành
    const updated = await prisma.task.update({
      where: { id: targetTask.id },
      data: { status: 'Hoàn thành' }
    });

    // Award XP
    try {
      await progressionService.awardXp(user.id, {
        amount: 20,
        category: 'task',
        source: 'widget_lockscreen',
        sourceId: updated.id,
        description: `Hoàn thành việc từ màn hình khóa: ${updated.title}`
      });
    } catch (xpErr) {
      console.warn('XP award notice:', xpErr);
    }

    res.json({
      success: true,
      message: `Đã hoàn thành: "${updated.title}"! Bé Lumi chúc mừng bạn 🎉`,
      completedTask: {
        id: updated.id,
        title: updated.title,
        status: updated.status
      }
    });
  } catch (error: any) {
    console.error('Error completing top task from widget:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
      message: error.message
    });
  }
});
