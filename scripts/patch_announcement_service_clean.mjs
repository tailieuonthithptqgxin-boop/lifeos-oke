import fs from 'fs';

let content = fs.readFileSync('src/backend/services/announcement.service.ts', 'utf8');

// 1. Add imports
if (!content.includes('buildAdminBroadcastGmailHTML')) {
  content = content.replace(
    "import { buildEmailHtml } from './emailTemplate.service.js';",
    "import { buildEmailHtml } from './emailTemplate.service.js';\nimport { buildAdminBroadcastGmailHTML } from './broadcastEmailTemplate.service.js';\nimport { wordPressBridgeService } from './wordpressBridge.service.js';"
  );
}

// 2. Add interface fields
if (!content.includes('showLoginModal?: boolean')) {
  content = content.replace(
    "  actionUrl?: string | null;\n  actionLabel?: string | null;\n}",
    "  actionUrl?: string | null;\n  actionLabel?: string | null;\n  imageUrl?: string | null;\n  isPinned?: boolean;\n  showLoginModal?: boolean;\n  autoSendGmail?: boolean;\n}"
  );
}

// 3. Add AFFILIATE targeting
if (!content.includes("targetAudience === 'AFFILIATE'")) {
  content = content.replace(
    "if (targetAudience === 'PLAN_FREE') {",
    "if (targetAudience === 'AFFILIATE') {\n      return await prisma.user.findMany({\n        where: { isAffiliate: true },\n        select: { id: true, name: true, email: true, role: true, plan: true, status: true }\n      });\n    }\n\n    if (targetAudience === 'PLAN_FREE') {"
  );
}

// 4. Save fields in createAnnouncement
if (!content.includes('imageUrl: input.imageUrl')) {
  content = content.replace(
    "actionLabel,\n        createdById: adminUser.id,",
    "actionLabel,\n        imageUrl: input.imageUrl?.trim() || null,\n        isPinned: Boolean(input.isPinned),\n        showLoginModal: input.showLoginModal !== false,\n        autoSendGmail: Boolean(input.autoSendGmail || input.channels === 'EMAIL' || input.channels === 'BOTH'),\n        createdById: adminUser.id,"
  );
}

// 5. Update email HTML generation in publishAnnouncement
if (!content.includes('buildAdminBroadcastGmailHTML({')) {
  content = content.replace(
    "const emailHtml = buildEmailHtml({",
    "const emailHtml = buildAdminBroadcastGmailHTML({\n            title: announcement.title,\n            message: announcement.message,\n            type: announcement.type,\n            priority: announcement.priority,\n            imageUrl: (announcement as any).imageUrl,\n            actionLabel: announcement.actionLabel,\n            actionUrl: announcement.actionUrl,\n            recipientName: user.name,\n            recipientEmail: user.email\n          });\n          const _ignore = buildEmailHtml({"
  );
}

// 6. Append helper methods
const methodsToAdd = `
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

    await prisma.announcementDelivery.updateMany({
      where: { announcementId, userId },
      data: { readAt: new Date() }
    });

    return { success: true };
  }

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

  async togglePin(announcementId: string, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!ann) throw new Error('Announcement not found.');

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: { isPinned: !ann.isPinned }
    });

    return { success: true, isPinned: updated.isPinned };
  }

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

    let remindedCount = 0;
    for (const u of unreadUsers) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          announcementId: ann.id,
          title: '[Nhắc lại] ' + ann.title,
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
      message: 'Đã gửi lời nhắc lại thành công đến ' + remindedCount + ' người dùng chưa xem.'
    };
  }

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

export const announcementService = new AnnouncementService();
`;

if (!content.includes('getActiveAnnouncements(')) {
  content = content.replace(
    'export const announcementService = new AnnouncementService();',
    methodsToAdd
  );
}

fs.writeFileSync('src/backend/services/announcement.service.ts', content, 'utf8');
console.log('Successfully patched announcement.service.ts cleanly!');
