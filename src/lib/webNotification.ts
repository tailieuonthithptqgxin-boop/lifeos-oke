// Web Notification & PWA Push API Helper for LifeOS
// Enables Lock Screen Schedule Card (Duolingo-style Live Schedule Widget) and background reminders

export interface WidgetSummaryTask {
  id: string;
  title: string;
  priority: string;
  timeSlot: string;
  status: string;
  category: string;
}

export interface WidgetSummaryData {
  streak: number;
  rpgLevel?: number;
  topTasks: WidgetSummaryTask[];
  totalTasksToday: number;
  completedTasksToday: number;
  completionPercent: number;
  mascot: {
    mood: 'happy' | 'cheering' | 'nudging' | 'resting';
    quote: string;
    imageUrl: string;
    avatarEmoji: string;
  };
  generatedAt: string;
}

export const webNotification = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  },

  async getWidgetSummary(): Promise<WidgetSummaryData | null> {
    try {
      const res = await fetch('/api/widget/summary', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json;
    } catch (err) {
      console.warn('[WebNotification] Failed to fetch widget summary:', err);
      return null;
    }
  },

  async completeTopTask(): Promise<boolean> {
    try {
      const res = await fetch('/api/widget/complete-top-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      return res.ok;
    } catch (err) {
      console.warn('[WebNotification] Failed to complete top task:', err);
      return false;
    }
  },

  /**
   * Đồng bộ & Ghim thẻ thời gian biểu (Lock Screen Schedule Card) ra màn hình khóa / khay thông báo.
   * - tag: 'live-schedule-widget' (cố định để ghi đè mượt mà)
   * - renotify: false (không rung chuông làm phiền khi cập nhật tiến độ)
   * - requireInteraction: true (thẻ luôn ghim trên màn hình khóa điện thoại)
   * - Actions: 'Hoàn thành việc hiện tại' & 'Mở lịch trình'
   */
  async syncLockScreenLiveCard(customSummary?: WidgetSummaryData): Promise<boolean> {
    if (!this.isSupported()) return false;

    if (Notification.permission !== 'granted') {
      const result = await this.requestPermission();
      if (result !== 'granted') return false;
    }

    try {
      const summary = customSummary || (await this.getWidgetSummary());
      if (!summary) return false;

      const streak = summary.streak || 0;
      const completionPercent = summary.completionPercent || 0;
      const mascot = summary.mascot || {
        mood: 'nudging',
        quote: 'Đừng để streak bị đứt nhé! Hãy bắt đầu công việc hôm nay nào! 💪',
        imageUrl: '/assets/mascot/lumi_reference.png'
      };

      let taskListText = '';
      if (summary.topTasks && summary.topTasks.length > 0) {
        taskListText = summary.topTasks
          .map((t, idx) => {
            const timeStr = t.timeSlot ? `[${t.timeSlot}] ` : '';
            return `${idx + 1}. ${timeStr}${t.title}`;
          })
          .join('\n');
      } else {
        taskListText = '🎉 Đã hoàn thành tất cả công việc hôm nay! Tuyệt vời!';
      }

      const title = `🔥 Streak ${streak} ngày • Tiến độ ${completionPercent}%`;
      const body = `${taskListText}\n\n💬 "${mascot.quote}"`;

      // 1. Thử hiển thị qua Service Worker (Chuẩn PWA hỗ trợ Action Buttons & Ghim Lock Screen)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          const notificationOptions: any = {
            body,
            icon: mascot.imageUrl || '/assets/mascot/lumi_reference.png',
            badge: '/icons/icon-192x192.png',
            image: mascot.imageUrl || '/assets/mascot/lumi_reference.png',
            tag: 'live-schedule-widget',
            renotify: false,
            requireInteraction: true,
            silent: true,
            data: {
              url: '/?tab=dashboard',
              summary,
              updatedAt: Date.now()
            },
            actions: [
              { action: 'complete-current-task', title: '✅ Hoàn thành việc hiện tại' },
              { action: 'open-schedule', title: '📅 Mở lịch trình' }
            ]
          };

          await registration.showNotification(title, notificationOptions);

          // Gửi thông điệp cập nhật cho Service Worker nếu cần
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_LOCKSCREEN_WIDGET',
              summary
            });
          }
          return true;
        }
      }

      // 2. Fallback cho trình duyệt không có Service Worker
      new Notification(title, {
        body,
        icon: mascot.imageUrl || '/assets/mascot/lumi_reference.png',
        tag: 'live-schedule-widget',
        requireInteraction: true
      });
      return true;
    } catch (err) {
      console.warn('[WebNotification] Failed to display Lock Screen Schedule Card:', err);
      return false;
    }
  },

  async send(title: string, options?: { body?: string; icon?: string; badge?: string; tag?: string }): Promise<boolean> {
    if (!this.isSupported()) return false;

    if (Notification.permission !== 'granted') {
      const result = await this.requestPermission();
      if (result !== 'granted') return false;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body: options?.body || 'Thông báo từ LifeOS',
            icon: options?.icon || '/icons/icon-192x192.png',
            badge: options?.badge || '/icons/icon-192x192.png',
            tag: options?.tag || 'lifeos-notice',
            data: { url: window.location.origin }
          });
          return true;
        }
      }

      new Notification(title, {
        body: options?.body || 'Thông báo từ LifeOS',
        icon: options?.icon || '/icons/icon-192x192.png',
        tag: options?.tag || 'lifeos-notice'
      });
      return true;
    } catch (err) {
      console.warn('[WebNotification] Failed to display notification:', err);
      return false;
    }
  }
};

// Lắng nghe sự kiện người dùng bấm "Hoàn thành" từ màn hình khóa (qua Service Worker postMessage)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'LIFEOS_TASK_COMPLETED_FROM_LOCKSCREEN') {
      // Bắn custom event để các component React trong LifeOS tự cập nhật dữ liệu mượt mà
      window.dispatchEvent(new CustomEvent('lifeos:task-completed-from-widget', { detail: event.data }));
    }
  });
}
