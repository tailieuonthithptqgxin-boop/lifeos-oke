import { getPrisma } from '../../db.js';
import {
  NotificationEventPayload,
  NotificationEventType,
  NotificationPriority,
  NotificationProvider,
  SYSTEM_NOTIFICATION_RULES
} from './notification.types.js';
import { inAppProvider } from './providers/inApp.provider.js';
import { emailProvider } from './providers/email.provider.js';

export class NotificationEngineService {
  private providers: Map<string, NotificationProvider> = new Map();

  constructor() {
    this.registerProvider(inAppProvider);
    this.registerProvider(emailProvider);
  }

  registerProvider(provider: NotificationProvider) {
    this.providers.set(provider.channel, provider);
  }

  /**
   * Retrieves or initializes default notification preferences for a user
   */
  async getUserPreferences(userId: string) {
    const prisma = getPrisma();
    let pref = await prisma.userNotificationPreference.findUnique({
      where: { userId }
    });

    if (!pref) {
      try {
        pref = await prisma.userNotificationPreference.create({
          data: {
            userId,
            enabled: true,
            inAppEnabled: true,
            emailEnabled: true,
            timezone: 'Asia/Ho_Chi_Minh',
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
            quietHoursBypassCritical: true
          }
        });
      } catch (e) {
        pref = await prisma.userNotificationPreference.findUnique({ where: { userId } });
      }
    }

    return pref!;
  }

  /**
   * Retrieves or initializes rule for a specific event type for a user
   */
  async getUserRule(userId: string, eventType: NotificationEventType) {
    const prisma = getPrisma();
    const systemRule = SYSTEM_NOTIFICATION_RULES[eventType];
    if (!systemRule) return null;

    let rule = await prisma.userNotificationRule.findUnique({
      where: {
        userId_eventType: { userId, eventType }
      }
    });

    if (!rule) {
      try {
        rule = await prisma.userNotificationRule.create({
          data: {
            userId,
            eventType,
            enabled: systemRule.defaultEnabled,
            timingOffsetMinutes: systemRule.defaultTimingMinutes,
            priority: systemRule.defaultPriority,
            channels: 'in_app,email'
          }
        });
      } catch (e) {
        rule = await prisma.userNotificationRule.findUnique({
          where: { userId_eventType: { userId, eventType } }
        });
      }
    }

    return rule;
  }

  /**
   * Checks if current time is within user's configured Quiet Hours
   */
  isWithinQuietHours(pref: { quietHoursEnabled: boolean; quietHoursStart: string; quietHoursEnd: string; timezone: string }, checkDate: Date = new Date()): boolean {
    if (!pref.quietHoursEnabled) return false;

    try {
      // Format hour & minute in user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: pref.timezone || 'Asia/Ho_Chi_Minh',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(checkDate);
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const currentMinutes = hour * 60 + minute;

      const [startH, startM] = (pref.quietHoursStart || '22:00').split(':').map(Number);
      const [endH, endM] = (pref.quietHoursEnd || '07:00').split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        // e.g. 13:00 to 14:00
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // e.g. 22:00 to 07:00 (crosses midnight)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch (e) {
      return false;
    }
  }

  /**
   * Calculates the exact date when quiet hours will end for scheduling deferred notifications
   */
  calculateQuietHoursEndTime(pref: { quietHoursEnd: string; timezone: string }, fromDate: Date = new Date()): Date {
    try {
      const [endH, endM] = (pref.quietHoursEnd || '07:00').split(':').map(Number);
      const deferred = new Date(fromDate);
      // Advance by at least 1 minute past quiet hours
      deferred.setHours(endH, endM + 1, 0, 0);
      if (deferred.getTime() <= fromDate.getTime()) {
        deferred.setDate(deferred.getDate() + 1);
      }
      return deferred;
    } catch (e) {
      return new Date(fromDate.getTime() + 60 * 60 * 1000); // 1 hour later fallback
    }
  }

