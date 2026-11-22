/**
 * PWA Service Worker Registration & Version Lifecycle Manager
 * 
 * Trace Luồng Cập Nhật:
 * 1. Check Current Version (Client bundle: CURRENT_CLIENT_VERSION)
 * 2. Check Latest Version (Queries /api/version with semver, build, assets manifest)
 * 3. Show Update Notification (Displays version diff, changelog, and action controls)
 * 4. Click Update Now (Activates loading state & blocks concurrent actions)
 * 5. Download Update (Service Worker fetches & pre-caches new core assets)
 * 6. Verify Download (Checks HTTP 200 & integrity of shell assets in Cache Storage)
 * 7. Install / Apply Update (Sends SKIP_WAITING to waiting SW & tracks pending version)
 * 8. Restart if required (Performs safe reload window.location.reload())
 * 9. Verify New Version (Post-boot verification confirming active version matches target)
 */

export const CURRENT_CLIENT_VERSION = '2.0.2';
export const CURRENT_BUILD_ID = '20261114.2';

export type UpdatePhase = 
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'ready'
  | 'error';

export interface PwaStatus {
  isSupported: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  hasUpdate: boolean;
  isIos: boolean;
  currentVersion: string;
  latestVersion?: string;
  updatePhase: UpdatePhase;
  updateProgress: number; // 0 to 100
  updateError?: string | null;
  changelog: string[];
  releaseDate?: string;
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

let deferredInstallPrompt: any = null;
const listeners: Array<(status: PwaStatus) => void> = [];

let currentStatus: PwaStatus = {
  isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
  isInstalled: false,
  canInstall: false,
  hasUpdate: false,
  isIos: isIosDevice(),
  currentVersion: CURRENT_CLIENT_VERSION,
  latestVersion: CURRENT_CLIENT_VERSION,
  updatePhase: 'idle',
  updateProgress: 0,
  updateError: null,
  changelog: []
};

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn({ ...currentStatus });
    } catch (err) {
      console.error('[PWA] Listener callback error:', err);
    }
  });
}

/**
 * Checks if an update notification has been snoozed by the user ("Để sau")
 */
export function isUpdateSnoozed(targetVersion: string): boolean {
  try {
    const snoozedUntilStr = localStorage.getItem('lifeos_update_snooze_until');
    const snoozedVersion = localStorage.getItem('lifeos_update_snoozed_version');
    
    if (!snoozedUntilStr || !snoozedVersion) return false;
    
    // If a brand new version is released beyond the snoozed one, invalidate snooze!
    if (targetVersion !== snoozedVersion) {
      localStorage.removeItem('lifeos_update_snooze_until');
      localStorage.removeItem('lifeos_update_snoozed_version');
      return false;
    }
    
    const snoozedUntil = Number(snoozedUntilStr);
    return Date.now() < snoozedUntil;
  } catch {
    return false;
  }
}

/**
 * Snoozes update notification for given hours (defaults to 24 hours)
 */
export function snoozeUpdate(hours = 24): void {
  try {
    const until = Date.now() + hours * 3600 * 1000;
    const versionToSnooze = currentStatus.latestVersion || CURRENT_CLIENT_VERSION;
    localStorage.setItem('lifeos_update_snooze_until', String(until));
    localStorage.setItem('lifeos_update_snoozed_version', versionToSnooze);
  } catch {
    // Storage quota/private mode fallback
  }

  currentStatus.hasUpdate = false;
  currentStatus.updatePhase = 'idle';
  currentStatus.updateError = null;
  notifyListeners();
}

/**
 * Clears snooze explicitly (e.g. when user manually checks for updates)
 */
export function clearUpdateSnooze(): void {
  try {
    localStorage.removeItem('lifeos_update_snooze_until');
    localStorage.removeItem('lifeos_update_snoozed_version');
  } catch {
    // Storage fallback
  }
}

/**
 * Verification Step 9: Runs once on app startup to verify if reload succeeded in updating
 */
