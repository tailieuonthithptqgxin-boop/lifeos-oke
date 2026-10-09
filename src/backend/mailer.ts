import nodemailer from 'nodemailer';

let cachedTransporter: any = null;

function getTransporter(): any {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtpConfig) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  return cachedTransporter;
}

export const sendEmail = async (to: string, subject: string, html: string): Promise<{ sent: boolean; message: string }> => {
  try {
    const transporter = getTransporter();

    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"LifeOS System" <no-reply@lifeos.com>',
        to,
        subject,
        html,
      });
      return { sent: true, message: 'Email đã được gửi thành công qua SMTP provider.' };
    } else {
      console.warn(`[SMTP Warning] SMTP chưa được cấu hình. Chi tiết email cho ${to}: Subject "${subject}"`);
      return { sent: false, message: 'Hệ thống chưa cấu hình SMTP production. Email đã được ghi nhận vào nhật ký hệ thống.' };
    }
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { sent: false, message: `Lỗi gửi email: ${error.message}` };
  }
};
