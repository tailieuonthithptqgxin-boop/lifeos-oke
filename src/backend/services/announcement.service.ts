import { getPrisma } from '../db.js';
import { gmailService } from './gmailNotification.service.js';
import { emailQueueService } from './emailQueue.service.js';
import { buildEmailHtml } from './emailTemplate.service.js';

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  type?: 'GENERAL' | 'MAINTENANCE' | 'FEATURE' | 'SECURITY' | 'PROMOTION';
  priority?: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  targetAudience: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ROLE_ADMIN' | 'ROLE_USER' | 'PLAN_PRO' | 'PLAN_FREE' | 'PLAN_TEAM' | 'SELECTED_USERS';
  targetUserIds?: string[];
  channels: 'WEB' | 'EMAIL' | 'BOTH';
  scheduledFor?: string | null;
  expiresAt?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
}

class AnnouncementService {
  /**
   * Determine target users strictly based on targetAudience specification
   */
  async resolveTargetUsers(targetAudience: string, targetUserIds?: string[]): Promise<Array<{ id: string; name: string; email: string; role: string; plan: string; status: string }>> {
    const prisma = getPrisma();

    if (targetAudience === 'SELECTED_USERS') {
      if (!targetUserIds || targetUserIds.length === 0) return [];
      return await prisma.user.findMany({
        where: { id: { in: targetUserIds } },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    if (targetAudience === 'ROLE_ADMIN') {
      return await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    if (targetAudience === 'ROLE_USER') {
      return await prisma.user.findMany({
        where: { role: 'USER' },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    if (targetAudience === 'PLAN_PRO') {
      return await prisma.user.findMany({
        where: { plan: 'PRO' },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    if (targetAudience === 'PLAN_TEAM') {
      return await prisma.user.findMany({
        where: { plan: 'TEAM' },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    if (targetAudience === 'PLAN_FREE') {
      return await prisma.user.findMany({
        where: { plan: 'FREE' },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    if (targetAudience === 'ACTIVE') {
      return await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    if (targetAudience === 'INACTIVE') {
      return await prisma.user.findMany({
        where: { status: { in: ['SUSPENDED', 'DISABLED'] } },
        select: { id: true, name: true, email: true, role: true, plan: true, status: true }
      });
    }

    // Default 'ALL': all registered users
    return await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, plan: true, status: true }
    });
  }

  /**
   * Admin: Create Announcement record (Draft or Published)
   */
  async createAnnouncement(input: CreateAnnouncementInput, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();

    const title = input.title.trim();
    const message = input.message.trim();
    if (!title || !message) {
      throw new Error('Title and message are required.');
    }

    const type = input.type || 'GENERAL';
    const priority = input.priority || 'NORMAL';
    const targetAudience = input.targetAudience || 'ALL';
    const channels = input.channels || 'WEB';
    const actionUrl = input.actionUrl?.trim() || null;
    const actionLabel = input.actionLabel?.trim() || null;
    const targetUserIdsStr = input.targetUserIds ? JSON.stringify(input.targetUserIds) : null;
    const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    const isScheduled = scheduledFor && scheduledFor.getTime() > Date.now();
    const status = isScheduled ? 'SCHEDULED' : 'DRAFT';

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type,
        priority,
        targetAudience,
        targetUserIds: targetUserIdsStr,
        channels,
        status,
        scheduledFor,
        expiresAt,
        actionUrl,
        actionLabel,
        createdById: adminUser.id,
        createdByName: adminUser.name
      }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'CREATE_ANNOUNCEMENT',
        beforeState: null,
        afterState: JSON.stringify({ id: announcement.id, title, targetAudience, channels, status }),
        result: 'Success',
        reason: `Created announcement "${title}" (Status: ${status})`
      }
    });

    return announcement;
  }

  /**
   * Admin: Publish Announcement
   * Creates per-user in-app Notification records AND dispatches email delivery
   */
  async publishAnnouncement(id: string, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();

    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      throw new Error('Announcement not found.');
    }

    if (announcement.status === 'PUBLISHED') {
      throw new Error('Announcement has already been published.');
    }

    // Set status to PUBLISHING
    await prisma.announcement.update({
      where: { id },
      data: { status: 'PUBLISHING' }
    });

    try {
      let targetUserIdsParsed: string[] | undefined;
      if (announcement.targetUserIds) {
        try {
          targetUserIdsParsed = JSON.parse(announcement.targetUserIds);
        } catch {
          targetUserIdsParsed = undefined;
        }
      }

      const targetUsers = await this.resolveTargetUsers(announcement.targetAudience, targetUserIdsParsed);
      if (targetUsers.length === 0) {
        await prisma.announcement.update({
          where: { id },
          data: { status: 'PUBLISHED', publishedAt: new Date() }
        });
        return {
          announcement,
          targetedCount: 0,
          webDelivered: 0,
          emailDelivered: 0,
          emailFailed: 0
        };
      }

      const isWebEnabled = announcement.channels === 'WEB' || announcement.channels === 'BOTH';
      const isEmailEnabled = announcement.channels === 'EMAIL' || announcement.channels === 'BOTH';

      let webCount = 0;
      let emailSuccessCount = 0;
      let emailFailedCount = 0;

      // 1. Web Notification Creation (Individual user isolation)
      if (isWebEnabled) {
        for (const user of targetUsers) {
          // Check duplicate delivery protection
          const existingWebDelivery = await prisma.announcementDelivery.findUnique({
            where: {
              announcementId_userId_channel: {
                announcementId: announcement.id,
                userId: user.id,
                channel: 'WEB'
              }
            }
          });

          if (!existingWebDelivery) {
            await prisma.notification.create({
              data: {
                userId: user.id,
                announcementId: announcement.id,
                title: announcement.title,
                message: announcement.message,
                type: announcement.type.toLowerCase(),
                priority: announcement.priority,
                actionUrl: announcement.actionUrl,
                actionLabel: announcement.actionLabel,
                read: false,
                date: new Date()
              }
            });

            await prisma.announcementDelivery.create({
              data: {
                announcementId: announcement.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                channel: 'WEB',
                status: 'SENT',
                sentAt: new Date()
              }
            });
            webCount++;
          }
        }
      }

      // 2. Email Delivery Queueing (Outbox Pattern via emailQueueService)
      let emailEnqueuedCount = 0;
      let emailSkippedCount = 0;

      if (isEmailEnabled) {
        // Fetch preferences for all target users in a single batch
        const userIds = targetUsers.map(u => u.id);
        const prefs = await prisma.userNotificationPreference.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, emailEnabled: true }
        });
        const prefMap = new Map(prefs.map(p => [p.userId, p.emailEnabled]));

        const isBypassPreference =
          announcement.priority === 'CRITICAL' ||
          announcement.priority === 'IMPORTANT' ||
          announcement.type === 'SECURITY' ||
          announcement.type === 'MAINTENANCE';

        for (const user of targetUsers) {
          if (!user.email) continue;

          // Check duplicate delivery protection
          const existingEmailDelivery = await prisma.announcementDelivery.findUnique({
            where: {
              announcementId_userId_channel: {
                announcementId: announcement.id,
                userId: user.id,
                channel: 'EMAIL'
              }
            }
          });

          if (existingEmailDelivery && (existingEmailDelivery.status === 'SENT' || existingEmailDelivery.status === 'PENDING')) {
            continue;
          }

          // Respect user email notification settings for standard broadcasts
          const userEmailAllowed = prefMap.has(user.id) ? prefMap.get(user.id) : true;
          if (!userEmailAllowed && !isBypassPreference) {
            // User opted out of promotional/normal broadcast emails
            if (!existingEmailDelivery) {
              await prisma.announcementDelivery.create({
                data: {
                  announcementId: announcement.id,
                  userId: user.id,
                  userEmail: user.email,
                  userName: user.name,
                  channel: 'EMAIL',
                  status: 'SKIPPED',
                  errorMessage: 'Người dùng đã tắt nhận email thông báo thông thường trong cài đặt'
                }
              });
            } else {
              await prisma.announcementDelivery.update({
                where: { id: existingEmailDelivery.id },
                data: {
                  status: 'SKIPPED',
                  errorMessage: 'Người dùng đã tắt nhận email thông báo thông thường trong cài đặt'
                }
              });
            }
            emailSkippedCount++;
            continue;
          }

          // Create or update delivery record to PENDING
          const deliveryRecord = existingEmailDelivery
            ? await prisma.announcementDelivery.update({
                where: { id: existingEmailDelivery.id },
                data: { status: 'PENDING', errorMessage: null }
              })
            : await prisma.announcementDelivery.create({
                data: {
                  announcementId: announcement.id,
                  userId: user.id,
                  userEmail: user.email,
                  userName: user.name,
                  channel: 'EMAIL',
                  status: 'PENDING'
                }
              });

          // Generate Bento/Linear responsive HTML template
          const emailHtml = buildEmailHtml({
            headline: announcement.title,
            previewText: announcement.message.slice(0, 120),
            priority: announcement.priority === 'CRITICAL' ? 'CRITICAL' : announcement.priority === 'IMPORTANT' ? 'HIGH' : 'NORMAL',
            badgeText: announcement.priority === 'CRITICAL' ? 'THÔNG BÁO KHẨN CẤP' : (announcement.type || 'THÔNG BÁO HỆ THỐNG'),
            greeting: `Xin chào ${user.name || 'bạn'},`,
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
          });

          // Enqueue into persistent Outbox Queue (Non-blocking, background worker will deliver with retries)
          await emailQueueService.enqueue({
            recipient: user.email,
            subject: `[Life OS] ${announcement.title}`,
            htmlBody: emailHtml,
            eventType: 'ADMIN_BROADCAST',
            metadata: {
              announcementId: announcement.id,
              announcementDeliveryId: deliveryRecord.id,
              userId: user.id
            }
          });

          emailEnqueuedCount++;
        }
      }

      // Mark status as PUBLISHED
      const updated = await prisma.announcement.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      });

      // Record audit log
      await prisma.auditLog.create({
        data: {
          adminId: adminUser.id,
          action: 'PUBLISH_ANNOUNCEMENT',
          beforeState: JSON.stringify({ id, status: announcement.status }),
          afterState: JSON.stringify({
            id,
            status: 'PUBLISHED',
            targeted: targetUsers.length,
            webDelivered: webCount,
            emailEnqueued: emailEnqueuedCount,
            emailSkipped: emailSkippedCount
          }),
          result: 'Success',
          reason: `Published announcement "${announcement.title}" to ${targetUsers.length} users (Web: ${webCount}, Email enqueued: ${emailEnqueuedCount}, Skipped: ${emailSkippedCount}).`
        }
      });

      return {
        announcement: updated,
        targetedCount: targetUsers.length,
        webDelivered: webCount,
        emailEnqueued: emailEnqueuedCount,
        emailSkipped: emailSkippedCount
      };
    } catch (err: any) {
      // Revert status to DRAFT on critical failure
      await prisma.announcement.update({
        where: { id },
        data: { status: 'DRAFT' }
      });
      throw err;
    }
  }

  /**
   * Admin: List announcements with delivery stats
   */
  async getAnnouncements(filters?: { status?: string; search?: string }) {
    const prisma = getPrisma();
    const where: any = {};

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const list = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        deliveries: {
          select: { id: true, channel: true, status: true }
        }
      }
    });

    return list.map(a => {
      const webTotal = a.deliveries.filter(d => d.channel === 'WEB').length;
      const emailTotal = a.deliveries.filter(d => d.channel === 'EMAIL').length;
      const emailSent = a.deliveries.filter(d => d.channel === 'EMAIL' && d.status === 'SENT').length;
      const emailFailed = a.deliveries.filter(d => d.channel === 'EMAIL' && d.status === 'FAILED').length;

      return {
        id: a.id,
        title: a.title,
        message: a.message,
        type: a.type,
        priority: a.priority,
        targetAudience: a.targetAudience,
        channels: a.channels,
        status: a.status,
        scheduledFor: a.scheduledFor,
        expiresAt: a.expiresAt,
        actionUrl: a.actionUrl,
        actionLabel: a.actionLabel,
        createdById: a.createdById,
        createdByName: a.createdByName,
        createdAt: a.createdAt,
        publishedAt: a.publishedAt,
        stats: {
          webTotal,
          emailTotal,
          emailSent,
          emailFailed
        }
      };
    });
  }

  /**
   * Admin: Get announcement detail with full deliveries report
   */
  async getAnnouncementDetail(id: string) {
    const prisma = getPrisma();

    const a = await prisma.announcement.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 500
        }
      }
    });

    if (!a) throw new Error('Announcement not found.');

    return a;
  }

  /**
   * Admin: Update / Edit Announcement (Only when not PUBLISHED)
   */
  async updateAnnouncement(id: string, input: Partial<CreateAnnouncementInput>, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();

    const current = await prisma.announcement.findUnique({ where: { id } });
    if (!current) throw new Error('Announcement not found.');
    if (current.status === 'PUBLISHED') {
      throw new Error('Cannot edit an announcement that has already been published.');
    }

    const data: any = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.message !== undefined) data.message = input.message.trim();
    if (input.type !== undefined) data.type = input.type;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.targetAudience !== undefined) data.targetAudience = input.targetAudience;
    if (input.channels !== undefined) data.channels = input.channels;
    if (input.actionUrl !== undefined) data.actionUrl = input.actionUrl?.trim() || null;
    if (input.actionLabel !== undefined) data.actionLabel = input.actionLabel?.trim() || null;
    if (input.targetUserIds !== undefined) data.targetUserIds = input.targetUserIds ? JSON.stringify(input.targetUserIds) : null;
    if (input.scheduledFor !== undefined) data.scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    const updated = await prisma.announcement.update({
      where: { id },
      data
    });

    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'UPDATE_ANNOUNCEMENT',
        beforeState: JSON.stringify(current),
        afterState: JSON.stringify(updated),
        result: 'Success',
        reason: `Updated announcement "${updated.title}"`
      }
    });

    return updated;
  }

  /**
   * Admin: Cancel scheduled announcement or archive
   */
  async cancelOrArchiveAnnouncement(id: string, action: 'CANCEL' | 'ARCHIVE', adminUser: { id: string; name: string }) {
    const prisma = getPrisma();

    const current = await prisma.announcement.findUnique({ where: { id } });
    if (!current) throw new Error('Announcement not found.');

    const newStatus = action === 'CANCEL' ? 'CANCELLED' : 'ARCHIVED';

    const updated = await prisma.announcement.update({
      where: { id },
      data: { status: newStatus }
    });

    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: `${action}_ANNOUNCEMENT`,
        beforeState: JSON.stringify({ id, status: current.status }),
        afterState: JSON.stringify({ id, status: newStatus }),
        result: 'Success',
        reason: `${action === 'CANCEL' ? 'Cancelled' : 'Archived'} announcement "${current.title}"`
      }
    });

    return updated;
  }

  /**
   * Admin: Delete announcement
   */
  async deleteAnnouncement(id: string, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();

    const current = await prisma.announcement.findUnique({ where: { id } });
    if (!current) throw new Error('Announcement not found.');

    await prisma.announcement.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'DELETE_ANNOUNCEMENT',
        beforeState: JSON.stringify(current),
        afterState: null,
        result: 'Success',
        reason: `Deleted announcement "${current.title}"`
      }
    });

    return true;
  }

  /**
   * Background sweep for scheduled announcements
   */
  async processScheduledAnnouncements() {
    const prisma = getPrisma();
    const now = new Date();

    const scheduled = await prisma.announcement.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now }
      }
    });

    for (const item of scheduled) {
      try {
        await this.publishAnnouncement(item.id, {
          id: item.createdById,
          name: item.createdByName || 'System Auto-Scheduler'
        });
      } catch (err: any) {
        console.error(`[AnnouncementService] Auto-publish scheduled announcement ${item.id} error:`, err);
      }
    }
  }

  /**
   * Admin: 1-Click Broadcast Now (Create + Validate + Enqueue Emails + Web Deliver)
   */
  async broadcastNow(input: CreateAnnouncementInput, adminUser: { id: string; name: string }) {
    // 1. Create the announcement record
    const created = await this.createAnnouncement(input, adminUser);
    // 2. Immediately publish & enqueue
    const publishResult = await this.publishAnnouncement(created.id, adminUser);
    return {
      success: true,
      announcement: publishResult.announcement,
      targetedCount: publishResult.targetedCount,
      webDelivered: publishResult.webDelivered,
      emailEnqueued: publishResult.emailEnqueued,
      emailSkipped: publishResult.emailSkipped
    };
  }

  /**
   * Admin: Retry a specific failed email delivery without duplicating web notifications
   */
  async retryDelivery(deliveryId: string, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();

    const delivery = await prisma.announcementDelivery.findUnique({
      where: { id: deliveryId },
      include: { announcement: true }
    });

    if (!delivery) throw new Error('Không tìm thấy bản ghi gửi thông báo này.');
    if (delivery.channel !== 'EMAIL') throw new Error('Chỉ có thể thử lại các bản ghi gửi qua kênh Email.');

    const announcement = delivery.announcement;
    if (!announcement) throw new Error('Không tìm thấy thông báo gốc tương ứng.');

    // Reset status to PENDING
    await prisma.announcementDelivery.update({
      where: { id: delivery.id },
      data: { status: 'PENDING', errorMessage: null }
    });

    // Rebuild email template
    const emailHtml = buildEmailHtml({
      headline: announcement.title,
      previewText: announcement.message.slice(0, 120),
      priority: announcement.priority === 'CRITICAL' ? 'CRITICAL' : announcement.priority === 'IMPORTANT' ? 'HIGH' : 'NORMAL',
      badgeText: announcement.priority === 'CRITICAL' ? 'THÔNG BÁO KHẨN CẤP' : (announcement.type || 'THÔNG BÁO HỆ THỐNG'),
      greeting: `Xin chào ${delivery.userName || 'bạn'},`,
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
      footerNote: 'Đây là thông báo chính thức từ Ban Quản trị Life OS.'
    });

    // Enqueue to persistent queue
    await emailQueueService.enqueue({
      recipient: delivery.userEmail,
      subject: `[Life OS] ${announcement.title}`,
      htmlBody: emailHtml,
      eventType: 'ADMIN_BROADCAST',
      metadata: {
        announcementId: announcement.id,
        announcementDeliveryId: delivery.id,
        userId: delivery.userId
      }
    });

    return { success: true, message: 'Đã đưa email vào hàng đợi gửi lại thành công.' };
  }

  /**
   * Admin: Retry all failed email deliveries for a given announcement
   */
  async retryAllFailedDeliveries(announcementId: string, adminUser: { id: string; name: string }) {
    const prisma = getPrisma();

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!announcement) throw new Error('Không tìm thấy thông báo.');

    const failedDeliveries = await prisma.announcementDelivery.findMany({
      where: {
        announcementId,
        channel: 'EMAIL',
        status: 'FAILED'
      }
    });

    let requeuedCount = 0;
    for (const delivery of failedDeliveries) {
      await this.retryDelivery(delivery.id, adminUser).catch(() => {});
      requeuedCount++;
    }

    return {
      success: true,
      requeuedCount,
      message: `Đã đưa ${requeuedCount} email thất bại vào hàng đợi gửi lại.`
    };
  }
}

export const announcementService = new AnnouncementService();
