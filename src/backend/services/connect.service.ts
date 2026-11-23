import { getPrisma } from '../db';
import { broadcastFeedPost, broadcastFriendRequest, broadcastFriendAccepted } from '../realtime/studyRoomSocket.js';

export interface UpdateProfileDto {
  bio?: string;
  avatar?: string;
  coverImage?: string;
  location?: string;
  interests?: string[];
  learningLanguages?: string[];
  learningGoals?: string[];
  personalIntro?: string;
  profileVisibility?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  locationVisibility?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  learningGoalsVisibility?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  messagePermission?: 'EVERYONE' | 'FRIENDS_ONLY' | 'NO_ONE';
}

export interface CreatePostDto {
  content: string;
  images?: string[];
  tags?: string[];
  communityId?: string;
  lifeOsShareType?: string;
  lifeOsShareData?: any;
  visibility?: 'PUBLIC' | 'FRIENDS_ONLY' | 'COMMUNITY';
  isAnonymous?: boolean;
  anonymousNickname?: string;
  poll?: any;
  meetSession?: any;
  achievementCard?: any;
}

export interface CreateCommunityDto {
  name: string;
  description: string;
  category?: string;
  privacy?: 'PUBLIC' | 'PRIVATE' | 'APPROVAL_REQUIRED';
  avatar?: string;
  coverImage?: string;
}

export class ConnectService {
  private static canonicalPair(id1: string, id2: string): [string, string] {
    return id1 < id2 ? [id1, id2] : [id2, id1];
  }

  // ==========================================
  // 1. PROFILES & PRIVACY
  // ==========================================

