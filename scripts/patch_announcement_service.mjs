import fs from 'fs';

let code = fs.readFileSync('src/backend/services/announcement.service.ts', 'utf8');

// 1. Add import for buildAdminBroadcastGmailHTML & wordPressBridgeService
code = code.replace(
  "import { buildEmailHtml } from './emailTemplate.service.js';",
  `import { buildEmailHtml } from './emailTemplate.service.js';
import { buildAdminBroadcastGmailHTML } from './broadcastEmailTemplate.service.js';
import { wordPressBridgeService } from './wordpressBridge.service.js';`
);

// 2. Add interface fields
code = code.replace(
  `  actionUrl?: string | null;
  actionLabel?: string | null;
}`,
  `  actionUrl?: string | null;
  actionLabel?: string | null;
  imageUrl?: string | null;
  isPinned?: boolean;
  showLoginModal?: boolean;
  autoSendGmail?: boolean;
}`
);

// 3. Add AFFILIATE targeting in resolveTargetUsers
const targetAffiliateCode = `    if (targetAudience === 'PLAN_FREE') {
      return await prisma.user.findMany({
        where: { plan: 'FREE' },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    if (targetAudience === 'AFFILIATE') {
      return await prisma.user.findMany({
        where: { isAffiliate: true },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }`;

code = code.replace(
  `    if (targetAudience === 'PLAN_FREE') {
      return await prisma.user.findMany({
        where: { plan: 'FREE' },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }`,
  targetAffiliateCode
);

// 4. Save fields in createAnnouncement
const createFieldsTarget = `        actionUrl,
        actionLabel,
        createdById: adminUser.id,
        createdByName: adminUser.name`;

const createFieldsReplacement = `        actionUrl,
        actionLabel,
        imageUrl: input.imageUrl?.trim() || null,
        isPinned: Boolean(input.isPinned),
        showLoginModal: input.showLoginModal !== false,
        autoSendGmail: Boolean(input.autoSendGmail || input.channels === 'EMAIL' || input.channels === 'BOTH'),
        createdById: adminUser.id,
        createdByName: adminUser.name`;

code = code.replace(createFieldsTarget, createFieldsReplacement);

// 5. Update email HTML generation in publishAnnouncement
const oldEmailHtmlGen = `          // Generate Bento/Linear responsive HTML template
          const emailHtml = buildEmailHtml({
            headline: announcement.title,
            previewText: announcement.message.slice(0, 120),
            priority: announcement.priority === 'CRITICAL' ? 'CRITICAL' : announcement.priority === 'IMPORTANT' ? 'HIGH' : 'NORMAL',
            badgeText: announcement.priority === 'CRITICAL' ? 'THÔNG BÁO KHẨN CẤP' : (announcement.type || 'THÔNG BÁO HỆ THỐNG'),
            greeting: \`Xin chào \${user.name || 'bạn'},\`,
            paragraphs: [
              announcement.message
            ],
            detailsTable: [
              { label: 'Loại thông báo', value: announcement.type },
              { label: 'Mức độ ưu tiên', value: announcement.priority },
              { label: 'Kênh phát hành', value: 'Website & Gmail' }
            ],
            ctaButton: announcement.actionUrl ? {
              label: announcement.actionLabel || 'Xem trên website',
              url: announcement.actionUrl
            } : {
              label: 'Mở Life OS',
              url: process.env.APP_URL || 'http://localhost:3000'
            },
            footerNote: 'Đây là thông báo chính thức từ Ban Quản trị Life OS. Bạn có thể thay đổi tùy chọn thông báo trong trang Cài đặt tài khoản.'
          });`;

const newEmailHtmlGen = `          // Generate High-End Enterprise HTML Gmail Template
          const emailHtml = buildAdminBroadcastGmailHTML({
            title: announcement.title,
            message: announcement.message,
            type: announcement.type,
            priority: announcement.priority,
            imageUrl: announcement.imageUrl,
            actionLabel: announcement.actionLabel,
            actionUrl: announcement.actionUrl,
            recipientName: user.name,
            recipientEmail: user.email
          });`;

code = code.replace(oldEmailHtmlGen, newEmailHtmlGen);

