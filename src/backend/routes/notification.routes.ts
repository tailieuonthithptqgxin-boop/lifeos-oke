import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getPrisma } from '../db.js';
import { requireAuth, requireAdmin, AuthRequest } from '../auth.middleware.js';
import { pushNotificationService } from '../services/pushNotification.service.js';
import { notificationCronService } from '../services/notificationCron.service.js';

export const notificationRouter = Router();

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.trim()) {
    return process.env.APP_URL.trim().replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5173';
  return `${protocol}://${host}`;
}

// ========================================================
// 1. PUBLIC TOKEN CALENDAR FEED (RFC 5545 .ics)
// ========================================================
notificationRouter.get('/calendar/:token/feed.ics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token || token.length < 10) {
      res.status(400).send('Invalid calendar token');
      return;
    }

    const icsContent = await pushNotificationService.generateIcsFeed(token);
    if (!icsContent) {
      res.status(404).send('Calendar feed not found or invalid token');
      return;
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="lifeos-calendar.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(icsContent);
  } catch (err: any) {
    console.error('Error generating calendar feed:', err);
    res.status(500).send('Error generating calendar feed: ' + err.message);
  }
});

// ========================================================
// 2. FACEBOOK MESSENGER WEBHOOK (GET & POST)
// ========================================================
notificationRouter.get('/notifications/messenger/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const fbConfig = await pushNotificationService.getFacebookConfig();
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === fbConfig.verifyToken) {
      console.log('[Facebook Webhook] Verified successfully.');
      res.status(200).send(challenge);
      return;
    }

    res.status(403).send('Verification token mismatch');
  } catch (err: any) {
    res.status(500).send('Webhook error: ' + err.message);
  }
});

notificationRouter.post('/notifications/messenger/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;

    if (body.object === 'page') {
      const prisma = getPrisma();

      for (const entry of body.entry || []) {
        for (const webhookEvent of entry.messaging || []) {
          const senderPsid = webhookEvent.sender && webhookEvent.sender.id;
          if (!senderPsid) continue;

          // Check if there is a referral or optin ref containing userId
          let candidateUserId: string | null = null;

          if (webhookEvent.referral && webhookEvent.referral.ref) {
            candidateUserId = webhookEvent.referral.ref;
          } else if (webhookEvent.postback && webhookEvent.postback.referral && webhookEvent.postback.referral.ref) {
            candidateUserId = webhookEvent.postback.referral.ref;
          } else if (webhookEvent.optin && webhookEvent.optin.ref) {
            candidateUserId = webhookEvent.optin.ref;
          }

          if (candidateUserId) {
            // Find user and associate Messenger PSID
            const user = await prisma.user.findUnique({ where: { id: candidateUserId } });
            if (user) {
              await prisma.notificationPreference.upsert({
                where: { userId: user.id },
                update: {
                  messengerPsid: senderPsid,
                  messengerConnectedAt: new Date(),
                  channelMessenger: true
                },
                create: {
                  userId: user.id,
                  messengerPsid: senderPsid,
                  messengerConnectedAt: new Date(),
                  channelMessenger: true
                }
              });

              // Send confirmation greeting
              await pushNotificationService.sendMessengerMessage(
                senderPsid,
                `🎉 Chúc mừng ${user.name}! Bạn đã liên kết thành công tài khoản Life OS với Messenger. Bạn sẽ nhận thông báo công việc và lời nhắc trực tiếp tại đây!`,
                `${process.env.APP_URL || 'https://www.quanlicanhan.online'}/?view=dashboard`
              );

              console.log(`[Facebook Webhook] Successfully linked User ${user.id} to PSID ${senderPsid}`);
            }
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
      return;
    }

    res.sendStatus(404);
  } catch (err: any) {
    console.error('[Facebook Webhook POST] Error:', err);
    res.sendStatus(500);
  }
});

// ========================================================
// 3. CLIENT NOTIFICATION SETTINGS & PREFERENCES
// ========================================================

// GET User settings & active channel status
notificationRouter.get('/notifications/settings', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const prisma = getPrisma();

    // Get or create preference
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId,
          calendarToken: crypto.randomBytes(16).toString('hex')
        }
      });
    }

    const deviceCount = await prisma.pushDeviceSubscription.count({
      where: { userId }
    });

    const vapidPublicKey = await pushNotificationService.getVapidPublicKey();
    const fbConfig = await pushNotificationService.getFacebookConfig();
    const baseUrl = getBaseUrl(req);

    // Form URLs
    const calendarFeedUrl = `${baseUrl}/api/calendar/${pref.calendarToken}/feed.ics`;
    const cleanNoProto = calendarFeedUrl.replace(/^https?:\/\//, '');
    const calendarWebcalUrl = `webcal://${cleanNoProto}`;
    const calendarGoogleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarFeedUrl)}`;

    const messengerConnectUrl = fbConfig.pageId 
      ? `https://m.me/${fbConfig.pageId}?ref=${userId}` 
      : `https://m.me/?ref=${userId}`;

    res.json({
      success: true,
      vapidPublicKey,
      deviceCount,
      calendar: {
        token: pref.calendarToken,
        feedUrl: calendarFeedUrl,
        webcalUrl: calendarWebcalUrl,
        googleCalendarUrl: calendarGoogleUrl
      },
      messenger: {
        connected: !!pref.messengerPsid,
        connectedAt: pref.messengerConnectedAt,
        pageId: fbConfig.pageId,
        connectUrl: messengerConnectUrl
      },
      preferences: {
        leadTimeMinutes: pref.leadTimeMinutes,
        morningSummaryEnabled: pref.morningSummaryEnabled,
        morningSummaryTime: pref.morningSummaryTime,
        channelWebPush: pref.channelWebPush,
        channelMessenger: pref.channelMessenger,
        channelCalendar: pref.channelCalendar
      }
    });
  } catch (err: any) {
    console.error('GET /notifications/settings error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải cài đặt thông báo: ' + err.message });
  }
});

