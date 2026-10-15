import webpush from 'web-push';
import { getPrisma } from '../db.js';

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export interface FacebookMessengerConfig {
  pageId: string;
  pageAccessToken: string;
  verifyToken: string;
}

export const DEFAULT_FB_CONFIG: FacebookMessengerConfig = {
  pageId: process.env.FB_PAGE_ID || '',
  pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || '',
  verifyToken: process.env.FB_VERIFY_TOKEN || 'lifeos_messenger_verify_token_2026'
};

class PushNotificationService {
  private vapidKeys: VapidKeys | null = null;
  private isVapidConfigured: boolean = false;

  constructor() {
    this.initVapid().catch(err => {
      console.warn('[PushNotificationService] Initial VAPID init error:', err.message);
    });
  }

  /**
   * Initializes or loads persistent VAPID keys for Web Push.
   * If not set in ENV, generates a persistent pair in the database.
   */
  async initVapid(): Promise<VapidKeys> {
    if (this.vapidKeys && this.isVapidConfigured) {
      return this.vapidKeys;
    }

    const envPublic = process.env.VAPID_PUBLIC_KEY;
    const envPrivate = process.env.VAPID_PRIVATE_KEY;

    if (envPublic && envPrivate) {
      this.vapidKeys = { publicKey: envPublic.trim(), privateKey: envPrivate.trim() };
      this.setupWebPush(this.vapidKeys);
      return this.vapidKeys;
    }

    try {
      const prisma = getPrisma();
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'push_vapid_keys' }
      });

      if (setting && setting.value) {
        const parsed = JSON.parse(setting.value);
        if (parsed.publicKey && parsed.privateKey) {
          this.vapidKeys = parsed;
          this.setupWebPush(this.vapidKeys!);
          return this.vapidKeys!;
        }
      }

      // Generate a new standard VAPID keypair
      console.log('[PushNotificationService] Generating new persistent VAPID keypair for Web Push...');
      const generated = webpush.generateVAPIDKeys();
      this.vapidKeys = generated;

      await prisma.systemSetting.upsert({
        where: { key: 'push_vapid_keys' },
        update: { value: JSON.stringify(generated) },
        create: { key: 'push_vapid_keys', value: JSON.stringify(generated) }
      });

      this.setupWebPush(this.vapidKeys);
      return this.vapidKeys;
    } catch (err: any) {
      console.error('[PushNotificationService] Error persisting VAPID keys:', err);
      // In-memory fallback
      const generated = webpush.generateVAPIDKeys();
      this.vapidKeys = generated;
      this.setupWebPush(generated);
      return generated;
    }
  }

  private setupWebPush(keys: VapidKeys) {
    const contactEmail = process.env.VAPID_SUBJECT || 'mailto:notifications@quanlicanhan.online';
    webpush.setVapidDetails(contactEmail, keys.publicKey, keys.privateKey);
    this.isVapidConfigured = true;
    console.log('[PushNotificationService] VAPID Web Push initialized successfully.');
  }

  async getVapidPublicKey(): Promise<string> {
    const keys = await this.initVapid();
    return keys.publicKey;
  }

  /**
   * Retrieves Facebook Messenger settings from DB or ENV
   */
  async getFacebookConfig(): Promise<FacebookMessengerConfig> {
    try {
      const prisma = getPrisma();
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'facebook_messenger_config' }
      });

      if (setting && setting.value) {
        const parsed = JSON.parse(setting.value);
        return { ...DEFAULT_FB_CONFIG, ...parsed };
      }
    } catch (err) {
      console.warn('[PushNotificationService] Failed to load FB config from DB:', err);
    }
    return DEFAULT_FB_CONFIG;
  }

  /**
   * Saves updated Facebook Messenger configuration
   */
  async saveFacebookConfig(config: Partial<FacebookMessengerConfig>): Promise<FacebookMessengerConfig> {
    const current = await this.getFacebookConfig();
    const merged: FacebookMessengerConfig = {
      pageId: config.pageId !== undefined ? config.pageId.trim() : current.pageId,
      pageAccessToken: config.pageAccessToken !== undefined ? config.pageAccessToken.trim() : current.pageAccessToken,
      verifyToken: config.verifyToken !== undefined ? config.verifyToken.trim() : current.verifyToken
    };

    const prisma = getPrisma();
    await prisma.systemSetting.upsert({
      where: { key: 'facebook_messenger_config' },
      update: { value: JSON.stringify(merged) },
      create: { key: 'facebook_messenger_config', value: JSON.stringify(merged) }
    });

    return merged;
  }

  /**
   * Sends a Web Push notification to a single device subscription.
   * If device returns 404 or 410 (unsubscribed / app uninstalled), automatically cleans it up from the DB.
   */
  async sendSinglePush(
    sub: { id: string; endpoint: string; p256dh: string; auth: string },
    payload: { title: string; body: string; url?: string; icon?: string; badge?: string; tag?: string }
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    await this.initVapid();

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      url: payload.url || '/',
      tag: payload.tag || 'lifeos-alert'
    });

    try {
      // 10s timeout to protect server threads
      const sendPromise = webpush.sendNotification(pushSubscription, payloadString);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Web Push request timeout (10s)')), 10000)
      );

      const res = await Promise.race([sendPromise, timeoutPromise]);
      return { success: true, statusCode: (res as any)?.statusCode || 201 };
    } catch (err: any) {
      const statusCode = err.statusCode || (err.response && err.response.statusCode);

      // Requirement: Auto-cleanup if subscription expired or app deleted (410 Gone / 404 Not Found)
      if (statusCode === 410 || statusCode === 404) {
        console.warn(`[PushNotificationService] Subscription dead (${statusCode}) for endpoint: ${sub.endpoint}. Deleting from DB...`);
        try {
          const prisma = getPrisma();
          await prisma.pushDeviceSubscription.delete({
            where: { endpoint: sub.endpoint }
          });
        } catch (delErr) {
          // Ignore delete race condition
        }
      }

      return {
        success: false,
        statusCode,
        error: err.message || 'Push dispatch failed'
      };
    }
  }

  /**
   * Sends Web Push to all registered devices of a given User
   */
  async sendPushToUser(
    userId: string,
    payload: { title: string; body: string; url?: string; tag?: string }
  ): Promise<{ total: number; sent: number; failed: number }> {
    const prisma = getPrisma();
    const subscriptions = await prisma.pushDeviceSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const res = await this.sendSinglePush(sub, payload);
      if (res.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { total: subscriptions.length, sent, failed };
  }

  /**
   * Sends a Facebook Messenger message via Facebook Graph API (HTTPS port 443)
   */
  async sendMessengerMessage(
    psid: string,
    text: string,
    actionUrl?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const fbConfig = await this.getFacebookConfig();
    if (!fbConfig.pageAccessToken) {
      return { success: false, error: 'Facebook Page Access Token chưa được cấu hình trong Admin.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout constraint

    try {
      const graphUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(fbConfig.pageAccessToken)}`;

      const messageBody: any = {
        recipient: { id: psid },
        messaging_type: 'MESSAGE_TAG',
        tag: 'CONFIRMED_EVENT_UPDATE',
        message: {
          text
        }
      };

      if (actionUrl) {
        messageBody.message = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text: text.slice(0, 640),
              buttons: [
                {
                  type: 'web_url',
                  url: actionUrl.startsWith('http') ? actionUrl : `https://${actionUrl}`,
                  title: 'Xem trên Life OS'
                }
              ]
            }
          }
        };
      }

      const res = await fetch(graphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data?.message_id) {
        return { success: true, messageId: data.message_id };
      } else {
        const errorDesc = data?.error?.message || `HTTP ${res.status}`;
        return { success: false, error: errorDesc };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      return { success: false, error: err.name === 'AbortError' ? 'Facebook API timeout (10s)' : err.message };
    }
  }

  /**
   * Generates standard RFC 5545 iCalendar (.ics) feed for a user
   */
  async generateIcsFeed(calendarToken: string): Promise<string | null> {
    const prisma = getPrisma();
    const pref = await prisma.notificationPreference.findUnique({
      where: { calendarToken },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!pref || !pref.user) {
      return null;
    }

    const userId = pref.userId;
    const now = new Date();
    const pastLimit = new Date(now.getTime() - 14 * 86400000); // Past 14 days
    const futureLimit = new Date(now.getTime() + 90 * 86400000); // Next 90 days

    // Load user's tasks with due dates
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: { not: null }
      },
      take: 200
    });

    // Load user's calendar events
    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        startDate: { gte: pastLimit.toISOString().slice(0, 10) }
      },
      take: 200
    });

    // Format RFC 5545 date: YYYYMMDDTHHMMSSZ
    const toIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const toIcsDateStr = (dateStr: string, timeStr?: string | null) => {
      try {
        const timePart = timeStr ? `${timeStr.replace(':', '')}00` : '090000';
        const cleanDate = dateStr.replace(/-/g, '');
        return `${cleanDate}T${timePart}Z`;
      } catch (e) {
        return toIcsDate(new Date());
      }
    };

    const escapeIcs = (str?: string | null) => {
      if (!str) return '';
      return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const leadMinutes = pref.leadTimeMinutes || 15;

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LifeOS//Personal Operating System//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Life OS - ${pref.user.name || 'Lịch Cá Nhân'}`,
      'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      'X-PUBLISHED-TTL:PT15M'
    ];

    // Add Events
    for (const ev of events) {
      const uid = `event-${ev.id}@lifeos.local`;
      const startIcs = toIcsDateStr(ev.startDate, ev.startTime);
      const endIcs = ev.endDate ? toIcsDateStr(ev.endDate, ev.endTime) : startIcs;

      ics.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toIcsDate(now)}`,
        `DTSTART:${startIcs}`,
        `DTEND:${endIcs}`,
        `SUMMARY:${escapeIcs(ev.title)}`,
        `DESCRIPTION:${escapeIcs(ev.description || 'Sự kiện từ Life OS')}`,
        ev.location ? `LOCATION:${escapeIcs(ev.location)}` : '',
        'STATUS:CONFIRMED',
        // Alarm
        'BEGIN:VALARM',
        `TRIGGER:-PT${leadMinutes}M`,
        'ACTION:DISPLAY',
        `DESCRIPTION:Nhắc nhở Life OS: ${escapeIcs(ev.title)}`,
        'END:VALARM',
        'END:VEVENT'
      );
    }

    // Add Tasks as VEVENT with alarms
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const uid = `task-${t.id}@lifeos.local`;
      const dueIcs = toIcsDateStr(t.dueDate, t.dueTime);

      ics.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toIcsDate(now)}`,
        `DTSTART:${dueIcs}`,
        `DTEND:${dueIcs}`,
        `SUMMARY:[Task] ${escapeIcs(t.title)}`,
        `DESCRIPTION:${escapeIcs(t.description || 'Nhiệm vụ cần hoàn thành từ Life OS')}\\nTrạng thái: ${t.status || 'Chưa hoàn thành'}\\nMức độ: ${t.priority || 'Trung bình'}`,
        t.status === 'Hoàn thành' || t.status === 'Đã xong' ? 'STATUS:COMPLETED' : 'STATUS:NEEDS-ACTION',
        'BEGIN:VALARM',
        `TRIGGER:-PT${leadMinutes}M`,
        'ACTION:DISPLAY',
        `DESCRIPTION:Hạn công việc: ${escapeIcs(t.title)}`,
        'END:VALARM',
        'END:VEVENT'
      );
    }

    ics.push('END:VCALENDAR');

    return ics.filter(Boolean).join('\r\n');
  }

  /**
   * Health Check over HTTPS port 443 for Railway
   */
  async runHealthCheck(): Promise<{
    healthy: boolean;
    vapid: { configured: boolean; publicKeyPrefix: string };
    facebook: { configured: boolean; pageId: string; apiReachable: boolean; latencyMs?: number };
    httpsPort443: boolean;
    timestamp: string;
  }> {
    const vapid = await this.initVapid();
    const fb = await this.getFacebookConfig();

    let fbReachable = false;
    let latencyMs = 0;

    if (fb.pageAccessToken) {
      const start = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(fb.pageAccessToken)}`, {
          signal: controller.signal
        });
        clearTimeout(timer);
        latencyMs = Date.now() - start;
        fbReachable = res.ok;
      } catch (e) {
        clearTimeout(timer);
      }
    }

    return {
      healthy: !!(vapid.publicKey),
      vapid: {
        configured: !!vapid.publicKey,
        publicKeyPrefix: vapid.publicKey ? vapid.publicKey.slice(0, 10) + '...' : ''
      },
      facebook: {
        configured: !!fb.pageAccessToken,
        pageId: fb.pageId || 'Chưa thiết lập',
        apiReachable: fbReachable,
        latencyMs
      },
      httpsPort443: true,
      timestamp: new Date().toISOString()
    };
  }
}

export const pushNotificationService = new PushNotificationService();
