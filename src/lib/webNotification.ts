// Web Notification & PWA Push API Helper for LifeOS
// Enables offline & background reminders for Pomodoro timers, habit reminders, and critical tasks

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

  async send(title: string, options?: { body?: string; icon?: string; badge?: string; tag?: string }): Promise<boolean> {
    if (!this.isSupported()) return false;

    if (Notification.permission !== 'granted') {
      const result = await this.requestPermission();
      if (result !== 'granted') return false;
    }

    try {
      // 1. Try Service Worker ShowNotification (preferred for PWA & mobile)
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

      // 2. Fallback to standard Window Notification
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
