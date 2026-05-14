/**
 * Service Worker for AI Subscription PWA
 * Features:
 * - Precache all static assets for instant offline load
 * - Runtime caching with stale-while-revalidate for API
 * - Cache-first for images and fonts
 * - Background sync for article fetching
 * - Offline fallback with cached data display
 */

// Use globalThis for service worker scope
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'ai-subscription-v2';
const STATIC_CACHE_NAME = 'ai-subscription-static-v2';
const DATA_CACHE_NAME = 'ai-subscription-data-v2';
const IMAGE_CACHE_NAME = 'ai-subscription-images-v2';

// Static assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.svg',
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      console.log('[SW] Installation complete');
      self.skipWaiting();
    })
  );
});

// Fetch event - handle requests based on type
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // Skip cross-origin requests except for CDN fonts
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.')) {
    return;
  }

  // Determine caching strategy based on request type
  if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE_NAME));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE_NAME));
  } else if (isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE_NAME));
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else {
    event.respondWith(networkFirst(request, CACHE_NAME));
  }
});

// Check if request is API
function isAPIRequest(url: URL): boolean {
  return url.pathname.includes('/api/v1/') ||
    url.pathname.includes('/feeds') ||
    url.pathname.includes('/articles') ||
    url.pathname.includes('/tags') ||
    url.pathname.includes('/search');
}

// Check if request is for images
function isImageRequest(url: URL): boolean {
  const path = url.pathname;
  return /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/.test(path) ||
    path.includes('/icons/') ||
    path.includes('/images/') ||
    path.includes('avatar') ||
    path.includes('favicon');
}

// Check if request is for static assets
function isStaticAsset(request: Request): boolean {
  const url = request.url;
  return /\.js$/.test(url) ||
    /\.css$/.test(url) ||
    /\.woff2?$/.test(url);
}

// Network first strategy with cache fallback
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Offline - no cached data available',
      offline: true,
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Network first with offline page fallback for navigation
async function networkFirstWithOfflineFallback(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const indexResponse = await caches.match('/index.html');
    if (indexResponse) {
      return indexResponse;
    }
    
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Cache first strategy
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Refresh cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response);
        });
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background regardless of cache
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return ![
              CACHE_NAME,
              STATIC_CACHE_NAME,
              DATA_CACHE_NAME,
              IMAGE_CACHE_NAME,
            ].includes(name);
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      self.clients.claim();
    })
  );
});

// Handle sync events for background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  if (event.tag === 'sync-articles') {
    event.waitUntil(syncArticles());
  } else if (event.tag === 'sync-feeds') {
    event.waitUntil(syncFeeds());
  } else if (event.tag === 'background-fetch') {
    event.waitUntil(backgroundFetch());
  }
});

// Background sync articles
async function syncArticles(): Promise<void> {
  console.log('[SW] Background sync: syncing articles');
  
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_ARTICLES',
      timestamp: Date.now(),
    });
  }
}

// Background sync feeds
async function syncFeeds(): Promise<void> {
  console.log('[SW] Background sync: syncing feeds');
  
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_FEEDS',
      timestamp: Date.now(),
    });
  }
}

// Background fetch for periodic updates
async function backgroundFetch(): Promise<void> {
  console.log('[SW] Background fetch triggered');
  
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  
  for (const client of clients) {
    client.postMessage({
      type: 'BACKGROUND_FETCH',
      timestamp: Date.now(),
    });
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options: NotificationOptions = {
      body: data.body || 'New content available',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'push-notification',
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'AI Subscription',
        options
      )
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (self.clients.openWindow) {
        const url = data?.url || '/';
        return self.clients.openWindow(url);
      }
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const data = event.data;
  
  if (data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  } else if (data?.type === 'CACHE_ARTICLE') {
    const { url } = data;
    if (url) {
      caches.open(DATA_CACHE_NAME).then((cache) => {
        fetch(url).then((response) => {
          if (response.ok) {
            cache.put(url, response);
          }
        });
      });
    }
  } else if (data?.type === 'CLEAR_DATA_CACHE') {
    caches.delete(DATA_CACHE_NAME).then(() => {
      console.log('[SW] Data cache cleared');
    });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-articles-periodic') {
    event.waitUntil(syncArticles());
  }
});