// PUT Update preferences
notificationRouter.put('/notifications/settings', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const prisma = getPrisma();
    const {
      leadTimeMinutes,
      morningSummaryEnabled,
      morningSummaryTime,
      channelWebPush,
      channelMessenger,
      channelCalendar
    } = req.body;

    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        leadTimeMinutes: leadTimeMinutes !== undefined ? Number(leadTimeMinutes) : undefined,
        morningSummaryEnabled: morningSummaryEnabled !== undefined ? Boolean(morningSummaryEnabled) : undefined,
        morningSummaryTime: morningSummaryTime !== undefined ? String(morningSummaryTime).trim() : undefined,
        channelWebPush: channelWebPush !== undefined ? Boolean(channelWebPush) : undefined,
        channelMessenger: channelMessenger !== undefined ? Boolean(channelMessenger) : undefined,
        channelCalendar: channelCalendar !== undefined ? Boolean(channelCalendar) : undefined
      },
      create: {
        userId,
        calendarToken: crypto.randomBytes(16).toString('hex'),
        leadTimeMinutes: leadTimeMinutes !== undefined ? Number(leadTimeMinutes) : 15,
        morningSummaryEnabled: morningSummaryEnabled !== undefined ? Boolean(morningSummaryEnabled) : true,
        morningSummaryTime: morningSummaryTime || '07:30',
        channelWebPush: channelWebPush !== undefined ? Boolean(channelWebPush) : true,
        channelMessenger: channelMessenger !== undefined ? Boolean(channelMessenger) : true,
        channelCalendar: channelCalendar !== undefined ? Boolean(channelCalendar) : true
      }
    });

    res.json({
      success: true,
      message: 'Đã lưu cài đặt thông báo thành công!',
      preferences: updated
    });
  } catch (err: any) {
    console.error('PUT /notifications/settings error:', err);
    res.status(500).json({ success: false, message: 'Lỗi lưu cài đặt: ' + err.message });
  }
});

// ========================================================
// 4. CLIENT WEB PUSH SUBSCRIPTION & TESTING
// ========================================================

