// --------------------------------------------------------------------------
// Beautiful Gmail HTML Email Template Engine for LifeOS
// Inline-CSS compliant for 100% fidelity on Gmail iOS, Android & Desktop
// --------------------------------------------------------------------------

export type EmailCategoryType = 
  | 'SCHEDULE_2H' 
  | 'SCHEDULE_1H' 
  | 'DEADLINE_30M' 
  | 'SECURITY_LOGIN' 
  | 'ACTIVITY_REPORT' 
  | 'AFFILIATE' 
  | 'COMMUNITY'
  | 'GENERAL';

export interface BeautifulEmailData {
  recipientName?: string;
  recipientEmail?: string;
  category: EmailCategoryType;
  headline: string;
  badgeText?: string;
  priority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
  
  // Focus Info Box
  title: string;
  timeText?: string;
  timeLeftText?: string; // e.g. "Còn 2 giờ nữa", "Còn 1 giờ nữa", "Khẩn cấp: 30 phút nữa!"
  notes?: string;
  locationOrTopic?: string;
  
  // Real User Stats Box (Single Source of Truth)
  userStats?: {
    streakDays: number;
    todayStudyMinutes: number;
    badgeLevel: string;
  };
  
  // Custom message body
  message?: string;
  paragraphs?: string[];
  
  // Call To Action
  ctaLabel?: string;
  ctaUrl?: string;
  
  // Security / Audit extra details
  securityDetails?: {
    device?: string;
    ipAddress?: string;
    location?: string;
    timestamp?: string;
  };
}

interface BannerTheme {
  gradient: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  defaultBadge: string;
}

function getBannerTheme(category: EmailCategoryType): BannerTheme {
  switch (category) {
    case 'SCHEDULE_2H':
      return {
        gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        badgeBg: 'rgba(255, 255, 255, 0.25)',
        badgeText: '#ffffff',
        accentColor: '#2563eb',
        defaultBadge: '📅 NHẮC LỊCH TRƯỚC 2 GIỜ'
      };
    case 'SCHEDULE_1H':
      return {
        gradient: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)',
        badgeBg: 'rgba(255, 255, 255, 0.25)',
        badgeText: '#ffffff',
        accentColor: '#ea580c',
        defaultBadge: '⏰ SẴN SÀNG: TRƯỚC 1 GIỜ'
      };
    case 'DEADLINE_30M':
      return {
        gradient: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)',
        badgeBg: 'rgba(255, 255, 255, 0.3)',
        badgeText: '#ffffff',
        accentColor: '#dc2626',
        defaultBadge: '🚨 KHẨN CẤP: TRƯỚC 30 PHÚT'
      };
    case 'SECURITY_LOGIN':
      return {
        gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
        badgeBg: 'rgba(255, 255, 255, 0.25)',
        badgeText: '#ffffff',
        accentColor: '#7c3aed',
        defaultBadge: '🛡️ BẢO MẬT & ĐĂNG NHẬP'
      };
    case 'ACTIVITY_REPORT':
      return {
        gradient: 'linear-gradient(135deg, #065f46 0%, #0d9488 100%)',
        badgeBg: 'rgba(255, 255, 255, 0.25)',
        badgeText: '#ffffff',
        accentColor: '#0d9488',
        defaultBadge: '📊 BÁO CÁO HOẠT ĐỘNG'
      };
    case 'AFFILIATE':
      return {
        gradient: 'linear-gradient(135deg, #854d0e 0%, #d97706 100%)',
        badgeBg: 'rgba(255, 255, 255, 0.25)',
        badgeText: '#ffffff',
        accentColor: '#d97706',
        defaultBadge: '💰 HOA HỒNG & CỘNG TÁC VIÊN'
      };
    case 'COMMUNITY':
      return {
        gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
        badgeBg: 'rgba(255, 255, 255, 0.25)',
        badgeText: '#ffffff',
        accentColor: '#6366f1',
        defaultBadge: '👥 PHÒNG HỌC & BẠN BÈ'
      };
    default:
      return {
        gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        badgeBg: 'rgba(255, 255, 255, 0.25)',
        badgeText: '#ffffff',
        accentColor: '#3b82f6',
        defaultBadge: '🔔 THÔNG BÁO TỰ ĐỘNG'
      };
  }
}

/**
 * Builds a modern, luxury, inline-styled HTML email that renders with 100% fidelity
 * on Gmail iOS, Gmail Android, Web Gmail, Apple Mail, and Outlook.
 */
