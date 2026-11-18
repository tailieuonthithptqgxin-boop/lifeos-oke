import { getPrisma } from '../db.js';

export interface CreateChannelDto {
  name: string;
  description?: string;
  type?: 'ANNOUNCEMENT' | 'GENERAL' | 'STUDY' | 'CUSTOM';
  isPrivate?: boolean;
}

export interface SendChannelMessageDto {
  content: string;
  images?: string[];
  replyToId?: string;
  meetData?: any;
}

export class ConnectCommunityService {
  // Ensure the 3 standard channels exist for a community
  public static async ensureDefaultChannels(communityId: string) {
    const prisma = getPrisma();
    const count = await prisma.communityChannel.count({
      where: { communityId }
    });

    if (count === 0) {
      await prisma.communityChannel.createMany({
        data: [
          {
            communityId,
            name: '📢-thông-báo-lịch-hẹn',
            description: 'Kênh thông báo chính thức và lịch hẹn Meet học tập',
            type: 'ANNOUNCEMENT',
            isPrivate: false
          },
          {
            communityId,
            name: '💬-trò-chuyện-chung',
            description: 'Giao lưu, thảo luận và kết nối thành viên',
            type: 'GENERAL',
            isPrivate: false
          },
          {
            communityId,
            name: '📚-hỏi-bài-tài-liệu',
            description: 'Giải đáp thắc mắc, hỏi bài tập và chia sẻ tài liệu học tập',
            type: 'STUDY',
            isPrivate: false
          }
        ]
      });
    }

    return prisma.communityChannel.findMany({
      where: { communityId },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Get full community details with user's role and counts
  public static async getCommunityDetails(userId: string, communityId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            championCount: true
          }
        }
      }
    });

    if (!community) throw new Error('Không tìm thấy nhóm/cộng đồng này.');

    // Ensure default channels exist
    await this.ensureDefaultChannels(communityId);

    // Get current user membership
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });

    const isOwner = community.ownerId === userId;
    const isMod = membership?.role === 'MODERATOR' || isOwner;
    const isMember = membership?.status === 'ACTIVE' || isOwner;

    // If owner or mod, get pending counts
    let pendingMembersCount = 0;
    let pendingPostsCount = 0;

    if (isMod) {
      pendingMembersCount = await prisma.communityMember.count({
        where: { communityId, status: 'PENDING' }
      });
      pendingPostsCount = await prisma.post.count({
        where: { communityId, status: 'PENDING_APPROVAL' }
      });
    }

    // Channels count & Meets count
    const channelsCount = await prisma.communityChannel.count({ where: { communityId } });
    const meetsCount = await prisma.communityMeet.count({ where: { communityId, status: 'LIVE' } });

    return {
      ...community,
      storageBytes: community.storageBytes ? community.storageBytes.toString() : '0',
      isMember,
      membershipRole: isOwner ? 'OWNER' : (membership?.role || null),
      membershipStatus: isOwner ? 'ACTIVE' : (membership?.status || null),
      isMuted: membership?.isMuted || false,
      pendingMembersCount,
      pendingPostsCount,
      channelsCount,
      meetsCount
    };
  }

  // Update community settings (Owner / Mod)
  public static async updateSettings(userId: string, communityId: string, data: {
    name?: string;
    description?: string;
    category?: string;
    privacy?: string;
    avatar?: string;
    coverImage?: string;
    requirePostApproval?: boolean;
  }) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Không tìm thấy nhóm.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    const isOwner = community.ownerId === userId;
    const isMod = membership?.role === 'MODERATOR' || isOwner;
    if (!isMod) throw new Error('Chỉ Quản trị viên mới có quyền đổi cài đặt nhóm.');

    const updated = await prisma.community.update({
      where: { id: communityId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.privacy ? { privacy: data.privacy } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
        ...(data.coverImage !== undefined ? { coverImage: data.coverImage } : {}),
        ...(data.requirePostApproval !== undefined ? { requirePostApproval: Boolean(data.requirePostApproval) } : {})
      }
    });

    return { success: true, community: updated, message: 'Đã cập nhật cài đặt nhóm thành công.' };
  }

  // List pending join requests
  public static async listPendingMembers(userId: string, communityId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Không tìm thấy nhóm.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    if (community.ownerId !== userId && membership?.role !== 'MODERATOR') {
      throw new Error('Bạn không có quyền quản trị nhóm này.');
    }

    const pending = await prisma.communityMember.findMany({
      where: { communityId, status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            championCount: true,
            totalStudyMinutes: true,
            createdAt: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    return pending;
  }

  // Approve member
  public static async approveMember(userId: string, communityId: string, targetUserId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Không tìm thấy nhóm.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    if (community.ownerId !== userId && membership?.role !== 'MODERATOR') {
      throw new Error('Chỉ Quản trị viên mới có quyền duyệt thành viên.');
    }

    const targetMembership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: targetUserId } }
    });
    if (!targetMembership) throw new Error('Yêu cầu tham gia không tồn tại.');

    await prisma.communityMember.update({
      where: { id: targetMembership.id },
      data: { status: 'ACTIVE' }
    });

    await prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: 1 } }
    });

    return { success: true, message: 'Đã phê duyệt thành viên vào nhóm.' };
  }

  // Reject member
  public static async rejectMember(userId: string, communityId: string, targetUserId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Không tìm thấy nhóm.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    if (community.ownerId !== userId && membership?.role !== 'MODERATOR') {
      throw new Error('Chỉ Quản trị viên mới có quyền từ chối thành viên.');
    }

    await prisma.communityMember.deleteMany({
      where: { communityId, userId: targetUserId, status: 'PENDING' }
    });

    return { success: true, message: 'Đã từ chối yêu cầu tham gia nhóm.' };
  }

  // List pending posts for moderation
  public static async listPendingPosts(userId: string, communityId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Không tìm thấy nhóm.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    if (community.ownerId !== userId && membership?.role !== 'MODERATOR') {
      throw new Error('Chỉ Quản trị viên mới có quyền xem bài chờ duyệt.');
    }

    const posts = await prisma.post.findMany({
      where: { communityId, status: 'PENDING_APPROVAL' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            championCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return posts;
  }

  // Approve post
  public static async approvePost(userId: string, postId: string) {
    const prisma = getPrisma();
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || !post.communityId) throw new Error('Không tìm thấy bài viết.');

    const community = await prisma.community.findUnique({ where: { id: post.communityId } });
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId } }
    });
    if (community?.ownerId !== userId && membership?.role !== 'MODERATOR') {
      throw new Error('Chỉ Quản trị viên mới có quyền duyệt bài viết.');
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHED' }
    });

    await prisma.community.update({
      where: { id: post.communityId },
      data: { postCount: { increment: 1 } }
    });

    return { success: true, post: updated, message: 'Đã phê duyệt đăng bài viết.' };
  }

  // Reject post
  public static async rejectPost(userId: string, postId: string) {
    const prisma = getPrisma();
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || !post.communityId) throw new Error('Không tìm thấy bài viết.');

    const community = await prisma.community.findUnique({ where: { id: post.communityId } });
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId } }
    });
    if (community?.ownerId !== userId && membership?.role !== 'MODERATOR') {
      throw new Error('Chỉ Quản trị viên mới có quyền từ chối bài viết.');
    }

    await prisma.post.delete({ where: { id: postId } });

    return { success: true, message: 'Đã từ chối và xóa bài viết khỏi hàng chờ.' };
  }

  // List all members with role and status
  public static async listMembers(communityId: string) {
    const prisma = getPrisma();
    const members = await prisma.communityMember.findMany({
      where: { communityId, status: { in: ['ACTIVE', 'MUTED'] } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            championCount: true,
            totalStudyMinutes: true,
            weeklyStudyMinutes: true,
            createdAt: true
          }
        }
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }]
    });

    return members;
  }

  // Set member role (OWNER only)
  public static async updateMemberRole(userId: string, communityId: string, targetUserId: string, newRole: 'MODERATOR' | 'MEMBER') {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community || community.ownerId !== userId) {
      throw new Error('Chỉ Chủ nhóm (Owner) mới có quyền bổ nhiệm Quản trị viên phụ (Mod).');
    }

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: targetUserId } }
    });
    if (!membership) throw new Error('Thành viên không thuộc nhóm.');

    await prisma.communityMember.update({
      where: { id: membership.id },
      data: { role: newRole }
    });

    return { success: true, message: `Đã cập nhật vai trò thành ${newRole === 'MODERATOR' ? 'Quản trị viên phụ (Mod)' : 'Thành viên thường'}.` };
  }

  // Mute / unmute member
  public static async toggleMuteMember(userId: string, communityId: string, targetUserId: string, isMuted: boolean) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    const myMembership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    if (community?.ownerId !== userId && myMembership?.role !== 'MODERATOR') {
      throw new Error('Chỉ Quản trị viên mới có quyền cấm/mở chat thành viên.');
    }

    const target = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: targetUserId } }
    });
    if (!target) throw new Error('Thành viên không tồn tại trong nhóm.');

    await prisma.communityMember.update({
      where: { id: target.id },
      data: {
        isMuted,
        status: isMuted ? 'MUTED' : 'ACTIVE'
      }
    });

    return { success: true, message: isMuted ? 'Đã cấm đăng bài & chat tạm thời đối với thành viên này.' : 'Đã gỡ cấm chat cho thành viên.' };
  }

  // Kick or Ban member
  public static async kickMember(userId: string, communityId: string, targetUserId: string, ban = false) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    const myMembership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    if (community?.ownerId !== userId && myMembership?.role !== 'MODERATOR') {
      throw new Error('Chỉ Quản trị viên mới có quyền mời thành viên ra khỏi nhóm.');
    }

    if (community?.ownerId === targetUserId) {
      throw new Error('Không thể kick Chủ nhóm.');
    }

    const target = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: targetUserId } }
    });
    if (!target) throw new Error('Thành viên không thuộc nhóm.');

    if (ban) {
      await prisma.communityMember.update({
        where: { id: target.id },
        data: { status: 'BANNED' }
      });
      await prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } }
      });
      return { success: true, message: 'Đã chặn vĩnh viễn thành viên khỏi nhóm.' };
    } else {
      await prisma.communityMember.delete({
        where: { id: target.id }
      });
      await prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } }
      });
      return { success: true, message: 'Đã mời thành viên ra khỏi nhóm.' };
    }
  }

  // Channels
  public static async listChannels(userId: string, communityId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Nhóm không tồn tại.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    const isOwner = community.ownerId === userId;
    if (!isOwner && membership?.status !== 'ACTIVE') {
      throw new Error('Chỉ thành viên chính thức mới có quyền truy cập kênh chat của nhóm.');
    }

    await this.ensureDefaultChannels(communityId);

    const channels = await prisma.communityChannel.findMany({
      where: { communityId },
      orderBy: { createdAt: 'asc' }
    });

    return channels;
  }

  // Create Channel (Owner/Mod only)
  public static async createChannel(userId: string, communityId: string, data: CreateChannelDto) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Nhóm không tồn tại.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    const isOwner = community.ownerId === userId;
    const isMod = isOwner || membership?.role === 'MODERATOR';
    if (!isMod) throw new Error('Chỉ Quản trị viên mới có quyền tạo thêm kênh chat con.');

    let formattedName = data.name.trim().toLowerCase();
    if (!formattedName.startsWith('#')) formattedName = `#${formattedName}`;

    const channel = await prisma.communityChannel.create({
      data: {
        communityId,
        name: formattedName,
        description: data.description?.trim() || null,
        type: data.type || 'GENERAL',
        isPrivate: Boolean(data.isPrivate)
      }
    });

    return { success: true, channel, message: 'Đã tạo kênh chat con mới thành công.' };
  }

  // Channel Messages
  public static async listChannelMessages(userId: string, communityId: string, channelId: string, cursor?: string, limit = 50) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Nhóm không tồn tại.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    const isOwner = community.ownerId === userId;
    if (!isOwner && membership?.status !== 'ACTIVE') {
      throw new Error('Bạn không có quyền xem tin nhắn trong nhóm này.');
    }

    const where: any = { communityId, channelId };
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await prisma.communityChatMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            championCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return {
      messages: items.reverse(), // chronologically ascending
      nextCursor
    };
  }

  // Send Channel Message
  public static async sendChannelMessage(userId: string, communityId: string, channelId: string, data: SendChannelMessageDto) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Nhóm không tồn tại.');

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    const isOwner = community.ownerId === userId;
    if (!isOwner && membership?.status !== 'ACTIVE') {
      throw new Error('Chỉ thành viên chính thức mới có thể gửi tin nhắn.');
    }

    if (membership?.isMuted) {
      throw new Error('Tài khoản của bạn đang bị tạm khóa quyền đăng bài & gửi tin nhắn trong nhóm.');
    }

    const channel = await prisma.communityChannel.findUnique({ where: { id: channelId } });
    if (!channel || channel.communityId !== communityId) {
      throw new Error('Kênh chat không tồn tại.');
    }

    // If channel is ANNOUNCEMENT, only owner or mod can post
    if (channel.type === 'ANNOUNCEMENT' && !isOwner && membership?.role !== 'MODERATOR') {
      throw new Error('Kênh Thông Báo chỉ cho phép Quản trị viên gửi tin nhắn để tránh trôi tin.');
    }

    if (!data.content?.trim() && (!data.images || data.images.length === 0) && !data.meetData) {
      throw new Error('Nội dung tin nhắn không được để trống.');
    }

    const msg = await prisma.communityChatMessage.create({
      data: {
        communityId,
        channelId,
        senderId: userId,
        content: data.content?.trim() || '',
        images: Array.isArray(data.images) ? data.images : [],
        replyToId: data.replyToId || null,
        meetData: data.meetData || null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            championCount: true
          }
        }
      }
    });

    return { success: true, message: msg };
  }

  // Pin Message
  public static async togglePinMessage(userId: string, communityId: string, messageId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    if (community?.ownerId !== userId && membership?.role !== 'MODERATOR') {
      throw new Error('Chỉ Quản trị viên mới có quyền ghim tin nhắn.');
    }

    const msg = await prisma.communityChatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.communityId !== communityId) throw new Error('Tin nhắn không tồn tại.');

    const updated = await prisma.communityChatMessage.update({
      where: { id: messageId },
      data: { isPinned: !msg.isPinned }
    });

    return { success: true, isPinned: updated.isPinned, message: updated.isPinned ? 'Đã ghim tin nhắn lên đầu kênh chat.' : 'Đã bỏ ghim tin nhắn.' };
  }

  // Delete message
  public static async deleteMessage(userId: string, communityId: string, messageId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });
    const msg = await prisma.communityChatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.communityId !== communityId) throw new Error('Tin nhắn không tồn tại.');

    const isAuthor = msg.senderId === userId;
    const isMod = community?.ownerId === userId || membership?.role === 'MODERATOR';
    if (!isAuthor && !isMod) throw new Error('Bạn không có quyền xóa tin nhắn này.');

    await prisma.communityChatMessage.delete({ where: { id: messageId } });

    return { success: true, message: 'Đã xóa tin nhắn.' };
  }

  // React to message
  public static async toggleMessageReaction(userId: string, communityId: string, messageId: string, emoji: string) {
    const prisma = getPrisma();
    const msg = await prisma.communityChatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.communityId !== communityId) throw new Error('Tin nhắn không tồn tại.');

    const reactions = (msg.reactions as Record<string, string[]>) || {};
    const currentUsers = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];

    if (currentUsers.includes(userId)) {
      reactions[emoji] = currentUsers.filter(id => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...currentUsers, userId];
    }

    const updated = await prisma.communityChatMessage.update({
      where: { id: messageId },
      data: { reactions }
    });

    return { success: true, reactions: updated.reactions };
  }
}