// POST Subscribe device for Web Push
notificationRouter.post('/notifications/push/subscribe', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const prisma = getPrisma();
    const { endpoint, keys, userAgent, deviceType } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ success: false, message: 'Thiếu thông tin PushSubscription (endpoint, keys.p256dh, keys.auth)' });
      return;
    }

    const sub = await prisma.pushDeviceSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || req.headers['user-agent'] || null,
        deviceType: deviceType || null,
        updatedAt: new Date()
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || req.headers['user-agent'] || null,
        deviceType: deviceType || null
      }
    });

    // Make sure user's preference has channelWebPush enabled
    await prisma.notificationPreference.upsert({
      where: { userId },
      update: { channelWebPush: true },
      create: { userId, channelWebPush: true }
    });

    res.json({
      success: true,
      message: 'Đã bật thông báo đẩy thành công trên thiết bị này!',
      subscriptionId: sub.id
    });
  } catch (err: any) {
    console.error('POST /notifications/push/subscribe error:', err);
    res.status(500).json({ success: false, message: 'Lỗi đăng ký thông báo đẩy: ' + err.message });
  }
});

// POST Unsubscribe device
notificationRouter.post('/notifications/push/unsubscribe', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      const prisma = getPrisma();
      await prisma.pushDeviceSubscription.deleteMany({
        where: { endpoint }
      });
    }
    res.json({ success: true, message: 'Đã hủy thông báo đẩy trên thiết bị này.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// POST Test push notification directly to current user's devices
notificationRouter.post('/notifications/push/test', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const result = await pushNotificationService.sendPushToUser(userId, {
      title: '⚡ [Life OS] Thông báo Thử Nghiệm',
      body: 'Chúc mừng bạn! Kênh Web Push PWA qua cổng HTTPS 443 đã hoạt động hoàn hảo trên thiết bị của bạn.',
      url: '/?view=dashboard'
    });

    if (result.total === 0) {
      res.json({
        success: false,
        message: 'Chưa có thiết bị nào đăng ký nhận thông báo. Hãy bấm "Bật thông báo đẩy" trước khi thử nghiệm.'
      });
      return;
    }

    res.json({
      success: result.sent > 0,
      message: `Đã gửi thông báo thử nghiệm tới ${result.sent}/${result.total} thiết bị của bạn!`,
      result
    });
  } catch (err: any) {
    console.error('POST /notifications/push/test error:', err);
    res.status(500).json({ success: false, message: 'Lỗi gửi thông báo thử nghiệm: ' + err.message });
  }
});

// ========================================================
// 5. CALENDAR & MESSENGER MANAGEMENT
// ========================================================

