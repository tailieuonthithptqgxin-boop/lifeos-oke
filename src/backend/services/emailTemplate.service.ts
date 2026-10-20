import { getAppBaseUrl } from './gmailNotification.service.js';

export interface EmailTemplateData {
  badgeText?: string;
  badgeColor?: string;
  headline: string;
  previewText?: string;
  greeting?: string;
  recipientName?: string;
  summary?: string;
  paragraphs?: string[];
  details?: Array<{ label: string; value: string }>;
  detailsTable?: Array<{ label: string; value: string }>;
  actionLabel?: string;
  actionUrl?: string;
  ctaButton?: { label: string; url: string };
  footerNote?: string;
  priority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export function buildEmailHtml(data: EmailTemplateData): string {
  const appUrl = getAppBaseUrl();
  const ctaUrl = data.ctaButton?.url || data.actionUrl || appUrl;
  const ctaLabel = data.ctaButton?.label || data.actionLabel || 'Xem trên LifeOS';
  const badgeColor = data.badgeColor || (data.priority === 'CRITICAL' ? '#ef4444' : data.priority === 'HIGH' ? '#f59e0b' : '#10b981');
  const badgeText = data.badgeText || (data.priority === 'CRITICAL' ? 'KHẨN CẤP' : data.priority === 'HIGH' ? 'ƯU TIÊN' : 'THÔNG BÁO TỰ ĐỘNG');

  const rowsList = data.details || data.detailsTable || [];
  const detailsRows = rowsList
    .map(
      d => `
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; width: 35%; border-bottom: 1px solid #f1f5f9;">
          ${d.label}:
        </td>
        <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">
          ${d.value}
        </td>
      </tr>
    `
    )
    .join('');

  const bodyContent = data.paragraphs && data.paragraphs.length > 0
    ? data.paragraphs.map(p => `<p style="margin: 0 0 12px; font-size: 14px; color: #334155; line-height: 1.65;">${p}</p>`).join('')
    : `<div style="margin: 0 0 20px; font-size: 14px; color: #334155; line-height: 1.65;">${data.summary || ''}</div>`;

  const greetingText = data.greeting || (data.recipientName ? `Kính gửi ${data.recipientName},` : '');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${data.headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Container Box -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Top Header Brand & Badge -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 5px 12px; background: ${badgeColor}; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
                      ${badgeText}
                    </span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.35; color: #ffffff; letter-spacing: -0.3px;">
                      ${data.headline}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 28px; color: #334155; font-size: 14px; line-height: 1.6;">
              ${greetingText ? `<p style="margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #0f172a;">${greetingText}</p>` : ''}
              
              ${bodyContent}

              ${
                rowsList.length > 0
                  ? `
                <div style="margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    ${detailsRows}
                  </table>
                </div>
              `
                  : ''
              }

              ${
                (data.actionLabel || data.ctaButton)
                  ? `
                <div style="margin: 28px 0 10px; text-align: center;">
                  <a href="${ctaUrl}" style="display: inline-block; padding: 13px 32px; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                    ${ctaLabel} &rarr;
                  </a>
                </div>
              `
                  : ''
              }

              <!-- Security Footer Note -->
              <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
                ${data.footerNote || 'LifeOS System Notification &bull; Được gửi tự động từ máy chủ bảo mật LifeOS Cloud'}
              </div>
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