// 6. Append new methods to AnnouncementService
const newMethods = `
  /**
   * User-facing: Get active published announcements targeted to the user
   */
  async getActiveAnnouncements(userId?: string) {
    const prisma = getPrisma();
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' }
      ]
    });

    let userRole = 'USER';
    let userPlan = 'FREE';
    let isAffiliate = false;

    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, plan: true, isAffiliate: true }
      });
      if (u) {
        userRole = u.role;
        userPlan = u.plan;
        isAffiliate = Boolean(u.isAffiliate);
      }
    }

    const filtered = announcements.filter(ann => {
      const aud = ann.targetAudience;
      if (aud === 'ALL') return true;
      if (aud === 'ROLE_ADMIN' && (userRole === 'ADMIN' || userRole === 'SUPERADMIN')) return true;
      if (aud === 'ROLE_USER' && userRole === 'USER') return true;
      if (aud === 'PLAN_PRO' && userPlan === 'PRO') return true;
      if (aud === 'PLAN_FREE' && userPlan === 'FREE') return true;
      if (aud === 'AFFILIATE' && isAffiliate) return true;
      if (aud === 'SELECTED_USERS' && ann.targetUserIds) {
        try {
          const ids = JSON.parse(ann.targetUserIds);
          if (Array.isArray(ids) && userId && ids.includes(userId)) return true;
        } catch {}
      }
      return false;
    });

    return filtered.map(ann => {
      let readByArr: string[] = [];
      try {
        if (ann.readBy) readByArr = JSON.parse(ann.readBy);
      } catch {}

      return {
        id: ann.id,
        title: ann.title,
        message: ann.message,
        type: ann.type,
        priority: ann.priority,
        imageUrl: ann.imageUrl,
        isPinned: ann.isPinned,
        showLoginModal: ann.showLoginModal,
        actionUrl: ann.actionUrl,
        actionLabel: ann.actionLabel,
        publishedAt: ann.publishedAt,
        clickCount: ann.clickCount,
        hasRead: userId ? readByArr.includes(userId) : false
      };
    });
  }

  /**
   * User-facing: Acknowledge announcement (Mark as read / Do not show modal again)
   */
  async acknowledgeAnnouncement(announcementId: string, userId: string) {
    const prisma = getPrisma();
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!ann) throw new Error('Announcement not found.');

    let readByArr: string[] = [];
    try {
      if (ann.readBy) readByArr = JSON.parse(ann.readBy);
    } catch {}

    if (!readByArr.includes(userId)) {
      readByArr.push(userId);
      await prisma.announcement.update({
        where: { id: announcementId },
        data: { readBy: JSON.stringify(readByArr) }
      });
    }

    // Also update AnnouncementDelivery if exists
    await prisma.announcementDelivery.updateMany({
      where: { announcementId, userId },
      data: { readAt: new Date() }
    });

    return { success: true };
  }

  /**
   * Track CTA button click
   */
  async trackClick(announcementId: string, userId?: string) {
    const prisma = getPrisma();
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { clickCount: { increment: 1 } }
    });

    if (userId) {
      await prisma.announcementDelivery.updateMany({
        where: { announcementId, userId },
        data: { clickedAt: new Date() }
      });
    }

    return { success: true };
  }

  /**
   * Admin: Toggle Pin / Unpin
   */
  async togglePin(announcementId: string, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!ann) throw new Error('Announcement not found.');

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: { isPinned: !ann.isPinned }
    });

    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'TOGGLE_PIN_ANNOUNCEMENT',
        beforeState: JSON.stringify({ isPinned: ann.isPinned }),
        afterState: JSON.stringify({ isPinned: updated.isPinned }),
        result: 'Success',
        reason: \`\${updated.isPinned ? 'Pinned' : 'Unpinned'} announcement "\${ann.title}"\`
      }
    });

    return { success: true, isPinned: updated.isPinned };
  }

  /**
   * Admin: Remind unread users
   */
  async remindUnread(announcementId: string, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!ann) throw new Error('Announcement not found.');

    let readByArr: string[] = [];
    try {
      if (ann.readBy) readByArr = JSON.parse(ann.readBy);
    } catch {}

    const targetUsers = await this.resolveTargetUsers(
      ann.targetAudience,
      ann.targetUserIds ? JSON.parse(ann.targetUserIds) : undefined
    );

    const unreadUsers = targetUsers.filter(u => !readByArr.includes(u.id));

    // Send fresh in-app notification to unread users
    let remindedCount = 0;
    for (const u of unreadUsers) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          announcementId: ann.id,
          title: \`[Nhắc lại] \${ann.title}\`,
          message: ann.message,
          type: ann.type.toLowerCase(),
          priority: ann.priority,
          actionUrl: ann.actionUrl,
          actionLabel: ann.actionLabel,
          read: false,
          date: new Date()
        }
      });
      remindedCount++;
    }

    return {
      success: true,
      remindedCount,
      message: \`Đã gửi lời nhắc lại thành công đến \${remindedCount} người dùng chưa xem.\`
    };
  }

  /**
   * Admin: Get Read Receipts
   */
  async getReadReceipts(announcementId: string) {
    const prisma = getPrisma();
    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        deliveries: {
          orderBy: { readAt: 'desc' }
        }
      }
    });

    if (!ann) throw new Error('Announcement not found.');

    let readByArr: string[] = [];
    try {
      if (ann.readBy) readByArr = JSON.parse(ann.readBy);
    } catch {}

    // Find users who have read
    const users = await prisma.user.findMany({
      where: { id: { in: readByArr } },
      select: { id: true, name: true, email: true, avatar: true }
    });

    const receipts = users.map(u => {
      const delivery = ann.deliveries.find(d => d.userId === u.id && d.readAt);
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        readAt: delivery?.readAt || ann.publishedAt || ann.createdAt,
        clickedAt: delivery?.clickedAt || null
      };
    });

    return {
      success: true,
      totalRecipients: ann.deliveries.length > 0 ? ann.deliveries.length : readByArr.length,
      totalRead: readByArr.length,
      clickCount: ann.clickCount,
      receipts
    };
  }
}
`;

code = code.replace(/export const announcementService = new AnnouncementService\(\);/, `${newMethods}\nexport const announcementService = new AnnouncementService();`);

fs.writeFileSync('src/backend/services/announcement.service.ts', code, 'utf8');
console.log('Successfully updated announcement.service.ts');
`;

fs.writeFileSync('scripts/patch_announcement_service.mjs', code, 'utf8');
