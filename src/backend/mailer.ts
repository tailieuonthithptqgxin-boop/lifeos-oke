import nodemailer from 'nodemailer';
import { gmailService, resolveHostToIPv4 } from './services/gmailNotification.service.js';

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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        servername: originalHost,
        rejectUnauthorized: false
      }
    } as any);
  }

  return cachedTransporter;
}

export const sendEmail = async (to: string, subject: string, html: string): Promise<{ sent: boolean; message: string }> => {
  try {
    // 1. Primary: Use Unified Gmail / SMTP Service configured in Admin DB
    const res = await gmailService.sendRawEmail({ to, subject, html });
    if (res.sent) {
      return res;
    }

    // 2. Secondary fallback: Check if static process.env SMTP config exists
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

    console.warn(`[SMTP Warning] SMTP chưa được cấu hình. Chi tiết email cho ${to}: Subject "${subject}"`);
    return { sent: false, message: 'Hệ thống chưa cấu hình Gmail/SMTP trong trang Quản trị hoặc ENV. Email đã được ghi nhận vào nhật ký hệ thống.' };
  } catch (error: any) {
    console.error('[sendEmail Error]:', error);
    return { sent: false, message: `Lỗi gửi email: ${error.message}` };
  }
};

