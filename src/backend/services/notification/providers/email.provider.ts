import { DeliveryResult, NotificationProvider } from '../notification.types.js';
import { gmailOAuthService } from '../gmailOAuth.service.js';
import { buildNotificationEmailHtml } from '../emailTemplate.js';
import { sendEmail } from '../../../mailer.js';
import { emailQueueService } from '../../emailQueue.service.js';

export class EmailNotificationProvider implements NotificationProvider {
  readonly channel = 'email' as const;

  async send(
    delivery: {
      id: string;
      userId: string;
      recipient: string;
      subject?: string | null;
      title: string;
      content: string;
      priority: string;
      actionUrl?: string | null;
      actionLabel?: string | null;
      metadata?: string | null;
    },
    userContext: {
      email: string;
      name?: string | null;
    }
  ): Promise<DeliveryResult> {
    const recipientEmail = delivery.recipient || userContext.email;
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return {
        success: false,
        channel: 'email',
        deliveryId: delivery.id,
        error: 'Địa chỉ email người nhận không hợp lệ.'
      };
    }

    let metaObj: Record<string, any> = {};
    try {
      if (delivery.metadata) {
        metaObj = JSON.parse(delivery.metadata);
      }
    } catch (e) {}

    const appUrl = (process.env.APP_URL || 'https://www.quanlicanhan.online').replace(/\/$/, '');

    // Format metadata rows for clean display in email
    const metadataItems: { label: string; value: string; isBold?: boolean }[] = [];
    if (metaObj.eventDate) {
      metadataItems.push({ label: 'Ngày diễn ra', value: metaObj.eventDate, isBold: true });
    }
    if (metaObj.eventTime) {
      metadataItems.push({ label: 'Thời gian', value: metaObj.eventTime, isBold: true });
    }
    if (metaObj.dueDate) {
      metadataItems.push({ label: 'Hạn chót', value: metaObj.dueDate, isBold: true });
    }
    if (metaObj.taskStatus) {
      metadataItems.push({ label: 'Trạng thái', value: metaObj.taskStatus });
    }
    if (metaObj.location) {
      metadataItems.push({ label: 'Địa điểm', value: metaObj.location });
    }

    const emailHtml = buildNotificationEmailHtml({
      recipientName: userContext.name || 'Bạn',
      headline: delivery.title,
      bodyHtml: delivery.content,
      categoryLabel: metaObj.categoryLabel || 'LifeOS Reminder',
      categoryColor: metaObj.categoryColor || '#10B981',
      priority: delivery.priority,
      actionUrl: delivery.actionUrl || `${appUrl}/?view=dashboard`,
      actionLabel: delivery.actionLabel || 'Xem trên LifeOS',
      metadataItems,
      appBaseUrl: appUrl
    });

    const emailSubject = delivery.subject || `🔔 [LifeOS] ${delivery.title}`;

    // 1. Primary: If user has connected personal Gmail via OAuth 2.0
    const oauthTransporter = await gmailOAuthService.createOAuthTransporter(delivery.userId);
    if (oauthTransporter) {
      try {
        await oauthTransporter.transporter.sendMail({
          from: `"LifeOS Assistant" <${oauthTransporter.connectedEmail}>`,
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml
        });

        return {
          success: true,
          channel: 'email',
          deliveryId: delivery.id,
          details: {
            provider: 'gmail_oauth',
            sender: oauthTransporter.connectedEmail,
            recipient: recipientEmail
          }
        };
      } catch (oauthErr: any) {
        console.warn(`[EmailProvider] Personal Gmail OAuth delivery failed for user ${delivery.userId}:`, oauthErr.message);
        // Do not fail immediately, attempt fallback to system mailer below
      }
    }

    // 2. Secondary: Route via existing Email Queue (Outbox Pattern via emailQueueService)
    try {
      const queueId = await emailQueueService.enqueue({
        recipient: recipientEmail,
        subject: emailSubject,
        htmlBody: emailHtml,
        eventType: 'EVENT_REMINDER_NOTIFICATION',
        metadata: {
          deliveryId: delivery.id,
          userId: delivery.userId,
          priority: delivery.priority
        }
      });

      return {
        success: true,
        channel: 'email',
        deliveryId: delivery.id,
        details: {
          provider: 'email_queue',
          queueId,
          recipient: recipientEmail
        }
      };
    } catch (queueErr: any) {
      console.warn('[EmailProvider] Queue enqueue failed, fallback to direct sendEmail:', queueErr);
      try {
        const systemRes = await sendEmail(recipientEmail, emailSubject, emailHtml);
        if (systemRes.sent) {
          return {
            success: true,
            channel: 'email',
            deliveryId: delivery.id,
            details: {
              provider: 'system_smtp',
              recipient: recipientEmail,
              message: systemRes.message
            }
          };
        } else {
          return {
            success: false,
            channel: 'email',
            deliveryId: delivery.id,
            error: systemRes.message || 'Không thể gửi qua kênh email hệ thống.'
          };
        }
      } catch (smtpErr: any) {
        console.error('[EmailProvider] System email send error:', smtpErr);
        return {
          success: false,
          channel: 'email',
          deliveryId: delivery.id,
          error: smtpErr.message || 'Lỗi gửi email không xác định.'
        };
      }
    }
  }
}

export const emailProvider = new EmailNotificationProvider();
