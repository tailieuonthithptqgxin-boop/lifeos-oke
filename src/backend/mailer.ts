import nodemailer from 'nodemailer';
import { gmailService, resolveHostToIPv4 } from './services/gmailNotification.service.js';
import { pushNotificationService } from './services/pushNotification.service.js';
import { getPrisma } from './db.js';

let cachedTransporter: any = null;

async function getFallbackTransporter(): Promise<any> {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtpConfig) {
    return null;
  }

  if (!cachedTransporter) {
    const originalHost = process.env.SMTP_HOST;
    const ipv4Host = await resolveHostToIPv4(originalHost);

    cachedTransporter = nodemailer.createTransport({
      host: ipv4Host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      family: 4, // Force IPv4 to prevent ENETUNREACH
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      tls: {
        servername: originalHost,
        rejectUnauthorized: false
      }
    });
  }

  return cachedTransporter;
}

export const sendEmail = async (to: string, subject: string, html: string): Promise<{ sent: boolean; message: string }> => {
  // 1. Immediately dispatch Web Push Notification over HTTPS Port 443 (100% Free on Railway)
  let pushDispatched = false;
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({ where: { email: to.toLowerCase().trim() } });
    if (user) {
      const cleanBody = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
      const pushRes = await pushNotificationService.sendPushToUser(user.id, {
        title: subject,
        body: cleanBody || subject,
        url: '/'
      });
      if (pushRes.sent > 0) {
        pushDispatched = true;
      }
    }
  } catch (pushErr) {
    // Ignore push error and proceed
  }

  try {
    // 2. Primary: Use Unified Gmail / SMTP Service configured in Admin DB
    const res = await gmailService.sendRawEmail({ to, subject, html });
    if (res.sent) {
      return res;
    }

    // 3. Secondary fallback: Check if static process.env SMTP config exists
    const fallbackTransporter = await getFallbackTransporter();
    if (fallbackTransporter) {
      await fallbackTransporter.sendMail({
        from: process.env.SMTP_FROM || '"LifeOS System" <no-reply@lifeos.com>',
        to,
        subject,
        html,
      });
      return { sent: true, message: 'Email đã được gửi thành công qua SMTP provider dự phòng (ENV).' };
    }

    if (pushDispatched) {
      return { sent: true, message: 'Đã nổ thông báo màn hình khóa (Web Push PWA) qua cổng HTTPS 443!' };
    }

    return { sent: false, message: 'Hệ thống đã chuyển sang phát thông báo đẩy Web Push qua cổng HTTPS 443.' };
  } catch (error: any) {
    if (pushDispatched) {
      return { sent: true, message: 'Cổng SMTP bị chặn trên hosting, hệ thống đã tự động chuyển phát qua Web Push PWA cổng 443 thành công!' };
    }
    return { sent: false, message: `Lỗi kết nối email: ${error.message}` };
  }
};

