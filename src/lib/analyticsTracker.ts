// ==============================================================================
// SMART BATCHING ANALYTICS TRACKER (Mobile-First / Free-Tier Zero-Crash Engine)
// ==============================================================================
// 1. Ghi nhận tức thì vào Memory & LocalStorage (0ms latency, không block UI).
// 2. Chống sập server: Gom nhóm (Batching) và chỉ đồng bộ ngầm định kỳ (mỗi 60s)
//    hoặc khi người dùng chuyển chặng / ẩn tab (visibilitychange / pagehide).
// 3. Tự động phục hồi bộ đệm nếu rớt mạng, không làm mất dấu hoạt động.

export interface FeatureTrackEvent {
  featureKey: string;
  featureName: string;
  count: number;
  durationSeconds: number;
  lastActiveAt: number;
}

const STORAGE_BUFFER_KEY = 'lifeos_analytics_pending_buffer_v1';
const SYNC_INTERVAL_MS = 60000; // 60s batch sync

// Bảng ánh xạ tên chức năng tiếng Việt chuẩn hoá
export const FEATURE_NAME_MAP: Record<string, { name: string; category: string; icon: string }> = {
  dashboard: { name: 'Bảng Điều Khiển (Dashboard)', category: 'Tổng quan', icon: '📊' },
  tasks: { name: 'Công Việc & Lịch Trình (Tasks)', category: 'Năng suất', icon: '✅' },
  calendar: { name: 'Lịch Biểu Thời Gian (Calendar)', category: 'Năng suất', icon: '📅' },
  finance: { name: 'Quản Lý Tài Chính (Finance)', category: 'Tài chính', icon: '💰' },
  focus: { name: 'Tập Trung Pomodoro & Lofi (Focus)', category: 'Năng suất', icon: '🎧' },
  habits: { name: 'Theo Dõi Thói Quen (Habits)', category: 'Đời sống', icon: '🔥' },
  notes: { name: 'Ghi Chú & Kiến Thức (Notes)', category: 'Kiến thức', icon: '📝' },
  'study-space': { name: 'Phòng Học Trực Tuyến (Study Space)', category: 'Học tập', icon: '👑' },
  classroom: { name: 'Lớp Học Online & Meet (Classroom)', category: 'Học tập', icon: '🎓' },
  vocab: { name: 'Luyện Từ Vựng Siêu Trí Nhớ (Vocab Master)', category: 'Học tập', icon: '📚' },
  goals: { name: 'Mục Tiêu Cuộc Sống (Goals)', category: 'Chiến lược', icon: '🎯' },
  projects: { name: 'Quản Lý Dự Án (Projects)', category: 'Công việc', icon: '🚀' },
  journey: { name: 'Hành Trình & Cấp Độ RPG (Journey)', category: 'Game hóa', icon: '⚔️' },
  connect: { name: 'Không Gian Kết Nối Bạn Bè (Connect)', category: 'Mạng xã hội', icon: '🤝' },
  feed: { name: 'Bảng Tin Cộng Đồng (Community Feed)', category: 'Mạng xã hội', icon: '🌐' },
  referral: { name: 'Cổng Quản Lý CTV & Giới Thiệu (Affiliate)', category: 'Thu nhập', icon: '⭐' },
  affiliate: { name: 'Cổng Quản Lý CTV & Giới Thiệu (Affiliate)', category: 'Thu nhập', icon: '⭐' },
  automation: { name: 'Tự Động Hóa Quy Trình (Automation)', category: 'Tiện ích', icon: '⚡' },
  decision: { name: 'Động Cơ Ra Quyết Định (Decision)', category: 'Tư duy', icon: '💡' },
  marketplace: { name: 'Kho Ứng Dụng & Gói Mẫu (Marketplace)', category: 'Hệ sinh thái', icon: '🛒' },
  account: { name: 'Hồ Sơ & Tài Khoản Của Tôi (My Account)', category: 'Cá nhân', icon: '👤' },
  subscription: { name: 'Gói Dịch Vụ SaaS (Subscription)', category: 'Dịch vụ', icon: '💳' },
  checkout: { name: 'Trang Thanh Toán & QR (Checkout)', category: 'Dịch vụ', icon: '🛍️' }
};