// POST Revoke calendar token & generate fresh one
notificationRouter.post('/notifications/calendar/revoke', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const prisma = getPrisma();
    const newToken = crypto.randomBytes(16).toString('hex');

    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      update: { calendarToken: newToken },
      create: { userId, calendarToken: newToken }
    });

    const baseUrl = getBaseUrl(req);
    const calendarFeedUrl = `${baseUrl}/api/calendar/${updated.calendarToken}/feed.ics`;
    const cleanNoProto = calendarFeedUrl.replace(/^https?:\/\//, '');

    res.json({
      success: true,
      message: 'Đã đổi link đồng bộ Lịch mới thành công. Link cũ đã bị vô hiệu hóa!',
      calendar: {
        token: updated.calendarToken,
        feedUrl: calendarFeedUrl,
        webcalUrl: `webcal://${cleanNoProto}`,
        googleCalendarUrl: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarFeedUrl)}`
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi đổi mã link lịch: ' + err.message });
  }
});

// POST Disconnect Messenger
notificationRouter.post('/notifications/messenger/disconnect', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const prisma = getPrisma();

    await prisma.notificationPreference.updateMany({
      where: { userId },
      data: {
        messengerPsid: null,
        messengerConnectedAt: null,
        channelMessenger: false
      }
    });

    res.json({
      success: true,
      message: 'Đã hủy kết nối tài khoản Messenger thành công.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi hủy kết nối: ' + err.message });
  }
});

// ========================================================
// 6. ADMIN DASHBOARD APIS (Part 2 Requirements)
// ========================================================

// TAB 1: Send Broadcast or Direct Push (supports "Bắn thử cho Admin")
notificationRouter.post('/admin/notifications/broadcast', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetUserId, channels = ['webpush'], title, body, url } = req.body;

    if (!title || !body) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo.' });
      return;
    }

    const prisma = getPrisma();
    let targetUsers: { id: string; name: string }[] = [];

    if (targetType === 'USER' && targetUserId) {
      const u = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true }
      });
      if (u) targetUsers = [u];
    } else {
      targetUsers = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
        take: 500
      });
    }

    if (targetUsers.length === 0) {
      res.json({ success: false, message: 'Không tìm thấy người nhận phù hợp.' });
      return;
    }

    let webPushSuccess = 0;
    let webPushFailed = 0;
    let messengerSuccess = 0;
    let messengerFailed = 0;

    const sendWeb = channels.includes('webpush');
    const sendMsg = channels.includes('messenger');

    for (const u of targetUsers) {
      // 1. Web Push
      if (sendWeb) {
        const pRes = await pushNotificationService.sendPushToUser(u.id, {
          title,
          body,
          url: url || '/'
        });
        webPushSuccess += pRes.sent;
        webPushFailed += pRes.failed;
      }

      // 2. Messenger
      if (sendMsg) {
        const pref = await prisma.notificationPreference.findUnique({
          where: { userId: u.id },
          select: { messengerPsid: true }
        });

        if (pref && pref.messengerPsid) {
          const mRes = await pushNotificationService.sendMessengerMessage(
            pref.messengerPsid,
            `📢 [THÔNG BÁO TỪ QUẢN TRỊ VIÊN]\n${title}\n\n${body}`,
            url
          );
          if (mRes.success) messengerSuccess++;
          else messengerFailed++;
        }
      }
    }

    // Save Log to DB
    await prisma.notificationChannelLog.create({
      data: {
        userId: targetType === 'USER' ? targetUserId : null,
        channel: 'BROADCAST',
        title,
        body,
        url,
        status: (webPushSuccess > 0 || messengerSuccess > 0) ? 'SUCCESS' : 'FAILED',
        targetCount: targetUsers.length,
        successCount: webPushSuccess + messengerSuccess,
        failureCount: webPushFailed + messengerFailed,
        errorMessage: (webPushSuccess === 0 && messengerSuccess === 0) ? 'Không có thiết bị hoặc Messenger nào nhận được tin nhắn' : undefined
      }
    });

    res.json({
      success: true,
      message: `Đã phát thông báo thành công tới ${targetUsers.length} người dùng!`,
      stats: {
        targetCount: targetUsers.length,
        webPushSuccess,
        webPushFailed,
        messengerSuccess,
        messengerFailed
      }
    });
  } catch (err: any) {
    console.error('POST /admin/notifications/broadcast error:', err);
    res.status(500).json({ success: false, message: 'Lỗi phát thông báo: ' + err.message });
  }
});

// TAB 2: Get Users Notification Status (Web Push devices, Messenger status, Calendar link status)
notificationRouter.get('/admin/notifications/users-status', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const prisma = getPrisma();
    const search = String(req.query.search || '').trim().toLowerCase();

    const users = await prisma.user.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        avatar: true,
        pushSubscriptions: {
          select: { id: true, deviceType: true, userAgent: true, createdAt: true }
        },
        notificationPreference: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const items = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      plan: u.plan,
      avatar: u.avatar,
      webPushDeviceCount: u.pushSubscriptions.length,
      devices: u.pushSubscriptions,
      messengerConnected: !!u.notificationPreference?.messengerPsid,
      messengerPsid: u.notificationPreference?.messengerPsid,
      calendarLinkActive: !!u.notificationPreference?.calendarToken,
      leadTimeMinutes: u.notificationPreference?.leadTimeMinutes || 15,
      morningSummaryTime: u.notificationPreference?.morningSummaryTime || '07:30'
    }));

    res.json({ success: true, users: items });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// TAB 2: Ping Test specific user
notificationRouter.post('/admin/notifications/ping/:userId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        pushSubscriptions: true,
        notificationPreference: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      return;
    }

    let webSent = 0;
    let msgSent = 0;

    // Push test
    if (user.pushSubscriptions.length > 0) {
      const pRes = await pushNotificationService.sendPushToUser(userId, {
        title: '🔔 [Admin Ping Test]',
        body: `Chào ${user.name}, đây là tin nhắn Ping kiểm tra từ Quản trị viên hệ thống Life OS!`,
        url: '/?view=dashboard'
      });
      webSent = pRes.sent;
    }

    // Messenger test
    if (user.notificationPreference?.messengerPsid) {
      const mRes = await pushNotificationService.sendMessengerMessage(
        user.notificationPreference.messengerPsid,
        `🔔 [ADMIN PING TEST]\nChào ${user.name}, đây là tin nhắn Ping kiểm tra kết nối Messenger từ Quản trị viên hệ thống!`
      );
      if (mRes.success) msgSent++;
    }

    if (webSent === 0 && msgSent === 0) {
      res.json({
        success: false,
        message: 'Người dùng này chưa kích hoạt Web Push hoặc chưa liên kết Messenger.'
      });
      return;
    }

    res.json({
      success: true,
      message: `Đã gửi Ping Test thành công! (Web Push: ${webSent}, Messenger: ${msgSent})`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi Ping Test: ' + err.message });
  }
});

// TAB 2: Delete faulty device subscription
notificationRouter.delete('/admin/notifications/devices/:deviceId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const prisma = getPrisma();
    await prisma.pushDeviceSubscription.delete({
      where: { id: deviceId }
    });
    res.json({ success: true, message: 'Đã xóa thiết bị thành công.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi xóa thiết bị: ' + err.message });
  }
});

// TAB 3: Health Check over HTTPS port 443
notificationRouter.get('/admin/notifications/health-check', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await pushNotificationService.runHealthCheck();
    res.json({
      success: true,
      report
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi Health Check: ' + err.message });
  }
});

// TAB 3: Run Cronjob Now (Manual trigger)
notificationRouter.post('/admin/notifications/run-cron', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await notificationCronService.runNotificationSweep();
    res.json({
      success: true,
      message: `Đã chạy quét thành công trong ${report.durationMs}ms!`,
      report
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi kích hoạt cron: ' + err.message });
  }
});

// TAB 3: Notification Logs
notificationRouter.get('/admin/notifications/logs', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const prisma = getPrisma();
    const logs = await prisma.notificationChannelLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi tải nhật ký: ' + err.message });
  }
});

// TAB 3: Retry failed notification
notificationRouter.post('/admin/notifications/retry/:logId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { logId } = req.params;
    const prisma = getPrisma();
    const log = await prisma.notificationChannelLog.findUnique({
      where: { id: logId }
    });

    if (!log) {
      res.status(404).json({ success: false, message: 'Không tìm thấy nhật ký thông báo' });
      return;
    }

    if (!log.userId) {
      res.status(400).json({ success: false, message: 'Thông báo không có người nhận cụ thể để gửi lại' });
      return;
    }

    // Try re-sending Web Push
    const pRes = await pushNotificationService.sendPushToUser(log.userId, {
      title: log.title,
      body: log.body,
      url: log.url || '/'
    });

    // Update log
    const updated = await prisma.notificationChannelLog.update({
      where: { id: logId },
      data: {
        status: pRes.sent > 0 ? 'SUCCESS' : 'FAILED',
        successCount: pRes.sent,
        failureCount: pRes.failed,
        retriedAt: new Date()
      }
    });

    res.json({
      success: pRes.sent > 0,
      message: pRes.sent > 0 ? 'Đã gửi lại thành công!' : 'Gửi lại thất bại. Thiết bị có thể đã offline hoặc hủy đăng ký.',
      log: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi gửi lại: ' + err.message });
  }
});

// Admin Facebook Config Settings GET / PUT
notificationRouter.get('/admin/notifications/fb-config', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cfg = await pushNotificationService.getFacebookConfig();
    res.json({
      success: true,
      config: {
        pageId: cfg.pageId,
        pageAccessToken: cfg.pageAccessToken ? '••••••••••••••••' : '',
        verifyToken: cfg.verifyToken
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

notificationRouter.put('/admin/notifications/fb-config', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payload = req.body || {};
    const updated = await pushNotificationService.saveFacebookConfig(payload);
    res.json({
      success: true,
      message: 'Đã lưu cấu hình Facebook Messenger thành công!',
      config: {
        pageId: updated.pageId,
        pageAccessToken: updated.pageAccessToken ? '••••••••••••••••' : '',
        verifyToken: updated.verifyToken
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi lưu cấu hình: ' + err.message });
  }
});
