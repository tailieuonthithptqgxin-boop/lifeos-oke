/**
 * Service Worker: QUẢN LÍ CÁ NHÂN (PWA)
 * 
 * Chiến lược Caching:
 * 1. App Shell & Static Assets: Stale-While-Revalidate / Cache-First với Versioning chặt chẽ.
 * 2. API & Sensitive Routes (/api/*, /auth/*, /finance/*): Network-Only (KHÔNG cache dữ liệu cá nhân hay tài chính).
 * 3. Navigation (HTML): Network-First, fallback về cached app shell khi offline an toàn.
 * 4. Cache Versioning & Self-Cleanup: Tự động dọn dẹp các cache cũ khi triển khai bản mới.
 */

const CACHE_VERSION = 'quan-li-ca-nhan-v1.0.0';
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
  }
});
