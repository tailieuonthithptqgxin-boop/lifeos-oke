import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface GlobalChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export interface PaginationResult {
  messages: GlobalChatMessage[];
  hasMore: boolean;
  totalCount: number;
}

class GlobalChatService {
  private messages: GlobalChatMessage[] = [];
  private readonly MAX_MESSAGES = 1000;
  private isDirty = false;
  private userLastMessageTime: Map<string, number> = new Map();
  private listeners: Set<(data: { event: string; payload: any }) => void> = new Set();
  private snapshotTimer: NodeJS.Timeout | null = null;
  private activeConnections = 0;
  private snapshotFilePath: string;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.warn('[GlobalChat] Could not create data directory:', err);
      }
    }
    this.snapshotFilePath = path.join(dataDir, 'global-chat-snapshot.json');

    // 1. Initial Load: Read snapshot from disk into RAM
    this.loadSnapshot();

    // 2. Periodic Write-Behind Snapshot every 30 seconds
    this.snapshotTimer = setInterval(() => {
      this.saveSnapshotAsync().catch((err) => {
        console.warn('[GlobalChat] Periodic snapshot error:', err);
      });
    }, 30000);
    if (this.snapshotTimer.unref) this.snapshotTimer.unref();
  }

  /**
   * Load snapshot on server startup
   */
  private loadSnapshot() {
    try {
      if (fs.existsSync(this.snapshotFilePath)) {
        const raw = fs.readFileSync(this.snapshotFilePath, 'utf-8');
        if (raw && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Keep at most MAX_MESSAGES
            this.messages = parsed.slice(-this.MAX_MESSAGES);
            console.log(`[GlobalChat] Đã nạp ${this.messages.length} tin nhắn cộng đồng từ snapshot vào RAM.`);
            return;
          }
        }
      }
    } catch (err: any) {
      console.warn('[GlobalChat] Failed to read snapshot file, starting fresh:', err.message);
    }

    // Default friendly initial message if starting completely fresh
    this.messages = [
      {
        id: crypto.randomUUID(),
        userId: 'system',
        userName: 'LifeOS Community Bot',
        userAvatar: 'https://ui-avatars.com/api/?name=LifeOS+Bot&background=10B981&color=fff',
        content: 'Chào mừng bạn đến với Phòng Chat Cộng Đồng LifeOS! Chúc bạn có một ngày làm việc và học tập hiệu quả.',
        createdAt: new Date().toISOString()
      }
    ];
    this.isDirty = true;
  }

  /**
   * Asynchronous Write-Behind Snapshot to avoid blocking Node.js Event Loop
   */
  public async saveSnapshotAsync(): Promise<void> {
    if (!this.isDirty) return;

    try {
      const json = JSON.stringify(this.messages);
      await fs.promises.writeFile(this.snapshotFilePath, json, 'utf-8');
      this.isDirty = false;
    } catch (err: any) {
      console.warn('[GlobalChat] Asynchronous snapshot save failed:', err.message);
    }
  }

  /**
   * Synchronous Snapshot Save on SIGINT/SIGTERM shutdown
   */
  public saveSnapshotSync(): void {
    if (!this.isDirty) return;

    try {
      const json = JSON.stringify(this.messages);
      fs.writeFileSync(this.snapshotFilePath, json, 'utf-8');
      this.isDirty = false;
      console.log(`[GlobalChat] Đã lưu an toàn ${this.messages.length} tin nhắn xuống snapshot trước khi tắt server.`);
    } catch (err: any) {
      console.warn('[GlobalChat] Synchronous snapshot save failed on shutdown:', err.message);
    }
  }

  /**
   * Cursor-based pagination from In-Memory Ring Buffer
   */
  public getMessages(beforeId?: string, limit: number = 50): PaginationResult {
    const safeLimit = Math.min(100, Math.max(10, Number(limit) || 50));

    if (!beforeId) {
      // User just joined: Return last 50 messages
      const startIndex = Math.max(0, this.messages.length - safeLimit);
      const chunk = this.messages.slice(startIndex);
      const hasMore = startIndex > 0;
      return {
        messages: chunk,
        hasMore,
        totalCount: this.messages.length
      };
    }

    // User is scrolling UP: Locate beforeId and slice up to 50 messages before it
    const targetIndex = this.messages.findIndex((m) => m.id === beforeId);
    if (targetIndex === -1) {
      // If beforeId is no longer in ring buffer (e.g. rolled out of 1000 buffer), return oldest available
      const chunk = this.messages.slice(0, safeLimit);
      return {
        messages: chunk,
        hasMore: false,
        totalCount: this.messages.length
      };
    }

    const startIndex = Math.max(0, targetIndex - safeLimit);
    const chunk = this.messages.slice(startIndex, targetIndex);
    const hasMore = startIndex > 0;

    return {
      messages: chunk,
      hasMore,
      totalCount: this.messages.length
    };
  }

  /**
   * Post a new message with Rate-Limiting and Ring Buffer capping
   */
  public postMessage(
    user: { id: string; name: string; avatar?: string },
    rawContent: string
  ): { success: boolean; message?: GlobalChatMessage; error?: string } {
    const cleanContent = (rawContent || '').trim();

    if (!cleanContent) {
      return { success: false, error: 'Nội dung tin nhắn không được để trống.' };
    }

    if (cleanContent.length > 300) {
      return { success: false, error: 'Tin nhắn tối đa 300 ký tự để tối ưu tốc độ.' };
    }

    // Rate Limit: 2 seconds minimum gap per user
    const now = Date.now();
    const lastMsgTime = this.userLastMessageTime.get(user.id) || 0;
    if (now - lastMsgTime < 2000) {
      const waitSeconds = Math.ceil((2000 - (now - lastMsgTime)) / 1000);
      return { success: false, error: `Vui lòng đợi ${waitSeconds}s trước khi gửi tin nhắn tiếp theo.` };
    }

    this.userLastMessageTime.set(user.id, now);

    const newMsg: GlobalChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content: cleanContent,
      createdAt: new Date().toISOString()
    };

    // Push into RAM Ring Buffer
    this.messages.push(newMsg);

    // If buffer exceeds MAX_MESSAGES, shift oldest
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }

    this.isDirty = true;
    this.broadcast('new_message', newMsg);

    return { success: true, message: newMsg };
  }

  /**
   * Active Online Presence & Realtime SSE Subscription
   */
  public subscribe(listener: (data: { event: string; payload: any }) => void) {
    this.listeners.add(listener);
    this.activeConnections++;
    this.broadcastOnlineCount();

    return () => {
      this.listeners.delete(listener);
      this.activeConnections = Math.max(0, this.activeConnections - 1);
      this.broadcastOnlineCount();
    };
  }

  public getOnlineCount(): number {
    return Math.max(1, this.activeConnections);
  }

  private broadcastOnlineCount() {
    this.broadcast('online_count', { count: this.getOnlineCount() });
  }

  private broadcast(event: string, payload: any) {
    this.listeners.forEach((fn) => {
      try {
        fn({ event, payload });
      } catch (err) {
        this.listeners.delete(fn);
      }
    });
  }
}

export const globalChatService = new GlobalChatService();
