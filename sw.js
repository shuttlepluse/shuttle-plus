// ========================================
// SHUTTLE PLUS - Service Worker
// ========================================

const CACHE_NAME = 'shuttleplus-v1';
const STATIC_CACHE = 'shuttleplus-static-v1';
const DYNAMIC_CACHE = 'shuttleplus-dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pages/blog.html',
  '/pages/booking.html',
  '/pages/tickets.html',
  '/pages/tracking.html',
  '/css/style.css',
  '/css/blog.css',
  '/css/booking.css',
  '/css/tickets.css',
  '/css/tracking.css',
  '/js/main.js',
  '/js/app.js',
  '/js/booking.js',
  '/js/offline-storage.js',
  '/js/api-client.js',
  '/images/logo.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  '/manifest.json',
  // External resources
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Offline fallback page
const OFFLINE_PAGE = '/offline.html';

// ========================================
// Install Event - Cache Static Assets
// ========================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        // Cache what we can, don't fail on missing files
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.log(`[SW] Failed to cache: ${url}`);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
  );
});

// ========================================
// Activate Event - Clean Old Caches
// ========================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== STATIC_CACHE && name !== DYNAMIC_CACHE;
            })
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// ========================================
// Fetch Event - Serve from Cache/Network
// ========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - Cache first, then network
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages - Network first with offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Default - Stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ========================================
// Caching Strategies
// ========================================

// Cache First - For static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First - For API calls
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Network First with Offline Fallback - For HTML pages
async function networkFirstWithOffline(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    const offlineResponse = await caches.match(OFFLINE_PAGE);
    if (offlineResponse) {
      return offlineResponse;
    }

    // Fallback offline HTML
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Shuttle Plus</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', system-ui, sans-serif;
            background: linear-gradient(135deg, #183251 0%, #597B87 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
            padding: 2rem;
          }
          .container { max-width: 400px; }
          .icon { font-size: 4rem; margin-bottom: 1rem; }
          h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
          p { opacity: 0.8; margin-bottom: 1.5rem; line-height: 1.6; }
          button {
            background: white;
            color: #183251;
            border: none;
            padding: 0.875rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 9999px;
            cursor: pointer;
          }
          button:hover { background: #f0f2f5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📡</div>
          <h1>You're Offline</h1>
          <p>Please check your internet connection. Your saved tickets are still available offline.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Stale While Revalidate - For dynamic content
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, networkResponse.clone());
        });
      }
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || await networkResponsePromise || new Response('Offline', { status: 503 });
}

// ========================================
// Helper Functions
// ========================================

function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// ========================================
// Push Notifications
// ========================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'Shuttle Plus',
    body: 'You have a new notification',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-96x96.png',
    tag: 'shuttle-notification',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    actions: data.actions || [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  let urlToOpen = '/';

  if (action === 'view' && data?.bookingId) {
    urlToOpen = `/pages/tickets.html?id=${data.bookingId}`;
  } else if (data?.url) {
    urlToOpen = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ========================================
// Background Sync
// ========================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
});

async function syncBookings() {
  // This will be implemented when we have the offline storage
  console.log('[SW] Syncing bookings...');
  // Get pending bookings from IndexedDB and sync with server
}

// ========================================
// Message Handler - Communication with main thread
// ========================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
