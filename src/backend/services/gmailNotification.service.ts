import nodemailer from 'nodemailer';
import dns from 'dns';
import net from 'net';
import { getPrisma } from '../db.js';

// Force IPv4-first DNS lookup to eliminate ENETUNREACH IPv6 connection errors
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignore
}

/**
 * Resolves hostname to an IPv4 address string to guarantee that Nodemailer's internal
 * socket logic doesn't attempt an IPv6 connection (which causes ENETUNREACH on platforms
 * like Railway, VPS, or Docker without outbound IPv6 routing).
 */
export async function resolveHostToIPv4(hostname: string): Promise<string> {
  if (!hostname) return 'smtp.gmail.com';
  if (net.isIP(hostname)) return hostname;

  return new Promise<string>((resolve) => {
    // 1. Try dns.resolve4 first
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        return resolve(addresses[0]);
      }
      // 2. Fallback to dns.lookup with family 4
      dns.lookup(hostname, { family: 4 }, (err2, address) => {
        if (!err2 && address) {
          return resolve(address);
        }
        // 3. Fallback to original hostname if resolution fails
        resolve(hostname);
      });
    });
  });
}

export interface GmailSmtpConfig {
  enabled: boolean;
  serviceType: 'gmail' | 'smtp' | 'resend';
  apiKey?: string;
  user: string;
  appPassword?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
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

export function getAppBaseUrl(): string {
  if (process.env.APP_URL && process.env.APP_URL.trim()) {
    return process.env.APP_URL.trim().replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.quanlicanhan.online';
  }
  return 'http://localhost:5173';
}

export const DEFAULT_GMAIL_CONFIG: GmailSmtpConfig = {
  enabled: false,
  serviceType: 'gmail',
  apiKey: '',
  user: '',
  appPassword: '',
  fromName: 'Life OS Notification Assistant',
  fromEmail: '',
  replyTo: '',
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
      appPassword: envPass ? envPass.replace(/\s+/g, '') : '',
      fromEmail: envUser || 'notifications@lifeos.local',
      fromName: 'Life OS Assistant'
    };
    return this.cachedConfig;
  }

  // Alias updateConfig to saveConfig
  async updateConfig(newConfig: Partial<GmailSmtpConfig>, adminUserId?: string): Promise<GmailSmtpConfig> {
    return this.saveConfig(newConfig, adminUserId);
  }

  // Save new configuration securely to Database
  async saveConfig(newConfig: Partial<GmailSmtpConfig>, adminUserId?: string): Promise<GmailSmtpConfig> {
    const current = await this.getConfig();
    
    // If appPassword is not provided or masked, keep the existing password
    let passwordToSave = current.appPassword || '';
    if (newConfig.appPassword && newConfig.appPassword !== '••••••••••••••••') {
      // Strip spaces (e.g. Google displays 16-character passwords with spaces 'xxxx xxxx xxxx xxxx')
      passwordToSave = newConfig.appPassword.replace(/\s+/g, '');
    }

    // If apiKey is not provided or masked, keep the existing apiKey
    let apiKeyToSave = current.apiKey || '';
    if (newConfig.apiKey && newConfig.apiKey !== '••••••••••••••••') {
      apiKeyToSave = newConfig.apiKey.trim();
    }

    const merged: GmailSmtpConfig = {
      ...current,
      ...newConfig,
      serviceType: newConfig.serviceType || current.serviceType || 'gmail',
      user: newConfig.user !== undefined ? newConfig.user.trim() : current.user,
      fromEmail: newConfig.fromEmail !== undefined ? newConfig.fromEmail.trim() : current.fromEmail,
      fromName: newConfig.fromName !== undefined ? newConfig.fromName.trim() : current.fromName,
      replyTo: newConfig.replyTo !== undefined ? newConfig.replyTo.trim() : (current.replyTo || ''),
      smtpHost: newConfig.smtpHost !== undefined ? newConfig.smtpHost.trim() : (current.smtpHost || 'smtp.gmail.com'),
      smtpPort: newConfig.smtpPort !== undefined ? Number(newConfig.smtpPort) : (current.smtpPort || 465),
      smtpSecure: newConfig.smtpSecure !== undefined ? Boolean(newConfig.smtpSecure) : current.smtpSecure,
      appPassword: passwordToSave,
      apiKey: apiKeyToSave
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

  // Helper to create transport instance with IPv4 forced and proper timeouts
  private async createTransporterInstance(config: GmailSmtpConfig, overridePort?: number, overrideSecure?: boolean): Promise<any> {
    const cleanPassword = (config.appPassword || '').replace(/\s+/g, '');
    const isGmail = config.serviceType === 'gmail' || !config.smtpHost || config.smtpHost.includes('gmail');
    const originalHost = isGmail ? 'smtp.gmail.com' : (config.smtpHost || 'smtp.gmail.com');
    const port = overridePort !== undefined 
      ? overridePort 
      : (Number(config.smtpPort) || (isGmail ? 465 : 587));
    const isSecure = overrideSecure !== undefined 
      ? overrideSecure 
      : (config.smtpSecure !== undefined ? Boolean(config.smtpSecure) : (port === 465));

    // CRITICAL: Resolve domain name explicitly to an IPv4 address string to guarantee that Nodemailer's internal
    // socket creation does NOT resolve to IPv6 on cloud hostings without IPv6 routing (e.g. Railway, Docker).
    const ipv4Host = await resolveHostToIPv4(originalHost);

    return nodemailer.createTransport({
      host: ipv4Host,
      port,
      secure: isSecure,
      auth: {
        user: config.user.trim(),
        pass: cleanPassword
      },
      family: 4, // Force IPv4
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        servername: originalHost, // CRITICAL: Provide SNI hostname for TLS handshake so Google SSL verification succeeds
        rejectUnauthorized: false
      }
    } as any);
  }

  // Create transporter based on active configuration
  private async getTransporter(): Promise<{ transporter: any; config: GmailSmtpConfig } | null> {
    const config = await this.getConfig();

    if (!config.enabled) {
      return null;
    }

    // Resend HTTP API doesn't use SMTP socket transporter
    if (config.serviceType === 'resend') {
      const key = (config.apiKey || config.appPassword || '').trim();
      if (!key) return null;
      return { transporter: null, config };
    }

    if (!config.user || !config.appPassword) {
      return null;
    }

    if (this.cachedTransporter) {
      return { transporter: this.cachedTransporter, config };
    }

    try {
      this.cachedTransporter = await this.createTransporterInstance(config);
      return { transporter: this.cachedTransporter, config };
    } catch (err) {
      console.error('[GmailNotificationService] Transporter initialization failed:', err);
      return null;
    }
  }

  // Send email via Resend REST API (Port 443 HTTPS - Works 100% on Railway Hobby & all cloud hosts)
  async sendViaResend(
    config: GmailSmtpConfig,
    to: string,
    subject: string,
    html: string
  ): Promise<{ sent: boolean; message: string }> {
    const key = (config.apiKey || config.appPassword || '').trim();
    if (!key) {
      return { sent: false, message: 'Thiếu API Key của Resend (ví dụ: re_xxxx...). Vui lòng tạo tại resend.com.' };
    }

    try {
      let fromAddress = config.fromEmail?.trim() || 'onboarding@resend.dev';
      if (!fromAddress.includes('@')) {
        fromAddress = 'onboarding@resend.dev';
      }
      const fromHeader = config.fromName ? `${config.fromName} <${fromAddress}>` : fromAddress;

      const payload: any = {
        from: fromHeader,
        to: [to],
        subject,
        html
      };
      if (config.replyTo && config.replyTo.includes('@')) {
        payload.reply_to = [config.replyTo.trim()];
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data?.id) {
        return { sent: true, message: `Email đã gửi thành công qua Resend API (ID: ${data.id})` };
      } else {
        const errMsg = data?.message || data?.error?.message || `HTTP ${res.status}`;
        return { sent: false, message: `Lỗi Resend API: ${errMsg}` };
      }
    } catch (err: any) {
      return { sent: false, message: `Lỗi kết nối Resend API: ${err.message}` };
    }
  }

  // Verify connection to Gmail SMTP / Resend server with auto-fallback
  async testConnection(testToEmail?: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig();
    if (!config.enabled) {
      return {
        success: false,
        message: 'Dịch vụ Email chưa được bật trong trang Quản trị.'
      };
    }

    // Branch 1: Resend HTTP API (Port 443 - Bypasses all cloud/Railway SMTP port blocking)
    if (config.serviceType === 'resend') {
      const key = (config.apiKey || config.appPassword || '').trim();
      if (!key) {
        return {
          success: false,
          message: 'Chưa nhập Resend API Key (ví dụ: re_xxxx). Vui lòng đăng ký miễn phí tại resend.com để lấy key.'
        };
      }

      const testHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ Life OS Notification System</h1>
            <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Kiểm tra kết nối Resend API thành công (Cổng 443 HTTPS)</p>
          </div>
          <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 15px; margin-top: 0;">Xin chào Quản trị viên,</p>
            <p style="font-size: 14px; color: #475569;">Email này được gửi tự động qua Resend REST API (Cổng 443 HTTPS bảo mật chuẩn web). Hoạt động 100% ổn định trên mọi nền tảng hosting (Railway, VPS, Docker) mà không bị giới hạn cổng SMTP.</p>
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #166534;">
              <strong>Trạng thái:</strong> Sẵn sàng tự động gửi nhắc việc, cảnh báo ngân sách, lịch biểu và thông báo đơn hàng.
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Thời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
        </div>
      `;

      if (testToEmail) {
        const sendRes = await this.sendViaResend(
          config,
          testToEmail,
          '✅ [Life OS] Kiểm tra kết nối Resend API thành công',
          testHtml
        );
        this.addLog({
          id: 'test_' + Date.now(),
          recipientEmail: testToEmail,
          subject: 'Kiểm tra kết nối Resend API',
          category: 'TEST_CONNECTION',
          status: sendRes.sent ? 'SENT' : 'FAILED',
          errorMessage: sendRes.sent ? undefined : sendRes.message,
          timestamp: new Date().toISOString()
        });
        return {
          success: sendRes.sent,
          message: sendRes.sent
            ? `Kết nối Resend API thành công qua cổng 443 HTTPS! Email thử nghiệm đã được gửi tới ${testToEmail}.`
            : sendRes.message
        };
      }

      // Check API Key validity
      try {
        const verifyRes = await fetch('https://api.resend.com/api-keys', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (!verifyRes.ok) {
          const errData: any = await verifyRes.json().catch(() => ({}));
          return {
            success: false,
            message: `Khóa Resend API không hợp lệ hoặc đã bị vô hiệu hóa: ${errData.message || verifyRes.statusText}`
          };
        }
        return {
          success: true,
          message: 'Xác thực Resend API Key thành công qua cổng 443 HTTPS! Sẵn sàng gửi thông báo tự động.'
        };
      } catch (err: any) {
        return { success: false, message: `Lỗi kết nối máy chủ Resend: ${err.message}` };
      }
    }

    // Branch 2: Gmail SMTP / Custom SMTP
    if (!config.user || !config.appPassword) {
      return {
        success: false,
        message: 'Gmail chưa được bật hoặc thiếu Tài khoản Gmail / Mật khẩu ứng dụng (App Password).'
      };
    }

    let activeTransporter: any = null;
    let usedPort = Number(config.smtpPort) || 465;
    let usedSecure = config.smtpSecure !== undefined ? Boolean(config.smtpSecure) : (usedPort === 465);

    // Primary attempt with IPv4
    try {
      activeTransporter = await this.createTransporterInstance(config, usedPort, usedSecure);
      await activeTransporter.verify();
      this.cachedTransporter = activeTransporter;
    } catch (primaryErr: any) {
      console.warn(`[GmailNotificationService] Primary verify on port ${usedPort} failed: ${primaryErr.message}. Attempting alternate port fallback...`);
      
      // Auto-fallback: if 465 failed, try 587. If 587 failed, try 465.
      const fallbackPort = usedPort === 465 ? 587 : 465;
      const fallbackSecure = fallbackPort === 465;

      try {
        const fallbackTransporter = await this.createTransporterInstance(config, fallbackPort, fallbackSecure);
        await fallbackTransporter.verify();
        
        // Fallback succeeded! Switch to fallback and persist update to config
        activeTransporter = fallbackTransporter;
        this.cachedTransporter = activeTransporter;
        usedPort = fallbackPort;
        usedSecure = fallbackSecure;

        // Auto update config with working port in DB
        await this.updateConfig({
          smtpPort: fallbackPort,
          smtpSecure: fallbackSecure
        });
        console.log(`[GmailNotificationService] Successfully switched and saved working SMTP port: ${fallbackPort} (secure: ${fallbackSecure})`);
      } catch (fallbackErr: any) {
        // Both failed: report clear, helpful error message
        this.addLog({
          id: 'test_err_' + Date.now(),
          recipientEmail: testToEmail || 'test@verify.local',
          subject: 'Kiểm tra kết nối Gmail',
          category: 'TEST_CONNECTION',
          status: 'FAILED',
          errorMessage: primaryErr.message,
          timestamp: new Date().toISOString()
        });

        const isAuthError = primaryErr.message?.includes('Invalid login') || 
                            primaryErr.message?.includes('535') || 
                            primaryErr.message?.includes('Username and Password not accepted') ||
                            primaryErr.message?.includes('BadCredentials') ||
                            primaryErr.code === 'EAUTH';

        const isNetworkError = primaryErr.message?.includes('ENETUNREACH') || 
                               primaryErr.message?.includes('ETIMEDOUT') || 
                               primaryErr.message?.includes('ECONNREFUSED') ||
                               primaryErr.message?.includes('Connection timeout') ||
                               primaryErr.message?.includes('timeout') ||
                               primaryErr.code === 'ETIMEDOUT';

        let hint = '';
        if (isAuthError) {
          hint = ' Google từ chối tài khoản hoặc mật khẩu. Bạn hãy tạo và dùng "Mật khẩu ứng dụng" (App Password 16 ký tự, ví dụ: abcd efgh ijkl mnop) tại myaccount.google.com/apppasswords thay vì mật khẩu đăng nhập thông thường.';
        } else if (isNetworkError) {
          hint = ' Máy chủ hosting (như gói miễn phí / Hobby của Railway) chặn kết nối ra ngoài ở các cổng SMTP 465 và 587 để phòng chống spam. KHUYẾN NGHỊ: Hãy chuyển sang dùng "Resend API (Cổng 443 HTTPS)" hoàn toàn miễn phí (100 email/ngày) trong mục Hình thức kết nối — cổng HTTPS web không bao giờ bị chặn!';
        }

        return {
          success: false,
          message: `Lỗi kết nối Gmail SMTP: ${primaryErr.message}.${hint}`
        };
      }
    }

    // Now send test email if recipient was provided
    if (testToEmail) {
      try {
        const testHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ Life OS Notification System</h1>
              <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Kiểm tra kết nối Gmail thành công</p>
            </div>
            <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
              <p style="font-size: 15px; margin-top: 0;">Xin chào Quản trị viên,</p>
              <p style="font-size: 14px; color: #475569;">Email này được gửi tự động để kiểm tra thiết lập Gmail SMTP trên trang Quản trị Life OS. Mọi cấu hình kết nối đã hoạt động hoàn toàn chính xác (Cổng kết nối: <b>${usedPort}</b>).</p>
              <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #0f766e;">
                <strong>Trạng thái:</strong> Sẵn sàng tự động gửi nhắc việc, cảnh báo ngân sách, lịch biểu và thanh toán.
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Thời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
          </div>
        `;

        await activeTransporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
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
          message: `Kết nối Gmail SMTP thành công qua cổng ${usedPort}! Email thử nghiệm đã gửi tới ${testToEmail}.`
        };
      } catch (sendErr: any) {
        return {
          success: false,
          message: `Xác thực máy chủ thành công qua cổng ${usedPort} nhưng gửi email thử nghiệm thất bại: ${sendErr.message}`
        };
      }
    }

    return {
      success: true,
      message: `Xác thực tài khoản Gmail SMTP thành công qua cổng ${usedPort}!`
    };
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
    const actionUrl = options.actionUrl || getAppBaseUrl();

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

                    ${actionUrl ? `
                      <div style="margin-top: 28px; text-align: center;">
                        <a href="${actionUrl}" style="display: inline-block; padding: 12px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
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
      // Branch Resend REST API (HTTPS Port 443)
      if (setup.config.serviceType === 'resend') {
        const res = await this.sendViaResend(setup.config, options.to, options.subject, emailHtml);
        this.addLog({
          id: 'log_' + Date.now(),
          recipientEmail: options.to,
          recipientName: options.recipientName,
          subject: options.subject,
          category: options.category,
          status: res.sent ? 'SENT' : 'FAILED',
          errorMessage: res.sent ? undefined : res.message,
          timestamp: new Date().toISOString()
        });
        return res;
      }

      try {
        await setup.transporter.sendMail({
          from: `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`,
          replyTo: setup.config.replyTo || undefined,
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
        const isNetworkErr = err.message?.includes('ENETUNREACH') || 
                             err.message?.includes('ETIMEDOUT') || 
                             err.message?.includes('ECONNREFUSED');
        if (isNetworkErr) {
          try {
            const currentPort = Number(setup.config.smtpPort) || 465;
            const altPort = currentPort === 465 ? 587 : 465;
            const altSecure = altPort === 465;
            const altTransporter = await this.createTransporterInstance(setup.config, altPort, altSecure);
            await altTransporter.sendMail({
              from: `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`,
              replyTo: setup.config.replyTo || undefined,
              to: options.to,
              subject: options.subject,
              html: emailHtml
            });
            this.cachedTransporter = altTransporter;
            await this.updateConfig({ smtpPort: altPort, smtpSecure: altSecure });
            this.addLog({
              id: 'log_' + Date.now(),
              recipientEmail: options.to,
              recipientName: options.recipientName,
              subject: options.subject,
              category: options.category,
              status: 'SENT',
              timestamp: new Date().toISOString()
            });
            return { sent: true, message: `Đã tự động đổi sang cổng ${altPort} và gửi Gmail thành công!` };
          } catch (altErr: any) {
            console.error('[GmailNotificationService] Alternate port also failed:', altErr);
          }
        }

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

  // Universal raw email sender (used by auth password reset and direct mailer)
  async sendRawEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
    category?: string;
  }): Promise<{ sent: boolean; message: string }> {
    if (!options.to || !options.to.includes('@')) {
      return { sent: false, message: 'Địa chỉ email người nhận không hợp lệ.' };
    }

    const setup = await this.getTransporter();
    if (setup) {
      // Branch Resend REST API (HTTPS Port 443)
      if (setup.config.serviceType === 'resend') {
        const res = await this.sendViaResend(setup.config, options.to, options.subject, options.html);
        this.addLog({
          id: 'log_' + Date.now(),
          recipientEmail: options.to,
          subject: options.subject,
          category: options.category || 'SYSTEM',
          status: res.sent ? 'SENT' : 'FAILED',
          errorMessage: res.sent ? undefined : res.message,
          timestamp: new Date().toISOString()
        });
        return res;
      }

      try {
        const fromHeader = options.from || `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`;
        await setup.transporter.sendMail({
          from: fromHeader,
          to: options.to,
          replyTo: options.replyTo || setup.config.replyTo || undefined,
          subject: options.subject,
          html: options.html
        });

        this.addLog({
          id: 'log_' + Date.now(),
          recipientEmail: options.to,
          subject: options.subject,
          category: options.category || 'SYSTEM',
          status: 'SENT',
          timestamp: new Date().toISOString()
        });

        return { sent: true, message: 'Email đã được gửi thành công qua SMTP provider.' };
      } catch (err: any) {
        console.error('[GmailNotificationService] sendRawEmail error:', err);
        const isNetworkErr = err.message?.includes('ENETUNREACH') || 
                             err.message?.includes('ETIMEDOUT') || 
                             err.message?.includes('ECONNREFUSED');
        if (isNetworkErr) {
          try {
            const currentPort = Number(setup.config.smtpPort) || 465;
            const altPort = currentPort === 465 ? 587 : 465;
            const altSecure = altPort === 465;
            const altTransporter = await this.createTransporterInstance(setup.config, altPort, altSecure);
            const fromHeader = options.from || `"${setup.config.fromName}" <${setup.config.fromEmail || setup.config.user}>`;
            await altTransporter.sendMail({
              from: fromHeader,
              to: options.to,
              replyTo: options.replyTo || setup.config.replyTo || undefined,
              subject: options.subject,
              html: options.html
            });

            this.cachedTransporter = altTransporter;
            await this.updateConfig({ smtpPort: altPort, smtpSecure: altSecure });

            this.addLog({
              id: 'log_' + Date.now(),
              recipientEmail: options.to,
              subject: options.subject,
              category: options.category || 'SYSTEM',
              status: 'SENT',
              timestamp: new Date().toISOString()
            });

            return { sent: true, message: `Email đã được gửi thành công sau khi tự động chuyển sang cổng ${altPort}.` };
          } catch (altErr: any) {
            console.error('[GmailNotificationService] Fallback transporter also failed:', altErr.message);
          }
        }

        this.addLog({
          id: 'log_' + Date.now(),
          recipientEmail: options.to,
          subject: options.subject,
          category: options.category || 'SYSTEM',
          status: 'FAILED',
          errorMessage: err.message,
          timestamp: new Date().toISOString()
        });
        return { sent: false, message: `Lỗi gửi email: ${err.message}` };
      }
    } else {
      this.addLog({
        id: 'log_' + Date.now(),
        recipientEmail: options.to,
        subject: options.subject,
        category: options.category || 'SYSTEM',
        status: 'SIMULATED',
        errorMessage: 'Gmail SMTP chưa được cấu hình hoặc chưa bật trong trang Admin.',
        timestamp: new Date().toISOString()
      });
      return { sent: false, message: 'Gmail SMTP chưa được cấu hình hoặc chưa bật trong trang Admin.' };
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
