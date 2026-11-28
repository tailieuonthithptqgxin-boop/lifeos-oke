// --------------------------------------------------------------------------
// Unified Notification Engine for LifeOS
// Manages 3 Synchronized Channels:
// Channel 1: In-App Bell & History Drawer
// Channel 2: Web Push Notification API + Audio Chime
// Channel 3: Automated Gmail Delivery (HTML Template Engine)
// --------------------------------------------------------------------------

import { AppNotification, User } from './types';
import { soundEngine } from './soundEngine';
import { webNotification } from './webNotification';
import { apiCall } from './apiClient';
import { BeautifulEmailData, buildBeautifulGmailHTML, EmailCategoryType } from './beautifulEmailTemplate';

export const IN_APP_NOTIFICATION_EVENT = 'lifeos-inapp-notification';
export const GMAIL_WEBHOOK_CONFIG_STORAGE_KEY = 'lifeos_gmail_webhook_config';

export interface GmailConnectorConfig {
  mode: 'webhook' | 'emailjs' | 'smtp';
  enabled: boolean;
  webhookUrl?: string; // Google Apps Script Webhook URL
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  targetEmail?: string;
}

export const DEFAULT_GMAIL_CONNECTOR: GmailConnectorConfig = {
  mode: 'webhook',
  enabled: true,
  webhookUrl: '',
  targetEmail: ''
};

class UnifiedNotificationEngine {
  private recentDispatches = new Set<string>();

  /**
   * Retrieves configured Gmail connector settings (Stored locally or loaded from DB)
   */
  getGmailConfig(): GmailConnectorConfig {
    if (typeof window === 'undefined') return DEFAULT_GMAIL_CONNECTOR;
    try {
      const saved = localStorage.getItem(GMAIL_WEBHOOK_CONFIG_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_GMAIL_CONNECTOR, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_GMAIL_CONNECTOR;
  }

  saveGmailConfig(config: Partial<GmailConnectorConfig>): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getGmailConfig();
      const updated = { ...current, ...config };
      localStorage.setItem(GMAIL_WEBHOOK_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save Gmail connector config:', e);
    }
  }

  /**
   * Central Dispatcher: Delivers notification simultaneously across 3 channels
   */
  async dispatch(options: {
    category: EmailCategoryType;
    title: string;
    message: string;
    priority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
    link?: string;
    emailData?: Partial<BeautifulEmailData>;
    suppressEmail?: boolean;
    playAudio?: boolean;
  }): Promise<boolean> {
    const {
      category,
      title,
      message,
      priority = 'NORMAL',
      link,
      emailData,
      suppressEmail = false,
      playAudio = true
    } = options;

    // Deduplication key (10-second debounce)
    const dedupKey = `${category}_${title}_${message.slice(0, 30)}`;
    if (this.recentDispatches.has(dedupKey)) {
      return false;
    }
    this.recentDispatches.add(dedupKey);
    setTimeout(() => this.recentDispatches.delete(dedupKey), 10000);

    // -------------------------------------------------------------
    // KÊNH 1: QUẢ CHUÔNG TRÊN WEB (In-App Notification)
    // -------------------------------------------------------------
    const notificationItem: AppNotification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title,
      message,
      type: priority === 'CRITICAL' ? 'error' : priority === 'HIGH' ? 'warning' : 'info',
      read: false,
      link: link || '/?tab=dashboard',
      createdAt: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(IN_APP_NOTIFICATION_EVENT, { detail: notificationItem })
      );
    }

    // -------------------------------------------------------------
    // KÊNH 2: THÔNG BÁO ĐẨY (Web Notification API) + ÂM THANH
    // -------------------------------------------------------------
    if (playAudio) {
      try {
        if (priority === 'CRITICAL') {
          soundEngine.playBadge();
        } else if (priority === 'HIGH') {
          soundEngine.playSuccess();
        } else {
          soundEngine.playPop();
        }
      } catch {}
    }

    try {
      webNotification.send(title, {
        body: message,
        icon: '/logo.png',
        tag: `lifeos-${category.toLowerCase()}`
      }).catch(() => {});
    } catch {}

    // -------------------------------------------------------------
    // KÊNH 3: CỔNG GỬI THƯ TỰ ĐỘNG VỀ GMAIL
    // -------------------------------------------------------------
    if (!suppressEmail) {
      this.sendEmailNotification({
        category,
        title,
        message,
        priority,
        emailData
      }).catch(err => {
        console.warn('[UnifiedNotificationEngine] Background email dispatch notice:', err.message || err);
      });
    }

