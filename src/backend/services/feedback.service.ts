import { getPrisma } from '../db.js';

export interface CreateFeedbackDto {
  title: string;
  content: string;
  type?: 'Idea' | 'Bug' | 'Feature' | 'Experience' | 'General';
  rating?: number;
}

export class FeedbackService {
  /**
   * User submits new feedback
   */
  async createFeedback(userId: string, data: CreateFeedbackDto): Promise<any> {
    const prisma = getPrisma();

    const cleanTitle = data.title.trim();
    const cleanContent = data.content.trim();
    const type = data.type || 'Idea';
    const rating = data.rating && data.rating >= 1 && data.rating <= 5 ? data.rating : null;

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        title: cleanTitle,
        content: cleanContent,
        type,
        rating,
        status: 'New'
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    // Notify user that their voice has been heard
    await prisma.notification.create({
      data: {
        userId,
        title: '💌 Cảm ơn bạn đã gửi góp ý!',
        message: `Chúng tôi đã tiếp nhận góp ý "${cleanTitle}". Đội ngũ phát triển sẽ phản hồi sớm nhất!`,
        type: 'info'
      }
    });

    return feedback;
  }

  /**
   * Get user's own feedback list
   */
  async getUserFeedbacks(userId: string): Promise<any[]> {
    const prisma = getPrisma();
    return prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get public community feedbacks (with upvotes)
   */
  async getPublicFeedbacks(userId?: string): Promise<any[]> {
    const prisma = getPrisma();
    const items = await prisma.feedback.findMany({
      where: {
        status: { in: ['New', 'Reviewing', 'Planned', 'In Progress', 'Completed'] }
      },
      include: {
        user: { select: { name: true, avatar: true } },
        votes: userId ? { where: { userId } } : false
      },
      orderBy: [
        { isImportant: 'desc' },
        { upvotes: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50
    });

    return items.map(f => ({
      id: f.id,
      title: f.title,
      content: f.content,
      type: f.type,
      rating: f.rating,
      status: f.status,
      isImportant: f.isImportant,
      upvotes: f.upvotes,
      adminReply: f.adminReply,
      repliedAt: f.repliedAt,
      createdAt: f.createdAt,
      user: {
        name: f.user.name || 'Người dùng LifeOS',
        avatar: f.user.avatar
      },
      hasVoted: userId && Array.isArray((f as any).votes) ? (f as any).votes.length > 0 : false
    }));
  }

  /**
   * Vote / Upvote on a community feedback
   */
  async toggleVote(userId: string, feedbackId: string): Promise<{ hasVoted: boolean; upvotes: number }> {
    const prisma = getPrisma();
    const existing = await prisma.feedbackVote.findUnique({
      where: {
        feedbackId_userId: { feedbackId, userId }
      }
    });

    if (existing) {
      // Remove vote
      await prisma.$transaction([
        prisma.feedbackVote.delete({ where: { id: existing.id } }),
        prisma.feedback.update({
          where: { id: feedbackId },
          data: { upvotes: { decrement: 1 } }
        })
      ]);
      const updated = await prisma.feedback.findUnique({ where: { id: feedbackId }, select: { upvotes: true } });
      return { hasVoted: false, upvotes: updated?.upvotes || 0 };
    } else {
      // Add vote
      await prisma.$transaction([
        prisma.feedbackVote.create({
          data: { feedbackId, userId }
        }),
        prisma.feedback.update({
          where: { id: feedbackId },
          data: { upvotes: { increment: 1 } }
        })
      ]);
      const updated = await prisma.feedback.findUnique({ where: { id: feedbackId }, select: { upvotes: true } });
      return { hasVoted: true, upvotes: updated?.upvotes || 0 };
    }
  }

  /**
   * Admin: List feedbacks with filtering and status counts
   */
  async getAdminFeedbacks(params: {
    status?: string;
    type?: string;
    search?: string;
    isImportant?: boolean;
  }): Promise<any> {
    const prisma = getPrisma();
    const where: any = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }
    if (params.type && params.type !== 'ALL') {
      where.type = params.type;
    }
    if (params.isImportant !== undefined) {
      where.isImportant = params.isImportant;
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [items, counts] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, plan: true } }
        },
        orderBy: [
          { isImportant: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 100
      }),
      prisma.feedback.groupBy({
        by: ['status'],
        _count: { id: true }
      })
    ]);

    const countMap: Record<string, number> = {
      New: 0,
      Reviewing: 0,
      Planned: 0,
      'In Progress': 0,
      Completed: 0,
      Rejected: 0
    };
    counts.forEach(c => {
      countMap[c.status] = c._count.id;
    });

    return {
      items,
      counts: countMap
    };
  }

  /**
   * Admin: Update status, write reply, toggle important flag
   */
  async adminUpdateFeedback(
    feedbackId: string,
    adminId: string,
    adminEmail: string,
    data: {
      status?: string;
      adminReply?: string;
      isImportant?: boolean;
    }
  ): Promise<any> {
    const prisma = getPrisma();

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true }
    });

    if (!feedback) throw new Error('Không tìm thấy feedback này.');

    const updatePayload: any = { updatedAt: new Date() };

    if (data.status) {
      updatePayload.status = data.status;
    }
    if (data.isImportant !== undefined) {
      updatePayload.isImportant = data.isImportant;
    }
    if (data.adminReply !== undefined) {
      updatePayload.adminReply = data.adminReply;
      updatePayload.repliedAt = new Date();
      updatePayload.repliedBy = adminEmail;
    }

    const updated = await prisma.feedback.update({
      where: { id: feedbackId },
      data: updatePayload
    });

    // Notify user if status changed or admin replied
    if (data.adminReply || (data.status && data.status !== feedback.status)) {
      const statusLabelMap: Record<string, string> = {
        Reviewing: 'đang được xem xét',
        Planned: 'đã được đưa vào lộ trình phát triển',
        'In Progress': 'đang được triển khai',
        Completed: 'đã hoàn thành & cập nhật',
        Rejected: 'tạm thời chưa phù hợp'
      };
      const statusText = data.status ? (statusLabelMap[data.status] || data.status) : '';
      const replyPreview = data.adminReply ? `\nPhản hồi: "${data.adminReply}"` : '';

      await prisma.notification.create({
        data: {
          userId: feedback.userId,
          title: `📬 Cập nhật góp ý: "${feedback.title}"`,
          message: `Góp ý của bạn ${statusText ? `hiện ${statusText}.` : 'vừa nhận được phản hồi từ Admin.'}${replyPreview}`,
          type: data.status === 'Completed' ? 'success' : 'info'
        }
      });
    }

    return updated;
  }
}

export const feedbackService = new FeedbackService();
