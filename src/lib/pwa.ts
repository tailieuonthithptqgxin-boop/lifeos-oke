/**
 * PWA Service Worker Registration & Lifecycle Manager
 */

export interface PwaStatus {
  isSupported: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  hasUpdate: boolean;
}

let deferredInstallPrompt: any = null;
const listeners: Array<(status: PwaStatus) => void> = [];

let currentStatus: PwaStatus = {
  isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
  isInstalled: false,
  canInstall: false,
  hasUpdate: false
};

function notifyListeners() {
  listeners.forEach(fn => fn({ ...currentStatus }));
}

/**
 * Registers Service Worker with automatic update check and event handlers
 */
export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Detect standalone mode (already installed)
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  currentStatus.isInstalled = isStandalone;
  notifyListeners();

  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent default mini-infobar on mobile Chrome
    e.preventDefault();
    deferredInstallPrompt = e;
    currentStatus.canInstall = true;
    notifyListeners();
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    currentStatus.canInstall = false;
    currentStatus.isInstalled = true;
    console.log('🎉 [PWA] Ứng dụng "QUẢN LÍ CÁ NHÂN" đã được cài đặt thành công!');
    notifyListeners();
  });

  // Register sw.js after window load to not impact initial rendering performance
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ [PWA] Service Worker đăng ký thành công với scope:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available!
                console.log('⚡ [PWA] Đã có phiên bản cập nhật mới sẵn sàng.');
                currentStatus.hasUpdate = true;
                notifyListeners();
              } else {
                console.log('✨ [PWA] Nội dung đã được lưu vào bộ nhớ cache để sử dụng ngoại tuyến.');
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('⚠️ [PWA] Đăng ký Service Worker thất bại:', error);
      });
  });

  // Reload page when new service worker takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

/**
 * Triggers native PWA install prompt when user clicks Install
 */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return false;
  }

  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    currentStatus.canInstall = false;
    notifyListeners();
    return outcome === 'accepted';
  } catch (err) {
    console.error('Error during PWA installation prompt:', err);
    return false;
  }
}

/**
 * Activates new version immediately when user accepts update
 */
export function applyPwaUpdate(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}

/**
 * Hook or subscription for UI components to observe PWA status
 */
export function subscribePwaStatus(callback: (status: PwaStatus) => void): () => void {
  listeners.push(callback);
  callback({ ...currentStatus });
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