export function buildBeautifulGmailHTML(data: BeautifulEmailData): string {
  const theme = getBannerTheme(data.category);
  const badgeLabel = data.badgeText || theme.defaultBadge;
  const appUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://lifeos.vn';
  const ctaUrl = data.ctaUrl || appUrl;
  const ctaLabel = data.ctaLabel || '🚀 Mở Thời Gian Biểu & Vào Học Ngay';
  
  const currentTimestamp = new Date().toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const streakDays = data.userStats?.streakDays ?? 0;
  const todayMinutes = data.userStats?.todayStudyMinutes ?? 0;
  const badgeLevel = data.userStats?.badgeLevel ?? 'Tân Binh';

  // Format paragraphs
  const messageBody = data.paragraphs && data.paragraphs.length > 0
    ? data.paragraphs.map(p => `<p style="margin: 0 0 12px; font-size: 14px; line-height: 1.65; color: #334155;">${p}</p>`).join('')
    : (data.message ? `<p style="margin: 0 0 14px; font-size: 14px; line-height: 1.65; color: #334155;">${data.message}</p>` : '');

  // Security details block if applicable
  const securityBlock = data.securityDetails ? `
    <div style="margin: 18px 0; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Chi Tiết Phiên Đăng Nhập / Thiết Bị
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #334155;">
        ${data.securityDetails.device ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b; width: 35%;">Thiết bị:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #0f172a;">${data.securityDetails.device}</td>
          </tr>` : ''}
        ${data.securityDetails.ipAddress ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Địa chỉ IP:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #0f172a; font-family: monospace;">${data.securityDetails.ipAddress}</td>
          </tr>` : ''}
        ${data.securityDetails.location ? `
          <tr>
            <td style="padding: 3px 0; color: #64748b;">Khu vực:</td>
            <td style="padding: 3px 0; font-weight: 700; color: #0f172a;">${data.securityDetails.location}</td>
          </tr>` : ''}
        <tr>
          <td style="padding: 3px 0; color: #64748b;">Thời gian:</td>
          <td style="padding: 3px 0; font-weight: 700; color: #0f172a;">${data.securityDetails.timestamp || currentTimestamp}</td>
        </tr>
      </table>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 8px;">
    <tr>
      <td align="center">
        <!-- Main Card Container: max-width 520px -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 30px -8px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- 1. BANNER HEADER: Dynamic Color by Category -->
          <tr>
            <td style="background: ${theme.gradient}; padding: 30px 24px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Pill Badge -->
                    <span style="display: inline-block; padding: 5px 12px; background-color: ${theme.badgeBg}; color: ${theme.badgeText}; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.2);">
                      ${badgeLabel}
                    </span>
                    <!-- Main Headline -->
                    <h1 style="margin: 0; font-size: 21px; font-weight: 900; line-height: 1.35; color: #ffffff; letter-spacing: -0.3px;">
                      ${data.headline}
                    </h1>
                    <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.85); line-height: 1.4;">
                      Trợ lý Kỷ Luật & Thông Báo Tự Động LifeOS
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. MAIN BODY CONTENT -->
          <tr>
            <td style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #0f172a;">
                Chào ${data.recipientName || 'bạn'},
              </p>

              <!-- Optional custom message -->
              ${messageBody}

              <!-- 3. FOCUS INFORMATION BOX (Khung Thông Tin Trọng Tâm) -->
              <div style="margin: 18px 0; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px 20px;">
                <div style="font-size: 11px; font-weight: 800; color: ${theme.accentColor}; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">
                  📌 THÔNG TIN TRỌNG TÂM
                </div>
                
                <div style="font-size: 17px; font-weight: 900; color: #0f172a; margin-bottom: 10px; line-height: 1.35;">
                  ${data.title}
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                  ${data.timeText ? `
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: 600; width: 34%;">🕒 Giờ diễn ra:</td>
                      <td style="padding: 5px 0; color: #0f172a; font-weight: 800;">${data.timeText}</td>
                    </tr>` : ''}
                  ${data.timeLeftText ? `
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: 600;">⏳ Thời gian còn:</td>
                      <td style="padding: 5px 0; color: ${theme.accentColor}; font-weight: 900; font-size: 14px;">${data.timeLeftText}</td>
                    </tr>` : ''}
                  ${data.locationOrTopic ? `
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: 600;">📍 Địa điểm / Vibe:</td>
                      <td style="padding: 5px 0; color: #0f172a; font-weight: 700;">${data.locationOrTopic}</td>
                    </tr>` : ''}
                  ${data.notes ? `
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: 600; vertical-align: top;">📝 Ghi chú:</td>
                      <td style="padding: 5px 0; color: #475569; font-weight: 600; line-height: 1.45;">${data.notes}</td>
                    </tr>` : ''}
                </table>
              </div>

              <!-- Security block if any -->
              ${securityBlock}

              <!-- 4. REAL USER STATS BOX (Dữ Liệu Thật 100% Single Source of Truth) -->
              <div style="margin: 20px 0; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 14px; padding: 14px 16px;">
                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; text-align: center;">
                  ⚡ TIẾN ĐỘ THẬT CỦA BẠN TRÊN LIFEOS
                </div>
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <!-- Stat 1: Streak -->
                    <td align="center" style="width: 33.3%; padding: 4px; border-right: 1px solid #f1f5f9;">
                      <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Chuỗi ngày</div>
                      <div style="font-size: 16px; font-weight: 900; color: #f59e0b;">🔥 ${streakDays} ngày</div>
                    </td>
                    <!-- Stat 2: Today Minutes -->
                    <td align="center" style="width: 33.3%; padding: 4px; border-right: 1px solid #f1f5f9;">
                      <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Hôm nay</div>
                      <div style="font-size: 16px; font-weight: 900; color: #2563eb;">⏱️ ${todayMinutes}p</div>
                    </td>
                    <!-- Stat 3: Badge -->
                    <td align="center" style="width: 33.3%; padding: 4px;">
                      <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Danh hiệu</div>
                      <div style="font-size: 14px; font-weight: 900; color: #7c3aed;">🏆 ${badgeLevel}</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- 5. PROMINENT CTA BUTTON -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 10px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: ${theme.accentColor}; color: #ffffff; font-size: 14px; font-weight: 900; text-decoration: none; padding: 14px 28px; border-radius: 14px; box-shadow: 0 4px 14px -2px rgba(0, 0, 0, 0.15); letter-spacing: 0.2px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 6. FOOTER -->
          <tr>
            <td style="padding: 18px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #64748b; line-height: 1.45;">
                Thư được gửi tự động lúc <strong>${currentTimestamp}</strong> từ Hệ thống Thông báo LifeOS.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Thông báo gửi đến <strong>${data.recipientEmail || 'bạn'}</strong>. LifeOS cam kết bảo mật 100% dữ liệu cá nhân.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Quick Sample Payload Generators for 1-Tap Preview and Testing
 */
export const SAMPLE_EMAIL_PREVIEWS: Record<EmailCategoryType, (stats?: any) => BeautifulEmailData> = {
  SCHEDULE_2H: (stats) => ({
    recipientName: 'Bạn',
    category: 'SCHEDULE_2H',
    headline: 'Nhắc Lịch: Còn 2 Giờ Nữa Bắt Đầu Ca Học 🦉',
    title: 'Ôn tập Giải Tích 2 & Làm bài tập chương 4',
    timeText: '14:00 - 16:30 (Hôm nay)',
    timeLeftText: 'Còn 2 giờ nữa (120 phút)',
    locationOrTopic: 'Bàn học Lo-Fi • Phòng Cú Đêm Cày Deadline',
    notes: 'Chuẩn bị sẵn tài liệu chương 4, bình nước và tai nghe để tập trung 100%.',
    ctaLabel: '🚀 Mở Lịch & Chuẩn Bị Vào Bàn',
    userStats: stats || { streakDays: 7, todayStudyMinutes: 45, badgeLevel: 'Chiến Binh' }
  }),

  SCHEDULE_1H: (stats) => ({
    recipientName: 'Bạn',
    category: 'SCHEDULE_1H',
    headline: 'Sẵn Sàng: Còn 1 Giờ Nữa Đến Giờ Họp / Học ⏰',
    title: 'Họp Nhóm Đồ Án Cuối Kỳ & Review Code',
    timeText: '15:00 - 16:00 (Hôm nay)',
    timeLeftText: 'Còn đúng 60 phút nữa!',
    locationOrTopic: 'Phòng Họp Online / Bàn Học Trạng Thái Động',
    notes: 'Hãy mở máy tính, kiểm tra micro và xem lại slide báo cáo.',
    ctaLabel: '🚀 Vào Bàn Học / Phòng Họp Ngay',
    userStats: stats || { streakDays: 7, todayStudyMinutes: 60, badgeLevel: 'Chiến Binh' }
  }),

  DEADLINE_30M: (stats) => ({
    recipientName: 'Bạn',
    category: 'DEADLINE_30M',
    priority: 'CRITICAL',
    headline: '🚨 Báo Động Khẩn: Deadline Sắp Hết Hạn Sau 30 Phút!',
    title: 'Hạn chót Nộp Báo Cáo Tài Chính & Đồ Án',
    timeText: '23:59:00 (Đêm nay)',
    timeLeftText: 'Chỉ còn 30 phút cuối cùng!',
    notes: 'Kiểm tra file nộp, xuất PDF và bấm nộp ngay để không bị trễ hạn!',
    ctaLabel: '⚡ Mở Nhiệm Vụ & Nộp Bài Ngay Lập Tức',
    userStats: stats || { streakDays: 7, todayStudyMinutes: 90, badgeLevel: 'Chiến Binh' }
  }),

  SECURITY_LOGIN: (stats) => ({
    recipientName: 'Bạn',
    category: 'SECURITY_LOGIN',
    headline: 'Bảo Mật: Đăng Nhập Thành Công Thiết Bị Mới 🛡️',
    title: 'Xác thực Phiên Làm Việc Mới Trên LifeOS',
    timeText: 'Vừa xong',
    securityDetails: {
      device: 'Google Chrome / Windows 11 (Desktop)',
      ipAddress: '113.161.88.24',
      location: 'Hồ Chí Minh, Việt Nam',
      timestamp: new Date().toLocaleString('vi-VN')
    },
    message: 'Tài khoản LifeOS của bạn vừa được đăng nhập thành công. Nếu chính là bạn, hãy an tâm tiếp tục học tập. Nếu không phải bạn, hãy bấm đổi mật khẩu ngay bên dưới.',
    ctaLabel: '🔒 Quản Lý Bảo Mật & Đổi Mật Khẩu',
    userStats: stats || { streakDays: 7, todayStudyMinutes: 0, badgeLevel: 'Chiến Binh' }
  }),

  ACTIVITY_REPORT: (stats) => ({
    recipientName: 'Bạn',
    category: 'ACTIVITY_REPORT',
    headline: 'Báo Cáo Kỷ Luật & Hoạt Động Trong Ngày 📊',
    title: 'Tổng kết ngày: 3 Nhiệm vụ hoàn thành • 120 phút tập trung',
    timeText: 'Hôm nay',
    notes: 'Bạn đã hoàn thành 100% mục tiêu cốt lõi hôm nay và giữ vững chuỗi kỷ luật!',
    paragraphs: [
      'Hôm nay là một ngày năng suất tuyệt vời của bạn! Tất cả các nhiệm vụ quan trọng đều đã được xử lý gọn gàng.',
      'Hãy tiếp tục duy trì nhịp độ này vào ngày mai nhé. Sự kiên trì mỗi ngày sẽ tạo nên kết quả phi thường!'
    ],
    ctaLabel: '📈 Xem Thống Kê Chi Tiết Trên LifeOS',
    userStats: stats || { streakDays: 7, todayStudyMinutes: 120, badgeLevel: 'Chiến Binh' }
  }),

  AFFILIATE: (stats) => ({
    recipientName: 'Bạn',
    category: 'AFFILIATE',
    headline: 'Chúc Mừng: Bạn Vừa Được Cộng Hoa Hồng Mới 💰',
    title: 'Hoa hồng +100.000đ từ đơn hàng của bạn bè',
    timeText: 'Vừa xong',
    timeLeftText: 'Số dư khả dụng: 140.000đ',
    notes: 'Người bạn được bạn giới thiệu vừa nâng cấp gói Pro. Hoa hồng 20% đã được tự động cộng vào tài khoản Cộng tác viên của bạn.',
    ctaLabel: '💼 Mở Cổng Cộng Tác Viên & Rút Tiền',
    userStats: stats || { streakDays: 7, todayStudyMinutes: 45, badgeLevel: 'Chiến Binh' }
  }),

  COMMUNITY: (stats) => ({
    recipientName: 'Bạn',
    category: 'COMMUNITY',
    headline: 'Bạn Bè Rủ Vào Phòng Học: "Cú Đêm Cày Deadline" 🦉',
    title: 'Minh Thảo vừa gửi lời mời vào bàn học cùng',
    timeText: 'Đang diễn ra live',
    locationOrTopic: '🌧️ Góc Cafe Mưa Đà Lạt (Lo-Fi & Chill)',
    notes: 'Có 18 bạn đang ngồi học live, mở nhạc Lo-Fi và giữ kỷ luật.',
    ctaLabel: '🎧 Vào Bàn Học Cùng Bạn Bè Ngay',
    userStats: stats || { streakDays: 7, todayStudyMinutes: 30, badgeLevel: 'Chiến Binh' }
  }),

  GENERAL: (stats) => ({
    recipientName: 'Bạn',
    category: 'GENERAL',
    headline: 'Thông Báo Tự Động Từ LifeOS 🔔',
    title: 'Cập nhật hệ thống và nhiệm vụ cần làm',
    timeText: 'Hôm nay',
    notes: 'Hãy kiểm tra danh sách nhiệm vụ hôm nay để không bỏ lỡ công việc quan trọng.',
    ctaLabel: '🚀 Mở Trang Chủ LifeOS',
    userStats: stats || { streakDays: 7, todayStudyMinutes: 0, badgeLevel: 'Tân Binh' }
  })
};