  public static async getMyProfile(userId: string) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        coverImage: true,
        bio: true,
        location: true,
        interests: true,
        learningLanguages: true,
        learningGoals: true,
        personalIntro: true,
        profileVisibility: true,
        locationVisibility: true,
        learningGoalsVisibility: true,
        messagePermission: true,
        totalStudyMinutes: true,
        weeklyStudyMinutes: true,
        championCount: true,
        createdAt: true
      }
    });

    if (!user) return null;

    // Count friends
    const friendsCount = await prisma.friendship.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'ACCEPTED'
      }
    });

    // Count posts
    const postsCount = await prisma.post.count({
      where: { userId }
    });

    return {
      ...user,
      friendsCount,
      postsCount
    };
  }

  public static async updateMyProfile(userId: string, data: UpdateProfileDto) {
    const prisma = getPrisma();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(typeof data.bio === 'string' && { bio: data.bio.trim() }),
        ...(typeof data.avatar === 'string' && { avatar: data.avatar.trim() }),
        ...(typeof data.coverImage === 'string' && { coverImage: data.coverImage.trim() }),
        ...(typeof data.location === 'string' && { location: data.location.trim() }),
        ...(Array.isArray(data.interests) && { interests: data.interests }),
        ...(Array.isArray(data.learningLanguages) && { learningLanguages: data.learningLanguages }),
        ...(Array.isArray(data.learningGoals) && { learningGoals: data.learningGoals }),
        ...(typeof data.personalIntro === 'string' && { personalIntro: data.personalIntro.trim() }),
        ...(data.profileVisibility && { profileVisibility: data.profileVisibility }),
        ...(data.locationVisibility && { locationVisibility: data.locationVisibility }),
        ...(data.learningGoalsVisibility && { learningGoalsVisibility: data.learningGoalsVisibility }),
        ...(data.messagePermission && { messagePermission: data.messagePermission })
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        coverImage: true,
        bio: true,
        location: true,
        interests: true,
        learningLanguages: true,
        learningGoals: true,
        personalIntro: true,
        profileVisibility: true,
        locationVisibility: true,
        learningGoalsVisibility: true,
        messagePermission: true
      }
    });

    return updated;
  }

  public static async getUserPublicProfile(requesterId: string, targetUserId: string) {
    const prisma = getPrisma();

    // Check block
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: requesterId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: requesterId }
        ]
      }
    });

    if (isBlocked) {
      return { isBlocked: true };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        coverImage: true,
        bio: true,
        location: true,
        interests: true,
        learningLanguages: true,
        learningGoals: true,
        personalIntro: true,
        profileVisibility: true,
        locationVisibility: true,
        learningGoalsVisibility: true,
        messagePermission: true,
        totalStudyMinutes: true,
        weeklyStudyMinutes: true,
        championCount: true,
        createdAt: true
      }
    });

    if (!targetUser) return null;

    const isSelf = requesterId === targetUserId;
    const friendshipStatus = isSelf ? 'SELF' : await this.getFriendshipStatus(requesterId, targetUserId);
    const isFriend = friendshipStatus === 'FRIENDS';

    // Privacy gating
    let visibleLocation: string | null = null;
    if (isSelf || targetUser.locationVisibility === 'PUBLIC' || (targetUser.locationVisibility === 'FRIENDS_ONLY' && isFriend)) {
      visibleLocation = targetUser.location;
    }

    let visibleGoals: string[] = [];
    if (isSelf || targetUser.learningGoalsVisibility === 'PUBLIC' || (targetUser.learningGoalsVisibility === 'FRIENDS_ONLY' && isFriend)) {
      visibleGoals = targetUser.learningGoals;
    }

    const friendsCount = await prisma.friendship.count({
      where: {
        OR: [{ userAId: targetUserId }, { userBId: targetUserId }],
        status: 'ACCEPTED'
      }
    });

    const postsCount = await prisma.post.count({
      where: { userId: targetUserId }
    });

    return {
      id: targetUser.id,
      name: targetUser.name,
      username: targetUser.username,
      avatar: targetUser.avatar,
      coverImage: targetUser.coverImage,
      bio: targetUser.bio,
      location: visibleLocation,
      interests: targetUser.interests,
      learningLanguages: targetUser.learningLanguages,
      learningGoals: visibleGoals,
      personalIntro: targetUser.personalIntro,
      totalStudyMinutes: targetUser.totalStudyMinutes,
      weeklyStudyMinutes: targetUser.weeklyStudyMinutes,
      championCount: targetUser.championCount,
      createdAt: targetUser.createdAt,
      friendshipStatus,
      friendsCount,
      postsCount,
      messagePermission: targetUser.messagePermission,
      canMessage: isSelf ? false : (
        targetUser.messagePermission === 'EVERYONE' ||
        (targetUser.messagePermission === 'FRIENDS_ONLY' && isFriend)
      )
    };
  }

  public static async searchAndExploreUsers(
    requesterId: string,
    query?: string,
    language?: string,
    interest?: string,
    limit = 24
  ) {
    const prisma = getPrisma();

    // Get blocked list
    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: requesterId }, { blockedId: requesterId }]
      }
    });
    const blockedIds = new Set(blocks.map(b => b.blockerId === requesterId ? b.blockedId : b.blockerId));
    blockedIds.add(requesterId);

    const where: any = {
      id: { notIn: Array.from(blockedIds) },
      status: 'ACTIVE'
    };

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (language && language !== 'ALL') {
      where.learningLanguages = { has: language };
    }

    if (interest && interest !== 'ALL') {
      where.interests = { has: interest };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        location: true,
        interests: true,
        learningLanguages: true,
        totalStudyMinutes: true,
        championCount: true,
        createdAt: true
      },
      take: limit,
      orderBy: [
        { totalStudyMinutes: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Bulk resolve friendship statuses
    const results = await Promise.all(
      users.map(async u => {
        const friendshipStatus = await this.getFriendshipStatus(requesterId, u.id);
        return {
          ...u,
          friendshipStatus
        };
      })
    );

    return results;
  }

  // ==========================================
  // 2. FRIEND SYSTEM
  // ==========================================

  public static async getFriendshipStatus(
    user1Id: string,
    user2Id: string
  ): Promise<'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' | 'BLOCKED'> {
    if (user1Id === user2Id) return 'NONE';

    const prisma = getPrisma();
    const [userAId, userBId] = this.canonicalPair(user1Id, user2Id);

    // Check block
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: user1Id, blockedId: user2Id },
          { blockerId: user2Id, blockedId: user1Id }
        ]
      }
    });
    if (isBlocked) return 'BLOCKED';

    const friendship = await prisma.friendship.findUnique({
      where: {
        userAId_userBId: { userAId, userBId }
      }
    });

    if (!friendship) return 'NONE';
    if (friendship.status === 'ACCEPTED') return 'FRIENDS';
    if (friendship.status === 'BLOCKED') return 'BLOCKED';

    if (friendship.status === 'PENDING') {
      return friendship.initiatorId === user1Id ? 'REQUEST_SENT' : 'REQUEST_RECEIVED';
    }

    return 'NONE';
  }

  public static async sendFriendRequest(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new Error('Bạn không thể gửi lời mời kết bạn cho chính mình.');
    }

    const prisma = getPrisma();
    const [userAId, userBId] = this.canonicalPair(requesterId, targetUserId);

    // Verify target exists
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new Error('Người dùng không tồn tại.');

    // Check block
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: requesterId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: requesterId }
        ]
      }
    });
    if (isBlocked) throw new Error('Không thể kết bạn với người dùng này.');

    const existing = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } }
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return { success: true, status: 'FRIENDS', message: 'Hai bạn đã là bạn bè.' };
      }
      if (existing.status === 'PENDING') {
        // Double-send race condition: target sent request to requester already!
        if (existing.initiatorId !== requesterId) {
          // Auto-accept!
          await prisma.friendship.update({
            where: { id: existing.id },
            data: { status: 'ACCEPTED' }
          });
          return { success: true, status: 'FRIENDS', message: 'Đã chấp nhận lời mời kết bạn.' };
        }
        return { success: true, status: 'REQUEST_SENT', message: 'Lời mời kết bạn đã được gửi trước đó.' };
      }
      // Re-send if previously declined
      await prisma.friendship.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          initiatorId: requesterId
        }
      });
    } else {
      await prisma.friendship.create({
        data: {
          userAId,
          userBId,
          status: 'PENDING',
          initiatorId: requesterId
        }
      });
    }

    // Send in-app notification & Real-time Socket Dispatch
    const sender = await prisma.user.findUnique({ where: { id: requesterId }, select: { id: true, name: true, username: true, avatar: true } });
    try {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Lời mời kết bạn mới',
          message: `${sender?.name || 'Một người dùng'} vừa gửi lời mời kết bạn cho bạn.`,
          type: 'INFO',
          read: false
        }
      });
    } catch {}

    broadcastFriendRequest(targetUserId, {
      type: 'FRIEND_REQUEST',
      senderId: requesterId,
      senderName: sender?.name || 'Một người dùng',
      senderAvatar: sender?.avatar,
      createdAt: new Date().toISOString()
    });

    return { success: true, status: 'REQUEST_SENT', message: 'Đã gửi lời mời kết bạn.' };
  }

  public static async acceptFriendRequest(userId: string, targetUserId: string) {
    const prisma = getPrisma();
    const [userAId, userBId] = this.canonicalPair(userId, targetUserId);

    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } }
    });

    if (!friendship || friendship.status !== 'PENDING') {
      throw new Error('Không tìm thấy lời mời kết bạn cần chấp nhận.');
    }

    if (friendship.initiatorId === userId) {
      throw new Error('Bạn là người gửi lời mời này, không thể tự chấp nhận.');
    }

    await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED' }
    });

    // Notify initiator & Real-time Socket Dispatch
    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, username: true, avatar: true } });
    try {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Đã chấp nhận kết bạn 🎉',
          message: `${currentUser?.name || 'Bạn mới'} đã chấp nhận lời mời kết bạn của bạn.`,
          type: 'SUCCESS',
          read: false
        }
      });
    } catch {}

    broadcastFriendAccepted(targetUserId, {
      type: 'FRIEND_ACCEPTED',
      friendId: userId,
      friendName: currentUser?.name || 'Bạn mới',
      friendAvatar: currentUser?.avatar,
      updatedAt: new Date().toISOString()
    });

    return { success: true, status: 'FRIENDS', message: 'Đã trở thành bạn bè thành công.' };
  }

  public static async declineOrCancelFriendRequest(userId: string, targetUserId: string) {
    const prisma = getPrisma();
    const [userAId, userBId] = this.canonicalPair(userId, targetUserId);

    await prisma.friendship.deleteMany({
      where: {
        userAId,
        userBId,
        status: 'PENDING'
      }
    });

    return { success: true, status: 'NONE', message: 'Đã hủy lời mời kết bạn.' };
  }

  public static async removeFriend(userId: string, friendId: string) {
    const prisma = getPrisma();
    const [userAId, userBId] = this.canonicalPair(userId, friendId);

    await prisma.friendship.deleteMany({
      where: {
        userAId,
        userBId,
        status: 'ACCEPTED'
      }
    });

    return { success: true, status: 'NONE', message: 'Đã hủy kết bạn thành công.' };
  }

  public static async listFriends(userId: string, search?: string) {
    const prisma = getPrisma();

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'ACCEPTED'
      },
      include: {
        userA: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true,
            learningLanguages: true,
            totalStudyMinutes: true,
            championCount: true
          }
        },
        userB: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true,
            learningLanguages: true,
            totalStudyMinutes: true,
            championCount: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    let friends = friendships.map(f => {
      const friend = f.userAId === userId ? f.userB : f.userA;
      return {
        ...friend,
        friendshipId: f.id,
        friendsSince: f.updatedAt
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      friends = friends.filter(fr =>
        fr.name.toLowerCase().includes(q) ||
        (fr.username && fr.username.toLowerCase().includes(q))
      );
    }

    return friends;
  }

  public static async listPendingRequests(userId: string) {
    const prisma = getPrisma();

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'PENDING'
      },
      include: {
        userA: {
          select: { id: true, name: true, username: true, avatar: true, bio: true, learningLanguages: true }
        },
        userB: {
          select: { id: true, name: true, username: true, avatar: true, bio: true, learningLanguages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const received: any[] = [];
    const sent: any[] = [];

    friendships.forEach(f => {
      const otherUser = f.userAId === userId ? f.userB : f.userA;
      const item = {
        friendshipId: f.id,
        createdAt: f.createdAt,
        user: otherUser
      };
      if (f.initiatorId === userId) {
        sent.push(item);
      } else {
        received.push(item);
      }
    });

    return { received, sent };
  }

  public static async getMutualFriends(user1Id: string, user2Id: string) {
    const prisma = getPrisma();

    const [friends1, friends2] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          OR: [{ userAId: user1Id }, { userBId: user1Id }],
          status: 'ACCEPTED'
        }
      }),
      prisma.friendship.findMany({
        where: {
          OR: [{ userAId: user2Id }, { userBId: user2Id }],
          status: 'ACCEPTED'
        }
      })
    ]);

    const ids1 = new Set(friends1.map(f => f.userAId === user1Id ? f.userBId : f.userAId));
    const ids2 = new Set(friends2.map(f => f.userAId === user2Id ? f.userBId : f.userAId));

    const mutualIds = Array.from(ids1).filter(id => ids2.has(id));
    if (mutualIds.length === 0) return [];

    const mutualUsers = await prisma.user.findMany({
      where: { id: { in: mutualIds } },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true
      }
    });

    return mutualUsers;
  }

  // ==========================================
  // 3. SOCIAL FEED (Posts, Reactions, Comments)
  // ==========================================

  public static async listPosts(userId: string, options: { communityId?: string; authorId?: string; cursor?: string; limit?: number }) {
    const prisma = getPrisma();
    const limit = options.limit || 15;

    // Exclude blocked users
    const blocks = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }]
      }
    });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);

    const where: any = {
      userId: { notIn: blockedIds },
      status: 'PUBLISHED'
    };

    if (options.communityId) {
      where.communityId = options.communityId;
    } else if (options.authorId) {
      where.userId = options.authorId;
    }

    if (options.cursor) {
      where.createdAt = { lt: new Date(options.cursor) };
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            championCount: true
          }
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true
          }
        },
        reactions: {
          where: { userId },
          select: { type: true }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit + 1
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    const formatted = items.map(p => {
      let author = p.user;
      if (p.isAnonymous) {
        author = {
          id: p.userId,
          name: p.anonymousNickname || 'Bạn ẩn danh 🎭',
          username: null,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.id)}`,
          championCount: undefined
        };
      }
      return {
        id: p.id,
        content: p.content,
        images: p.images,
        tags: p.tags,
        lifeOsShareType: p.lifeOsShareType,
        lifeOsShareData: p.lifeOsShareData,
        likes: p.likes,
        commentsCount: p.commentsCount,
        sharesCount: p.sharesCount,
        isPinned: p.isPinned || false,
        isAnonymous: p.isAnonymous || false,
        anonymousNickname: p.anonymousNickname,
        poll: p.poll,
        meetSession: p.meetSession,
        achievementCard: p.achievementCard,
        status: p.status,
        createdAt: p.createdAt,
        user: author,
        community: p.community,
        myReaction: p.reactions.length > 0 ? p.reactions[0].type : null
      };
    });

    return {
      posts: formatted,
      nextCursor
    };
  }

  public static async createPost(userId: string, data: CreatePostDto) {
    if (!data.content?.trim() && (!data.images || data.images.length === 0) && !data.lifeOsShareData && !data.poll && !data.meetSession && !data.achievementCard) {
      throw new Error('Nội dung bài viết không được để trống.');
    }

    const prisma = getPrisma();
    let initialStatus = 'PUBLISHED';

    // If communityId, verify membership and approval settings
    if (data.communityId) {
      const comm = await prisma.community.findUnique({ where: { id: data.communityId } });
      const membership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: data.communityId, userId } }
      });
      if (!membership || membership.status !== 'ACTIVE') {
        throw new Error('Bạn cần tham gia nhóm trước khi đăng bài.');
      }
      if (membership.isMuted) {
        throw new Error('Bạn đang bị tạm cấm đăng bài trong nhóm này.');
      }
      if (comm?.requirePostApproval && comm.ownerId !== userId && membership.role !== 'MODERATOR') {
        initialStatus = 'PENDING_APPROVAL';
      }
    }

    const post = await prisma.post.create({
      data: {
        userId,
        communityId: data.communityId || null,
        content: data.content?.trim() || '',
        images: Array.isArray(data.images) ? data.images : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        lifeOsShareType: data.lifeOsShareType || null,
        lifeOsShareData: data.lifeOsShareData || null,
        visibility: data.visibility || 'PUBLIC',
        isAnonymous: Boolean(data.isAnonymous),
        anonymousNickname: data.isAnonymous ? (data.anonymousNickname?.trim() || 'Bạn Ẩn Danh 🎭') : null,
        poll: data.poll || null,
        meetSession: data.meetSession || null,
        achievementCard: data.achievementCard || null,
        status: initialStatus
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            championCount: true
          }
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true
          }
        }
      }
    });

    if (data.communityId && initialStatus === 'PUBLISHED') {
      await prisma.community.update({
        where: { id: data.communityId },
        data: { postCount: { increment: 1 } }
      });
    }

    const formattedPost = {
      ...post,
      myReaction: null,
      isPendingApproval: initialStatus === 'PENDING_APPROVAL'
    };

    // Real-time broadcast to all online users (Social Feed live cross-sync)
    if (initialStatus === 'PUBLISHED') {
      broadcastFeedPost(formattedPost);
    }

    return formattedPost;
  }

  // Vote on a Poll
  public static async votePoll(userId: string, postId: string, optionId: string) {
    const prisma = getPrisma();
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || !post.poll) throw new Error('Không tìm thấy cuộc bình chọn.');

    const poll = post.poll as any;
    if (!Array.isArray(poll.options)) throw new Error('Dữ liệu bình chọn không hợp lệ.');

    poll.options = poll.options.map((opt: any) => {
      const currentVotes = Array.isArray(opt.votes) ? opt.votes : [];
      if (opt.id === optionId) {
        if (currentVotes.includes(userId)) {
          return { ...opt, votes: currentVotes.filter((id: string) => id !== userId) };
        } else {
          return { ...opt, votes: [...currentVotes, userId] };
        }
      } else {
        return { ...opt, votes: currentVotes.filter((id: string) => id !== userId) };
      }
    });

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { poll }
    });

    return { success: true, poll: updated.poll };
  }

  // Pin/Unpin Post
  public static async pinPost(userId: string, postId: string) {
    const prisma = getPrisma();
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Không tìm thấy bài viết.');

    let canPin = false;
    if (post.communityId) {
      const comm = await prisma.community.findUnique({ where: { id: post.communityId } });
      const membership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: post.communityId, userId } }
      });
      if (comm?.ownerId === userId || membership?.role === 'MODERATOR') {
        canPin = true;
      }
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')) canPin = true;

    if (!canPin) throw new Error('Chỉ Quản trị viên mới có quyền ghim bài viết lên đầu.');

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned }
    });

    return { success: true, isPinned: updated.isPinned, message: updated.isPinned ? 'Đã ghim bài viết lên đầu' : 'Đã bỏ ghim bài viết' };
  }

  // Edit Post
  public static async editPost(userId: string, postId: string, content: string) {
    const prisma = getPrisma();
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Không tìm thấy bài viết.');
    if (post.userId !== userId) throw new Error('Bạn không có quyền sửa bài viết này.');

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { content: content.trim() }
    });

    return { success: true, post: updated, message: 'Đã cập nhật bài viết thành công.' };
  }

  // Admin: Get all groups stats and live meets
  public static async getAdminCommunitiesStats() {
    const prisma = getPrisma();
    const [communities, liveMeets, totalPosts, totalMessages] = await Promise.all([
      prisma.community.findMany({
        include: {
          owner: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { memberCount: 'desc' }
      }),
      prisma.communityMeet.findMany({
        where: { status: 'LIVE' },
        include: {
          community: { select: { id: true, name: true } },
          host: { select: { id: true, name: true } }
        }
      }),
      prisma.post.count(),
      prisma.communityChatMessage.count()
    ]);

    const formattedCommunities = communities.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      category: c.category,
      privacy: c.privacy,
      memberCount: c.memberCount,
      postCount: c.postCount,
      owner: c.owner,
      storageBytes: c.storageBytes ? c.storageBytes.toString() : '0',
      createdAt: c.createdAt
    }));

    return {
      success: true,
      totalCommunities: communities.length,
      totalLiveMeets: liveMeets.length,
      totalPosts,
      totalMessages,
      communities: formattedCommunities,
      liveMeets
    };
  }

  // Admin: Delete community
  public static async adminDeleteCommunity(communityId: string) {
    const prisma = getPrisma();
    await prisma.community.delete({ where: { id: communityId } });
    return { success: true, message: 'Đã xóa cộng đồng thành công.' };
  }

  public static async deletePost(userId: string, postId: string) {
    const prisma = getPrisma();
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Bài viết không tồn tại.');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    if (post.userId !== userId && !isAdmin) {
      throw new Error('Bạn không có quyền xóa bài viết này.');
    }

    await prisma.post.delete({ where: { id: postId } });

    if (post.communityId) {
      await prisma.community.update({
        where: { id: post.communityId },
        data: { postCount: { decrement: 1 } }
      }).catch(() => {});
    }

    return { success: true };
  }

  public static async toggleReaction(userId: string, postId: string, type = 'LIKE') {
    const prisma = getPrisma();

    const existing = await prisma.postReaction.findUnique({
      where: { postId_userId: { postId, userId } }
    });

    let newReaction: string | null = null;

    if (existing) {
      if (existing.type === type) {
        // Toggle OFF
        await prisma.postReaction.delete({ where: { id: existing.id } });
        await prisma.post.update({
          where: { id: postId },
          data: { likes: { decrement: 1 } }
        });
        newReaction = null;
      } else {
        // Change reaction type
        await prisma.postReaction.update({
          where: { id: existing.id },
          data: { type }
        });
        newReaction = type;
      }
    } else {
      // Create reaction
      await prisma.postReaction.create({
        data: { postId, userId, type }
      });
      await prisma.post.update({
        where: { id: postId },
        data: { likes: { increment: 1 } }
      });
      newReaction = type;

      // Notify post author if not self
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
      if (post && post.userId !== userId) {
        const reactor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        try {
          await prisma.notification.create({
            data: {
              userId: post.userId,
              title: 'Tương tác mới',
              message: `${reactor?.name || 'Một người dùng'} vừa bày tỏ cảm xúc về bài viết của bạn.`,
              type: 'INFO',
              read: false
            }
          });
        } catch {}
      }
    }

    const updatedPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { likes: true }
    });

    return {
      success: true,
      myReaction: newReaction,
      likes: updatedPost?.likes || 0
    };
  }

  public static async listComments(postId: string) {
    const prisma = getPrisma();
    const comments = await prisma.postComment.findMany({
      where: { postId },
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
      orderBy: { createdAt: 'asc' }
    });

    return comments;
  }

  public static async addComment(userId: string, postId: string, content: string, parentId?: string) {
    if (!content.trim()) throw new Error('Nội dung bình luận không được để trống.');

    const prisma = getPrisma();
    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId,
        parentId: parentId || null,
        content: content.trim()
      },
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
      }
    });

    await prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } }
    });

    // Notify post author
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
    if (post && post.userId !== userId) {
      try {
        await prisma.notification.create({
          data: {
            userId: post.userId,
            title: 'Bình luận mới',
            message: `${comment.user.name} đã bình luận vào bài viết của bạn.`,
            type: 'INFO',
            read: false
          }
        });
      } catch {}
    }

    return comment;
  }

  public static async deleteComment(userId: string, commentId: string) {
    const prisma = getPrisma();
    const comment = await prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Bình luận không tồn tại.');

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    if (comment.userId !== userId && !isAdmin) {
      throw new Error('Bạn không có quyền xóa bình luận này.');
    }

    await prisma.postComment.delete({ where: { id: commentId } });
    await prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } }
    }).catch(() => {});

    return { success: true };
  }

  // ==========================================
  // 4. COMMUNITIES
  // ==========================================

  public static async listCommunities(search?: string, category?: string, userId?: string) {
    const prisma = getPrisma();
    const where: any = {};

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    const communities = await prisma.community.findMany({
      where,
      include: {
        members: userId ? {
          where: { userId },
          select: { role: true, status: true }
        } : false
      },
      orderBy: [
        { memberCount: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return communities.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      avatar: c.avatar,
      coverImage: c.coverImage,
      category: c.category,
      privacy: c.privacy,
      memberCount: c.memberCount,
      postCount: c.postCount,
      createdAt: c.createdAt,
      isMember: c.members && c.members.length > 0 && c.members[0].status === 'ACTIVE',
      membershipRole: c.members && c.members.length > 0 ? c.members[0].role : null
    }));
  }

  public static async createCommunity(userId: string, data: CreateCommunityDto) {
    if (!data.name.trim()) throw new Error('Tên cộng đồng không được để trống.');

    const prisma = getPrisma();

    // Generate unique slug
    let baseSlug = data.name.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'community';
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.community.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const community = await prisma.community.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description.trim() || 'Cộng đồng học tập & phát triển bản thân trên LifeOS.',
        category: data.category || 'GENERAL',
        privacy: data.privacy || 'PUBLIC',
        avatar: data.avatar || null,
        coverImage: data.coverImage || null,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
            status: 'ACTIVE'
          }
        }
      }
    });

    return community;
  }

  public static async joinCommunity(userId: string, communityId: string) {
    const prisma = getPrisma();
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new Error('Cộng đồng không tồn tại.');

    const existing = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });

    if (existing && existing.status === 'ACTIVE') {
      return { success: true, message: 'Bạn đã là thành viên của cộng đồng này.' };
    }

    const status = community.privacy === 'APPROVAL_REQUIRED' ? 'PENDING' : 'ACTIVE';

    if (existing) {
      await prisma.communityMember.update({
        where: { id: existing.id },
        data: { status }
      });
    } else {
      await prisma.communityMember.create({
        data: { communityId, userId, role: 'MEMBER', status }
      });
    }

    if (status === 'ACTIVE') {
      await prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 } }
      });
    }

    return {
      success: true,
      status,
      message: status === 'ACTIVE' ? 'Đã tham gia cộng đồng thành công!' : 'Yêu cầu tham gia đang chờ phê duyệt.'
    };
  }

  public static async leaveCommunity(userId: string, communityId: string) {
    const prisma = getPrisma();
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } }
    });

    if (!membership) {
      return { success: true, message: 'Bạn không ở trong cộng đồng này.' };
    }

    if (membership.role === 'OWNER') {
      throw new Error('Chủ sở hữu nhóm không thể rời cộng đồng. Hãy chuyển quyền trước.');
    }

    await prisma.communityMember.delete({ where: { id: membership.id } });
    if (membership.status === 'ACTIVE') {
      await prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } }
      }).catch(() => {});
    }

    return { success: true, message: 'Đã rời khỏi cộng đồng.' };
  }

  public static async listCommunityMembers(communityId: string) {
    const prisma = getPrisma();
    const members = await prisma.communityMember.findMany({
      where: { communityId, status: 'ACTIVE' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true,
            totalStudyMinutes: true,
            championCount: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' }
      ]
    });

    return members;
  }

  // ==========================================
  // 5. SAFETY & MODERATION
  // ==========================================

  public static async blockUser(blockerId: string, targetUserId: string) {
    if (blockerId === targetUserId) throw new Error('Không thể chặn chính mình.');

    const prisma = getPrisma();
    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId: targetUserId } },
      create: { blockerId, blockedId: targetUserId },
      update: {}
    });

    // Automatically remove friendship
    const [userAId, userBId] = this.canonicalPair(blockerId, targetUserId);
    await prisma.friendship.deleteMany({
      where: { userAId, userBId }
    });

    return { success: true, message: 'Đã chặn người dùng.' };
  }

  public static async unblockUser(blockerId: string, targetUserId: string) {
    const prisma = getPrisma();
    await prisma.userBlock.deleteMany({
      where: { blockerId, blockedId: targetUserId }
    });

    return { success: true, message: 'Đã bỏ chặn người dùng.' };
  }

  public static async getBlockedUsers(userId: string) {
    const prisma = getPrisma();
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, name: true, username: true, avatar: true }
        }
      }
    });

    return blocks.map(b => b.blocked);
  }

  public static async submitReport(reporterId: string, data: { targetType: string; targetId: string; reason: string; details?: string }) {
    if (!data.reason.trim()) throw new Error('Lý do báo cáo không được để trống.');

    const prisma = getPrisma();
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason.trim(),
        details: data.details?.trim() || null
      }
    });

    return { success: true, reportId: report.id, message: 'Báo cáo của bạn đã được ghi nhận và chuyển tới đội ngũ kiểm duyệt.' };
  }
}