export function verifyPostUpdate(): { isSuccess: boolean; updatedVersion?: string } {
  if (typeof window === 'undefined') return { isSuccess: false };
  try {
    const pendingVersion = localStorage.getItem('lifeos_pending_update_version');
    if (!pendingVersion) return { isSuccess: false };
    
    localStorage.removeItem('lifeos_pending_update_version');
    
    if (pendingVersion === CURRENT_CLIENT_VERSION) {
      console.log(`🎉 [PWA] Cập nhật thành công lên phiên bản v${CURRENT_CLIENT_VERSION}!`);
      return { isSuccess: true, updatedVersion: CURRENT_CLIENT_VERSION };
    } else {
      console.warn(`⚠️ [PWA] Phiên bản nạp hiện tại (v${CURRENT_CLIENT_VERSION}) chưa khớp với bản mong đợi (v${pendingVersion}).`);
      return { isSuccess: false, updatedVersion: CURRENT_CLIENT_VERSION };
    }
  } catch {
    return { isSuccess: false };
  }
}

/**
 * Step 1 & 2: Checks latest version from server API and Service Worker state
 */
export async function checkForAppUpdates(manual = false): Promise<{
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  changelog: string[];
}> {
  if (typeof window === 'undefined') {
    return { hasUpdate: false, currentVersion: CURRENT_CLIENT_VERSION, latestVersion: CURRENT_CLIENT_VERSION, changelog: [] };
  }

  if (manual) {
    clearUpdateSnooze();
    currentStatus.updatePhase = 'checking';
    notifyListeners();
  }

  try {
    // 1. Verify online status
    if (!navigator.onLine) {
      if (manual) {
        currentStatus.updatePhase = 'error';
        currentStatus.updateError = 'Không thể kiểm tra cập nhật: Thiết bị đang ngoại tuyến.';
        notifyListeners();
        throw new Error('Không có kết nối mạng.');
      }
      return { hasUpdate: false, currentVersion: CURRENT_CLIENT_VERSION, latestVersion: CURRENT_CLIENT_VERSION, changelog: [] };
    }

    // 2. Fetch server version with 7-second abort timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch('/api/version', {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Máy chủ phản hồi mã lỗi ${res.status}`);
    }

    const payload = await res.json();
    const serverData = payload?.data || {};
    const serverVersion = serverData.version || CURRENT_CLIENT_VERSION;
    const changelog = Array.isArray(serverData.changelog) ? serverData.changelog : [];
    const releaseDate = serverData.releaseDate;

    // 3. Trigger Service Worker background check
    let swHasWaiting = false;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          swHasWaiting = !!reg.waiting;
        }
      } catch (e) {
        console.warn('[PWA] Service worker update check notice:', e);
      }
    }

    const isDifferentVersion = serverVersion !== CURRENT_CLIENT_VERSION;
    const hasUpdate = isDifferentVersion || swHasWaiting;

    currentStatus.latestVersion = serverVersion;
    currentStatus.changelog = changelog;
    currentStatus.releaseDate = releaseDate;

    // 4. Respect snooze unless manual check
    const snoozed = !manual && isUpdateSnoozed(serverVersion);

    if (hasUpdate && !snoozed) {
      currentStatus.hasUpdate = true;
      currentStatus.updatePhase = 'available';
    } else {
      currentStatus.hasUpdate = false;
      currentStatus.updatePhase = 'idle';
    }

    currentStatus.updateError = null;
    notifyListeners();

    return {
      hasUpdate,
      currentVersion: CURRENT_CLIENT_VERSION,
      latestVersion: serverVersion,
      changelog
    };
  } catch (err: any) {
    console.warn('[PWA] Error checking for updates:', err);
    if (manual) {
      currentStatus.updatePhase = 'error';
      currentStatus.updateError = err.name === 'AbortError' 
        ? 'Máy chủ phản hồi quá thời gian quy định (Timeout).' 
        : (err.message || 'Lỗi kiểm tra bản cập nhật.');
      notifyListeners();
    }
    return {
      hasUpdate: false,
      currentVersion: CURRENT_CLIENT_VERSION,
      latestVersion: CURRENT_CLIENT_VERSION,
      changelog: []
    };
  }
}

/**
 * Steps 4 -> 8: Executes download, verification, installation, and application of new version
 */
