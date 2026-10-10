import nodemailer from 'nodemailer';
import { getPrisma } from './db.js';

export interface GmailSmtpConfig {
  enabled: boolean;
  serviceType: 'gmail' | 'smtp';
  user: string;
  appPassword?: string;
  fromName: string;
  fromEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  // Notification category toggles
  notifyTaskOverdue: boolean;
  notifyTaskUpcoming: boolean;
  notifyCalendarUpcoming: boolean;
  notifyBudgetThreshold: boolean;
  notifySubscriptionExpiry: boolean;
  notifyPaymentStatus: boolean;
  notifySecurityAlerts: boolean;
  // Quiet hours & throttling
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  maxRemindersPerDay: number;
}

export const DEFAULT_GMAIL_CONFIG: GmailSmtpConfig = {
  enabled: false,
  serviceType: 'gmail',
  user: '',
  appPassword: '',
  fromName: 'Life OS Notification Assistant',
  fromEmail: '',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpSecure: true,
  notifyTaskOverdue: true,
  notifyTaskUpcoming: true,
  notifyCalendarUpcoming: true,
  notifyBudgetThreshold: true,
  notifySubscriptionExpiry: true,
  notifyPaymentStatus: true,
  notifySecurityAlerts: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  maxRemindersPerDay: 5
};

export interface EmailLogEntry {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  category: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED' | 'SIMULATED';
  errorMessage?: string;
  timestamp: string;
}

class GmailNotificationService {
  private cachedConfig: GmailSmtpConfig | null = null;
  private cachedTransporter: any = null;
  private inMemoryLogs: EmailLogEntry[] = [];
  private readonly MAX_LOGS = 100;

