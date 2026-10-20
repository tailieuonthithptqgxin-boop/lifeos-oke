/**
 * Responsive, Premium HTML Email Template for LifeOS Notifications
 */

export interface EmailTemplateOptions {
  recipientName?: string;
  headline: string;
  bodyHtml: string;
  categoryLabel?: string;
  categoryColor?: string;
  priority?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadataItems?: { label: string; value: string; isBold?: boolean }[];
  appBaseUrl?: string;
}

export function buildNotificationEmailHtml(options: EmailTemplateOptions): string {
  const {
    recipientName = 'Bạn',
    headline,
    bodyHtml,
    categoryLabel = 'Thông báo LifeOS',
    categoryColor = '#10B981', // Emerald default
    priority = 'NORMAL',
    actionUrl,
    actionLabel = 'Xem chi tiết trên LifeOS',
    metadataItems = [],
    appBaseUrl = 'https://www.quanlicanhan.online'
  } = options;

  const currentYear = new Date().getFullYear();
  const settingsUrl = `${appBaseUrl.replace(/\/$/, '')}/?tab=settings&view=notifications`;

  // Priority badge styling
  let priorityBadgeText = 'Bình thường';
  let priorityBadgeBg = '#F1F5F9';
  let priorityBadgeColor = '#475569';

  if (priority === 'CRITICAL') {
    priorityBadgeText = 'Khẩn cấp';
    priorityBadgeBg = '#FEE2E2';
    priorityBadgeColor = '#DC2626';
  } else if (priority === 'HIGH') {
    priorityBadgeText = 'Quan trọng';
    priorityBadgeBg = '#FEF3C7';
    priorityBadgeColor = '#D97706';
  } else if (priority === 'LOW') {
    priorityBadgeText = 'Tham khảo';
    priorityBadgeBg = '#F1F5F9';
    priorityBadgeColor = '#64748B';
  }

  // Render metadata rows if present
  const metadataRowsHtml = metadataItems.length > 0 ? `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; margin: 24px 0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        ${metadataItems.map(item => `
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 38%; vertical-align: top;">
              ${item.label}:
            </td>
            <td style="padding: 6px 0; font-size: 13px; color: #0F172A; ${item.isBold ? 'font-weight: 700;' : 'font-weight: 500;'} vertical-align: top;">
              ${item.value}
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  ` : '';

  // Render Action CTA Button if URL is provided
  const actionButtonHtml = actionUrl ? `
    <div style="margin: 30px 0 20px 0; text-align: center;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="25%" strokecolor="#059669" fillcolor="#10B981">
      <w:anchorlock/>
      <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${actionLabel}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${actionUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); letter-spacing: 0.2px;">
        ${actionLabel} &rarr;
      </a>
      <!--<![endif]-->
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #0F172A;
    }
    table {
      border-collapse: separate;
    }
    a {
      color: #10B981;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 12px !important;
      }
      .card {
        padding: 24px 18px !important;
        border-radius: 16px !important;
      }
    }
  </style>
</head>
<body style="background-color: #F1F5F9; padding: 24px 0;">
  <center>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="container">
      
      <!-- Top Branding Header -->
      <tr>
        <td style="padding: 16px 8px 24px 8px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="vertical-align: middle; padding-right: 10px;">
                <img src="${appBaseUrl.replace(/\/$/, '')}/logo.png" width="36" height="36" style="border-radius: 10px; display: block; object-fit: contain;" alt="LifeOS" />
              </td>
              <td style="vertical-align: middle;">
                <span style="font-size: 19px; font-weight: 900; color: #0F172A; letter-spacing: -0.5px;">LifeOS</span>
                <span style="font-size: 11px; font-weight: 800; background-color: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; padding: 2px 8px; border-radius: 999px; margin-left: 6px; text-transform: uppercase;">Engine</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Main White Card -->
      <tr>
        <td>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
            
            <!-- Category and Priority Badges -->
            <tr>
              <td>
                <div style="margin-bottom: 20px;">
                  <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${categoryColor}; background-color: #F8FAFC; border: 1px solid ${categoryColor}40; padding: 4px 10px; border-radius: 8px; margin-right: 6px;">
                    ${categoryLabel}
                  </span>
                  <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${priorityBadgeColor}; background-color: ${priorityBadgeBg}; padding: 4px 10px; border-radius: 8px;">
                    ${priorityBadgeText}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Headline -->
            <tr>
              <td>
                <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 900; color: #0F172A; line-height: 1.35; letter-spacing: -0.3px;">
                  ${headline}
                </h1>
              </td>
            </tr>

            <!-- Greeting & Main Message Body -->
            <tr>
              <td style="font-size: 15px; color: #334155; line-height: 1.6;">
                <p style="margin: 0 0 14px 0; font-weight: 600; color: #0F172A;">
                  Xin chào ${recipientName},
                </p>
                <div style="color: #475569; font-size: 14px; line-height: 1.65;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>

            <!-- Metadata Box -->
            ${metadataRowsHtml ? `<tr><td>${metadataRowsHtml}</td></tr>` : ''}

            <!-- CTA Button -->
            ${actionButtonHtml ? `<tr><td>${actionButtonHtml}</td></tr>` : ''}

            <!-- Friendly closing signature -->
            <tr>
              <td style="padding-top: 18px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #94A3B8;">
                <p style="margin: 0;">
                  Chúc bạn một ngày làm việc và học tập hiệu quả cùng <strong>LifeOS</strong>!
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- Footer Info & Settings -->
      <tr>
        <td style="padding: 24px 16px; text-align: center; font-size: 12px; color: #94A3B8; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;">
            Bạn nhận được thông báo này vì đã bật nhận tin trong Hệ điều hành Cá nhân <strong>LifeOS</strong>.
          </p>
          <p style="margin: 0;">
            <a href="${settingsUrl}" style="color: #64748B; text-decoration: underline; font-weight: 600;">Cài đặt Thông báo & Gmail</a>
            &nbsp;&bull;&nbsp;
            <a href="${appBaseUrl}" style="color: #64748B; text-decoration: underline; font-weight: 600;">Mở Dashboard</a>
          </p>
          <p style="margin: 12px 0 0 0; font-size: 11px; color: #CBD5E1;">
            &copy; ${currentYear} LifeOS — Gen-Z Personal Operating System. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>`;
}
