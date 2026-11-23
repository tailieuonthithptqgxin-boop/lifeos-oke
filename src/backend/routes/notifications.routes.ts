import { Router, Request, Response } from 'express';
import { getPrisma } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.middleware.js';
import { emailQueueService } from '../services/emailQueue.service.js';
import { gmailService, GmailSmtpConfig } from '../services/gmailNotification.service.js';
import { buildBeautifulGmailHTML, BeautifulEmailData, SAMPLE_EMAIL_PREVIEWS, EmailCategoryType } from '../../lib/beautifulEmailTemplate.js';
import { getUnifiedUserStats } from './auth.js';

export const notificationRouter = Router();

/**
 * 1. Dispatch Notification (In-App DB record + Email Queue)
 */
notificationRouter.post('/dispatch', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { recipient, subject, htmlBody, category = 'GENERAL', priority = 'NORMAL', metadata } = req.body;

    if (!recipient || !subject) {
      return res.status(400).json({ success: false, message: 'Thiếu email người nhận hoặc tiêu đề thông báo' });
    }

    const prisma = getPrisma();

    // 1. Check if recipient matches a registered user to insert In-App notification
    const matchedUser = await prisma.user.findFirst({
      where: { email: recipient.toLowerCase().trim() },
      select: { id: true, name: true }
    });

    let notifId: string | null = null;
    if (matchedUser) {
      const createdNotif = await prisma.notification.create({
        data: {
          userId: matchedUser.id,
          title: subject,
          message: metadata?.message || subject,
          type: priority === 'CRITICAL' ? 'error' : priority === 'HIGH' ? 'warning' : 'info',
          priority: priority || 'NORMAL',
          category: category || 'GENERAL',
          actionUrl: metadata?.actionUrl || '/?tab=dashboard',
          actionLabel: metadata?.actionLabel || 'Xem trên LifeOS',
          read: false
        }
      });
      notifId = createdNotif.id;
    }

    // 2. Enqueue Email into PostgreSQL Outbox Queue
    let queueId: string | null = null;
    if (htmlBody) {
      queueId = await emailQueueService.enqueue({
        recipient,
        subject,
        htmlBody,
        eventType: category,
        priority: priority === 'CRITICAL' ? 'CRITICAL' : priority === 'HIGH' ? 'HIGH' : 'NORMAL',
        metadata: {
          notificationId: notifId,
          ...metadata
        }
      });
    }

    res.json({
      success: true,
      message: 'Đã tiếp nhận và đưa thông báo vào hàng đợi gửi tự động thành công!',
      notificationId: notifId,
      queueId
    });
  } catch (err: any) {
    console.error('[NotificationRouter] Error dispatching notification:', err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi điều phối thông báo: ' + err.message });
  }
});

/**
 * 2. Get Email Provider Configuration
 */
