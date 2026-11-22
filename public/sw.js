/**
 * Service Worker: QUẢN LÍ CÁ NHÂN (PWA)
 * 
 * Chiến lược Caching:
 * 1. App Shell & Static Assets: Stale-While-Revalidate / Cache-First với Versioning chặt chẽ.
 * 2. API & Sensitive Routes (/api/*, /auth/*, /finance/*): Network-Only (KHÔNG cache dữ liệu cá nhân hay tài chính).
 * 3. Navigation (HTML): Network-First, fallback về cached app shell khi offline an toàn.
 * 4. Cache Versioning & Self-Cleanup: Tự động dọn dẹp các cache cũ khi triển khai bản mới.
 */

const CACHE_VERSION = 'quan-li-ca-nhan-v2.0.8-google-oauth-ready';
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `runtime-${CACHE_VERSION}`;

// Danh sách tài nguyên tĩnh cốt lõi cần pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png'
];

// Danh sách các URL nhạy cảm hoặc API tuyệt đối KHÔNG ĐƯỢC CACHE
function isNonCacheable(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/src/') ||
    pathname.startsWith('/@vite/') ||
    pathname.startsWith('/@fs/') ||
    pathname.startsWith('/@id/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/finance') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/subscription') ||
    url.protocol.startsWith('chrome-extension') ||
    url.searchParams.has('nocache')
  );
}

// 1. INSTALL EVENT: Pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      // Use addAll with error tolerance for dev/optional assets
      return Promise.all(
        PRECACHE_ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[PWA SW] Không thể pre-cache: ${asset}`, err);
          });
        })
      );
    }).then(() => {
      // Kích hoạt service worker ngay lập tức mà không cần đợi client reload
      return self.skipWaiting();
    })
  );
});

// 2. ACTIVATE EVENT: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== RUNTIME_CACHE_NAME) {
            console.log(`[PWA SW] Đang dọn dẹp cache cũ: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Lập tức kiểm soát tất cả clients đang mở
      return self.clients.claim();
    })
  );
});

// 3. FETCH EVENT: Intelligent Caching Strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Bỏ qua các request không phải GET (POST, PUT, DELETE, v.v. phải qua Network)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Không cache request cross-origin (trừ CDN font/icon nếu cần) hoặc API nhạy cảm
  if (isNonCacheable(url)) {
    return; // Để browser xử lý network bình thường
  }

  // Chiến lược A: Điều hướng HTML (Navigation Request) -> Network-First, fallback về cache app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Khi ngoại tuyến (offline), trả về index.html từ cache để ứng dụng SPA vẫn render được
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const fallbackShell = await caches.match('/index.html');
          if (fallbackShell) return fallbackShell;
          return new Response('Ứng dụng đang ngoại tuyến. Vui lòng kết nối Internet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Chiến lược B: Tài nguyên tĩnh (JS, CSS, Images, Icons, Fonts)
  // Sử dụng Stale-While-Revalidate: Trả về bản cache ngay để tải siêu tốc, song song tải bản mới ngầm
  const isStaticAsset = (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Khi network lỗi, không làm gì thêm vì đã có cachedResponse (nếu có)
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Mặc định cho các request khác: Network-First
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// 4. MESSAGE EVENT: Hỗ trợ skipWaiting từ Client UI khi có bản cập nhật mới
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CHECK_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'VERSION_INFO',
        cacheVersion: CACHE_VERSION
      });
    }
  } else if (event.data && event.data.type === 'SHOW_LOCKSCREEN_WIDGET') {
    const summary = event.data.summary || {};
    const { title, options } = buildScheduleNotificationOptions(summary);
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// ============================================================================
// 5. LOCK SCREEN SCHEDULE CARD (Duolingo-style Live Schedule Widget for PWA)
// ============================================================================

function buildScheduleNotificationOptions(rawSummary) {
  const summary = (rawSummary && rawSummary.data) ? rawSummary.data : (rawSummary || {});
  const streak = summary.streak || 0;
  const completionPercent = summary.completionPercent !== undefined ? summary.completionPercent : 0;
  const mascot = summary.mascot || {
    mood: 'nudging',
    quote: summary.reminder || 'Đừng để streak bị đứt nhé! Hãy bắt đầu công việc hôm nay nào! 💪',
    imageUrl: '/assets/mascot/lumi_reference.png'
  };
  const quote = mascot.quote || summary.reminder || 'Đừng để streak bị đứt nhé! Hãy bắt đầu công việc hôm nay nào! 💪';

  let taskListText = '';
  if (summary.topTasks && summary.topTasks.length > 0) {
    taskListText = summary.topTasks
      .map((t, idx) => {
        const timeStr = t.timeSlot ? '[' + t.timeSlot + '] ' : '';
        return (idx + 1) + '. ' + timeStr + t.title;
      })
      .join('\n');
  } else {
    taskListText = '🎉 Đã hoàn thành tất cả công việc hôm nay! Tuyệt vời!';
  }

  const title = '🔥 Streak ' + streak + ' ngày • Tiến độ ' + completionPercent + '%';
  const body = taskListText + '\n\n💬 "' + quote + '"';

  return {
    title,
    options: {
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
    }
  };
}

// Lắng nghe Web Push Notification từ server
self.addEventListener('push', (event) => {
  let summary = null;
  if (event.data) {
    try {
      summary = event.data.json();
    } catch {
      summary = null;
    }
  }

  const promiseChain = (async () => {
    if (!summary || !summary.topTasks) {
      try {
        const res = await fetch('/api/widget/summary', { credentials: 'include' });
        if (res.ok) {
          summary = await res.json();
        }
      } catch (e) {
        console.warn('[SW Push] Failed to fetch fresh widget summary:', e);
      }
    }
    const { title, options } = buildScheduleNotificationOptions(summary || {});
    return self.registration.showNotification(title, options);
  })();

  event.waitUntil(promiseChain);
});

// Xử lý tương tác nút bấm trực tiếp từ màn hình khóa (Lock Screen Actions)
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;

  if (action === 'complete-current-task') {
    event.waitUntil((async () => {
      try {
        // 1. Gọi API hoàn thành công việc ưu tiên nhất hôm nay
        await fetch('/api/widget/complete-top-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        // 2. Lấy ngay summary mới để cập nhật thẻ khóa mà không làm phiền rung/chuông
        const summaryRes = await fetch('/api/widget/summary', { credentials: 'include' });
        if (summaryRes.ok) {
          const newSummary = await summaryRes.json();
          const { title, options } = buildScheduleNotificationOptions(newSummary);
          await self.registration.showNotification(title, options);
        }

        // 3. Bắn event cho các tab Client UI đang mở để đồng bộ dữ liệu giao diện
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({
            type: 'LIFEOS_TASK_COMPLETED_FROM_LOCKSCREEN',
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.error('[SW NotificationClick] Error completing task from lock screen:', err);
      }
    })());
    return;
  }

  // Khi bấm 'Mở lịch trình' hoặc chạm vào thông báo
  event.waitUntil((async () => {
    notification.close();
    const urlToOpen = (notification.data && notification.data.url) ? notification.data.url : '/?tab=dashboard';
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of clientList) {
      if ('focus' in client) {
        client.navigate(urlToOpen);
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(urlToOpen);
    }
  })());
});