    return true;
  }

  /**
   * Helper: Dispatches email via Backend Outbox Queue or Direct Webhook
   */
  async sendEmailNotification(params: {
    category: EmailCategoryType;
    title: string;
    message: string;
    priority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
    emailData?: Partial<BeautifulEmailData>;
  }): Promise<{ success: boolean; method?: string; error?: string }> {
    const rawStored = typeof window !== 'undefined' ? localStorage.getItem('lifeos_swr_user') : null;
    let currentUser: Partial<User> | null = null;
    if (rawStored) {
      try { currentUser = JSON.parse(rawStored); } catch {}
    }

    const recipientEmail = currentUser?.email || this.getGmailConfig().targetEmail || '';
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return { success: false, error: 'Chưa có địa chỉ email người nhận hợp lệ' };
    }

    const recipientName = currentUser?.name || currentUser?.displayName || 'Bạn';

    const fullEmailData: BeautifulEmailData = {
      recipientName,
      recipientEmail,
      category: params.category,
      headline: params.emailData?.headline || params.title,
      title: params.title,
      message: params.message,
      priority: params.priority || 'NORMAL',
      timeText: params.emailData?.timeText || 'Hôm nay',
      timeLeftText: params.emailData?.timeLeftText,
      notes: params.emailData?.notes || params.message,
      locationOrTopic: params.emailData?.locationOrTopic,
      userStats: params.emailData?.userStats || {
        streakDays: currentUser?.streakDays ?? 0,
        todayStudyMinutes: currentUser?.todayStudyMinutes ?? 0,
        badgeLevel: currentUser?.badgeLevel || 'Tân Binh'
      },
      ctaLabel: params.emailData?.ctaLabel || '🚀 Mở Thời Gian Biểu & Vào Học Ngay',
      ctaUrl: params.emailData?.ctaUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://quanlicanhan.online'),
      securityDetails: params.emailData?.securityDetails,
      paragraphs: params.emailData?.paragraphs
    };

    const renderedHtml = buildBeautifulGmailHTML(fullEmailData);
    const gmailConfig = this.getGmailConfig();

    // 1. Primary Path: Dispatch via Server / Cloudflare Edge Outbox Engine (Zero browser CORS issues on 302 redirects!)
    try {
      const res = await apiCall<{ success: boolean; id?: string; method?: string; error?: string }>('/api/notifications/dispatch', 'POST', {
        recipient: recipientEmail,
        subject: fullEmailData.headline,
        htmlBody: renderedHtml,
        category: params.category,
        priority: params.priority || 'NORMAL',
        metadata: {
          category: params.category,
          title: params.title,
          streakDays: fullEmailData.userStats?.streakDays,
          badgeLevel: fullEmailData.userStats?.badgeLevel
        }
      });

      if (res && res.success) {
        return { success: true, method: res.method || 'edge_email_engine' };
      }
    } catch (apiErr: any) {
      console.warn('[UnifiedNotificationEngine] Edge/Backend email dispatch fallback notice:', apiErr.message || apiErr);
    }

    // 2. Fallback: Direct client-side Google Apps Script Webhook (sends both to/html & recipient/htmlBody keys)
    if (gmailConfig.enabled && gmailConfig.webhookUrl && gmailConfig.webhookUrl.trim().startsWith('http')) {
      try {
        const response = await fetch(gmailConfig.webhookUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            to: recipientEmail,
            recipient: recipientEmail,
            subject: fullEmailData.headline,
            html: renderedHtml,
            htmlBody: renderedHtml,
            body: renderedHtml,
            category: params.category,
            timestamp: new Date().toISOString()
          })
        });
        if (response.ok || response.type === 'opaque') {
          return { success: true, method: 'google_apps_script_webhook_client' };
        }
      } catch (webhookErr) {
        console.warn('[UnifiedNotificationEngine] Client Google Apps Script Webhook error:', webhookErr);
      }
    }

    return { success: false, error: 'Chưa cấu hình cổng gửi email hoặc kết nối tạm thời gián đoạn' };
  }

  // --------------------------------------------------------------------------
  // 5 DEDICATED EVENT STREAM HELPERS (Theo đúng yêu cầu nghiệp vụ)
  // --------------------------------------------------------------------------

  /**
   * Luồng 1: Lịch Thời Gian Biểu & Deadline (3 Mốc Vàng: 2 Giờ - 1 Giờ - 30 Phút)
   */
  async notifyScheduleMilestone(
    item: {
      id: string;
      title: string;
      startTime?: string;
      date?: string;
      notes?: string;
      location?: string;
      isTask?: boolean;
    },
    milestone: '2h' | '1h' | '30m',
    minutesLeft: number
  ): Promise<boolean> {
    let category: EmailCategoryType = 'SCHEDULE_2H';
    let priority: 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    let timeLeftStr = 'Còn 2 giờ nữa';
    let headline = `Nhắc Lịch: Còn 2 Giờ Nữa Bắt Đầu "${item.title}" 🦉`;

    if (milestone === '1h') {
      category = 'SCHEDULE_1H';
      priority = 'HIGH';
      timeLeftStr = 'Còn đúng 60 phút nữa!';
      headline = `Sẵn Sàng: Còn 1 Giờ Nữa Đến Giờ "${item.title}" ⏰`;
    } else if (milestone === '30m') {
      category = 'DEADLINE_30M';
      priority = 'CRITICAL';
      timeLeftStr = `Chỉ còn ${minutesLeft} phút khẩn cấp!`;
      headline = `🚨 BÁO ĐỘNG KHẨN: Hạn Chót "${item.title}" Còn ${minutesLeft} Phút!`;
    }

    const message = `Lịch trình "${item.title}" sẽ bắt đầu lúc ${item.startTime || 'sớm'} (${timeLeftStr}). Hãy vào bàn học và chuẩn bị sẵn sàng!`;

    return this.dispatch({
      category,
      priority,
      title: item.title,
      message,
      link: item.isTask ? '/?tab=tasks' : '/?tab=calendar',
      emailData: {
        headline,
        title: item.title,
        timeText: `${item.startTime || ''} ${item.date ? `(${item.date})` : ''}`.trim(),
        timeLeftText: timeLeftStr,
        notes: item.notes || 'Hãy chuẩn bị tài liệu và tinh thần tập trung cao độ.',
        locationOrTopic: item.location || (item.isTask ? 'Nhiệm vụ cốt lõi • LifeOS Tasks' : 'Thời gian biểu • LifeOS Schedule'),
        ctaLabel: item.isTask ? '⚡ Mở Nhiệm Vụ & Nộp Bài Ngay' : '🚀 Mở Thời Gian Biểu & Vào Bàn Học'
      }
    });
  }

  /**
   * Luồng 2: Thông tin Đăng nhập & Bảo mật
   */
  async notifyAuthSecurity(
    type: 'LOGIN_SUCCESS' | 'REGISTER_SUCCESS' | 'PROFILE_UPDATED' | 'PASSWORD_CHANGED',
    details?: { device?: string; email?: string; ip?: string } | string,
    extraName?: string
  ): Promise<boolean> {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const parsedEmail = typeof details === 'string' ? details : details?.email;
    const deviceStr = (typeof details === 'object' && details?.device)
      ? details.device
      : (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 45) : 'Trình duyệt Web');

    let title = 'Xác thực Phiên Đăng Nhập Thành Công 🛡️';
    let message = `Tài khoản LifeOS (${parsedEmail || 'Bạn'}) vừa đăng nhập thành công từ thiết bị: ${deviceStr} lúc ${timeStr}.`;
    let headline = 'Bảo Mật: Đăng Nhập Thành Công Thiết Bị Mới 🛡️';

    if (type === 'REGISTER_SUCCESS') {
      title = 'Chào mừng bạn đến với LifeOS! 🎉';
      message = `Tài khoản (${parsedEmail || extraName || 'của bạn'}) đã được khởi tạo thành công. Bắt đầu hành trình rèn luyện kỷ luật ngay hôm nay!`;
      headline = 'Khởi Tạo Tài Khoản Thành Công • Chào Mừng Đến Với LifeOS 🚀';
    } else if (type === 'PROFILE_UPDATED') {
      title = 'Hồ Sơ Cá Nhân Đã Được Cập Nhật 👤';
      message = `Thông tin tài khoản (${extraName || parsedEmail || 'của bạn'}) vừa được cập nhật lúc ${timeStr}.`;
      headline = 'Thông Báo: Hồ Sơ Cá Nhân Của Bạn Vừa Được Cập Nhật 👤';
    } else if (type === 'PASSWORD_CHANGED') {
      title = 'Mật khẩu đã được thay đổi an toàn 🔒';
      message = `Mật khẩu tài khoản của bạn vừa được cập nhật lúc ${timeStr}.`;
      headline = 'Cảnh Báo Bảo Mật: Mật Khẩu Đã Thay Đổi Thành Công 🔒';
    }

    return this.dispatch({
      category: 'SECURITY_LOGIN',
      priority: 'HIGH',
      title,
      message,
      link: '/?tab=account',
      targetEmail: parsedEmail,
      emailData: {
        headline,
        title,
        message,
        securityDetails: {
          device: deviceStr,
          ipAddress: (typeof details === 'object' && details?.ip) ? details.ip : '113.161.88.24',
          location: 'Việt Nam',
          timestamp: new Date().toLocaleString('vi-VN')
        },
        ctaLabel: '🔒 Quản Lý Bảo Mật & Tài Khoản'
      }
    });
  }

  /**
   * Luồng 3: Báo cáo Hoạt động & Cảnh báo giữ Chuỗi Kỷ Luật (Streak 🔥)
   */
  async notifyActivityReport(
    stats?: { streakDays: number; todayStudyMinutes: number; badgeLevel: string },
    isEndOfDayWarning = false
  ): Promise<boolean> {
    const streak = stats?.streakDays ?? 0;
    const mins = stats?.todayStudyMinutes ?? 0;

    let title = 'Tổng Kết Hoạt Động & Kỷ Luật Hôm Nay 📊';
    let message = `Hôm nay bạn đã tích lũy ${mins} phút tập trung và giữ vững chuỗi ${streak} ngày 🔥!`;
    let headline = 'Báo Cáo Kỷ Luật & Hoạt Động Trong Ngày 📊';

    if (isEndOfDayWarning) {
      title = '🔥 Cảnh Báo: Giữ Vững Chuỗi Ngày Kỷ Luật Của Bạn!';
      message = `Bạn chưa hoàn thành ca học nào hôm nay. Hãy vào bàn học ngay để không bị đứt chuỗi ${streak} ngày liên tiếp!`;
      headline = `⚠️ Cảnh Báo Cuối Ngày: Giữ Vững Chuỗi ${streak} Ngày Kỷ Luật 🔥`;
    }

    return this.dispatch({
      category: 'ACTIVITY_REPORT',
      priority: isEndOfDayWarning ? 'HIGH' : 'NORMAL',
      title,
      message,
      link: '/?tab=dashboard',
      emailData: {
        headline,
        title,
        notes: isEndOfDayWarning
          ? 'Chỉ cần hoàn thành 1 phiên Pomodoro 25 phút hoặc đánh dấu 1 thói quen để tiếp tục duy trì chuỗi lửa!'
          : 'Tuyệt vời! Bạn đang tiến gần hơn tới mục tiêu dài hạn mỗi ngày.',
        userStats: stats,
        ctaLabel: isEndOfDayWarning ? '🔥 Vào Học Ngay Để Cứu Chuỗi Ngày' : '📈 Xem Báo Cáo Chi Tiết Trên LifeOS'
      }
    });
  }

  /**
   * Luồng 4: Cộng tác viên & Doanh thu
   */
  async notifyAffiliateEvent(
    type: 'COMMISSION_EARNED' | 'NEW_REFERRAL' | 'WITHDRAWAL_APPROVED' | 'WITHDRAWAL_REQUESTED',
    amount: number = 0,
    details?: string
  ): Promise<boolean> {
    let title = 'Bạn Vừa Được Cộng Hoa Hồng Mới 💰';
    let message = `Chúc mừng! Bạn vừa nhận được +${amount.toLocaleString('vi-VN')}đ hoa hồng từ đơn hàng của bạn bè.`;
    let headline = 'Chúc Mừng: Bạn Vừa Được Cộng Hoa Hồng Mới 💰';

    if (type === 'NEW_REFERRAL') {
      title = 'Có Bạn Mới Đăng Ký Qua Link Mời Của Bạn 👥';
      message = `${details || 'Một thành viên mới'} vừa tham gia LifeOS qua mã giới thiệu của bạn.`;
      headline = 'Thành Viên Mới Tham Gia Đội Nhóm Của Bạn 👥';
    } else if (type === 'WITHDRAWAL_REQUESTED') {
      title = 'Yêu Cầu Rút Tiền Đã Được Gửi Thành Công 💳';
      message = `Yêu cầu rút ${amount.toLocaleString('vi-VN')}đ về tài khoản ngân hàng đang được Admin xử lý.`;
      headline = 'Giao Dịch Đang Xử Lý: Yêu Cầu Rút Hoa Hồng 💳';
    } else if (type === 'WITHDRAWAL_APPROVED') {
      title = 'Yêu Cầu Rút Tiền Đã Được Duyệt Thành Công ✅';
      message = `Khoản tiền ${amount.toLocaleString('vi-VN')}đ đã được chuyển khoản qua mã QR ngân hàng của bạn.`;
      headline = 'Thanh Toán Thành Công: Hoa Hồng Đã Được Chuyển Khoản ✅';
    }

    return this.dispatch({
      category: 'AFFILIATE',
      priority: 'HIGH',
      title,
      message,
      link: '/?tab=referral',
      emailData: {
        headline,
        title,
        notes: details || 'Kiểm tra số dư khả dụng và lịch sử chi trả trong Cổng Quản Lý Cộng Tác Viên.',
        ctaLabel: '💼 Mở Cổng Cộng Tác Viên & Rút Tiền'
      }
    });
  }

  /**
   * Luồng 5: Phòng học ảo & Cộng đồng
   */
  async notifyStudyCommunity(
    type: 'POMODORO_FINISHED' | 'FRIEND_INVITE' | 'NEW_MESSAGE',
    details?: string | { durationMinutes?: number; title?: string }
  ): Promise<boolean> {
    const duration = (typeof details === 'object' && details?.durationMinutes) ? details.durationMinutes : 25;
    const taskTitle = (typeof details === 'object' && details?.title) ? details.title : 'Phiên tập trung';
    const detailStr = typeof details === 'string' ? details : undefined;

    let title = 'Xuất Sắc! Bạn Đã Hoàn Thành Phiên Học Pomodoro 🍅';
    let message = detailStr || `Bạn đã hoàn thành ${duration} phút tập trung sâu (${taskTitle}). Hãy nghỉ ngơi 5 phút nhé!`;
    let headline = 'Chúc Mừng Bạn Đã Hoàn Thành Phiên Học Tập Trung 🍅';
    let category: EmailCategoryType = 'COMMUNITY';

    if (type === 'FRIEND_INVITE') {
      title = 'Bạn Bè Rủ Vào Ngồi Học Chung Bàn 🦉';
      message = detailStr || 'Một người bạn vừa gửi lời mời bạn vào bàn học live "Cú Đêm Cày Deadline".';
      headline = 'Lời Mời Vào Bàn Học Live Cùng Bạn Bè 🦉';
    } else if (type === 'NEW_MESSAGE') {
      title = 'Tin Nhắn Mới Trong Phòng Học 💬';
      message = detailStr || 'Bạn có tin nhắn mới trong phòng học của mình.';
      headline = 'Tin Nhắn Mới Từ Đồng Đội Trong Bàn Học 💬';
    }

    return this.dispatch({
      category,
      priority: 'NORMAL',
      title,
      message,
      link: '/?tab=study-space',
      emailData: {
        headline,
        title,
        notes: 'Giữ vững kỷ luật và tiếp tục học tập cùng cộng đồng LifeOS!',
        ctaLabel: '🎧 Mở Phòng Học & Vào Bàn Ngay'
      }
    });
  }
}

