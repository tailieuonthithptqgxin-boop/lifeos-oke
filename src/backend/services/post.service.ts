import { getPrisma } from '../db.js';

export interface CreatePostParams {
  content: string;
  images?: string[];
}

export class PostService {
  private userLastPostTime: Map<string, number> = new Map();
  private readonly SPAM_COOLDOWN_MS = 10000; // 10 seconds

  /**
   * Get paginated community feed posts (Newest first)
   */
  async getPosts(page: number = 1, limit: number = 10) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    const prisma = getPrisma();

    const [total, posts] = await Promise.all([
      prisma.post.count(),
      prisma.post.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true
            }
          }
        }
      })
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 1;
    const hasMore = safePage < totalPages;

    return {
      posts,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasMore
      }
    };
  }

  /**
   * Create a new community post (with 10-second anti-spam protection)
   */
  async createPost(userId: string, params: CreatePostParams) {
    const prisma = getPrisma();

    // 1. Anti-spam check: 10 seconds gap
    const now = Date.now();
    const lastPostTime = this.userLastPostTime.get(userId) || 0;
    if (now - lastPostTime < this.SPAM_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((this.SPAM_COOLDOWN_MS - (now - lastPostTime)) / 1000);
      throw new Error(`Bạn đang đăng quá nhanh. Vui lòng đợi ${waitSeconds} giây nữa.`);
    }

    // 2. Validate content
    const cleanContent = (params.content || '').trim();
    if (!cleanContent) {
      throw new Error('Nội dung bài viết không được để trống.');
    }

    if (cleanContent.length > 1000) {
      throw new Error('Nội dung bài viết tối đa 1.000 ký tự.');
    }

    // 3. Validate image URLs (max 4 images, zero local disk storage)
    const validImages: string[] = [];
    if (Array.isArray(params.images)) {
      for (const img of params.images.slice(0, 4)) {
        if (typeof img === 'string') {
          const trimmed = img.trim();
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
            validImages.push(trimmed);
          }
        }
      }
    }

    // 4. Save to PostgreSQL Database
    const newPost = await prisma.post.create({
      data: {
        userId,
        content: cleanContent,
        images: validImages
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        }
      }
    });

    this.userLastPostTime.set(userId, now);
    return newPost;
  }

  /**
   * Like / Cheer a post
   */
  async likePost(postId: string) {
    const prisma = getPrisma();
    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        likes: {
          increment: 1
        }
      },
      select: {
        id: true,
        likes: true
      }
    });
    return updated;
  }

  /**
   * Delete post (Post owner or Admin only)
   */
  async deletePost(postId: string, userId: string, isAdmin: boolean) {
    const prisma = getPrisma();
    const existing = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true }
    });

    if (!existing) {
      throw new Error('Bài viết không tồn tại.');
    }

    if (existing.userId !== userId && !isAdmin) {
      throw new Error('Bạn không có quyền xóa bài viết này.');
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    return { success: true };
  }
}

export const postService = new PostService();
