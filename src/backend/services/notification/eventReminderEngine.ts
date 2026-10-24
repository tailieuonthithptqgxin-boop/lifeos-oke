import { getPrisma } from '../../db.js';
import { notificationEngine } from './notificationEngine.service.js';
import { NotificationEventType, NotificationPriority } from './notification.types.js';

export interface MilestoneConfig {
  key: 'T_MINUS_5H' | 'T_MINUS_3H' | 'T_MINUS_30M' | 'T_ZERO';
  offsetMinutes: number; // -300, -180, -30, 0
  label: string;
  eventType: NotificationEventType;
  priority: NotificationPriority;
  title: (title: string, isTask: boolean) => string;
  message: (title: string, isTask: boolean, timeStr?: string) => string;
}

export const REMINDER_MILESTONES: MilestoneConfig[] = [
  {
    key: 'T_MINUS_5H',
    offsetMinutes: -300, // 5 hours prior
    label: '5 giờ',
    eventType: 'CALENDAR_UPCOMING',
    priority: 'HIGH',
    title: (title, isTask) => isTask ? `⏰ Nhắc nhở trước 5 giờ: "${title}"` : `⏰ Nhắc nhở trước 5 giờ: "${title}"`,
    message: (title, isTask) => isTask ? `Nhiệm vụ sẽ bắt đầu sau 5 giờ.` : `Sự kiện sẽ bắt đầu sau 5 giờ.`
  },
  {
    key: 'T_MINUS_3H',
    offsetMinutes: -180, // 3 hours prior
    label: '3 giờ',
    eventType: 'CALENDAR_UPCOMING',
    priority: 'HIGH',
    title: (title, isTask) => isTask ? `⏰ Nhắc nhở trước 3 giờ: "${title}"` : `⏰ Nhắc nhở trước 3 giờ: "${title}"`,
    message: (title, isTask) => isTask ? `Nhiệm vụ sẽ bắt đầu sau 3 giờ.` : `Sự kiện sẽ bắt đầu sau 3 giờ.`
  },
  {
    key: 'T_MINUS_30M',
    offsetMinutes: -30, // 30 minutes prior
    label: '30 phút',
    eventType: 'CALENDAR_UPCOMING',
    priority: 'HIGH',
    title: (title, isTask) => isTask ? `⏰ Nhắc nhở trước 30 phút: "${title}"` : `⏰ Nhắc nhở trước 30 phút: "${title}"`,
    message: (title, isTask) => isTask ? `Nhiệm vụ sẽ bắt đầu sau 30 phút.` : `Sự kiện sẽ bắt đầu sau 30 phút.`
  },
  {
    key: 'T_ZERO',
    offsetMinutes: 0, // At event start
    label: 'Bắt đầu',
    eventType: 'CALENDAR_STARTING',
    priority: 'HIGH',
    title: (title, isTask) => isTask ? `🎯 Nhiệm vụ đã bắt đầu: "${title}"` : `🎯 Sự kiện đã bắt đầu: "${title}"`,
    message: (title, isTask) => isTask ? `Nhiệm vụ đã bắt đầu.` : `Sự kiện đã bắt đầu.`
  }
];

/**
 * Accurately parses a date string and optional time string in the user's timezone into a UTC Date.
 * Handles:
 * - dateStr: "YYYY-MM-DD" or ISO "YYYY-MM-DDTHH:mm:ss"
 * - timeStr: "HH:mm" or "HH:mm:ss"
 * - timezone: e.g. "Asia/Ho_Chi_Minh" (defaults to Vietnam UTC+7)
 */
