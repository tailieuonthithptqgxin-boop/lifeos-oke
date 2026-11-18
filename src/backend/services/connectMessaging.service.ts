import { getPrisma } from '../db';
import { ConnectService } from './connect.service';

type MessageEventListener = (data: { event: string; payload: any }) => void;

export class ConnectMessagingService {
  // In-Memory SSE event listener registry for real-time messaging
  // Key: userId -> Set<MessageEventListener>
  private static userStreams: Map<string, Set<MessageEventListener>> = new Map();

  private static canonicalPair(id1: string, id2: string): [string, string] {
    return id1 < id2 ? [id1, id2] : [id2, id1];
  }

  // Register an SSE client stream
  public static subscribeUser(userId: string, listener: MessageEventListener): () => void {
    if (!this.userStreams.has(userId)) {
      this.userStreams.set(userId, new Set());
    }
    this.userStreams.get(userId)!.add(listener);

    return () => {
      const set = this.userStreams.get(userId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.userStreams.delete(userId);
        }
      }
    };
  }

  // Push real-time event to a user if connected
  private static emitToUser(userId: string, event: string, payload: any) {
    const listeners = this.userStreams.get(userId);
    if (!listeners || listeners.size === 0) return;
    listeners.forEach(fn => {
      try {
        fn({ event, payload });
      } catch (err) {
        listeners.delete(fn);
      }
    });
  }

  // Get or Create canonical conversation between two users
  public static async getOrCreateConversation(user1Id: string, user2Id: string) {
    if (user1Id === user2Id) throw new Error('Không thể tạo cuộc trò chuyện với chính mình.');

    const prisma = getPrisma();
    const [u1, u2] = this.canonicalPair(user1Id, user2Id);

    // Verify target exists
    const target = await prisma.user.findUnique({ where: { id: user2Id } });
    if (!target) throw new Error('Người dùng không tồn tại.');

    // Check if blocked
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: user1Id, blockedId: user2Id },
          { blockerId: user2Id, blockedId: user1Id }
        ]
      }
    });
    if (isBlocked) throw new Error('Không thể trò chuyện với người dùng này.');

    // Check message permission
    const isFriend = (await ConnectService.getFriendshipStatus(user1Id, user2Id)) === 'FRIENDS';
    if (target.messagePermission === 'NO_ONE') {
      throw new Error('Người dùng này đã tắt nhận tin nhắn từ mọi người.');
    }
    if (target.messagePermission === 'FRIENDS_ONLY' && !isFriend) {
      throw new Error('Người dùng này chỉ nhận tin nhắn từ bạn bè.');
    }

    let conv = await prisma.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } }
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          user1Id: u1,
          user2Id: u2
        }
      });
    }

    return conv;
  }

  // List all conversations of a user with other participant details & unread badge
  public static async listConversations(userId: string) {
    const prisma = getPrisma();

    const convs = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }]
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    const otherUserIds = convs.map(c => c.user1Id === userId ? c.user2Id : c.user1Id);
    const users = await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        totalStudyMinutes: true,
        championCount: true
      }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return convs.map(c => {
      const otherUserId = c.user1Id === userId ? c.user2Id : c.user1Id;
      const unreadCount = c.user1Id === userId ? c.user1UnreadCount : c.user2UnreadCount;
      const otherUser = userMap.get(otherUserId) || {
        id: otherUserId,
        name: 'Thành viên',
        username: null,
        avatar: null,
        totalStudyMinutes: 0,
        championCount: 0
      };

      return {
        id: c.id,
        otherUser,
        lastMessageText: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
        unreadCount
      };
    });
  }

  // List paginated messages inside a conversation
  public static async listMessages(conversationId: string, userId: string, cursor?: string, limit = 40) {
    const prisma = getPrisma();

    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new Error('Cuộc hội thoại không tồn tại.');

    if (conv.user1Id !== userId && conv.user2Id !== userId) {
      throw new Error('Bạn không có quyền truy cập cuộc trò chuyện này.');
    }

    const where: any = { conversationId };
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await prisma.directMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    // Return in chronological order
    return {
      messages: items.reverse(),
      nextCursor
    };
  }

  // Send a direct message
  public static async sendDirectMessage(
    senderId: string,
    conversationId: string,
    content: string,
    clientTempId?: string
  ) {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Tin nhắn không được để trống.');

    const prisma = getPrisma();
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new Error('Cuộc trò chuyện không tồn tại.');

    if (conv.user1Id !== senderId && conv.user2Id !== senderId) {
      throw new Error('Bạn không phải thành viên của cuộc trò chuyện này.');
    }

    const receiverId = conv.user1Id === senderId ? conv.user2Id : conv.user1Id;

    // Check block
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId }
        ]
      }
    });
    if (isBlocked) throw new Error('Không thể gửi tin nhắn cho người dùng này.');

    // Check duplicate if clientTempId provided
    if (clientTempId) {
      const existing = await prisma.directMessage.findFirst({
        where: { conversationId, clientTempId }
      });
      if (existing) return existing;
    }

    // Database transaction: create message & update conversation metadata atomically
    const isUser1Sender = conv.user1Id === senderId;
    const [message] = await prisma.$transaction([
      prisma.directMessage.create({
        data: {
          conversationId,
          senderId,
          receiverId,
          content: trimmed,
          clientTempId: clientTempId || null
        }
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageText: trimmed,
          lastMessageAt: new Date(),
          ...(isUser1Sender
            ? { user2UnreadCount: { increment: 1 } }
            : { user1UnreadCount: { increment: 1 } })
        }
      })
    ]);

    // Real-time broadcast to both sender & receiver via SSE
    this.emitToUser(receiverId, 'new_direct_message', {
      conversationId,
      message
    });
    this.emitToUser(senderId, 'message_delivered', {
      conversationId,
      message
    });

    return message;
  }

  // Mark all unread messages as read
  public static async markConversationAsRead(userId: string, conversationId: string) {
    const prisma = getPrisma();
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) return { success: false };

    if (conv.user1Id !== userId && conv.user2Id !== userId) {
      return { success: false };
    }

    const isUser1 = conv.user1Id === userId;
    const otherUserId = isUser1 ? conv.user2Id : conv.user1Id;
    const now = new Date();

    await prisma.$transaction([
      prisma.directMessage.updateMany({
        where: {
          conversationId,
          receiverId: userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: now
        }
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: isUser1 ? { user1UnreadCount: 0 } : { user2UnreadCount: 0 }
      })
    ]);

    // Real-time notify other user that messages were read
    this.emitToUser(otherUserId, 'messages_read_receipt', {
      conversationId,
      readAt: now
    });

    return { success: true };
  }
}
