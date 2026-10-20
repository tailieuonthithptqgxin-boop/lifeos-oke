import nodemailer from 'nodemailer';
import { getPrisma } from '../../db.js';
import { resolveHostToIPv4 } from '../gmailNotification.service.js';
import { buildNotificationEmailHtml } from './emailTemplate.js';

export interface GmailOAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GmailOAuthService {
  /**
   * Retrieves OAuth credentials from environment variables or admin system settings
   */
  async getCredentials(): Promise<GmailOAuthCredentials | null> {
    const prisma = getPrisma();
    let dbClientId = '';
    let dbClientSecret = '';
    let dbRedirectUri = '';

    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'google_oauth_credentials' }
      });
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        dbClientId = parsed.clientId || '';
        dbClientSecret = parsed.clientSecret || '';
        dbRedirectUri = parsed.redirectUri || '';
      }
    } catch (e) {
      // Ignore DB read failure
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || dbClientId || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || dbClientSecret || '';
    
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || dbRedirectUri || `${appUrl}/api/notifications/gmail/callback`;

    if (!clientId || !clientSecret) {
      return null;
    }

    return { clientId, clientSecret, redirectUri };
  }

  /**
   * Generates authorization URL for Google OAuth consent screen
   */
  async generateAuthUrl(userId: string, redirectUriOverride?: string): Promise<{ url: string; state: string } | null> {
    const creds = await this.getCredentials();
    if (!creds) {
      return null;
    }

    const redirectUri = redirectUriOverride || creds.redirectUri;
    const statePayload = JSON.stringify({ userId, t: Date.now() });
    const state = Buffer.from(statePayload).toString('base64url');

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline', // Critical: yields refresh_token
      prompt: 'consent',     // Forces consent screen so refresh_token is always returned
      state
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state
    };
  }

  /**
   * Exchanges authorization code for tokens and saves integration
   */
  async handleCallback(code: string, state: string, redirectUriOverride?: string): Promise<{ success: boolean; email?: string; error?: string }> {
    let userId = '';
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
      userId = decoded.userId;
    } catch (e) {
      return { success: false, error: 'Mã xác thực trạng thái (state) không hợp lệ hoặc đã hết hạn.' };
    }

    if (!userId) {
      return { success: false, error: 'Không tìm thấy thông tin tài khoản người dùng từ yêu cầu liên kết.' };
    }

    const creds = await this.getCredentials();
    if (!creds) {
      return { success: false, error: 'Hệ thống chưa được cấu hình Google Client ID / Secret.' };
    }

    const redirectUri = redirectUriOverride || creds.redirectUri;

    try {
      // 1. Exchange code for access & refresh tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('[GmailOAuth] Token exchange error:', tokenData);
        return { success: false, error: tokenData.error_description || tokenData.error || 'Lỗi trao đổi mã OAuth với Google.' };
      }

      // 2. Fetch user profile to identify connected email address
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userInfo = await userinfoRes.json();

      if (!userinfoRes.ok || !userInfo.email) {
        return { success: false, error: 'Không thể lấy địa chỉ email từ tài khoản Google.' };
      }

      const connectedEmail = userInfo.email.toLowerCase().trim();
      const expiryDate = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      // 3. Upsert integration in database
      const prisma = getPrisma();
      await prisma.userEmailIntegration.upsert({
        where: { userId },
        update: {
          provider: 'gmail',
          connectedEmail,
          accessToken: tokenData.access_token,
          // If Google does not return a new refresh_token on re-auth, preserve existing one
          ...(tokenData.refresh_token ? { refreshToken: tokenData.refresh_token } : {}),
          tokenExpiry: expiryDate,
          status: 'ACTIVE',
          lastVerifiedAt: new Date(),
          lastError: null
        },
        create: {
          userId,
          provider: 'gmail',
          connectedEmail,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || '',
          tokenExpiry: expiryDate,
          status: 'ACTIVE',
          lastVerifiedAt: new Date()
        }
      });

      // Also ensure user notification preference enables email
      await prisma.userNotificationPreference.upsert({
        where: { userId },
        update: { emailEnabled: true },
        create: { userId, emailEnabled: true, inAppEnabled: true }
      });

      return { success: true, email: connectedEmail };
    } catch (err: any) {
      console.error('[GmailOAuth] Callback processing exception:', err);
      return { success: false, error: `Lỗi xử lý kết nối Google: ${err.message}` };
    }
  }

  /**
   * Disconnects and revokes user Gmail OAuth integration
   */
  async disconnect(userId: string): Promise<{ success: boolean; message: string }> {
    const prisma = getPrisma();
    try {
      const integration = await prisma.userEmailIntegration.findUnique({
        where: { userId }
      });

      if (!integration) {
        return { success: true, message: 'Tài khoản chưa từng kết nối Gmail.' };
      }

      // Optional: revoke token with Google
      const tokenToRevoke = integration.refreshToken || integration.accessToken;
      if (tokenToRevoke) {
        fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).catch(err => console.warn('[GmailOAuth] Token revoke notice:', err.message));
      }

      // Delete from DB
      await prisma.userEmailIntegration.delete({
        where: { userId }
      });

      return { success: true, message: 'Đã ngắt kết nối Gmail thành công.' };
    } catch (err: any) {
      console.error('[GmailOAuth] Disconnect error:', err);
      return { success: false, message: `Không thể ngắt kết nối: ${err.message}` };
    }
  }

  /**
   * Retrieves active integration status for UI
   */
  async getIntegrationStatus(userId: string) {
    const prisma = getPrisma();
    const integration = await prisma.userEmailIntegration.findUnique({
      where: { userId }
    });

    if (!integration) {
      const creds = await this.getCredentials();
      return {
        connected: false,
        isConfiguredOnServer: !!creds,
        connectedEmail: null,
        status: 'DISCONNECTED',
        lastVerifiedAt: null
      };
    }

    return {
      connected: integration.status === 'ACTIVE' && !!integration.refreshToken,
      isConfiguredOnServer: true,
      connectedEmail: integration.connectedEmail,
      status: integration.status,
      lastVerifiedAt: integration.lastVerifiedAt,
      lastError: integration.lastError
    };
  }

  /**
   * Creates an active Nodemailer transport using user's stored OAuth credentials
   */
  async createOAuthTransporter(userId: string): Promise<{ transporter: any; connectedEmail: string } | null> {
    const prisma = getPrisma();
    const integration = await prisma.userEmailIntegration.findUnique({
      where: { userId }
    });

    if (!integration || integration.status !== 'ACTIVE' || !integration.refreshToken) {
      return null;
    }

    const creds = await this.getCredentials();
    if (!creds) {
      return null;
    }

    const connectedEmail = integration.connectedEmail;

    // Force IPv4 address resolution to guarantee no ENETUNREACH
    const ipv4Host = await resolveHostToIPv4('smtp.gmail.com');

    // Nodemailer native OAuth2 transport: automatically refreshes access_token using refreshToken!
    const transporter = nodemailer.createTransport({
      host: ipv4Host,
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: connectedEmail,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        refreshToken: integration.refreshToken,
        accessToken: integration.accessToken || undefined
      },
      family: 4,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        servername: 'smtp.gmail.com',
        rejectUnauthorized: false
      }
    } as any);

    return { transporter, connectedEmail };
  }

  /**
   * Sends a test email to verify user Gmail OAuth connection
   */
  async sendTestEmail(userId: string, targetEmail?: string): Promise<{ success: boolean; message: string }> {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return { success: false, message: 'Người dùng không tồn tại.' };
    }

    const recipient = targetEmail || user.email;
    const authResult = await this.createOAuthTransporter(userId);

    const appUrl = (process.env.APP_URL || 'https://www.quanlicanhan.online').replace(/\/$/, '');

    const testHtml = buildNotificationEmailHtml({
      recipientName: user.name || 'Thành viên LifeOS',
      headline: '🎉 Kết nối Gmail OAuth thành công!',
      bodyHtml: `
        Email này được gửi trực tiếp từ hộp thư Gmail của bạn thông qua giao thức <strong>Google OAuth 2.0</strong> bảo mật cao.<br/><br/>
        Từ bây giờ, toàn bộ các nhắc nhở quan trọng về <strong>Lịch trình, Deadline công việc, và Cảnh báo quá hạn</strong> sẽ được tự động chuyển đến bạn theo đúng quy tắc bạn đã cài đặt.
      `,
      categoryLabel: 'Kiểm tra kết nối',
      categoryColor: '#10B981',
      priority: 'NORMAL',
      actionUrl: `${appUrl}/?view=notifications`,
      actionLabel: 'Mở Trung tâm Thông báo',
      metadataItems: [
        { label: 'Tài khoản gửi', value: authResult?.connectedEmail || 'Gmail Cá Nhân', isBold: true },
        { label: 'Hộp thư nhận', value: recipient },
        { label: 'Thời gian kiểm tra', value: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) },
        { label: 'Phương thức xác thực', value: 'Google OAuth 2.0 (Refresh Token)' }
      ],
      appBaseUrl: appUrl
    });

    // 1. If user has active OAuth, send through user's personal Gmail
    if (authResult) {
      try {
        await authResult.transporter.sendMail({
          from: `"LifeOS Assistant" <${authResult.connectedEmail}>`,
          to: recipient,
          subject: '⚡ [LifeOS] Kiểm tra kết nối Gmail OAuth thành công',
          html: testHtml
        });

        // Record verification timestamp
        await prisma.userEmailIntegration.update({
          where: { userId },
          data: { lastVerifiedAt: new Date(), lastError: null }
        });

        return {
          success: true,
          message: `Email kiểm tra đã được gửi thành công từ hộp thư ${authResult.connectedEmail} tới ${recipient}!`
        };
      } catch (err: any) {
        console.error('[GmailOAuth] Test send error:', err);
        await prisma.userEmailIntegration.update({
          where: { userId },
          data: { lastError: err.message }
        });
        return {
          success: false,
          message: `Lỗi khi gửi email qua Gmail OAuth: ${err.message}`
        };
      }
    }

    // 2. If user does NOT have personal Gmail OAuth connected, fallback to System mailer
    try {
      const { sendEmail } = await import('../../mailer.js');
      const res = await sendEmail(
        recipient,
        '⚡ [LifeOS] Kiểm tra kênh Email thông báo hệ thống',
        testHtml
      );
      return {
        success: res.sent,
        message: res.sent
          ? `Email kiểm tra đã được gửi thành công qua kênh hệ thống tới ${recipient}!`
          : (res.message || 'Hệ thống chưa cấu hình dịch vụ gửi email.')
      };
    } catch (e: any) {
      return { success: false, message: `Lỗi gửi email kiểm tra: ${e.message}` };
    }
  }
}

export const gmailOAuthService = new GmailOAuthService();
