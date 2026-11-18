import { getPrisma } from '../db.js';

export interface WordPressConfig {
  enabled: boolean;
  apiUrl: string; // e.g. "https://myblog.com/wp-json"
  username?: string;
  appPassword?: string;
  smtpProxyEnabled?: boolean;
}

export class WordPressBridgeService {
  /**
   * Retrieves WordPress settings from SystemSetting table
   */
  async getConfig(): Promise<WordPressConfig> {
    const prisma = getPrisma();
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'wordpress_config' }
      });
      if (setting && setting.value) {
        return JSON.parse(setting.value);
      }
    } catch {
      // Fallback
    }

    return {
      enabled: !!process.env.WORDPRESS_URL,
      apiUrl: process.env.WORDPRESS_URL || '',
      username: process.env.WORDPRESS_USER || '',
      appPassword: process.env.WORDPRESS_APP_PASSWORD || '',
      smtpProxyEnabled: false
    };
  }

  /**
   * Saves WordPress settings
   */
  async saveConfig(config: WordPressConfig): Promise<void> {
    const prisma = getPrisma();
    await prisma.systemSetting.upsert({
      where: { key: 'wordpress_config' },
      update: { value: JSON.stringify(config), updatedAt: new Date() },
      create: { key: 'wordpress_config', value: JSON.stringify(config), description: 'WordPress REST API & wp_mail SMTP Bridge' }
    });
  }

  /**
   * Tests connectivity to WordPress REST API
   */
  async testConnection(configOverride?: WordPressConfig): Promise<{ success: boolean; message: string; data?: any }> {
    const config = configOverride || await this.getConfig();
    if (!config.apiUrl) {
      return { success: false, message: 'Chưa cấu hình địa chỉ WordPress API URL.' };
    }

    const cleanUrl = config.apiUrl.replace(/\/$/, '');
    const endpoint = cleanUrl.includes('/wp-json') ? cleanUrl : `${cleanUrl}/wp-json`;

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (config.username && config.appPassword) {
        const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.appPassword}`).toString('base64');
        headers['Authorization'] = authHeader;
      }

      const res = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        return {
          success: false,
          message: `WordPress phản hồi mã lỗi HTTP ${res.status}: ${res.statusText}`
        };
      }

      const json = await res.json() as any;
      return {
        success: true,
        message: `Kết nối thành công tới WordPress! Website: "${json.name || cleanUrl}"`,
        data: {
          name: json.name,
          description: json.description,
          url: json.url,
          namespaces: json.namespaces || []
        }
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Không thể kết nối đến máy chủ WordPress: ${err.message || 'Lỗi mạng hoặc sai URL'}`
      };
    }
  }

  /**
   * Dispatches email broadcast via WordPress REST endpoint or custom plugin hook
   */
  async sendEmailViaWordPress(options: {
    recipients: string[];
    subject: string;
    htmlBody: string;
  }): Promise<{ success: boolean; count: number; error?: string }> {
    const config = await this.getConfig();
    if (!config.enabled || !config.apiUrl) {
      return { success: false, count: 0, error: 'WordPress bridge is not enabled.' };
    }

    const cleanUrl = config.apiUrl.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/wp-json/lifeos/v1/broadcast-email`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.username && config.appPassword) {
        headers['Authorization'] = 'Basic ' + Buffer.from(`${config.username}:${config.appPassword}`).toString('base64');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipients: options.recipients,
          subject: options.subject,
          html_body: options.htmlBody
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (res.ok) {
        const data = await res.json() as any;
        return { success: true, count: data.sent_count || options.recipients.length };
      } else {
        return { success: false, count: 0, error: `WordPress returned HTTP ${res.status}` };
      }
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  }
}

export const wordPressBridgeService = new WordPressBridgeService();