  /**
   * Main entry point to emit a notification event into the Engine
   */
  async emitEvent(event: NotificationEventPayload): Promise<{ delivered: number; skipped: number; errors: string[] }> {
    const prisma = getPrisma();
    const result = { delivered: 0, skipped: 0, errors: [] as string[] };

    try {
      const [user, pref, rule] = await Promise.all([
        prisma.user.findUnique({
          where: { id: event.userId },
          select: { id: true, name: true, email: true }
        }),
        this.getUserPreferences(event.userId),
        this.getUserRule(event.userId, event.eventType)
      ]);

      if (!user) {
        result.errors.push('User not found');
        return result;
      }

      // 1. Master toggle check
      if (!pref.enabled) {
        result.skipped++;
        return result;
      }

      // 2. Event rule toggle check
      if (rule && !rule.enabled) {
        result.skipped++;
        return result;
      }

      const priority: NotificationPriority = (event.priority || rule?.priority || 'NORMAL') as NotificationPriority;
      const configuredChannels = (rule?.channels || 'in_app,email')
        .split(',')
        .map(c => c.trim().toLowerCase())
        .filter(Boolean);

      const targetChannels: string[] = [];
      if (configuredChannels.includes('in_app') && pref.inAppEnabled) {
        targetChannels.push('in_app');
      }
      if (configuredChannels.includes('email') && pref.emailEnabled && (user.email || pref.recipientEmail)) {
        targetChannels.push('email');
      }

      if (targetChannels.length === 0) {
        result.skipped++;
        return result;
      }

      const now = new Date();
      let scheduledFor = event.scheduledFor || now;

      // 3. Check Quiet Hours
      const inQuietHours = this.isWithinQuietHours(pref, scheduledFor);
      const bypassQuietHours = priority === 'CRITICAL' && pref.quietHoursBypassCritical;

      // 4. Time bucket for anti-duplication
      // e.g. "2026-10-20T19:00" or custom triggerBucket passed in
      const triggerBucket = event.triggerBucket || now.toISOString().substring(0, 16);

      // 5. Create delivery records for each channel with unique Idempotency Key
      for (const channel of targetChannels) {
        const idempotencyKey = `${event.userId}:${event.eventType}:${event.entityId || 'gen'}:${triggerBucket}:${channel}`;
        
        // If within quiet hours and not critical, defer email delivery until morning
        let channelScheduledFor = scheduledFor;
        if (channel === 'email' && inQuietHours && !bypassQuietHours) {
          channelScheduledFor = this.calculateQuietHoursEndTime(pref, scheduledFor);
        }

        const recipient = channel === 'email'
          ? (pref.recipientEmail || user.email)
          : event.userId;

        let delivery: any = null;

        try {
          delivery = await prisma.notificationDelivery.create({
            data: {
              userId: event.userId,
              eventType: event.eventType,
              entityId: event.entityId,
              channel,
              recipient,
              title: event.title,
              content: event.message,
              priority,
              status: 'PENDING',
              idempotencyKey,
              scheduledFor: channelScheduledFor,
              metadata: JSON.stringify({
                category: event.category || 'SYSTEM',
                actionUrl: event.actionUrl,
                actionLabel: event.actionLabel,
                triggerBucket,
                ...(event.metadata || {})
              })
            }
          });
        } catch (dbErr: any) {
          // Prisma P2002: Unique constraint failed on idempotencyKey -> EXACT DUPLICATE DETECTED!
          if (dbErr.code === 'P2002' || dbErr.message?.includes('Unique constraint')) {
            // Safely skip duplicate delivery
            result.skipped++;
            continue;
          }
          console.error('[NotificationEngine] Delivery record creation error:', dbErr);
          result.errors.push(dbErr.message);
          continue;
        }

        // If scheduled for immediate execution (now), dispatch immediately
        if (channelScheduledFor.getTime() <= now.getTime() + 5000) {
          await this.dispatchDelivery(delivery, user);
          result.delivered++;
        } else {
          // Kept in PENDING status for NotificationScheduler to pick up
          result.delivered++;
        }
      }

      return result;
    } catch (err: any) {
      console.error('[NotificationEngine] emitEvent unexpected error:', err);
      result.errors.push(err.message);
      return result;
    }
  }

  /**
   * Dispatches a single delivery through its registered provider
   */
  async dispatchDelivery(delivery: any, userContext?: { email: string; name?: string | null }) {
    const prisma = getPrisma();
    const provider = this.providers.get(delivery.channel);

    if (!provider) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SKIPPED',
          errorMessage: `No provider registered for channel '${delivery.channel}'`
        }
      });
      return;
    }

    // Mark as PROCESSING
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: 'PROCESSING' }
    });

    if (!userContext) {
      const u = await prisma.user.findUnique({
        where: { id: delivery.userId },
        select: { email: true, name: true }
      });
      userContext = u || { email: delivery.recipient, name: 'Bạn' };
    }

    let metaObj: Record<string, any> = {};
    try {
      if (delivery.metadata) metaObj = JSON.parse(delivery.metadata);
    } catch (e) {}

    const res = await provider.send(
      {
        id: delivery.id,
        userId: delivery.userId,
        recipient: delivery.recipient,
        subject: delivery.subject,
        title: delivery.title,
        content: delivery.content,
        priority: delivery.priority,
        actionUrl: metaObj.actionUrl,
        actionLabel: metaObj.actionLabel,
        metadata: delivery.metadata
      },
      userContext
    );

    const now = new Date();

    if (res.success) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SENT',
          sentAt: now,
          errorMessage: null,
          notificationId: res.details?.notificationId || null
        }
      });
    } else {
      const nextRetryCount = (delivery.retryCount || 0) + 1;
      const maxRetries = delivery.maxRetries || 3;

      if (nextRetryCount < maxRetries) {
        // Exponential backoff retry: 2m, 8m, 32m
        const delayMs = Math.pow(4, nextRetryCount) * 30000;
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'RETRYING',
            retryCount: nextRetryCount,
            nextRetryAt: new Date(now.getTime() + delayMs),
            errorMessage: res.error || 'Delivery failed'
          }
        });
      } else {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED',
            failedAt: now,
            errorMessage: res.error || 'Delivery failed after maximum retries'
          }
        });
      }
    }
  }

  /**
   * Processes queue of pending and retrying deliveries
   */
  async processPendingDeliveries(batchSize = 50) {
    const prisma = getPrisma();
    const now = new Date();

    try {
      const pendingDeliveries = await prisma.notificationDelivery.findMany({
        where: {
          OR: [
            {
              status: 'PENDING',
              scheduledFor: { lte: now }
            },
            {
              status: 'RETRYING',
              nextRetryAt: { lte: now }
            }
          ]
        },
        take: batchSize,
        orderBy: { scheduledFor: 'asc' }
      });

      if (pendingDeliveries.length === 0) return 0;

      for (const delivery of pendingDeliveries) {
        try {
          await this.dispatchDelivery(delivery);
        } catch (deliveryErr: any) {
          console.error(`[NotificationEngine] Error processing delivery ${delivery.id}:`, deliveryErr);
        }
      }

      return pendingDeliveries.length;
    } catch (err: any) {
      console.error('[NotificationEngine] processPendingDeliveries failed:', err);
      return 0;
    }
  }
}

export const notificationEngine = new NotificationEngineService();