  // Retrieve current Gmail config from DB or env fallback
  async getConfig(): Promise<GmailSmtpConfig> {
    try {
      const prisma = getPrisma();
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'gmail_notification_config' }
      });

      if (setting && setting.value) {
        const parsed = JSON.parse(setting.value);
        this.cachedConfig = { ...DEFAULT_GMAIL_CONFIG, ...parsed };
        return this.cachedConfig;
      }
    } catch (err) {
      console.warn('[GmailNotificationService] Error loading config from database:', err);
    }

    // Fallback to process.env
    const envUser = process.env.SMTP_USER || process.env.GMAIL_USER || '';
    const envPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
    
    this.cachedConfig = {
      ...DEFAULT_GMAIL_CONFIG,
      enabled: !!(envUser && envPass),
      user: envUser,
      appPassword: envPass,
      fromEmail: envUser || 'notifications@lifeos.local',
      fromName: 'Life OS Assistant'
    };
    return this.cachedConfig;
  }

  // Save new configuration securely to Database
  async saveConfig(newConfig: Partial<GmailSmtpConfig>, adminUserId?: string): Promise<GmailSmtpConfig> {
    const current = await this.getConfig();
    
    // If appPassword is not provided or masked, keep the existing password
    let passwordToSave = current.appPassword || '';
    if (newConfig.appPassword && newConfig.appPassword !== '••••••••••••••••') {
      passwordToSave = newConfig.appPassword.trim();
    }

    const merged: GmailSmtpConfig = {
      ...current,
      ...newConfig,
      appPassword: passwordToSave
    };

    try {
      const prisma = getPrisma();
      await prisma.systemSetting.upsert({
        where: { key: 'gmail_notification_config' },
        update: { value: JSON.stringify(merged) },
        create: { key: 'gmail_notification_config', value: JSON.stringify(merged) }
      });
    } catch (err: any) {
      console.error('[GmailNotificationService] Failed to save config to database:', err);
      throw new Error(`Không thể lưu cấu hình Gmail: ${err.message}`);
    }

    this.cachedConfig = merged;
    this.cachedTransporter = null; // Invalidate cached transporter to re-init
    return merged;
  }

  // Create transporter based on active configuration
  private async getTransporter(): Promise<{ transporter: any; config: GmailSmtpConfig } | null> {
    const config = await this.getConfig();

    if (!config.enabled || !config.user || !config.appPassword) {
      return null;
    }

    if (this.cachedTransporter) {
      return { transporter: this.cachedTransporter, config };
    }

    try {
      if (config.serviceType === 'gmail') {
        this.cachedTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.user,
            pass: config.appPassword
          }
        });
      } else {
        this.cachedTransporter = nodemailer.createTransport({
          host: config.smtpHost || 'smtp.gmail.com',
          port: config.smtpPort || 465,
          secure: config.smtpSecure !== false,
          auth: {
            user: config.user,
            pass: config.appPassword
          }
        });
      }
      return { transporter: this.cachedTransporter, config };
    } catch (err) {
      console.error('[GmailNotificationService] Transporter initialization failed:', err);
      return null;
    }
  }

  // Verify connection to Gmail SMTP server
  async testConnection(testToEmail?: string): Promise<{ success: boolean; message: string }> {
    const setup = await this.getTransporter();
    if (!setup) {
      return {
        success: false,
        message: 'Gmail chưa được bật hoặc thiếu Tài khoản Gmail / Mật khẩu ứng dụng (App Password).'
      };
    }

    try {
      await setup.transporter.verify();

      if (testToEmail) {
        const testHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ Life OS Notification System</h1>
              <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Kiểm tra kết nối Gmail thành công</p>
            </div>
            <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
              <p style="font-size: 15px; margin-top: 0;">Xin chào Quản trị viên,</p>
              <p style="font-size: 14px; color: #475569;">Email này được gửi tự động để kiểm tra thiết lập Gmail SMTP trên trang Quản trị Life OS. Mọi cấu hình kết nối đã hoạt động hoàn toàn chính xác.</p>
              <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #0f766e;">
                <strong>Trạng thái:</strong> Sẵn sàng tự động gửi nhắc việc, cảnh báo ngân sách, lịch biểu và thanh toán.
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Thời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
          </div>
        `;

        await setup.transporter.sendMail({
          from: `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`,
          to: testToEmail,
          subject: '✅ [Life OS] Kiểm tra kết nối Gmail thành công',
          html: testHtml
        });

        this.addLog({
          id: 'test_' + Date.now(),
          recipientEmail: testToEmail,
          subject: '✅ [Life OS] Kiểm tra kết nối Gmail thành công',
          category: 'TEST_CONNECTION',
          status: 'SENT',
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          message: `Kết nối Gmail SMTP thành công! Email thử nghiệm đã gửi tới ${testToEmail}.`
        };
      }

      return {
        success: true,
        message: 'Xác thực tài khoản Gmail SMTP thành công!'
      };
    } catch (err: any) {
      this.addLog({
        id: 'test_err_' + Date.now(),
        recipientEmail: testToEmail || 'test@verify.local',
        subject: 'Kiểm tra kết nối Gmail',
        category: 'TEST_CONNECTION',
        status: 'FAILED',
        errorMessage: err.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        message: `Lỗi kết nối Gmail SMTP: ${err.message}. Hãy chắc chắn bạn dùng 'Mật khẩu ứng dụng' (App Password 16 ký tự) của Google thay vì mật khẩu đăng nhập thông thường.`
      };
    }
  }

  // Check if current hour is within quiet hours
  private isQuietHour(config: GmailSmtpConfig): boolean {
    if (!config.quietHoursEnabled) return false;
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentVal = currentH * 60 + currentM;

    const [startH, startM] = (config.quietHoursStart || '22:00').split(':').map(Number);
    const [endH, endM] = (config.quietHoursEnd || '07:00').split(':').map(Number);
    const startVal = startH * 60 + (startM || 0);
    const endVal = endH * 60 + (endM || 0);

    if (startVal > endVal) {
      // Overnight (e.g. 22:00 to 07:00)
      return currentVal >= startVal || currentVal < endVal;
    } else {
      return currentVal >= startVal && currentVal < endVal;
    }
  }

  // Universal dispatch function for all modules
  async sendNotification(options: {
    to: string;
    recipientName?: string;
    subject: string;
    category: 'TASK_OVERDUE' | 'TASK_UPCOMING' | 'CALENDAR' | 'BUDGET_ALERT' | 'SUBSCRIPTION' | 'PAYMENT' | 'SECURITY' | 'SYSTEM';
    headline: string;
    content: string;
    actionLabel?: string;
    actionUrl?: string;
    badgeText?: string;
    badgeColor?: string;
  }): Promise<{ sent: boolean; message: string }> {
    const config = await this.getConfig();

    // Check category enable status
    if (config.enabled) {
      if (options.category === 'TASK_OVERDUE' && !config.notifyTaskOverdue) return { sent: false, message: 'Danh mục thông báo này đã tắt' };
      if (options.category === 'TASK_UPCOMING' && !config.notifyTaskUpcoming) return { sent: false, message: 'Danh mục thông báo này đã tắt' };
      if (options.category === 'CALENDAR' && !config.notifyCalendarUpcoming) return { sent: false, message: 'Danh mục thông báo này đã tắt' };
      if (options.category === 'BUDGET_ALERT' && !config.notifyBudgetThreshold) return { sent: false, message: 'Danh mục thông báo này đã tắt' };
      if (options.category === 'SUBSCRIPTION' && !config.notifySubscriptionExpiry) return { sent: false, message: 'Danh mục thông báo này đã tắt' };
      if (options.category === 'PAYMENT' && !config.notifyPaymentStatus) return { sent: false, message: 'Danh mục thông báo này đã tắt' };
      if (options.category === 'SECURITY' && !config.notifySecurityAlerts) return { sent: false, message: 'Danh mục thông báo này đã tắt' };
      
      // Quiet hours check (Skip low priority during quiet hours)
      if (this.isQuietHour(config) && options.category !== 'SECURITY' && options.category !== 'PAYMENT') {
        this.addLog({
          id: 'log_' + Date.now(),
          recipientEmail: options.to,
          recipientName: options.recipientName,
          subject: options.subject,
          category: options.category,
          status: 'SKIPPED',
          errorMessage: 'Bỏ qua do đang trong khung giờ yên tĩnh (Quiet Hours)',
          timestamp: new Date().toISOString()
        });
        return { sent: false, message: 'Đang trong khung giờ yên tĩnh (Quiet Hours)' };
      }
    }

    const setup = await this.getTransporter();

    // Build Premium Responsive HTML Template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 28px; text-align: left; color: #ffffff;">
                    <div style="display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                      ${options.badgeText || 'THÔNG BÁO TỰ ĐỘNG'}
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; line-height: 1.3; color: #ffffff;">
                      ${options.headline}
                    </h1>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 32px 28px; color: #334155; font-size: 14px; line-height: 1.6;">
                    ${options.recipientName ? `<p style="margin-top: 0; font-size: 15px; font-weight: 600; color: #0f172a;">Xin chào ${options.recipientName},</p>` : ''}
                    
                    <div style="margin: 16px 0; color: #475569;">
                      ${options.content}
                    </div>

                    ${options.actionUrl ? `
                      <div style="margin-top: 28px; text-align: center;">
                        <a href="${options.actionUrl}" style="display: inline-block; padding: 12px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                          ${options.actionLabel || 'Xem chi tiết trong Life OS'} &rarr;
                        </a>
                      </div>
                    ` : ''}

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 20px;" />

                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                      Đây là thông báo tự động từ Life OS Personal Operating System.<br/>
                      Bạn có thể tùy chỉnh cài đặt thông báo trong menu Tài khoản cá nhân.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (setup) {
      try {
        await setup.transporter.sendMail({
          from: `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`,
          to: options.to,
          subject: options.subject,
          html: emailHtml
        });

        this.addLog({
          id: 'log_' + Date.now(),
          recipientEmail: options.to,
          recipientName: options.recipientName,
          subject: options.subject,
          category: options.category,
          status: 'SENT',
          timestamp: new Date().toISOString()
        });

        return { sent: true, message: 'Đã gửi Gmail thông báo thành công!' };
      } catch (err: any) {
        console.error('[GmailNotificationService] Error sending mail:', err);
        this.addLog({
          id: 'log_' + Date.now(),
          recipientEmail: options.to,
          recipientName: options.recipientName,
          subject: options.subject,
          category: options.category,
          status: 'FAILED',
          errorMessage: err.message,
          timestamp: new Date().toISOString()
        });

        return { sent: false, message: `Lỗi gửi Gmail: ${err.message}` };
      }
    } else {
      // In simulated mode if SMTP not yet configured by admin
      this.addLog({
        id: 'log_' + Date.now(),
        recipientEmail: options.to,
        recipientName: options.recipientName,
        subject: options.subject,
        category: options.category,
        status: 'SIMULATED',
        errorMessage: 'Gmail SMTP chưa được cấu hình. Đã ghi nhận thông báo vào hàng đợi hệ thống.',
        timestamp: new Date().toISOString()
      });

      return { 
        sent: false, 
        message: 'Gmail SMTP chưa cấu hình trong trang Admin. Thông báo đã được lưu trữ trong nhật ký hệ thống.' 
      };
    }
  }

  // Store logs in memory
  private addLog(entry: EmailLogEntry) {
    this.inMemoryLogs.unshift(entry);
    if (this.inMemoryLogs.length > this.MAX_LOGS) {
      this.inMemoryLogs.pop();
    }
  }

  // Get recent notification history
  getNotificationLogs(): EmailLogEntry[] {
    return this.inMemoryLogs;
  }
}

export const gmailService = new GmailNotificationService();