export function parseDateTimeInUserTz(
  dateStr: string,
  timeStr?: string | null,
  timeZone: string = 'Asia/Ho_Chi_Minh'
): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  let cleanDate = dateStr.trim();
  let cleanTime = timeStr ? timeStr.trim() : '';

  // Extract from combined ISO strings like "2026-10-24T20:00:00" or "2026-10-24 20:00"
  if (cleanDate.includes('T') || cleanDate.includes(' ')) {
    const sep = cleanDate.includes('T') ? 'T' : ' ';
    const parts = cleanDate.split(sep);
    cleanDate = parts[0];
    if (!cleanTime && parts[1]) {
      cleanTime = parts[1].replace(/Z$/, '').slice(0, 5); // take HH:mm
    }
  }

  const dateParts = cleanDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!dateParts) return null;

  const year = parseInt(dateParts[1], 10);
  const month = parseInt(dateParts[2], 10);
  const day = parseInt(dateParts[3], 10);

  let hour = 0;
  let minute = 0;

  if (cleanTime) {
    const timeParts = cleanTime.match(/^(\d{1,2}):(\d{1,2})/);
    if (timeParts) {
      hour = parseInt(timeParts[1], 10);
      minute = parseInt(timeParts[2], 10);
    }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    return null;
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(utcGuess);
    const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || `${year}`, 10);
    const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || `${month}`, 10);
    const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || `${day}`, 10);
    let tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || `${hour}`, 10);
    if (tzHour === 24) tzHour = 0;
    const tzMin = parseInt(parts.find(p => p.type === 'minute')?.value || `${minute}`, 10);

    const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0);
    const diffMs = tzAsUtc - utcGuess.getTime();
    return new Date(utcGuess.getTime() - diffMs);
  } catch (tzErr) {
    // Fallback for Asia/Ho_Chi_Minh: UTC+7 (7 hours = 25,200,000 ms)
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - 7 * 3600 * 1000);
  }
}

/**
 * Returns whether an event or task is active (not finished, not cancelled, not deleted)
 */
export function isEntityActive(entity: any): boolean {
  if (!entity) return false;
  if (entity.deletedAt) return false;

  const rawStatus = (entity.status || '').toString().toLowerCase().trim();
  const finishedStatuses = [
    'đã xong',
    'đã hủy',
    'hoàn thành',
    'hủy',
    'done',
    'completed',
    'cancelled',
    'canceled'
  ];

  return !finishedStatuses.includes(rawStatus);
}

/**
 * Cancels all unsent/PENDING reminder deliveries for a given event or task
 */
export async function cancelEntityReminders(entityId: string): Promise<number> {
  if (!entityId) return 0;
  const prisma = getPrisma();
  try {
    const deleted = await prisma.notificationDelivery.deleteMany({
      where: {
        entityId,
        status: 'PENDING'
      }
    });
    return deleted.count;
  } catch (err: any) {
    console.warn(`[EventReminderEngine] cancelEntityReminders failed for ${entityId}:`, err.message);
    return 0;
  }
}

/**
 * Schedules the 4 reminders (T-5h, T-3h, T-30m, T=0) for an event or task.
 * Rules applied:
 * 1. Skips inactive (completed/cancelled/deleted) entities.
 * 2. Skips any milestone whose scheduled time has already passed ("Nếu Event được tạo sau khi một mốc reminder đã trôi qua -> bỏ qua mốc đó").
 * 3. Enforces idempotency via unique triggerBucket and DB idempotencyKey.
 * 4. PENDING deliveries are queued in NotificationDelivery for the scheduler/worker to process.
 */