notificationRouter.get('/email-config', async (req: Request, res: Response) => {
  try {
    const config = await gmailService.getConfig();
    // Return sanitized config (mask app password)
    res.json({
      success: true,
      config: {
        enabled: config.enabled,
        serviceType: config.serviceType || 'webhook',
        webhookUrl: config.webhookUrl || '',
        emailjsServiceId: config.emailjsServiceId || '',
        emailjsTemplateId: config.emailjsTemplateId || '',
        emailjsPublicKey: config.emailjsPublicKey || '',
        user: config.user || '',
        fromName: config.fromName || 'LifeOS Notification Assistant',
        fromEmail: config.fromEmail || '',
        hasAppPassword: Boolean(config.appPassword && config.appPassword.length > 0)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 3. Save Email Provider Configuration (Admin or authenticated user)
 */
notificationRouter.post('/email-config', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role || '';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thay đổi cấu hình gửi email hệ thống' });
    }

    const {
      enabled,
      serviceType,
      webhookUrl,
      emailjsServiceId,
      emailjsTemplateId,
      emailjsPublicKey,
      emailjsPrivateKey,
      user,
      appPassword,
      fromName,
      fromEmail
    } = req.body;

    const currentConfig = await gmailService.getConfig();
    const updatedConfig: Partial<GmailSmtpConfig> = {
      ...currentConfig,
      enabled: Boolean(enabled),
      serviceType: serviceType || currentConfig.serviceType || 'webhook',
      webhookUrl: webhookUrl !== undefined ? webhookUrl.trim() : currentConfig.webhookUrl,
      emailjsServiceId: emailjsServiceId !== undefined ? emailjsServiceId.trim() : currentConfig.emailjsServiceId,
      emailjsTemplateId: emailjsTemplateId !== undefined ? emailjsTemplateId.trim() : currentConfig.emailjsTemplateId,
      emailjsPublicKey: emailjsPublicKey !== undefined ? emailjsPublicKey.trim() : currentConfig.emailjsPublicKey,
      user: user !== undefined ? user.trim() : currentConfig.user,
      fromName: fromName !== undefined ? fromName.trim() : currentConfig.fromName,
      fromEmail: fromEmail !== undefined ? fromEmail.trim() : currentConfig.fromEmail
    };

    if (emailjsPrivateKey) {
      updatedConfig.emailjsPrivateKey = emailjsPrivateKey.trim();
    }
    if (appPassword && appPassword.trim().length > 0) {
      updatedConfig.appPassword = appPassword.trim();
    }

    await gmailService.saveConfig(updatedConfig, (req as any).user?.userId);

    res.json({
      success: true,
      message: 'Cập nhật cấu hình gửi email tự động thành công!',
      config: {
        enabled: updatedConfig.enabled,
        serviceType: updatedConfig.serviceType,
        webhookUrl: updatedConfig.webhookUrl,
        user: updatedConfig.user,
        fromName: updatedConfig.fromName
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 4. Preview Rendered HTML Email (For 1-Tap inspection modal)
 */
notificationRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const { category = 'SCHEDULE_2H', payload } = req.body;

    let emailData: BeautifulEmailData;
    if (payload && payload.headline && payload.title) {
      emailData = payload;
    } else {
      const generator = SAMPLE_EMAIL_PREVIEWS[category as EmailCategoryType] || SAMPLE_EMAIL_PREVIEWS.GENERAL;
      emailData = generator();
    }

    const html = buildBeautifulGmailHTML(emailData);
    res.json({
      success: true,
      category,
      html
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 5. Send Live Test Email (For instant verification)
 */
notificationRouter.post('/test-email', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { targetEmail, category = 'SCHEDULE_2H' } = req.body;
    const recipient = targetEmail || authUser?.email;

    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email người nhận để gửi thử nghiệm' });
    }

    const stats = await getUnifiedUserStats(authUser.userId).catch(() => null);
    const generator = SAMPLE_EMAIL_PREVIEWS[category as EmailCategoryType] || SAMPLE_EMAIL_PREVIEWS.GENERAL;
    const emailData = generator(stats ? {
      streakDays: stats.streakDays,
      todayStudyMinutes: stats.todayStudyMinutes,
      badgeLevel: stats.badgeLevel
    } : undefined);

    emailData.recipientEmail = recipient;
    emailData.recipientName = authUser?.name || 'Bạn';

    const htmlBody = buildBeautifulGmailHTML(emailData);

    const queueId = await emailQueueService.enqueue({
      recipient,
      subject: `[THỬ NGHIỆM] ${emailData.headline}`,
      htmlBody,
      eventType: `TEST_${category}`,
      priority: 'HIGH',
      isTestData: true,
      metadata: {
        isTest: true,
        triggeredBy: authUser?.email
      }
    });

    res.json({
      success: true,
      message: `Đã đưa thư thử nghiệm mốc "${category}" vào hàng đợi gửi đến ${recipient}!`,
      queueId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi gửi thử email: ' + err.message });
  }
});
