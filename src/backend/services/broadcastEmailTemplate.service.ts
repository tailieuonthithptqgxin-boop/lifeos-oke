import { getAppBaseUrl } from './gmailNotification.service.js';

export interface AdminBroadcastEmailOptions {
  title: string;
  message: string;
  type: string; // 'EMERGENCY' | 'FEATURE' | 'AFFILIATE' | 'STUDY' | 'GENERAL'
  priority?: string;
  imageUrl?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
  recipientName?: string;
  recipientEmail?: string;
}

export function buildAdminBroadcastGmailHTML(options: AdminBroadcastEmailOptions): string {
  const appUrl = getAppBaseUrl();
  const ctaUrl = options.actionUrl || appUrl;
  const ctaLabel = options.actionLabel || 'Truy Cập LifeOS Ngay';

  // Determine Category Theme & Badge
  let badgeColor = '#059669';
  let badgeText = '📢 THÔNG BÁO TỪ BAN QUẢN TRỊ';
  let accentGradient = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';

  const normalizedType = (options.type || '').toUpperCase();
  if (normalizedType === 'SECURITY' || normalizedType === 'CRITICAL' || normalizedType === 'EMERGENCY' || normalizedType === 'MAINTENANCE') {
    badgeColor = '#dc2626';
    badgeText = '🚨 THÔNG BÁO KHẨN CẤP';
    accentGradient = 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)';
  } else if (normalizedType === 'FEATURE' || normalizedType === 'EVENT') {
    badgeColor = '#7c3aed';
    badgeText = '🎉 CẬP NHẬT TÍNH NĂNG MỚI';
    accentGradient = 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)';
  } else if (normalizedType === 'AFFILIATE' || normalizedType === 'REFERRAL') {
    badgeColor = '#d97706';
    badgeText = '💸 DÀNH CHO CỘNG TÁC VIÊN (AFFILIATE)';
    accentGradient = 'linear-gradient(135deg, #78350f 0%, #d97706 100%)';
  } else if (normalizedType === 'STUDY' || normalizedType === 'MOTIVATION') {
    badgeColor = '#059669';
    badgeText = '📚 NHẮC NHỞ HỌC TẬP & KỶ LUẬT';
    accentGradient = 'linear-gradient(135deg, #064e3b 0%, #059669 100%)';
  }

  const paragraphs = options.message
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p style="margin: 0 0 14px; font-size: 15px; color: #334155; line-height: 1.7;">${p}</p>`)
    .join('');

  const greeting = options.recipientName
    ? `Kính gửi <strong>${options.recipientName}</strong>,`
    : 'Kính gửi Quý thành viên LifeOS,';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${options.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: ${accentGradient}; padding: 36px 32px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Brand Top Bar -->
                    <div style="margin-bottom: 16px;">
                      <span style="display: inline-block; padding: 6px 14px; background: rgba(255, 255, 255, 0.18); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;">
                        ${badgeText}
                      </span>
                    </div>

                    <!-- Email Headline -->
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; line-height: 1.35; color: #ffffff; letter-spacing: -0.3px;">
                      ${options.title}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Attached Image (if provided) -->
          ${options.imageUrl ? `
          <tr>
            <td style="padding: 24px 32px 0 32px; background-color: #ffffff;">
              <img src="${options.imageUrl}" alt="Announcement attachment" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 16px; border: 1px solid #e2e8f0; display: block;" />
            </td>
          </tr>
          ` : ''}

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 32px; color: #334155; font-size: 15px; line-height: 1.7;">
              <!-- Greeting -->
              <p style="margin: 0 0 18px; font-size: 16px; font-weight: 700; color: #0f172a;">
                ${greeting}
              </p>

              <!-- Main Message -->
              <div style="margin-bottom: 24px;">
                ${paragraphs}
              </div>

              <!-- CTA Button Box -->
              <div style="margin: 32px 0 24px; text-align: center;">
                <a href="${ctaUrl}" style="display: inline-block; padding: 15px 36px; background: ${badgeColor}; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; border-radius: 14px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15); letter-spacing: -0.2px;">
                  ${ctaLabel} &rarr;
                </a>
              </div>

              <!-- Official Signature -->
              <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 4px; font-size: 14px; color: #64748b;">Trân trọng,</p>
                <p style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">Ban Quản Trị Hệ Thống LifeOS Cloud</p>
                <p style="margin: 2px 0 0; font-size: 12px; color: #94a3b8;">Nền tảng Quản lý Học tập, Kỷ luật & Phát triển Bản thân</p>
              </div>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
              <p style="margin: 0 0 6px;">
                Bạn nhận được email này vì đã đăng ký tài khoản trên <strong>LifeOS</strong> (${appUrl}).
              </p>
              <p style="margin: 0;">
                Nếu nút bấm không hoạt động, vui lòng sao chép đường link sau vào trình duyệt: <br>
                <a href="${ctaUrl}" style="color: #64748b; word-break: break-all;">${ctaUrl}</a>
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
}