export async function scheduleEntityReminders(
  userId: string,
  entityType: 'calendar' | 'task',
  entity: any,
  now: Date = new Date()
): Promise<{ scheduled: number; skipped: number }> {
  const result = { scheduled: 0, skipped: 0 };
  if (!userId || !entity || !entity.id) return result;

  // 1. If entity is completed/cancelled/deleted, cancel any pending reminders
  if (!isEntityActive(entity)) {
    await cancelEntityReminders(entity.id);
    return result;
  }

  // 2. Resolve user timezone
  const pref = await notificationEngine.getUserPreferences(userId);
  const timeZone = pref?.timezone || 'Asia/Ho_Chi_Minh';

  // 3. Resolve start time
  let startUtc: Date | null = null;
  const isTask = entityType === 'task';

  if (isTask) {
    // Tasks may specify startDate or dueDate with time
    const rawTime = entity.startDate || entity.dueDate;
    if (!rawTime) return result;
    startUtc = parseDateTimeInUserTz(rawTime, null, timeZone);
  } else {
    // CalendarEvent has date and startTime
    if (!entity.date || !entity.startTime) return result;
    startUtc = parseDateTimeInUserTz(entity.date, entity.startTime, timeZone);
  }

  if (!startUtc || isNaN(startUtc.getTime())) {
    return result;
  }

  const safeTitle = (entity.title || (isTask ? 'Nhiệm vụ' : 'Sự kiện')).trim();
  const appBaseUrl = (process.env.APP_URL || 'https://www.quanlicanhan.online').replace(/\/$/, '');
  const actionUrl = isTask ? `${appBaseUrl}/?view=tasks` : `${appBaseUrl}/?view=calendar`;
  const actionLabel = isTask ? 'Xem nhiệm vụ' : 'Mở lịch biểu';
  const startIso = startUtc.toISOString();

  // 4. Iterate over the 4 required milestones: T-5h, T-3h, T-30m, T=0
  for (const milestone of REMINDER_MILESTONES) {
    const scheduledFor = new Date(startUtc.getTime() + milestone.offsetMinutes * 60 * 1000);

    // Rule: Nếu Event được tạo sau khi một mốc reminder đã trôi qua -> bỏ qua mốc đó.
    // For T=0, allow a small 2-minute grace period if starting right now
    const cutoff = milestone.key === 'T_ZERO' ? now.getTime() - 2 * 60 * 1000 : now.getTime();
    if (scheduledFor.getTime() <= cutoff) {
      result.skipped++;
      continue;
    }

    // Unique triggerBucket incorporating entityId, milestone, and startIso
    const triggerBucket = `${entity.id}_${milestone.key}_${startIso}`;

    const titleText = milestone.title(safeTitle, isTask);
    const messageText = milestone.message(safeTitle, isTask);

    try {
      await notificationEngine.emitEvent({
        userId,
        eventType: milestone.eventType,
        entityId: entity.id,
        title: titleText,
        message: messageText,
        priority: milestone.priority,
        category: isTask ? 'TASK' : 'CALENDAR',
        actionUrl,
        actionLabel,
        scheduledFor,
        triggerBucket,
        metadata: {
          entityType,
          milestoneKey: milestone.key,
          offsetMinutes: milestone.offsetMinutes,
          eventTitle: safeTitle,
          startUtc: startIso,
          timeZone,
          categoryLabel: isTask ? 'Nhiệm vụ & Kế hoạch' : 'Lịch biểu & Sự kiện',
          categoryColor: isTask ? '#6366F1' : '#10B981',
          eventDate: entity.date || entity.startDate?.slice(0, 10) || '',
          eventTime: entity.startTime || ''
        }
      });
      result.scheduled++;
    } catch (emitErr: any) {
      console.warn(`[EventReminderEngine] Failed to emit reminder ${milestone.key} for ${entity.id}:`, emitErr.message);
    }
  }

  return result;
}

/**
 * Reschedules all reminders for an entity when its time/date changes:
 * 1. Cancels all existing PENDING deliveries for this entity.
 * 2. Re-computes and schedules future reminders based on the new time.
 */
export async function rescheduleEntityReminders(
  userId: string,
  entityType: 'calendar' | 'task',
  entity: any
): Promise<{ scheduled: number; cancelled: number }> {
  const cancelled = await cancelEntityReminders(entity.id);
  const { scheduled } = await scheduleEntityReminders(userId, entityType, entity);
  return { scheduled, cancelled };
}

/**
 * Background periodic synchronization sweep.
 * Inspects all active events and tasks in the current 48-hour window.
 * Ensures all upcoming milestones are scheduled in NotificationDelivery.
 */
export async function syncUpcomingReminders(now: Date = new Date()): Promise<{ syncedEvents: number; syncedTasks: number }> {
  const prisma = getPrisma();
  const result = { syncedEvents: 0, syncedTasks: 0 };

  try {
    // 1. Sweep CalendarEvents for today, tomorrow, and day after tomorrow
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const dayAfter = new Date(now.getTime() + 48 * 3600 * 1000).toISOString().slice(0, 10);

    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        date: { in: [todayStr, tomorrow, dayAfter] },
        startTime: { not: null }
      },
      take: 200
    });

    for (const evt of upcomingEvents) {
      if (!evt.userId || !evt.startTime) continue;
      if (!isEntityActive(evt)) {
        await cancelEntityReminders(evt.id);
      } else {
        await scheduleEntityReminders(evt.userId, 'calendar', evt, now);
        result.syncedEvents++;
      }
    }

    // 2. Sweep Tasks with start dates or due dates in the current window
    const upcomingTasks = await prisma.task.findMany({
      where: {
        OR: [
          { startDate: { not: null } },
          { dueDate: { not: null } }
        ]
      },
      take: 200
    });

    for (const task of upcomingTasks) {
      if (!task.userId) continue;
      if (!isEntityActive(task)) {
        await cancelEntityReminders(task.id);
      } else {
        const rawTime = task.startDate || task.dueDate;
        if (rawTime && (rawTime.includes(todayStr) || rawTime.includes(tomorrow) || rawTime.includes(dayAfter))) {
          await scheduleEntityReminders(task.userId, 'task', task, now);
          result.syncedTasks++;
        }
      }
    }
  } catch (syncErr: any) {
    console.warn('[EventReminderEngine] syncUpcomingReminders error:', syncErr.message);
  }

  return result;
}
