import { getPrisma } from '../../db.js';
import { notificationEngine } from './notificationEngine.service.js';
import { syncUpcomingReminders } from './eventReminderEngine.js';

export class NotificationSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastRunAt: Date | null = null;

  start(intervalMs: number = 60000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[NotificationScheduler] Started (interval: ${intervalMs}ms)`);

    // Run first sweep shortly after startup (5s delay)
    setTimeout(() => this.tick(), 5000);

    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.isRunning = false;
    console.log('[NotificationScheduler] Stopped');
  }

  getStatus() {
    return {
      running: this.isRunning,
      lastRunAt: this.lastRunAt
    };
  }

  /**
   * Main periodic tick running every 60s
   */
  async tick() {
    this.lastRunAt = new Date();
    try {
      if (!process.env.DATABASE_URL) return;
      const prisma = getPrisma();

      // Quick DB ping
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (connErr) {
        return;
      }

      const now = new Date();

      // 1. Process Pending Deliveries & Retries first so any due reminder is dispatched without delay
      await notificationEngine.processPendingDeliveries(100);

      // 2. Synchronize 4-tier Event/Task reminders (T-5h, T-3h, T-30m, T=0)
      await syncUpcomingReminders(now);

      // 3. Sweep Tasks (daily approaching deadline & overdue)
      await this.sweepTasks(now);
    } catch (tickErr) {
      console.warn('[NotificationScheduler] Tick warning:', tickErr);
    }
  }

  /**
   * Sweep 1: Check Calendar Events upcoming or starting
   */
  private async sweepCalendarEvents(now: Date) {
    const prisma = getPrisma();
    try {
      // Look at events for today and tomorrow
      const todayStr = now.toISOString().split('T')[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const events = await prisma.calendarEvent.findMany({
        where: {
          date: { in: [todayStr, tomorrowStr] },
          status: { notIn: ['Đã xong', 'Đã hủy', 'Cancelled', 'Completed'] }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              notificationPreference: true
            }
          }
        },
        take: 200
      });

      for (const event of events) {
        if (!event.userId || !event.date || !event.startTime) continue;

        // Parse event start time
        const [hourStr, minStr] = event.startTime.split(':');
        const eventStart = new Date(event.date);
        eventStart.setHours(parseInt(hourStr || '0', 10), parseInt(minStr || '0', 10), 0, 0);

        const diffMinutes = Math.round((eventStart.getTime() - now.getTime()) / 60000);

        // Fetch user rule
        const rule = await notificationEngine.getUserRule(event.userId, 'CALENDAR_UPCOMING');
        const triggerMinutes = rule?.timingOffsetMinutes || 15;

        // A. Check Upcoming Event (within a 3-minute tolerance window around triggerMinutes)
        if (diffMinutes >= triggerMinutes - 1 && diffMinutes <= triggerMinutes + 2) {
          const triggerBucket = `${event.date}_${event.startTime}_pre${triggerMinutes}`;
          await notificationEngine.emitEvent({
            userId: event.userId,
            eventType: 'CALENDAR_UPCOMING',
            entityId: event.id,
            title: `⏰ Lịch sắp diễn ra: "${event.title}"`,
            message: `Sự kiện <strong>"${event.title}"</strong> sẽ bắt đầu sau khoảng <strong>${diffMinutes} phút</strong> (lúc <strong>${event.startTime}</strong>).`,
            priority: (rule?.priority as any) || 'HIGH',
            category: 'CALENDAR',
            actionUrl: `${(process.env.APP_URL || 'https://www.quanlicanhan.online').replace(/\/$/, '')}/?view=calendar`,
            actionLabel: 'Mở Lịch biểu',
            triggerBucket,
            metadata: {
              categoryLabel: 'Lịch biểu & Kế hoạch',
              categoryColor: '#3B82F6',
              eventDate: event.date,
              eventTime: `${event.startTime} - ${event.endTime || 'Kết thúc'}`,
              eventType: event.type || 'Công việc'
            }
          });
        }

        // B. Check Event Starting Now (within ±2 minutes of start time)
        if (diffMinutes >= -2 && diffMinutes <= 2) {
          const startRule = await notificationEngine.getUserRule(event.userId, 'CALENDAR_STARTING');
          if (startRule?.enabled) {
            const triggerBucket = `${event.date}_${event.startTime}_start`;
            await notificationEngine.emitEvent({
              userId: event.userId,
              eventType: 'CALENDAR_STARTING',
              entityId: event.id,
              title: `🎯 Sự kiện đang bắt đầu: "${event.title}"`,
              message: `Sự kiện <strong>"${event.title}"</strong> đã chính thức bắt đầu. Hãy tập trung và hoàn thành tốt kế hoạch!`,
              priority: (startRule?.priority as any) || 'HIGH',
              category: 'CALENDAR',
              actionUrl: `${(process.env.APP_URL || 'https://www.quanlicanhan.online').replace(/\/$/, '')}/?view=calendar`,
              actionLabel: 'Vào sự kiện ngay',
              triggerBucket,
              metadata: {
                categoryLabel: 'Sự kiện trực tiếp',
                categoryColor: '#10B981',
                eventDate: event.date,
                eventTime: `${event.startTime} - ${event.endTime || ''}`
              }
            });
          }
        }
      }
    } catch (calErr) {
      console.warn('[NotificationScheduler] sweepCalendarEvents error:', calErr);
    }
  }

  /**
   * Sweep 2: Check Tasks (approaching deadline, due today, overdue)
   */
  private async sweepTasks(now: Date) {
    const prisma = getPrisma();
    try {
      const todayStr = now.toISOString().split('T')[0];

      // Fetch pending tasks with dueDates
      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { not: null },
          status: { notIn: ['Hoàn thành', 'Đã xong', 'Hủy', 'Done', 'Completed'] }
        },
        include: {
          user: {
            select: { id: true, email: true }
          }
        },
        take: 300
      });

      for (const task of tasks) {
        if (!task.userId || !task.dueDate) continue;

        const safeTitle = (task.title || 'Nhiệm vụ').trim();
        const dueDateStr = task.dueDate.split('T')[0];

        // 1. Overdue Tasks
        if (dueDateStr < todayStr) {
          const rule = await notificationEngine.getUserRule(task.userId, 'TASK_OVERDUE');
          if (rule && rule.enabled) {
            const triggerBucket = `overdue_${todayStr}`; // 1 reminder per day for overdue tasks
            await notificationEngine.emitEvent({
              userId: task.userId,
              eventType: 'TASK_OVERDUE',
              entityId: task.id,
              title: `⚠️ Quá hạn deadline: "${safeTitle}"`,
              message: `Nhiệm vụ <strong>"${safeTitle}"</strong> đã quá hạn chót vào ngày <strong>${dueDateStr}</strong> nhưng hiện vẫn chưa hoàn thành. Hãy cập nhật tiến độ ngay!`,
              priority: 'CRITICAL',
              category: 'TASK',
              actionUrl: `${(process.env.APP_URL || 'https://www.quanlicanhan.online').replace(/\/$/, '')}/?view=tasks`,
              actionLabel: 'Xử lý công việc ngay',
              triggerBucket,
              metadata: {
                categoryLabel: 'Cảnh báo hạn chót',
                categoryColor: '#EF4444',
                dueDate: dueDateStr,
                taskStatus: task.status || 'Chưa làm'
              }
            });
          }
          continue;
        }

        // 2. Due Today Tasks
        if (dueDateStr === todayStr) {
          const rule = await notificationEngine.getUserRule(task.userId, 'TASK_DUE_NOW');
          if (rule && rule.enabled) {
            const triggerBucket = `due_today_${todayStr}`;
            await notificationEngine.emitEvent({
              userId: task.userId,
              eventType: 'TASK_DUE_NOW',
              entityId: task.id,
              title: `📅 Hôm nay đến hạn: "${safeTitle}"`,
              message: `Nhiệm vụ <strong>"${safeTitle}"</strong> có hạn chót vào hôm nay (<strong>${todayStr}</strong>). Đừng quên hoàn thành trong ngày!`,
              priority: 'HIGH',
              category: 'TASK',
              actionUrl: `${(process.env.APP_URL || 'https://www.quanlicanhan.online').replace(/\/$/, '')}/?view=tasks`,
              actionLabel: 'Mở danh sách việc',
              triggerBucket,
              metadata: {
                categoryLabel: 'Nhiệm vụ trong ngày',
                categoryColor: '#F59E0B',
                dueDate: todayStr,
                taskStatus: task.status || 'Chưa làm'
              }
            });
          }
          continue;
        }

        // 3. Approaching Deadline (e.g. Due Tomorrow or within configured days)
        const taskDueDate = new Date(dueDateStr);
        const daysDiff = Math.round((taskDueDate.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) { // Tomorrow
          const rule = await notificationEngine.getUserRule(task.userId, 'TASK_DEADLINE_APPROACHING');
          if (rule && rule.enabled) {
            const triggerBucket = `approaching_tomorrow_${todayStr}`;
            await notificationEngine.emitEvent({
              userId: task.userId,
              eventType: 'TASK_DEADLINE_APPROACHING',
              entityId: task.id,
              title: `⏳ Sắp đến hạn chót: "${safeTitle}"`,
              message: `Nhiệm vụ <strong>"${safeTitle}"</strong> sẽ đến hạn vào ngày mai (<strong>${dueDateStr}</strong>). Hãy sắp xếp thời gian để hoàn tất đúng lịch.`,
              priority: 'HIGH',
              category: 'TASK',
              actionUrl: `${(process.env.APP_URL || 'https://www.quanlicanhan.online').replace(/\/$/, '')}/?view=tasks`,
              actionLabel: 'Xem chi tiết việc',
              triggerBucket,
              metadata: {
                categoryLabel: 'Sắp đến hạn',
                categoryColor: '#6366F1',
                dueDate: dueDateStr,
                taskStatus: task.status || 'Chưa làm'
              }
            });
          }
        }
      }
    } catch (taskErr) {
      console.warn('[NotificationScheduler] sweepTasks error:', taskErr);
    }
  }
}

export const notificationScheduler = new NotificationSchedulerService();
