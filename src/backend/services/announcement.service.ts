import { getPrisma } from '../db.js';
import { gmailService } from './gmailNotification.service.js';

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

      // 2. Email Delivery Execution
      if (isEmailEnabled) {
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

          if (existingEmailDelivery && existingEmailDelivery.status === 'SENT') {
            continue;
          }

          // Delivery record (PENDING)
          const deliveryRecord = existingEmailDelivery || await prisma.announcementDelivery.create({
            data: {
              announcementId: announcement.id,
              userId: user.id,
              userEmail: user.email,
              userName: user.name,
              channel: 'EMAIL',
              status: 'PENDING'
            }
          });

          try {
            const emailResult = await gmailService.sendNotification({
              to: user.email,
              recipientName: user.name,
              subject: `[Life OS Announcement] ${announcement.title}`,
              category: 'SYSTEM',
              headline: announcement.title,
              content: `
                <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                  <p style="margin: 0 0 12px 0;">${announcement.message.replace(/\n/g, '<br/>')}</p>
                  <div style="margin-top: 16px; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #6366f1; font-size: 12px; color: #64748b;">
                    <strong>Type:</strong> ${announcement.type} &nbsp;|&nbsp; <strong>Priority:</strong> ${announcement.priority}
                  </div>
                </div>
              `,
              actionLabel: announcement.actionLabel || 'Open Life OS',
              actionUrl: announcement.actionUrl || (process.env.APP_URL || 'http://localhost:3000'),
              badgeText: announcement.priority === 'CRITICAL' ? 'CRITICAL NOTICE' : (announcement.type || 'ANNOUNCEMENT'),
              badgeColor: announcement.priority === 'CRITICAL' ? '#ef4444' : '#6366f1'
            });

            if (emailResult.sent) {
              await prisma.announcementDelivery.update({
                where: { id: deliveryRecord.id },
                data: { status: 'SENT', sentAt: new Date(), errorMessage: null }
              });
              emailSuccessCount++;
            } else {
              await prisma.announcementDelivery.update({
                where: { id: deliveryRecord.id },
                data: { status: 'FAILED', errorMessage: emailResult.message }
              });
              emailFailedCount++;
            }
          } catch (err: any) {
            await prisma.announcementDelivery.update({
              where: { id: deliveryRecord.id },
              data: { status: 'FAILED', errorMessage: err.message }
            });
            emailFailedCount++;
          }
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
            emailSuccess: emailSuccessCount,
            emailFailed: emailFailedCount
          }),
          result: 'Success',
          reason: `Published announcement "${announcement.title}" to ${targetUsers.length} users.`
        }
      });

      return {
        announcement: updated,
        targetedCount: targetUsers.length,
        webDelivered: webCount,
        emailDelivered: emailSuccessCount,
        emailFailed: emailFailedCount
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
}

export const announcementService = new AnnouncementService();