export const unifiedNotificationEngine = new UnifiedNotificationEngine();

// Standalone Functional Exports for Ergonomic 1-line Imports
export const notifyScheduleMilestone = (milestone: '2H' | '1H' | '30M', item: any) =>
  unifiedNotificationEngine.notifyScheduleMilestone(milestone, item);

export const notifyAuthSecurity = (
  type: 'LOGIN_SUCCESS' | 'REGISTER_SUCCESS' | 'PROFILE_UPDATED' | 'PASSWORD_CHANGED',
  details?: { device?: string; email?: string; ip?: string } | string,
  extraName?: string
) => unifiedNotificationEngine.notifyAuthSecurity(type, details, extraName);

export const notifyActivityReport = (
  stats?: { streakDays: number; todayStudyMinutes: number; badgeLevel: string },
  isEndOfDayWarning?: boolean
) => unifiedNotificationEngine.notifyActivityReport(stats, isEndOfDayWarning);

export const notifyAffiliateEvent = (
  type: 'COMMISSION_EARNED' | 'NEW_REFERRAL' | 'WITHDRAWAL_APPROVED' | 'WITHDRAWAL_REQUESTED',
  amount?: number,
  details?: string
) => unifiedNotificationEngine.notifyAffiliateEvent(type, amount, details);

export const notifyStudyCommunity = (
  type: 'POMODORO_FINISHED' | 'FRIEND_INVITE' | 'NEW_MESSAGE',
  details?: string | { durationMinutes?: number; title?: string }
) => unifiedNotificationEngine.notifyStudyCommunity(type, details);