class SmartAnalyticsTracker {
  private buffer: Map<string, FeatureTrackEvent> = new Map();
  private syncTimer: any = null;
  private currentActiveFeature: string | null = null;
  private sessionStartTime: number = Date.now();
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadBufferFromStorage();
      this.setupLifecycleListeners();
      this.startPeriodicSync();
    }
  }

  private loadBufferFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_BUFFER_KEY);
      if (raw) {
        const parsed: Record<string, FeatureTrackEvent> = JSON.parse(raw);
        Object.entries(parsed).forEach(([key, val]) => {
          this.buffer.set(key, val);
        });
      }
    } catch {
      // Bỏ qua lỗi phân tích localStorage
    }
  }

  private persistBufferToStorage() {
    try {
      const obj: Record<string, FeatureTrackEvent> = {};
      this.buffer.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(STORAGE_BUFFER_KEY, JSON.stringify(obj));
    } catch {
      // LocalStorage đầy hoặc bị chặn
    }
  }

  private setupLifecycleListeners() {
    // 1. Khi người dùng ẩn trình duyệt, đổi tab hoặc đóng app: Bắn sync tức thì
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.snapshotCurrentSession();
        this.flushSync(true);
      } else {
        this.sessionStartTime = Date.now();
      }
    });

    // 2. Sự kiện pagehide bảo đảm gửi beacon trước khi tắt hoàn toàn
    window.addEventListener('pagehide', () => {
      this.snapshotCurrentSession();
      this.flushSync(true);
    });
  }

  private startPeriodicSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      this.snapshotCurrentSession();
      this.flushSync(false);
    }, SYNC_INTERVAL_MS);
  }

  private snapshotCurrentSession() {
    if (!this.currentActiveFeature) return;
    const now = Date.now();
    const elapsedSeconds = Math.max(1, Math.min(300, Math.floor((now - this.sessionStartTime) / 1000)));
    this.sessionStartTime = now;

    const existing = this.buffer.get(this.currentActiveFeature);
    if (existing) {
      existing.durationSeconds += elapsedSeconds;
      existing.lastActiveAt = now;
    }
    this.persistBufferToStorage();
  }

  /**
   * Ghi nhận chuyển chặng / mở một chức năng trong LifeOS
   */
  public trackFeatureView(featureKey: string, customName?: string) {
    if (!featureKey) return;

    // Chốt thời gian của màn hình trước đó
    this.snapshotCurrentSession();

    this.currentActiveFeature = featureKey;
    this.sessionStartTime = Date.now();

    const meta = FEATURE_NAME_MAP[featureKey] || {
      name: customName || featureKey,
      category: 'Khác',
      icon: '✨'
    };

    const existing = this.buffer.get(featureKey);
    if (existing) {
      existing.count += 1;
      existing.lastActiveAt = Date.now();
    } else {
      this.buffer.set(featureKey, {
        featureKey,
        featureName: meta.name,
        count: 1,
        durationSeconds: 2,
        lastActiveAt: Date.now()
      });
    }

    this.persistBufferToStorage();
  }

  /**
   * Đồng bộ ngầm lên server (Batching)
   */
  public async flushSync(useBeacon: boolean = false) {
    if (this.buffer.size === 0 || this.isSyncing) return;

    const events = Array.from(this.buffer.values());
    const payload = JSON.stringify({ events });

    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/analytics/track-batch', blob);
      if (sent) {
        this.buffer.clear();
        this.persistBufferToStorage();
        return;
      }
    }

    this.isSyncing = true;
    try {
      const res = await fetch('/api/analytics/track-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: payload,
        keepalive: true
      });

      if (res.ok) {
        this.buffer.clear();
        this.persistBufferToStorage();
      }
    } catch {
      // Giữ nguyên buffer trong localStorage để gửi vào lần sync tiếp theo
    } finally {
      this.isSyncing = false;
    }
  }
}

export const analyticsTracker = new SmartAnalyticsTracker();