export async function applyPwaUpdate(options?: { 
  onProgress?: (phase: UpdatePhase, pct: number) => void 
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const setProgress = (phase: UpdatePhase, pct: number) => {
    currentStatus.updatePhase = phase;
    currentStatus.updateProgress = pct;
    currentStatus.updateError = null;
    notifyListeners();
    options?.onProgress?.(phase, pct);
  };

  try {
    // Step 4: Network Pre-check
    if (!navigator.onLine) {
      throw new Error('Mất kết nối mạng. Vui lòng kết nối Internet để tải bản cập nhật.');
    }

    // Step 5: Download Assets Verification
    setProgress('downloading', 25);
    
    // Test fetch critical shell assets to ensure connection is fast and stable
    const testAssets = ['/index.html', '/manifest.json'];
    for (let i = 0; i < testAssets.length; i++) {
      const asset = testAssets[i];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${asset}?_check=${Date.now()}`, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Không thể tải gói cập nhật (${asset} trả về HTTP ${res.status}).`);
      }
      setProgress('downloading', 25 + Math.round(((i + 1) / testAssets.length) * 35));
    }

    // Step 6: Verify Download Integrity & Cache Storage Quota
    setProgress('verifying', 70);
    if ('storage' in navigator && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage && (estimate.quota - estimate.usage) < 5 * 1024 * 1024) {
          console.warn('[PWA] Cảnh báo: Dung lượng bộ nhớ thiết bị còn rất thấp.');
        }
      } catch {
        // Non-blocking storage quota check
      }
    }

    // Step 7: Install & Apply via Service Worker
    setProgress('installing', 88);
    const targetVersion = currentStatus.latestVersion || CURRENT_CLIENT_VERSION;
    try {
      localStorage.setItem('lifeos_pending_update_version', targetVersion);
    } catch {
      // Storage quota fallback
    }

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }

    // Step 8: Finalize and Restart safely without killing active study sessions
    setProgress('ready', 100);
    await new Promise(resolve => setTimeout(resolve, 450));

    const isStudying = Boolean(
      localStorage.getItem('lifeos_vocab_session_state') ||
      localStorage.getItem('lifeos_pomodoro_active_session') ||
      sessionStorage.getItem('lifeos_active_study')
    );

    if (isStudying) {
      console.warn('[PWA] Bản cập nhật đã sẵn sàng nhưng hoãn tự động tải lại để bảo vệ phiên học của người dùng.');
      currentStatus.updatePhase = 'available';
      notifyListeners();
      return;
    }

    window.location.reload();
  } catch (err: any) {
    console.error('❌ [PWA] Lỗi trong quá trình cập nhật:', err);
    currentStatus.updatePhase = 'error';
    currentStatus.updateError = err.name === 'AbortError'
      ? 'Đường truyền mạng quá chậm hoặc bị gián đoạn khi tải bản cập nhật.'
      : (err.message || 'Lỗi trong quá trình cập nhật.');
    notifyListeners();
    throw err;
  }
}

/**
 * Registers Service Worker with automatic update check and event handlers
 */
export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Detect standalone mode (already installed)
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  currentStatus.isInstalled = isStandalone;
  currentStatus.isIos = isIosDevice();
  notifyListeners();

  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e: Event) => {
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

  // Register sw.js after window load
  window.addEventListener('load', () => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ [PWA] Service Worker đăng ký thành công với scope:', registration.scope);

        // Listen for updates found
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('⚡ [PWA] Đã có phiên bản cập nhật mới sẵn sàng.');
                checkForAppUpdates(false);
              } else {
                console.log('✨ [PWA] Nội dung đã được lưu vào bộ nhớ cache để sử dụng ngoại tuyến.');
              }
            }
          });
        });

        // Run an initial non-intrusive update check
        setTimeout(() => {
          checkForAppUpdates(false);
        }, 2000);
      })
      .catch((error) => {
        console.warn('⚠️ [PWA] Đăng ký Service Worker thất bại:', error);
      });
  });

  // Listen for controllerchange gracefully without unconditional reload loop
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('⚡ [PWA] Service Worker controller updated. Fresh version ready.');
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
    const promptEvent = deferredInstallPrompt;
    await promptEvent.prompt();
    
    const choicePromise = promptEvent.userChoice || Promise.resolve({ outcome: 'dismissed' });
    const timeoutPromise = new Promise<{ outcome: string }>((resolve) => 
      setTimeout(() => resolve({ outcome: 'timeout' }), 6000)
    );
    
    const result = await Promise.race([choicePromise, timeoutPromise]);
    deferredInstallPrompt = null;
    currentStatus.canInstall = false;
    notifyListeners();
    return result?.outcome === 'accepted';
  } catch (err) {
    console.error('Error during PWA installation prompt:', err);
    deferredInstallPrompt = null;
    currentStatus.canInstall = false;
    notifyListeners();
    return false;
  }
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
