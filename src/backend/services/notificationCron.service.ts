import cron from 'node-cron';
import { getPrisma } from '../db.js';
import { pushNotificationService } from './pushNotification.service.js';

class NotificationCronService {
  private cronJob: cron.ScheduledTask | null = null;
  private isProcessing: boolean = false;
  private lastRunAt: Date | null = null;

  start() {
    if (this.cronJob) return;

    console.log('[NotificationCron] Starting node-cron scheduler (runs every minute: * * * * *)...');
    
    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.runNotificationSweep();
    });

    // Run one initial scan after 5s startup
    setTimeout(() => {
      this.runNotificationSweep().catch(e => console.warn('[NotificationCron] Initial sweep error:', e.message));
    }, 5000);
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[NotificationCron] Scheduler stopped.');
    }
  }

  getStatus() {
    return {
      active: !!this.cronJob,
      lastRunAt: this.lastRunAt,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Main scan function: Checks due tasks, events, and morning summaries.
   * Can be invoked on schedule or on-demand by Admin ("Chạy quét nhắc việc ngay").
   */
  async runNotificationSweep(): Promise<{
    processedUsers: number;
    tasksNotified: number;
    eventsNotified: number;
    morningSummaries: number;
    durationMs: number;
  }> {
    if (this.isProcessing) {
      return { processedUsers: 0, tasksNotified: 0, eventsNotified: 0, morningSummaries: 0, durationMs: 0 };
    }

    this.isProcessing = true;
    const start = Date.now();
    this.lastRunAt = new Date();

    let tasksNotified = 0;
    let eventsNotified = 0;
    let morningSummaries = 0;
    let processedUsers = 0;

    try {
      const prisma = getPrisma();
      const now = new Date();

      // Current Vietnam Time (UTC+7)
      const vnTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(now);

      // Extract YYYY-MM-DD and HH:mm
      const [datePart, timePart] = vnTimeStr.split(', ');
      const [m, d, y] = datePart.split('/');
      const todayDate = `${y}-${m}-${d}`;
      const [currH, currM] = (timePart || '07:30').split(':');
      const currentHm = `${currH}:${currM}`;

      // 1. Load users with active preferences
      const preferences = await prisma.notificationPreference.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true, status: true }
          }
        }
      });

      processedUsers = preferences.length;

      for (const pref of preferences) {
        if (!pref.user || pref.user.status !== 'ACTIVE') continue;
        const userId = pref.userId;
        const leadMinutes = pref.leadTimeMinutes || 15;

        // --- CHECK A: MORNING SUMMARY ---
        if (pref.morningSummaryEnabled && pref.morningSummaryTime === currentHm) {
          const todayKey = `morning_summary_${userId}_${todayDate}`;
          const alreadySent = await prisma.notificationChannelLog.findFirst({
            where: {
              userId,
              channel: 'MORNING_SUMMARY',
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          });

          if (!alreadySent) {
            // Count today's tasks
            const todayTasks = await prisma.task.findMany({
              where: {
                userId,
                dueDate: todayDate,
                status: { notIn: ['Hoàn thành', 'Đã xong', 'Hủy'] }
              },
              select: { title: true, priority: true }
            });

            // Count today's events
            const todayEvents = await prisma.calendarEvent.findMany({
              where: {
                userId,
                startDate: todayDate
              },
              select: { title: true, startTime: true }
            });

            const summaryBody = `Chào buổi sáng ${pref.user.name || ''}! Hôm nay bạn có ${todayTasks.length} nhiệm vụ và ${todayEvents.length} sự kiện lịch biểu cần hoàn thành. Hãy bắt đầu ngày mới thật năng lượng!`;

            // Push notification
            if (pref.channelWebPush) {
              await pushNotificationService.sendPushToUser(userId, {
                title: '🌅 Báo Cáo Buổi Sáng - Life OS',
                body: summaryBody,
                url: '/?view=dashboard'
              });
            }

            // Messenger
            if (pref.channelMessenger && pref.messengerPsid) {
              await pushNotificationService.sendMessengerMessage(
                pref.messengerPsid,
                `🌅 [BÁO CÁO BUỔI SÁNG]\n${summaryBody}`,
                `${process.env.APP_URL || 'https://www.quanlicanhan.online'}/?view=dashboard`
              );
            }

            await prisma.notificationChannelLog.create({
              data: {
                userId,
                channel: 'MORNING_SUMMARY',
                title: 'Báo Cáo Buổi Sáng',
                body: summaryBody,
                status: 'SUCCESS'
              }
            });

            morningSummaries++;
          }
        }

        // --- CHECK B: TASKS APPROACHING DEADLINE ---
        if (pref.channelWebPush || pref.channelMessenger) {
          // Tasks due today or approaching lead time
          const upcomingTasks = await prisma.task.findMany({
            where: {
              userId,
              dueDate: todayDate,
              status: { notIn: ['Hoàn thành', 'Đã xong', 'Hủy'] }
            },
            take: 20
          });

          for (const task of upcomingTasks) {
            // Check if already notified for this task today
            const taskLog = await prisma.notificationChannelLog.findFirst({
              where: {
                userId,
                channel: 'TASK_DEADLINE',
                title: task.title,
                createdAt: {
                  gte: new Date(Date.now() - 3600000 * 3) // Within last 3 hours
                }
              }
            });

            if (!taskLog) {
              const body = `Nhiệm vụ "${task.title}" sắp đến hạn (${task.dueTime || 'Hôm nay'}). Mức độ ưu tiên: ${task.priority || 'Bình thường'}.`;

              if (pref.channelWebPush) {
                await pushNotificationService.sendPushToUser(userId, {
                  title: '⏰ Nhắc Nhở Công Việc',
                  body,
                  url: '/?view=tasks'
                });
              }

              if (pref.channelMessenger && pref.messengerPsid) {
                await pushNotificationService.sendMessengerMessage(
                  pref.messengerPsid,
                  `⏰ [NHẮC NHỞ HẠN CHÓT]\n${body}`,
                  `${process.env.APP_URL || 'https://www.quanlicanhan.online'}/?view=tasks`
                );
              }

              await prisma.notificationChannelLog.create({
                data: {
                  userId,
                  channel: 'TASK_DEADLINE',
                  title: task.title,
                  body,
                  url: '/?view=tasks',
                  status: 'SUCCESS'
                }
              });

              tasksNotified++;
            }
          }
        }

        // --- CHECK C: CALENDAR EVENTS APPROACHING ---
        if (pref.channelWebPush || pref.channelMessenger) {
          const upcomingEvents = await prisma.calendarEvent.findMany({
            where: {
              userId,
              startDate: todayDate
            },
            take: 20
          });

          for (const ev of upcomingEvents) {
            const evLog = await prisma.notificationChannelLog.findFirst({
              where: {
                userId,
                channel: 'CALENDAR_EVENT',
                title: ev.title,
                createdAt: {
                  gte: new Date(Date.now() - 3600000 * 3)
                }
              }
            });

            if (!evLog) {
              const body = `Sự kiện "${ev.title}" bắt đầu lúc ${ev.startTime || 'Hôm nay'}. Địa điểm: ${ev.location || 'Trực tuyến/Không xác định'}.`;

              if (pref.channelWebPush) {
                await pushNotificationService.sendPushToUser(userId, {
                  title: '📅 Sự Kiện Lịch Biểu',
                  body,
                  url: '/?view=calendar'
                });
              }

              if (pref.channelMessenger && pref.messengerPsid) {
                await pushNotificationService.sendMessengerMessage(
                  pref.messengerPsid,
                  `📅 [SỰ KIỆN SẮP DIỄN RA]\n${body}`,
                  `${process.env.APP_URL || 'https://www.quanlicanhan.online'}/?view=calendar`
                );
              }

              await prisma.notificationChannelLog.create({
                data: {
                  userId,
                  channel: 'CALENDAR_EVENT',
                  title: ev.title,
                  body,
                  url: '/?view=calendar',
                  status: 'SUCCESS'
                }
              });

              eventsNotified++;
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[NotificationCron] Sweep error:', err);
    } finally {
      this.isProcessing = false;
    }

    const durationMs = Date.now() - start;
    return {
      processedUsers,
      tasksNotified,
      eventsNotified,
      morningSummaries,
      durationMs
    };
  }
}

export const notificationCronService = new NotificationCronService();
